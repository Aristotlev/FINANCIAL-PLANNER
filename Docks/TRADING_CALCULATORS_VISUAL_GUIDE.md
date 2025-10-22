# Trading Calculators Visual Guide

## 🎯 Overview
Visual reference for the lot size and trade size calculator features in all trading tabs.

---

## 📊 Forex Trading Tab - Lot Size Calculator

### Auto Mode (Risk-Based Calculation)
```
┌─────────────────────────────────────────────────────────────┐
│ 🧮 Lot Size Calculator                         [Auto] ◄─ Toggle│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Lot size will be calculated automatically based on your    │
│ risk percentage (1%) and account balance.                  │
│                                                             │
│ Est. Risk: $100.00                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**How it works:**
- Set risk percentage (e.g., 1% = $100 risk on $10,000 account)
- Calculator determines optimal lot size based on:
  - Account balance
  - Risk percentage
  - Stop loss distance in pips
  - Currency pair (JPY pairs have different pip values)

---

### Manual Mode (Custom Lot Size)
```
┌─────────────────────────────────────────────────────────────┐
│ 🧮 Lot Size Calculator                      [Manual] ◄─ Toggle│
├─────────────────────────────────────────────────────────────┤
│ Enter Lot Size                                              │
│ ┌─────────────────────────────────────┐                    │
│ │ 0.10                                │                    │
│ └─────────────────────────────────────┘                    │
│                                                             │
│ ┌─────────────┬─────────────┬─────────────┐               │
│ │   Micro     │    Mini     │  Standard   │               │
│ ├─────────────┼─────────────┼─────────────┤               │
│ │ 100 units   │  1.00 lots  │ 10,000 units│               │
│ └─────────────┴─────────────┴─────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

**Breakdown explanation:**
- **Micro lots**: 1,000 units (0.10 lot = 100 micro lots)
- **Mini lots**: 10,000 units (0.10 lot = 1 mini lot)
- **Standard lots**: 100,000 units (0.10 lot = 10,000 units)

**Example: 0.50 Lot Size**
```
┌─────────────┬─────────────┬─────────────┐
│   Micro     │    Mini     │  Standard   │
├─────────────┼─────────────┼─────────────┤
│ 500 units   │  5.00 lots  │ 50,000 units│
└─────────────┴─────────────┴─────────────┘
```

---

## 💰 Live Price Display (Forex)

```
┌─────────────────────────────────────────────────────────────┐
│ 📡 Live Price: EUR/USD                         ⚡ 1.08534   │
└─────────────────────────────────────────────────────────────┘
     ↑
  Animated when loading
```

**Features:**
- Updates every 30 seconds
- 5 decimal precision for most pairs
- 3 decimal precision for JPY pairs
- Animated pulse during price fetch

---

## 🪙 Crypto Futures Tab - Trade Size Calculator

### Auto Mode (Risk-Based Calculation)
```
┌─────────────────────────────────────────────────────────────┐
│ 🪙 Trade Size Calculator                       [Auto] ◄─ Toggle│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Trade size will be calculated automatically based on your  │
│ risk percentage (2%) and account balance.                  │
│                                                             │
│ Est. Risk: $200.00                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**How it works:**
- Set risk percentage (e.g., 2% = $200 risk on $10,000 account)
- Calculator determines quantity based on:
  - Account balance
  - Risk percentage
  - Entry price
  - Stop loss price
  - Leverage

---

### Manual Mode (Custom Trade Size)
```
┌─────────────────────────────────────────────────────────────┐
│ 🪙 Trade Size Calculator                    [Manual] ◄─ Toggle│
├─────────────────────────────────────────────────────────────┤
│ Enter Trade Size (Quantity)                                │
│ ┌─────────────────────────────────────┐                    │
│ │ 0.5                                 │                    │
│ └─────────────────────────────────────┘                    │
│                                                             │
│ ┌────────────────────┬──────────────────────┐             │
│ │     Quantity       │   Notional Value     │             │
│ ├────────────────────┼──────────────────────┤             │
│ │   0.5000 BTC       │    $42,500.00        │             │
│ └────────────────────┴──────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

**Breakdown explanation:**
- **Quantity**: Amount of base currency (BTC, ETH, etc.)
- **Notional Value**: Total position value in USDT (quantity × entry price)

**Example: 1.5 BTC @ $85,000**
```
┌────────────────────┬──────────────────────┐
│     Quantity       │   Notional Value     │
├────────────────────┼──────────────────────┤
│   1.5000 BTC       │   $127,500.00        │
└────────────────────┴──────────────────────┘
```

---

## 💰 Live Price Display (Crypto)

