/**
 * Trading Calculator Utilities
 * Comprehensive calculations for Forex, Crypto, Options, and Futures trading
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type AccountCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF';
export type MarginType = 'isolated' | 'cross';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop-limit' | 'trailing-stop';
export type PositionSide = 'long' | 'short';

export interface ForexCalculation {
  pipValue: number;
  lotSize: number;
  standardLots: number;
  margin: number;
  leverage: number;
  positionSize: number;
  riskAmount: number;
  stopLossPips: number;
  takeProfitPips?: number;
  potentialProfit?: number;
  potentialLoss: number;
  riskRewardRatio?: number;
}

export interface CryptoCalculation {
  quantity: number;
  notionalValue: number;
  margin: number;
  leverage: number;
  marginType: MarginType;
  liquidationPrice: number;
  riskAmount: number;
  potentialProfit?: number;
  potentialLoss: number;
  riskRewardRatio?: number;
  maintenanceMargin: number;
}

export interface OptionsCalculation {
  contractSize: number;
  premium: number;
  totalCost: number;
  breakeven: number;
  maxProfit: number;
  maxLoss: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface FuturesCalculation {
  contracts: number;
  contractValue: number;
  totalNotional: number;
  margin: number;
  leverage: number;
  tickValue: number;
  potentialProfit?: number;
  potentialLoss: number;
  riskRewardRatio?: number;
}

export interface RiskManagement {
  accountBalance: number;
  riskPercentage: number;
  maxRiskAmount: number;
  positionSize: number;
  stopLossDistance: number;
  recommendedLeverage: number;
  marginUtilization: number;
}

// ============================================================================
// FOREX CALCULATIONS
// ============================================================================

/**
 * Calculate pip value for forex pairs
 */
export function calculatePipValue(
  pair: string,
  lotSize: number,
  accountCurrency: AccountCurrency = 'USD',
  exchangeRate: number = 1
): number {
  // Standard lot = 100,000 units
  // Mini lot = 10,000 units
  // Micro lot = 1,000 units
  
  const baseValue = lotSize * 100000;
  
  // For JPY pairs, pip is 0.01, for others it's 0.0001
  const pipSize = pair.includes('JPY') ? 0.01 : 0.0001;
  
  // Calculate pip value
  let pipValue = baseValue * pipSize;
  
  // Convert to account currency if needed
  if (accountCurrency !== 'USD') {
    pipValue = pipValue * exchangeRate;
  }
  
  return pipValue;
}

/**
 * Calculate optimal lot size based on risk parameters
 */
export function calculateForexPosition(params: {
  accountBalance: number;
  riskPercentage: number;
  stopLossPips: number;
  pair: string;
  leverage: number;
  accountCurrency?: AccountCurrency;
  takeProfitPips?: number;
}): ForexCalculation {
  const {
    accountBalance,
    riskPercentage,
    stopLossPips,
    pair,
    leverage,
    accountCurrency = 'USD',
    takeProfitPips
  } = params;

  // Calculate risk amount
  const riskAmount = accountBalance * (riskPercentage / 100);
  
  // Calculate pip value per standard lot (approximate)
  const pipValuePerStandardLot = pair.includes('JPY') ? 1000 : 10;
  
  // Calculate position size in standard lots
  const standardLots = riskAmount / (stopLossPips * pipValuePerStandardLot);
  
  // Calculate actual lot size (can be fractional)
  const lotSize = Math.floor(standardLots * 100) / 100; // Round to 2 decimals
  
  // Calculate position value
  const positionSize = lotSize * 100000;
  
  // Calculate margin required
  const margin = positionSize / leverage;
  
  // Calculate pip value for the position
  const pipValue = calculatePipValue(pair, lotSize, accountCurrency);
  
  // Calculate potential loss
  const potentialLoss = stopLossPips * pipValue;
  
  // Calculate potential profit if take profit is set
  let potentialProfit: number | undefined;
  let riskRewardRatio: number | undefined;
  
  if (takeProfitPips) {
    potentialProfit = takeProfitPips * pipValue;
    riskRewardRatio = potentialProfit / potentialLoss;
  }

  return {
    pipValue,
    lotSize,
    standardLots,
    margin,
    leverage,
    positionSize,
    riskAmount,
    stopLossPips,
    takeProfitPips,
    potentialProfit,
    potentialLoss,
    riskRewardRatio
  };
}

