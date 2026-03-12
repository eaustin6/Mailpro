from fastapi import FastAPI, APIRouter, HTTPException, Request, BackgroundTasks
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

# ==================== MODELS ====================

class ConfigModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    resend_api_key: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    email_domain: str = "resend.dev"
    webhook_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    default_expiration_hours: Optional[int] = None  # None = no expiration
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConfigUpdate(BaseModel):
    resend_api_key: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    email_domain: Optional[str] = None
    webhook_secret: Optional[str] = None
    default_expiration_hours: Optional[int] = None

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
    registered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

async def send_telegram_message(chat_id: int, text: str, parse_mode: str = "HTML"):
    """Send message to Telegram user"""
    config = await get_config()
    token = config.get('telegram_bot_token')
    if not token:
        logger.warning("Telegram bot token not configured")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
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
        async with httpx.AsyncClient() as client:
            files = {"document": (filename, file_content)}
            data = {"chat_id": chat_id, "caption": caption}
            response = await client.post(
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
    
    # Format message
    message = f"""📬 <b>NEW EMAIL RECEIVED</b>

<b>From:</b> {inbox_email.get('from_name', '')} &lt;{inbox_email['from_address']}&gt;
<b>To:</b> {inbox_email['to_address']}
<b>Subject:</b> {inbox_email['subject']}
<b>Time:</b> {inbox_email['received_at']}

<b>Content:</b>
{inbox_email.get('body_text', 'No text content')[:1000]}"""
    
    await send_telegram_message(chat_id, message)
    
    # Send attachments
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
    
    # Mark as forwarded
    await db.inbox.update_one(
        {"id": inbox_email['id']},
        {"$set": {"forwarded_to_telegram": True}}
    )

# ==================== CONFIG ENDPOINTS ====================

@api_router.get("/admin/config")
async def get_admin_config():
    """Get current configuration (masks sensitive data)"""
    config = await get_config()
    # Mask sensitive data
    if config.get('resend_api_key'):
        config['resend_api_key'] = f"{config['resend_api_key'][:10]}...{config['resend_api_key'][-4:]}"
    if config.get('telegram_bot_token'):
        config['telegram_bot_token'] = f"{config['telegram_bot_token'][:10]}...{config['telegram_bot_token'][-4:]}"
    return config

@api_router.put("/admin/config")
async def update_admin_config(update: ConfigUpdate):
    """Update configuration"""
    config = await get_config()
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.config.update_one(
        {"id": config['id']},
        {"$set": update_dict}
    )
    
    # If telegram bot token changed, set webhook
    if update.telegram_bot_token:
        await setup_telegram_webhook(update.telegram_bot_token, config.get('webhook_secret', ''))
    
    return {"status": "success", "message": "Configuration updated"}

async def setup_telegram_webhook(token: str, webhook_secret: str):
    """Setup Telegram webhook"""
    backend_url = os.environ.get('BACKEND_URL', '')
    if not backend_url:
        logger.warning("BACKEND_URL not set, cannot setup Telegram webhook")
        return
    
    webhook_url = f"{backend_url}/api/webhook/telegram/{webhook_secret}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{token}/setWebhook",
                json={"url": webhook_url}
            )
            logger.info(f"Telegram webhook setup response: {response.json()}")
    except Exception as e:
        logger.error(f"Failed to setup Telegram webhook: {e}")

# ==================== EMAIL ENDPOINTS ====================

@api_router.post("/email/generate")
async def generate_temp_email(request: TempEmailCreate):
    """Generate a new temporary email address"""
    config = await get_config()
    
    prefix = request.custom_prefix if request.custom_prefix else generate_email_prefix()
    # Sanitize prefix
    prefix = ''.join(c for c in prefix.lower() if c.isalnum() or c in '-_')[:20]
    
    domain = config.get('email_domain', 'resend.dev')
    email_address = f"{prefix}@{domain}"
    
    # Check if email already exists
    existing = await db.temp_emails.find_one({"email_address": email_address, "is_active": True}, {"_id": 0})
    if existing:
        return {"status": "error", "message": "Email address already exists"}
    
    # Calculate expiration
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
    
    # Store copy for insert (MongoDB mutates dict and adds _id)
    insert_doc = email_dict.copy()
    await db.temp_emails.insert_one(insert_doc)
    
    return {
        "status": "success",
        "email": email_dict
    }

