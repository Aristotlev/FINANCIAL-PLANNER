/**
 * Asset Color Database
 * 
 * Provides brand-native and thematically relevant colors for financial assets.
 * Colors are carefully selected to match brand identities or represent asset categories.
 */

export interface AssetColor {
  symbol: string;
  name: string;
  color: string;
  type: 'crypto' | 'stock' | 'forex' | 'commodity' | 'index';
  gradient?: string; // Optional gradient for premium styling
}

/**
 * Cryptocurrency Colors
 * Based on official brand colors from each blockchain
 */
export const CRYPTO_COLORS: AssetColor[] = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#F7931A', type: 'crypto', gradient: 'from-[#F7931A] to-[#FFA500]' },
  { symbol: 'ETH', name: 'Ethereum', color: '#627EEA', type: 'crypto', gradient: 'from-[#627EEA] to-[#8B9FF9]' },
  { symbol: 'USDT', name: 'Tether', color: '#26A17B', type: 'crypto', gradient: 'from-[#26A17B] to-[#31C48D]' },
  { symbol: 'BNB', name: 'Binance Coin', color: '#F3BA2F', type: 'crypto', gradient: 'from-[#F3BA2F] to-[#FCD535]' },
  { symbol: 'SOL', name: 'Solana', color: '#14F195', type: 'crypto', gradient: 'from-[#9945FF] to-[#14F195]' },
  { symbol: 'USDC', name: 'USD Coin', color: '#2775CA', type: 'crypto', gradient: 'from-[#2775CA] to-[#3B89E8]' },
  { symbol: 'XRP', name: 'Ripple', color: '#23292F', type: 'crypto', gradient: 'from-[#23292F] to-[#3C4650]' },
  { symbol: 'ADA', name: 'Cardano', color: '#0033AD', type: 'crypto', gradient: 'from-[#0033AD] to-[#0047D9]' },
  { symbol: 'DOGE', name: 'Dogecoin', color: '#C2A633', type: 'crypto', gradient: 'from-[#C2A633] to-[#D4AF37]' },
  { symbol: 'TRX', name: 'TRON', color: '#EB0029', type: 'crypto', gradient: 'from-[#EB0029] to-[#FF1744]' },
  { symbol: 'LINK', name: 'Chainlink', color: '#2A5ADA', type: 'crypto', gradient: 'from-[#2A5ADA] to-[#375BD2]' },
  { symbol: 'MATIC', name: 'Polygon', color: '#8247E5', type: 'crypto', gradient: 'from-[#8247E5] to-[#9D5FF2]' },
  { symbol: 'DOT', name: 'Polkadot', color: '#E6007A', type: 'crypto', gradient: 'from-[#E6007A] to-[#FF1493]' },
  { symbol: 'AVAX', name: 'Avalanche', color: '#E84142', type: 'crypto', gradient: 'from-[#E84142] to-[#FF5252]' },
  { symbol: 'ATOM', name: 'Cosmos', color: '#2E3148', type: 'crypto', gradient: 'from-[#2E3148] to-[#3C4050]' },
  { symbol: 'UNI', name: 'Uniswap', color: '#FF007A', type: 'crypto', gradient: 'from-[#FF007A] to-[#FF4DA6]' },
  { symbol: 'LTC', name: 'Litecoin', color: '#345D9D', type: 'crypto', gradient: 'from-[#345D9D] to-[#4169B1]' },
  { symbol: 'NEAR', name: 'NEAR Protocol', color: '#00C08B', type: 'crypto', gradient: 'from-[#00C08B] to-[#00E5A0]' },
  { symbol: 'APT', name: 'Aptos', color: '#1BC0A4', type: 'crypto', gradient: 'from-[#1BC0A4] to-[#22DAB7]' },
  { symbol: 'ARB', name: 'Arbitrum', color: '#28A0F0', type: 'crypto', gradient: 'from-[#28A0F0] to-[#4CB3FF]' },
  { symbol: 'OP', name: 'Optimism', color: '#FF0420', type: 'crypto', gradient: 'from-[#FF0420] to-[#FF4040]' },
  { symbol: 'FIL', name: 'Filecoin', color: '#0090FF', type: 'crypto', gradient: 'from-[#0090FF] to-[#42A5F5]' },
  { symbol: 'SHIB', name: 'Shiba Inu', color: '#FFA409', type: 'crypto', gradient: 'from-[#FFA409] to-[#FFB84D]' },
];

