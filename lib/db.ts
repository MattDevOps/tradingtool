import { neon } from '@neondatabase/serverless';

// Make database connection optional for initial deployment
let sql: any = null;

if (process.env.DATABASE_URL) {
  sql = neon(process.env.DATABASE_URL);
} else {
  // Create a template tag function that throws helpful errors
  sql = (strings: TemplateStringsArray, ...values: any[]) => {
    throw new Error('DATABASE_URL environment variable is not set. Please configure your Neon database connection.');
  };
}

export { sql };

// Initialize database schema
export async function initDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Please configure your Neon database connection.');
    }

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create trade_uploads table
    await sql`
      CREATE TABLE IF NOT EXISTS trade_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        original_file_url TEXT,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create trades table
    await sql`
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
      )
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_trades_upload ON trades(upload_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_trades_time ON trades(open_time, close_time)
    `;

    // Create strategy_results table
    await sql`
      CREATE TABLE IF NOT EXISTS strategy_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        upload_id UUID REFERENCES trade_uploads(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        rule_definition JSONB NOT NULL,
        metrics JSONB NOT NULL,
        probability_random NUMERIC NOT NULL,
        verdict TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create indexes for strategy_results
    await sql`
      CREATE INDEX IF NOT EXISTS idx_strategy_results_upload ON strategy_results(upload_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_strategy_results_user ON strategy_results(user_id)
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