@api_router.get("/email/list")
async def list_temp_emails(telegram_chat_id: Optional[int] = None):
    """List all active temporary emails"""
    query = {"is_active": True}
    if telegram_chat_id:
        query["telegram_chat_id"] = telegram_chat_id
    
    emails = await db.temp_emails.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"emails": emails}

@api_router.get("/email/inbox/{email_id}")
async def get_inbox(email_id: str):
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
async def get_email_message(message_id: str):
    """Get a specific email message"""
    message = await db.inbox.find_one({"id": message_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Mark as read
    await db.inbox.update_one({"id": message_id}, {"$set": {"is_read": True}})
    
    return message

@api_router.post("/email/send")
async def send_email(request: SendEmailRequest):
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
async def delete_temp_email(email_id: str):
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
            
            # Find the temp email
            temp_email = await db.temp_emails.find_one(
                {"email_address": to_address, "is_active": True},
                {"_id": 0}
            )
            
            if not temp_email:
                logger.warning(f"No active temp email found for: {to_address}")
                return {"status": "ignored", "reason": "No matching email"}
            
            # Store the email
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
            
            # Forward to Telegram in background
            background_tasks.add_task(forward_email_to_telegram, email_dict)
            
            return {"status": "success", "message_id": inbox_email.id}
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
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
        
        # Handle commands
        if text.startswith('/start'):
            await handle_start_command(chat_id, username, first_name)
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
        elif text.startswith('/help'):
            await handle_help_command(chat_id)
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Telegram webhook error: {e}")
        return {"status": "error", "detail": str(e)}

# ==================== TELEGRAM BOT HANDLERS ====================

async def handle_start_command(chat_id: int, username: str, first_name: str):
    """Handle /start command"""
    # Register or update user
    existing = await db.telegram_users.find_one({"chat_id": chat_id}, {"_id": 0})
    
    if not existing:
        user = TelegramUser(
            chat_id=chat_id,
            username=username,
            first_name=first_name
        )
        user_dict = user.model_dump()
        user_dict['registered_at'] = user_dict['registered_at'].isoformat()
        insert_doc = user_dict.copy()
        await db.telegram_users.insert_one(insert_doc)
    
    welcome_message = f"""🔮 <b>WELCOME TO GHOSTMAIL</b>

Hello {first_name}! I'm your secure temp email bot.

<b>AVAILABLE COMMANDS:</b>
/generate [prefix] - Create new temp email
/list - Show your active emails
/inbox - Check inbox for your email
/delete [email_id] - Delete a temp email
/send - Send an email (guided)
/help - Show this help

🛡️ <i>Your privacy, our priority.</i>"""
    
    await send_telegram_message(chat_id, welcome_message)

async def handle_generate_command(chat_id: int, text: str):
    """Handle /generate command"""
    parts = text.split(maxsplit=1)
    custom_prefix = parts[1] if len(parts) > 1 else None
    
    config = await get_config()
    prefix = custom_prefix if custom_prefix else generate_email_prefix()
    prefix = ''.join(c for c in prefix.lower() if c.isalnum() or c in '-_')[:20]
    
    domain = config.get('email_domain', 'resend.dev')
    email_address = f"{prefix}@{domain}"
    
    # Check if email already exists
    existing = await db.temp_emails.find_one({"email_address": email_address, "is_active": True}, {"_id": 0})
    if existing:
        await send_telegram_message(chat_id, "❌ Email already exists. Try a different prefix.")
        return
    
    # Calculate expiration
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
    
    # Update user's current email
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
    # Get user's current email
    user = await db.telegram_users.find_one({"chat_id": chat_id}, {"_id": 0})
    
    if not user or not user.get('current_email_id'):
        # Get most recent email
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
    
    # Find email by prefix
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
    # Parse: /send to@email.com | Subject | Body
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
    
    # Get user's current email
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

<b>ℹ️ Info:</b>
/help - Show this message

<b>📌 Tips:</b>
• All received emails are auto-forwarded here
• Attachments are sent as documents
• Use custom prefix for memorable addresses

🛡️ <i>Stay anonymous. Stay safe.</i>"""
    
    await send_telegram_message(chat_id, help_message)

# ==================== STATS ENDPOINT ====================

@api_router.get("/stats")
async def get_stats():
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
