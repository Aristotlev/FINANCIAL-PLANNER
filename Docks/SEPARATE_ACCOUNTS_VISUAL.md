# Separate Trading Accounts - Visual Guide

## Overview Layout

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                     TRADING ACCOUNT CARD - POSITIONS TAB                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  THREE SEPARATE ACCOUNT BALANCES (Always Visible)                        ║
║                                                                           ║
║  ┌─────────────────────┐ ┌─────────────────────┐ ┌────────────────────┐ ║
║  │ 💵 FOREX ACCOUNT    │ │ 🪙 CRYPTO ACCOUNT   │ │ 📈 OPTIONS ACCOUNT │ ║
║  │ ─────────────────── │ │ ─────────────────── │ │ ──────────────────│ ║
║  │  Blue Gradient      │ │  Purple Gradient    │ │  Green Gradient   │ ║
║  │                     │ │                     │ │                   │ ║
║  │  $ [10,000] 💵      │ │  $ [10,000] 🪙      │ │  $ [10,000] 📈    │ ║
║  │                     │ │                     │ │                   │ ║
║  │  For forex trading  │ │  For crypto futures │ │  For options      │ ║
║  └─────────────────────┘ └─────────────────────┘ └────────────────────┘ ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  SUBTAB NAVIGATION                                                        ║
║  [Overview] [Forex Trading] [Crypto Futures] [Options]                   ║
║   ^^^^^^^^                                                                ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## Overview Tab - Account Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Overview] Forex Trading  Crypto Futures  Options                      │
│  ^^^^^^^^                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ACCOUNT SUMMARIES                                                      │
│                                                                         │
│  ┌────────────────────────┐ ┌────────────────────────┐ ┌─────────────┐│
│  │ 💵 Forex      [ACTIVE] │ │ 🪙 Crypto     [ACTIVE] │ │📈 Options   ││
│  │ ────────────────────── │ │ ────────────────────── │ │──────────   ││
│  │  Blue Gradient         │ │  Purple Gradient       │ │ Green Grad  ││
│  │                        │ │                        │ │             ││
│  │  Balance:              │ │  Balance:              │ │  Balance:   ││
│  │  $10,000               │ │  $10,000               │ │  $10,000    ││
│  │                        │ │                        │ │             ││
│  │  Positions: 0          │ │  Positions: 0          │ │  Positions: ││
│  │  P&L: $0.00 ✅         │ │  P&L: $0.00 ✅         │ │  P&L: $0.00 ││
│  └────────────────────────┘ └────────────────────────┘ └─────────────┘│
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  TOTAL PORTFOLIO SUMMARY                                                │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ Portfolio    │ │ Total P&L    │ │ Active       │ │ Long/Short   │ │
│  │ Value        │ │              │ │ Positions    │ │              │ │
│  │              │ │              │ │              │ │              │ │
│  │ $25,000      │ │ +$1,250      │ │ 4            │ │ 3 / 1        │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ALL POSITIONS LIST                                                     │
│                                                                         │
│  🔵 AAPL    LONG  150 shares @ $185.50    P&L: +$262.50                │
│  🟡 BTC/USD LONG  0.5 BTC @ $43,500       P&L: +$350.00                │
│  🟢 TSLA    CALL  5 contracts @ $220      P&L: -$125.00                │
│  🔵 EUR/USD LONG  1.0 lot @ 1.0850        P&L: +$45.00                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Forex Trading Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Overview [Forex Trading] Crypto Futures  Options                      │
│            ^^^^^^^^^^^^^^                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FOREX ACCOUNT BALANCE (from top): $10,000 💵                          │
│                        ↓↓↓↓↓↓↓                                          │
│              Used in all calculations below                             │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ NEW FOREX POSITION CALCULATOR                                      ││
│  │                                                                    ││
│  │ Currency Pair: [EUR/USD ▼]                                         ││
│  │ Entry Price: [1.0850]                                              ││
│  │ Stop Loss: [20] pips                                               ││
│  │ Risk %: [1.0%] of $10,000 = $100 max risk                          ││
│  │ Leverage: [30x] ━━━━●━━━━━                                        ││
│  │                                                                    ││
│  │           [Calculate Position]                                     ││
│  │                                                                    ││
│  │ Position Size: $1,085                                              ││
│  │ Margin Required: $36.17 (from $10,000)                             ││
│  │ Potential Loss: $20 (1% of account)                                ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Crypto Futures Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Overview  Forex Trading [Crypto Futures] Options                      │
│                          ^^^^^^^^^^^^^^^^                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CRYPTO ACCOUNT BALANCE (from top): $10,000 🪙                         │
│                        ↓↓↓↓↓↓↓                                          │
│              Used in all calculations below                             │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ NEW CRYPTO FUTURES POSITION                                        ││
│  │                                                                    ││
│  │ Trading Pair: [BTC/USDT ▼]                                         ││
│  │ Entry Price: [43,500]                                              ││
│  │ Stop Loss: [42,900]                                                ││
│  │ Risk %: [2.0%] of $10,000 = $200 max risk                          ││
│  │ Leverage: [10x] ━━●━━━━━━                                         ││
│  │ Margin Type: ⚪ Isolated ⚫ Cross                                   ││
│  │                                                                    ││
│  │           [Calculate Position]                                     ││
│  │                                                                    ││
│  │ Position Size: $333.33 USDT                                        ││
│  │ Margin Required: $33.33 (from $10,000)                             ││
│  │ Liquidation: $38,925                                               ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Options Trading Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Overview  Forex Trading  Crypto Futures [Options]                     │
│                                          ^^^^^^^^^                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OPTIONS ACCOUNT BALANCE (from top): $10,000 📈                        │
│                        ↓↓↓↓↓↓↓                                          │
│              Used in all calculations below                             │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ NEW OPTIONS POSITION                                               ││
│  │                                                                    ││
│  │ Underlying: [AAPL ▼]                                               ││
│  │ Option Type: ⚫ Call ⚪ Put                                         ││
│  │ Strike: [$190.00]                                                  ││
│  │ Premium: [$2.50] per share                                         ││
│  │ Contracts: [5] (500 shares)                                        ││
│  │                                                                    ││
│  │           [Calculate Position]                                     ││
│  │                                                                    ││
│  │ Total Cost: $1,250 (from $10,000 account)                          ││
│  │ Break-even: $192.50                                                ││
│  │ Max Loss: $1,250 (12.5% of account)                                ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Color Coding Reference

