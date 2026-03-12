# GhostMail - Temporary Email Service PRD

## Original Problem Statement
Create a vercel deployable tempmail website that uses resend api to send and receive emails. For database use mongodb. Add full telegram bot integration. Like I can send, receive, generate emails using the telegram bot. Also the bot should able to forward all kinds of attachment to the telegram bot. Admin panel to configure custom domain, Resend API key, and Telegram bot token. Dark hacker/cyberpunk theme with default no expiration.

### Additional Requirements (Phase 2)
- Secure admin login with password-based authentication (from env)
- Website authorization via Telegram OTP (toggle on/off)
- Telegram bot authorization for restricted access (toggle on/off)
- Cloudflare Email Routing integration for load balancing (optional)
- Unlimited domains management
- Comprehensive setup guides in admin panel

## User Personas
1. **Privacy-conscious Users** - Need temporary emails to avoid spam
2. **Developers** - Testing email functionality without real addresses  
3. **Telegram Users** - Want to manage temp emails via bot
4. **Administrators** - Configure and secure the GhostMail instance

## Core Requirements
- Generate temporary email addresses with customizable prefixes
- Receive and display emails with attachments
- Send emails from temp addresses
- Admin panel for API configuration
- Telegram bot integration
- MongoDB database storage
- Secure authentication system

## Implemented Features

### Phase 1 (March 12, 2026)
- [x] Homepage with cyberpunk/hacker theme
- [x] Email generator with custom prefix and expiration options
- [x] Active emails list with copy/inbox/delete actions
- [x] Inbox page with auto-refresh (30s)
- [x] Email detail view with attachment download
- [x] Compose email modal
- [x] Admin configuration panel (Resend API, Telegram Bot, Domain, Expiration)
- [x] Backend API endpoints for all CRUD operations
- [x] Telegram bot webhook endpoint and command handlers
- [x] Resend webhook for incoming emails
- [x] Email forwarding to Telegram with attachments
- [x] Stats dashboard (active emails, messages, telegram users)

### Phase 2 (March 12, 2026)
- [x] Admin password-based authentication (ADMIN_PASSWORD env)
- [x] Admin session management with token expiration
- [x] Website authorization via Telegram OTP (toggle on/off)
- [x] Telegram bot authorization for restricted access (toggle on/off)
- [x] Authorized users management in admin panel
- [x] Cloudflare Email Routing webhook endpoint
- [x] Cloudflare API token and account ID configuration
- [x] Unlimited domains management (add/remove)
- [x] Multi-provider domain support (Resend/Cloudflare)
- [x] Domain selection in email generator
- [x] Comprehensive setup guides (Resend, Telegram, Cloudflare)
- [x] Login page with Telegram OTP flow
- [x] User session management
- [x] Bot commands: /myid, /authorize
- [x] Detailed README with Vercel deployment guide

## Technical Stack
- Frontend: React + Tailwind CSS + Framer Motion + Shadcn/UI
- Backend: FastAPI + Motor (async MongoDB)
- Database: MongoDB
- Integrations: Resend API, Telegram Bot API, Cloudflare Email Routing

## API Endpoints

### Public
- GET /api/ - API status
- GET /api/stats - System statistics
- GET /api/auth/status - Auth configuration
- POST /api/auth/request-otp - Request login OTP
- POST /api/auth/verify-otp - Verify OTP

### Protected (optional auth)
- POST /api/email/generate - Create temp email
- GET /api/email/list - List emails
- GET /api/email/domains - List domains
- GET /api/email/inbox/{id} - Get inbox
- POST /api/email/send - Send email
- DELETE /api/email/{id} - Delete email

### Admin (requires admin auth)
- POST /api/admin/login - Admin login
- GET /api/admin/config - Get config
- PUT /api/admin/config - Update config
- POST /api/admin/domains - Add domain
- DELETE /api/admin/domains/{domain} - Remove domain
- POST /api/admin/authorize-telegram-user/{chat_id} - Authorize user
- DELETE /api/admin/authorize-telegram-user/{chat_id} - Revoke user

### Webhooks
- POST /api/webhook/resend - Resend webhook
- POST /api/webhook/cloudflare - Cloudflare webhook
- POST /api/webhook/telegram/{secret} - Telegram webhook

## Telegram Bot Commands
| Command | Description |
|---------|-------------|
| /start | Initialize & register |
| /generate [prefix] | Create temp email |
| /list | Show active emails |
| /inbox | Check inbox |
| /delete [id] | Delete email |
| /send to \| subject \| body | Send email |
| /myid | Get login credentials |
| /authorize [chat_id] | Authorize user (admin) |
| /help | Show commands |

## Prioritized Backlog

### P0 (Critical)
- None remaining

### P1 (High Priority)
- Email search/filter functionality
- Email expiration cleanup job
- Rate limiting for API endpoints
- Admin multi-user support

### P2 (Nice to Have)
- Email templates
- Custom themes selection
- Email analytics dashboard
- Bulk email operations
- Two-factor admin authentication

## Next Tasks
1. Configure Resend API key and domain in admin panel
2. Create Telegram bot via @BotFather and add token
3. Set up Resend webhook to receive incoming emails
4. Test end-to-end email flow with real integration
5. Optional: Configure Cloudflare Email Routing for backup

## Environment Variables
| Variable | Description |
|----------|-------------|
| MONGO_URL | MongoDB connection string |
| DB_NAME | Database name |
| CORS_ORIGINS | Allowed CORS origins |
| BACKEND_URL | Backend URL for webhooks |
| ADMIN_PASSWORD | Admin panel password |
| REACT_APP_BACKEND_URL | Frontend API URL |
