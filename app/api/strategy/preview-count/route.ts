import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { filterTradesByRule, StrategyRule } from '@/lib/stats';
import { TradeRow } from '@/lib/importer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uploadId, rule } = body;

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 });
    }

    if (!rule) {
      return NextResponse.json({ error: 'Rule is required' }, { status: 400 });
    }

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      // For temp uploads, return a placeholder count
      return NextResponse.json({ count: 0 });
    }

    // Fetch trades from database
    const tradesResult = await sql`
      SELECT open_time, close_time, symbol, side, pnl, quantity
      FROM trades
      WHERE upload_id = ${uploadId}
      ORDER BY open_time ASC
    `;

    if (tradesResult.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // Convert to TradeRow format
    const trades: TradeRow[] = tradesResult.map((row: any) => ({
      open_time: new Date(row.open_time),
      close_time: new Date(row.close_time),
      symbol: row.symbol,
      side: row.side as 'LONG' | 'SHORT',
      pnl: parseFloat(row.pnl),
      quantity: row.quantity ? parseInt(row.quantity, 10) : undefined,
    }));

    // Normalize rule for filtering (separate date range from time window)
    const normalizedRule: StrategyRule = {
      instrument: rule.instrument,
      direction: rule.direction,
      timeWindowStart: rule.timeWindowStart,
      timeWindowEnd: rule.timeWindowEnd,
      maxHoldingTime: rule.maxHoldingTime,
    };
    
    // Apply rule filter
    let filteredTrades = filterTradesByRule(trades, normalizedRule);
    
    // Apply date range filter if provided (separate from time window)
    if (rule.startDate || rule.endDate) {
      filteredTrades = filteredTrades.filter(t => {
        const tradeDate = t.open_time.toISOString().split('T')[0];
        if (rule.startDate && tradeDate < rule.startDate) return false;
        if (rule.endDate && tradeDate > rule.endDate) return false;
        return true;
      });
    }

    return NextResponse.json({ count: filteredTrades.length });
  } catch (error: any) {
    console.error('Error calculating preview count:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate preview count' },
      { status: 500 }
    );
  }
}
