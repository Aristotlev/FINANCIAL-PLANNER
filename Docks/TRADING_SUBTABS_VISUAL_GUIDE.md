# Trading Account Subtabs - Visual Guide

## Navigation Path

```
Dashboard → Trading Account Card → Click Card → Positions Tab → Choose Subtab
```

## Interface Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRADING ACCOUNT MODAL                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Positions] [Analytics] [Performance] [AI Signals]            │
│   ^^^^^^^^                                                      │
│   Active Tab                                                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Trading Account Balance                                  │ │
│  │  ┌─────────────────────────────┐                         │ │
│  │  │  $  10,000                  │  💵                     │ │
│  │  └─────────────────────────────┘                         │ │
│  │  Set your account size for accurate calculations         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [Overview] [Forex Trading] [Crypto Futures] [Options]    │ │
│  │  ^^^^^^^^                                                 │ │
│  │  Active Subtab                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │                  SUBTAB CONTENT AREA                      │ │
│  │                                                           │ │
│  │  (Changes based on selected subtab)                      │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Subtab Views

### 1. Overview Subtab (Cyan)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Overview] Forex Trading  Crypto Futures  Options              │
│  ^^^^^^^^                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Portfolio │ │Total P&L │ │ Active   │ │Long/Short│         │
│  │ Value    │ │ +$1,250  │ │Positions │ │  3 / 1   │         │
│  │ $25,000  │ │  +5.2%   │ │    4     │ │          │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 🔵 AAPL      LONG    150 shares @ $185.50            │   │
│  │    Current: $187.25  |  P&L: +$262.50 (+1.42%)       │   │
│  │                                    [📊] [✏️] [🗑️]      │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 🟡 BTC/USD   LONG    0.5 BTC @ $43,500               │   │
│  │    Current: $44,200  |  P&L: +$350.00 (+0.81%)       │   │
│  │                                    [📊] [✏️] [🗑️]      │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Forex Trading Subtab (Blue)

```
┌─────────────────────────────────────────────────────────────────┐
│  Overview [Forex Trading] Crypto Futures  Options              │
│            ^^^^^^^^^^^^^^                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ NEW FOREX POSITION CALCULATOR                          │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │ Currency Pair:        [EUR/USD ▼]                      │   │
│  │                                                         │   │
│  │ Direction:           [Long] [Short]                    │   │
│  │                                                         │   │
│  │ Entry Price:          [1.0850]                         │   │
│  │                                                         │   │
│  │ Stop Loss (pips):     [20]                             │   │
│  │                                                         │   │
│  │ Take Profit (pips):   [40]                             │   │
│  │                                                         │   │
│  │ Lot Size:             [0.10] (Micro: 0.01-1.00)       │   │
│  │                                                         │   │
│  │ Leverage:             [30x] ━━━━●━━━━━ (1-500x)       │   │
│  │                                                         │   │
│  │ Risk %:               [1.0%] of account                │   │
│  │                                                         │   │
│  │         [Calculate Position]                           │   │
│  │                                                         │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ 📊 POSITION DETAILS                                    │   │
│  │                                                         │   │
│  │ Position Size:        $1,085                           │   │
│  │ Margin Required:      $36.17                           │   │
│  │ Pip Value:            $0.10                            │   │
│  │ Potential Profit:     $40.00 (3.69%)                   │   │
│  │ Potential Loss:       $20.00 (1.84%)                   │   │
│  │ Risk/Reward:          1:2 ✅                            │   │
│  │                                                         │   │
│  │            [Add Position to Portfolio]                 │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 📈 ACTIVE FOREX POSITIONS                              │   │
│  │                                                         │   │
│  │ • EUR/USD LONG  | 0.10 lots | P&L: +$15.50            │   │
│  │ • GBP/USD SHORT | 0.05 lots | P&L: -$8.20             │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Crypto Futures Subtab (Purple)

```
┌─────────────────────────────────────────────────────────────────┐
│  Overview  Forex Trading [Crypto Futures] Options              │
│                          ^^^^^^^^^^^^^^^^                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ NEW CRYPTO FUTURES POSITION                            │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │ Trading Pair:         [BTC/USDT ▼]                     │   │
│  │                                                         │   │
│  │ Direction:           [Long] [Short]                    │   │
│  │                                                         │   │
│  │ Entry Price:          [43,500.00]                      │   │
│  │                                                         │   │
│  │ Stop Loss Price:      [42,900.00]                      │   │
│  │                                                         │   │
│  │ Take Profit:          [45,000.00]                      │   │
│  │                                                         │   │
│  │ Margin Type:         ⚪ Isolated  ⚫ Cross             │   │
│  │                                                         │   │
│  │ Leverage:             [10x] ━━●━━━━━━ (1-125x)        │   │
│  │                                                         │   │
│  │ Risk %:               [2.0%] of account                │   │
│  │                                                         │   │
│  │         [Calculate Position]                           │   │
│  │                                                         │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ 📊 POSITION DETAILS                                    │   │
│  │                                                         │   │
│  │ Position Size:        $333.33 USDT                     │   │
│  │ Quantity:             0.0076 BTC                       │   │
│  │ Margin Required:      $33.33 (Isolated)                │   │
│  │ Liquidation Price:    $38,925.00 ⚠️                    │   │
│  │ Potential Profit:     $500.00 (+150%)                  │   │
│  │ Potential Loss:       $200.00 (-60%)                   │   │
│  │ Risk/Reward:          1:2.5 ✅                          │   │
│  │                                                         │   │
│  │            [Add Position to Portfolio]                 │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 📈 ACTIVE FUTURES POSITIONS                            │   │
│  │                                                         │   │
│  │ • BTC/USDT LONG  | 10x | Margin: $50 | P&L: +$125     │   │
│  │ • ETH/USDT SHORT | 5x  | Margin: $30 | P&L: -$15      │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Options Trading Subtab (Green)