```
╔═══════════════════════════════════════════════════════════════════════╗
║                        ACCOUNT COLOR GUIDE                            ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  🔵 FOREX ACCOUNT                                                     ║
║  ├─ Primary: Blue (#3B82F6)                                           ║
║  ├─ Gradient: Blue → Indigo                                           ║
║  ├─ Border: Blue                                                      ║
║  ├─ Icon: 💵 Dollar Sign                                             ║
║  └─ Use: Currency pairs (EUR/USD, GBP/USD, etc.)                     ║
║                                                                       ║
║  🟣 CRYPTO ACCOUNT                                                    ║
║  ├─ Primary: Purple (#9333EA)                                         ║
║  ├─ Gradient: Purple → Pink                                           ║
║  ├─ Border: Purple                                                    ║
║  ├─ Icon: 🪙 Coins                                                   ║
║  └─ Use: Crypto futures (BTC/USDT, ETH/USDT, etc.)                  ║
║                                                                       ║
║  🟢 OPTIONS ACCOUNT                                                   ║
║  ├─ Primary: Green (#10B981)                                          ║
║  ├─ Gradient: Green → Emerald                                         ║
║  ├─ Border: Green                                                     ║
║  ├─ Icon: 📈 Trending Up                                             ║
║  └─ Use: Stock options (AAPL, TSLA, SPY, etc.)                       ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INPUT                                  │
└──────────────┬──────────────┬──────────────┬────────────────────────┘
               │              │              │
               ▼              ▼              ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   Forex     │  │   Crypto    │  │  Options    │
     │  Balance    │  │  Balance    │  │  Balance    │
     │  $10,000    │  │  $10,000    │  │  $10,000    │
     └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
            │                │                │
            │    ┌───────────┴───────────┐    │
            └────▶   OVERVIEW SUMMARY    ◀────┘
                 │   Shows all three     │
                 │   + Total Portfolio   │
                 └───────────────────────┘
            │                │                │
            ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   Forex     │  │   Crypto    │  │  Options    │
     │ Calculator  │  │ Calculator  │  │ Calculator  │
     │             │  │             │  │             │
     │ Uses forex  │  │ Uses crypto │  │Uses options │
     │  balance    │  │  balance    │  │  balance    │
     └─────────────┘  └─────────────┘  └─────────────┘
            │                │                │
            ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   Forex     │  │   Crypto    │  │  Options    │
     │ Positions   │  │ Positions   │  │ Positions   │
     └─────────────┘  └─────────────┘  └─────────────┘
            │                │                │
            └────────────────┴────────────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │   All Positions   │
                 │   (Combined View) │
                 └───────────────────┘
```

## Mobile View

