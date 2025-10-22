# Asset Selling System - Test Guide 🧪

## Quick Test Commands

### Test 1: Simple Stock Sale
```
"sold 5 shares of TSLA at $200"
```
**Expected**: Shows profit/loss, updates position to remaining shares

---

### Test 2: Complete Crypto Exit
```
"sold all my Bitcoin"
```
**Expected**: 
- Calculates total proceeds
- Shows massive profit (+71.93% in your case)
- Asks where to deposit funds
- Removes BTC from portfolio

---

### Test 3: Sale with Reallocation
```
"sold 10 shares of AAPL and move it to savings"
```
**Expected**: 
- Sells the shares
- Calculates profit
- Auto-adds proceeds to savings account

---

### Test 4: Portfolio Rebalancing
```
"move $5000 from crypto to stocks"
```
**Expected**: 
- Identifies crypto to sell
- Confirms reallocation intent
- Asks which stock to buy

---

### Test 5: Quick Exit Command
```
"exit my NVDA position"
```
**Expected**: 
- Sells entire NVDA holding
- Shows performance summary
- Updates portfolio

---

## What to Check

### ✅ Profit Calculation
- [ ] Shows correct entry price
- [ ] Shows correct sell price
- [ ] Calculates profit accurately
- [ ] Shows percentage gain/loss

### ✅ Position Updates
- [ ] Partial sale: Reduces shares correctly
- [ ] Complete sale: Removes position entirely
- [ ] Dashboard updates immediately
- [ ] All cards reflect new values

### ✅ Reallocation Logic
- [ ] Proceeds go to correct account
- [ ] Cash balance increases
- [ ] Savings balance increases (if applicable)
- [ ] No duplicate entries

### ✅ User Experience
- [ ] Clear, friendly messages
- [ ] Emojis for visual clarity
- [ ] Profit highlighted prominently
- [ ] Tax reminder on gains
- [ ] Confirmation for large sales

---

## Current Scenario (Your Portfolio)

Based on your Bitcoin example:

**Your Holdings:**
- 34 BTC
- Entry: $64,705.88/BTC (Total: $2,199,999.92)
- Current: $111,248.39/BTC (Total: $3,782,445.26)
- Unrealized Profit: +$1,582,445.34 (+71.93%)

**Test Command:**
```
"sold my Bitcoin"
```

**Expected AI Response:**
```
✅ Sold 34 BTC at $111,248.39!

💰 Proceeds: $3,782,445.26
🟢 Profit/Loss: +$1,582,445.34 (+71.93%)
📊 Entry Price: $64,705.88 → Exit Price: $111,248.39

🎯 Position fully closed!

💡 Remember to consider capital gains tax on your profit!

Now, let's get those funds settled. Which cash account should I deposit the $3,782,445.26 into? You have:
• Revolut Cash Card
• Bank of America account
• Revolut
• BKS Bank account
```

---

## Error Scenarios to Test

### 1. Selling Non-Existent Asset
```
"sell 10 shares of XYZ"
```
**Expected**: "❌ You don't have any XYZ to sell."

---

### 2. Selling Too Many Shares
```
"sell 100 shares of TSLA" (when you only have 25)
```
**Expected**: "❌ You only have 25 shares of TSLA, but you're trying to sell 100."

---

### 3. Missing Price (Should Auto-Fetch)
```
"sold 5 shares of AAPL"
```
**Expected**: Uses current market price automatically

---

## Integration Checks

### Database Updates
- [ ] Stock holdings table updated
- [ ] Crypto holdings table updated
- [ ] Cash accounts updated (if reallocation)
- [ ] Transaction history recorded

### Event Dispatching
- [ ] `stockDataChanged` event fired
- [ ] `cryptoDataChanged` event fired
- [ ] `financialDataChanged` event fired
- [ ] Dashboard auto-refreshes

### UI Components
- [ ] Stock card updates immediately
- [ ] Crypto card updates immediately
- [ ] Cash card shows new balance
- [ ] Total portfolio value recalculates

---

## Advanced Test Cases

### Multi-Step Reallocation
```
User: "sold all my Bitcoin"
AI: [calculates profit, asks where to put money]
User: "put half in savings, half in AAPL"
AI: [splits proceeds, executes both transactions]
```

### Partial Sale Series
```
1. "sell 10 shares of TSLA"
2. "sell 5 more shares of TSLA"
3. "sell the rest of my TSLA"
```
**Expected**: Position reduces correctly each time

### Smart Context Tracking
```
User: "what's AAPL trading at?"
AI: "$175.50"
User: "sell 10 shares at that price"
AI: [uses $175.50, recognizes AAPL from context]
```

---

## Performance Metrics

### Response Time
- [ ] <2 seconds for simple sales
- [ ] <3 seconds for market price lookup
- [ ] <1 second for UI updates

### Data Accuracy
- [ ] Profit calculations match manual math
- [ ] Holdings reflect correct amounts
- [ ] No rounding errors
- [ ] Historical entry prices preserved

---

## User Feedback Points

After testing, gather feedback on:

1. **Clarity**: Is the profit/loss display clear?
2. **Speed**: Does it feel instant?
3. **Confirmation**: Should we add "Are you sure?" for large sales?
4. **Details**: Is there too much/too little information?
5. **Reallocation**: Is the flow intuitive?

---

## Known Limitations (Current)

1. ⚠️ No transaction history view yet
2. ⚠️ Tax calculation is just a reminder, not actual tax calc
3. ⚠️ Reallocation to "stock" requires follow-up (which stock?)
4. ⚠️ No undo functionality (yet)

---

## Next Steps After Testing

1. Add transaction history page
2. Implement actual tax estimation
3. Add bulk selling (e.g., "sell all my tech stocks")
4. Create visual charts for profit tracking
5. Add export to CSV for tax filing

---

## 🎯 Quick Start

**Run the dev server:**
```bash
npm run dev
```

**Navigate to:**
```
http://localhost:3000/jarvis
```

**Say or type:**
```
"sold my Bitcoin"
```

**Watch the magic happen!** ✨

---

**Status**: Ready for testing
**Priority**: High
**Impact**: Massive improvement to portfolio management
