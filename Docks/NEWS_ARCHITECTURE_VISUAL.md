# News System Architecture - Visual Guide

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ My News  │  Crypto  │  Stocks  │  Forex   │ Indices  │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│                              ↓                                   │
│                    [Refresh Button] 🔄                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                   │
│                  /api/news?category=X                           │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   PRIORITY ROUTER                         │  │
│  │  ┌──────────────┬──────────────┬──────────────┐          │  │
│  │  │ Priority 1   │ Priority 2   │ Priority 3   │          │  │
│  │  │ (Immediate)  │ (+1.5s delay)│ (+5s delay)  │          │  │
│  │  └──────┬───────┴──────┬───────┴──────┬───────┘          │  │
│  └─────────┼──────────────┼──────────────┼──────────────────┘  │
└────────────┼──────────────┼──────────────┼─────────────────────┘
             ↓              ↓              ↓
┌────────────────────────────────────────────────────────────────┐
│                       CACHE LAYER                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  In-Memory Cache (10-minute TTL per source)              │  │
│  │                                                           │  │
│  │  [CoinDesk]──[Cached]─→ Hit! Return cached data         │  │
│  │  [Yahoo]────[Expired]─→ Miss! Fetch new data            │  │
│  │  [Reuters]──[Not Found]→ Miss! Fetch new data           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬───────────────────────────────────────┘
                         │ (on cache miss)
                         ↓
┌────────────────────────────────────────────────────────────────┐
│                    CORS PROXY LAYER                             │
│           https://api.allorigins.win/raw?url=...               │
│                         ↓                                       │
│              [5-second timeout protection]                      │
└────────────────────────┬───────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│                   RSS FEED SOURCES (32)                         │
│  ┌──────────────┬──────────────┬──────────────┬─────────────┐ │
│  │   CRYPTO(8)  │  STOCKS(9)   │  FOREX(7)    │ INDICES(8)  │ │
│  │              │              │              │             │ │
│  │ • CoinDesk   │• MarketWatch │• FXStreet    │• MarketWatch│ │
│  │ • CoinTelegr │• Yahoo Fin   │• DailyFX     │• Investing  │ │
│  │ • The Block  │• Investing   │• ForexLive   │• Reuters    │ │
│  │ • Decrypt    │• Seeking α   │• FXEmpire    │• CNBC       │ │
│  │ • Bitcoin Mag│• Benzinga    │• Action FX   │• Yahoo      │ │
│  │ • Crypto Brf │• CNBC        │• Fin Magnate │• Bloomberg  │ │
│  │ • CryptoSlate│• Reuters     │• Investing FX│• FT         │ │
│  │ • NewsBTC    │• Barron's    │              │• WSJ        │ │
│  │              │• Motley Fool │              │             │ │
│  └──────────────┴──────────────┴──────────────┴─────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Loading Timeline

```
TIME    PRIORITY 1          PRIORITY 2          PRIORITY 3
─────────────────────────────────────────────────────────────
0.0s    │ Fetch starts
        │ (3-4 sources)
        ↓
        │ MarketWatch
        │ CoinDesk
        │ FXStreet
        │ Reuters
        ↓
2.0s    ├─► Display! ◄───── FIRST CONTENT VISIBLE
        │
1.5s    │                   │ Fetch starts
        │                   │ (4-5 sources)
        │                   ↓
        │                   │ Benzinga
        │                   │ Decrypt
        │                   │ FXEmpire
        ↓                   ↓
3.3s    │                   ├─► Update Display
        │                   │
        │                   ↓
4.1s    │                   ├─► Update Display
        │
5.0s    │                   │                   │ Fetch starts
        │                   │                   │ (2-3 sources)
        │                   │                   ↓
        │                   │                   │ CryptoSlate
        │                   │                   │ Motley Fool
        ↓                   ↓                   ↓
6.2s    │                   │                   ├─► Update Display
        │                   │                   │
7.4s    │                   │                   ├─► Update Display
        ↓                   ↓                   ↓
8-10s   └──────────────────ALL SOURCES LOADED──────────────────┘
```

---

## 🎯 Engagement Score Calculation

