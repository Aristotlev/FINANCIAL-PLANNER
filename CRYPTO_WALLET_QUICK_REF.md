# Crypto Wallet Portfolio - Quick Reference 🚀

## 🎯 Quick Start

### For Users

#### Adding a Position with Wallet

1. Click "Add Position" in Crypto Card
2. Search for cryptocurrency (e.g., "Bitcoin")
3. Enter amount and entry price
4. **Select Wallet**:
   - Choose from dropdown (MetaMask, Binance, etc.)
   - OR click "Show Options" for visual grid
5. (Optional) Add custom name like "Main Wallet"
6. Click "Add Position"

#### Viewing Wallet Distribution

1. Open Crypto Card modal
2. Scroll to "Portfolio by Wallet" section
3. **Hover** over pie chart segments for details:
   - Wallet name and type
   - Total value
   - Portfolio percentage
   - All holdings in that wallet

---

## 🔷 Popular Wallet IDs

### DeFi (Self-Custody)
```
metamask       - MetaMask (Browser/Mobile)
trust_wallet   - Trust Wallet (Mobile)
phantom        - Phantom (Solana)
ledger         - Ledger Hardware Wallet
trezor         - Trezor Hardware Wallet
exodus         - Exodus (Desktop/Mobile)
coinbase_wallet - Coinbase Wallet (Self-custody)
rainbow        - Rainbow Wallet
argent         - Argent (Smart Wallet)
safe           - Safe (Multi-sig)
```

### CeFi (Exchanges)
```
binance        - Binance
coinbase       - Coinbase Exchange
kraken         - Kraken
bybit          - Bybit
okx            - OKX
kucoin         - KuCoin
crypto_com     - Crypto.com
gemini         - Gemini
bitfinex       - Bitfinex
gate_io        - Gate.io
```

---

## 📊 Visual Examples

### Pie Chart Tooltip Example
```
┌─────────────────────────────────┐
│ 🟠 MetaMask                     │
│                                 │
│ Total Value:    $45,000         │
│ Portfolio %:    45%             │
│ Type:           [DeFi]          │
│                                 │
│ Holdings (3):                   │
│ BTC (0.5)      50%  $22,500    │
│ ETH (4.2)      35%  $15,750    │
│ SOL (100)      15%  $6,750     │
└─────────────────────────────────┘
```

### Wallet Selection Grid
```
┌──────────────┬──────────────┐
│ 🦊 MetaMask  │ 📱 Trust     │
│ [DeFi]       │ [DeFi]       │
├──────────────┼──────────────┤
│ 💱 Binance   │ 🔷 Coinbase  │
│ [CeFi]       │ [CeFi]       │
├──────────────┼──────────────┤
│ 🔐 Ledger    │ 👻 Phantom   │
│ [DeFi]       │ [DeFi]       │
└──────────────┴──────────────┘
```

---

## 🎨 Badge Colors

| Type | Color | Example |
|------|-------|---------|
| DeFi | Purple | `🟣 DeFi` |
| CeFi | Blue | `🔵 CeFi` |

---

## 💻 Code Snippets

### Import Wallet Database
```typescript
import { 
  CRYPTO_WALLETS, 
  getWalletById, 
  getDeFiWallets, 
  getCeFiWallets 
} from '@/lib/crypto-wallets-database';
```

### Get Wallet Info
```typescript
const wallet = getWalletById('metamask');
console.log(wallet.name);        // "MetaMask"
console.log(wallet.type);        // "defi"
console.log(wallet.color);       // "#F6851B"
console.log(wallet.description); // "Most popular Ethereum wallet..."
```

### Filter Wallets
```typescript
const defiWallets = getDeFiWallets();
const cefiWallets = getCeFiWallets();
```

### Add Position with Wallet
```typescript
const newPosition = {
  symbol: 'BTC',
  name: 'Bitcoin',
  amount: 0.5,
  entryPoint: 45000,
  color: '#f59e0b',
  walletType: 'metamask',
  walletName: 'Main Wallet'
};

await SupabaseDataService.saveCryptoHolding(newPosition);
```

---

## 🗄️ Database Fields

### crypto_holdings table
```sql
wallet_type    TEXT    -- Wallet ID (e.g., 'metamask')
wallet_name    TEXT    -- Custom name (e.g., 'Main Wallet')
wallet_address TEXT    -- Optional wallet address
```

---

## 🎯 Use Cases

### 1. Hardware Wallet Security
**Scenario**: Track cold storage separately
```
Ledger (Cold Storage) - $100,000 (80%)
└── BTC: 1.5 ($95,000)
└── ETH: 1.0 ($5,000)

Binance (Trading) - $25,000 (20%)
└── USDT: 10,000
└── Various altcoins
```

### 2. Multi-Exchange Trading
**Scenario**: Track positions across exchanges
```
Binance - $50,000 (50%)
Coinbase - $30,000 (30%)
Kraken - $20,000 (20%)
```

