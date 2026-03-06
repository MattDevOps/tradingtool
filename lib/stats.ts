import type { TradeRow } from './importer';
export type { TradeRow };

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

export interface EquityCurvePoint {
  tradeNumber: number;
  cumulativeR: number;
  pnl: number;
}

export interface TradeDistributionBucket {
  range: string;
  count: number;
  isPositive: boolean;
}

export interface StrategyResult {
  metrics: StrategyMetrics;
  probabilityRandom: number; // 0-1
  verdict: 'LIKELY_POSITIVE_EDGE' | 'LIKELY_NEGATIVE_EDGE' | 'NOT_STATISTICALLY_RELIABLE';
  confidence: number; // 0-100 percentage
  stabilityCheck: {
    firstHalf: StrategyMetrics;
    secondHalf: StrategyMetrics;
    degradation: boolean;
  };
  equityCurve: EquityCurvePoint[];
  tradeDistribution: TradeDistributionBucket[];
}

/**
 * Filter trades based on strategy rule
 */
export function filterTradesByRule(trades: TradeRow[], rule: StrategyRule): TradeRow[] {
  let filtered = [...trades];

  // Filter by instrument
  if (rule.instrument) {
    const instrument = rule.instrument.toUpperCase();
    filtered = filtered.filter(t => 
      t.symbol.toUpperCase() === instrument
    );
  }

  // Filter by time window (if provided as HH:MM format)
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

  // Filter by date range (if provided as date strings)
  // Note: This is handled separately from time window for date-based filtering
  // The rule builder will convert dates to time windows or we can add date filtering here

  // Filter by direction
  if (rule.direction && rule.direction !== 'BOTH') {
    filtered = filtered.filter(t => t.side === rule.direction);
  }

  // Filter by max holding time
  if (rule.maxHoldingTime) {
    const maxHoldingTime = rule.maxHoldingTime;
    filtered = filtered.filter(t => {
      const holdingTimeMs = t.close_time.getTime() - t.open_time.getTime();
      const holdingTimeMinutes = holdingTimeMs / (1000 * 60);
      return holdingTimeMinutes <= maxHoldingTime;
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
 * Compute equity curve (cumulative R-multiples per trade)
 */
function computeEquityCurve(trades: TradeRow[]): EquityCurvePoint[] {
  const losses = trades.filter(t => t.pnl < 0).map(t => Math.abs(t.pnl));
  let avgLoss = 1;
  if (losses.length > 0) {
    avgLoss = losses.reduce((sum, l) => sum + l, 0) / losses.length;
  } else {
    const avgAbsPnl = trades.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / trades.length;
    avgLoss = avgAbsPnl || 1;
  }

  let cumR = 0;
  return trades.map((t, idx) => {
    const r = t.pnl / avgLoss;
    cumR += r;
    return {
      tradeNumber: idx + 1,
      cumulativeR: parseFloat(cumR.toFixed(3)),
      pnl: t.pnl,
    };
  });
}

/**
 * Compute trade P&L distribution buckets
 */
function computeTradeDistribution(trades: TradeRow[]): TradeDistributionBucket[] {
  const losses = trades.filter(t => t.pnl < 0).map(t => Math.abs(t.pnl));
  let avgLoss = 1;
  if (losses.length > 0) {
    avgLoss = losses.reduce((sum, l) => sum + l, 0) / losses.length;
  } else {
    const avgAbsPnl = trades.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / trades.length;
    avgLoss = avgAbsPnl || 1;
  }

  const rValues = trades.map(t => t.pnl / avgLoss);

  // Create buckets: <-3R, -3R to -2R, -2R to -1R, -1R to 0, 0 to 1R, 1R to 2R, 2R to 3R, >3R
  const buckets: TradeDistributionBucket[] = [
    { range: '< -3R', count: 0, isPositive: false },
    { range: '-3R to -2R', count: 0, isPositive: false },
    { range: '-2R to -1R', count: 0, isPositive: false },
    { range: '-1R to 0', count: 0, isPositive: false },
    { range: '0 to 1R', count: 0, isPositive: true },
    { range: '1R to 2R', count: 0, isPositive: true },
    { range: '2R to 3R', count: 0, isPositive: true },
    { range: '> 3R', count: 0, isPositive: true },
  ];

  for (const r of rValues) {
    if (r < -3) buckets[0].count++;
    else if (r < -2) buckets[1].count++;
    else if (r < -1) buckets[2].count++;
    else if (r < 0) buckets[3].count++;
    else if (r < 1) buckets[4].count++;
    else if (r < 2) buckets[5].count++;
    else if (r < 3) buckets[6].count++;
    else buckets[7].count++;
  }

  return buckets;
}

/**
 * Calculate confidence score (0-100) based on multiple factors
 */
function calculateConfidence(
  probabilityRandom: number,
  totalTrades: number,
  degradation: boolean,
  expectedValue: number,
): number {
  // Base confidence from randomness test (inverted - lower randomness = higher confidence)
  let confidence = (1 - probabilityRandom) * 100;

  // Penalty for small sample size
  if (totalTrades < 30) {
    confidence *= 0.6;
  } else if (totalTrades < 50) {
    confidence *= 0.8;
  } else if (totalTrades < 100) {
    confidence *= 0.9;
  }

  // Penalty for degradation
  if (degradation) {
    confidence *= 0.8;
  }

  // Very small EV reduces confidence
  if (Math.abs(expectedValue) < 0.05) {
    confidence *= 0.7;
  }

  return Math.round(Math.max(0, Math.min(100, confidence)));
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
  const equityCurve = computeEquityCurve(filteredTrades);
  const tradeDistribution = computeTradeDistribution(filteredTrades);

  // Determine verdict based on statistical significance AND direction of edge
  let verdict: 'LIKELY_POSITIVE_EDGE' | 'LIKELY_NEGATIVE_EDGE' | 'NOT_STATISTICALLY_RELIABLE';
  
  if (probabilityRandom < 0.2) {
    // Statistically significant - check direction
    if (metrics.expectedValue > 0) {
      verdict = 'LIKELY_POSITIVE_EDGE';
    } else {
      verdict = 'LIKELY_NEGATIVE_EDGE';
    }
  } else {
    verdict = 'NOT_STATISTICALLY_RELIABLE';
  }

  const confidence = calculateConfidence(
    probabilityRandom,
    metrics.totalTrades,
    stability.degradation,
    metrics.expectedValue,
  );

  return {
    metrics,
    probabilityRandom,
    verdict,
    confidence,
    stabilityCheck: stability,
    equityCurve,
    tradeDistribution,
  };
}
