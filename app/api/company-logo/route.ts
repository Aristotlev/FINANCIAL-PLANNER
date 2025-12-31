/**
 * Company Logo API
 * Fetches company logos by ticker symbol using multiple fallback sources
 */

import { NextRequest, NextResponse } from 'next/server';

// Known ticker to domain mappings for popular companies
const TICKER_DOMAINS: Record<string, string> = {
  // Tech Giants
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  GOOGL: 'google.com',
  GOOG: 'google.com',
  AMZN: 'amazon.com',
  TSLA: 'tesla.com',
  NVDA: 'nvidia.com',
  META: 'meta.com',
  NFLX: 'netflix.com',
  ADBE: 'adobe.com',
  CRM: 'salesforce.com',
  ORCL: 'oracle.com',
  INTC: 'intel.com',
  AMD: 'amd.com',
  QCOM: 'qualcomm.com',
  CSCO: 'cisco.com',
  IBM: 'ibm.com',
  // Finance
  JPM: 'jpmorganchase.com',
  BAC: 'bankofamerica.com',
  WFC: 'wellsfargo.com',
  GS: 'goldmansachs.com',
  MS: 'morganstanley.com',
  V: 'visa.com',
  MA: 'mastercard.com',
  PYPL: 'paypal.com',
  SQ: 'block.xyz',
  COIN: 'coinbase.com',
  // Retail
  WMT: 'walmart.com',
  TGT: 'target.com',
  COST: 'costco.com',
  HD: 'homedepot.com',
  NKE: 'nike.com',
  SBUX: 'starbucks.com',
  MCD: 'mcdonalds.com',
  // Add more as needed
};

// Cache for logo URLs (in-memory, resets on server restart)
const logoCache = new Map<string, { url: string | null; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function checkImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return response.ok && (contentType?.startsWith('image/') ?? false);
  } catch {
    return false;
  }
}

async function findLogoUrl(ticker: string): Promise<string | null> {
  const upperTicker = ticker.toUpperCase();
  
  // Check cache first
  const cached = logoCache.get(upperTicker);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }

  // Try known domain mapping first
  if (TICKER_DOMAINS[upperTicker]) {
    const domain = TICKER_DOMAINS[upperTicker];
    const googleFaviconUrl = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;
    logoCache.set(upperTicker, { url: googleFaviconUrl, timestamp: Date.now() });
    return googleFaviconUrl;
  }

  // Try common domain patterns
  const domainPatterns = [
    `${ticker.toLowerCase()}.com`,
    `${ticker.toLowerCase()}inc.com`,
    `${ticker.toLowerCase()}corp.com`,
  ];

  for (const domain of domainPatterns) {
    const url = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;
    const exists = await checkImageExists(url);
    if (exists) {
      logoCache.set(upperTicker, { url, timestamp: Date.now() });
      return url;
    }
  }

  // No logo found
  logoCache.set(upperTicker, { url: null, timestamp: Date.now() });
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker required' }, { status: 400 });
    }

    const logoUrl = await findLogoUrl(ticker);

    if (logoUrl) {
      return NextResponse.json({ 
        ticker: ticker.toUpperCase(),
        logoUrl,
        source: 'google-favicon'
      });
    }

    return NextResponse.json({ 
      ticker: ticker.toUpperCase(),
      logoUrl: null,
      source: 'none'
    });
  } catch (error) {
    console.error('[Company Logo] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logo' },
      { status: 500 }
    );
  }
}
