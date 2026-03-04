import { TradeRow } from './importer';

export interface StrategyRule {
  instrument?: string;
  timeWindowStart?: string; // HH:MM format
  timeWindowEnd?: string; // HH:MM format
  direction?: 'LONG' | 'SHORT' | 'BOTH';
  maxHoldingTime?: number; // minutes
}

export interface StrategyMetrics {
  winRate: number;
  expectedValue: number; // R multiples
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
}

export interface StrategyResult {
  metrics: StrategyMetrics;
  probabilityRandom: number; // 0-1
  verdict: 'LIKELY_REAL_EDGE' | 'NOT_STATISTICALLY_RELIABLE';
  stabilityCheck: {
    firstHalf: StrategyMetrics;
    secondHalf: StrategyMetrics;
    degradation: boolean;
  };
}

/**
 * Filter trades based on strategy rule
 */
export function filterTradesByRule(trades: TradeRow[], rule: StrategyRule): TradeRow[] {
  let filtered = [...trades];

  // Filter by instrument
  if (rule.instrument) {
    filtered = filtered.filter(t => 
      t.symbol.toUpperCase() === rule.instrument.toUpperCase()
    );
  }

  // Filter by time window
  if (rule.timeWindowStart || rule.timeWindowEnd) {
    filtered = filtered.filter(t => {
      const openHour = t.open_time.getHours();
      const openMinute = t.open_time.getMinutes();
      const openTimeMinutes = openHour * 60 + openMinute;

      if (rule.timeWindowStart) {
        const [startHour, startMin] = rule.timeWindowStart.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        if (openTimeMinutes < startMinutes) return false;
      }

      if (rule.timeWindowEnd) {
        const [endHour, endMin] = rule.timeWindowEnd.split(':').map(Number);
        const endMinutes = endHour * 60 + endMin;
        if (openTimeMinutes >= endMinutes) return false;
      }

      return true;
    });
  }

  // Filter by direction
  if (rule.direction && rule.direction !== 'BOTH') {
    filtered = filtered.filter(t => t.side === rule.direction);
  }

  // Filter by max holding time
  if (rule.maxHoldingTime) {
    filtered = filtered.filter(t => {
      const holdingTimeMs = t.close_time.getTime() - t.open_time.getTime();
      const holdingTimeMinutes = holdingTimeMs / (1000 * 60);
      return holdingTimeMinutes <= rule.maxHoldingTime;
    });
  }

  return filtered;
}

/**
 * Calculate R-multiples (normalize P&L by average loss)
 */
function calculateRMultiples(trades: TradeRow[]): number[] {
  const losses = trades.filter(t => t.pnl < 0).map(t => Math.abs(t.pnl));
  
  if (losses.length === 0) {
    // If no losses, use average absolute P&L as R
    const avgAbsPnl = trades.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / trades.length;
    return trades.map(t => t.pnl / avgAbsPnl);
  }

  const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / losses.length;
  
  if (avgLoss === 0) {
    return trades.map(() => 0);
  }

  return trades.map(t => t.pnl / avgLoss);
}

/**
 * Calculate strategy metrics
 */
export function calculateMetrics(trades: TradeRow[]): StrategyMetrics {
  if (trades.length === 0) {
    throw new Error('No trades to analyze');
  }

  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  
  const winRate = winningTrades.length / trades.length;
  
  const rMultiples = calculateRMultiples(trades);
  const expectedValue = rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length;

  const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

  const averageWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
    : 0;
  
  const averageLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
    : 0;

  return {
    winRate,
    expectedValue,
    profitFactor: isFinite(profitFactor) ? profitFactor : 1000, // Cap at 1000 for display
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    averageWin,
    averageLoss,
  };
}

/**
 * Monte-Carlo permutation test to determine if edge is random
 */
export function monteCarloTest(trades: TradeRow[], observedEV: number, nSimulations: number = 10000): number {
  if (trades.length < 5) {
    return 0.5; // Not enough data
  }

  const pnlValues = trades.map(t => t.pnl);
  const avgLoss = Math.abs(
    pnlValues.filter(p => p < 0).reduce((sum, p) => sum + p, 0) / 
    pnlValues.filter(p => p < 0).length || 1
  );

  let randomEVsGreaterOrEqual = 0;

  for (let i = 0; i < nSimulations; i++) {
    // Shuffle P&L values
    const shuffled = [...pnlValues].sort(() => Math.random() - 0.5);
    const shuffledR = shuffled.map(p => p / avgLoss);
    const randomEV = shuffledR.reduce((sum, r) => sum + r, 0) / shuffledR.length;

    if (randomEV >= observedEV) {
      randomEVsGreaterOrEqual++;
    }
  }

  return randomEVsGreaterOrEqual / nSimulations;
}

/**
 * Stability check: compare first half vs second half
 */
function stabilityCheck(trades: TradeRow[]): {
  firstHalf: StrategyMetrics;
  secondHalf: StrategyMetrics;
  degradation: boolean;
} {
  const midpoint = Math.floor(trades.length / 2);
  const firstHalf = trades.slice(0, midpoint);
  const secondHalf = trades.slice(midpoint);

  const firstHalfMetrics = calculateMetrics(firstHalf);
  const secondHalfMetrics = calculateMetrics(secondHalf);

  // Check for degradation (second half EV is < 80% of first half)
  const degradation = secondHalfMetrics.expectedValue < firstHalfMetrics.expectedValue * 0.8;

  return {
    firstHalf: firstHalfMetrics,
    secondHalf: secondHalfMetrics,
    degradation,
  };
}

/**
 * Analyze strategy and return complete result
 */
export function analyzeStrategy(trades: TradeRow[], rule: StrategyRule): StrategyResult {
  if (trades.length < 5) {
    throw new Error('Not enough trades to evaluate statistically. Please upload at least 5 closed trades.');
  }

  const filteredTrades = filterTradesByRule(trades, rule);

  if (filteredTrades.length < 5) {
    throw new Error(`Not enough trades match your rule. Found ${filteredTrades.length} trades, need at least 5.`);
  }

  const metrics = calculateMetrics(filteredTrades);
  const probabilityRandom = monteCarloTest(filteredTrades, metrics.expectedValue);
  const stability = stabilityCheck(filteredTrades);

  const verdict: 'LIKELY_REAL_EDGE' | 'NOT_STATISTICALLY_RELIABLE' = 
    probabilityRandom < 0.2 ? 'LIKELY_REAL_EDGE' : 'NOT_STATISTICALLY_RELIABLE';

  return {
    metrics,
    probabilityRandom,
    verdict,
    stabilityCheck: stability,
  };
}
