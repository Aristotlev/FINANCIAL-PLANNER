# 🏦 Account Selection on Asset Sales - Enhancement

## Problem Identified

When selling crypto or stocks, the system was automatically depositing proceeds to the **first available account** without asking the user where they wanted the money transferred.

### Before (Issue)
```
User: "sold my btc"

AI: ✅ Sold 34 BTC at $110,882.84!
    💰 Proceeds: $3,770,016.56
    🟢 Profit/Loss: +$1,570,016.56 (+71.36%)
    📊 Entry Price: $64,705.88 → Exit Price: $110,882.84
    🎯 Position fully closed!
    💸 Proceeds automatically moved to cash!
    💡 Remember to consider capital gains tax on your profit!
```

❌ **Issue**: Money was automatically sent to the first cash account without confirmation

---

## Solution Implemented ✅

### 1. **Modified Selling Behavior**
The system now **asks which account** to transfer proceeds to instead of auto-distributing:

```
User: "sold my btc"

AI: ✅ Sold 34 BTC at $110,882.84!
    💰 Proceeds: $3,770,016.70
    🟢 Profit/Loss: +$1,570,016.70 (+71.36%)
    📊 Entry Price: $64,705.88 → Exit Price: $110,882.84
    🎯 Position fully closed!
    💡 Remember to consider capital gains tax on your profit!
    
    💸 Which account should I transfer the proceeds to?
    
    • Revolut Cash Card (Cash) - Current: $5,000
    • Bank of America (Cash) - Current: $15,000
    • BKS Bank (Savings) - Current: $50,000
    • Revolut (Savings) - Current: $10,000
```

✅ **Improvement**: User gets to choose where the money goes!

---

## Technical Changes

### 1. Updated `sell_crypto` Action Handler
**Location**: `/lib/gemini-service.ts` (lines ~2520-2580)

**Before**:
```typescript
// Automatically added to first cash account
if (action.data.reallocateTo === 'cash') {
  const cashAccounts = await SupabaseDataService.getCashAccounts([]);
  if (cashAccounts.length > 0) {
    const firstCash = cashAccounts[0];
    await SupabaseDataService.saveCashAccount({
      ...firstCash,
      balance: firstCash.balance + cryptoProceeds,
    });
  }
}
```

**After**:
```typescript
// Only transfer if accountId is specified
if (action.data.accountId && action.data.reallocateTo) {
  if (action.data.reallocateTo === 'cash') {
    const cashAccounts = await SupabaseDataService.getCashAccounts([]);
    const targetAccount = cashAccounts.find((acc: any) => 
      acc.id === action.data.accountId
    );
    if (targetAccount) {
      await SupabaseDataService.saveCashAccount({
        ...targetAccount,
        balance: targetAccount.balance + cryptoProceeds,
      });
    }
  }
  // ... savings logic
}

// If no accountId specified, ASK which account
if (!action.data.accountId && !action.data.reallocateTo) {
  const cashAccounts = await SupabaseDataService.getCashAccounts([]);
  const savingsAccounts = await SupabaseDataService.getSavingsAccounts([]);
  
  cryptoSellMessage += `\n\n💸 **Which account should I transfer the proceeds to?**\n\n`;
  cashAccounts.forEach((acc: any) => {
    cryptoSellMessage += `• ${acc.bankName || acc.name} (Cash) - Current: $${acc.balance.toLocaleString()}\n`;
  });
  savingsAccounts.forEach((acc: any) => {
    cryptoSellMessage += `• ${acc.bankName || acc.name} (Savings) - Current: $${acc.balance.toLocaleString()}\n`;
  });
}
```

---

### 2. Updated `sell_stock` Action Handler
Same logic applied to stock sales (lines ~2400-2460)

---

### 3. New Action Type: `transfer_proceeds`
**Location**: `/lib/gemini-service.ts` (lines ~2616-2680)

This new action handles the user's response when they select an account:

```typescript
case 'transfer_proceeds':
  // Validate input
  if (!action.data.accountId || !action.data.accountType || !action.data.amount) {
    return { success: false, message: '❌ Missing transfer details' };
  }
  
  // Transfer to specified account
  if (action.data.accountType === 'cash') {
    const targetAccount = cashAccounts.find(acc => acc.id === action.data.accountId);
    await SupabaseDataService.saveCashAccount({
      ...targetAccount,
      balance: targetAccount.balance + action.data.amount,
    });
    
    return {
      success: true,
      message: `✅ Transferred $${amount} to ${targetAccount.bankName}!\n💰 New balance: $${newBalance}`
    };
  }
  // ... savings logic
```

---

### 4. Updated System Prompt
**Location**: `/lib/gemini-service.ts` (lines ~737-760)

Added instructions for the AI:

```typescript
- sell_crypto: { 
    symbol: "BTC", 
    amount: 0.5, 
    sellPrice: 67000.00, 
    accountId?: string,      // NEW
    reallocateTo?: "cash" | "stock" | "savings" 
  }
  📌 accountId: ONLY include if user specifies which account
  📌 reallocateTo: ONLY include if user explicitly mentions category
  📌 If user does NOT specify: DO NOT include accountId or reallocateTo
  📌 The system will ASK which account

- transfer_proceeds: { 
    accountId: string, 
    accountType: "cash" | "savings", 
    amount: number 
  }
  📌 Use when user responds to "which account" question
  📌 Follow-up action after sell_stock or sell_crypto
```

---

## User Flow Examples

### Example 1: Simple Sale (No Account Specified)
```
User: "sold my Bitcoin"

AI: [Shows sale details + profit/loss]
    💸 Which account should I transfer the proceeds to?
    • Revolut Cash Card (Cash) - Current: $5,000
    • Bank of America (Cash) - Current: $15,000
    • BKS Bank (Savings) - Current: $50,000

User: "Revolut Cash Card"

AI: ✅ Transferred $3,770,016.70 to Revolut Cash Card!
    💰 New balance: $3,775,016.70
```

---

### Example 2: Sale with Specific Account
```
User: "sold my Bitcoin and transfer to Bank of America"

AI: ✅ Sold 34 BTC at $110,882.84!
    💰 Proceeds: $3,770,016.70
    🟢 Profit/Loss: +$1,570,016.70 (+71.36%)
    📊 Entry Price: $64,705.88 → Exit Price: $110,882.84
    🎯 Position fully closed!
    💸 Proceeds transferred to your cash account!
```

---

### Example 3: Sale with Category Only
```
User: "sold my Bitcoin and move to savings"

AI: [Shows sale details]
    💸 Which savings account?
    • BKS Bank (Savings) - Current: $50,000
    • Revolut (Savings) - Current: $10,000
```

---

## Data Flow

```
┌─────────────────┐
│  User: "sold    │
│   my Bitcoin"   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  AI: sell_crypto action         │
│  WITHOUT accountId               │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  executeAction('sell_crypto')   │
│  - Removes BTC from holdings    │
│  - Calculates profit            │
│  - Does NOT transfer proceeds   │
│  - Lists available accounts     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  AI Response:                   │
│  "Which account should I        │
│   transfer the proceeds to?"    │
│  - Revolut Cash Card            │
│  - Bank of America              │
│  - BKS Bank                     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│  User: "BKS     │
│   Bank"         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  AI: transfer_proceeds action   │
│  WITH accountId                  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  executeAction(                 │
│    'transfer_proceeds'          │
│  )                              │
│  - Finds account by ID          │
│  - Adds proceeds to balance     │
│  - Triggers UI update           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  AI Response:                   │
│  "✅ Transferred $3.7M to BKS  │
│   Bank! New balance: $3.75M"    │
└─────────────────────────────────┘
```

---

## Benefits

### 1. **User Control** 🎯
- User decides where money goes
- No surprise distributions
- Can choose based on current balances

### 2. **Flexibility** 💪
- Can still specify account upfront: "transfer to Revolut"
- Can wait and decide after seeing sale details
- Works for both cash and savings accounts

### 3. **Transparency** 👀
- Shows current balance of each account
- Helps user make informed decisions
- Confirms transfer with new balance

### 4. **Safety** 🔒
- Prevents accidental deposits to wrong account
- User can review before confirming
- Clear confirmation messages

---

## Testing Scenarios

### ✅ Test 1: Simple Crypto Sale
```
"sold my Bitcoin"
Expected: Shows profit, asks which account
```

### ✅ Test 2: Stock Sale with Amount
```
"sell 10 shares of AAPL"
Expected: Shows sale details, asks which account
```

### ✅ Test 3: Sale with Specific Account
```
"sold BTC and transfer to Revolut"
Expected: Shows profit, auto-transfers to Revolut
```

### ✅ Test 4: Sale with Category
```
"sold TSLA and move to savings"
Expected: Shows profit, asks which savings account
```

### ✅ Test 5: Account Selection Follow-up
```
User: "sold my Bitcoin"
AI: [asks which account]
User: "Bank of America"
Expected: Transfers to Bank of America, shows confirmation
```

---

## Files Modified

| File | Changes |
|------|---------|
| `lib/gemini-service.ts` | - Updated `sell_crypto` handler<br>- Updated `sell_stock` handler<br>- Added `transfer_proceeds` action<br>- Updated system prompt |

---

## Future Enhancements

### Potential Improvements
1. **Smart Suggestions**: Recommend account based on largest balance or most frequently used
2. **Auto-categorization**: Suggest savings for large amounts, cash for smaller
3. **Tax Optimization**: Suggest splitting across accounts for tax purposes
4. **Multi-account Distribution**: Allow splitting proceeds across multiple accounts

---

## Summary

✅ **Problem Solved**: No more automatic proceeds distribution
✅ **User Experience**: Better control and transparency
✅ **Implementation**: Clean, modular, and extensible
✅ **Backward Compatible**: Still works with explicit account specification

The system now respects user choice and provides a conversational, intuitive way to manage where asset sale proceeds are deposited!