```
┌─────────────────────────────────────────────────────────────┐
│               ENGAGEMENT SCORE ALGORITHM                     │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ↓                                   ↓
   ┌──────────┐                      ┌──────────┐
   │ SOURCE   │                      │ RECENCY  │
   │ PRIORITY │                      │  BONUS   │
   └────┬─────┘                      └────┬─────┘
        │                                 │
        │ Priority 1 → 60 pts             │ <1hr  → 30 pts
        │ Priority 2 → 40 pts             │ 1-3hr → 20 pts
        │ Priority 3 → 20 pts             │ 3-6hr → 10 pts
        │                                 │ 6-12hr→  5 pts
        │                                 │ >12hr →  0 pts
        │                                 │
        └────────────┬────────────────────┘
                     ↓
              ┌─────────────┐
              │   HEADLINE  │
              │   QUALITY   │
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
    [Keywords]  [Length]   [Description]
    5pts each   10pts      5pts
    (breaking,  (60-100    (>100 chars)
     major,     chars)
     surge,
     crash,
     etc.)
        │            │            │
        └────────────┴────────────┘
                     ↓
         ┌───────────────────────┐
         │   TOTAL SCORE         │
         │   (0-150 points)      │
         └───────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │   SORT ARTICLES       │
         │   Highest → Lowest    │
         └───────────────────────┘
```

### Score Examples:

```
┌──────────────────────────────────────────────────────────────────┐
│ Example 1: BREAKING NEWS FROM PRIORITY 1 SOURCE                 │
├──────────────────────────────────────────────────────────────────┤
│ Source: CoinDesk (Priority 1)                 = 60 points        │
│ Published: 30 minutes ago                     = 30 points        │
│ Title: "Breaking: Bitcoin Hits Record High"                      │
│   - Contains "Breaking"                       = +5 points         │
│   - Contains "Record"                         = +5 points         │
│   - Length 42 chars (not optimal)             = 0 points          │
│ Description: 150 characters                   = 5 points          │
│                                                                   │
│ TOTAL SCORE: 105 points ★★★★★ (TOP HEADLINE)                    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Example 2: QUALITY ARTICLE FROM PRIORITY 2 SOURCE               │
├──────────────────────────────────────────────────────────────────┤
│ Source: Benzinga (Priority 2)                 = 40 points        │
│ Published: 2 hours ago                        = 20 points        │
│ Title: "Apple Announces Major AI Integration Strategy Update"   │
│   - Contains "Announces"                      = +5 points         │
│   - Contains "Major"                          = +5 points         │
│   - Length 62 chars (optimal!)                = +10 points        │
│ Description: 180 characters                   = 5 points          │
│                                                                   │
│ TOTAL SCORE: 85 points ★★★★ (HIGH PRIORITY)                     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Example 3: OLDER ARTICLE FROM PRIORITY 3 SOURCE                 │
├──────────────────────────────────────────────────────────────────┤
│ Source: The Motley Fool (Priority 3)          = 20 points        │
│ Published: 15 hours ago                       = 0 points          │
│ Title: "Long-term investment strategy"                           │
│   - No keywords                               = 0 points          │
│   - Length 35 chars (too short)               = 0 points          │
│ Description: 80 characters (too short)        = 0 points          │
│                                                                   │
│ TOTAL SCORE: 20 points ★ (LOWER PRIORITY)                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Cache Flow Diagram

```
                     ┌──────────────┐
                     │ API REQUEST  │
                     │  /api/news   │
                     └──────┬───────┘
                            │
                            ↓
                   ┌────────────────┐
                   │ Check Category │
                   │ (crypto/stocks │
                   │ /forex/indices)│
                   └────────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              ↓                           ↓
      ┌───────────────┐           ┌──────────────┐
      │ Force Refresh?│           │ Normal Load? │
      │  (?t=timestamp)│           │              │
      └───────┬───────┘           └──────┬───────┘
              │                          │
              │ YES                      │ NO
              ↓                          ↓
      ┌───────────────┐         ┌────────────────┐
      │ Clear Cache   │         │ Check Cache    │
      │ for Category  │         │ for Each Source│
      └───────┬───────┘         └────────┬───────┘
              │                          │
              │                ┌─────────┴──────────┐
              │                ↓                    ↓
              │        ┌──────────────┐    ┌────────────┐
              │        │ Cache HIT    │    │ Cache MISS │
              │        │ (< 10 min)   │    │ or Expired │
              │        └──────┬───────┘    └─────┬──────┘
              │               │                   │
              │               ↓                   ↓
              │        ┌──────────────┐    ┌────────────┐
              │        │ Return Cached│    │ Fetch Fresh│
              │        │     Data     │    │   from RSS │
              │        └──────┬───────┘    └─────┬──────┘
              │               │                   │
              │               │                   ↓
              │               │            ┌────────────┐
              │               │            │ Parse XML  │
              │               │            └─────┬──────┘
              │               │                   │
              │               │                   ↓
              │               │            ┌────────────┐
              │               │            │ Store in   │
              │               │            │   Cache    │
              │               │            └─────┬──────┘
              │               │                   │
              └───────────────┴───────────────────┘
                              │
                              ↓
                     ┌────────────────┐
                     │ Combine Results│
                     └────────┬───────┘
                              │
                              ↓
                     ┌────────────────┐
                     │ Calculate      │
                     │ Engagement     │
                     │ Scores         │
                     └────────┬───────┘
                              │
                              ↓
                     ┌────────────────┐
                     │ Sort by Score  │
                     │ (Highest First)│
                     └────────┬───────┘
                              │
                              ↓
                     ┌────────────────┐
                     │ Return Top 25  │
                     │   Articles     │
                     └────────────────┘
