import Papa from 'papaparse';

export type ColumnRole = 'open_time' | 'close_time' | 'symbol' | 'side' | 'pnl' | 'quantity' | 'unknown';

export interface ColumnMapping {
  columnIndex: number;
  role: ColumnRole;
  confidence: number;
}

export interface DetectedColumns {
  open_time?: number;
  close_time?: number;
  symbol?: number;
  side?: number;
  pnl?: number;
  quantity?: number;
}

export interface TradeRow {
  open_time: Date;
  close_time: Date;
  symbol: string;
  side: 'LONG' | 'SHORT';
  pnl: number;
  quantity?: number;
  // Spread identification
  isSpread?: boolean;
  spreadName?: string; // Name/ID of the spread (e.g., "SPREAD_123" or "CREDIT_SPREAD_ABC")
  spreadLegs?: Array<{
    symbol: string;
    side: 'LONG' | 'SHORT';
    quantity: number;
    openPrice: number;
    closePrice: number;
    pnl: number;
  }>;
}

/**
 * Normalize header names to standard field names
 */
function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  // Map common aliases
  const aliasMap: Record<string, string> = {
    'pnl': 'pnl',
    'netpl': 'pnl',
    'profit': 'pnl',
    'gainloss': 'pnl',
    'netploss': 'pnl',
    'open': 'open_time',
    'opentime': 'open_time',
    'entrytime': 'open_time',
    'entry': 'open_time',
    'close': 'close_time',
    'closetime': 'close_time',
    'exittime': 'close_time',
    'exit': 'close_time',
    'longshort': 'side',
    'direction': 'side',
    'symbol': 'symbol',
    'instrument': 'symbol',
    'ticker': 'symbol',
    'qty': 'quantity',
    'quantity': 'quantity',
    'size': 'quantity',
  };

  return aliasMap[normalized] || normalized;
}

/**
 * Check if a value can be parsed as a datetime
 */
function isDateTime(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.length > 5; // Basic validation
}

/**
 * Check if a value represents a side/direction
 */
function isSide(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const normalized = value.toUpperCase().trim();
  return ['LONG', 'SHORT', 'BUY', 'SELL', 'B', 'S', 'L'].includes(normalized);
}

/**
 * Check if a value is numeric and could be P&L
 */
function isPnL(value: string): boolean {
  if (!value) return false;
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
}

/**
 * Check if a value is a symbol (short token, repeated)
 */
function isSymbol(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 10 && /^[A-Z0-9._-]+$/i.test(trimmed);
}

/**
 * Score a column for a specific role
 */
function scoreColumn(columnData: string[], role: ColumnRole): number {
  if (columnData.length === 0) return 0;

  const validValues = columnData.filter(v => v !== null && v !== undefined && v !== '');

  if (validValues.length === 0) return 0;

  let matches = 0;

  switch (role) {
    case 'open_time':
    case 'close_time':
      matches = validValues.filter(isDateTime).length;
      break;
    case 'side':
      matches = validValues.filter(isSide).length;
      break;
    case 'pnl':
      const pnlValues = validValues.filter(isPnL).map(parseFloat);
      if (pnlValues.length > 0) {
        const hasPositive = pnlValues.some(v => v > 0);
        const hasNegative = pnlValues.some(v => v < 0);
        // P&L should have both positive and negative values
        matches = hasPositive && hasNegative ? validValues.filter(isPnL).length : 0;
      }
      break;
    case 'symbol':
      matches = validValues.filter(isSymbol).length;
      break;
    case 'quantity':
      const qtyValues = validValues.filter(isPnL).map(parseFloat);
      matches = qtyValues.filter(v => Number.isInteger(v) && v > 0 && v < 10000).length;
      break;
    default:
      return 0;
  }

  return matches / validValues.length;
}

/**
 * Auto-detect columns from CSV data
 */