/**
 * Calculate margin requirements for forex
 */
export function calculateForexMargin(
  lotSize: number,
  leverage: number,
  exchangeRate: number = 1
): number {
  const positionValue = lotSize * 100000 * exchangeRate;
  return positionValue / leverage;
}

// ============================================================================
// CRYPTO CALCULATIONS
// ============================================================================

/**
 * Calculate crypto position with leverage
 */
export function calculateCryptoPosition(params: {
  accountBalance: number;
  riskPercentage: number;
  entryPrice: number;
  stopLossPrice: number;
  leverage: number;
  marginType: MarginType;
  takeProfitPrice?: number;
  maintenanceMarginRate?: number;
}): CryptoCalculation {
  const {
    accountBalance,
    riskPercentage,
    entryPrice,
    stopLossPrice,
    leverage,
    marginType,
    takeProfitPrice,
    maintenanceMarginRate = 0.004 // 0.4% default maintenance margin
  } = params;

  // Calculate risk amount
  const riskAmount = accountBalance * (riskPercentage / 100);
  
  // Calculate stop loss distance (percentage)
  const stopLossDistance = Math.abs(entryPrice - stopLossPrice) / entryPrice;
  
  // Calculate quantity based on risk
  const quantity = riskAmount / (stopLossDistance * entryPrice * leverage);
  
  // Calculate notional value
  const notionalValue = quantity * entryPrice;
  
  // Calculate margin required
  const margin = notionalValue / leverage;
  
  // Calculate liquidation price
  let liquidationPrice: number;
  if (marginType === 'isolated') {
    // For isolated margin: liquidation occurs when loss equals margin
    const positionSide = stopLossPrice < entryPrice ? 'long' : 'short';
    if (positionSide === 'long') {
      liquidationPrice = entryPrice * (1 - (1 / leverage) + maintenanceMarginRate);
    } else {
      liquidationPrice = entryPrice * (1 + (1 / leverage) - maintenanceMarginRate);
    }
  } else {
    // For cross margin: uses entire account balance
    const positionSide = stopLossPrice < entryPrice ? 'long' : 'short';
    if (positionSide === 'long') {
      liquidationPrice = entryPrice - (accountBalance / quantity) * (1 - maintenanceMarginRate);
    } else {
      liquidationPrice = entryPrice + (accountBalance / quantity) * (1 - maintenanceMarginRate);
    }
  }
  
  // Calculate potential loss
  const potentialLoss = Math.abs(entryPrice - stopLossPrice) * quantity;
  
  // Calculate potential profit if take profit is set
  let potentialProfit: number | undefined;
  let riskRewardRatio: number | undefined;
  
  if (takeProfitPrice) {
    potentialProfit = Math.abs(takeProfitPrice - entryPrice) * quantity;
    riskRewardRatio = potentialProfit / potentialLoss;
  }
  
  // Calculate maintenance margin
  const maintenanceMargin = notionalValue * maintenanceMarginRate;

  return {
    quantity,
    notionalValue,
    margin,
    leverage,
    marginType,
    liquidationPrice,
    riskAmount,
    potentialProfit,
    potentialLoss,
    riskRewardRatio,
    maintenanceMargin
  };
}

/**
 * Calculate funding rate impact
 */
