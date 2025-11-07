# Sell Feature Implementation

## Overview
Added sell functionality to both Crypto and Stocks cards, allowing users to sell their assets and direct proceeds to different accounts based on the nature of the trade.

## Features Added

### 1. **Crypto Card Sell Feature**
- **Sell Button**: Green arrow-down-left icon added to each crypto holding
- **Sell Modal**: Comprehensive modal with:
  - Amount to sell with percentage shortcuts (25%, 50%, 75%, Max)
  - Real-time sale value calculation
  - Three destination types:
    1. **Stablecoin** - Convert to USDT, USDC, DAI, or BUSD
    2. **Bank Account** - Transfer USD to existing bank accounts
    3. **Savings Goal** - Direct proceeds to savings goals
  - Visual feedback for remaining holdings after partial sales
  - Automatic transaction recording

### 2. **Stocks Card Sell Feature**
- **Sell Button**: Green arrow-down-left icon added to each stock holding
- **Sell Modal**: Similar to crypto with:
  - Shares to sell with percentage shortcuts
  - Real-time sale value calculation in USD
  - Two destination types:
    1. **Bank Account** - Transfer proceeds to cash accounts
    2. **Savings Goal** - Allocate gains to savings goals
  - Display of remaining shares after partial sales

## Technical Implementation

### Crypto Card (`crypto-card.tsx`)

#### New Components
1. **SellPositionModal**
   - Handles crypto asset sales
   - Supports partial or full position liquidation
   - Three destination types based on crypto nature
   - Loads bank accounts and savings goals dynamically
   - Real-time value calculations

#### New Functions
```typescript
sellHolding(id, sellAmount, destination)
```
- Processes the sale transaction
- Updates or removes holdings based on sell amount
- Routes proceeds to appropriate destination:
  - **Stablecoin**: Adds to existing or creates new stablecoin holding
  - **Bank**: Updates cash account balance
  - **Savings**: Increases savings goal amount
- Records transaction history
- Triggers data refresh events

### Stocks Card (`stocks-card.tsx`)

#### New Components
1. **SellPositionModal**
   - Similar to crypto but for stock shares
   - Integer-based share counting
   - Two destination types (bank/savings only)
   - Real-time proceeds calculation

#### New Functions
```typescript
sellHolding(id, sellShares, destination)
```
- Processes stock sale transaction
- Updates or removes holdings
- Routes proceeds to bank or savings
- Triggers data refresh events

## User Experience Flow

### Selling Crypto
1. Click green sell button on any crypto holding
2. Enter amount to sell (or use percentage shortcuts)
3. View real-time sale value in USD
4. Choose destination:
   - **Stablecoin**: Select USDT/USDC/DAI/BUSD (1:1 conversion)
   - **Bank Account**: Select from existing accounts
   - **Savings Goal**: Select target savings goal
5. Confirm sale
6. Automatic updates:
   - Holding amount reduced or removed
   - Destination account/holding updated
   - Transaction recorded
   - All cards refresh

### Selling Stocks
1. Click green sell button on any stock position
2. Enter shares to sell (or use percentage shortcuts)
3. View real-time sale value in USD
4. Choose destination:
   - **Bank Account**: Transfer to cash account
   - **Savings Goal**: Add to savings target
5. Confirm sale
6. Automatic updates:
   - Share count reduced or position closed
   - Destination account updated
   - All cards refresh

## Smart Features

### 1. **Partial Sales**
- Sell any portion of your holdings
- Remaining position automatically updated
- Maintains original entry point for P&L tracking

### 2. **Stablecoin Conversion** (Crypto Only)
- 1:1 USD to stablecoin conversion
- Automatically adds to existing stablecoin holdings
- Creates new holding if stablecoin not owned
- Perfect for profit-taking while staying in crypto

### 3. **Dynamic Account Loading**
- Fetches current bank accounts and savings goals
- Shows real balances and progress
- Prevents selling to non-existent accounts

### 4. **Visual Feedback**
- Real-time sale value calculation
- Shows remaining holdings/shares
- Color-coded destination selection
- Disabled state when inputs invalid

## Data Integration

### Database Updates
- **SupabaseDataService** integration for all transactions
- Automatic account balance updates
- Cross-card data synchronization via events
- Transaction history maintained

### Events Triggered
- `cryptoDataChanged` - Crypto holdings updated
- `stockDataChanged` - Stock positions updated  
- `financialDataChanged` - Overall portfolio refresh

## UI/UX Details

### Icons
- **Sell Button**: `ArrowDownLeft` icon in green
- Represents downward movement (selling) and money flow
- Neon glow effect in dark mode

### Modal Design
- Clean, responsive layout
- Scrollable for smaller screens
- High z-index (1000001) for proper stacking
- Click-outside to close
- Accessible with proper labels

### Validation
- Cannot sell more than owned
- Must select destination
- Amount/shares must be positive
- Real-time error prevention via disabled states

## Benefits

1. **Flexibility**: Sell any amount, direct to any account
2. **Liquidity Management**: Easy conversion between assets
3. **Goal Achievement**: Direct profits to savings goals
4. **Risk Management**: Take profits without full liquidation
5. **Accounting**: All transactions tracked automatically
6. **Cross-Platform**: Works with all existing account types

## Future Enhancements

Potential additions:
- Sell order history tab
- Tax lot selection (FIFO/LIFO)
- Limit orders (sell at target price)
- Multi-position batch selling
- Export transaction history
- Capital gains calculations
- Fee/commission tracking
