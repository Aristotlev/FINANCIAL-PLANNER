# Trading Functionality Documentation

## Overview

The Money Hub App now includes comprehensive trading functionalities for Forex, Crypto, Options, and Futures trading. This system provides position sizing calculators, risk management tools, and order management capabilities.

## Features

### 1. Trading Calculator (`lib/trading-calculator.ts`)

Comprehensive calculation utilities for different trading instruments:

#### Forex Trading
- **Pip Value Calculation**: Accurately calculates pip values for any currency pair
- **Lot Size Optimization**: Determines optimal lot sizes based on risk parameters
- **Position Sizing**: Calculates position size considering account balance and risk percentage
- **Leverage Support**: Up to 1:500 leverage
- **Margin Calculation**: Real-time margin requirements

**Example Usage:**
```typescript
const forexPosition = calculateForexPosition({
  accountBalance: 10000,
  riskPercentage: 1,
  stopLossPips: 50,
  pair: 'EUR/USD',
  leverage: 30,
  takeProfitPips: 100
});

// Returns:
// - lotSize: 0.4 (standard lots)
// - margin: $1,333
// - potentialLoss: $200
// - potentialProfit: $400
// - riskRewardRatio: 2:1
```

#### Crypto Trading
- **Isolated & Cross Margin**: Support for both margin types
- **Liquidation Price**: Automatic liquidation price calculation
- **Leverage**: Up to 1:125 leverage
- **Maintenance Margin**: Tracks maintenance margin requirements
- **Funding Rate**: Calculate funding rate impact over time

**Example Usage:**
```typescript
const cryptoPosition = calculateCryptoPosition({
  accountBalance: 10000,
  riskPercentage: 2,
  entryPrice: 43500,
  stopLossPrice: 42000,
  leverage: 10,
  marginType: 'isolated',
  takeProfitPrice: 45000
});

// Returns:
// - quantity: 0.133 BTC
// - notionalValue: $5,790
// - margin: $579
// - liquidationPrice: $39,150
// - potentialLoss: $200
// - potentialProfit: $200
```

#### Options Trading
- **Call & Put Options**: Support for both option types
- **Breakeven Calculation**: Automatic breakeven price
- **Max Profit/Loss**: Clear risk visualization
- **Black-Scholes Pricing**: Advanced option pricing model
- **Greeks Support**: Delta, Gamma, Theta, Vega calculations

**Example Usage:**
```typescript
const optionsPosition = calculateOptionsPosition({
  optionType: 'call',
  strikePrice: 460,
  premium: 5.50,
  contracts: 5,
  underlyingPrice: 450
});

// Returns:
// - totalCost: $2,750
// - breakeven: $465.50
// - maxLoss: $2,750
// - maxProfit: Unlimited (for calls)
```

#### Futures Trading
- **Contract Multipliers**: Support for various futures contracts
- **Margin Requirements**: Accurate margin calculations
- **Tick Value**: Precise profit/loss per tick
- **Multiple Contracts**: Handle multiple contract positions

**Example Usage:**
```typescript
const futuresPosition = calculateFuturesPosition({
  accountBalance: 25000,
  riskPercentage: 1,
  contractPrice: 4500,
  stopLossPrice: 4450,
  multiplier: 50, // ES (S&P 500 E-mini)
  leverage: 10,
  takeProfitPrice: 4600
});

// Returns:
// - contracts: 1
// - totalNotional: $225,000
// - margin: $22,500
// - potentialLoss: $2,500
// - potentialProfit: $5,000
```

### 2. Trading Calculator Panel (`components/ui/trading-calculator-panel.tsx`)

Interactive UI component for position sizing:

#### Features:
- **Multi-Asset Support**: Forex, Crypto, Options, Futures
- **Real-time Calculations**: Auto-updates on input changes
- **Visual Risk Display**: Color-coded risk/reward visualization
- **Account Balance Management**: Track and adjust account size
- **Leverage Slider**: Easy leverage selection with warnings
- **Margin Type Selection**: Isolated vs Cross margin (crypto)
- **Risk Management Metrics**:
  - Max risk amount
  - Margin utilization percentage
  - Recommended leverage
  - Risk:Reward ratio warnings

#### Risk Management Features:
- **Low R:R Warning**: Alerts when risk:reward < 1.5:1
- **High Margin Warning**: Alerts when margin usage > 50%
- **Leverage Warnings**: Visual warnings for high leverage (>20:1)
- **Position Size Recommendations**: Based on account balance