```
┌─────────────────────────────────────────────────────────────────┐
│  Overview  Forex Trading  Crypto Futures [Options]             │
│                                             ^^^^^^^^^           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ NEW OPTIONS POSITION                                   │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │ Underlying Asset:     [AAPL ▼]                         │   │
│  │                                                         │   │
│  │ Option Type:         ⚫ Call  ⚪ Put                    │   │
│  │                                                         │   │
│  │ Underlying Price:     [$185.50]                        │   │
│  │                                                         │   │
│  │ Strike Price:         [$190.00]                        │   │
│  │                                                         │   │
│  │ Premium:              [$2.50] per share                │   │
│  │                                                         │   │
│  │ Contracts:            [5] (500 shares)                 │   │
│  │                                                         │   │
│  │ Expiration Date:      [2025-11-15]                     │   │
│  │                                                         │   │
│  │ Implied Volatility:   [25%]                            │   │
│  │                                                         │   │
│  │         [Calculate Position]                           │   │
│  │                                                         │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ 📊 POSITION DETAILS                                    │   │
│  │                                                         │   │
│  │ Total Cost:           $1,250.00                        │   │
│  │ Break-even Price:     $192.50                          │   │
│  │ Max Profit:           Unlimited ♾️                     │   │
│  │ Max Loss:             $1,250.00 (100%)                 │   │
│  │ Current P&L:          -$1,250.00 (Out of Money)        │   │
│  │ Days to Expiration:   26 days                          │   │
│  │                                                         │   │
│  │            [Add Position to Portfolio]                 │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 📈 ACTIVE OPTIONS POSITIONS                            │   │
│  │                                                         │   │
│  │ • AAPL $190C 11/15 | 5 contracts | P&L: -$250         │   │
│  │ • TSLA $220P 11/22 | 3 contracts | P&L: +$180         │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Color Coding

### Subtab Colors
- **Overview**: 🔵 Cyan (#06b6d4)
- **Forex Trading**: 🔵 Blue (#3B82F6)
- **Crypto Futures**: 🟣 Purple (#9333EA)
- **Options**: 🟢 Green (#10B981)

### Status Colors
- **Profit**: 🟢 Green
- **Loss**: 🔴 Red
- **Long Position**: 🟢 Green badge
- **Short Position**: 🔴 Red badge
- **Warning**: 🟡 Yellow/Orange

## Mobile View

```
┌─────────────────────────┐
│ TRADING ACCOUNT         │
├─────────────────────────┤
│                         │
│ [Positions] [Analytics] │
│ [Performance] [Signals] │
│                         │
├─────────────────────────┤
│                         │
│ Account Balance         │
│ ┌───────────────────┐   │
│ │ $ 10,000          │   │
│ └───────────────────┘   │
│                         │
│ ← [Overview] →          │
│   Forex Trading         │
│   Crypto Futures        │
│   Options               │
│                         │
├─────────────────────────┤
│                         │
│ [Portfolio Stats]       │
│                         │
│ Value: $25,000          │
│ P&L: +$1,250            │
│ Positions: 4            │
│                         │
├─────────────────────────┤
│                         │
│ [Position 1]            │
│ AAPL LONG               │
│ +$262.50 (+1.42%)       │
│                         │
│ [Position 2]            │
│ BTC LONG                │
│ +$350.00 (+0.81%)       │
│                         │
└─────────────────────────┘
```

## Key Features Visualization

### Account Balance Integration
```
┌─────────────────────────────────────┐
│  Account Balance: $10,000           │
│         ↓↓↓↓↓↓↓                     │
│  [Shared across all calculators]    │
│         ↓↓↓↓↓↓↓                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │Forex│ │Crypto│ │Option│ │Over-│  │
│  │Tab  │ │Tab  │ │Tab  │ │view │  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
│    ↓        ↓        ↓        ↓     │
│  Uses    Uses    Uses    Shows     │
│  for     for     for     total     │
│  risk    margin  premium portfolio │
│  calc    calc    calc    value     │
└─────────────────────────────────────┘
```

### Risk Management Flow
```
User Input → Calculator → Risk Assessment → Position Size
     ↓                                            ↓
