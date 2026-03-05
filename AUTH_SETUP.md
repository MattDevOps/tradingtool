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

# Resend Email Service (get free API key from https://resend.com)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Strategy Reality Check <noreply@yourdomain.com>

# Your app URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Set Up Resend (Email Service)

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free)
3. Create an API key
4. Add it to `.env.local` as `RESEND_API_KEY`
5. Verify your domain (or use their test domain for development)

**For production:** You'll need to verify your sending domain in Resend.

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
- Generate a secret: `openssl rand -base64 32`

### "Email not sending"
- Check `RESEND_API_KEY` is set correctly
- Verify your Resend account is active
- Check Resend dashboard for error logs
- Make sure `RESEND_FROM_EMAIL` is valid

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

2. **Verify your email domain in Resend:**
   - Add DNS records as instructed
   - Wait for verification

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
