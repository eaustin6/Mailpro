# GhostMail - Temporary Email Service PRD

## Original Problem Statement
Create a vercel deployable tempmail website that uses resend api to send and receive emails. For database use mongodb. Add full telegram bot integration. Like I can send, receive, generate emails using the telegram bot. Also the bot should able to forward all kinds of attachment to the telegram bot.

### Phase 2 Requirements
- Secure admin login with password from environment variable
- Website authorization via Telegram OTP (toggle on/off)
- Telegram bot authorization (toggle on/off)
- Cloudflare Email Routing integration (optional/load balancing)
- Unlimited domains management
- All settings configurable from admin control panel (except DB and password)
- Detailed README for Vercel deployment

## Technical Stack
- **Frontend**: React + Tailwind CSS + Framer Motion + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB Atlas
- **Integrations**: Resend API, Telegram Bot API, Cloudflare Email Routing

## Implemented Features (March 12, 2026)

### Core Features
- [x] Email generation with custom prefix and expiration
- [x] Inbox viewing with auto-refresh
- [x] Send emails from temp addresses
- [x] Attachment support with download
- [x] Domain selection for email creation
- [x] Stats dashboard

### Telegram Bot
- [x] /start - Register and welcome
- [x] /generate [prefix] - Create temp email
- [x] /list - Show active emails
- [x] /inbox - Check inbox
- [x] /delete [id] - Delete email
- [x] /send to | subject | body - Send email
- [x] /myid - Get login credentials
- [x] /authorize [chat_id] - Authorize user (admin)
- [x] Auto-forward emails with attachments

### Security
- [x] Admin password authentication (ADMIN_PASSWORD env)
- [x] 24-hour session tokens
- [x] Website auth via Telegram OTP (toggle)
- [x] Telegram bot authorization (toggle)
- [x] Authorized users management

### Admin Panel
- [x] 4-tab interface (General, Domains, Security, Guide)
- [x] Resend API key configuration
- [x] Telegram bot token configuration
- [x] Cloudflare credentials (optional)
- [x] Domain management (unlimited)
- [x] Auth toggles
- [x] Setup guides for all integrations

### Vercel Deployment
- [x] vercel.json configuration
- [x] Lazy MongoDB connection for serverless
- [x] Environment variable handling
- [x] Comprehensive README

## Environment Variables (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| MONGO_URL | Yes | MongoDB Atlas connection string |
| DB_NAME | No | Database name (default: ghostmail) |
| ADMIN_PASSWORD | Yes | Admin panel password |
| CORS_ORIGINS | No | Allowed origins (default: *) |

## API Endpoints Summary
- 4 Public endpoints (health, stats, auth status)
- 6 Email endpoints (generate, list, inbox, message, send, delete)
- 5 Admin endpoints (login, config, domains, authorize)
- 3 Webhook endpoints (resend, cloudflare, telegram)

## Next Steps for User
1. Deploy to Vercel with environment variables
2. Configure Resend API key in Admin → General
3. Create Telegram bot and add token
4. Set up Resend webhook for incoming emails
5. Add custom domains if needed
6. Enable security features as desired
