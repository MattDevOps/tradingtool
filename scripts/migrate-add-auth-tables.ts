/**
 * Migration script to add authentication tables
 * Run this once to update your database schema
 * 
 * Usage: npx tsx scripts/migrate-add-auth-tables.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

const result = config({ path: resolve(process.cwd(), '.env.local') });

if (result.error) {
  console.warn('Warning: Could not load .env.local:', result.error.message);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables.');
  console.error('Make sure .env.local exists and contains DATABASE_URL=...');
  process.exit(1);
}

import { sql } from '../lib/db';

async function main() {
  console.log('Migrating database to add authentication tables...');
  try {
    // Add password_hash and name to users table
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_hash TEXT
    `;
    console.log('✅ Added password_hash column');

    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS name TEXT
    `;
    console.log('✅ Added name column');

    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `;
    console.log('✅ Added updated_at column');

    // Make email NOT NULL if it isn't already
    await sql`
      ALTER TABLE users 
      ALTER COLUMN email SET NOT NULL
    `;
    console.log('✅ Made email NOT NULL');

    // Create sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_token TEXT UNIQUE NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Created sessions table');

    // Create accounts table
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
    console.log('✅ Created accounts table');

    // Create verification_tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (identifier, token)
      )
    `;
    console.log('✅ Created verification_tokens table');

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id)
    `;
    console.log('✅ Created indexes');

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to migrate database:', error);
    process.exit(1);
  }
}

main();
