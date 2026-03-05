# Authentication & Email Setup Guide

## What's Been Added

✅ **User Authentication System**
- Sign up page (`/signup`)
- Login page (`/login`)
- Protected routes (upload, rule-builder require login)
- Session management with NextAuth.js

✅ **Email Functionality**
- Email reports sent via Resend
- Automatic email sending when user requests report
- HTML email templates with strategy analysis

## Setup Steps

### 1. Run Database Migration

Add authentication tables to your database:

```bash
npx tsx scripts/migrate-add-auth-tables.ts
```

This will add:
- `password_hash` and `name` columns to `users` table
- `sessions` table for NextAuth
- `accounts` table for NextAuth
- `verification_tokens` table for NextAuth

### 2. Set Up Environment Variables

Add these to your `.env.local` file:

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=your-random-secret-key-here
NEXTAUTH_URL=http://localhost:3000  # or your production URL

# Email Service Configuration (choose ONE option):

# Option 1: Resend (use your existing account - recommended!)
RESEND_API_KEY=re_your_existing_api_key_here
RESEND_FROM_EMAIL=Strategy Reality Check <noreply@your-already-verified-domain.com>

# Option 2: Gmail SMTP (free alternative)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-gmail-app-password
# SMTP_FROM_EMAIL=your-email@gmail.com
# SMTP_FROM_NAME=Strategy Reality Check

# Your app URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

**To generate NEXTAUTH_SECRET:**

**Windows (PowerShell) - Use this:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Mac/Linux (alternative):**
```bash
openssl rand -base64 32
```

**Or use this online generator:** https://generate-secret.vercel.app/32

### 3. Set Up Email Service (Choose ONE option)

#### Option A: Use Your Existing Resend Account (Recommended - No Extra Cost!)
**You can use the same Resend account and verified domain from your other website!**

1. Go to your Resend dashboard: https://resend.com/api-keys
2. Copy your existing API key (or create a new one if you prefer)
3. Use the same verified domain you already have set up
4. Add to `.env.local`:
```bash
RESEND_API_KEY=re_your_existing_api_key_here
RESEND_FROM_EMAIL=Strategy Reality Check <noreply@your-already-verified-domain.com>
```

**Note:** You can use the same domain and API key across multiple projects. No need to verify a new domain or pay extra!

#### Option B: Gmail SMTP (Free, No Account Needed)
1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
4. Add to `.env.local`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Strategy Reality Check
```

#### Option C: SendGrid (Free Tier: 100 emails/day)
1. Sign up at [https://sendgrid.com](https://sendgrid.com)
2. Create an API key
3. Add to `.env.local`:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Strategy Reality Check
```

#### Option D: Any SMTP Provider
Works with any email service that supports SMTP (Outlook, Yahoo, custom SMTP, etc.)
```bash
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password-or-app-password
SMTP_FROM_EMAIL=your-email@domain.com
SMTP_FROM_NAME=Strategy Reality Check
```

### 4. Test the Setup

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Create an account:**
   - Go to `http://localhost:3000/signup`
   - Create an account with email and password

3. **Upload a CSV:**
   - Sign in at `http://localhost:3000/login`
   - Upload your trade CSV
   - Complete the analysis

4. **Request email report:**
   - On the results page, click "Send Report"
   - Check your email inbox

## How It Works

### Authentication Flow

1. User signs up → Account created with hashed password
2. User logs in → NextAuth creates JWT session
3. Protected routes check for valid session
4. If not logged in → Redirected to `/login`

### Email Flow

1. User completes analysis
2. On results page, clicks "Send Report"
3. System fetches result data
4. Sends formatted HTML email via Resend
5. User receives email with full analysis

## Protected Routes

These routes now require login:
- `/upload` - CSV upload page
- `/rule-builder` - Strategy rule builder

These routes are public:
- `/` - Landing page
- `/login` - Login page
- `/signup` - Signup page
- `/results` - Results page (but email requires login)

## Database Changes

The `users` table now has:
- `password_hash` - Bcrypt hashed passwords
- `name` - Optional user name
- `updated_at` - Timestamp

New tables:
- `sessions` - NextAuth session storage
- `accounts` - NextAuth account linking
- `verification_tokens` - Email verification tokens

## Troubleshooting

### "NEXTAUTH_SECRET is not set"
- Add `NEXTAUTH_SECRET` to `.env.local`
- Generate a secret (Windows): `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- Or use online generator: https://generate-secret.vercel.app/32

### "Email not sending"
- **If using Resend:** Check `RESEND_API_KEY` is set correctly, verify account is active
- **If using Gmail SMTP:** 
  - Make sure you're using an App Password (not your regular password)
  - Enable 2-Step Verification first
  - Check that "Less secure app access" is enabled (if using older Gmail)
- **If using SMTP:** Verify all SMTP settings are correct (host, port, user, password)
- Check server logs for specific error messages

### "Authentication not working"
- Make sure you ran the migration script
- Check database connection
- Verify `NEXTAUTH_URL` matches your app URL

### "Can't access upload page"
- You must be logged in
- Go to `/login` first
- After login, you'll be redirected to `/upload`

## Production Deployment

1. **Set environment variables in Vercel:**
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your production URL)
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `NEXT_PUBLIC_APP_URL` (your production URL)

2. **Verify your email configuration:**
   - **If using Resend:** Verify your sending domain in Resend dashboard
   - **If using Gmail:** Make sure App Password is set correctly
   - **If using SMTP:** Test SMTP connection works

3. **Test the full flow:**
   - Sign up
   - Upload CSV
   - Request email report
   - Verify email arrives

## Next Steps

- Add password reset functionality
- Add email verification
- Add user dashboard to view past analyses
- Add ability to delete account