Set Risk %                               Review Metrics
     ↓                                            ↓
  1-5% of                                  R:R Ratio
  Account                                  Margin Req
     ↓                                      P&L Est
     ↓                                            ↓
     └────────────→ [Add Position] ←──────────────┘
```

## Quick Reference Card

```
╔═══════════════════════════════════════════════════════════╗
║           TRADING ACCOUNT SUBTABS QUICK GUIDE             ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  📍 Location: Trading Account Card → Positions Tab       ║
║                                                           ║
║  🎯 Purpose: Calculate and manage trading positions      ║
║                                                           ║
║  🔢 Features:                                             ║
║     • Account balance input (affects all calculators)    ║
║     • 4 subtabs: Overview, Forex, Crypto, Options        ║
║     • Real-time calculations                             ║
║     • Risk/Reward analysis                               ║
║     • Position tracking                                  ║
║                                                           ║
║  💡 Tips:                                                 ║
║     1. Set account balance first                         ║
║     2. Choose appropriate subtab                         ║
║     3. Fill in position details                          ║
║     4. Click "Calculate" before adding                   ║
║     5. Review R:R ratio and margin                       ║
║                                                           ║
║  ⚠️  Warnings:                                            ║
║     • High leverage increases risk                       ║
║     • Always use stop losses                             ║
║     • Watch liquidation prices                           ║
║     • Review margin requirements                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## Keyboard Shortcuts (Future Enhancement)

```
Tab Navigation:
  1 - Overview subtab
  2 - Forex Trading subtab
  3 - Crypto Futures subtab
  4 - Options subtab

Actions:
  Ctrl + N - New position
  Ctrl + S - Save position
  Ctrl + E - Edit position
  Del - Delete position
  Ctrl + C - Calculate position
  Esc - Close modal
```

---

**This visual guide** helps users understand the interface layout and navigation flow for the trading subtabs feature.
