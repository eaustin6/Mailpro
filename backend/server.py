from fastapi import FastAPI, APIRouter, HTTPException, Request, BackgroundTasks, Depends, Header
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import resend
import httpx
import hashlib
import secrets
import json
import base64
import random
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Admin password from environment
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'ghostmail_admin_2024')

# ==================== MODELS ====================

class ConfigModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    resend_api_key: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    email_domains: List[dict] = Field(default_factory=lambda: [{"domain": "resend.dev", "provider": "resend", "is_default": True}])
    webhook_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    default_expiration_hours: Optional[int] = None
    # Authorization settings
    website_auth_enabled: bool = False
    telegram_auth_enabled: bool = False
    authorized_telegram_users: List[int] = []  # List of authorized chat_ids
    # Cloudflare settings
    cloudflare_api_token: Optional[str] = None
    cloudflare_account_id: Optional[str] = None
    cloudflare_zone_ids: List[dict] = []  # [{zone_id, domain}]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConfigUpdate(BaseModel):
    resend_api_key: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    email_domains: Optional[List[dict]] = None
    webhook_secret: Optional[str] = None
    default_expiration_hours: Optional[int] = None
    website_auth_enabled: Optional[bool] = None
    telegram_auth_enabled: Optional[bool] = None
    authorized_telegram_users: Optional[List[int]] = None
    cloudflare_api_token: Optional[str] = None
    cloudflare_account_id: Optional[str] = None
    cloudflare_zone_ids: Optional[List[dict]] = None

class DomainAdd(BaseModel):
    domain: str
    provider: str = "resend"  # resend or cloudflare
    is_default: bool = False
    cloudflare_zone_id: Optional[str] = None

class TempEmail(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email_address: str
    display_name: str = "Anonymous"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    telegram_chat_id: Optional[int] = None
    is_active: bool = True

class TempEmailCreate(BaseModel):
    custom_prefix: Optional[str] = None
    expiration_hours: Optional[int] = None
    telegram_chat_id: Optional[int] = None
    domain: Optional[str] = None

class InboxEmail(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    temp_email_id: str
    to_address: str
    from_address: str
    from_name: Optional[str] = None
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    attachments: List[dict] = []
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_read: bool = False
    forwarded_to_telegram: bool = False

class SendEmailRequest(BaseModel):
    from_email_id: str
    to_email: EmailStr
    subject: str
    body_html: str

class TelegramUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    current_email_id: Optional[str] = None
    is_authorized: bool = False
    registered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WebSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    telegram_chat_id: int
    telegram_username: str
    otp_code: str
    otp_expires_at: datetime
    is_verified: bool = False
    session_token: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoginRequest(BaseModel):
    telegram_username: str

class VerifyOTPRequest(BaseModel):
    telegram_username: str
    otp_code: str

class AdminLoginRequest(BaseModel):
    password: str

# ==================== AUTH HELPERS ====================

def verify_admin_password(password: str) -> bool:
    """Verify admin password"""
    return password == ADMIN_PASSWORD

async def verify_admin_token(authorization: Optional[str] = Header(None)):
    """Verify admin authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization[7:]
    
    # Check if it's a valid admin session
    session = await db.admin_sessions.find_one({"token": token, "is_valid": True}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    # Check expiration
    expires_at = datetime.fromisoformat(session['expires_at']) if isinstance(session['expires_at'], str) else session['expires_at']
    if datetime.now(timezone.utc) > expires_at.replace(tzinfo=timezone.utc):
        await db.admin_sessions.update_one({"token": token}, {"$set": {"is_valid": False}})
        raise HTTPException(status_code=401, detail="Session expired")
    
    return True

async def verify_user_session(authorization: Optional[str] = Header(None)):
    """Verify user session token"""
    config = await get_config()
    
    # If website auth is disabled, allow access
    if not config.get('website_auth_enabled', False):
        return None
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization[7:]
    
    session = await db.web_sessions.find_one({"session_token": token, "is_verified": True}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return session

def generate_otp():
    """Generate 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def generate_session_token():
    """Generate secure session token"""
    return secrets.token_urlsafe(32)

# ==================== HELPER FUNCTIONS ====================

async def get_config():
    """Get or create default config"""
    config = await db.config.find_one({}, {"_id": 0})
    if not config:
        default_config = ConfigModel()
        config_dict = default_config.model_dump()
        config_dict['created_at'] = config_dict['created_at'].isoformat()
        config_dict['updated_at'] = config_dict['updated_at'].isoformat()
        insert_doc = config_dict.copy()
        await db.config.insert_one(insert_doc)
        return config_dict
    return config

def generate_email_prefix():
    """Generate a random email prefix"""
    adjectives = ["ghost", "shadow", "cyber", "dark", "null", "void", "pixel", "binary", "crypto", "stealth"]
    nouns = ["mail", "runner", "byte", "bit", "node", "packet", "signal", "pulse", "wave", "flux"]
    import random
    return f"{random.choice(adjectives)}{random.choice(nouns)}{random.randint(100, 999)}"

async def get_default_domain():
    """Get default email domain"""
    config = await get_config()
    domains = config.get('email_domains', [])
    for d in domains:
        if d.get('is_default'):
            return d.get('domain', 'resend.dev')
    return domains[0].get('domain', 'resend.dev') if domains else 'resend.dev'

async def send_telegram_message(chat_id: int, text: str, parse_mode: str = "HTML"):
    """Send message to Telegram user"""
    config = await get_config()
    token = config.get('telegram_bot_token')
    if not token:
        logger.warning("Telegram bot token not configured")
        return False
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": parse_mode
                }
            )
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {e}")
        return False