/**
 * Stock Market Colors
 * Based on official brand colors from major companies
 */
export const STOCK_COLORS: AssetColor[] = [
  // Technology Giants
  { symbol: 'AAPL', name: 'Apple Inc.', color: '#000000', type: 'stock', gradient: 'from-[#A6B1B7] to-[#868E96]' },
  { symbol: 'MSFT', name: 'Microsoft', color: '#00A4EF', type: 'stock', gradient: 'from-[#00A4EF] to-[#00BCF2]' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', color: '#4285F4', type: 'stock', gradient: 'from-[#4285F4] to-[#5A95F5]' },
  { symbol: 'GOOG', name: 'Alphabet (Google)', color: '#4285F4', type: 'stock', gradient: 'from-[#4285F4] to-[#5A95F5]' },
  { symbol: 'AMZN', name: 'Amazon', color: '#FF9900', type: 'stock', gradient: 'from-[#FF9900] to-[#FFAD33]' },
  { symbol: 'META', name: 'Meta Platforms', color: '#0866FF', type: 'stock', gradient: 'from-[#0866FF] to-[#0080FF]' },
  { symbol: 'TSLA', name: 'Tesla', color: '#E82127', type: 'stock', gradient: 'from-[#E82127] to-[#FF3A3F]' },
  { symbol: 'NVDA', name: 'NVIDIA', color: '#76B900', type: 'stock', gradient: 'from-[#76B900] to-[#8FD629]' },
  { symbol: 'NFLX', name: 'Netflix', color: '#E50914', type: 'stock', gradient: 'from-[#E50914] to-[#FF1A1A]' },
  { symbol: 'ADBE', name: 'Adobe', color: '#ED2224', type: 'stock', gradient: 'from-[#ED2224] to-[#FF3336]' },
  
  // Financial Services
  { symbol: 'JPM', name: 'JPMorgan Chase', color: '#0066B2', type: 'stock', gradient: 'from-[#0066B2] to-[#0077CC]' },
  { symbol: 'BAC', name: 'Bank of America', color: '#012169', type: 'stock', gradient: 'from-[#012169] to-[#013388]' },
  { symbol: 'WFC', name: 'Wells Fargo', color: '#D71E28', type: 'stock', gradient: 'from-[#D71E28] to-[#E62C36]' },
  { symbol: 'GS', name: 'Goldman Sachs', color: '#5086C4', type: 'stock', gradient: 'from-[#5086C4] to-[#6699CC]' },
  { symbol: 'MS', name: 'Morgan Stanley', color: '#0033A0', type: 'stock', gradient: 'from-[#0033A0] to-[#0047CC]' },
  { symbol: 'V', name: 'Visa', color: '#1A1F71', type: 'stock', gradient: 'from-[#1A1F71] to-[#252B8F]' },
  { symbol: 'MA', name: 'Mastercard', color: '#EB001B', type: 'stock', gradient: 'from-[#EB001B] to-[#FF1A2E]' },
  { symbol: 'PYPL', name: 'PayPal', color: '#003087', type: 'stock', gradient: 'from-[#003087] to-[#0047A8]' },
  
  // Consumer & Retail
  { symbol: 'WMT', name: 'Walmart', color: '#0071CE', type: 'stock', gradient: 'from-[#0071CE] to-[#0085F2]' },
  { symbol: 'HD', name: 'Home Depot', color: '#F96302', type: 'stock', gradient: 'from-[#F96302] to-[#FF7A1F]' },
  { symbol: 'NKE', name: 'Nike', color: '#111111', type: 'stock', gradient: 'from-[#111111] to-[#333333]' },
  { symbol: 'SBUX', name: 'Starbucks', color: '#00704A', type: 'stock', gradient: 'from-[#00704A] to-[#008A5D]' },
  { symbol: 'MCD', name: 'McDonald\'s', color: '#FFC72C', type: 'stock', gradient: 'from-[#FFC72C] to-[#FFD54F]' },
  { symbol: 'DIS', name: 'Disney', color: '#0063D1', type: 'stock', gradient: 'from-[#0063D1] to-[#007AE5]' },
  
  // Healthcare & Pharma
  { symbol: 'JNJ', name: 'Johnson & Johnson', color: '#D51317', type: 'stock', gradient: 'from-[#D51317] to-[#E71D23]' },
  { symbol: 'UNH', name: 'UnitedHealth', color: '#002677', type: 'stock', gradient: 'from-[#002677] to-[#003499]' },
  { symbol: 'PFE', name: 'Pfizer', color: '#0093D0', type: 'stock', gradient: 'from-[#0093D0] to-[#00A5E3]' },
  { symbol: 'MRNA', name: 'Moderna', color: '#D61F26', type: 'stock', gradient: 'from-[#D61F26] to-[#E52E35]' },
  
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil', color: '#FF1744', type: 'stock', gradient: 'from-[#FF1744] to-[#FF4569]' },
  { symbol: 'CVX', name: 'Chevron', color: '#004F71', type: 'stock', gradient: 'from-[#004F71] to-[#00668F]' },
  
  // ETFs
  { symbol: 'SPY', name: 'S&P 500 ETF', color: '#0052CC', type: 'stock', gradient: 'from-[#0052CC] to-[#0066E6]' },
  { symbol: 'VOO', name: 'Vanguard S&P 500', color: '#B41E3E', type: 'stock', gradient: 'from-[#B41E3E] to-[#C7254E]' },
  { symbol: 'QQQ', name: 'Invesco QQQ', color: '#2C2E83', type: 'stock', gradient: 'from-[#2C2E83] to-[#3A3CA4]' },
  { symbol: 'IVV', name: 'iShares Core S&P 500', color: '#1F5582', type: 'stock', gradient: 'from-[#1F5582] to-[#2868A3]' },
];

/**
 * Index Colors
 * Thematic colors for major market indices
 */
export const INDEX_COLORS: AssetColor[] = [
  { symbol: 'SPX', name: 'S&P 500', color: '#0052CC', type: 'index', gradient: 'from-[#0052CC] to-[#0066E6]' },
  { symbol: 'DJI', name: 'Dow Jones', color: '#006EBE', type: 'index', gradient: 'from-[#006EBE] to-[#0085E5]' },
  { symbol: 'IXIC', name: 'NASDAQ', color: '#0094D9', type: 'index', gradient: 'from-[#0094D9] to-[#00ADF2]' },
  { symbol: 'RUT', name: 'Russell 2000', color: '#8B4513', type: 'index', gradient: 'from-[#8B4513] to-[#A0522D]' },
  { symbol: 'FTSE', name: 'FTSE 100', color: '#001D5A', type: 'index', gradient: 'from-[#001D5A] to-[#002E7A]' },
  { symbol: 'DAX', name: 'DAX', color: '#005AA0', type: 'index', gradient: 'from-[#005AA0] to-[#0070C0]' },
  { symbol: 'NKY', name: 'Nikkei 225', color: '#D32F2F', type: 'index', gradient: 'from-[#D32F2F] to-[#E53935]' },
  { symbol: 'HSI', name: 'Hang Seng', color: '#00857C', type: 'index', gradient: 'from-[#00857C] to-[#00A396]' },
];

/**
 * Commodity Colors
 * Natural colors representing physical commodities
 */
export const COMMODITY_COLORS: AssetColor[] = [
  { symbol: 'GC', name: 'Gold', color: '#FFD700', type: 'commodity', gradient: 'from-[#FFD700] to-[#FFC107]' },
  { symbol: 'SI', name: 'Silver', color: '#C0C0C0', type: 'commodity', gradient: 'from-[#C0C0C0] to-[#B8B8B8]' },
  { symbol: 'CL', name: 'Crude Oil', color: '#1A1A1A', type: 'commodity', gradient: 'from-[#1A1A1A] to-[#333333]' },
  { symbol: 'NG', name: 'Natural Gas', color: '#4A90E2', type: 'commodity', gradient: 'from-[#4A90E2] to-[#5CA3F5]' },
  { symbol: 'HG', name: 'Copper', color: '#B87333', type: 'commodity', gradient: 'from-[#B87333] to-[#CD853F]' },
];

/**
 * Forex Colors
 * Colors based on flag colors and regional themes
 */
export const FOREX_COLORS: AssetColor[] = [
  { symbol: 'EURUSD', name: 'EUR/USD', color: '#003399', type: 'forex', gradient: 'from-[#003399] to-[#0047B3]' },
  { symbol: 'GBPUSD', name: 'GBP/USD', color: '#C8102E', type: 'forex', gradient: 'from-[#C8102E] to-[#DC143C]' },
  { symbol: 'USDJPY', name: 'USD/JPY', color: '#BC002D', type: 'forex', gradient: 'from-[#BC002D] to-[#D32F2F]' },
  { symbol: 'AUDUSD', name: 'AUD/USD', color: '#012169', type: 'forex', gradient: 'from-[#012169] to-[#013388]' },
  { symbol: 'USDCAD', name: 'USD/CAD', color: '#FF0000', type: 'forex', gradient: 'from-[#FF0000] to-[#FF1A1A]' },
  { symbol: 'USDCHF', name: 'USD/CHF', color: '#DA291C', type: 'forex', gradient: 'from-[#DA291C] to-[#E53935]' },
];

/**
 * Get color for an asset symbol
 */
export function getAssetColor(symbol: string, type?: string): string {
  const upperSymbol = symbol.toUpperCase();
  
  // Search in appropriate database
  const databases = [CRYPTO_COLORS, STOCK_COLORS, INDEX_COLORS, COMMODITY_COLORS, FOREX_COLORS];
  
  for (const db of databases) {
    const asset = db.find(a => a.symbol === upperSymbol);
    if (asset) return asset.color;
  }
  
  // Fallback colors based on type
  const fallbackColors: { [key: string]: string } = {
    crypto: '#f59e0b',   // Amber
    stock: '#8b5cf6',    // Purple
    forex: '#3b82f6',    // Blue
    commodity: '#84cc16', // Lime
    index: '#06b6d4',    // Cyan
  };
  
  // Return type-specific fallback or default
  return type ? (fallbackColors[type] || '#6366f1') : '#6366f1'; // Default: Indigo
}

/**
 * Get gradient for an asset symbol
 */
export function getAssetGradient(symbol: string): string | undefined {
  const upperSymbol = symbol.toUpperCase();
  const databases = [CRYPTO_COLORS, STOCK_COLORS, INDEX_COLORS, COMMODITY_COLORS, FOREX_COLORS];
  
  for (const db of databases) {
    const asset = db.find(a => a.symbol === upperSymbol);
    if (asset?.gradient) return asset.gradient;
  }
  
  return undefined;
}

/**
 * Get full asset color info
 */
export function getAssetInfo(symbol: string): AssetColor | null {
  const upperSymbol = symbol.toUpperCase();
  const databases = [CRYPTO_COLORS, STOCK_COLORS, INDEX_COLORS, COMMODITY_COLORS, FOREX_COLORS];
  
  for (const db of databases) {
    const asset = db.find(a => a.symbol === upperSymbol);
    if (asset) return asset;
  }
  
  return null;
}

/**
 * Get all colors for a specific type
 */
export function getColorsByType(type: 'crypto' | 'stock' | 'forex' | 'commodity' | 'index'): AssetColor[] {
  const databases: { [key: string]: AssetColor[] } = {
    crypto: CRYPTO_COLORS,
    stock: STOCK_COLORS,
    forex: FOREX_COLORS,
    commodity: COMMODITY_COLORS,
    index: INDEX_COLORS,
  };
  
  return databases[type] || [];
}

/**
 * Search for assets by name or symbol
 */
export function searchAssets(query: string): AssetColor[] {
  const lowerQuery = query.toLowerCase();
  const allAssets = [...CRYPTO_COLORS, ...STOCK_COLORS, ...INDEX_COLORS, ...COMMODITY_COLORS, ...FOREX_COLORS];
  
  return allAssets.filter(asset => 
    asset.symbol.toLowerCase().includes(lowerQuery) ||
    asset.name.toLowerCase().includes(lowerQuery)
  );
}