### 3. Order Management Panel (`components/ui/order-management-panel.tsx`)

Complete order entry and management system:

#### Order Types Supported:
1. **Market Orders**: Execute immediately at current price
2. **Limit Orders**: Execute at specified price or better
3. **Stop Orders**: Trigger when price reaches stop level
4. **Stop-Limit Orders**: Combination of stop and limit
5. **Trailing Stop**: Dynamic stop that follows price

#### Features:
- **Buy/Sell Toggle**: Clear long/short position entry
- **Order Type Selection**: All major order types
- **Leverage Control**: Instrument-specific leverage limits
- **Margin Type** (Crypto): Isolated or Cross margin
- **Advanced Options**:
  - Stop Loss automation
  - Take Profit targets
  - Order notes/rationale
- **Active Order Tracking**: Monitor pending and filled orders
- **Order Status Display**: Visual status indicators

### 4. Risk Management Tools

#### Kelly Criterion
Calculates optimal position size based on win rate and average win/loss:

```typescript
const kellyPercent = kellyCalculator(
  0.55, // 55% win rate
  150,  // Average win
  100   // Average loss
);
// Returns: 15% (capped at 25% for safety)
```

#### Fixed Ratio Money Management
Progressive position sizing based on profits:

```typescript
const newPositionSize = fixedRatioPositionSize(
  accountBalance,
  1000, // Delta (profit target)
  1500, // Profits since last increase
  currentContracts
);
```

#### Volatility-Based Position Sizing
Uses Average True Range (ATR) for position sizing:

```typescript
const positionSize = volatilityBasedPositionSize(
  10000,   // Account balance
  1,       // Risk percentage
  100,     // ATR value
  4500     // Entry price
);
```

### 5. Trading Card Integration

The trading functionality is integrated into the Trading Account Card via a new "Trading" tab:

#### Access:
1. Open Trading Account Card
2. Click "Trading" tab (first tab)
3. Set your account balance
4. Select trading type (Forex, Crypto, Options, Futures)
5. Enter trade parameters
6. View calculated position size and risk metrics

#### UI Features:
- **Account Balance Input**: Set your trading capital
- **Multi-Tab Calculator**: Switch between trading types
- **Information Cards**: Quick reference for each market type
- **Risk Management Guidelines**: Built-in best practices
- **Warning Systems**: Automatic risk alerts

## Usage Guidelines

### Best Practices

1. **Risk Management**
   - Never risk more than 1-2% per trade
   - Always use stop losses
   - Target minimum 2:1 risk:reward
   - Keep leverage reasonable (<10:1 for beginners)

2. **Position Sizing**
   - Use calculator for every trade
   - Verify margin requirements
   - Check liquidation prices (crypto/futures)
   - Account for slippage in volatile markets

3. **Order Entry**
   - Double-check symbol and quantity
   - Set stop loss and take profit
   - Use limit orders in volatile markets
   - Add trade notes for journaling

4. **Leverage Usage**
   - **Forex**: Start with 1:10 to 1:30
   - **Crypto**: Start with 1:2 to 1:5
   - **Futures**: Typically 1:10 to 1:20
   - **Options**: No leverage needed (built-in leverage)

### Market-Specific Considerations

#### Forex
- Watch for spread costs (especially exotics)
- Consider swap rates for overnight positions
- Major pairs typically have tighter spreads
- News events can cause high volatility

#### Crypto
- 24/7 market - no gaps
- High volatility - use lower leverage
- Funding rates can add up over time
- Liquidation can happen fast

#### Options
- Time decay (Theta) reduces value daily
- Implied volatility affects premium
- Options expire - manage timeline
- Consider IV crush after earnings

#### Futures
- Contract expiration dates
- Rollover costs between contracts
- Higher margin requirements near expiry
- Different tick sizes per contract

## API Reference

### Functions

#### `calculateForexPosition(params)`
**Parameters:**
- `accountBalance` (number): Total account balance
- `riskPercentage` (number): Risk per trade (0.1-5)
- `stopLossPips` (number): Stop loss in pips
- `pair` (string): Currency pair (e.g., "EUR/USD")
- `leverage` (number): Leverage ratio (1-500)
- `accountCurrency` (AccountCurrency): Account base currency
- `takeProfitPips` (number, optional): Take profit in pips

**Returns:** `ForexCalculation`

