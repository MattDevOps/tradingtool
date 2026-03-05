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
  const spreadIndex = headerRow.findIndex(h => h.toLowerCase() === 'spread');

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
    spreadName?: string; // Spread identifier (if part of a spread)
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
    const spreadStr = spreadIndex !== -1 ? row[spreadIndex] : 'SINGLE';

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
      // Determine if this is part of a spread (not "SINGLE")
      const spreadName = spreadStr && spreadStr.trim().toUpperCase() !== 'SINGLE' 
        ? spreadStr.trim() 
        : undefined;
      
      tradeEvents.push({
        execTime,
        side,
        qty: Math.abs(qty),
        price,
        symbol: symbolStr,
        posEffect: posEffectUpper.includes('TO OPEN') ? 'TO OPEN' : 'TO CLOSE',
        rowIndex: i,
        spreadName,
      });
    }
  }

  // Sort events by execution time (chronological order)
  tradeEvents.sort((a, b) => a.execTime.getTime() - b.execTime.getTime());

  // Separate spread events from single-leg events
  const spreadEvents = tradeEvents.filter(e => e.spreadName);
  const singleLegEvents = tradeEvents.filter(e => !e.spreadName);

  const closedTrades: TradeRow[] = [];

  // Process spreads: group by spread name and execution time window (within 5 minutes)
  const SPREAD_TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  
  interface SpreadGroup {
    spreadName: string;
    openEvents: TradeEvent[];
    closeEvents: TradeEvent[];
    openTime: Date;
    closeTime: Date;
  }

  const spreadGroups = new Map<string, SpreadGroup>();

  // Group spread events by spread name and time window
  for (const event of spreadEvents) {
    const spreadKey = event.spreadName!;
    
    if (!spreadGroups.has(spreadKey)) {
      spreadGroups.set(spreadKey, {
        spreadName: spreadKey,
        openEvents: [],
        closeEvents: [],
        openTime: event.execTime,
        closeTime: event.execTime,
      });
    }

    const group = spreadGroups.get(spreadKey)!;
    
    if (event.posEffect === 'TO OPEN') {
      group.openEvents.push(event);
      // Update open time to earliest
      if (event.execTime < group.openTime) {
        group.openTime = event.execTime;
      }
    } else if (event.posEffect === 'TO CLOSE') {
      group.closeEvents.push(event);
      // Update close time to latest
      if (event.execTime > group.closeTime) {
        group.closeTime = event.execTime;
      }
    }
  }

  // Process spread groups: match open and close legs
  for (const group of spreadGroups.values()) {
    // Only process if we have both open and close events
    if (group.openEvents.length === 0 || group.closeEvents.length === 0) {
      continue;
    }

    // Match open and close legs by symbol and side
    const spreadLegs: Array<{
      symbol: string;
      side: 'LONG' | 'SHORT';
      quantity: number;
      openPrice: number;
      closePrice: number;
      pnl: number;
    }> = [];

    let totalPnl = 0;
    const processedCloseEvents = new Set<number>();

    // Match each open leg with a close leg
    for (const openEvent of group.openEvents) {
      // Find matching close event (same symbol, same side)
      let matchedClose: TradeEvent | null = null;
      for (let i = 0; i < group.closeEvents.length; i++) {
        if (processedCloseEvents.has(i)) continue;
        const closeEvent = group.closeEvents[i];
        if (closeEvent.symbol === openEvent.symbol && 
            closeEvent.side === openEvent.side &&
            Math.abs(closeEvent.qty - openEvent.qty) <= 1) { // Allow small qty differences
          matchedClose = closeEvent;
          processedCloseEvents.add(i);
          break;
        }
      }

      if (matchedClose) {
        const matchedQty = Math.min(openEvent.qty, matchedClose.qty);
        const openPrice = openEvent.price;
        const closePrice = matchedClose.price;

        // Calculate P&L for this leg
        let legPnl: number;
        if (openEvent.side === 'LONG') {
          legPnl = (closePrice - openPrice) * matchedQty;
        } else {
          legPnl = (openPrice - closePrice) * matchedQty;
        }

        // Subtract fees (rough estimate: $0.30 per contract for options)
        const isOption = openEvent.symbol.includes('PUT') || openEvent.symbol.includes('CALL');
        const fees = isOption ? matchedQty * 0.30 : 0;
        legPnl -= fees;

        spreadLegs.push({
          symbol: openEvent.symbol,
          side: openEvent.side,
          quantity: matchedQty,
          openPrice,
          closePrice,
          pnl: legPnl,
        });

        totalPnl += legPnl;
      }
    }

    // Only create spread trade if we matched at least 2 legs (typical spread)
    if (spreadLegs.length >= 2) {
      // Determine primary symbol (use first leg or create composite)
      const primarySymbol = spreadLegs.map(l => l.symbol).join('/');
      
      // Determine overall side: credit spread = SHORT (sell high, buy low), debit spread = LONG
      const hasShort = spreadLegs.some(l => l.side === 'SHORT');
      const hasLong = spreadLegs.some(l => l.side === 'LONG');
      const overallSide: 'LONG' | 'SHORT' = hasShort && hasLong 
        ? (totalPnl > 0 ? 'LONG' : 'SHORT') // Heuristic: if profitable, treat as LONG
        : (hasShort ? 'SHORT' : 'LONG');

      closedTrades.push({
        open_time: group.openTime,
        close_time: group.closeTime,
        symbol: primarySymbol,
        side: overallSide,
        pnl: totalPnl,
        quantity: spreadLegs[0].quantity, // Use first leg's quantity
        isSpread: true,
        spreadName: group.spreadName,
        spreadLegs,
      });
    }
  }

  // Process single-leg trades: group by symbol and match TO OPEN with TO CLOSE
  const openPositions = new Map<string, Array<{
    execTime: Date;
    side: 'LONG' | 'SHORT';
    qty: number;
    price: number;
    symbol: string;
  }>>();

  for (const event of singleLegEvents) {
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
          isSpread: false,
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
