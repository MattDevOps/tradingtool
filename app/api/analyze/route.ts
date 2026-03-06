import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { analyzeStrategy, StrategyRule, TradeRow } from '@/lib/stats';
import { initDatabase } from '@/lib/db';
import { sendStrategyReport } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database not configured. Please set DATABASE_URL environment variable.' },
        { status: 503 }
      );
    }

    // Initialize database if not already done
    try {
      await initDatabase();
    } catch (error) {
      // Database might already be initialized, ignore
      console.log('Database initialization check:', error);
    }

    const body = await request.json();
    const { uploadId, rule, email } = body;

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 });
    }

    if (!rule) {
      return NextResponse.json({ error: 'Strategy rule is required' }, { status: 400 });
    }

    // Fetch trades from database
    const tradesResult = await sql`
      SELECT open_time, close_time, symbol, side, pnl, quantity, is_spread, spread_name, spread_legs
      FROM trades
      WHERE upload_id = ${uploadId}
      ORDER BY open_time ASC
    `;

    if (tradesResult.length === 0) {
      return NextResponse.json({ error: 'No trades found for this upload' }, { status: 404 });
    }

    // Convert to TradeRow format
    const trades: TradeRow[] = tradesResult.map((row: any) => ({
      open_time: new Date(row.open_time),
      close_time: new Date(row.close_time),
      symbol: row.symbol,
      side: row.side as 'LONG' | 'SHORT',
      pnl: parseFloat(row.pnl),
      quantity: row.quantity ? parseInt(row.quantity, 10) : undefined,
      isSpread: row.is_spread || false,
      spreadName: row.spread_name || undefined,
      spreadLegs: row.spread_legs || undefined,
    }));

    // Normalize rule for analysis (handle date range separately)
    const normalizedRule: StrategyRule = {
      instrument: rule.instrument,
      direction: rule.direction,
      timeWindowStart: rule.timeWindowStart,
      timeWindowEnd: rule.timeWindowEnd,
      maxHoldingTime: rule.maxHoldingTime,
    };
    
    // Apply date range filter if provided
    let filteredTrades = trades;
    if (rule.startDate || rule.endDate) {
      filteredTrades = trades.filter(t => {
        const tradeDate = t.open_time.toISOString().split('T')[0];
        if (rule.startDate && tradeDate < rule.startDate) return false;
        if (rule.endDate && tradeDate > rule.endDate) return false;
        return true;
      });
    }
    
    // Analyze strategy
    const result = analyzeStrategy(filteredTrades, normalizedRule);

    // Store email if provided
    let userId = null;
    if (email) {
      try {
        const userResult = await sql`
          INSERT INTO users (email)
          VALUES (${email})
          ON CONFLICT (email) DO UPDATE SET email = users.email
          RETURNING id
        `;
        userId = userResult[0].id;
      } catch (error) {
        console.warn('Failed to store email:', error);
      }
    }

    // Store result in database (include stability check, charts data in metrics JSONB)
    const resultRecord = await sql`
      INSERT INTO strategy_results (upload_id, user_id, rule_definition, metrics, probability_random, verdict)
      VALUES (
        ${uploadId},
        ${userId},
        ${JSON.stringify(rule)},
        ${JSON.stringify({
          ...result.metrics,
          stabilityCheck: result.stabilityCheck,
          equityCurve: result.equityCurve,
          tradeDistribution: result.tradeDistribution,
          confidence: result.confidence,
        })},
        ${result.probabilityRandom},
        ${result.verdict}
      )
      RETURNING id
    `;

    // Send email report if email provided
    if (email) {
      try {
        await sendStrategyReport(email, {
          verdict: result.verdict,
          metrics: result.metrics,
          probabilityRandom: result.probabilityRandom,
          stabilityCheck: result.stabilityCheck,
        });
      } catch (error) {
        console.warn('Failed to send email report:', error);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      resultId: resultRecord[0].id,
      ...result,
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze strategy' },
      { status: 500 }
    );
  }
}