```

---

## 📊 Source Distribution Chart

```
CATEGORY BREAKDOWN:

CRYPTO (8 sources = 25%)
████████░░░░░░░░░░░░░░░░░░░░░░ 25%

STOCKS (9 sources = 28%)
█████████░░░░░░░░░░░░░░░░░░░░░ 28%

FOREX (7 sources = 22%)
███████░░░░░░░░░░░░░░░░░░░░░░░ 22%

INDICES (8 sources = 25%)
████████░░░░░░░░░░░░░░░░░░░░░░ 25%

───────────────────────────────────
TOTAL: 32 SOURCES


PRIORITY DISTRIBUTION:

Priority 1 (13 sources = 41%)
█████████████░░░░░░░░░░░░░░░░░ 41%

Priority 2 (14 sources = 44%)
██████████████░░░░░░░░░░░░░░░░ 44%

Priority 3 (5 sources = 16%)
█████░░░░░░░░░░░░░░░░░░░░░░░░░ 16%

───────────────────────────────────
TOTAL: 32 SOURCES
```

---

## 🔄 Auto-Refresh Cycle

```
TIME: 00:00 (Initial Load)
├─► User opens News Card
├─► Priority 1 sources fetch (0-2s)
├─► Priority 2 sources fetch (1.5-5s)
└─► Priority 3 sources fetch (5-10s)
    │
    ↓ [Cache: 10min TTL per source]
    │
