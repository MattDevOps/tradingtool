import { neon } from '@neondatabase/serverless';

// Lazy initialization of sql connection
let sqlInstance: any = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set. Please configure your Neon database connection.');
  }
  
  if (!sqlInstance) {
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  
  return sqlInstance;
}

// Export sql as a template tag function that uses lazy initialization
const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  return getSql()(strings, ...values);
};

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
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create sessions table for NextAuth
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_token TEXT UNIQUE NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create accounts table for NextAuth
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at BIGINT,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        UNIQUE(provider, provider_account_id)
      )
    `;

    // Create verification tokens table for NextAuth
    await sql`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (identifier, token)
      )
    `;

    // Create password reset tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create index for password reset tokens
    await sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)
    `;

    // Create indexes for auth tables
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id)
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
        is_spread BOOLEAN DEFAULT FALSE,
        spread_name TEXT,
        spread_legs JSONB,
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
