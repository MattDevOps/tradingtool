import { NextRequest, NextResponse } from 'next/server';
import { parseCSV, autoDetectColumns, normalizeTrades, validateClosedTrades, DetectedColumns } from '@/lib/importer';
import { parseThinkOrSwimCSV, isThinkOrSwimStatement } from '@/lib/thinkorswim-parser';
import { sql } from '@/lib/db';
import { initDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Initialize database if not already done (idempotent)
    if (process.env.DATABASE_URL) {
      try {
        await initDatabase();
      } catch (error) {
        // Database might already be initialized, ignore
        console.log('Database initialization check:', error);
      }
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const csvText = await file.text();

    // Check if this is a ThinkOrSwim Account Statement
    let trades;
    let columnMapping: DetectedColumns = {};

    if (isThinkOrSwimStatement(csvText)) {
      // Use ThinkOrSwim-specific parser
      try {
        trades = parseThinkOrSwimCSV(csvText);
        // For ThinkOrSwim, we already have normalized trades, so create a dummy mapping
        columnMapping = {
          open_time: 0,
          close_time: 1,
          symbol: 2,
          side: 3,
          pnl: 4,
        };
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || 'Failed to parse ThinkOrSwim Account Statement' },
          { status: 400 }
        );
      }
    } else {
      // Use generic auto-detection parser
      const csvData = parseCSV(csvText);

      if (csvData.length < 2) {
        return NextResponse.json(
          { error: 'CSV file must contain at least a header row and one data row' },
          { status: 400 }
        );
      }

      // Auto-detect columns
      columnMapping = autoDetectColumns(csvData);

      // Validate required columns
      const requiredFields: (keyof DetectedColumns)[] = ['open_time', 'close_time', 'symbol', 'side', 'pnl'];
      const missingFields = requiredFields.filter(field => columnMapping[field] === undefined);

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: 'Could not auto-detect all required fields. This might not be a ThinkOrSwim closed trades export. Please export Account Trade History from ThinkOrSwim.',
            missingFields,
            detectedColumns: columnMapping,
            csvPreview: csvData.slice(0, 10), // First 10 rows for manual mapping
          },
          { status: 400 }
        );
      }

      // Normalize trades
      trades = normalizeTrades(csvData, columnMapping);
    }

    // Validate closed trades
    const validation = validateClosedTrades(trades);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.warning, trades: [] },
        { status: 400 }
      );
    }

    if (trades.length < 5) {
      return NextResponse.json(
        { error: 'Not enough trades to evaluate statistically. Please upload at least 5 closed trades.', trades: [] },
        { status: 400 }
      );
    }

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      // Return success but with in-memory storage (for testing without DB)
      const uploadId = `temp-${Date.now()}`;
      return NextResponse.json({
        success: true,
        uploadId,
        tradeCount: trades.length,
        detectedColumns: columnMapping,
        dateRange: {
          start: trades[0].open_time.toISOString(),
          end: trades[trades.length - 1].close_time.toISOString(),
        },
        symbols: [...new Set(trades.map(t => t.symbol))],
        warning: 'Database not configured. Results will not be persisted.',
      });
    }

    // Create upload record (no user_id for MVP - optional)
    const uploadResult = await sql`
      INSERT INTO trade_uploads (original_file_url)
      VALUES (${file.name})
      RETURNING id
    `;

    const uploadId = uploadResult[0].id;

    // Insert trades
    for (const trade of trades) {
      await sql`
        INSERT INTO trades (upload_id, open_time, close_time, symbol, side, pnl, quantity)
        VALUES (${uploadId}, ${trade.open_time}, ${trade.close_time}, ${trade.symbol}, ${trade.side}, ${trade.pnl}, ${trade.quantity || null})
      `;
    }

    return NextResponse.json({
      success: true,
      uploadId,
      tradeCount: trades.length,
      detectedColumns: columnMapping,
      dateRange: {
        start: trades[0].open_time.toISOString(),
        end: trades[trades.length - 1].close_time.toISOString(),
      },
      symbols: [...new Set(trades.map(t => t.symbol))],
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}
