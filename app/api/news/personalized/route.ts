import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// RSS Feed sources for personalized news - using reliable free sources
const RSS_FEEDS = {
  crypto: [
    { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", priority: 1 },
    { name: "CoinTelegraph", url: "https://cointelegraph.com/rss", priority: 1 },
    { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/", priority: 2 },
    { name: "Decrypt", url: "https://decrypt.co/feed", priority: 2 },
    { name: "The Block", url: "https://www.theblock.co/rss.xml", priority: 1 },
    { name: "CryptoSlate", url: "https://cryptoslate.com/feed/", priority: 2 },
    { name: "NewsBTC", url: "https://www.newsbtc.com/feed/", priority: 3 },
    { name: "Crypto Briefing", url: "https://cryptobriefing.com/feed/", priority: 2 }
  ],
  stocks: [
    { name: "MarketWatch", url: "https://www.marketwatch.com/rss/topstories", priority: 1 },
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", priority: 1 },
    { name: "Investing.com", url: "https://www.investing.com/rss/news_285.rss", priority: 1 },
    { name: "Benzinga", url: "https://www.benzinga.com/feed", priority: 2 },
    { name: "Seeking Alpha", url: "https://seekingalpha.com/feed.xml", priority: 1 },
    { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", priority: 2 },
    { name: "The Motley Fool", url: "https://www.fool.com/feeds/index.aspx", priority: 3 }
  ]
};

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  pubDateTimestamp: number;
  source: string;
  category: string;
  matchedSymbol?: string;
}

interface Holding {
  symbol: string;
  name: string;
}

// In-memory cache for personalized news
const personalizedNewsCache = new Map<string, { data: NewsItem[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Fetch with timeout and user agent
async function fetchDirect(url: string, timeout: number = 4000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      },
      next: { revalidate: 300 } // Next.js cache for 5 minutes
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return response;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Google News RSS search - provides targeted news for specific search terms
async function fetchGoogleNewsForSymbol(
  symbol: string, 
  name: string, 
  isCrypto: boolean
): Promise<NewsItem[]> {
  try {
    // Create search query - combine symbol and name for better results
    const searchQuery = isCrypto 
      ? `${name} ${symbol} crypto cryptocurrency` 
      : `${name} stock ${symbol}`;
    
    const encodedQuery = encodeURIComponent(searchQuery);
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;
    
    const response = await fetchDirect(googleNewsUrl, 5000);
    
    if (!response) {
      return [];
    }
    
    const xmlText = await response.text();
    const $ = cheerio.load(xmlText, { xmlMode: true });
    const items: NewsItem[] = [];
    
    $('item').each((index: number, element: any) => {
      if (index >= 5) return false; // Get top 5 from Google News
      
      const $item = $(element);
      const title = $item.find('title').text().trim();
      let link = $item.find('link').text().trim();
      const pubDateStr = $item.find('pubDate').text().trim();
      const sourceMatch = $item.find('source').text().trim();
      
      if (!title || !link) return;
      
      // Google News links are redirects, but still work
      // The source is in the title after the dash
      let source = sourceMatch || 'Google News';
      
      // Calculate relative time
      let timeAgo = 'Recently';
      let timestamp = Date.now();
      try {
        const pubDate = new Date(pubDateStr);
        timestamp = pubDate.getTime();
        const now = new Date();
        const diffMs = now.getTime() - timestamp;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes < 60) {
          timeAgo = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
          timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
      } catch {
        // Keep defaults
      }
      
      items.push({
        title: title.replace(/ - .*$/, ''), // Clean title
        description: `Latest news about ${name} (${symbol.toUpperCase()})`,
        link,
        pubDate: timeAgo,
        pubDateTimestamp: timestamp,
        source,
        category: isCrypto ? 'crypto' : 'stocks',
        matchedSymbol: symbol.toUpperCase()
      });
    });
    
    return items;
  } catch (error) {
    console.error(`Error fetching Google News for ${symbol}:`, error);
    return [];
  }
}

// Parse RSS XML using cheerio
function parseRSSFeed(xmlText: string, sourceName: string, category: string): NewsItem[] {
  try {
    const $ = cheerio.load(xmlText, { xmlMode: true });
    const items: NewsItem[] = [];
    
    // Try RSS format first
    $('item').each((index: number, element: any) => {
      if (index >= 30) return false; // Get more items for better matching
      
      const $item = $(element);
      const title = $item.find('title').text().trim();
      const link = $item.find('link').text().trim() || $item.find('guid').text().trim();
      const description = $item.find('description').text().trim() || 
                         $item.find('content\\:encoded').text().trim();
      const pubDateStr = $item.find('pubDate').text().trim() || 
                        $item.find('dc\\:date').text().trim();
      
      if (!title || !link) return;
      
      // Calculate relative time and timestamp
      let timeAgo = 'Recently';
      let timestamp = Date.now();
      try {
        const pubDate = new Date(pubDateStr);
        timestamp = pubDate.getTime();
        const now = new Date();
        const diffMs = now.getTime() - timestamp;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes < 60) {
          timeAgo = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
          timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
      } catch {
        // Keep defaults
      }
      
      // Clean description (remove HTML tags)
      const cleanDescription = description
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
        .substring(0, 300);
      
      items.push({
        title,
        description: cleanDescription || title,
        link,
        pubDate: timeAgo,
        pubDateTimestamp: timestamp,
        source: sourceName,
        category
      });
    });
    
    // Try Atom format if no RSS items found
    if (items.length === 0) {
      $('entry').each((index: number, element: any) => {
        if (index >= 30) return false;
        
        const $entry = $(element);
        const title = $entry.find('title').text().trim();
        const link = $entry.find('link').attr('href') || '';
        const description = $entry.find('summary').text().trim() || 
                           $entry.find('content').text().trim();
        const pubDateStr = $entry.find('published').text().trim() || 
                          $entry.find('updated').text().trim();
        
        if (!title || !link) return;
        
        let timeAgo = 'Recently';
        let timestamp = Date.now();
        try {
          const pubDate = new Date(pubDateStr);
          timestamp = pubDate.getTime();
          const now = new Date();
          const diffMs = now.getTime() - timestamp;
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          
          if (diffHours < 24) {
            timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
          } else {
            const diffDays = Math.floor(diffHours / 24);
            timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
          }
        } catch {
          // Keep defaults
        }
        
        const cleanDescription = description
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .trim()
          .substring(0, 300);
        
        items.push({
          title,
          description: cleanDescription || title,
          link,
          pubDate: timeAgo,
          pubDateTimestamp: timestamp,
          source: sourceName,
          category
        });
      });
    }
    
    return items;
  } catch (error) {
    console.error(`Error parsing RSS feed from ${sourceName}:`, error);
    return [];
  }
}

// Fetch RSS feed with timeout and proxy fallback
async function fetchRSSFeed(url: string, sourceName: string, category: string): Promise<NewsItem[]> {
  try {
    const response = await fetchDirect(url, 5000);
    
    if (!response) {
      console.error(`Fetch failed for ${sourceName}`);
      return [];
    }

    const xmlText = await response.text();
    
    // Validate XML content
    if (!xmlText || (!xmlText.includes('<rss') && !xmlText.includes('<feed') && !xmlText.includes('<?xml'))) {
      return [];
    }
    
    return parseRSSFeed(xmlText, sourceName, category);
  } catch (error) {
    console.error(`Error fetching RSS feed from ${sourceName}:`, error);
    return [];
  }
}

// Find articles that match a specific holding
function findMatchingArticles(
  allNews: NewsItem[], 
  symbol: string, 
  name: string, 
  isCrypto: boolean
): NewsItem[] {
  const symbolLower = symbol.toLowerCase();
  const nameLower = name.toLowerCase();
  
  // Get the first significant word from the name (e.g., "Apple" from "Apple Inc.")
  const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
  const primaryName = nameWords[0] || nameLower;
  
  // Define specific keywords for well-known assets
  const assetKeywords: Record<string, string[]> = {
    // Crypto
    'btc': ['bitcoin', 'btc', 'satoshi'],
    'eth': ['ethereum', 'eth', 'ether', 'vitalik'],
    'sol': ['solana', 'sol'],
    'doge': ['dogecoin', 'doge'],
    'xrp': ['ripple', 'xrp'],
    'ada': ['cardano', 'ada'],
    'matic': ['polygon', 'matic'],
    'dot': ['polkadot', 'dot'],
    'link': ['chainlink', 'link'],
    'avax': ['avalanche', 'avax'],
    'bnb': ['binance', 'bnb'],
    'ltc': ['litecoin', 'ltc'],
    // Stocks
    'aapl': ['apple', 'aapl', 'iphone', 'ipad', 'mac'],
    'msft': ['microsoft', 'msft', 'windows', 'azure', 'xbox'],
    'googl': ['google', 'alphabet', 'googl', 'android', 'youtube'],
    'goog': ['google', 'alphabet', 'goog', 'android', 'youtube'],
    'amzn': ['amazon', 'amzn', 'aws', 'prime'],
    'meta': ['meta', 'facebook', 'instagram', 'whatsapp'],
    'tsla': ['tesla', 'tsla', 'elon', 'musk', 'ev'],
    'nvda': ['nvidia', 'nvda', 'gpu', 'ai chip', 'graphics'],
    'amd': ['amd', 'advanced micro', 'ryzen', 'radeon'],
    'intc': ['intel', 'intc', 'chip', 'processor'],
    'nflx': ['netflix', 'nflx', 'streaming'],
    'dis': ['disney', 'dis', 'marvel', 'pixar'],
    'ba': ['boeing', 'ba', 'aircraft', 'airplane'],
    'jpm': ['jpmorgan', 'jp morgan', 'jpm', 'chase'],
    'v': ['visa', 'payment'],
    'ma': ['mastercard', 'payment'],
    'wmt': ['walmart', 'wmt', 'retail'],
    'ko': ['coca-cola', 'coke', 'ko'],
    'pep': ['pepsi', 'pepsico', 'pep']
  };
  
  // Get keywords for this asset
  const keywords = assetKeywords[symbolLower] || [symbolLower, primaryName];
  
  const matchingArticles: NewsItem[] = [];
  
  for (const article of allNews) {
    const content = `${article.title} ${article.description}`.toLowerCase();
    
    // Check if any keyword matches
    let matched = false;
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        matched = true;
        break;
      }
    }
    
    // Also check direct symbol/name match
    if (!matched) {
      if (content.includes(symbolLower) || content.includes(primaryName)) {
        matched = true;
      }
    }
    
    if (matched) {
      matchingArticles.push({
        ...article,
        matchedSymbol: symbol.toUpperCase()
      });
    }
  }
  
  // Sort by recency
  matchingArticles.sort((a, b) => b.pubDateTimestamp - a.pubDateTimestamp);
  
  return matchingArticles;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cryptoHoldings = [], stockHoldings = [] }: { 
      cryptoHoldings: Holding[], 
      stockHoldings: Holding[] 
    } = body;
    
    // Check cache
    const cacheKey = JSON.stringify({ cryptoHoldings, stockHoldings });
    const cached = personalizedNewsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        news: cached.data,
        cached: true
      });
    }
    
    // Fetch all relevant RSS feeds in parallel
    const feedPromises: Promise<NewsItem[]>[] = [];
    
    // Add crypto feeds if user has crypto holdings
    if (cryptoHoldings.length > 0) {
      for (const feed of RSS_FEEDS.crypto) {
        feedPromises.push(fetchRSSFeed(feed.url, feed.name, 'crypto'));
      }
    }
    
    // Add stock feeds if user has stock holdings
    if (stockHoldings.length > 0) {
      for (const feed of RSS_FEEDS.stocks) {
        feedPromises.push(fetchRSSFeed(feed.url, feed.name, 'stocks'));
      }
    }
    
    // If no holdings, return empty
    if (feedPromises.length === 0) {
      return NextResponse.json({
        success: true,
        news: [],
        message: 'No holdings provided'
      });
    }
    
    // Wait for all feeds with a timeout
    const results = await Promise.allSettled(feedPromises);
    
    // Combine all fetched news
    const allNews: NewsItem[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allNews.push(...result.value);
      }
    }
    
    // Remove duplicates
    const uniqueNews = new Map<string, NewsItem>();
    for (const article of allNews) {
      const key = article.link.toLowerCase();
      if (!uniqueNews.has(key)) {
        uniqueNews.set(key, article);
      }
    }
    const deduplicatedNews = Array.from(uniqueNews.values());
    
    // Find articles for each holding
    const personalizedNews: NewsItem[] = [];
    const usedLinks = new Set<string>();
    const holdingsNeedingMore: Array<{ holding: Holding; isCrypto: boolean; needed: number }> = [];
    
    // Process crypto holdings
    for (const holding of cryptoHoldings) {
      const matchingArticles = findMatchingArticles(
        deduplicatedNews, 
        holding.symbol, 
        holding.name, 
        true
      );
      
      // Add up to 3 unique articles per holding
      let count = 0;
      for (const article of matchingArticles) {
        if (count >= 3) break;
        if (!usedLinks.has(article.link)) {
          usedLinks.add(article.link);
          personalizedNews.push(article);
          count++;
        }
      }
      
      // Track if we need more articles from Google News
      if (count < 3) {
        holdingsNeedingMore.push({ holding, isCrypto: true, needed: 3 - count });
      }
    }
    
    // Process stock holdings
    for (const holding of stockHoldings) {
      const matchingArticles = findMatchingArticles(
        deduplicatedNews, 
        holding.symbol, 
        holding.name, 
        false
      );
      
      // Add up to 3 unique articles per holding
      let count = 0;
      for (const article of matchingArticles) {
        if (count >= 3) break;
        if (!usedLinks.has(article.link)) {
          usedLinks.add(article.link);
          personalizedNews.push(article);
          count++;
        }
      }
      
      // Track if we need more articles from Google News
      if (count < 3) {
        holdingsNeedingMore.push({ holding, isCrypto: false, needed: 3 - count });
      }
    }
    
    // Fetch from Google News for holdings that need more articles
    if (holdingsNeedingMore.length > 0) {
      const googleNewsPromises = holdingsNeedingMore.map(({ holding, isCrypto }) =>
        fetchGoogleNewsForSymbol(holding.symbol, holding.name, isCrypto)
      );
      
      const googleResults = await Promise.allSettled(googleNewsPromises);
      
      // Add Google News articles
      googleResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          const { needed } = holdingsNeedingMore[index];
          let added = 0;
          
          for (const article of result.value) {
            if (added >= needed) break;
            if (!usedLinks.has(article.link)) {
              usedLinks.add(article.link);
              personalizedNews.push(article);
              added++;
            }
          }
        }
      });
    }
    
    // Sort by recency
    personalizedNews.sort((a, b) => b.pubDateTimestamp - a.pubDateTimestamp);
    
    // Cache the results
    personalizedNewsCache.set(cacheKey, { 
      data: personalizedNews, 
      timestamp: Date.now() 
    });
    
    return NextResponse.json({
      success: true,
      news: personalizedNews,
      totalFetched: allNews.length,
      holdingsCount: {
        crypto: cryptoHoldings.length,
        stocks: stockHoldings.length
      }
    });
    
  } catch (error) {
    console.error('Error in personalized news API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personalized news' },
      { status: 500 }
    );
  }
}

// Also support GET for simple cache clearing
export async function GET() {
  personalizedNewsCache.clear();
  return NextResponse.json({ success: true, message: 'Cache cleared' });
}