```
┌─────────────────────────┐
│ TRADING ACCOUNT         │
├─────────────────────────┤
│                         │
│ 💵 FOREX ACCOUNT        │
│ ┌───────────────────┐   │
│ │ $ 10,000          │   │
│ └───────────────────┘   │
│ For forex trading       │
│                         │
├─────────────────────────┤
│                         │
│ 🪙 CRYPTO ACCOUNT       │
│ ┌───────────────────┐   │
│ │ $ 10,000          │   │
│ └───────────────────┘   │
│ For crypto futures      │
│                         │
├─────────────────────────┤
│                         │
│ 📈 OPTIONS ACCOUNT      │
│ ┌───────────────────┐   │
│ │ $ 10,000          │   │
│ └───────────────────┘   │
│ For options trading     │
│                         │
├─────────────────────────┤
│                         │
│ ← [Overview] →          │
│   Forex Trading         │
│   Crypto Futures        │
│   Options               │
│                         │
├─────────────────────────┤
│                         │
│ 💵 Forex Summary        │
│ Balance: $10,000        │
│ Positions: 0            │
│ P&L: $0.00              │
│                         │
│ 🪙 Crypto Summary       │
│ Balance: $10,000        │
│ Positions: 0            │
│ P&L: $0.00              │
│                         │
│ 📈 Options Summary      │
│ Balance: $10,000        │
│ Positions: 0            │
│ P&L: $0.00              │
│                         │
└─────────────────────────┘
```

## Quick Reference Table

```
╔═══════════════╦═══════════════╦═══════════════╦═══════════════╗
║   Feature     ║  Forex 💵     ║  Crypto 🪙    ║  Options 📈   ║
╠═══════════════╬═══════════════╬═══════════════╬═══════════════╣
║ Account Color ║ Blue          ║ Purple        ║ Green         ║
╠═══════════════╬═══════════════╬═══════════════╬═══════════════╣
║ Default Bal   ║ $10,000       ║ $10,000       ║ $10,000       ║
╠═══════════════╬═══════════════╬═══════════════╬═══════════════╣
║ Used For      ║ Forex pairs   ║ Crypto futures║ Stock options ║
╠═══════════════╬═══════════════╬═══════════════╬═══════════════╣
║ Leverage      ║ 1x - 500x     ║ 1x - 125x     ║ N/A           ║
╠═══════════════╬═══════════════╬═══════════════╬═══════════════╣
║ Risk Calc     ║ Pip-based     ║ Price %       ║ Premium cost  ║
╠═══════════════╬═══════════════╬═══════════════╬═══════════════╣
║ Position Size ║ Lot size      ║ Contracts     ║ # Contracts   ║
╠═══════════════╬═══════════════╬═══════════════╬═══════════════╣
║ Margin Type   ║ Standard      ║ Iso/Cross     ║ Premium only  ║
╠═══════════════╬═══════════════╬═══════════════╬═══════════════╣
║ Stop Loss     ║ Pips          ║ Price         ║ Auto (strike) ║
╠═══════════════╬═══════════════╬═══════════════╬═══════════════╣
║ Take Profit   ║ Pips          ║ Price         ║ Target price  ║
╠═══════════════╬═══════════════╬═══════════════╬═══════════════╣
║ Summary Card  ║ Blue gradient ║ Purple grad   ║ Green grad    ║
╚═══════════════╩═══════════════╩═══════════════╩═══════════════╝
```

## Example Scenario

```
👤 Trader: John
💰 Total Capital: $30,000
🎯 Strategy: Multi-asset portfolio

ALLOCATION:
┌─────────────────────────────────────────────────────┐
│ 💵 Forex Account:    $15,000 (50% - Conservative)  │
│ 🪙 Crypto Account:   $10,000 (33% - Moderate)      │
│ 📈 Options Account:  $5,000  (17% - Aggressive)    │
│ ───────────────────────────────────────────────────│
│ 📊 Total Portfolio:  $30,000 (100%)                │
└─────────────────────────────────────────────────────┘

AFTER 1 MONTH:
┌─────────────────────────────────────────────────────┐
│ 💵 Forex:    $15,750 (+$750 / +5.0%) ✅            │
│ 🪙 Crypto:   $11,200 (+$1,200 / +12.0%) ✅         │
│ 📈 Options:  $4,200  (-$800 / -16.0%) ❌           │
│ ───────────────────────────────────────────────────│
│ 📊 Total:    $31,150 (+$1,150 / +3.8%) ✅          │
└─────────────────────────────────────────────────────┘

INSIGHTS:
✓ Forex stability provided cushion
✓ Crypto gains offset options losses
✓ Overall portfolio positive
✓ Risk management working
```

---

This visual guide shows the complete layout and functionality of the separate trading account balances feature!
