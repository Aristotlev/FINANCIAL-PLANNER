# 🚀 Multi-Currency Quick Start Guide

## What You Need to Know in 60 Seconds

### The Main Idea
Different financial assets work differently in real life. This app reflects that reality:

**Assets that stay in their currency:**
- 💰 Crypto (always USD)
- 📈 Stocks (always USD) 
- 🏦 Bank accounts (each has its own currency)
- 📊 Trading accounts (broker currency)

**Assets that convert:**
- 🏠 Real Estate
- 💎 Valuable Items
- 💵 Savings
- 📉 Expenses

### How It Looks

When you select EUR as your main currency and view a crypto portfolio:

```
🪙 Crypto Portfolio
$28,750      ← Original USD amount (crypto is always USD)
≈€26.4K      ← Converted to your selected EUR
```

For bank accounts in different currencies:

```
🏦 Chase Bank (USD)
$8,250       ← USD account (no conversion shown if main is USD)

🏦 HSBC UK (GBP)
£5,000       ← British Pounds (account's native currency)
≈$6,325      ← Converted to USD (your main currency)
```

### 3 Steps to Get Started

#### 1️⃣ Select Your Main Currency
Click the currency selector at the top:
- 💵 USD → Click to open
- Search or browse currencies
- Select your preferred currency (e.g., EUR, GBP, JPY)

#### 2️⃣ Add Accounts with Their Native Currency
When adding a bank account:
- Enter the account details
- **Select the account's actual currency** (USD, EUR, GBP, etc.)
- Enter the balance in that currency
- The app shows conversions automatically

#### 3️⃣ View Your Portfolio
Everything updates automatically:
- Crypto stays in USD (with conversion shown)
- Stocks stay in USD (with conversion shown)
- Bank accounts show in their native currencies (with conversions)
- Totals are in your selected main currency

## Example Scenarios

### Scenario: European User with International Assets

**Main Currency:** EUR 🇪🇺

**Holdings:**
- Crypto: Bitcoin in USD (how crypto works)
- Stocks: Apple stock in USD (NYSE)
- Bank Accounts:
  - German bank in EUR
  - US bank in USD  
  - UK bank in GBP

**What You See:**
```
💰 Crypto
  Bitcoin: $18,500 (≈€17K)
  
📈 Stocks  
  Apple: $15,234 (≈€14K)
  
🏦 Bank Accounts
  Deutsche Bank: €10,000           ← No conversion (main currency)
  Chase: $8,250 (≈€7.6K)
  HSBC: £5,000 (≈€5.8K)
  
💎 Net Worth: €44,400              ← Everything converted to EUR
```

### Scenario: US User Investing Internationally

**Main Currency:** USD 🇺🇸

**Holdings:**
- Crypto: Ethereum in USD
- International bank account in Swiss Francs

**What You See:**
```
💰 Crypto
  Ethereum: $10,250                ← No conversion (already USD)
  
🏦 Bank Accounts
  Credit Suisse: CHF 15,000 (≈$16,950)
  
💎 Net Worth: $27,200              ← Everything in USD
```

## Key Features

### ✅ Real Exchange Rates
- Updates every hour automatically
- Manual refresh available
- Fallback rates if offline

### ✅ Smart Display
- Original currency always shown first
- Conversion shown with ≈ symbol
- Compact format for large numbers (K/M/B)

### ✅ Persistent Preferences
- Your currency choice is saved
- Works across sessions
- No need to re-select

### ✅ 30+ Currencies Supported
🇺🇸 USD • 🇪🇺 EUR • 🇬🇧 GBP • 🇯🇵 JPY • 🇨🇭 CHF • 🇨🇦 CAD • 🇦🇺 AUD • 🇨🇳 CNY • 🇮🇳 INR • 🇧🇷 BRL and more...

## Common Questions

### Q: Why is crypto always in USD?
**A:** That's how cryptocurrency markets work in reality. Most exchanges price crypto in USD or stablecoins like USDT/USDC.

### Q: Can I have multiple bank accounts in different currencies?
**A:** Yes! That's the whole point. Add each account with its native currency, and the app shows everything properly converted.

### Q: What if my main currency changes?
**A:** Just select a new one from the currency selector. Everything updates instantly across the entire app.

### Q: Are the exchange rates accurate?
**A:** Yes! We fetch real-time rates from a professional exchange rate API. They update every hour.

### Q: Can I see historical exchange rates?
**A:** Coming soon! Historical rate tracking is in development.

## Tips & Tricks

### 💡 Tip 1: Set Currency First
Select your main currency BEFORE adding accounts. It makes setup easier.

### 💡 Tip 2: Use Correct Bank Currency
When adding a bank account, select the **actual currency of that account**, not your preferred currency.

### 💡 Tip 3: Refresh Rates When Needed
If rates seem stale, click the refresh button in the currency selector.

### 💡 Tip 4: Crypto = USD Always
Don't try to set crypto in EUR or GBP. Crypto is priced in USD globally.

### 💡 Tip 5: Watch the ≈ Symbol
The ≈ (approximately) symbol always indicates a converted amount.

## Visual Indicators

```
Bold, Large Text = Original Amount
Gray, Small Text = Converted Amount (with ≈)

Example:
  $45,234     ← Original (this is the "real" amount)
  ≈€41.5K     ← Converted (for your reference)
```

## What's Already Working

✅ **Currency Context** - Global currency management  
✅ **Currency Selector** - Beautiful dropdown with search  
✅ **DualCurrencyDisplay** - Smart component for showing both currencies  
✅ **Crypto Card** - Shows USD with conversion  
✅ **Stocks Card** - Shows USD with conversion  
✅ **Cash Card** - Multi-currency bank accounts  
✅ **Exchange Rates** - Real-time API integration  
✅ **Add/Edit Modals** - Currency selectors included  

## Coming Soon

🚧 Trading Account Card  
🚧 Other financial cards (full conversion)  
🚧 Dashboard net worth (aggregated conversions)  
🚧 3D visualization updates  
🚧 All detail modals  
🚧 Historical rate tracking  
🚧 Currency trend charts  

## Need Help?

Check the full documentation:
- **MULTI_CURRENCY_SYSTEM.md** - Complete technical guide
- **MULTI_CURRENCY_VISUAL_GUIDE.md** - Visual examples and UI flows

---

**That's it!** You're ready to manage your international finances like a pro. 🌍💰

Select your currency, add your accounts, and watch everything update automatically!
