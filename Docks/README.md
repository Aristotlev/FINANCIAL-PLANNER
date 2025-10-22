# Money Hub - Financial Management App

A comprehensive financial dashboard built with Next.js, TypeScript, and Tailwind CSS for tracking your complete financial portfolio.

## Features

### Financial Categories
- **Cash**: Track liquid funds across checking and savings accounts
- **Savings**: Monitor high-yield savings and emergency funds  
- **Crypto Portfolio**: Manage cryptocurrency holdings (BTC, ETH, etc.)
- **Stock Portfolio**: Track equity investments and dividend stocks
- **Expenses**: Monitor monthly expenses, subscriptions, and bills
- **Valuable Items**: Track property, vehicles, jewelry, and collectibles
- **Trading Account**: Manage active trading funds and positions
- **Net Worth**: Calculate total assets minus liabilities

### Interactive Features
- Animated cards with hover effects and data visualizations
- Real-time financial calculations
- Responsive design for all devices
- Dark mode support
- Financial health indicators
- **Comprehensive Bank Database**: Search and select from 50+ international banks
- **Smart Bank Search**: Filter by country, continent, bank type, and services
- **Bank Icons & Information**: Visual bank identification with detailed info
- **Market Analysis Integration**: Real-time market data and insights
- **Complete Data Persistence**: All changes automatically saved and remembered

### International Bank Support
- **50+ Major Banks**: JPMorgan Chase, Bank of America, Wells Fargo, HSBC, Deutsche Bank, BNP Paribas, and more
- **Global Coverage**: North America, Europe, Asia, Oceania, South America
- **Bank Types**: Retail banking, digital banking, investment banking, credit unions
- **Smart Search**: Filter by location, services, and bank type
- **Visual Identification**: Color-coded bank icons and detailed information

## Tech Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom animated cards with SVG visualizations
- **State Management**: React hooks
- **Data Persistence**: LocalStorage with automatic backup
- **Market Data**: TradingView-style analysis integration

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── globals.css          # Global styles and Tailwind imports
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Main dashboard page
├── components/
│   ├── ui/
│   │   └── animated-card.tsx # Base animated card components
│   └── financial/
│       └── financial-cards.tsx # Financial category cards
└── package.json
```

## Financial Cards

Each financial category is represented by an interactive animated card that displays:
- Current balance/value
- Percentage change
- Category-specific breakdowns
- Interactive hover animations
- Color-coded data visualizations

### Card Categories
1. **Cash Card** - Liquid funds (Green theme)
2. **Savings Card** - Emergency and goal savings (Blue theme)
3. **Crypto Card** - Digital assets (Orange theme)
4. **Stock Card** - Equity investments (Purple theme)
5. **Expenses Card** - Monthly outflows (Red theme)
6. **Valuable Items Card** - Physical assets (Lime theme)
7. **Trading Account Card** - Active trading (Cyan theme)
8. **Net Worth Card** - Total financial position (Violet theme)

## Customization

### Adding New Financial Categories
1. Create a new card function in `components/financial/financial-cards.tsx`
2. Define the financial data structure
3. Add the card to the main dashboard grid

### Modifying Card Appearance
- Update colors in the `FinancialData` interface
- Modify animations in `animated-card.tsx`
- Adjust layouts in the main page component

## Data Integration
Currently using mock data. To integrate with real financial APIs:
1. Add data fetching hooks
2. Connect to banking/investment APIs
3. Implement real-time updates
4. Add data persistence

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License
MIT License - feel free to use this project for personal or commercial purposes.