#### `calculateCryptoPosition(params)`
**Parameters:**
- `accountBalance` (number): Total account balance
- `riskPercentage` (number): Risk per trade (0.1-5)
- `entryPrice` (number): Entry price
- `stopLossPrice` (number): Stop loss price
- `leverage` (number): Leverage ratio (1-125)
- `marginType` ('isolated' | 'cross'): Margin type
- `takeProfitPrice` (number, optional): Take profit price
- `maintenanceMarginRate` (number, optional): Maintenance margin rate

**Returns:** `CryptoCalculation`

#### `calculateOptionsPosition(params)`
**Parameters:**
- `optionType` ('call' | 'put'): Option type
- `strikePrice` (number): Strike price
- `premium` (number): Premium per contract
- `contracts` (number): Number of contracts
- `underlyingPrice` (number): Current underlying price
- `contractSize` (number, optional): Contract size (default 100)

**Returns:** `OptionsCalculation`

#### `calculateFuturesPosition(params)`
**Parameters:**
- `accountBalance` (number): Total account balance
- `riskPercentage` (number): Risk per trade
- `contractPrice` (number): Contract price
- `stopLossPrice` (number): Stop loss price
- `multiplier` (number): Contract multiplier
- `leverage` (number): Leverage ratio
- `takeProfitPrice` (number, optional): Take profit price

**Returns:** `FuturesCalculation`

#### `calculateRiskMetrics(params)`
**Parameters:**
- `accountBalance` (number): Total account balance
- `riskPercentage` (number): Risk percentage
- `entryPrice` (number): Entry price
- `stopLossPrice` (number): Stop loss price
- `leverage` (number): Leverage ratio
- `positions` (number, optional): Number of positions

**Returns:** `RiskManagement`

### Utility Functions

- `formatCurrency(amount, currency, decimals)` - Format numbers as currency
- `calculatePnL(params)` - Calculate profit/loss
- `calculateROI(initial, current)` - Calculate return on investment
- `calculateSharpeRatio(returns, riskFreeRate)` - Calculate Sharpe ratio
- `convertLotSize(lots, fromType, toType)` - Convert between lot sizes
- `calculateFundingRate(notional, rate, hours)` - Calculate funding costs

## Examples

### Complete Trading Workflow

```typescript
// 1. Set up account
const accountBalance = 10000;
const riskPerTrade = 1; // 1%

// 2. Calculate Forex position
const trade = calculateForexPosition({
  accountBalance,
  riskPercentage: riskPerTrade,
  stopLossPips: 30,
  pair: 'GBP/USD',
  leverage: 50,
  takeProfitPips: 90
});

console.log(`
  Trade Plan:
  - Lot Size: ${trade.lotSize} lots
  - Margin Required: $${trade.margin.toFixed(2)}
  - Risk: $${trade.potentialLoss.toFixed(2)}
  - Reward: $${trade.potentialProfit?.toFixed(2)}
  - R:R Ratio: ${trade.riskRewardRatio?.toFixed(2)}:1
`);

// 3. Verify risk management
const risk = calculateRiskMetrics({
  accountBalance,
  riskPercentage: riskPerTrade,
  entryPrice: 1.2650,
  stopLossPrice: 1.2620,
  leverage: 50
});

if (risk.marginUtilization > 50) {
  console.log('⚠️ High margin usage! Consider reducing position size.');
}

// 4. Place order (via Order Management Panel)
const order = {
  symbol: 'GBP/USD',
  side: 'buy',
  type: 'limit',
  quantity: trade.lotSize,
  limitPrice: 1.2650,
  stopLoss: 1.2620,
  takeProfit: 1.2740,
  leverage: 50
};
```

## Future Enhancements

- [ ] Integration with broker APIs for live trading
- [ ] Historical trade journal and analytics
- [ ] Performance tracking and statistics
- [ ] Multi-position portfolio analysis
- [ ] Correlation analysis between positions
- [ ] Advanced order types (OCO, OSO)
- [ ] Automated trading strategies
- [ ] Social trading / copy trading features
- [ ] Mobile app with push notifications
- [ ] Integration with TradingView for charting

## Support

For questions or issues:
1. Check this documentation
2. Review code examples
3. Test with small positions first
4. Always verify calculations manually

## Disclaimer

**This is a trading calculator and educational tool. It does not constitute financial advice. Trading involves substantial risk of loss. Always:**
- Understand the risks before trading
- Never trade with money you can't afford to lose
- Use proper risk management
- Practice with demo accounts first
- Consult with licensed financial advisors

---

**Version:** 1.0.0  
**Last Updated:** October 20, 2025  
**Author:** Money Hub Development Team
