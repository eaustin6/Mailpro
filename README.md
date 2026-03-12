# GhostMail - Secure Temporary Email Service

<div align="center">

![GhostMail](https://img.shields.io/badge/👻-GhostMail-00ff41?style=for-the-badge&labelColor=020202)

**Anonymous • Secure • Instant**

Generate disposable email addresses with full Telegram bot integration.

</div>

---

## 🚀 Vercel Deployment Guide

### Step 1: Fork or Clone Repository

```bash
git clone <your-repo-url>
cd ghostmail
```

### Step 2: Setup MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account and cluster
3. Click **Connect** → **Drivers** → Copy connection string
4. Replace `<password>` with your password in the connection string

### Step 3: Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and login
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Add Environment Variables:

| Variable | Value |
|----------|-------|
| `MONGO_URL` | Your MongoDB Atlas connection string |
| `DB_NAME` | `ghostmail` |
| `ADMIN_PASSWORD` | Your secure admin password |
| `CORS_ORIGINS` | `*` (or your domain) |

5. Click **Deploy**

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Step 4: Configure in Admin Panel

After deployment, go to `https://your-app.vercel.app/admin`:

1. Login with your `ADMIN_PASSWORD`
2. Go to **General** tab:
   - Add your **Resend API Key**
   - Add your **Telegram Bot Token**
3. Go to **Domains** tab:
   - Add your verified email domains
4. Go to **Security** tab:
   - Enable/disable authentication as needed

---

## 🔧 Initial Setup After Deployment

### 1. Resend API Setup

1. Create account at [resend.com](https://resend.com)
2. **Domains** → **Add Domain** → Follow DNS verification
3. **API Keys** → **Create API Key** → Copy key
4. **Webhooks** → **Add Webhook**:
   - URL: `https://your-app.vercel.app/api/webhook/resend`
   - Events: `email.received`
5. Add API key in Admin Panel → General → Resend API Key

### 2. Telegram Bot Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` → Follow prompts
3. Copy the bot token
4. Add token in Admin Panel → General → Telegram Bot Token
5. Webhook is automatically configured!

### 3. Cloudflare Email Routing (Optional)

Use as backup/load balancing:

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Your domain → Email
2. Enable **Email Routing**
3. **Routing Rules** → Catch-all → Send to webhook
4. Webhook: `https://your-app.vercel.app/api/webhook/cloudflare`

---

## 🤖 Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Register and get started |
| `/generate [prefix]` | Create new temp email |
| `/list` | Show your active emails |
| `/inbox` | Check current inbox |
| `/delete [id]` | Delete an email |
| `/send to \| subject \| body` | Send an email |
| `/myid` | Get your ID for website login |
| `/authorize [chat_id]` | Authorize a user (admin) |
| `/help` | Show all commands |

### Examples

```
# Generate email with custom prefix
/generate myemail
→ Creates: myemail@yourdomain.com

# Send an email
/send test@example.com | Hello | This is my message

# Delete an email by ID prefix
/delete abc123
```

---

## 🔐 Security Features

### Admin Authentication
- Password-based login (set via `ADMIN_PASSWORD` env)
- Session tokens with 24h expiration
- Protected admin API endpoints

### Website Authentication (Optional)
- Toggle ON/OFF in Admin → Security
- Users login with Telegram username
- OTP sent to user's Telegram
- Session-based access control

### Telegram Bot Authorization (Optional)
- Toggle ON/OFF in Admin → Security
- Restrict bot access to authorized users
- Manage users via Admin Panel or `/authorize` command

---

## 🌐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `DB_NAME` | ❌ | Database name (default: `ghostmail`) |
| `ADMIN_PASSWORD` | ✅ | Admin panel password |
| `CORS_ORIGINS` | ❌ | Allowed origins (default: `*`) |

**Note:** All other settings (Resend API, Telegram Token, Domains) are configured via the Admin Panel.

---

## 📁 Project Structure

```
ghostmail/
├── backend/
│   ├── server.py          # FastAPI application
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # React components
│   │   └── lib/api.js     # API client
│   └── package.json
├── vercel.json            # Vercel configuration
└── README.md
```

---

## 🔌 API Endpoints

### Public
- `GET /api/` - Health check
- `GET /api/stats` - Statistics
- `GET /api/auth/status` - Auth configuration

### User Auth
- `POST /api/auth/request-otp` - Request login OTP
- `POST /api/auth/verify-otp` - Verify OTP

### Email Operations
- `POST /api/email/generate` - Create temp email
- `GET /api/email/list` - List emails
- `GET /api/email/domains` - List domains
- `GET /api/email/inbox/{id}` - Get inbox
- `GET /api/email/message/{id}` - Get message
- `POST /api/email/send` - Send email
- `DELETE /api/email/{id}` - Delete email

### Admin (Protected)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/config` - Get configuration
- `PUT /api/admin/config` - Update configuration
- `POST /api/admin/domains` - Add domain
- `DELETE /api/admin/domains/{domain}` - Remove domain

### Webhooks
- `POST /api/webhook/resend` - Resend incoming emails
- `POST /api/webhook/cloudflare` - Cloudflare incoming emails
- `POST /api/webhook/telegram/{secret}` - Telegram updates

---

## 🐛 Troubleshooting

### "Database not configured" Error
- Ensure `MONGO_URL` is set in Vercel environment variables
- Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for Vercel)

### Emails Not Receiving
- Verify Resend webhook URL is correct
- Check domain DNS records in Resend
- Ensure `email.received` event is selected

### Telegram Bot Not Responding
- Verify bot token is correct
- Check Admin Panel → General → Telegram Bot Token
- Webhook is auto-configured when token is saved

### Website Auth OTP Not Sending
- User must have messaged bot with `/start` first
- Check Telegram bot token is configured
- Verify username matches (case insensitive)

---

## 📄 License

MIT License

---

<div align="center">

**Built with 👻 GhostMail**

[Report Bug](issues) • [Request Feature](issues)

</div>
