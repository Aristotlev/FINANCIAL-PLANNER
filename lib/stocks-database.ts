// Comprehensive Stock Market Database
export interface StockInfo {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  country: string;
  marketCap: string;
  currentPrice: number;
  currency: string;
  website?: string;
  description: string;
  color: string;
}

export const STOCK_DATABASE: StockInfo[] = [
  // Technology Giants
  {
    id: 'aapl',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    exchange: 'NASDAQ',
    country: 'United States',
    marketCap: '$3.4T',
    currentPrice: 189.50,
    currency: 'USD',
    website: 'apple.com',
    description: 'iPhone, iPad, Mac, and services ecosystem',
    color: '#007AFF'
  },
  {
    id: 'msft',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    industry: 'Software',
    exchange: 'NASDAQ',
    country: 'United States',
    marketCap: '$2.8T',
    currentPrice: 378.85,
    currency: 'USD',
    website: 'microsoft.com',
    description: 'Cloud computing, productivity software, gaming',
    color: '#00BCF2'
  },
  {
    id: 'googl',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Technology',
    industry: 'Internet Services',
    exchange: 'NASDAQ',
    country: 'United States',
    marketCap: '$2.1T',
    currentPrice: 168.25,
    currency: 'USD',
    website: 'abc.xyz',
    description: 'Google search, YouTube, cloud services, AI',
    color: '#4285F4'
  },
  {
    id: 'amzn',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    sector: 'Consumer Discretionary',
    industry: 'E-commerce',
    exchange: 'NASDAQ',
    country: 'United States',
    marketCap: '$1.7T',
    currentPrice: 178.50,
    currency: 'USD',
    website: 'amazon.com',
    description: 'E-commerce, cloud computing (AWS), digital streaming',
    color: '#FF9900'
  },
  {
    id: 'nvda',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    industry: 'Semiconductors',
    exchange: 'NASDAQ',
    country: 'United States',
    marketCap: '$2.9T',
    currentPrice: 875.30,
    currency: 'USD',
    website: 'nvidia.com',
    description: 'AI chips, graphics processors, data center hardware',
    color: '#76B900'
  },
  {
    id: 'tsla',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Consumer Discretionary',
    industry: 'Electric Vehicles',
    exchange: 'NASDAQ',
    country: 'United States',
    marketCap: '$800B',
    currentPrice: 252.30,
    currency: 'USD',
    website: 'tesla.com',
    description: 'Electric vehicles, energy storage, solar panels',
    color: '#CC0000'
  },
  {
    id: 'meta',
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    sector: 'Technology',
    industry: 'Social Media',
    exchange: 'NASDAQ',
    country: 'United States',
    marketCap: '$1.3T',
    currentPrice: 503.50,
    currency: 'USD',
    website: 'meta.com',
    description: 'Facebook, Instagram, WhatsApp, VR/AR',
    color: '#1877F2'
  },

  // Financial Services
  {
    id: 'jpm',
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'NYSE',
    country: 'United States',
    marketCap: '$580B',
    currentPrice: 195.80,
    currency: 'USD',
    website: 'jpmorganchase.com',
    description: 'Investment banking, asset management, private banking',
    color: '#0066B2'
  },
  {
    id: 'bac',
    symbol: 'BAC',
    name: 'Bank of America Corp.',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'NYSE',
    country: 'United States',
    marketCap: '$320B',
    currentPrice: 39.25,
    currency: 'USD',
    website: 'bankofamerica.com',
    description: 'Consumer banking, wealth management, investment services',
    color: '#E31837'
  },
  {
    id: 'wfc',
    symbol: 'WFC',
    name: 'Wells Fargo & Company',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'NYSE',
    country: 'United States',
    marketCap: '$180B',
    currentPrice: 48.75,
    currency: 'USD',
    website: 'wellsfargo.com',
    description: 'Banking, mortgage lending, wealth management',
    color: '#D71E2B'
  },

  // Healthcare & Pharmaceuticals
  {
    id: 'jnj',
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    sector: 'Healthcare',
    industry: 'Pharmaceuticals',
    exchange: 'NYSE',
    country: 'United States',
    marketCap: '$450B',
    currentPrice: 155.20,
    currency: 'USD',
    website: 'jnj.com',
    description: 'Pharmaceuticals, medical devices, consumer products',
    color: '#CC0000'
  },
  {
    id: 'pfe',
    symbol: 'PFE',
    name: 'Pfizer Inc.',
    sector: 'Healthcare',
    industry: 'Pharmaceuticals',
    exchange: 'NYSE',
    country: 'United States',
    marketCap: '$160B',
    currentPrice: 28.45,
    currency: 'USD',
    website: 'pfizer.com',
    description: 'Prescription medicines, vaccines, oncology treatments',
    color: '#0093D0'
  },

  // Consumer Goods
  {
    id: 'ko',
    symbol: 'KO',
    name: 'The Coca-Cola Company',
    sector: 'Consumer Staples',
    industry: 'Beverages',
    exchange: 'NYSE',
    country: 'United States',
    marketCap: '$265B',
    currentPrice: 61.80,
    currency: 'USD',
    website: 'coca-cola.com',
    description: 'Non-alcoholic beverages, soft drinks worldwide',
    color: '#F40009'
  },
  {
    id: 'pg',
    symbol: 'PG',
    name: 'Procter & Gamble Co.',
    sector: 'Consumer Staples',
    industry: 'Household Products',
    exchange: 'NYSE',
    country: 'United States',
    marketCap: '$360B',
    currentPrice: 152.30,
    currency: 'USD',
    website: 'pg.com',
    description: 'Consumer goods, personal care, household products',
    color: '#003DA5'
  },

  // ETFs and Indices
  {
    id: 'spy',
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    sector: 'ETF',
    industry: 'Index Fund',
    exchange: 'NYSE',
    country: 'United States',
    marketCap: '$520B',
    currentPrice: 428.50,
    currency: 'USD',
    website: 'spdrs.com',
    description: 'Tracks S&P 500 index, largest ETF',
    color: '#FFD700'
  },
  {
    id: 'qqq',
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    sector: 'ETF',
    industry: 'Technology Index',
    exchange: 'NASDAQ',
    country: 'United States',
    marketCap: '$220B',
    currentPrice: 385.70,
    currency: 'USD',
    website: 'invesco.com',
    description: 'Tracks NASDAQ-100 technology stocks',
    color: '#00A651'
  },
  {
    id: 'iwm',
    symbol: 'IWM',
    name: 'iShares Russell 2000 ETF',
    sector: 'ETF',
    industry: 'Small Cap Index',
    exchange: 'NYSE',
    country: 'United States',
    marketCap: '$65B',
    currentPrice: 198.45,
    currency: 'USD',
    website: 'ishares.com',
    description: 'Small-cap US stocks index fund',
    color: '#1F5582'
  },

  // Energy & Commodities
  {
    id: 'xom',
    symbol: 'XOM',
    name: 'Exxon Mobil Corporation',
    sector: 'Energy',
    industry: 'Oil & Gas',
    exchange: 'NYSE',
    country: 'United States',
    marketCap: '$430B',
    currentPrice: 102.30,
    currency: 'USD',
    website: 'exxonmobil.com',
    description: 'Oil exploration, refining, petrochemicals',
    color: '#FF1744'
  },

  // International Stocks
  {
    id: 'asml',
    symbol: 'ASML',
    name: 'ASML Holding N.V.',
    sector: 'Technology',
    industry: 'Semiconductor Equipment',
    exchange: 'NASDAQ',
    country: 'Netherlands',
    marketCap: '$310B',
    currentPrice: 785.20,
    currency: 'USD',
    website: 'asml.com',
    description: 'Semiconductor lithography equipment',
    color: '#0066CC'
  },
  {
    id: 'tsm',
    symbol: 'TSM',
    name: 'Taiwan Semiconductor',
    sector: 'Technology',
    industry: 'Semiconductors',
    exchange: 'NYSE',
    country: 'Taiwan',
    marketCap: '$520B',
    currentPrice: 102.50,
    currency: 'USD',
    website: 'tsmc.com',
    description: 'Contract chip manufacturing',
    color: '#E60012'
  },

  // Chinese Stocks (ADRs accessible to European traders)
  {
    id: 'nio',
    symbol: 'NIO',
    name: 'NIO Inc.',
    sector: 'Consumer Discretionary',
    industry: 'Electric Vehicles',
    exchange: 'NYSE',
    country: 'China',
    marketCap: '$9.5B',
    currentPrice: 5.20,
    currency: 'USD',
    website: 'nio.com',
    description: 'Premium electric vehicles, battery swap technology',
    color: '#00C3FF'
  },
  {
    id: 'xpev',
    symbol: 'XPEV',
    name: 'XPeng Inc.',
    sector: 'Consumer Discretionary',
    industry: 'Electric Vehicles',
    exchange: 'NYSE',
    country: 'China',
    marketCap: '$7.2B',
    currentPrice: 9.85,
    currency: 'USD',
    website: 'xpeng.com',
    description: 'Smart electric vehicles with autonomous driving',
    color: '#FF6600'
  },
  {
    id: 'li',
    symbol: 'LI',
    name: 'Li Auto Inc.',
    sector: 'Consumer Discretionary',
    industry: 'Electric Vehicles',
    exchange: 'NASDAQ',
    country: 'China',
    marketCap: '$21B',
    currentPrice: 20.45,
    currency: 'USD',
    website: 'lixiang.com',
    description: 'Extended-range electric vehicles and autonomous driving',
    color: '#1E4FCD'
  },
  {
    id: 'jfin',
    symbol: 'JFIN',
    name: 'Jiayin Group Inc.',
    sector: 'Financials',
    industry: 'FinTech',
    exchange: 'NASDAQ',
    country: 'China',
    marketCap: '$85M',
    currentPrice: 4.25,
    currency: 'USD',
    website: 'jiayin.com',
    description: 'Online consumer finance platform in China',
    color: '#FF3B3B'
  },
  {
    id: 'baba',
    symbol: 'BABA',
    name: 'Alibaba Group Holding',
    sector: 'Consumer Discretionary',
    industry: 'E-commerce',
    exchange: 'NYSE',
    country: 'China',
    marketCap: '$210B',
    currentPrice: 82.50,
    currency: 'USD',
    website: 'alibaba.com',
    description: 'E-commerce, cloud computing, digital payments',
    color: '#FF6A00'
  },
  {
    id: 'jd',
    symbol: 'JD',
    name: 'JD.com Inc.',
    sector: 'Consumer Discretionary',
    industry: 'E-commerce',
    exchange: 'NASDAQ',
    country: 'China',
    marketCap: '$52B',
    currentPrice: 35.80,
    currency: 'USD',
    website: 'jd.com',
    description: 'E-commerce platform with own logistics network',
    color: '#E3001B'
  },
  {
    id: 'bidu',
    symbol: 'BIDU',
    name: 'Baidu Inc.',
    sector: 'Technology',
    industry: 'Internet Services',
    exchange: 'NASDAQ',
    country: 'China',
    marketCap: '$32B',
    currentPrice: 92.30,
    currency: 'USD',
    website: 'baidu.com',
    description: 'Search engine, AI, autonomous driving technology',
    color: '#2932E1'
  },
  {
    id: 'pdd',
    symbol: 'PDD',
    name: 'PDD Holdings Inc.',
    sector: 'Consumer Discretionary',
    industry: 'E-commerce',
    exchange: 'NASDAQ',
    country: 'China',
    marketCap: '$185B',
    currentPrice: 142.80,
    currency: 'USD',
    website: 'pdd.com',
    description: 'E-commerce (Pinduoduo in China, Temu globally)',
    color: '#E02020'
  },
  {
    id: 'beke',
    symbol: 'BEKE',
    name: 'KE Holdings Inc.',
    sector: 'Real Estate',
    industry: 'Property Services',
    exchange: 'NYSE',
    country: 'China',
    marketCap: '$18B',
    currentPrice: 16.25,
    currency: 'USD',
    website: 'ke.com',
    description: 'Real estate transaction and services platform',
    color: '#00B050'
  },
  {
    id: 'ntes',
    symbol: 'NTES',
    name: 'NetEase Inc.',
    sector: 'Technology',
    industry: 'Gaming',
    exchange: 'NASDAQ',
    country: 'China',
    marketCap: '$63B',
    currentPrice: 98.50,
    currency: 'USD',
    website: 'netease.com',
    description: 'Online gaming, music streaming, e-commerce',
    color: '#C8161D'
  },
  {
    id: 'tme',
    symbol: 'TME',
    name: 'Tencent Music Entertainment',
    sector: 'Technology',
    industry: 'Music Streaming',
    exchange: 'NYSE',
    country: 'China',
    marketCap: '$11B',
    currentPrice: 6.85,
    currency: 'USD',
    website: 'tencentmusic.com',
    description: 'Music streaming and online entertainment',
    color: '#07C160'
  },
  {
    id: 'bili',
    symbol: 'BILI',
    name: 'Bilibili Inc.',
    sector: 'Technology',
    industry: 'Video Streaming',
    exchange: 'NASDAQ',
    country: 'China',
    marketCap: '$5.8B',
    currentPrice: 14.20,
    currency: 'USD',
    website: 'bilibili.com',
    description: 'Video sharing and gaming platform for Gen Z',
    color: '#00A1D6'
  },
  {
    id: 'yumc',
    symbol: 'YUMC',
    name: 'Yum China Holdings',
    sector: 'Consumer Discretionary',
    industry: 'Restaurants',
    exchange: 'NYSE',
    country: 'China',
    marketCap: '$18B',
    currentPrice: 45.30,
    currency: 'USD',
    website: 'yumchina.com',
    description: 'KFC, Pizza Hut franchises in China',
    color: '#E4002B'
  },
  {
    id: 'iq',
    symbol: 'IQ',
    name: 'iQIYI Inc.',
    sector: 'Technology',
    industry: 'Video Streaming',
    exchange: 'NASDAQ',
    country: 'China',
    marketCap: '$2.5B',
    currentPrice: 3.15,
    currency: 'USD',
    website: 'iqiyi.com',
    description: 'Netflix of China - online video streaming',
    color: '#00BE06'
  },
  {
    id: 'tal',
    symbol: 'TAL',
    name: 'TAL Education Group',
    sector: 'Consumer Discretionary',
    industry: 'Education',
    exchange: 'NYSE',
    country: 'China',
    marketCap: '$4.2B',
    currentPrice: 6.50,
    currency: 'USD',
    website: 'tal.com',
    description: 'K-12 after-school tutoring and education',
    color: '#FF6700'
  }
];

