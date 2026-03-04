import Papa from 'papaparse';
import { TradeRow } from './importer';

/**
 * Parse ThinkOrSwim Account Statement CSV and extract closed trades
 * 
 * ThinkOrSwim exports have multiple sections:
 * - Account Statement header
 * - Cash Balance section
 * - Account Trade History section (this is what we need)
 * - Profits and Losses section
 */
export function parseThinkOrSwimCSV(csvText: string): TradeRow[] {
  // Remove BOM if present (ThinkOrSwim exports sometimes have UTF-8 BOM)
  const cleanedText = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
  
  const allRows = Papa.parse<string[]>(cleanedText, {
    header: false,
    skipEmptyLines: false,
    transform: (value: string) => value.trim(),
  }).data;

  // Find the "Account Trade History" section
  let tradeHistoryStartIndex = -1;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    if (row && row.length > 0 && row[0]?.toLowerCase().includes('account trade history')) {
      tradeHistoryStartIndex = i;
      break;
    }
  }

  if (tradeHistoryStartIndex === -1) {
    throw new Error('Could not find "Account Trade History" section in ThinkOrSwim CSV. Please export Account Trade History from ThinkOrSwim.');
  }

  // Get the header row (should be the next non-empty row after "Account Trade History")
  let headerRowIndex = tradeHistoryStartIndex + 1;
  while (headerRowIndex < allRows.length && (!allRows[headerRowIndex] || allRows[headerRowIndex].length === 0)) {
    headerRowIndex++;
  }

  if (headerRowIndex >= allRows.length) {
    throw new Error('Could not find header row in Account Trade History section');
  }

  const headerRow = allRows[headerRowIndex];
  
  // Find column indices
  const execTimeIndex = headerRow.findIndex(h => h.toLowerCase().includes('exec time') || h.toLowerCase().includes('time'));
  const sideIndex = headerRow.findIndex(h => h.toLowerCase() === 'side');
  const qtyIndex = headerRow.findIndex(h => h.toLowerCase() === 'qty' || h.toLowerCase() === 'quantity');
  const posEffectIndex = headerRow.findIndex(h => h.toLowerCase().includes('pos effect') || h.toLowerCase().includes('position effect'));
  const symbolIndex = headerRow.findIndex(h => h.toLowerCase() === 'symbol');
  const priceIndex = headerRow.findIndex(h => h.toLowerCase() === 'price' || h.toLowerCase() === 'net price');

  if (execTimeIndex === -1 || sideIndex === -1 || symbolIndex === -1 || priceIndex === -1) {
    throw new Error('Could not find required columns in Account Trade History. Expected: Exec Time, Side, Symbol, Price');
  }

  // Parse trade rows and collect all trade events
  const tradeRows = allRows.slice(headerRowIndex + 1);
  
  interface TradeEvent {
    execTime: Date;
    side: 'LONG' | 'SHORT';
    qty: number;
    price: number;
    symbol: string;
    posEffect: 'TO OPEN' | 'TO CLOSE';
    rowIndex: number;
  }

  const tradeEvents: TradeEvent[] = [];

  for (let i = 0; i < tradeRows.length; i++) {
    const row = tradeRows[i];
    if (!row || row.length === 0) continue;

    // Skip if we hit the next section (Profits and Losses, Account Summary, etc.)
    if (row[0] && (row[0].toLowerCase().includes('profits and losses') || 
                   row[0].toLowerCase().includes('account summary') ||
                   row[0].toLowerCase().includes('futures statements'))) {
      break;
    }

    const execTimeStr = row[execTimeIndex];
    const sideStr = row[sideIndex];
    const qtyStr = row[qtyIndex] || '0';
    const posEffectStr = row[posEffectIndex] || '';
    const symbolStr = row[symbolIndex];
    const priceStr = row[priceIndex];

    if (!execTimeStr || !sideStr || !symbolStr || !priceStr) {
      continue; // Skip incomplete rows
    }

    // Parse execution time
    const execTime = parseThinkOrSwimDate(execTimeStr);
    if (!execTime) continue;

    // Parse quantity
    const qty = parseInt(qtyStr.replace(/[^0-9-]/g, ''), 10) || 0;
    if (qty === 0) continue;

    // Parse price
    const price = parseFloat(priceStr.replace(/[^0-9.-]/g, ''));
    if (isNaN(price)) continue;

    // Determine side
    const sideUpper = sideStr.toUpperCase().trim();
    const isLong = sideUpper === 'BUY';
    const isShort = sideUpper === 'SELL';
    if (!isLong && !isShort) continue;

    const side: 'LONG' | 'SHORT' = isLong ? 'LONG' : 'SHORT';
    const posEffectUpper = posEffectStr.toUpperCase().trim();

    if (posEffectUpper.includes('TO OPEN') || posEffectUpper.includes('TO CLOSE')) {
      tradeEvents.push({
        execTime,
        side,
        qty: Math.abs(qty),
        price,
        symbol: symbolStr,
        posEffect: posEffectUpper.includes('TO OPEN') ? 'TO OPEN' : 'TO CLOSE',
        rowIndex: i,
      });
    }
  }

  // Sort events by execution time (chronological order)
  tradeEvents.sort((a, b) => a.execTime.getTime() - b.execTime.getTime());

  // Group trades by symbol and match TO OPEN with TO CLOSE
  const openPositions = new Map<string, Array<{
    execTime: Date;
    side: 'LONG' | 'SHORT';
    qty: number;
    price: number;
    symbol: string;
  }>>();

  const closedTrades: TradeRow[] = [];

  // Process events in chronological order
  for (const event of tradeEvents) {
    const positionKey = event.symbol;

    if (event.posEffect === 'TO OPEN') {
      // Opening a position
      if (!openPositions.has(positionKey)) {
        openPositions.set(positionKey, []);
      }
      openPositions.get(positionKey)!.push({
        execTime: event.execTime,
        side: event.side,
        qty: event.qty,
        price: event.price,
        symbol: event.symbol,
      });
    } else if (event.posEffect === 'TO CLOSE') {
      // Closing a position - match with open positions (FIFO)
      const opens = openPositions.get(positionKey) || [];
      let remainingCloseQty = event.qty;

      for (let j = 0; j < opens.length && remainingCloseQty > 0; j++) {
        const open = opens[j];
        if (open.qty === 0) continue;

        const matchedQty = Math.min(open.qty, remainingCloseQty);
        const openPrice = open.price;
        const closePrice = event.price;

        // Calculate P&L
        let pnl: number;
        if (open.side === 'LONG') {
          pnl = (closePrice - openPrice) * matchedQty;
        } else {
          pnl = (openPrice - closePrice) * matchedQty;
        }

        // Subtract fees (rough estimate: $0.30 per contract for options, $0 for stocks)
        const isOption = event.symbol.includes('PUT') || event.symbol.includes('CALL');
        const fees = isOption ? matchedQty * 0.30 : 0;
        pnl -= fees;

        closedTrades.push({
          open_time: open.execTime,
          close_time: event.execTime,
          symbol: event.symbol,
          side: open.side,
          pnl,
          quantity: matchedQty,
        });

        open.qty -= matchedQty;
        remainingCloseQty -= matchedQty;
      }

      // Remove fully closed positions
      const filteredOpens = opens.filter(open => open.qty > 0);
      openPositions.set(positionKey, filteredOpens);
    }
  }

  if (closedTrades.length === 0) {
    throw new Error('No closed trades found in Account Trade History. Make sure you have trades with both TO OPEN and TO CLOSE entries.');
  }

  // Filter out invalid trades (close time before open time)
  const validTrades = closedTrades.filter(t => t.close_time.getTime() >= t.open_time.getTime());
  
  if (validTrades.length === 0) {
    throw new Error('No valid closed trades found. All trades had close_time before open_time. This might indicate a parsing issue.');
  }

  if (validTrades.length < closedTrades.length) {
    console.warn(`Filtered out ${closedTrades.length - validTrades.length} invalid trades (close_time before open_time)`);
  }

  // Sort by close time
  validTrades.sort((a, b) => a.close_time.getTime() - b.close_time.getTime());

  return validTrades;
}

