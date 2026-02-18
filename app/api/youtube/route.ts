import { NextResponse } from 'next/server';

const FALLBACK_KEY = 'AIzaSyAFKg88GcRVUVDaP9rVx-T5YNvq2rp2ghI';

// ──────────────────────────────────────────────
// Curated English-speaking finance YouTube channels
// Each channel's uploads playlist = channel ID with "UC" → "UU"
// ──────────────────────────────────────────────
const CURATED_CHANNELS: { id: string; uploads: string; name: string; financeOnly: boolean }[] = [
  // Crypto — 100% finance, no filter needed
  { id: 'UCqK_GSMbpiV8spgD3ZGloSw', uploads: 'UUqK_GSMbpiV8spgD3ZGloSw', name: 'Coin Bureau', financeOnly: false },
  { id: 'UCbLhGKVY-bJPcawebgtNfbw', uploads: 'UUbLhGKVY-bJPcawebgtNfbw', name: 'Altcoin Daily', financeOnly: false },
  { id: 'UC7TghOL755nBk7HelHoi9LQ', uploads: 'UU7TghOL755nBk7HelHoi9LQ', name: 'CoinDesk', financeOnly: false },
  // Major News — broad channels, need finance filter
  { id: 'UCoUxsWakJucWg46KW5RsvPw', uploads: 'UUoUxsWakJucWg46KW5RsvPw', name: 'Financial Times', financeOnly: false },
  { id: 'UCUMZ7gohGI9HcU9VNsr2FJQ', uploads: 'UUUMZ7gohGI9HcU9VNsr2FJQ', name: 'Bloomberg Originals', financeOnly: true },
  { id: 'UCK7tptUDHh-RYDsdxO1-5QQ', uploads: 'UUK7tptUDHh-RYDsdxO1-5QQ', name: 'The Wall Street Journal', financeOnly: true },
  { id: 'UChqUTb7kYRX8-EiaN3XFrSQ', uploads: 'UUhqUTb7kYRX8-EiaN3XFrSQ', name: 'Reuters', financeOnly: true },
  { id: 'UCrp_UI8XtuYfpiqluWLD7Lw', uploads: 'UUrp_UI8XtuYfpiqluWLD7Lw', name: 'CNBC Television', financeOnly: false },
  { id: 'UC0p5jTq6Xx_DosDFxVXnWaQ', uploads: 'UU0p5jTq6Xx_DosDFxVXnWaQ', name: 'The Economist', financeOnly: true },
  { id: 'UCEAZeUIeJs0IjQiqTCdVSIg', uploads: 'UUEAZeUIeJs0IjQiqTCdVSIg', name: 'Yahoo Finance', financeOnly: false },
  // Investing & Analysis — 100% finance
  { id: 'UCBH5VZE_Y4F3CMcPIzPEB5A', uploads: 'UUBH5VZE_Y4F3CMcPIzPEB5A', name: 'Real Vision', financeOnly: false },
  { id: 'UCLvnJL8htRR1T9cbSccaoVw', uploads: 'UULvnJL8htRR1T9cbSccaoVw', name: 'Aswath Damodaran', financeOnly: false },
  { id: 'UCDXTQ8nWmx_EhZ2v-kp7QxA', uploads: 'UUDXTQ8nWmx_EhZ2v-kp7QxA', name: 'Ben Felix', financeOnly: false },
  { id: 'UCASM0cgfkJxQ1ICmRilfHLw', uploads: 'UUASM0cgfkJxQ1ICmRilfHLw', name: 'Patrick Boyle', financeOnly: false },
  { id: 'UCCKpicnIwBP3VPxBAZWDeNA', uploads: 'UUCKpicnIwBP3VPxBAZWDeNA', name: 'Money & Macro', financeOnly: false },
  { id: 'UCFCEuCsyWP0YkP3CZ3Mr01Q', uploads: 'UUFCEuCsyWP0YkP3CZ3Mr01Q', name: 'The Plain Bagel', financeOnly: false },
  // Institutional / Research — broad academic topics
  { id: 'UChub1tZZuWn9YYHJZZYTbMg', uploads: 'UUhub1tZZuWn9YYHJZZYTbMg', name: 'Morningstar, Inc.', financeOnly: false },
  { id: 'UC8Zy7crsNBL8NJCc_ueF-CA', uploads: 'UU8Zy7crsNBL8NJCc_ueF-CA', name: 'CFA Institute', financeOnly: false },
  { id: 'UCEBb1b_L6zDS3xTUrIALZOw', uploads: 'UUEBb1b_L6zDS3xTUrIALZOw', name: 'MIT OpenCourseWare', financeOnly: true },
  { id: 'UC4EY_qnSeAP1xGsh61eOoJA', uploads: 'UU4EY_qnSeAP1xGsh61eOoJA', name: 'Yale Courses', financeOnly: true },
  // Central Banks & Policy
  { id: 'UCAzhpt9DmG6PnHXjmJTvRGQ', uploads: 'UUAzhpt9DmG6PnHXjmJTvRGQ', name: 'Federal Reserve', financeOnly: false },
  { id: 'UCIYhr3JsLYfKkCM7-W5B6DA', uploads: 'UUIYhr3JsLYfKkCM7-W5B6DA', name: 'IMF', financeOnly: false },
  { id: 'UCsN34Vzu-GqMc5a3BZspIqA', uploads: 'UUsN34Vzu-GqMc5a3BZspIqA', name: 'BIS', financeOnly: false },
  { id: 'UCRnLlxwOaxeplsJ8On583Vw', uploads: 'UURnLlxwOaxeplsJ8On583Vw', name: 'Peterson Institute', financeOnly: false },
  // Commodities & Markets
  { id: 'UCLC4PuFlyKwK03Sc29YLEGQ', uploads: 'UULC4PuFlyKwK03Sc29YLEGQ', name: 'CME Group', financeOnly: false },
  { id: 'UC9ijza42jVR3T6b8bColgvg', uploads: 'UU9ijza42jVR3T6b8bColgvg', name: 'Kitco NEWS', financeOnly: false },
];

