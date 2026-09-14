# Strategy Reality Check MVP

A single-purpose tool that answers: **"Is your trading strategy real — or just luck?"**

## Features

- 📊 Upload closed-trade CSV files from ThinkOrSwim
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

Fill in `DATABASE_URL` (Neon connection string), `NEXTAUTH_SECRET`, and the email settings listed in `.env.example`.

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
│   ├── results/           # Results page
│   ├── login/ signup/ forgot-password/ reset-password/   # Auth pages
│   └── api/               # Route handlers
│       ├── upload/        # CSV upload endpoint
│       ├── analyze/       # Strategy analysis endpoint
│       ├── strategy/      # Rule preview endpoints
│       └── auth/          # NextAuth + password reset
├── lib/                   # Utilities & database
│   ├── db.ts             # Neon DB connection
│   ├── importer.ts       # CSV auto-inference
│   ├── thinkorswim-parser.ts  # ThinkOrSwim statement parser
│   └── stats.ts          # Statistical engine (Monte Carlo / permutation)
├── scripts/               # DB init/migrations + parser check scripts
├── tests/                 # Playwright end-to-end tests
└── sample-thinkorswim-statement.csv   # Synthetic statement used by the tests
```

## Design Documents

- [Design Doc](./DESIGN_DOC.md) - Complete product specifications
- [UI Mockup](./UI_MOCKUP.md) - Visual design blueprint

## License

MIT