export function autoDetectColumns(csvData: string[][]): DetectedColumns {
  if (csvData.length === 0) return {};

  const headers = csvData[0];
  const dataRows = csvData.slice(1, Math.min(100, csvData.length)); // Sample first 100 rows

  // Transpose data for column-wise analysis
  const columns: string[][] = headers.map((_, colIndex) =>
    dataRows.map(row => row[colIndex] || '').filter(v => v !== '')
  );

  // First, try header-based detection
  const headerMapping: Partial<Record<string, ColumnRole>> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized === 'pnl' || normalized === 'open_time' || normalized === 'close_time' || 
        normalized === 'side' || normalized === 'symbol' || normalized === 'quantity') {
      headerMapping[normalized] = normalized as ColumnRole;
    }
  });

  // Score each column for each role
  const requiredRoles: ColumnRole[] = ['open_time', 'close_time', 'symbol', 'side', 'pnl'];
  const optionalRoles: ColumnRole[] = ['quantity'];
  const allRoles = [...requiredRoles, ...optionalRoles];

  const columnScores: Array<{ index: number; role: ColumnRole; score: number }> = [];

  columns.forEach((columnData, colIndex) => {
    allRoles.forEach(role => {
      const score = scoreColumn(columnData, role);
      if (score > 0) {
        columnScores.push({ index: colIndex, role, score });
      }
    });
  });

  // Assign best scoring column to each role
  const detected: DetectedColumns = {};
  const usedColumns = new Set<number>();

  // Process required roles first
  requiredRoles.forEach(role => {
    const candidates = columnScores
      .filter(cs => cs.role === role && !usedColumns.has(cs.index))
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0 && candidates[0].score > 0.3) { // Minimum confidence threshold
      if (role !== 'unknown') {
        (detected as any)[role] = candidates[0].index;
      }
      usedColumns.add(candidates[0].index);
    }
  });

  // Process optional roles
  optionalRoles.forEach(role => {
    const candidates = columnScores
      .filter(cs => cs.role === role && !usedColumns.has(cs.index))
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0 && candidates[0].score > 0.5) {
      if (role !== 'unknown') {
        (detected as any)[role] = candidates[0].index;
      }
      usedColumns.add(candidates[0].index);
    }
  });

  return detected;
}

/**
 * Parse CSV file and return structured data
 */
export function parseCSV(csvText: string): string[][] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
    transform: (value: string) => value.trim(),
  });

  return result.data;
}

/**
 * Convert CSV rows to normalized trade objects
 */
export function normalizeTrades(
  csvData: string[][],
  columnMapping: DetectedColumns
): TradeRow[] {
  const headers = csvData[0];
  const dataRows = csvData.slice(1);

  const requiredFields: (keyof DetectedColumns)[] = ['open_time', 'close_time', 'symbol', 'side', 'pnl'];
  
  // Validate all required fields are present
  for (const field of requiredFields) {
    if (columnMapping[field] === undefined) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  const trades: TradeRow[] = [];

  for (const row of dataRows) {
    if (row.length === 0) continue;

    try {
      const openTimeStr = row[columnMapping.open_time!];
      const closeTimeStr = row[columnMapping.close_time!];
      const symbolStr = row[columnMapping.symbol!];
      const sideStr = row[columnMapping.side!];
      const pnlStr = row[columnMapping.pnl!];

      if (!openTimeStr || !closeTimeStr || !symbolStr || !sideStr || !pnlStr) {
        continue; // Skip incomplete rows
      }

      const openTime = new Date(openTimeStr);
      const closeTime = new Date(closeTimeStr);

      if (isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
        continue; // Skip invalid dates
      }

      // Normalize side
      const sideUpper = sideStr.toUpperCase().trim();
      let side: 'LONG' | 'SHORT';
      if (sideUpper === 'BUY' || sideUpper === 'B' || sideUpper === 'LONG' || sideUpper === 'L') {
        side = 'LONG';
      } else if (sideUpper === 'SELL' || sideUpper === 'S' || sideUpper === 'SHORT') {
        side = 'SHORT';
      } else {
        continue; // Skip invalid side
      }

      const pnl = parseFloat(pnlStr);
      if (isNaN(pnl)) {
        continue; // Skip invalid P&L
      }

      const quantity = columnMapping.quantity !== undefined 
        ? parseInt(row[columnMapping.quantity], 10) 
        : undefined;

      // Validate closed trades (open_time should not equal close_time)
      if (openTime.getTime() === closeTime.getTime()) {
        // This might be executions, but we'll allow it with a warning later
      }

      trades.push({
        open_time: openTime,
        close_time: closeTime,
        symbol: symbolStr.trim().toUpperCase(),
        side,
        pnl,
        quantity: quantity && !isNaN(quantity) ? quantity : undefined,
      });
    } catch (error) {
      console.warn('Error parsing trade row:', error);
      continue;
    }
  }

  return trades;
}

/**
 * Validate that trades are closed (not executions)
 */
export function validateClosedTrades(trades: TradeRow[]): { valid: boolean; warning?: string } {
  if (trades.length === 0) {
    return { valid: false, warning: 'No trades found' };
  }

  const allSameTime = trades.every(t => 
    t.open_time.getTime() === t.close_time.getTime()
  );

  if (allSameTime) {
    return {
      valid: false,
      warning: 'This looks like executions, not closed trades. Please export closed positions from your broker.',
    };
  }

  return { valid: true };
}