// Keywords used for post-fetch relevance filtering (title + description check)
const FINANCE_KEYWORDS = [
  'finance', 'financial', 'economy', 'economic', 'economics',
  'stock', 'stocks', 'market', 'markets', 'invest', 'investing', 'investment',
  'trading', 'trader', 'trade', 'trades',
  'gdp', 'inflation', 'deflation', 'interest rate', 'rates',
  'earnings', 'revenue', 'profit', 'dividend',
  'fiscal', 'monetary', 'policy', 'federal reserve', 'fed', 'central bank',
  'crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'altcoin', 'blockchain', 'defi',
  'bond', 'bonds', 'treasury', 'yield',
  'commodity', 'commodities', 'gold', 'oil', 'silver',
  'recession', 'banking', 'bank', 'credit', 'debt', 'loan',
  'portfolio', 'asset', 'assets', 'fund', 'etf', 'mutual fund',
  'ipo', 'merger', 'acquisition', 'valuation', 'p/e', 'pe ratio',
  'bull', 'bear', 'rally', 'crash', 'correction', 'volatility',
  'forex', 'currency', 'dollar', 'euro', 'yen',
  'tariff', 'tariffs', 'sanctions', 'subsidy',
  'wealth', 'capital', 'equity', 'hedge', 'risk',
  'cpi', 'ppi', 'employment', 'jobs', 'unemployment', 'payroll',
  'budget', 'deficit', 'surplus', 'spending',
  'real estate', 'housing', 'mortgage', 'property',
  'fintech', 'payment', 'payments', 'insurance',
  'wall street', 'nasdaq', 's&p', 'dow', 'ftse', 'nikkei',
  'sec', 'regulation', 'compliance',
];

