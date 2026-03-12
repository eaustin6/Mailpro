# GhostMail - Secure Temporary Email Service

<div align="center">

![GhostMail Logo](https://img.shields.io/badge/👻-GhostMail-00ff41?style=for-the-badge&labelColor=020202)

**Anonymous • Secure • Instant**

Generate disposable email addresses with full Telegram bot integration.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.5-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4?style=flat-square&logo=telegram)](https://core.telegram.org/bots)

</div>

---

## 🌟 Features

### Core Features
- 📧 **Instant Email Generation** - Create temporary email addresses in seconds
- 📥 **Real-time Inbox** - Receive emails instantly with auto-refresh
- 📤 **Send Emails** - Send emails from your temporary addresses
- 📎 **Attachment Support** - View and download email attachments
- ⏰ **Expiration Control** - Set custom expiration times or no expiration

### Telegram Bot Integration
- 🤖 **Full Bot Control** - Generate, view, delete emails via Telegram
- 📬 **Auto-forwarding** - All emails forwarded to your Telegram chat
- 📎 **Attachment Forwarding** - Receive attachments directly in Telegram
- 🔐 **OTP Authentication** - Login to website using Telegram OTP

### Security Features
- 🔒 **Admin Authentication** - Password-protected admin panel
- 🔑 **Website Authorization** - Optional Telegram OTP login for users
- 👥 **Telegram Authorization** - Control who can use the bot
- 🛡️ **Toggle Security** - Enable/disable auth features as needed

### Multi-Provider Support
- 📨 **Resend Integration** - Primary email provider
- ☁️ **Cloudflare Email Routing** - Optional backup/load balancing
- 🌐 **Unlimited Domains** - Add and manage multiple email domains

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB
- Resend Account
- Telegram Bot Token

### Local Development

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd ghostmail
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="ghostmail"
CORS_ORIGINS="*"
BACKEND_URL="http://localhost:8001"
ADMIN_PASSWORD="your-secure-password"
EOF

# Start backend
uvicorn server:app --reload --port 8001
```

3. **Frontend Setup**
```bash
cd frontend
yarn install

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Start frontend
yarn start
```

---

## 📦 Vercel Deployment

### Step 1: Prepare Repository

Ensure your repository structure:
```
/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── vercel.json
└── README.md
```

### Step 2: Create vercel.json

Create `vercel.json` in the root:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/server.py",
      "use": "@vercel/python"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/server.py"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ]
}
```

### Step 3: Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `MONGO_URL` | MongoDB connection string (use MongoDB Atlas) |
| `DB_NAME` | Database name (e.g., `ghostmail`) |
| `CORS_ORIGINS` | Allowed origins (e.g., `https://yourdomain.com`) |
| `BACKEND_URL` | Your Vercel deployment URL |
| `ADMIN_PASSWORD` | Strong admin password |
| `REACT_APP_BACKEND_URL` | Same as BACKEND_URL |

### Step 4: Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

---

## 🔧 Configuration Guide

### Admin Panel Access

1. Navigate to `/admin`
2. Enter admin password (set in `ADMIN_PASSWORD` env)
3. Configure settings in the admin panel

### Resend Setup

1. Create account at [resend.com](https://resend.com)
2. **Add Domain**: Domains → Add Domain → Verify DNS records
3. **Create API Key**: API Keys → Create API Key
4. **Configure Webhook**:
   - Go to Webhooks → Add Webhook
   - URL: `https://yourdomain.com/api/webhook/resend`
   - Events: `email.received`
5. Add API key in Admin Panel → General → Resend API Key

### Telegram Bot Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` command
3. Follow prompts to create bot
4. Copy the API token
5. Add token in Admin Panel → General → Telegram Bot Token
6. Webhook is automatically configured

### Cloudflare Email Routing (Optional)

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select domain → Email → Email Routing
3. Enable Email Routing
4. **Routing Rules**:
   - Catch-all → Send to Worker/Webhook
   - Webhook URL: `https://yourdomain.com/api/webhook/cloudflare`
5. **API Token**: My Profile → API Tokens → Create Token
6. Add credentials in Admin Panel

---

## 🤖 Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize bot & register |
| `/generate [prefix]` | Create new temp email |
| `/list` | Show your active emails |
| `/inbox` | Check current inbox |
| `/delete [id]` | Delete a temp email |
| `/send to \| subject \| body` | Send an email |
| `/myid` | Get your ID for website login |
| `/authorize [chat_id]` | Authorize a user (admin only) |
| `/help` | Show all commands |

### Usage Examples

**Generate email with custom prefix:**
```
/generate myemail
→ Creates: myemail@yourdomain.com
```

**Send an email:**
```
/send test@example.com | Hello | This is my message body
```

**Delete an email:**
```
/delete abc123
→ Deletes email starting with ID "abc123"
```

---

## 🔐 Security Configuration

### Website Authentication

When enabled:
1. User enters Telegram username on login page
2. OTP is sent to user's Telegram
3. User enters OTP to access the website

Enable in Admin Panel → Security → Website Authentication

### Telegram Bot Authorization

When enabled:
1. Only authorized users can use bot commands
2. Add users via Admin Panel or `/authorize` command
3. New users see "Not authorized" message

Enable in Admin Panel → Security → Telegram Bot Authorization

### Adding Authorized Users

**Via Admin Panel:**
1. Go to Security tab
2. Enter user's chat ID (they can get it with `/myid`)
3. Click "Add"

**Via Telegram:**
```
/authorize 123456789
```

---

## 🌐 Multi-Domain Setup

### Adding Domains

1. Go to Admin Panel → Domains
2. Enter domain name
3. Select provider (Resend or Cloudflare)
4. Check "Set as default" if desired
5. Click "Add Domain"

### Provider Configuration

**For Resend domains:**
- Add domain in Resend Dashboard first
- Complete DNS verification
- Then add in GhostMail admin

**For Cloudflare domains:**
- Enable Email Routing in Cloudflare
- Set up webhook routing
- Then add in GhostMail admin

---

## 📁 Project Structure

```
ghostmail/
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   │   ├── HomePage.js
│   │   │   ├── InboxPage.js
│   │   │   ├── EmailDetailPage.js
│   │   │   ├── AdminPage.js
│   │   │   └── LoginPage.js
│   │   ├── lib/
│   │   │   └── api.js     # API client
│   │   └── App.js         # Root component
│   ├── package.json
│   └── .env
│
├── vercel.json            # Vercel configuration
└── README.md
```

---

## 🔌 API Endpoints

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/` | API status |
| GET | `/api/stats` | System statistics |
| GET | `/api/auth/status` | Auth configuration |
| POST | `/api/auth/request-otp` | Request login OTP |
| POST | `/api/auth/verify-otp` | Verify OTP |

### Protected Endpoints (require auth if enabled)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/email/generate` | Create temp email |
| GET | `/api/email/list` | List emails |
| GET | `/api/email/domains` | List domains |
| GET | `/api/email/inbox/{id}` | Get inbox |
| GET | `/api/email/message/{id}` | Get message |
| POST | `/api/email/send` | Send email |
| DELETE | `/api/email/{id}` | Delete email |

### Admin Endpoints (require admin auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/config` | Get config |
| PUT | `/api/admin/config` | Update config |
| POST | `/api/admin/domains` | Add domain |
| DELETE | `/api/admin/domains/{domain}` | Remove domain |

### Webhook Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook/resend` | Resend webhook |
| POST | `/api/webhook/cloudflare` | Cloudflare webhook |
| POST | `/api/webhook/telegram/{secret}` | Telegram webhook |

---

## 🎨 Customization

### Theme
The application uses a cyberpunk/hacker aesthetic with:
- JetBrains Mono font
- Neon green (#00ff41) primary color
- Dark backgrounds
- Terminal-style UI elements

Customize in `frontend/src/index.css` and `tailwind.config.js`.

### Default Password
Change the admin password in environment variables:
```
ADMIN_PASSWORD=your-very-secure-password
```

---

## 🐛 Troubleshooting

### Emails not receiving
1. Check Resend webhook is configured correctly
2. Verify domain DNS records
3. Check webhook URL is accessible

### Telegram bot not responding
1. Verify bot token is correct
2. Check webhook is set (should auto-configure)
3. Ensure BACKEND_URL is publicly accessible

### Login OTP not sending
1. Verify user has messaged bot with /start first
2. Check Telegram bot token is configured
3. Ensure username matches (case insensitive)

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

<div align="center">

**Built with 👻 by GhostMail Team**

[Report Bug](issues) • [Request Feature](issues)

</div>
