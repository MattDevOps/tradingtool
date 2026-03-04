/**
 * Database initialization script
 * Run this once to set up the database schema
 * 
 * Usage: npx tsx scripts/init-db.ts
 */

// IMPORTANT: Load .env.local BEFORE importing db.ts
// This ensures DATABASE_URL is available when db.ts module is evaluated
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
import { initDatabase } from '../lib/db';

async function main() {
  console.log('Initializing database...');
  try {
    await initDatabase();
    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

main();