// Helper functions
export const getStockBySymbol = (symbol: string): StockInfo | undefined => {
  return STOCK_DATABASE.find(stock => 
    stock.symbol.toLowerCase() === symbol.toLowerCase()
  );
};

export const searchStocks = (query: string): StockInfo[] => {
  const lowercaseQuery = query.toLowerCase();
  return STOCK_DATABASE.filter(stock => 
    stock.symbol.toLowerCase().includes(lowercaseQuery) ||
    stock.name.toLowerCase().includes(lowercaseQuery) ||
    stock.sector.toLowerCase().includes(lowercaseQuery) ||
    stock.industry.toLowerCase().includes(lowercaseQuery)
  );
};

export const getStocksBySector = (sector: string): StockInfo[] => {
  return STOCK_DATABASE.filter(stock => 
    stock.sector.toLowerCase().includes(sector.toLowerCase())
  );
};

export const getStocksByExchange = (exchange: string): StockInfo[] => {
  return STOCK_DATABASE.filter(stock => 
    stock.exchange.toLowerCase().includes(exchange.toLowerCase())
  );
};

export const getAllSectors = (): string[] => {
  const sectors = new Set<string>();
  STOCK_DATABASE.forEach(stock => sectors.add(stock.sector));
  return Array.from(sectors).sort();
};

export const getAllExchanges = (): string[] => {
  const exchanges = new Set<string>();
  STOCK_DATABASE.forEach(stock => exchanges.add(stock.exchange));
  return Array.from(exchanges).sort();
};