### 3. DeFi vs CeFi Split
**Scenario**: Monitor self-custody ratio
```
Total DeFi: $80,000 (80%)
├── MetaMask: $40,000
├── Ledger: $30,000
└── Phantom: $10,000

Total CeFi: $20,000 (20%)
└── Binance: $20,000
```

---

## ⚡ Power User Tips

### 1. Custom Naming Strategy
```
Main Wallet (MetaMask)
Trading Wallet 1 (Binance)
Trading Wallet 2 (Coinbase)
Cold Storage (Ledger)
Savings (Kraken Staking)
```

### 2. Wallet Organization
- **Hardware**: Long-term holdings (BTC, ETH)
- **Exchange**: Trading positions (altcoins)
- **DeFi**: Yield farming, liquidity providing
- **Stablecoin**: Different wallet for USDT/USDC

### 3. Risk Management
- Keep <20% on exchanges (CeFi)
- Store >80% in hardware wallets (DeFi)
- Separate trading from holding wallets

---

## 🔍 Keyboard Shortcuts (Future)

```
Ctrl/Cmd + W    - Open wallet selector
Ctrl/Cmd + N    - Add new wallet
Ctrl/Cmd + E    - Edit wallet assignment
Ctrl/Cmd + D    - Toggle DeFi/CeFi filter
```

---

## 📱 Mobile View

### Compact Wallet List
```
Portfolio by Wallet (3)

🟠 MetaMask (DeFi)
   45% • $45,000
   
🔵 Binance (CeFi)
   35% • $35,000
   
⚫ Ledger (DeFi)
   20% • $20,000
```

---

## 🎨 Color Scheme Reference

### Wallet Brand Colors
```typescript
MetaMask:    #F6851B  // Orange
Binance:     #F3BA2F  // Yellow
Coinbase:    #0052FF  // Blue
Phantom:     #AB9FF2  // Purple
Ledger:      #000000  // Black
Trust Wallet:#3375BB  // Blue
Exodus:      #0B46F9  // Blue
```

---

## 🚀 Performance Tips

### 1. Efficient Queries
```typescript
// Good: Filter locally
const holdings = allHoldings.filter(h => h.walletType === 'metamask');

// Better: Use memoization
const walletHoldings = useMemo(() => 
  holdings.filter(h => h.walletType === wallet),
  [holdings, wallet]
);
```

### 2. Chart Optimization
- Pie chart only renders when data changes
- Tooltips use React.memo
- Labels only show for segments >5%

---

## 📊 Analytics Ideas

### Future Features
1. **Wallet Performance**: Compare returns by wallet
2. **Fee Analysis**: Track gas fees per wallet
3. **Risk Score**: Security rating based on wallet type
4. **Diversification**: Alert if too much in one wallet
5. **Rebalancing**: Suggest moving assets between wallets

---

## 🔗 Related Files

```
lib/crypto-wallets-database.ts              # Wallet definitions
components/ui/portfolio-wallet-pie-chart.tsx # Chart component
components/financial/crypto-card.tsx         # Main UI
contexts/portfolio-context.tsx              # Data management
lib/supabase/supabase-data-service.ts       # Database ops
```

---

## ✅ Testing Checklist

- [ ] Add position with wallet selection
- [ ] Edit position to change wallet
- [ ] View wallet pie chart
- [ ] Hover over chart segments
- [ ] Check DeFi/CeFi badges
- [ ] Test custom wallet names
- [ ] Verify data persistence
- [ ] Test dark mode
- [ ] Check mobile responsive
- [ ] Test with empty holdings
- [ ] Test with single wallet
- [ ] Test with 10+ wallets

---

## 🎉 Quick Demo

### Step-by-Step Demo
1. **Open Crypto Card** → Click crypto icon
2. **Add Position** → Click "Add Position" button
3. **Select Bitcoin** → Search "BTC"
4. **Enter Details**:
   - Amount: 0.5
   - Entry Point: $45,000
5. **Choose Wallet** → Select "MetaMask"
6. **Custom Name** → Type "Main Wallet"
7. **Add** → Click "Add Position"
8. **View Chart** → Scroll to "Portfolio by Wallet"
9. **Hover** → See detailed breakdown

---

## 💡 Pro Tips

1. **Use Hardware Wallets**: For large holdings
2. **Separate Wallets**: Don't mix trading and holding
3. **Label Everything**: Custom names help organization
4. **Review Regularly**: Check distribution monthly
5. **Security First**: Minimize exchange holdings

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Wallet not in list | Use "Other Wallet" + custom name |
| Chart not showing | Refresh page, check holdings data |
| Custom name too long | Max 50 characters recommended |
| Wrong wallet type | Edit position to fix |

---

## 📞 Need Help?

- Check [Full Documentation](./CRYPTO_WALLET_PORTFOLIO_SYSTEM.md)
- Review code in `crypto-card.tsx`
- Inspect wallet database file
- Check browser console for errors

---

**Last Updated**: November 2024
**Status**: ✅ Production Ready
**Version**: 1.0.0