/**
 * Parse ThinkOrSwim date format: "2/9/26 11:01:12" or "2/9/26 11:01:12 AM"
 */
function parseThinkOrSwimDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  // Handle format: "2/9/26 11:01:12" or "2/9/26 11:01:12 AM"
  const cleaned = dateStr.trim();
  
  // Try parsing directly
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try with explicit format parsing
  const match = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (match) {
    let month = parseInt(match[1], 10) - 1; // 0-indexed
    const day = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    let hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    const second = parseInt(match[6], 10);
    const ampm = match[7]?.toUpperCase();

    // Handle 2-digit year
    if (year < 100) {
      year += 2000;
    }

    // Handle AM/PM
    if (ampm === 'PM' && hour !== 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }

    return new Date(year, month, day, hour, minute, second);
  }

  return null;
}

/**
 * Detect if a CSV is a ThinkOrSwim Account Statement
 * 
 * ThinkOrSwim exports can be:
 * 1. Date range export (Account Statement for X since Y through Z)
 * 2. X days back export (similar format)
 * 
 * Both contain "Account Trade History" section
 */
export function isThinkOrSwimStatement(csvText: string): boolean {
  // Remove BOM if present
  const cleanedText = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
  const textLower = cleanedText.toLowerCase();
  
  // Primary check: Must have "Account Trade History" section
  // This is the key indicator for both date range and "x days back" exports
  const hasTradeHistory = textLower.includes('account trade history');
  
  // If it has Account Trade History, it's definitely ThinkOrSwim
  // Both export formats (date range and x days back) include this section
  return hasTradeHistory;
}