export function calculateFundingRate(
  notionalValue: number,
  fundingRate: number,
  hoursHeld: number
): number {
  // Funding usually occurs every 8 hours
  const fundingPeriods = hoursHeld / 8;
  return notionalValue * fundingRate * fundingPeriods;
}

// ============================================================================
// OPTIONS CALCULATIONS
// ============================================================================

/**
 * Calculate options position
 */
export function calculateOptionsPosition(params: {
  optionType: 'call' | 'put';
  strikePrice: number;
  premium: number;
  contracts: number;
  underlyingPrice: number;
  contractSize?: number;
}): OptionsCalculation {
  const {
    optionType,
    strikePrice,
    premium,
    contracts,
    underlyingPrice,
    contractSize = 100 // Standard options contract size
  } = params;

  const totalCost = premium * contracts * contractSize;
  
  let breakeven: number;
  let maxProfit: number;
  let maxLoss: number;
  
  if (optionType === 'call') {
    // Call option calculations
    breakeven = strikePrice + premium;
    maxLoss = totalCost;
    maxProfit = Infinity; // Theoretically unlimited for calls
    
  } else {
    // Put option calculations
    breakeven = strikePrice - premium;
    maxLoss = totalCost;
    maxProfit = (strikePrice - premium) * contracts * contractSize;
  }

  return {
    contractSize,
    premium,
    totalCost,
    breakeven,
    maxProfit,
    maxLoss
  };
}

/**
 * Black-Scholes Option Pricing (simplified)
 */
export function blackScholesCall(
  S: number, // Current stock price
  K: number, // Strike price
  T: number, // Time to expiration (years)
  r: number, // Risk-free rate
  sigma: number // Volatility
): number {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  const normalCDF = (x: number): number => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  };
  
  return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
}

// ============================================================================
// FUTURES CALCULATIONS
// ============================================================================

/**
 * Calculate futures position
 */
export function calculateFuturesPosition(params: {
  accountBalance: number;
  riskPercentage: number;
  contractPrice: number;
  stopLossPrice: number;
  multiplier: number; // Contract multiplier (e.g., 50 for S&P 500 E-mini)
  leverage: number;
  takeProfitPrice?: number;
}): FuturesCalculation {
  const {
    accountBalance,
    riskPercentage,
    contractPrice,
    stopLossPrice,
    multiplier,
    leverage,
    takeProfitPrice
  } = params;

  const riskAmount = accountBalance * (riskPercentage / 100);
  
  // Calculate stop loss distance in points
  const stopLossPoints = Math.abs(contractPrice - stopLossPrice);
  
  // Calculate tick value (point value)
  const tickValue = multiplier;
  
  // Calculate number of contracts
  const contracts = Math.floor(riskAmount / (stopLossPoints * tickValue));
  
  // Calculate contract value
  const contractValue = contractPrice * multiplier;
  
  // Calculate total notional value
  const totalNotional = contractValue * contracts;
  
  // Calculate margin required
  const margin = totalNotional / leverage;
  
  // Calculate potential loss
  const potentialLoss = stopLossPoints * tickValue * contracts;
  
  // Calculate potential profit if take profit is set
  let potentialProfit: number | undefined;
  let riskRewardRatio: number | undefined;
  
  if (takeProfitPrice) {
    const takeProfitPoints = Math.abs(takeProfitPrice - contractPrice);
    potentialProfit = takeProfitPoints * tickValue * contracts;
    riskRewardRatio = potentialProfit / potentialLoss;
  }

  return {
    contracts,
    contractValue,
    totalNotional,
    margin,
    leverage,
    tickValue,
    potentialProfit,
    potentialLoss,
    riskRewardRatio
  };
}

// ============================================================================
// RISK MANAGEMENT
// ============================================================================

/**
 * Calculate comprehensive risk metrics
 */
