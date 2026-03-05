import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { sendStrategyReport } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { resultId } = body;

    if (!resultId) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    // Fetch result from database
    const result = await sql`
      SELECT metrics, probability_random, verdict
      FROM strategy_results
      WHERE id = ${resultId}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Result not found' },
        { status: 404 }
      );
    }

    const resultData = result[0];
    const metrics = resultData.metrics;

    // Send email report
    await sendStrategyReport(session.user.email, {
      verdict: resultData.verdict,
      metrics: metrics,
      probabilityRandom: parseFloat(resultData.probability_random),
      stabilityCheck: metrics.stabilityCheck || { degradation: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to send report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send report' },
      { status: 500 }
    );
  }
}
