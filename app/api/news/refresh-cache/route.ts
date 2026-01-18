/**
 * News Cache Refresh API
 * 
 * This endpoint refreshes the news cache (IPO, Earnings, Twitter) from external APIs.
 * Should be called by a cron job (e.g., every 15-60 minutes depending on data type).
 * 
 * Usage:
 *   POST /api/news/refresh-cache
 *   Body: { type: 'ipo' | 'earnings' | 'twitter' | 'all' }
 *   Header: x-cron-secret: <your-secret> (for cron job authentication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { newsCacheService } from '@/lib/news-cache-service';

// Secret for cron job authentication (set in environment)
const CRON_SECRET = process.env.CRON_SECRET;

// Your existing API keys/services
const FMP_API_KEY = process.env.FMP_API_KEY;
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret (skip in development)
    const cronSecret = req.headers.get('x-cron-secret');
    if (process.env.NODE_ENV === 'production' && cronSecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type = 'all' } = body;

    const results: Record<string, any> = {};

    // Refresh IPO Calendar
    if (type === 'ipo' || type === 'all') {
      try {
        const needsRefresh = await newsCacheService.needsRefresh('ipo_calendar');
        if (needsRefresh) {
          const ipoData = await fetchIPOCalendar();
          const result = await newsCacheService.refreshIPOCalendar(ipoData);
          results.ipo = result;
        } else {
          results.ipo = { skipped: true, reason: 'Cache still fresh' };
        }
      } catch (error: any) {
        results.ipo = { error: error.message };
      }
    }

    // Refresh Earnings Calendar
    if (type === 'earnings' || type === 'all') {
      try {
        const needsRefresh = await newsCacheService.needsRefresh('earnings_calendar');
        if (needsRefresh) {
          const earningsData = await fetchEarningsCalendar();
          const result = await newsCacheService.refreshEarningsCalendar(earningsData);
          results.earnings = result;
        } else {
          results.earnings = { skipped: true, reason: 'Cache still fresh' };
        }
      } catch (error: any) {
        results.earnings = { error: error.message };
      }
    }

    // Refresh Twitter Feed
    if (type === 'twitter' || type === 'all') {
      try {
        const needsRefresh = await newsCacheService.needsRefresh('twitter_feed');
        if (needsRefresh) {
          const tweets = await fetchTwitterFeed();
          const result = await newsCacheService.refreshTwitterFeed(tweets);
          results.twitter = result;
        } else {
          results.twitter = { skipped: true, reason: 'Cache still fresh' };
        }
      } catch (error: any) {
        results.twitter = { error: error.message };
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cache refresh error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh cache' },
      { status: 500 }
    );
  }
}

// GET endpoint to check cache status
export async function GET() {
  try {
    const status = await newsCacheService.getCacheStatus();
    return NextResponse.json({ status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==================== API FETCHERS ====================
// Replace these with your actual API implementations

async function fetchIPOCalendar() {
  // Example using Financial Modeling Prep API
  // Replace with your actual IPO data source
  
  if (!FMP_API_KEY) {
    console.warn('FMP_API_KEY not set, using mock data');
    return getMockIPOData();
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/ipo_calendar?apikey=${FMP_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform to our schema
    return data.map((ipo: any) => ({
      symbol: ipo.symbol,
      company_name: ipo.company,
      exchange: ipo.exchange,
      ipo_date: ipo.date,
      price_range_low: ipo.priceRangeLow,
      price_range_high: ipo.priceRangeHigh,
      offer_price: ipo.price,
      shares_offered: ipo.shares,
      status: 'upcoming',
      raw_data: ipo
    }));
  } catch (error) {
    console.error('Error fetching IPO calendar:', error);
    return [];
  }
}

async function fetchEarningsCalendar() {
  // Example using Financial Modeling Prep API
  // Replace with your actual earnings data source
  
  if (!FMP_API_KEY) {
    console.warn('FMP_API_KEY not set, using mock data');
    return getMockEarningsData();
  }

  try {
    // Get earnings for next 7 days
    const from = new Date().toISOString().split('T')[0];
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.map((e: any) => ({
      symbol: e.symbol,
      company_name: e.symbol, // FMP doesn't always include company name
      report_date: e.date,
      report_time: e.time === 'bmo' ? 'bmo' : e.time === 'amc' ? 'amc' : 'during',
      eps_estimate: e.epsEstimated,
      eps_actual: e.eps,
      revenue_estimate: e.revenueEstimated,
      revenue_actual: e.revenue,
      fiscal_quarter: e.fiscalDateEnding ? `Q${Math.ceil(new Date(e.fiscalDateEnding).getMonth() / 3)}` : null,
      raw_data: e
    }));
  } catch (error) {
    console.error('Error fetching earnings calendar:', error);
    return [];
  }
}

async function fetchTwitterFeed() {
  // Twitter/X API integration
  // Replace with your actual Twitter data source
  
  if (!TWITTER_BEARER_TOKEN) {
    console.warn('TWITTER_BEARER_TOKEN not set, using mock data');
    return getMockTwitterData();
  }

  try {
    // Example: Search for finance-related tweets
    // You'll need to customize this for your specific use case
    const query = encodeURIComponent('(stock OR stocks OR $SPY OR $QQQ OR earnings OR IPO) -is:retweet lang:en');
    
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=50&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=name,username,profile_image_url,verified`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();
    const users = new Map(data.includes?.users?.map((u: any) => [u.id, u]) || []);
    
    return data.data?.map((tweet: any) => {
      const author = users.get(tweet.author_id) as any;
      return {
        tweet_id: tweet.id,
        author_username: author?.username || 'unknown',
        author_name: author?.name,
        author_profile_image: author?.profile_image_url,
        author_verified: author?.verified || false,
        content: tweet.text,
        likes_count: tweet.public_metrics?.like_count || 0,
        retweets_count: tweet.public_metrics?.retweet_count || 0,
        replies_count: tweet.public_metrics?.reply_count || 0,
        mentioned_symbols: extractStockSymbols(tweet.text),
        hashtags: extractHashtags(tweet.text),
        published_at: tweet.created_at,
        category: 'market_news',
        raw_data: tweet
      };
    }) || [];
  } catch (error) {
    console.error('Error fetching Twitter feed:', error);
    return [];
  }
}

// Helper functions
function extractStockSymbols(text: string): string[] {
  const matches = text.match(/\$[A-Z]{1,5}/g) || [];
  return [...new Set(matches.map(s => s.substring(1)))];
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g) || [];
  return [...new Set(matches.map(h => h.substring(1).toLowerCase()))];
}

// Mock data for development/testing
function getMockIPOData() {
  return [
    {
      symbol: 'EXAMPLE',
      company_name: 'Example Corp',
      exchange: 'NASDAQ',
      ipo_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price_range_low: 18,
      price_range_high: 22,
      status: 'upcoming',
      industry: 'Technology'
    }
  ];
}

function getMockEarningsData() {
  return [
    {
      symbol: 'AAPL',
      company_name: 'Apple Inc.',
      report_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      report_time: 'amc',
      eps_estimate: 2.15,
      fiscal_quarter: 'Q1'
    }
  ];
}

function getMockTwitterData() {
  return [
    {
      tweet_id: 'mock_' + Date.now(),
      author_username: 'fintwit_example',
      author_name: 'FinTwit Example',
      content: 'Markets looking bullish today! $SPY breaking resistance. #stocks #trading',
      likes_count: 150,
      retweets_count: 25,
      mentioned_symbols: ['SPY'],
      hashtags: ['stocks', 'trading'],
      published_at: new Date().toISOString(),
      category: 'market_news',
      sentiment: 'bullish'
    }
  ];
}
