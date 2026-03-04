import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { filterTradesByRule, StrategyRule } from '@/lib/stats';
import { TradeRow } from '@/lib/importer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uploadId, rule, limit = 5 } = body;

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 });
    }

    if (!rule) {
      return NextResponse.json({ error: 'Rule is required' }, { status: 400 });
    }

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ trades: [], longs: 0, shorts: 0 });
    }

    // Fetch trades from database
    const tradesResult = await sql`
      SELECT open_time, close_time, symbol, side, pnl, quantity
      FROM trades
      WHERE upload_id = ${uploadId}
      ORDER BY open_time ASC
    `;

    if (tradesResult.length === 0) {
      return NextResponse.json({ trades: [], longs: 0, shorts: 0 });
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

    // Normalize rule for filtering
    const normalizedRule: StrategyRule = {
      instrument: rule.instrument,
      direction: rule.direction,
      timeWindowStart: rule.timeWindowStart,
      timeWindowEnd: rule.timeWindowEnd,
      maxHoldingTime: rule.maxHoldingTime,
    };
    
    // Apply rule filter
    let filteredTrades = filterTradesByRule(trades, normalizedRule);
    
    // Apply date range filter if provided
    if (rule.startDate || rule.endDate) {
      filteredTrades = filteredTrades.filter(t => {
        const tradeDate = t.open_time.toISOString().split('T')[0];
        if (rule.startDate && tradeDate < rule.startDate) return false;
        if (rule.endDate && tradeDate > rule.endDate) return false;
        return true;
      });
    }

    // Count longs and shorts
    const longs = filteredTrades.filter(t => t.side === 'LONG').length;
    const shorts = filteredTrades.filter(t => t.side === 'SHORT').length;

    // Calculate R-multiples for preview (simplified - use average loss)
    const losses = filteredTrades.filter(t => t.pnl < 0).map(t => Math.abs(t.pnl));
    const avgLoss = losses.length > 0 
      ? losses.reduce((sum, loss) => sum + loss, 0) / losses.length 
      : filteredTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / filteredTrades.length || 1;

    // Get sample trades (first N)
    const sampleTrades = filteredTrades.slice(0, limit).map(t => ({
      date: t.open_time.toISOString().split('T')[0],
      symbol: t.symbol,
      side: t.side,
      pnl: t.pnl,
      rMultiple: avgLoss > 0 ? (t.pnl / avgLoss).toFixed(2) : '0.00',
    }));

    return NextResponse.json({
      trades: sampleTrades,
      longs,
      shorts,
      total: filteredTrades.length,
    });
  } catch (error: any) {
    console.error('Error fetching preview trades:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preview trades' },
      { status: 500 }
    );
  }
}
