# Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Neon Postgres database (free tier available at [neon.tech](https://neon.tech))
- npm or yarn package manager

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

Get your connection string from your Neon dashboard.

## Step 3: Initialize Database

Run the database initialization script to create all required tables:

```bash
npx tsx scripts/init-db.ts
```

Or if you prefer, you can run the SQL directly in your Neon SQL editor using the schema from `lib/db.ts`.

## Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Test the Application

1. Go to the landing page
2. Click "Upload CSV → Check Strategy"
3. Upload a CSV file with closed trades (must have columns: open_time, close_time, symbol, side, pnl)
4. Define your strategy rule
5. View the statistical analysis results

## CSV Format Requirements

Your CSV file should contain closed trades with at least these columns:
- **Open time** (datetime)
- **Close time** (datetime)
- **Symbol** (instrument name, e.g., ES, NQ)
- **Side** (LONG/SHORT or BUY/SELL)
- **P&L** (profit/loss in dollars)

The importer will auto-detect these columns, but column names can vary (e.g., "P&L", "NetPL", "Profit", etc.).

## Example CSV Format

```csv
Open Time,Close Time,Symbol,Side,P&L
2024-01-01 09:30:00,2024-01-01 09:45:00,ES,LONG,125.50
2024-01-01 10:00:00,2024-01-01 10:15:00,NQ,SHORT,-75.25
```

## Troubleshooting

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Check that your Neon database is running
- Ensure SSL mode is set to `require` in the connection string

### CSV Import Errors

- Make sure your CSV has at least 5 closed trades
- Verify that open_time and close_time are different (not executions)
- Check that P&L column contains both positive and negative values

### Build Errors

- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`
- Check Node.js version: `node --version` (should be 18+)

## Deployment to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add `DATABASE_URL` environment variable in Vercel dashboard
4. Deploy!

The app will automatically initialize the database on first API call (or you can run the init script manually).
