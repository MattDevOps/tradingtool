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

    // Extract metrics and stability check from stored JSONB
    const metrics = row.metrics as any;
    const stabilityCheck = metrics.stabilityCheck || {
      firstHalf: { expectedValue: 0 },
      secondHalf: { expectedValue: 0 },
      degradation: false,
    };

    // Remove stabilityCheck from metrics object
    const { stabilityCheck: _, ...cleanMetrics } = metrics;

    return NextResponse.json({
      metrics: cleanMetrics,
      probabilityRandom: parseFloat(row.probability_random),
      verdict: row.verdict,
      stabilityCheck,
    });
  } catch (error: any) {
    console.error('Error fetching result:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch result' },
      { status: 500 }
    );
  }
}
