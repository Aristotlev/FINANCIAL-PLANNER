# News Feed Optimization Guide

## Overview
The news system has been optimized to use **32 free RSS feeds** across all asset classes with intelligent content ranking and prioritization.

## 📰 News Sources by Asset Class

### Crypto (8 Sources)
**Priority 1 (Fetch First)**
- **CoinDesk** - Industry-leading cryptocurrency news
- **CoinTelegraph** - Breaking crypto & blockchain news
- **The Block** - Research-driven crypto journalism

**Priority 2 (Secondary)**
- **Decrypt** - Web3 and crypto culture
- **Bitcoin Magazine** - Bitcoin-focused news
- **Crypto Briefing** - Market analysis and insights

**Priority 3 (Background)**
- **CryptoSlate** - Comprehensive crypto coverage
- **NewsBTC** - Bitcoin and altcoin news

### Stocks (9 Sources)
**Priority 1 (Fetch First)**
- **MarketWatch** - Real-time market news
- **Yahoo Finance** - Comprehensive stock coverage
- **Investing.com** - Global markets and stocks
- **Seeking Alpha** - Investment research & analysis

**Priority 2 (Secondary)**
- **Benzinga** - Fast-breaking market news
- **CNBC** - Business news and analysis
- **Reuters Business** - Global business coverage
- **Barron's** - Investment insights

**Priority 3 (Background)**
- **The Motley Fool** - Long-term investment advice

### Forex (7 Sources)
**Priority 1 (Fetch First)**
- **FXStreet** - Leading forex news portal
- **DailyFX** - Currency market analysis
- **ForexLive** - Real-time forex news

**Priority 2 (Secondary)**
- **Investing.com FX** - Forex-specific coverage
- **FXEmpire** - Trading analysis and signals
- **Finance Magnates** - Financial industry news

**Priority 3 (Background)**
- **Action Forex** - Technical analysis & forecasts

### Indices (8 Sources)
**Priority 1 (Fetch First)**
- **MarketWatch** - Index tracking and analysis
- **Investing.com** - Global indices coverage
- **Reuters Markets** - Market-moving news
- **CNBC Markets** - Stock index news

**Priority 2 (Secondary)**
- **Yahoo Finance Markets** - Index performance
- **Bloomberg** - Premium market insights
- **Financial Times** - Global market analysis

**Priority 3 (Background)**
- **WSJ Markets** - Wall Street coverage

## 🎯 Intelligent Ranking System

### Engagement Score Algorithm
The system calculates an engagement score for each article based on:

1. **Source Priority (20-60 points)**
   - Priority 1 sources: 60 points
   - Priority 2 sources: 40 points
   - Priority 3 sources: 20 points

2. **Recency Bonus (0-30 points)**
   - < 1 hour old: +30 points
   - 1-3 hours old: +20 points
   - 3-6 hours old: +10 points
   - 6-12 hours old: +5 points
   - > 12 hours old: 0 points

3. **Headline Quality (0-50 points)**
   - Breaking news keywords: +5 per keyword
     - "breaking", "exclusive", "major", "surge", "crash", "record", "alert", "announces", "launches", "hits"
   - Optimal title length (60-100 chars): +10 points
   - Detailed description (>100 chars): +5 points

### Maximum Possible Score
- **Priority 1 source with breaking news < 1 hour old**: ~100 points
- **Priority 3 source older news**: ~25-35 points

## ⚡ Optimized Loading Strategy

### Initial Load (Fast)
1. Fetch **Priority 1 sources** immediately (3-4 sources per category)
2. Display results within 2-3 seconds
3. Provide instant user engagement

### Background Loading (Smart)
1. **Priority 2 sources** fetch after 1.5 seconds
   - Staggered with 800ms delays between feeds
2. **Priority 3 sources** fetch after 5 seconds
   - Staggered with 1.2s delays between feeds

### Refresh Strategy
- **Auto-refresh**: Every 15 minutes (silent, no loader)
- **Manual refresh**: Fetches ALL sources with cache bypass
- **Cache duration**: 10 minutes per source