// ── Cache ──────────────────────────────────────
// Aggressive server-side cache: playlist data doesn't change often
// Multiple cache slots so different time filters don't evict each other
const cacheStore = new Map<string, { items: any[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes — channels don't upload that often
const MAX_CACHE_SLOTS = 10; // prevent unbounded growth

// Mock data for when API key is blocked / quota exhausted
const MOCK_VIDEOS = {
  isMock: true,
  items: Array.from({ length: 30 }, (_, i) => ({
    id: { videoId: `mock-vid-${i}` },
    snippet: {
      title: `Mock: Viral Finance Video #${i + 1} - Market Analysis`,
      description: 'Mock video — YouTube API quota exhausted or key restricted.',
      publishedAt: new Date(Date.now() - i * 86400000).toISOString(),
      channelTitle: CURATED_CHANNELS[i % CURATED_CHANNELS.length].name,
      thumbnails: {
        high: { url: 'https://placehold.co/600x400/1e293b/ffffff?text=Finance+Video' },
        medium: { url: 'https://placehold.co/320x180/1e293b/ffffff?text=Finance+Video' },
      },
    },
    statistics: {
      viewCount: (100000 + i * 5000).toString(),
      likeCount: (5000 + i * 100).toString(),
      commentCount: (1000 + i * 50).toString(),
    },
    contentDetails: { duration: 'PT10M30S' },
  })),
};

export async function GET(request: Request) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || FALLBACK_KEY;

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YouTube API key is missing' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);

  const userQuery = searchParams.get('q') || '';
  const order = searchParams.get('order') || 'date';
  const maxResults = parseInt(searchParams.get('maxResults') || '30', 10);

  // Calculate publishedAfter from client or default to 1 week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const publishedAfter = searchParams.get('publishedAfter') || oneWeekAgo.toISOString();
  const publishedAfterDate = new Date(publishedAfter);

  // Build a cache key from the params that matter
  const cacheKey = `${publishedAfter}|${order}|${userQuery}`;

  // Return cached data if fresh
  const cached = cacheStore.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ items: cached.items.slice(0, maxResults), fromCache: true });
  }

  try {
    // ────────────────────────────────────────────
    // STEP 1: Fetch recent uploads from each channel using playlistItems
    // Cost: 1 quota unit per channel (vs 100 for search) = 26 units total
    // ────────────────────────────────────────────
    const uploadsPerChannel = 8; // extra headroom for date/keyword filtering

    const playlistFetches = CURATED_CHANNELS.map(async (channel) => {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      url.searchParams.append('part', 'snippet');
      url.searchParams.append('playlistId', channel.uploads);
      url.searchParams.append('maxResults', String(uploadsPerChannel));
      url.searchParams.append('key', YOUTUBE_API_KEY);

      try {
        const res = await fetch(url.toString());
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map((item: any) => ({
          videoId: item.snippet?.resourceId?.videoId || '',
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          publishedAt: item.snippet?.publishedAt || '',
          channelTitle: item.snippet?.channelTitle || channel.name,
          thumbnails: item.snippet?.thumbnails || {},
          _channelName: channel.name,
          _financeOnly: channel.financeOnly,
        }));
      } catch {
        return [];
      }
    });

    const allResults = await Promise.all(playlistFetches);
    let allUploads = allResults.flat();

    // If zero results across ALL channels, likely an API block
    if (allUploads.length === 0) {
      console.warn('⚠️ No results from any channel — returning mock data.');
      return NextResponse.json(MOCK_VIDEOS);
    }

    // Filter by publishedAfter date
    allUploads = allUploads.filter((v) => {
      if (!v.publishedAt) return false;
      return new Date(v.publishedAt) >= publishedAfterDate;
    });

    // Filter by user search query if provided (client-side text match)
    if (userQuery) {
      const q = userQuery.toLowerCase();
      allUploads = allUploads.filter((v) => {
        const text = (v.title + ' ' + v.description).toLowerCase();
        return q.split(/\s+/).every((word: string) => text.includes(word));
      });
    }

    // For financeOnly channels, apply keyword filter
    // For dedicated finance channels, keep everything
    allUploads = allUploads.filter((v) => {
      if (!v._financeOnly) return true;
      const text = (v.title + ' ' + v.description).toLowerCase();
      return FINANCE_KEYWORDS.some((kw) => text.includes(kw));
    });

    // Remove duplicates by videoId
    const seen = new Set<string>();
    allUploads = allUploads.filter((v) => {
      if (!v.videoId || seen.has(v.videoId)) return false;
      seen.add(v.videoId);
      return true;
    });

    if (allUploads.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // ────────────────────────────────────────────
    // STEP 2: Batch-fetch statistics + contentDetails using videos endpoint
    // Cost: 1 quota unit per batch of up to 50 IDs = ~2 units total
    // This gives us viewCount, duration, etc.
    // ────────────────────────────────────────────
    const videoIds = allUploads.map((v) => v.videoId).filter(Boolean);

    const detailsMap = new Map<string, any>();
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.append('part', 'statistics,contentDetails');
      url.searchParams.append('id', batch.join(','));
      url.searchParams.append('key', YOUTUBE_API_KEY);

      try {
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          (data.items || []).forEach((item: any) => {
            detailsMap.set(item.id, item);
          });
        }
      } catch {
        // Continue without stats — views will show as 0
      }
    }

    // ────────────────────────────────────────────
    // STEP 3: Merge into final response format matching what the frontend expects
    // ────────────────────────────────────────────
    const enrichedItems = allUploads.map((v) => {
      const details = detailsMap.get(v.videoId);
      return {
        id: { videoId: v.videoId },
        snippet: {
          title: v.title,
          description: v.description,
          publishedAt: v.publishedAt,
          channelTitle: v.channelTitle,
          thumbnails: v.thumbnails,
        },
        statistics: details?.statistics || {},
        contentDetails: details?.contentDetails || {},
      };
    });

    // Sort based on requested order
    let sorted: any[];
    if (order === 'viewCount') {
      sorted = enrichedItems.sort(
        (a, b) =>
          parseInt(b.statistics?.viewCount || '0') - parseInt(a.statistics?.viewCount || '0')
      );
    } else {
      sorted = enrichedItems.sort(
        (a, b) =>
          new Date(b.snippet.publishedAt || 0).getTime() -
          new Date(a.snippet.publishedAt || 0).getTime()
      );
    }

    // Cache the full sorted set (evict oldest if too many slots)
    if (cacheStore.size >= MAX_CACHE_SLOTS) {
      const oldestKey = cacheStore.keys().next().value;
      if (oldestKey) cacheStore.delete(oldestKey);
    }
    cacheStore.set(cacheKey, { items: sorted, timestamp: Date.now() });

    return NextResponse.json({ items: sorted.slice(0, maxResults) });
  } catch (error: any) {
    console.error('Server error fetching YouTube data:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