export function calculateRiskMetrics(params: {
  accountBalance: number;
  riskPercentage: number;
  entryPrice: number;
  stopLossPrice: number;
  leverage: number;
  positions?: number;
}): RiskManagement {
  const {
    accountBalance,
    riskPercentage,
    entryPrice,
    stopLossPrice,
    leverage,
    positions = 1
  } = params;

  const maxRiskAmount = accountBalance * (riskPercentage / 100);
  const stopLossDistance = Math.abs(entryPrice - stopLossPrice);
  const stopLossPercent = (stopLossDistance / entryPrice) * 100;
  
  // Calculate position size
  const positionSize = (maxRiskAmount * leverage) / stopLossPercent;
  
  // Calculate recommended leverage based on risk
  const recommendedLeverage = Math.min(leverage, 20); // Cap at 20x for safety
  
  // Calculate margin utilization
  const totalPositionValue = positionSize * positions;
  const marginUsed = totalPositionValue / leverage;
  const marginUtilization = (marginUsed / accountBalance) * 100;

  return {
    accountBalance,
    riskPercentage,
    maxRiskAmount,
    positionSize,
    stopLossDistance,
    recommendedLeverage,
    marginUtilization
  };
}

/**
 * Calculate Kelly Criterion for position sizing
 */
export function kellyCalculator(
  winRate: number, // Win rate as decimal (e.g., 0.55 for 55%)
  avgWin: number,
  avgLoss: number
): number {
  const b = avgWin / avgLoss; // Ratio of average win to average loss
  const p = winRate; // Probability of winning
  const q = 1 - p; // Probability of losing
  
  // Kelly formula: (bp - q) / b
  const kelly = (b * p - q) / b;
  
  // Return as percentage, capped at 25% for safety
  return Math.min(kelly * 100, 25);
}

/**
 * Calculate position size using fixed ratio money management
 */
export function fixedRatioPositionSize(
  accountBalance: number,
  delta: number, // Profit target to increase position size
  profitsSinceLastIncrease: number,
  currentContracts: number
): number {
  // Fixed Ratio formula
  const n = currentContracts;
  const requiredProfit = delta * n;
  
  if (profitsSinceLastIncrease >= requiredProfit) {
    return currentContracts + 1;
  }
  
  return currentContracts;
}

/**
 * Calculate maximum position size based on volatility
 */
export function volatilityBasedPositionSize(
  accountBalance: number,
  riskPercentage: number,
  atr: number, // Average True Range
  entryPrice: number
): number {
  const riskAmount = accountBalance * (riskPercentage / 100);
  const volatilityRisk = atr / entryPrice;
  
  return riskAmount / (volatilityRisk * entryPrice);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert between different lot sizes
 */
export function convertLotSize(
  lots: number,
  fromType: 'standard' | 'mini' | 'micro',
  toType: 'standard' | 'mini' | 'micro'
): number {
  const sizes = {
    standard: 100000,
    mini: 10000,
    micro: 1000
  };
  
  const units = lots * sizes[fromType];
  return units / sizes[toType];
}

/**
 * Calculate profit/loss for a position
 */
export function calculatePnL(params: {
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  positionSide: PositionSide;
  leverage?: number;
}): number {
  const { entryPrice, exitPrice, quantity, positionSide, leverage = 1 } = params;
  
  let pnl: number;
  if (positionSide === 'long') {
    pnl = (exitPrice - entryPrice) * quantity;
  } else {
    pnl = (entryPrice - exitPrice) * quantity;
  }
  
  return pnl * leverage;
}

/**
 * Calculate ROI percentage
 */
export function calculateROI(
  initialInvestment: number,
  currentValue: number
): number {
  return ((currentValue - initialInvestment) / initialInvestment) * 100;
}

/**
 * Calculate Sharpe Ratio
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02
): number {
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  return (avgReturn - riskFreeRate) / stdDev;
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency: AccountCurrency = 'USD',
  decimals: number = 2
): string {
  const symbols: Record<AccountCurrency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF'
  };
  
  return `${symbols[currency]}${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}
