import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { resultId: string } }
) {
  try {
    const resultId = params.resultId;

    const result = await sql`
      SELECT rule_definition, metrics, probability_random, verdict, created_at
      FROM strategy_results
      WHERE id = ${resultId}
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    const row = result[0];

    // Extract metrics and nested data from stored JSONB
    const metrics = row.metrics as any;
    const stabilityCheck = metrics.stabilityCheck || {
      firstHalf: { expectedValue: 0 },
      secondHalf: { expectedValue: 0 },
      degradation: false,
    };
    const equityCurve = metrics.equityCurve || [];
    const tradeDistribution = metrics.tradeDistribution || [];
    const confidence = metrics.confidence ?? Math.round((1 - parseFloat(row.probability_random)) * 100);

    // Remove nested data from metrics object
    const { stabilityCheck: _, equityCurve: _ec, tradeDistribution: _td, confidence: _conf, ...cleanMetrics } = metrics;

    return NextResponse.json({
      metrics: cleanMetrics,
      probabilityRandom: parseFloat(row.probability_random),
      verdict: row.verdict,
      confidence,
      stabilityCheck,
      equityCurve,
      tradeDistribution,
    });
  } catch (error: any) {
    console.error('Error fetching result:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch result' },
      { status: 500 }
    );
  }
}
