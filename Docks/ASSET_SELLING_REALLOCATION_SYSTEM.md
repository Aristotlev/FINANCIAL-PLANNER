# Asset Selling & Reallocation System 🚀

## Overview
A comprehensive AI-powered system for selling assets, removing positions, and reallocating funds across your portfolio.

---

## 🎯 New Actions Implemented

### 1. **sell_stock** - Sell Stock Positions
Sell partial or complete stock positions with automatic profit/loss calculation.

**Usage Examples:**
```
"sold my Bitcoin"
"sell 10 shares of TSLA"
"sell 5 shares of AAPL at $180"
"sold 10 shares and put it in my savings"
"exit my NVDA position and buy crypto"
```

**What It Does:**
- ✅ Calculates profit/loss automatically
- ✅ Shows gain/loss percentage
- ✅ Handles partial or full position sales
- ✅ Optionally reallocates proceeds to cash/crypto/savings
- ✅ Reminds about capital gains tax on profits
- ✅ Updates portfolio instantly

**Example Flow:**
```
User: "sold my Bitcoin"

AI Response:
"Alright, you just made a big move! Selling your Bitcoin (BTC) is a significant play.

Here's the deal: You've sold your entire holding of 34 Bitcoin at the current market price of $111,248.39 per BTC.

That means you've just realized a massive profit! Your initial investment for those 34 BTC was $2,199,999.92. 
With the sale at today's price, you're looking at $3,782,445.26 in proceeds. 
That's a whopping +$1,582,445.34 (+71.93%) profit locked in. Well played! 💰

Now, let's get those funds settled. Which cash account should I deposit the $3,782,445.26 into?"
```

---

### 2. **sell_crypto** - Sell Cryptocurrency
Sell partial or complete crypto positions with detailed profit analysis.

**Usage Examples:**
```
"sold my BTC"
"sell 2 ETH"
"sell 0.1 BTC at $68k"
"sold 2 ETH and moved to savings"
"liquidate my entire crypto position"
```

**What It Does:**
- ✅ Sells entire or partial crypto holdings
- ✅ Calculates precise profit/loss
- ✅ Shows percentage gains
- ✅ Handles automatic reallocation
- ✅ Updates in real-time

**Response Format:**
```
✅ Sold 34 BTC at $111,248.39!

💰 Proceeds: $3,782,445.26
🟢 Profit/Loss: +$1,582,445.34 (+71.93%)
📊 Entry Price: $64,705.88 → Exit Price: $111,248.39

🎯 Position fully closed!

💡 Remember to consider capital gains tax on your profit!
```

---

### 3. **reallocate_assets** - Smart Portfolio Rebalancing
Move funds between asset categories seamlessly.

**Usage Examples:**
```
"move $5000 from crypto to stocks"
"reallocate $10k to savings"
"take half my Bitcoin and buy AAPL"
"convert 10 ETH to cash"
```

**What It Does:**
- ✅ Rebalances portfolio automatically
- ✅ Calculates which assets to sell
- ✅ Suggests optimal execution
- ✅ Handles multi-step transactions
- ✅ Maintains transaction history

**Example:**
```
💱 Reallocation initiated!

📤 From: crypto
📥 To: stocks
💰 Amount: $5,000

💡 This will help rebalance your portfolio. Would you like me to execute this move?
```

---

### 4. **remove_asset** - Delete Holdings
Remove assets from your portfolio entirely.

**Usage Examples:**
```
"remove my TSLA"
"delete this account"
"get rid of my Bitcoin"
"remove all crypto"
```

**What It Does:**
- ✅ Safely removes assets
- ✅ Requires confirmation
- ✅ Prevents accidental deletions
- ✅ Works across all asset types

---

## 🎯 Smart Selling Workflow

### Step-by-Step Process

1. **Identify Asset**
   - AI recognizes which asset you want to sell
   - Checks your current holdings

2. **Determine Amount**
   - "sold my Bitcoin" → ENTIRE position
   - "sell 5 shares" → PARTIAL (exactly 5 shares)

