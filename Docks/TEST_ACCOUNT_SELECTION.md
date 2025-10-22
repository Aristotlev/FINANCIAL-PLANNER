# 🧪 Testing Guide: Account Selection on Sales

## Quick Test Commands

### Test 1: Bitcoin Sale (No Account Specified)
**Command**:
```
sold my Bitcoin
```

**Expected Response**:
```
✅ Sold 34 BTC at $110,882.84!

💰 Proceeds: $3,770,016.70
🟢 Profit/Loss: +$1,570,016.70 (+71.36%)
📊 Entry Price: $64,705.88 → Exit Price: $110,882.84

🎯 Position fully closed!

💡 Remember to consider capital gains tax on your profit!

💸 Which account should I transfer the proceeds to?

• Revolut Cash Card (Cash) - Current: $X,XXX
• Bank of America (Cash) - Current: $X,XXX
• BKS Bank (Savings) - Current: $X,XXX
• Revolut (Savings) - Current: $X,XXX
```

**Follow-up Response**:
```
Revolut Cash Card
```
or
```
Bank of America
```

---

### Test 2: Stock Sale with Specific Account
**Command**:
```
sold 10 shares of AAPL and transfer to Bank of America
```

**Expected Response**:
```
✅ Sold 10 shares of AAPL at $XXX.XX!

💰 Proceeds: $X,XXX.XX
🟢 Profit/Loss: +$XXX.XX (+XX.XX%)
📊 Entry Price: $XXX.XX → Exit Price: $XXX.XX

📌 You still have X shares remaining.

💸 Proceeds transferred to your cash account!

💡 Remember to consider capital gains tax on your profit!
```

---

### Test 3: Crypto Sale with Category
**Command**:
```
sold 2 ETH and move to savings
```

**Expected Response**:
```
✅ Sold 2 ETH at $X,XXX.XX!

💰 Proceeds: $X,XXX.XX
🟢 Profit/Loss: +$XXX.XX (+XX.XX%)
📊 Entry Price: $X,XXX.XX → Exit Price: $X,XXX.XX

💡 Remember to consider capital gains tax on your profit!

💸 Which account should I transfer the proceeds to?

• BKS Bank (Savings) - Current: $XX,XXX
• Revolut (Savings) - Current: $XX,XXX
```

---

### Test 4: Complete Position Exit
**Command**:
```
liquidate all my crypto
```

**Expected Response**:
- Shows sale details for each crypto holding
- Calculates total proceeds
- Asks which account for total proceeds

---

## Verification Checklist

### ✅ After Sale (Before Account Selection)
- [ ] Position removed from portfolio or reduced
- [ ] Profit/loss calculated correctly
- [ ] All available accounts listed
- [ ] Account balances shown correctly
- [ ] No proceeds automatically transferred yet

### ✅ After Account Selection
- [ ] Proceeds added to correct account
- [ ] Account balance updated in UI
- [ ] Confirmation message shows new balance
- [ ] Portfolio updates reflect sale
- [ ] No duplicate transfers

---

## Error Cases to Test

### Test 5: Invalid Account Name
**Command**:
```
sold my Bitcoin
```
**Follow-up**:
```
NonExistentBank
```

**Expected**:
AI should either:
- Ask to clarify which account
- Show list of accounts again
- Gracefully handle unknown account

---

### Test 6: Sale Without Holdings
**Command**:
```
sold my Dogecoin
```

**Expected**:
```
❌ You don't have any DOGE to sell.
```

---

## UI Verification

After sale and account selection:

1. **Dashboard**:
   - Cash/Savings card shows updated balance
   - Portfolio total reflects sale
   - Profit/loss updates

2. **Holdings Cards**:
   - Crypto/Stock card updates immediately
   - Position removed or reduced
   - No phantom holdings

3. **Account Cards**:
   - Selected account shows increased balance
   - Other accounts unchanged
   - Transaction reflects in history (if implemented)

---

## Performance Checks

- **Response Time**: < 2 seconds from sale to response
- **UI Update**: < 500ms after account selection
- **Database**: Single transaction, no race conditions
- **Events**: Correct events fired (`financialDataChanged`, etc.)

---

## Edge Cases

### Test 7: Multiple Rapid Sales
```
sold my Bitcoin
[select account]
sold 10 shares of AAPL
[select different account]
```
**Expected**: Each sale transfers to correct account

---

### Test 8: Very Large Amount
```
sold my entire Bitcoin position
```
With 34 BTC @ $110k = $3.7M

**Expected**: Handles large numbers correctly, proper formatting

---

### Test 9: Fractional Crypto
```
sell 0.001 BTC
```
**Expected**: Handles decimals correctly

---

## Browser Console Checks

Look for:
- ✅ `🔍 Selling crypto:` log with correct data
- ✅ `🔍 Transferring proceeds:` log with accountId
- ✅ No error messages
- ✅ Events dispatched: `cryptoDataChanged`, `financialDataChanged`

---

## Development Server

**URL**: http://localhost:3001

**Hot Reload**: Changes to `gemini-service.ts` should auto-reload

---

## Debugging Tips

1. **Check Console**: Look for action logs
2. **Verify Data**: Use React DevTools to check state
3. **Database**: Query Supabase to verify balances
4. **Network**: Check API calls in Network tab

---

## Success Criteria

✅ User can sell assets without specifying account
✅ System asks which account to transfer to
✅ Shows all available accounts with current balances
✅ User can select account in natural language
✅ Proceeds transferred to correct account
✅ UI updates immediately
✅ Confirmation message shows new balance
✅ No automatic transfers to first account

---

## Quick Commands for Testing

```bash
# Start dev server
npm run dev

# Check for TypeScript errors
npm run build

# View logs
# Open browser console at http://localhost:3001/jarvis
```

---

## Known Behaviors

1. **Account Matching**: AI should match account names flexibly:
   - "Revolut" → "Revolut Cash Card"
   - "Bank of America" → "Bank of America account"
   - "BKS" → "BKS Bank account"

2. **Category vs Specific**: 
   - "move to savings" → shows all savings accounts
   - "transfer to BKS Bank" → directly transfers if match found

3. **Case Insensitive**: Account name matching should be flexible

---

## Report Issues

If you encounter issues, note:
- Command used
- Expected vs actual response
- Console errors
- Account states before/after

---

**Ready to Test!** 🚀

Go to http://localhost:3001/jarvis and try the commands above!
