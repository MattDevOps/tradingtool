# Strategy Reality Check MVP

A single-purpose tool that answers: **"Is your trading strategy real — or just luck?"**

## Features

- 📊 Upload closed-trade CSV files from any broker
- 🔍 Auto-detect columns (no manual mapping required)
- 📈 Statistical analysis with Monte-Carlo simulation
- ✅ Clear verdict on strategy validity

## Tech Stack

- **Frontend:** Next.js 14 + React + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Neon Postgres (serverless)
- **CSV Processing:** PapaParse
- **Statistical Engine:** Custom Monte-Carlo / permutation tests

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your Neon database connection string:
```
DATABASE_URL=postgresql://user:password@host/database
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Landing page
│   ├── upload/            # Upload flow
│   ├── rule-builder/      # Strategy rule builder
│   └── results/           # Results page
├── components/            # React components
├── lib/                   # Utilities & database
│   ├── db.ts             # Neon DB connection
│   ├── importer.ts       # CSV auto-inference
│   └── stats.ts          # Statistical engine
└── api/                   # API routes
    ├── upload/           # CSV upload endpoint
    └── analyze/          # Strategy analysis endpoint
```

## Design Documents

- [Design Doc](./DESIGN_DOC.md) - Complete product specifications
- [UI Mockup](./UI_MOCKUP.md) - Visual design blueprint

## License

MIT