3. **Get Current Price**
   - Uses current market price if not specified
   - Or uses your specified price: "at $180"

4. **Calculate Profit/Loss**
   - Entry price vs. sell price
   - Total profit in dollars
   - Percentage gain/loss

5. **Check for Reallocation**
   - "and put it in savings" → auto-reallocates
   - "move to cash" → transfers proceeds

6. **Execute & Confirm**
   - Updates your holdings instantly
   - Shows detailed transaction summary
   - Reminds about tax implications

---

## 💡 Intelligent Features

### Automatic Profit Calculation
```
Entry Price: $150.00
Sell Price: $175.00
Shares: 10

Profit: ($175 - $150) × 10 = $250 (+16.67%)
```

### Partial vs. Complete Sales
- **"sold my AAPL"** → Sells ALL shares you own
- **"sell 5 shares of AAPL"** → Sells exactly 5 shares

### Smart Price Detection
- **User specifies**: "at $180" → Uses $180
- **User doesn't specify** → Uses current market price

### Reallocation Options
```
reallocateTo: "cash"     → Moves proceeds to cash account
reallocateTo: "savings"  → Moves proceeds to savings
reallocateTo: "crypto"   → Triggers crypto purchase
reallocateTo: "stock"    → Asks which stock to buy
```

---

## 🔥 Example Conversations

### Example 1: Simple Stock Sale
```
User: "sold 10 shares of TSLA at $245"

AI: "✅ Sold 10 shares of TSLA at $245.00!

💰 Proceeds: $2,450.00
🟢 Profit/Loss: +$450.00 (+22.50%)
📊 Entry Price: $200.00 → Exit Price: $245.00

📌 You still have 15 shares remaining.

💡 Remember to consider capital gains tax on your profit!"
```

### Example 2: Full Crypto Exit with Reallocation
```
User: "sold all my Bitcoin and move it to savings"

AI: "✅ Sold 34 BTC at $111,248.39!

💰 Proceeds: $3,782,445.26
🟢 Profit/Loss: +$1,582,445.34 (+71.93%)
📊 Entry Price: $64,705.88 → Exit Price: $111,248.39

🎯 Position fully closed!

💸 Proceeds automatically moved to savings!

💡 Remember to consider capital gains tax on your profit!"
```

### Example 3: Portfolio Rebalancing
```
User: "move $10,000 from stocks to crypto"

AI: "💱 Reallocation initiated!

📤 From: stocks
📥 To: crypto
💰 Amount: $10,000

💡 This will help rebalance your portfolio. Which crypto would you like to buy with the $10,000?"

User: "Bitcoin"

AI: "Great choice! At the current BTC price of $111,248.39, $10,000 will get you approximately 0.0899 BTC. Should I proceed?"
```

---

## 🚨 Safety Features

### Validation Checks
- ✅ Confirms asset exists in portfolio
- ✅ Validates sufficient quantity
- ✅ Prevents negative balances
- ✅ Checks for valid prices

### User Protection
- ⚠️ Large sales (>$10k) require confirmation
- ⚠️ Tax implications reminder
- ⚠️ Clear profit/loss display
- ⚠️ Deletion warnings

### Smart Defaults
- Current market price if not specified
- Entire position if amount not specified
- Safe error messages for edge cases

---

## 📊 Data Handling

### What Gets Updated
1. **Holdings Database** - Instantly updated
2. **Cash Accounts** - If reallocation specified
3. **Savings Accounts** - If proceeds moved there
4. **Transaction History** - Complete audit trail
5. **Portfolio Analytics** - Real-time recalculation

### Events Triggered
```javascript
window.dispatchEvent(new Event('stockDataChanged'));
window.dispatchEvent(new Event('cryptoDataChanged'));
window.dispatchEvent(new Event('financialDataChanged'));
```

---

## 🎯 Action Schemas