async def send_telegram_document(chat_id: int, file_content: bytes, filename: str, caption: str = ""):
    """Send document to Telegram user"""
    config = await get_config()
    token = config.get('telegram_bot_token')
    if not token:
        return False
    
    try:
        async with httpx.AsyncClient() as http_client:
            files = {"document": (filename, file_content)}
            data = {"chat_id": chat_id, "caption": caption}
            response = await http_client.post(
                f"https://api.telegram.org/bot{token}/sendDocument",
                files=files,
                data=data
            )
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send Telegram document: {e}")
        return False

async def forward_email_to_telegram(inbox_email: dict):
    """Forward received email to linked Telegram account"""
    temp_email = await db.temp_emails.find_one({"id": inbox_email['temp_email_id']}, {"_id": 0})
    if not temp_email or not temp_email.get('telegram_chat_id'):
        return
    
    chat_id = temp_email['telegram_chat_id']
    
    message = f"""📬 <b>NEW EMAIL RECEIVED</b>

<b>From:</b> {inbox_email.get('from_name', '')} &lt;{inbox_email['from_address']}&gt;
<b>To:</b> {inbox_email['to_address']}
<b>Subject:</b> {inbox_email['subject']}
<b>Time:</b> {inbox_email['received_at']}

<b>Content:</b>
{inbox_email.get('body_text', 'No text content')[:1000]}"""
    
    await send_telegram_message(chat_id, message)
    
    for attachment in inbox_email.get('attachments', []):
        if attachment.get('content'):
            try:
                content = base64.b64decode(attachment['content'])
                await send_telegram_document(
                    chat_id,
                    content,
                    attachment.get('filename', 'attachment'),
                    f"📎 Attachment from: {inbox_email['from_address']}"
                )
            except Exception as e:
                logger.error(f"Failed to send attachment: {e}")
    
    await db.inbox.update_one(
        {"id": inbox_email['id']},
        {"$set": {"forwarded_to_telegram": True}}
    )

async def is_telegram_user_authorized(chat_id: int) -> bool:
    """Check if telegram user is authorized"""
    config = await get_config()
    
    if not config.get('telegram_auth_enabled', False):
        return True
    
    authorized_users = config.get('authorized_telegram_users', [])
    return chat_id in authorized_users

# ==================== ADMIN AUTH ENDPOINTS ====================

