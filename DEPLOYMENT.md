# Deployment Guide: Vercel + Neon

## Step 1: Deploy to Vercel (Without Database)

### Option A: Deploy via Vercel CLI

1. Install Vercel CLI (if not already installed):
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (Select your account)
- Link to existing project? **No**
- Project name? (Use default or enter one)
- Directory? **./** (current directory)
- Override settings? **No**

4. Deploy to production:
```bash
vercel --prod
```

### Option B: Deploy via GitHub + Vercel Dashboard

1. Push your code to GitHub (if not already):
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Go to [vercel.com](https://vercel.com) and sign in

3. Click "Add New Project"

4. Import your GitHub repository

5. Configure project:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: **./** (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

6. **Don't add DATABASE_URL yet** - we'll do that after Neon setup

7. Click "Deploy"

## Step 2: Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up/login

2. Create a new project:
   - Project name: `strategy-reality-check` (or your choice)
   - Region: Choose closest to your Vercel region (e.g., `us-east-1`)
   - PostgreSQL version: 15 or 16 (latest)

3. Copy your connection string from the Neon dashboard
   - It will look like: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`

## Step 3: Initialize Database Schema

### Option A: Using Neon SQL Editor

1. Go to your Neon project dashboard
2. Click "SQL Editor"
3. Run the SQL from `lib/db.ts` (the `initDatabase()` function) or use this:

```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trade_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    original_file_url TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES trade_uploads(id) ON DELETE CASCADE,
    open_time TIMESTAMPTZ NOT NULL,
    close_time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    pnl NUMERIC NOT NULL,
    quantity INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_upload ON trades(upload_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_time ON trades(open_time, close_time);

CREATE TABLE IF NOT EXISTS strategy_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES trade_uploads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    rule_definition JSONB NOT NULL,
    metrics JSONB NOT NULL,
    probability_random NUMERIC NOT NULL,
    verdict TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_results_upload ON strategy_results(upload_id);
CREATE INDEX IF NOT EXISTS idx_strategy_results_user ON strategy_results(user_id);
```

### Option B: Using the Init Script (Local)

1. Create `.env.local` with your DATABASE_URL:
```bash
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

2. Run the init script:
```bash
npx tsx scripts/init-db.ts
```

## Step 4: Add DATABASE_URL to Vercel

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add new variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Your Neon connection string
   - **Environment:** Select all (Production, Preview, Development)
4. Click "Save"

5. **Redeploy** your application:
   - Go to "Deployments" tab
   - Click the "..." menu on the latest deployment
   - Click "Redeploy"

Or trigger a new deployment by pushing a commit:
```bash
git commit --allow-empty -m "Trigger redeploy with DATABASE_URL"
git push
```

## Step 5: Verify Deployment

1. Visit your Vercel deployment URL
2. Try uploading a CSV file
3. Check that it processes correctly
4. Verify data is stored in Neon database

## Troubleshooting

### "DATABASE_URL environment variable is not set"
- Make sure you added DATABASE_URL in Vercel dashboard
- Make sure you redeployed after adding the variable
- Check that the variable is available in the correct environment (Production/Preview)

### Database connection errors
- Verify your Neon connection string is correct
- Check that your Neon database is running (not paused)
- Ensure SSL mode is set to `require` in connection string

### Build errors
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Try clearing `.next` folder and rebuilding locally first

## Next Steps

Once deployed and database is set up:
- Test the full flow: upload → analyze → results
- Set up custom domain (optional)
- Configure analytics (optional)
- Set up monitoring (optional)