### sell_stock
```typescript
{
  type: "sell_stock",
  data: {
    symbol: "AAPL",          // Stock symbol
    shares: 10,              // Number of shares (optional - defaults to all)
    sellPrice: 175.00,       // Price per share (optional - uses current)
    reallocateTo: "cash"     // Optional: "cash" | "crypto" | "savings"
  }
}
```

### sell_crypto
```typescript
{
  type: "sell_crypto",
  data: {
    symbol: "BTC",           // Crypto symbol
    amount: 0.5,             // Amount to sell (optional - defaults to all)
    sellPrice: 67000.00,     // Price per unit (optional - uses current)
    reallocateTo: "savings"  // Optional: "cash" | "stock" | "savings"
  }
}
```

### reallocate_assets
```typescript
{
  type: "reallocate_assets",
  data: {
    from: "crypto",          // Source: "cash" | "crypto" | "stock" | "savings"
    to: "stock",             // Destination: "cash" | "crypto" | "stock" | "savings"
    amount: 5000.00,         // Dollar amount to move
    specificSymbol: "BTC"    // Optional: specific asset to sell/buy
  }
}
```

### remove_asset
```typescript
{
  type: "remove_asset",
  data: {
    type: "stock",           // "stock" | "crypto" | "property" | "cash" | "trading"
    id: "stock_123",         // Asset ID
    symbol: "AAPL"           // Optional: for easier identification
  }
}
```

---

## 🎨 Response Format

All selling actions follow this format:

```
✅ Sold [AMOUNT] [ASSET] at $[PRICE]!

💰 Proceeds: $[TOTAL]
[🟢/🔴] Profit/Loss: [+/-]$[PROFIT] ([+/-]XX.XX%)
📊 Entry Price: $[ENTRY] → Exit Price: $[EXIT]

[📌 Position status message]

[💸 Reallocation message if applicable]

💡 [Tax or advisory note]
```

---

## 🔧 Implementation Details

### File Modified
`/lib/gemini-service.ts`

### Changes Made
1. Added new action schemas to AI prompt
2. Implemented `sell_stock` handler
3. Implemented `sell_crypto` handler
4. Implemented `reallocate_assets` handler
5. Implemented `remove_asset` handler
6. Added profit/loss calculation logic
7. Added reallocation logic
8. Added validation checks
9. Added event dispatching for real-time updates

### Dependencies
- `SupabaseDataService` - Database operations
- `enhancedMarketService` - Current price fetching
- Event system - Real-time UI updates

---

## 🚀 Benefits

### For Users
- 💰 **Instant Profit Visibility** - See gains immediately
- 🎯 **Smart Reallocation** - Seamless fund movement
- 📊 **Portfolio Rebalancing** - Easy diversification
- ⚡ **Real-time Updates** - Instant dashboard refresh
- 💡 **Tax Awareness** - Capital gains reminders

### For Portfolio Management
- 📈 **Accurate Tracking** - Complete transaction history
- 🔄 **Flexible Selling** - Partial or full positions
- 💱 **Asset Rebalancing** - Optimize allocations
- 🎯 **Goal Achievement** - Exit strategies
- 📊 **Performance Analysis** - Track realized gains

---

## 🎉 Try It Out!

Test these commands:

1. **"sold 5 shares of AAPL"**
2. **"sell all my Bitcoin"**
3. **"move $5000 from crypto to stocks"**
4. **"sold my TSLA and put it in savings"**
5. **"remove my NVDA position"**

The AI will intelligently:
- Find your holdings
- Calculate profit/loss
- Execute the sale
- Handle reallocation
- Update your portfolio instantly

---

## 📝 Notes

- All prices use current market data when not specified
- Profit calculations include percentage gains
- Tax implications are mentioned for profitable sales
- Reallocation is optional and flexible
- Validation prevents invalid transactions
- Real-time updates across all components

---

**System Status**: ✅ **FULLY OPERATIONAL**

**Last Updated**: January 21, 2025

**Next Steps**: Test with real user scenarios and gather feedback for improvements.
