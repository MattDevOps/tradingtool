/**
 * Test script for ThinkOrSwim parser
 * Run: npx tsx scripts/test-thinkorswim-parser.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parseThinkOrSwimCSV } from '../lib/thinkorswim-parser';

// Load .env.local if it exists
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  try {
    console.log('Reading ThinkOrSwim CSV file...');
    const csvText = readFileSync('2026-02-10-AccountStatement.csv', 'utf-8');
    
    console.log('Parsing ThinkOrSwim CSV...');
    const trades = parseThinkOrSwimCSV(csvText);
    
    console.log(`\n✅ Successfully parsed ${trades.length} closed trades\n`);
    
    // Show first 10 trades
    console.log('First 10 closed trades:');
    trades.slice(0, 10).forEach((trade, i) => {
      console.log(`${i + 1}. ${trade.symbol} ${trade.side} | Open: ${trade.open_time.toLocaleString()} | Close: ${trade.close_time.toLocaleString()} | P&L: $${trade.pnl.toFixed(2)}`);
    });
    
    // Show summary
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    
    console.log(`\nSummary:`);
    console.log(`  Total trades: ${trades.length}`);
    console.log(`  Winning trades: ${winningTrades}`);
    console.log(`  Losing trades: ${losingTrades}`);
    console.log(`  Total P&L: $${totalPnL.toFixed(2)}`);
    console.log(`  Average P&L: $${(totalPnL / trades.length).toFixed(2)}`);
    
    // Check for issues
    const issues: string[] = [];
    if (trades.length < 5) {
      issues.push(`Only ${trades.length} trades found (need at least 5 for statistical analysis)`);
    }
    if (trades.some(t => t.open_time.getTime() === t.close_time.getTime())) {
      issues.push('Some trades have open_time == close_time (might be executions, not closed trades)');
    }
    
    if (issues.length > 0) {
      console.log(`\n⚠️  Issues found:`);
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log(`\n✅ All checks passed!`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
