import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// RSS Feed sources configuration with priority levels
// Priority: 1 = Fetch first (major sources), 2 = Secondary sources, 3 = Background fetch
const RSS_FEEDS = {
  crypto: [
    { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", priority: 1 },
    { name: "CoinTelegraph", url: "https://cointelegraph.com/rss", priority: 1 },
    { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/", priority: 2 },
    { name: "Crypto Briefing", url: "https://cryptobriefing.com/feed/", priority: 2 },
    { name: "Decrypt", url: "https://decrypt.co/feed", priority: 2 },
    { name: "The Block", url: "https://www.theblock.co/rss.xml", priority: 1 },
    { name: "CryptoSlate", url: "https://cryptoslate.com/feed/", priority: 3 },
    { name: "NewsBTC", url: "https://www.newsbtc.com/feed/", priority: 3 }
  ],
  stocks: [
    { name: "MarketWatch", url: "https://www.marketwatch.com/rss/topstories", priority: 1 },
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", priority: 1 },
    { name: "Investing.com", url: "https://www.investing.com/rss/news_285.rss", priority: 1 },
    { name: "Benzinga", url: "https://www.benzinga.com/feed", priority: 2 },
    { name: "Seeking Alpha", url: "https://seekingalpha.com/feed.xml", priority: 1 },
    { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", priority: 2 },
    { name: "Reuters Business", url: "https://www.reutersagency.com/feed/?taxonomy=best-regions&post_type=best", priority: 2 },
    { name: "The Motley Fool", url: "https://www.fool.com/feeds/index.aspx", priority: 3 },
    { name: "Barron's", url: "https://www.barrons.com/xml/rss/3_7014.xml", priority: 2 }
  ],
  forex: [
    { name: "FXStreet", url: "https://www.fxstreet.com/news/rss", priority: 1 },
    { name: "DailyFX", url: "https://www.dailyfx.com/feeds/market-news", priority: 1 },
    { name: "ForexLive", url: "https://www.forexlive.com/feed/news", priority: 1 },
    { name: "Investing.com FX", url: "https://www.investing.com/rss/news_1.rss", priority: 2 },
    { name: "FXEmpire", url: "https://www.fxempire.com/api/rss/news", priority: 2 },
    { name: "Action Forex", url: "https://www.actionforex.com/rss/", priority: 3 },
    { name: "Finance Magnates", url: "https://www.financemagnates.com/feed/", priority: 2 }
  ],
  indices: [
    { name: "MarketWatch", url: "https://www.marketwatch.com/rss/topstories", priority: 1 },
    { name: "Investing.com", url: "https://www.investing.com/rss/news.rss", priority: 1 },
    { name: "Reuters Markets", url: "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best", priority: 1 },
    { name: "CNBC Markets", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", priority: 1 },
    { name: "Yahoo Finance Markets", url: "https://finance.yahoo.com/news/rssindex", priority: 1 },
    { name: "Bloomberg", url: "https://www.bloomberg.com/feed/podcast/etf-iq.xml", priority: 2 },
    { name: "Financial Times", url: "https://www.ft.com/markets?format=rss", priority: 2 },
    { name: "WSJ Markets", url: "https://feeds.wsj.com/wsj/xml/rss/3_7031.xml", priority: 2 },
    { name: "Barron's Markets", url: "https://www.barrons.com/xml/rss/3_7031.xml", priority: 2 },
    { name: "CNBC World Markets", url: "https://www.cnbc.com/id/100727362/device/rss/rss.html", priority: 3 },
    { name: "The Motley Fool", url: "https://www.fool.com/feeds/index.aspx", priority: 3 },
    { name: "Seeking Alpha Markets", url: "https://seekingalpha.com/feed.xml", priority: 3 }
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
  priority?: number; // Source priority for ranking
  engagementScore?: number; // Calculated engagement score
}

// Category-specific keywords for content filtering
const CATEGORY_KEYWORDS = {
  crypto: [
    'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency', 'blockchain',
    'defi', 'nft', 'altcoin', 'solana', 'cardano', 'dogecoin', 'shiba', 'binance',
    'coinbase', 'metamask', 'web3', 'token', 'mining', 'wallet', 'satoshi',
    'polkadot', 'avalanche', 'polygon', 'matic', 'chainlink', 'uniswap', 'dex'
  ],
  forex: [
    'forex', 'fx', 'currency', 'euro', 'dollar', 'yen', 'pound', 'sterling',
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'exchange rate', 'central bank',
    'fed', 'ecb', 'boj', 'bank of england', 'interest rate', 'monetary policy',
    'currency pair', 'pip', 'spread', 'liquidity', 'volatility'
  ],
  stocks: [
    'stock', 'equity', 'share', 'dividend', 'earnings', 'eps', 'revenue',
    'nasdaq', 'nyse', 'tesla', 'apple', 'microsoft', 'amazon', 'google',
    'meta', 'nvidia', 'amd', 'intel', 'pharmaceutical', 'biotech', 'ipo',
    'merger', 'acquisition', 'quarterly', 'analyst', 'upgrade', 'downgrade',
    'price target', 'market cap', 'valuation', 'p/e ratio'
  ],
  indices: [
    's&p 500', 's&p500', 'spx', 'sp500', 'dow jones', 'djia', 'dow', 'nasdaq composite', 
    'nasdaq 100', 'ndx', 'qqq', 'russell 2000', 'russell', 'ftse 100', 'ftse', 'dax', 
    'dax 40', 'cac 40', 'nikkei 225', 'nikkei', 'topix', 'hang seng', 'hsi', 'kospi',
    'index', 'indices', 'benchmark', 'index fund', 'etf', 'exchange traded fund',
    'vanguard', 'blackrock', 'ishares', 'spdr', 'voo', 'spy', 'dia', 'iwm',
    'sector rotation', 'market breadth', 'market cap weighted', 'equal weight',
    'bull market', 'bear market', 'correction', 'rally', 'market sentiment',
    'market outlook', 'index performance', 'broad market', 'index futures',
    'vix', 'volatility index', 'fear gauge', 'market-wide', 'basket of stocks',
    'weighted average', 'index level', 'all-time high', 'record high', 'milestone'
  ]
};

// Determine if article content matches the category
function matchesCategory(item: NewsItem, targetCategory: string): boolean {
  const content = (item.title + ' ' + item.description).toLowerCase();
  const keywords = CATEGORY_KEYWORDS[targetCategory as keyof typeof CATEGORY_KEYWORDS] || [];
  
  // Count keyword matches
  let matchCount = 0;
  for (const keyword of keywords) {
    if (content.includes(keyword)) {
      matchCount++;
    }
  }
  
  // Special handling for cross-category content
  // If article mentions both crypto and forex/stocks heavily, categorize by density
  const cryptoMatches = CATEGORY_KEYWORDS.crypto.filter(kw => content.includes(kw)).length;
  const forexMatches = CATEGORY_KEYWORDS.forex.filter(kw => content.includes(kw)).length;
  const stocksMatches = CATEGORY_KEYWORDS.stocks.filter(kw => content.includes(kw)).length;
  const indicesMatches = CATEGORY_KEYWORDS.indices.filter(kw => content.includes(kw)).length;
  
  // Determine dominant category
  const categoryScores = {
    crypto: cryptoMatches,
    forex: forexMatches,
    stocks: stocksMatches,
    indices: indicesMatches
  };
  
  const dominantCategory = Object.entries(categoryScores).reduce((a, b) => 
    categoryScores[b[0] as keyof typeof categoryScores] > categoryScores[a[0] as keyof typeof categoryScores] ? b : a
  )[0];
  
  // Article matches if it's the dominant category or has at least 2 matching keywords
  return dominantCategory === targetCategory || matchCount >= 2;
}

// Calculate engagement score for news prioritization
function calculateEngagementScore(item: NewsItem, sourcePriority: number): number {
  let score = 0;
  
  // Source priority (higher priority = higher score) - INCREASED WEIGHT
  score += (4 - sourcePriority) * 30; // Priority 1 = 90, Priority 2 = 60, Priority 3 = 30
  
  // Recency bonus (fresher content scores higher) - ENHANCED
  const ageInHours = (Date.now() - item.pubDateTimestamp) / (1000 * 60 * 60);
  if (ageInHours < 0.5) score += 50; // Less than 30 minutes - BREAKING NEWS
  else if (ageInHours < 1) score += 40;
  else if (ageInHours < 2) score += 30;
  else if (ageInHours < 4) score += 20;
  else if (ageInHours < 8) score += 10;
  else if (ageInHours < 12) score += 5;
  
  // Title quality indicators (viral headline buzzwords) - EXPANDED
  const title = item.title.toLowerCase();
  const viralWords = [
    // Breaking news indicators
    'breaking', 'urgent', 'alert', 'just in', 'developing',
    // Market movers
    'surge', 'soar', 'plunge', 'crash', 'spike', 'rally', 'jump',
    // Records and milestones
    'record', 'all-time', 'historic', 'unprecedented', 'milestone',
    // Authority and exclusivity
    'exclusive', 'reveals', 'announces', 'confirms', 'unveils',
    // Impact words
    'major', 'massive', 'huge', 'significant', 'critical',
    // Action words
    'launches', 'hits', 'reaches', 'crosses', 'breaks'
  ];
  
  let viralWordCount = 0;
  viralWords.forEach(word => {
    if (title.includes(word)) {
      score += 8;
      viralWordCount++;
    }
  });
  
  // Bonus for multiple viral words
  if (viralWordCount >= 2) score += 15;
  if (viralWordCount >= 3) score += 25;
  
  // Numbers in title (often indicate data-driven viral content)
  const hasNumber = /\d+/.test(title);
  if (hasNumber) score += 10;
  
  // Percentage or dollar amounts (market-moving data)
  if (title.includes('%') || title.includes('$')) score += 12;
  
  // Title length sweet spot (60-120 characters for viral headlines)
  if (item.title.length >= 60 && item.title.length <= 120) score += 15;
  else if (item.title.length >= 50 && item.title.length <= 140) score += 8;
  
  // Has detailed description (quality content)
  if (item.description && item.description.length > 150) score += 10;
  if (item.description && item.description.length > 250) score += 5;
  
  return score;
}

// Parse RSS XML using cheerio
function parseRSSFeed(xmlText: string, sourceName: string, category: string, sourcePriority: number = 2): NewsItem[] {
  try {
    const $ = cheerio.load(xmlText, { xmlMode: true });
    const items: NewsItem[] = [];
    
    // Try RSS format first
    $('item').each((index: number, element: any) => {
      if (index >= 20) return false; // Limit to 20 items per feed for better coverage
      
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
      let timestamp = Date.now(); // Default to now if parsing fails
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
      } catch (e) {
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
        .substring(0, 200);
      
      const newsItem: NewsItem = {
        title,
        description: cleanDescription || title,
        link,
        pubDate: timeAgo,
        pubDateTimestamp: timestamp,
        source: sourceName,
        category,
        priority: sourcePriority
      };
      newsItem.engagementScore = calculateEngagementScore(newsItem, sourcePriority);
      items.push(newsItem);
    });
    
    // If no items found, try Atom format
    if (items.length === 0) {
      $('entry').each((index: number, element: any) => {
        if (index >= 20) return false; // Limit to 20 items per feed for better coverage
        
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
        } catch (e) {
          // Keep defaults
        }
        
        const cleanDescription = description
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .trim()
          .substring(0, 200);
        
        const newsItem: NewsItem = {
          title,
          description: cleanDescription || title,
          link,
          pubDate: timeAgo,
          pubDateTimestamp: timestamp,
          source: sourceName,
          category,
          priority: sourcePriority
        };
        newsItem.engagementScore = calculateEngagementScore(newsItem, sourcePriority);
        items.push(newsItem);
      });
    }
    
    return items;
  } catch (error) {
    console.error(`Error parsing RSS feed from ${sourceName}:`, error);
    return [];
  }
}

// In-memory cache for news feeds
const newsCache = new Map<string, { data: NewsItem[], timestamp: number }>();
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes - optimized for fresh content

// Fetch RSS feed with timeout and caching
async function fetchRSSFeed(url: string, sourceName: string, category: string, priority: number = 2, forceRefresh = false): Promise<NewsItem[]> {
  try {
    // Check cache first (unless force refresh)
    const cacheKey = `${category}-${sourceName}`;
    if (!forceRefresh) {
      const cached = newsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    // Using a CORS proxy with timeout
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
      signal: controller.signal,
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch RSS feed from ${sourceName}: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    const items = parseRSSFeed(xmlText, sourceName, category, priority);
    
    // Cache the results
    newsCache.set(cacheKey, { data: items, timestamp: Date.now() });
    
    return items;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.error(`Timeout fetching RSS feed from ${sourceName}`);
    } else {
      console.error(`Error fetching RSS feed from ${sourceName}:`, error);
    }
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'crypto';
    const forceRefresh = searchParams.has('t'); // Check if timestamp parameter exists (force refresh)
    
    if (!RSS_FEEDS[category as keyof typeof RSS_FEEDS]) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const feeds = RSS_FEEDS[category as keyof typeof RSS_FEEDS];
    
    // On force refresh, clear cache for this category
    if (forceRefresh) {
      feeds.forEach(feed => {
        const cacheKey = `${category}-${feed.name}`;
        newsCache.delete(cacheKey);
      });
    }
    
    // If force refresh, fetch ALL feeds; otherwise use priority loading
    if (forceRefresh) {
      // Fetch all feeds in parallel on refresh, sorted by priority
      const allPromises = feeds.map(feed => 
        fetchRSSFeed(feed.url, feed.name, category, feed.priority, true)
      );
      
      const results = await Promise.allSettled(allPromises);
      
      // Combine and flatten all news items
      const allNews: NewsItem[] = results
        .filter((result): result is PromiseFulfilledResult<NewsItem[]> => 
          result.status === 'fulfilled' && result.value.length > 0
        )
        .flatMap(result => result.value)
        // Filter by category relevance
        .filter(item => matchesCategory(item, category));
      
      // Remove duplicates based on title, link, AND content similarity
      const uniqueNews: NewsItem[] = [];
      const seenTitles = new Set<string>();
      const seenLinks = new Set<string>();
      
      // Helper function to extract key words from text
      const extractKeywords = (text: string): Set<string> => {
        const normalized = text.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3); // Only words longer than 3 chars
        return new Set(normalized);
      };
      
      // Helper function to calculate similarity between two articles
      const calculateSimilarity = (item1: NewsItem, item2: NewsItem): number => {
        const keywords1 = extractKeywords(item1.title + ' ' + item1.description);
        const keywords2 = extractKeywords(item2.title + ' ' + item2.description);
        
        const keywords1Array = Array.from(keywords1);
        const keywords2Array = Array.from(keywords2);
        const intersection = new Set(keywords1Array.filter(x => keywords2.has(x)));
        const union = new Set([...keywords1Array, ...keywords2Array]);
        
        return intersection.size / union.size; // Jaccard similarity
      };
      
      allNews.forEach(item => {
        const normalizedTitle = item.title.toLowerCase().trim();
        const normalizedLink = item.link.toLowerCase().trim();
        
        // Skip if exact duplicate
        if (seenTitles.has(normalizedTitle) || seenLinks.has(normalizedLink)) {
          return;
        }
        
        // Check for similar content
        let isSimilar = false;
        for (const existingItem of uniqueNews) {
          const similarity = calculateSimilarity(item, existingItem);
          if (similarity > 0.7) { // 70% similarity threshold
            // Keep the one with higher engagement score
            if ((item.engagementScore || 0) > (existingItem.engagementScore || 0)) {
              // Replace the existing one
              const index = uniqueNews.indexOf(existingItem);
              uniqueNews[index] = item;
              seenTitles.delete(existingItem.title.toLowerCase().trim());
              seenLinks.delete(existingItem.link.toLowerCase().trim());
              seenTitles.add(normalizedTitle);
              seenLinks.add(normalizedLink);
            }
            isSimilar = true;
            break;
          }
        }
        
        if (!isSimilar) {
          seenTitles.add(normalizedTitle);
          seenLinks.add(normalizedLink);
          uniqueNews.push(item);
        }
      });
      
      // Sort by engagement score (prioritizes top headlines + recency)
      uniqueNews.sort((a, b) => {
        const scoreA = a.engagementScore || 0;
        const scoreB = b.engagementScore || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.pubDateTimestamp - a.pubDateTimestamp; // Tie-breaker: most recent
      });
      
      return NextResponse.json({
        category,
        count: uniqueNews.length,
        news: uniqueNews.slice(0, 100) // Return top 100 unique articles for better coverage
      });
    }
    
    // Normal load: Fetch priority 1 sources first, then priority 2, then priority 3 in background
    const priority1Feeds = feeds.filter(f => f.priority === 1);
    const priority2Feeds = feeds.filter(f => f.priority === 2);
    const priority3Feeds = feeds.filter(f => f.priority === 3);
    
    // Fetch priority 1 feeds first (major sources)
    const priorityPromises = priority1Feeds.map(feed => 
      fetchRSSFeed(feed.url, feed.name, category, feed.priority, false)
    );
    
    const priorityResults = await Promise.allSettled(priorityPromises);
    
    // Start background fetches with staggered delays to spread out API calls
    setTimeout(() => {
      priority2Feeds.forEach((feed, index) => {
        setTimeout(() => {
          fetchRSSFeed(feed.url, feed.name, category, feed.priority, false).catch(() => {});
        }, index * 800); // 800ms delay between priority 2 fetches
      });
    }, 1500); // Start priority 2 fetches after 1.5 seconds
    
    setTimeout(() => {
      priority3Feeds.forEach((feed, index) => {
        setTimeout(() => {
          fetchRSSFeed(feed.url, feed.name, category, feed.priority, false).catch(() => {});
        }, index * 1200); // 1.2s delay between priority 3 fetches
      });
    }, 5000); // Start priority 3 fetches after 5 seconds
    
    const results = priorityResults;
    
    // Combine and flatten all news items
    const allNews: NewsItem[] = results
      .filter((result): result is PromiseFulfilledResult<NewsItem[]> => 
        result.status === 'fulfilled' && result.value.length > 0
      )
      .flatMap(result => result.value)
      // Filter by category relevance
      .filter(item => matchesCategory(item, category));
    
    // Remove duplicates based on title, link, AND content similarity
    const uniqueNews: NewsItem[] = [];
    const seenTitles = new Set<string>();
    const seenLinks = new Set<string>();
    
    // Helper function to extract key words from text
    const extractKeywords = (text: string): Set<string> => {
      const normalized = text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3); // Only words longer than 3 chars
      return new Set(normalized);
    };
    
    // Helper function to calculate similarity between two articles
    const calculateSimilarity = (item1: NewsItem, item2: NewsItem): number => {
      const keywords1 = extractKeywords(item1.title + ' ' + item1.description);
      const keywords2 = extractKeywords(item2.title + ' ' + item2.description);
      
      const keywords1Array = Array.from(keywords1);
      const keywords2Array = Array.from(keywords2);
      const intersection = new Set(keywords1Array.filter(x => keywords2.has(x)));
      const union = new Set([...keywords1Array, ...keywords2Array]);
      
      return intersection.size / union.size; // Jaccard similarity
    };
    
    allNews.forEach(item => {
      const normalizedTitle = item.title.toLowerCase().trim();
      const normalizedLink = item.link.toLowerCase().trim();
      
      // Skip if exact duplicate
      if (seenTitles.has(normalizedTitle) || seenLinks.has(normalizedLink)) {
        return;
      }
      
      // Check for similar content
      let isSimilar = false;
      for (const existingItem of uniqueNews) {
        const similarity = calculateSimilarity(item, existingItem);
        if (similarity > 0.7) { // 70% similarity threshold
          // Keep the one with higher engagement score
          if ((item.engagementScore || 0) > (existingItem.engagementScore || 0)) {
            // Replace the existing one
            const index = uniqueNews.indexOf(existingItem);
            uniqueNews[index] = item;
            seenTitles.delete(existingItem.title.toLowerCase().trim());
            seenLinks.delete(existingItem.link.toLowerCase().trim());
            seenTitles.add(normalizedTitle);
            seenLinks.add(normalizedLink);
          }
          isSimilar = true;
          break;
        }
      }
      
      if (!isSimilar) {
        seenTitles.add(normalizedTitle);
        seenLinks.add(normalizedLink);
        uniqueNews.push(item);
      }
    });
    
    // Sort by engagement score (prioritizes top headlines + recency)
    uniqueNews.sort((a, b) => {
      const scoreA = a.engagementScore || 0;
      const scoreB = b.engagementScore || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.pubDateTimestamp - a.pubDateTimestamp; // Tie-breaker: most recent
    });
    
    return NextResponse.json({
      category,
      count: uniqueNews.length,
      sources: feeds.length,
      news: uniqueNews.slice(0, 100) // Return top 100 unique articles for better coverage
    });
    
  } catch (error) {
    console.error('Error in news API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news feeds' },
      { status: 500 }
    );
  }
}