```
┌─────────────────────────────────────────────────────────────┐
│ 📡 Live Price: BTC/USDT                      💚 $85,234.56  │
└─────────────────────────────────────────────────────────────┘
     ↑
  Animated when loading
```

**Features:**
- Updates every 30 seconds
- 2 decimal precision (USDT prices)
- Fetches from CoinGecko API
- Green gradient background

---

## 📈 Options Trading Tab - Live Underlying Price

### Underlying Price Input with Live Data
```
┌─────────────────────────────────────────────────────────────┐
│ Underlying Price                                            │
│ ┌─────────────────────────────────────┐                    │
│ │ 175.50                              │                    │
│ └─────────────────────────────────────┘                    │
│ 📡 Live: $175.50                                           │
└─────────────────────────────────────────────────────────────┘
     ↑
  Auto-updates every 30 seconds
```

**Features:**
- Auto-fills with live stock price
- Updates when symbol changes
- Small indicator below input
- Can manually override if needed

---

## 🎨 Color Schemes

### Forex (Blue/Indigo)
- Background: `from-blue-50 to-indigo-50` (light) / `from-blue-900/20 to-indigo-900/20` (dark)
- Border: `border-blue-200` (light) / `border-blue-800` (dark)
- Icon: Blue (#2563eb)

### Crypto (Cyan/Teal)
- Background: `from-cyan-50 to-teal-50` (light) / `from-cyan-900/20 to-teal-900/20` (dark)
- Border: `border-cyan-200` (light) / `border-cyan-800` (dark)
- Icon: Cyan (#0891b2)

### Options (Green/Emerald)
- Background: `from-green-50 to-emerald-50` (light) / `from-green-900/20 to-emerald-900/20` (dark)
- Border: `border-green-200` (light) / `border-green-800` (dark)
- Icon: Green (#16a34a)

---

## 🔢 Complete Calculation Results Display

### Forex - After Calculation
```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Calculated Position Details                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 Lot Size Breakdown                                      │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Standard Lots: 0.20 lots                              │ │
│ │ Mini Lots: 2.00 lots                                  │ │
│ │ Micro Lots: 20 micro lots                             │ │
│ │ Position Value: $20,000                               │ │
│ │ Pip Value: $2.00                                      │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ 💰 Profit & Loss Analysis                                  │
│ ┌─────────────────────┬─────────────────────┐             │
│ │  🛡️ Maximum Loss   │  🎯 Maximum Profit  │             │
│ ├─────────────────────┼─────────────────────┤             │
│ │    $100.00          │    $200.00          │             │
│ │    50 pips          │    100 pips         │             │
│ │    1.0% risk        │    2.0% gain        │             │
│ └─────────────────────┴─────────────────────┘             │
│                                                             │
│ Risk/Reward Ratio: ✅ 2.0:1                                │
│ Per Pip: 💚 +$2.00 | 💔 -$2.00                            │
└─────────────────────────────────────────────────────────────┘
```

### Crypto - After Calculation
```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Calculated Position Details                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 Trade Size Breakdown                                    │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Quantity: 0.5000 BTC                                  │ │
│ │ Notional Value: $42,500.00                            │ │
│ │ Entry Price: $85,000.00                               │ │
│ │ Total Position Value: $42,500.00                      │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ⚙️ Margin & Leverage Info                                  │
│ ┌─────────────┬─────────────┬───────────────┐             │
│ │   Margin    │  Leverage   │  Liquidation  │             │
│ │  Required   │             │     Price     │             │
│ ├─────────────┼─────────────┼───────────────┤             │
│ │  $4,250.00  │    10x      │   $76,500     │             │
│ │    10.0%    │             │   ⚠️ 10% away │             │
│ └─────────────┴─────────────┴───────────────┘             │
│                                                             │
│ 💰 P&L Projections                                         │
│ ┌─────────────────────┬─────────────────────┐             │
│ │  🛡️ Maximum Loss   │  🎯 Maximum Profit  │             │
│ ├─────────────────────┼─────────────────────┤             │
│ │    $2,500.00        │    $5,000.00        │             │
│ │    -58.8% ROI       │    +117.6% ROI      │             │
│ │  @ $80,000 (SL)     │  @ $95,000 (TP)     │             │
│ └─────────────────────┴─────────────────────┘             │
│                                                             │
│ Risk/Reward Ratio: ✅ 2.0:1                                │
│ Leverage Impact: 10x amplified returns                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Real-time P&L Updates

### Position Card with Live Updates
```
┌─────────────────────────────────────────────────────────────┐
│ EUR/USD  •  Long  •  0.10 lots                             │
├─────────────────────────────────────────────────────────────┤
│ Entry: 1.08500  →  Current: 1.08534 📡                     │
│                                                             │
│ P/L: 💚 +$6.80 (+3.4 pips)                                 │
│                                                             │
│ SL: 1.08000 (-50 pips)  |  TP: 1.09500 (+100 pips)       │
├─────────────────────────────────────────────────────────────┤
│ Updated: 2 seconds ago ⚡                                   │
└─────────────────────────────────────────────────────────────┘
```

**Updates automatically every 30 seconds**

---

## 🎯 Toggle Button States

### Auto Mode (Default)
```
┌──────────┐
│  [Auto]  │  ← Gray background, not selected
└──────────┘
```

### Manual Mode (Active)
```
┌──────────┐
│ [Manual] │  ← Blue/Cyan background, white text
└──────────┘
```

---

## 💡 Usage Examples

### Example 1: Conservative Forex Trade
```
Account: $10,000
Risk: 1% ($100)
Pair: EUR/USD
Entry: 1.08500
Stop Loss: 50 pips
Mode: Auto

Result:
✅ Lot Size: 0.20 lots
✅ Pip Value: $2.00
✅ Max Loss: $100 (exactly 1% risk)
✅ Position Value: $21,700
✅ Margin Required: $724 (@ 30:1 leverage)
```

### Example 2: Aggressive Crypto Trade
```
Account: $10,000
Risk: 5% ($500)
Symbol: BTC/USDT
Entry: $85,000
Stop Loss: $80,000
Leverage: 20x
Mode: Auto

Result:
✅ Quantity: 1.1765 BTC
✅ Notional Value: $100,000
✅ Margin Required: $5,000
✅ Max Loss: $5,882 (5.88% of notional)
✅ Liquidation: $80,750
```

### Example 3: Manual Crypto Trade
```
Mode: Manual
Quantity: 0.5 BTC
Entry: $85,000
Stop Loss: $82,000
Leverage: 10x

Result:
✅ Notional Value: $42,500
✅ Margin Required: $4,250
✅ Max Loss: $1,500
✅ Risk: 3.53% of margin
✅ Liquidation: $76,500
```

---

## 🚦 Visual Indicators

### Risk/Reward Ratio Colors
- 🟢 **Green** (≥2:1): Excellent risk/reward
- 🟡 **Yellow** (≥1:1): Acceptable risk/reward
- 🔴 **Red** (<1:1): Poor risk/reward

### Loading States
- ⚡ **Pulsing Icon**: Price is being fetched
- ✅ **Static Icon**: Price is current
- ⏰ **Timestamp**: Shows last update time

### Price Movement
- 💚 **Green**: Profitable position
- 💔 **Red**: Losing position
- ⚪ **Gray**: Breakeven

---

## 📊 Comparison Table

| Feature | Forex | Crypto Futures | Options |
|---------|-------|----------------|---------|
| **Calculator Type** | Lot Size | Trade Size | N/A (Standard) |
| **Auto Mode** | ✅ Yes | ✅ Yes | ✅ (Auto-fill) |
| **Manual Mode** | ✅ Yes | ✅ Yes | N/A |
| **Live Prices** | ✅ Every 30s | ✅ Every 30s | ✅ Every 30s |
| **P&L Updates** | ✅ Real-time | ✅ Real-time | ✅ Real-time |
| **Risk Calc** | Pip-based | Price-based | Premium-based |
| **Leverage** | Up to 500:1 | Up to 125x | N/A |
| **Size Units** | Lots | Quantity | Contracts |
| **Precision** | 0.01 lots | 0.0001 coins | 1 contract |

---

## 🎓 Best Practices

### When to Use Auto Mode:
- ✅ Consistent risk management
- ✅ Multiple trades per day
- ✅ Following a trading plan
- ✅ Beginner to intermediate traders

### When to Use Manual Mode:
- ✅ Specific position sizing needs
- ✅ Scaling in/out of positions
- ✅ Portfolio balancing
- ✅ Advanced trading strategies
- ✅ Experienced traders

---

## 🔍 Troubleshooting

### "Live price not loading"
- Check internet connection
- Verify API rate limits not exceeded
- Try refreshing the page
- Check browser console for errors

### "Calculator shows unusual values"
- Verify all inputs are filled correctly
- Check decimal precision (lots vs. units)
- Ensure stop loss is set properly
- Confirm leverage is reasonable

### "P&L not updating"
- Wait 30 seconds for next update cycle
- Check if position is still open
- Verify symbol is correct
- Refresh position list

---

This visual guide provides a complete reference for understanding and using the trading calculators with live market data integration.
