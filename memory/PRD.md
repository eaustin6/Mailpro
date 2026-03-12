# GhostMail - Temporary Email Service PRD

## Original Problem Statement
Create a vercel deployable tempmail website that uses resend api to send and receive emails. For database use mongodb. Add full telegram bot integration. Like I can send, receive, generate emails using the telegram bot. Also the bot should able to forward all kinds of attachment to the telegram bot. Admin panel to configure custom domain, Resend API key, and Telegram bot token. Dark hacker/cyberpunk theme with default no expiration.

## User Personas
1. **Privacy-conscious Users** - Need temporary emails to avoid spam
2. **Developers** - Testing email functionality without real addresses  
3. **Telegram Users** - Want to manage temp emails via bot

## Core Requirements
- Generate temporary email addresses with customizable prefixes
- Receive and display emails with attachments
- Send emails from temp addresses
- Admin panel for API configuration
- Telegram bot integration
- MongoDB database storage

## Implemented Features (March 12, 2026)
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

## Technical Stack
- Frontend: React + Tailwind CSS + Framer Motion
- Backend: FastAPI + Motor (async MongoDB)
- Database: MongoDB
- Integrations: Resend API, Telegram Bot API

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (High Priority)
- Add email search/filter functionality
- Implement email expiration cleanup job
- Add rate limiting for API endpoints

### P2 (Nice to Have)
- Email templates
- Custom themes selection
- Email analytics dashboard
- Bulk email operations

## Next Tasks
1. Configure Resend API key and domain in admin panel
2. Create Telegram bot via @BotFather and add token
3. Set up Resend webhook to receive incoming emails
4. Test end-to-end email flow with real integration