## 📊 Display Prioritization

### Article Ordering
Articles are sorted by:
1. **Primary**: Engagement score (highest first)
2. **Tie-breaker**: Most recent timestamp

This ensures:
- ✅ Major headlines from top sources appear first
- ✅ Breaking news gets priority
- ✅ Quality content is prioritized over quantity
- ✅ Users see most relevant articles immediately

### Articles Displayed
- **Normal load**: Top 25 articles
- **Refresh**: Top 25 articles from all sources
- **Per source**: Maximum 5 articles each

## 🎨 User Interface Features

### News Tabs
- **My News**: Personalized based on portfolio holdings
- **Crypto**: Cryptocurrency & blockchain news
- **Stocks**: Equity markets and trading
- **Forex**: Currency markets and FX
- **Indices**: Global market indices

### Visual Indicators
- **Source badges**: Color-coded by source
- **Time stamps**: Relative time display
- **Engagement hints**: Top headlines highlighted
- **Source count**: Shows number of sources per tab

### Statistics Cards
- Total articles displayed
- Number of sources active
- Live/Real-time indicators
- 24/7 coverage badge

## 🔧 Performance Optimizations

### API Efficiency
1. **Reduced API calls**: Priority-based fetching
2. **Smart caching**: 10-minute cache per source
3. **Timeout protection**: 5-second max per feed
4. **Graceful degradation**: Failed feeds don't block others

### Load Time Improvements
- **First paint**: < 2 seconds (Priority 1 only)
- **Full load**: 8-10 seconds (all sources)
- **Perceived speed**: Instant with cached data

### Bandwidth Optimization
- **Staggered fetching**: Prevents API overload
- **Limited items**: Max 5 per source
- **Description truncation**: 200 characters max

## 📱 Source Reliability

### High Reliability (Priority 1)
- Major news outlets with consistent RSS feeds
- Industry-leading publications
- Regular update schedules

### Medium Reliability (Priority 2)
- Established sources with good coverage
- Regular updates but occasional delays
- Quality content with good SEO

### Lower Priority (Priority 3)
- Niche sources or specialized content
- Less frequent updates
- Supplementary information

## 🚀 Best Practices

### For Users
1. **Refresh manually** for breaking news
2. **Check "My News"** for personalized content
3. **Click through** to full articles for details
4. **Multiple sources** provide balanced coverage

### For Developers
1. **Monitor cache hit rates** to optimize durations
2. **Track failed feeds** to remove unreliable sources
3. **Adjust priorities** based on user engagement
4. **Add sources gradually** to test reliability

## 📈 Future Enhancements

### Potential Improvements
- [ ] Add user preference for source priority
- [ ] Implement read/unread tracking
- [ ] Add bookmark/save functionality
- [ ] Enable filtering by keywords
- [ ] Add sentiment analysis indicators
- [ ] Implement trending topics detection
- [ ] Add notification for breaking news
- [ ] Enable RSS feed customization

### Analytics to Track
- Most-read sources per category
- Average engagement time per source
- Click-through rates by priority
- Cache effectiveness per source
- Failed feed frequency

## 🔐 Compliance & Attribution

### RSS Feed Usage
- All sources used provide **free public RSS feeds**
- Links direct to original source articles
- Source attribution clearly displayed
- No content is copied or republished

### CORS Proxy
- Using `api.allorigins.win` for cross-origin requests
- No authentication required
- Rate limits respected through caching
- Timeout protection implemented

## 📞 Source Contacts

For issues with specific feeds, refer to source documentation:
- Most sources have public RSS documentation
- Check `/feed` or `/rss` endpoints
- Contact source webmaster if feeds are down
- Have backup sources ready per category

---

**Total Sources**: 32 free RSS feeds  
**Coverage**: 24/7 global market news  
**Update Frequency**: Every 15 minutes  
**Cache Strategy**: 10-minute smart caching  
**Load Time**: < 2 seconds initial display  

**Last Updated**: October 19, 2025
