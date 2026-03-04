import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { uploadId: string } }
) {
  try {
    const uploadId = params.uploadId;

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      // For temp uploads, return empty array (will be handled by frontend)
      return NextResponse.json([]);
    }

    // Get distinct symbols with counts
    const symbolsResult = await sql`
      SELECT 
        symbol,
        COUNT(*) as count
      FROM trades
      WHERE upload_id = ${uploadId}
      GROUP BY symbol
      ORDER BY count DESC, symbol ASC
    `;

    const symbols = symbolsResult.map((row: any) => ({
      symbol: row.symbol,
      count: parseInt(row.count, 10),
    }));

    return NextResponse.json(symbols);
  } catch (error: any) {
    console.error('Error fetching symbols:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch symbols' },
      { status: 500 }
    );
  }
}