TIME: 15:00 (Auto-refresh #1)
├─► Silent background refresh
├─► Fetch only EXPIRED cache entries
└─► Update displayed articles
    │
    ↓
TIME: 30:00 (Auto-refresh #2)
├─► Silent background refresh
├─► Fetch only EXPIRED cache entries
└─► Update displayed articles
    │
    ↓
... continues every 15 minutes
```

---

## 📱 Responsive Layout

```
DESKTOP VIEW (>1024px):
┌─────────────────────────────────────────────────────────┐
│  NEWS CARD                                              │
│  ┌────────┬────────┬────────┬────────┬────────┐        │
│  │My News │ Crypto │ Stocks │ Forex  │Indices │[Refresh]│
│  └────────┴────────┴────────┴────────┴────────┘        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ News Sources: CoinDesk, MarketWatch, FXStreet..│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌───┬───┬───┬───┐                                     │
│  │ 5 │ 8 │Liv│24/│  ← Stats                           │
│  └───┴───┴───┴───┘                                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📰 Bitcoin Surges Past $65K... [2 hrs ago]     │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📰 Ethereum Upgrade Shows Growth... [4 hrs]    │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📰 Stocks Rally on Fed Decision... [1 hr]      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘


MOBILE VIEW (<768px):
┌───────────────────────┐
│  NEWS CARD            │
│  ┌─┬─┬─┬─┬─┐          │
│  │M│C│S│F│I│ [🔄]    │ ← Horizontal scroll
│  └─┴─┴─┴─┴─┘          │
│                       │
│  ┌─────────────────┐  │
│  │Sources: 8       │  │
│  └─────────────────┘  │
│                       │
│  ┌───┬───┐           │
│  │ 5 │Liv│           │ ← 2-col stats
│  └───┴───┘           │
│  ┌───┬───┐           │
│  │ 8 │24/│           │
│  └───┴───┘           │
│                       │
│  ┌─────────────────┐  │
│  │ 📰 Bitcoin...   │  │
│  │ 2 hrs ago       │  │
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │ 📰 Ethereum...  │  │
│  │ 4 hrs ago       │  │
│  └─────────────────┘  │
└───────────────────────┘
```

---

## 🎨 Color Coding System

```
SOURCE COLORS (Brand Colors):

Crypto:
 ▓ CoinDesk      #FF6B35 (Orange-Red)
 ▓ CoinTelegraph #00D4AA (Teal)
 ▓ The Block     #1A1A1A (Dark)
 ▓ Decrypt       #0052FF (Blue)
 ▓ Bitcoin Mag   #5B67E5 (Purple-Blue)
 ▓ Crypto Brief  #7C3AED (Purple)
 ▓ CryptoSlate   #4A5568 (Gray)
 ▓ NewsBTC       #F7931A (Bitcoin Orange)

Stocks:
 ▓ MarketWatch   #0066CC (Blue)
 ▓ Yahoo Finance #720E9E (Purple)
 ▓ Investing.com #FF7700 (Orange)
 ▓ Seeking Alpha #FF7A00 (Orange)
 ▓ Benzinga      #F08518 (Orange)
 ▓ CNBC          #0099CC (Light Blue)
 ▓ Reuters       #FF6600 (Orange-Red)
 ▓ Barron's      #0080C9 (Blue)
 ▓ Motley Fool   #D9232D (Red)

Forex:
 ▓ FXStreet      #1E40AF (Dark Blue)
 ▓ DailyFX       #059669 (Green)
 ▓ ForexLive     #DC2626 (Red)
 ▓ Investing FX  #7C3AED (Purple)
 ▓ FXEmpire      #0052FF (Blue)
 ▓ Action Forex  #2563EB (Blue)
 ▓ Fin Magnates  #F59E0B (Amber)

Indices:
 ▓ MarketWatch   #0088CC (Blue)
 ▓ Investing.com #005EB8 (Dark Blue)
 ▓ Reuters       #FF6600 (Orange)
 ▓ CNBC Markets  #0099CC (Light Blue)
 ▓ Yahoo Finance #720E9E (Purple)
 ▓ Bloomberg     #000000 (Black)
 ▓ Financial Times #FFF1E5 (Cream)
 ▓ WSJ Markets   #0274B6 (Blue)
```

---

## 🎯 Decision Tree: Which Priority?

```
START: New RSS Source
    │
    ↓
    ┌─────────────────────────────┐
    │ Is it a MAJOR news outlet?  │
    │ (Top 3-4 in category)       │
    └────┬────────────────┬───────┘
         │ YES            │ NO
         ↓                ↓
    ┌─────────┐     ┌─────────────────────────┐
    │Priority │     │ Does it update hourly   │
    │   1     │     │ or more frequently?     │
    └─────────┘     └────┬──────────────┬─────┘
                         │ YES          │ NO
                         ↓              ↓
                    ┌─────────┐   ┌─────────┐
                    │Priority │   │Priority │
                    │   2     │   │   3     │
                    └─────────┘   └─────────┘

EXAMPLES:
Priority 1: CoinDesk, MarketWatch, FXStreet, Reuters
Priority 2: Benzinga, Decrypt, FXEmpire, Bloomberg
Priority 3: Motley Fool, CryptoSlate, Action Forex
```

---

**Architecture Version**: 2.0  
**Last Updated**: October 19, 2025  
**Complexity**: Medium  
**Scalability**: High  
**Maintainability**: Excellent