@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    """Admin login endpoint"""
    if not verify_admin_password(request.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    session_doc = {
        "token": token,
        "is_valid": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat()
    }
    await db.admin_sessions.insert_one(session_doc)
    
    return {
        "status": "success",
        "token": token,
        "expires_at": expires_at.isoformat()
    }

@api_router.post("/admin/logout")
async def admin_logout(authorized: bool = Depends(verify_admin_token)):
    """Admin logout endpoint"""
    return {"status": "success", "message": "Logged out"}

@api_router.get("/admin/verify")
async def verify_admin(authorized: bool = Depends(verify_admin_token)):
    """Verify admin session"""
    return {"status": "success", "authenticated": True}

# ==================== USER AUTH ENDPOINTS ====================

@api_router.post("/auth/request-otp")
async def request_otp(request: LoginRequest):
    """Request OTP for website login"""
    config = await get_config()
    
    if not config.get('website_auth_enabled', False):
        return {"status": "success", "message": "Authentication disabled", "auth_disabled": True}
    
    telegram_username = request.telegram_username.lower().replace("@", "")
    
    user = await db.telegram_users.find_one({"username": telegram_username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please start the Telegram bot first with /start")
    
    otp = generate_otp()
    otp_expires = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    session_doc = {
        "id": str(uuid.uuid4()),
        "telegram_chat_id": user['chat_id'],
        "telegram_username": telegram_username,
        "otp_code": otp,
        "otp_expires_at": otp_expires.isoformat(),
        "is_verified": False,
        "session_token": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.web_sessions.delete_many({"telegram_username": telegram_username, "is_verified": False})
    await db.web_sessions.insert_one(session_doc)
    
    otp_message = f"""🔐 <b>LOGIN VERIFICATION</b>

Your OTP code for GhostMail website login:

<code>{otp}</code>

⏰ This code expires in 5 minutes.

⚠️ Do not share this code with anyone."""
    
    sent = await send_telegram_message(user['chat_id'], otp_message)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP. Check bot configuration.")
    
    return {"status": "success", "message": "OTP sent to your Telegram"}

@api_router.post("/auth/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP and create session"""
    config = await get_config()
    
    if not config.get('website_auth_enabled', False):
        return {"status": "success", "message": "Authentication disabled", "auth_disabled": True}
    
    telegram_username = request.telegram_username.lower().replace("@", "")
    
    session = await db.web_sessions.find_one({
        "telegram_username": telegram_username,
        "otp_code": request.otp_code,
        "is_verified": False
    }, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    otp_expires = datetime.fromisoformat(session['otp_expires_at'])
    if datetime.now(timezone.utc) > otp_expires.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired")
    
    session_token = generate_session_token()
    
    await db.web_sessions.update_one(
        {"id": session['id']},
        {"$set": {"is_verified": True, "session_token": session_token}}
    )
    
    user = await db.telegram_users.find_one({"username": telegram_username}, {"_id": 0})
    
    return {
        "status": "success",
        "token": session_token,
        "user": {
            "username": telegram_username,
            "chat_id": session['telegram_chat_id'],
            "first_name": user.get('first_name', '') if user else ''
        }
    }

@api_router.get("/auth/status")
async def auth_status():
    """Get authentication status"""
    config = await get_config()
    return {
        "website_auth_enabled": config.get('website_auth_enabled', False),
        "telegram_auth_enabled": config.get('telegram_auth_enabled', False)
    }

@api_router.get("/auth/me")
async def get_current_user(session = Depends(verify_user_session)):
    """Get current logged in user"""
    if session is None:
        return {"authenticated": False, "auth_disabled": True}
    
    return {
        "authenticated": True,
        "user": {
            "username": session.get('telegram_username'),
            "chat_id": session.get('telegram_chat_id')
        }
    }

# ==================== CONFIG ENDPOINTS ====================

@api_router.get("/admin/config")
async def get_admin_config(authorized: bool = Depends(verify_admin_token)):
    """Get current configuration (masks sensitive data)"""
    config = await get_config()
    
    if config.get('resend_api_key'):
        key = config['resend_api_key']
        config['resend_api_key'] = f"{key[:10]}...{key[-4:]}" if len(key) > 14 else "***"
    if config.get('telegram_bot_token'):
        token = config['telegram_bot_token']
        config['telegram_bot_token'] = f"{token[:10]}...{token[-4:]}" if len(token) > 14 else "***"
    if config.get('cloudflare_api_token'):
        token = config['cloudflare_api_token']
        config['cloudflare_api_token'] = f"{token[:10]}...{token[-4:]}" if len(token) > 14 else "***"
    
    return config

@api_router.put("/admin/config")
async def update_admin_config(update: ConfigUpdate, authorized: bool = Depends(verify_admin_token)):
    """Update configuration"""
    config = await get_config()
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.config.update_one(
        {"id": config['id']},
        {"$set": update_dict}
    )
    
    if update.telegram_bot_token:
        await setup_telegram_webhook(update.telegram_bot_token, config.get('webhook_secret', ''))
    
    return {"status": "success", "message": "Configuration updated"}

@api_router.post("/admin/domains")
async def add_domain(domain_data: DomainAdd, authorized: bool = Depends(verify_admin_token)):
    """Add a new email domain"""
    config = await get_config()
    domains = config.get('email_domains', [])
    
    for d in domains:
        if d.get('domain') == domain_data.domain:
            raise HTTPException(status_code=400, detail="Domain already exists")
    
    if domain_data.is_default:
        for d in domains:
            d['is_default'] = False
    
    new_domain = {
        "domain": domain_data.domain,
        "provider": domain_data.provider,
        "is_default": domain_data.is_default,
        "cloudflare_zone_id": domain_data.cloudflare_zone_id,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    domains.append(new_domain)
    
    await db.config.update_one(
        {"id": config['id']},
        {"$set": {"email_domains": domains, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"status": "success", "message": "Domain added", "domains": domains}

@api_router.delete("/admin/domains/{domain}")
async def remove_domain(domain: str, authorized: bool = Depends(verify_admin_token)):
    """Remove an email domain"""
    config = await get_config()
    domains = config.get('email_domains', [])
    
    domains = [d for d in domains if d.get('domain') != domain]
    
    if not domains:
        domains = [{"domain": "resend.dev", "provider": "resend", "is_default": True}]
    elif not any(d.get('is_default') for d in domains):
        domains[0]['is_default'] = True
    
    await db.config.update_one(
        {"id": config['id']},
        {"$set": {"email_domains": domains, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"status": "success", "message": "Domain removed", "domains": domains}

@api_router.post("/admin/authorize-telegram-user/{chat_id}")
async def authorize_telegram_user(chat_id: int, authorized: bool = Depends(verify_admin_token)):
    """Authorize a Telegram user"""
    config = await get_config()
    authorized_users = config.get('authorized_telegram_users', [])
    
    if chat_id not in authorized_users:
        authorized_users.append(chat_id)
        await db.config.update_one(
            {"id": config['id']},
            {"$set": {"authorized_telegram_users": authorized_users}}
        )
    
    return {"status": "success", "message": f"User {chat_id} authorized"}

@api_router.delete("/admin/authorize-telegram-user/{chat_id}")
async def revoke_telegram_user(chat_id: int, authorized: bool = Depends(verify_admin_token)):
    """Revoke Telegram user authorization"""
    config = await get_config()
    authorized_users = config.get('authorized_telegram_users', [])
    
    if chat_id in authorized_users:
        authorized_users.remove(chat_id)
        await db.config.update_one(
            {"id": config['id']},
            {"$set": {"authorized_telegram_users": authorized_users}}
        )
    
    return {"status": "success", "message": f"User {chat_id} authorization revoked"}

async def setup_telegram_webhook(token: str, webhook_secret: str):
    """Setup Telegram webhook"""
    backend_url = os.environ.get('BACKEND_URL', '')
    if not backend_url:
        logger.warning("BACKEND_URL not set, cannot setup Telegram webhook")
        return
    
    webhook_url = f"{backend_url}/api/webhook/telegram/{webhook_secret}"
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                f"https://api.telegram.org/bot{token}/setWebhook",
                json={"url": webhook_url}
            )
            logger.info(f"Telegram webhook setup response: {response.json()}")
    except Exception as e:
        logger.error(f"Failed to setup Telegram webhook: {e}")

# ==================== EMAIL ENDPOINTS ====================

@api_router.post("/email/generate")
async def generate_temp_email(request: TempEmailCreate, session = Depends(verify_user_session)):
    """Generate a new temporary email address"""
    config = await get_config()
    
    prefix = request.custom_prefix if request.custom_prefix else generate_email_prefix()
    prefix = ''.join(c for c in prefix.lower() if c.isalnum() or c in '-_')[:20]
    
    domain = request.domain if request.domain else await get_default_domain()
    email_address = f"{prefix}@{domain}"
    
    existing = await db.temp_emails.find_one({"email_address": email_address, "is_active": True}, {"_id": 0})
    if existing:
        return {"status": "error", "message": "Email address already exists"}
    
    expires_at = None
    expiration_hours = request.expiration_hours if request.expiration_hours is not None else config.get('default_expiration_hours')
    if expiration_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expiration_hours)
    
    temp_email = TempEmail(
        email_address=email_address,
        expires_at=expires_at,
        telegram_chat_id=request.telegram_chat_id
    )
    
    email_dict = temp_email.model_dump()
    email_dict['created_at'] = email_dict['created_at'].isoformat()
    email_dict['expires_at'] = email_dict['expires_at'].isoformat() if email_dict['expires_at'] else None
    
    insert_doc = email_dict.copy()
    await db.temp_emails.insert_one(insert_doc)
    
    return {
        "status": "success",
        "email": email_dict
    }

@api_router.get("/email/list")
async def list_temp_emails(telegram_chat_id: Optional[int] = None, session = Depends(verify_user_session)):
    """List all active temporary emails"""
    query = {"is_active": True}
    if telegram_chat_id:
        query["telegram_chat_id"] = telegram_chat_id
    
    emails = await db.temp_emails.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"emails": emails}

@api_router.get("/email/domains")
async def list_domains(session = Depends(verify_user_session)):
    """List available email domains"""
    config = await get_config()
    domains = config.get('email_domains', [])
    return {"domains": [d.get('domain') for d in domains]}

@api_router.get("/email/inbox/{email_id}")
async def get_inbox(email_id: str, session = Depends(verify_user_session)):
    """Get inbox for a temporary email"""
    temp_email = await db.temp_emails.find_one({"id": email_id}, {"_id": 0})
    if not temp_email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    emails = await db.inbox.find(
        {"temp_email_id": email_id},
        {"_id": 0}
    ).sort("received_at", -1).to_list(100)
    
    return {"inbox": emails, "temp_email": temp_email}

@api_router.get("/email/message/{message_id}")
async def get_email_message(message_id: str, session = Depends(verify_user_session)):
    """Get a specific email message"""
    message = await db.inbox.find_one({"id": message_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    await db.inbox.update_one({"id": message_id}, {"$set": {"is_read": True}})
    
    return message

@api_router.post("/email/send")
async def send_email(request: SendEmailRequest, session = Depends(verify_user_session)):
    """Send an email from a temporary address"""
    config = await get_config()
    
    if not config.get('resend_api_key'):
        raise HTTPException(status_code=400, detail="Resend API key not configured")
    
    temp_email = await db.temp_emails.find_one({"id": request.from_email_id, "is_active": True}, {"_id": 0})
    if not temp_email:
        raise HTTPException(status_code=404, detail="Sender email not found or inactive")
    
    resend.api_key = config['resend_api_key']
    
    try:
        params = {
            "from": temp_email['email_address'],
            "to": [request.to_email],
            "subject": request.subject,
            "html": request.body_html
        }
        
        email_response = await asyncio.to_thread(resend.Emails.send, params)
        
        return {
            "status": "success",
            "message": f"Email sent to {request.to_email}",
            "email_id": email_response.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@api_router.delete("/email/{email_id}")
async def delete_temp_email(email_id: str, session = Depends(verify_user_session)):
    """Delete/deactivate a temporary email"""
    result = await db.temp_emails.update_one(
        {"id": email_id},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Email not found")
    
    return {"status": "success", "message": "Email deleted"}

# ==================== WEBHOOK ENDPOINTS ====================

@api_router.post("/webhook/resend")
async def resend_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle incoming emails from Resend webhook"""
    try:
        payload = await request.json()
        logger.info(f"Resend webhook received: {payload.get('type', 'unknown')}")
        
        if payload.get('type') == 'email.received':
            data = payload.get('data', {})
            
            to_address = data.get('to', [''])[0] if isinstance(data.get('to'), list) else data.get('to', '')
            
            temp_email = await db.temp_emails.find_one(
                {"email_address": to_address, "is_active": True},
                {"_id": 0}
            )
            
            if not temp_email:
                logger.warning(f"No active temp email found for: {to_address}")
                return {"status": "ignored", "reason": "No matching email"}
            
            inbox_email = InboxEmail(
                temp_email_id=temp_email['id'],
                to_address=to_address,
                from_address=data.get('from', ''),
                from_name=data.get('from_name', ''),
                subject=data.get('subject', 'No Subject'),
                body_text=data.get('text', ''),
                body_html=data.get('html', ''),
                attachments=data.get('attachments', [])
            )
            
            email_dict = inbox_email.model_dump()
            email_dict['received_at'] = email_dict['received_at'].isoformat()
            
            insert_doc = email_dict.copy()
            await db.inbox.insert_one(insert_doc)
            
            background_tasks.add_task(forward_email_to_telegram, email_dict)
            
            return {"status": "success", "message_id": inbox_email.id}
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/webhook/cloudflare")
async def cloudflare_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle incoming emails from Cloudflare Email Routing"""
    try:
        payload = await request.json()
        logger.info(f"Cloudflare webhook received")
        
        to_address = payload.get('to', '')
        
        temp_email = await db.temp_emails.find_one(
            {"email_address": to_address, "is_active": True},
            {"_id": 0}
        )
        
        if not temp_email:
            return {"status": "ignored", "reason": "No matching email"}
        
        inbox_email = InboxEmail(
            temp_email_id=temp_email['id'],
            to_address=to_address,
            from_address=payload.get('from', ''),
            from_name=payload.get('from_name', ''),
            subject=payload.get('subject', 'No Subject'),
            body_text=payload.get('text', ''),
            body_html=payload.get('html', ''),
            attachments=payload.get('attachments', [])
        )
        
        email_dict = inbox_email.model_dump()
        email_dict['received_at'] = email_dict['received_at'].isoformat()
        
        insert_doc = email_dict.copy()
        await db.inbox.insert_one(insert_doc)
        
        background_tasks.add_task(forward_email_to_telegram, email_dict)
        
        return {"status": "success", "message_id": inbox_email.id}
    except Exception as e:
        logger.error(f"Cloudflare webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/webhook/telegram/{secret}")
async def telegram_webhook(secret: str, request: Request, background_tasks: BackgroundTasks):
    """Handle Telegram bot updates"""
    config = await get_config()
    
    if secret != config.get('webhook_secret', ''):
        raise HTTPException(status_code=403, detail="Invalid webhook secret")
    
    try:
        update = await request.json()
        logger.info(f"Telegram update: {update}")
        
        message = update.get('message')
        if not message:
            return {"status": "ok"}
        
        chat_id = message.get('chat', {}).get('id')
        text = message.get('text', '')
        username = message.get('from', {}).get('username', '')
        first_name = message.get('from', {}).get('first_name', '')
        
        if text.startswith('/start'):
            await handle_start_command(chat_id, username, first_name)
        elif text.startswith('/authorize'):
            await handle_authorize_command(chat_id, text)
        elif not await is_telegram_user_authorized(chat_id):
            await send_telegram_message(chat_id, "⛔ You are not authorized to use this bot.\n\nContact the administrator to get access.")
        elif text.startswith('/generate'):
            await handle_generate_command(chat_id, text)
        elif text.startswith('/inbox'):
            await handle_inbox_command(chat_id)
        elif text.startswith('/list'):
            await handle_list_command(chat_id)
        elif text.startswith('/delete'):
            await handle_delete_command(chat_id, text)
        elif text.startswith('/send'):
            await handle_send_command(chat_id, text)
        elif text.startswith('/myid'):
            await handle_myid_command(chat_id, username)
        elif text.startswith('/help'):
            await handle_help_command(chat_id)
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Telegram webhook error: {e}")
        return {"status": "error", "detail": str(e)}

# ==================== TELEGRAM BOT HANDLERS ====================

async def handle_start_command(chat_id: int, username: str, first_name: str):
    """Handle /start command"""
    existing = await db.telegram_users.find_one({"chat_id": chat_id}, {"_id": 0})
    
    if not existing:
        user = TelegramUser(
            chat_id=chat_id,
            username=username.lower() if username else None,
            first_name=first_name
        )
        user_dict = user.model_dump()
        user_dict['registered_at'] = user_dict['registered_at'].isoformat()
        insert_doc = user_dict.copy()
        await db.telegram_users.insert_one(insert_doc)
    else:
        await db.telegram_users.update_one(
            {"chat_id": chat_id},
            {"$set": {"username": username.lower() if username else None, "first_name": first_name}}
        )
    
    config = await get_config()
    auth_status = "🔓 Open Access" if not config.get('telegram_auth_enabled') else "🔐 Authorization Required"
    
    welcome_message = f"""🔮 <b>WELCOME TO GHOSTMAIL</b>

Hello {first_name}! I'm your secure temp email bot.

<b>YOUR INFO:</b>
📱 Chat ID: <code>{chat_id}</code>
👤 Username: @{username if username else 'not set'}
🔑 Status: {auth_status}

<b>AVAILABLE COMMANDS:</b>
/generate [prefix] - Create new temp email
/list - Show your active emails
/inbox - Check inbox for your email
/delete [email_id] - Delete a temp email
/send - Send an email (guided)
/myid - Get your ID for website login
/help - Show this help

🛡️ <i>Your privacy, our priority.</i>"""
    
    await send_telegram_message(chat_id, welcome_message)

async def handle_authorize_command(chat_id: int, text: str):
    """Handle /authorize command (admin only)"""
    config = await get_config()
    authorized_users = config.get('authorized_telegram_users', [])
    
    if authorized_users and chat_id not in authorized_users:
        await send_telegram_message(chat_id, "⛔ Only administrators can use this command.")
        return
    
    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        await send_telegram_message(chat_id, "Usage: /authorize [chat_id]")
        return
    
    try:
        target_chat_id = int(parts[1].strip())
    except ValueError:
        await send_telegram_message(chat_id, "❌ Invalid chat ID. Must be a number.")
        return
    
    if target_chat_id not in authorized_users:
        authorized_users.append(target_chat_id)
        await db.config.update_one(
            {"id": config['id']},
            {"$set": {"authorized_telegram_users": authorized_users}}
        )
        await send_telegram_message(chat_id, f"✅ User {target_chat_id} has been authorized.")
        await send_telegram_message(target_chat_id, "✅ You have been authorized to use GhostMail bot!")
    else:
        await send_telegram_message(chat_id, f"ℹ️ User {target_chat_id} is already authorized.")

async def handle_myid_command(chat_id: int, username: str):
    """Handle /myid command"""
    message = f"""🆔 <b>YOUR IDENTITY</b>

<b>Chat ID:</b> <code>{chat_id}</code>
<b>Username:</b> @{username if username else 'not set'}

<b>Website Login:</b>
Use your username <code>@{username}</code> to login on the website.
An OTP will be sent here for verification."""
    
    await send_telegram_message(chat_id, message)

async def handle_generate_command(chat_id: int, text: str):
    """Handle /generate command"""
    parts = text.split(maxsplit=1)
    custom_prefix = parts[1] if len(parts) > 1 else None
    
    config = await get_config()
    prefix = custom_prefix if custom_prefix else generate_email_prefix()
    prefix = ''.join(c for c in prefix.lower() if c.isalnum() or c in '-_')[:20]
    
    domain = await get_default_domain()
    email_address = f"{prefix}@{domain}"
    
    existing = await db.temp_emails.find_one({"email_address": email_address, "is_active": True}, {"_id": 0})
    if existing:
        await send_telegram_message(chat_id, "❌ Email already exists. Try a different prefix.")
        return
    
    expires_at = None
    expiration_hours = config.get('default_expiration_hours')
    if expiration_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expiration_hours)
    
    temp_email = TempEmail(
        email_address=email_address,
        expires_at=expires_at,
        telegram_chat_id=chat_id
    )
    
    email_dict = temp_email.model_dump()
    email_dict['created_at'] = email_dict['created_at'].isoformat()
    email_dict['expires_at'] = email_dict['expires_at'].isoformat() if email_dict['expires_at'] else None
    
    insert_doc = email_dict.copy()
    await db.temp_emails.insert_one(insert_doc)
    
    await db.telegram_users.update_one(
        {"chat_id": chat_id},
        {"$set": {"current_email_id": email_dict['id']}}
    )
    
    expiry_text = f"\n⏰ Expires: {expires_at.strftime('%Y-%m-%d %H:%M UTC')}" if expires_at else "\n⏰ No expiration"
    
    message = f"""✅ <b>EMAIL GENERATED</b>

📧 <code>{email_address}</code>

ID: <code>{email_dict['id'][:8]}...</code>{expiry_text}

<i>All emails will be forwarded to this chat!</i>"""
    
    await send_telegram_message(chat_id, message)

async def handle_inbox_command(chat_id: int):
    """Handle /inbox command"""
    user = await db.telegram_users.find_one({"chat_id": chat_id}, {"_id": 0})
    
    if not user or not user.get('current_email_id'):
        temp_email = await db.temp_emails.find_one(
            {"telegram_chat_id": chat_id, "is_active": True},
            {"_id": 0}
        )
        if not temp_email:
            await send_telegram_message(chat_id, "❌ No active email. Use /generate to create one.")
            return
        email_id = temp_email['id']
    else:
        email_id = user['current_email_id']
    
    temp_email = await db.temp_emails.find_one({"id": email_id}, {"_id": 0})
    if not temp_email:
        await send_telegram_message(chat_id, "❌ Email not found.")
        return
    
    emails = await db.inbox.find(
        {"temp_email_id": email_id},
        {"_id": 0}
    ).sort("received_at", -1).to_list(10)
    
    if not emails:
        message = f"""📭 <b>INBOX EMPTY</b>

📧 {temp_email['email_address']}

No emails received yet."""
    else:
        message = f"""📬 <b>INBOX</b> ({len(emails)} messages)

📧 {temp_email['email_address']}

"""
        for i, email in enumerate(emails, 1):
            read_status = "📖" if email.get('is_read') else "📩"
            message += f"""{read_status} <b>{i}.</b> {email['subject'][:30]}...
   From: {email['from_address'][:25]}...
   
"""
    
    await send_telegram_message(chat_id, message)

async def handle_list_command(chat_id: int):
    """Handle /list command"""
    emails = await db.temp_emails.find(
        {"telegram_chat_id": chat_id, "is_active": True},
        {"_id": 0}
    ).to_list(20)
    
    if not emails:
        await send_telegram_message(chat_id, "❌ No active emails. Use /generate to create one.")
        return
    
    message = f"""📋 <b>YOUR ACTIVE EMAILS</b> ({len(emails)})

"""
    for i, email in enumerate(emails, 1):
        inbox_count = await db.inbox.count_documents({"temp_email_id": email['id']})
        message += f"""<b>{i}.</b> <code>{email['email_address']}</code>
   ID: <code>{email['id'][:8]}</code> | 📬 {inbox_count} emails

"""
    
    message += "\n<i>Use /delete [id] to remove an email</i>"
    await send_telegram_message(chat_id, message)

async def handle_delete_command(chat_id: int, text: str):
    """Handle /delete command"""
    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        await send_telegram_message(chat_id, "❌ Usage: /delete [email_id]\n\nUse /list to see your emails.")
        return
    
    email_id_prefix = parts[1].strip()
    
    email = await db.temp_emails.find_one(
        {
            "telegram_chat_id": chat_id,
            "is_active": True,
            "id": {"$regex": f"^{email_id_prefix}"}
        },
        {"_id": 0}
    )
    
    if not email:
        await send_telegram_message(chat_id, "❌ Email not found. Check the ID with /list")
        return
    
    await db.temp_emails.update_one(
        {"id": email['id']},
        {"$set": {"is_active": False}}
    )
    
    await send_telegram_message(chat_id, f"✅ Deleted: {email['email_address']}")

async def handle_send_command(chat_id: int, text: str):
    """Handle /send command"""
    parts = text.split('|')
    
    if len(parts) < 3:
        await send_telegram_message(chat_id, """📤 <b>SEND EMAIL</b>

Format: /send recipient@email.com | Subject | Body

Example:
/send test@example.com | Hello | This is my message""")
        return
    
    to_email = parts[0].replace('/send', '').strip()
    subject = parts[1].strip()
    body = parts[2].strip()
    
    user = await db.telegram_users.find_one({"chat_id": chat_id}, {"_id": 0})
    if not user or not user.get('current_email_id'):
        temp_email = await db.temp_emails.find_one(
            {"telegram_chat_id": chat_id, "is_active": True},
            {"_id": 0}
        )
        if not temp_email:
            await send_telegram_message(chat_id, "❌ No active email. Use /generate first.")
            return
        email_id = temp_email['id']
    else:
        email_id = user['current_email_id']
    
    temp_email = await db.temp_emails.find_one({"id": email_id, "is_active": True}, {"_id": 0})
    if not temp_email:
        await send_telegram_message(chat_id, "❌ Your current email is inactive. Use /generate.")
        return
    
    config = await get_config()
    if not config.get('resend_api_key'):
        await send_telegram_message(chat_id, "❌ Email sending not configured by admin.")
        return
    
    resend.api_key = config['resend_api_key']
    
    try:
        params = {
            "from": temp_email['email_address'],
            "to": [to_email],
            "subject": subject,
            "html": f"<p>{body}</p>"
        }
        
        await asyncio.to_thread(resend.Emails.send, params)
        
        await send_telegram_message(chat_id, f"""✅ <b>EMAIL SENT</b>

From: {temp_email['email_address']}
To: {to_email}
Subject: {subject}""")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        await send_telegram_message(chat_id, f"❌ Failed to send: {str(e)}")

async def handle_help_command(chat_id: int):
    """Handle /help command"""
    help_message = """🔮 <b>GHOSTMAIL COMMANDS</b>

<b>📧 Email Management:</b>
/generate [prefix] - Create temp email
/list - Show your active emails
/inbox - Check current inbox
/delete [id] - Delete an email

<b>📤 Sending:</b>
/send to@email | Subject | Body

<b>🔑 Authentication:</b>
/myid - Get your ID for website login
/authorize [chat_id] - Authorize a user (admin)

<b>ℹ️ Info:</b>
/help - Show this message

<b>📌 Tips:</b>
• All received emails are auto-forwarded here
• Attachments are sent as documents
• Use custom prefix for memorable addresses
• Use /myid to get login credentials for website

🛡️ <i>Stay anonymous. Stay safe.</i>"""
    
    await send_telegram_message(chat_id, help_message)

# ==================== STATS ENDPOINT ====================

@api_router.get("/stats")
async def get_stats(session = Depends(verify_user_session)):
    """Get system statistics"""
    total_emails = await db.temp_emails.count_documents({"is_active": True})
    total_messages = await db.inbox.count_documents({})
    total_users = await db.telegram_users.count_documents({})
    
    return {
        "active_emails": total_emails,
        "total_messages": total_messages,
        "telegram_users": total_users
    }

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "GhostMail API v1.0", "status": "online"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
