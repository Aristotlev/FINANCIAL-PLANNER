
// Map of asset symbols to their brand colors
// Colors extracted from TradingView icons and official brand guidelines

export const BRAND_COLORS: Record<string, string> = {
  // Crypto
  'BTC': '#F7931A',
  'ETH': '#627EEA',
  'BNB': '#F0B90B',
  'SOL': '#00FFA3', // Using the start of the gradient or a dominant color
  'USDT': '#26A17B',
  'USDC': '#2775CA',
  'XRP': '#23292F',
  'DOGE': '#C2A633',
  'TRX': '#FF060A',
  'ADA': '#0033AD',
  'AVAX': '#E84142',
  'SHIB': '#FFA409',
  'LINK': '#375BD2',
  'DOT': '#E6007A',
  'MATIC': '#8247E5',
  'LTC': '#345D9D',
  'UNI': '#FF007A',
  'ATOM': '#6F7390',
  'XLM': '#000000',
  'XMR': '#FF6600',
  'HBAR': '#000000',
  'NEAR': '#00C08B',
  'APT': '#000000',
  'ARB': '#28A0F0',
  'OP': '#FF0420',
  'FIL': '#0090FF',
  'ALGO': '#000000',
  'VET': '#15BDFF',
  'AAVE': '#B6509E',
  'ICP': '#29ABE2',
  'INJ': '#00F2FE',
  'SUI': '#4DA2FF',
  'GRT': '#6747ED',
  'RUNE': '#00CCFF',
  'FTM': '#1969FF',
  'SAND': '#00ADEF',
  'MANA': '#FF2D55',
  'PEPE': '#3D9970',

  // Stocks (Tech Giants)
  'AAPL': '#000000', // Apple
  'MSFT': '#00A4EF', // Microsoft
  'TSLA': '#E82127', // Tesla
  'AMZN': '#FF9900', // Amazon
  'GOOG': '#4285F4', // Google
  'GOOGL': '#4285F4', // Google
  'NVDA': '#76B900', // Nvidia
  'META': '#0668E1', // Meta
  'NFLX': '#E50914', // Netflix
  'AMD': '#ED1C24', // AMD
  'INTC': '#0071C5', // Intel
  'IBM': '#052FAD', // IBM
  'ORCL': '#C74634', // Oracle
  'CRM': '#00A1E0', // Salesforce
  'ADBE': '#FF0000', // Adobe
  'PYPL': '#003087', // PayPal
  'SQ': '#000000', // Block/Square
  'SHOP': '#96BF48', // Shopify
  'SPOT': '#1DB954', // Spotify
  'UBER': '#000000', // Uber
  'ABNB': '#FF5A5F', // Airbnb
  'COIN': '#0052FF', // Coinbase
  'HOOD': '#00C805', // Robinhood
  
  // Indices / ETFs
  'SPY': '#0052CC',
  'QQQ': '#00A3DA',
  'DIA': '#004080',
  'VOO': '#BF1012',
  'IVV': '#000000',
  
  // Forex
  'USD': '#2E7D32',
  'EUR': '#003399',
  'GBP': '#C8102E',
  'JPY': '#BC002D',
  'CHF': '#FF0000',
  'AUD': '#012169',
  'CAD': '#FF0000',
  'NZD': '#00247D',
  
  // Commodities
  'XAU': '#FFD700', // Gold
  'XAG': '#C0C0C0', // Silver
  'WTI': '#1A1A1A', // Oil
  'BRENT': '#1A1A1A', // Oil
};

export const DEFAULT_CRYPTO_COLOR = '#f59e0b';
export const DEFAULT_STOCK_COLOR = '#8b5cf6';

/**
 * Get the brand color for a given asset symbol.
 * Returns a default color if the symbol is not found.
 * 
 * @param symbol The asset symbol (e.g., 'BTC', 'AAPL')
 * @param type The type of asset ('crypto' or 'stock') to determine the default color
 * @returns The hex color string
 */
export function getBrandColor(symbol: string, type: 'crypto' | 'stock' = 'crypto'): string {
  if (!symbol) return type === 'crypto' ? DEFAULT_CRYPTO_COLOR : DEFAULT_STOCK_COLOR;
  
  const normalizedSymbol = symbol.toUpperCase();
  
  // Check for exact match
  if (BRAND_COLORS[normalizedSymbol]) {
    return BRAND_COLORS[normalizedSymbol];
  }
  
  // Check for partial matches or common patterns if needed
  // For now, just return default
  return type === 'crypto' ? DEFAULT_CRYPTO_COLOR : DEFAULT_STOCK_COLOR;
}
