/**
 * Migration script to add spread columns to existing trades table
 * Run this once to update your database schema
 * 
 * Usage: npx tsx scripts/migrate-add-spread-columns.ts
 */

// IMPORTANT: Load .env.local BEFORE importing db.ts
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
const result = config({ path: resolve(process.cwd(), '.env.local') });

if (result.error) {
  console.warn('Warning: Could not load .env.local:', result.error.message);
}

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables.');
  console.error('Make sure .env.local exists and contains DATABASE_URL=...');
  process.exit(1);
}

// Now import db.ts after env vars are loaded
import { sql } from '../lib/db';

async function main() {
  console.log('Migrating database to add spread columns...');
  try {
    // Add new columns if they don't exist
    await sql`
      ALTER TABLE trades 
      ADD COLUMN IF NOT EXISTS is_spread BOOLEAN DEFAULT FALSE
    `;
    console.log('✅ Added is_spread column');

    await sql`
      ALTER TABLE trades 
      ADD COLUMN IF NOT EXISTS spread_name TEXT
    `;
    console.log('✅ Added spread_name column');

    await sql`
      ALTER TABLE trades 
      ADD COLUMN IF NOT EXISTS spread_legs JSONB
    `;
    console.log('✅ Added spread_legs column');

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to migrate database:', error);
    process.exit(1);
  }
}

main();
