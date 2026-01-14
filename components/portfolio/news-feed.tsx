"use client";

import { useEffect, useState } from 'react';
import { RefreshCw, Clock, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils'; // Assuming this exists based on previous file reads

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  pubDateTimestamp: number;
  source: string;
  category: string;
  engagementScore?: number;
}

interface NewsFeedProps {
  category: string;
}

const STORAGE_KEY_PREFIX = 'omnifolio-news-cache-';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache invalidation for new fetch

export function NewsFeed({ category }: NewsFeedProps) {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNews = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      // Check local storage cache first if not forcing refresh
      if (!forceRefresh) {
        const cached = localStorage.getItem(`${STORAGE_KEY_PREFIX}${category}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          // If cache is fresh enough (e.g. < 15 mins) use it immediately
          if (age < CACHE_DURATION) {
            setArticles(filterOldArticles(data));
            setLastUpdated(timestamp);
            setLoading(false);
            return;
          }
        }
      }

      // Fetch from API
      const response = await fetch(`/api/news?category=${category}${forceRefresh ? '&t=' + Date.now() : ''}`);
      const data = await response.json();

      if (data.news) {
        const validArticles = filterOldArticles(data.news);
        setArticles(validArticles);
        
        const timestamp = Date.now();
        setLastUpdated(timestamp);
        
        // Update cache
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${category}`, JSON.stringify({
          data: validArticles,
          timestamp
        }));
      }
    } catch (error) {
      console.error("Failed to fetch news:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Filter out articles older than 48 hours
  const filterOldArticles = (items: NewsItem[]) => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    return items.filter(item => item.pubDateTimestamp > fortyEightHoursAgo);
  };

  useEffect(() => {
    fetchNews();
  }, [category]);

  const handleRefresh = () => {
    fetchNews(true);
  };

  if (loading && articles.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-[#0D0D0D] border border-gray-800 animate-pulse p-6 relative overflow-hidden">
             <div className="h-4 bg-gray-800 rounded w-1/3 mb-4"></div>
             <div className="h-6 bg-gray-800 rounded w-3/4 mb-3"></div>
             <div className="h-20 bg-gray-800 rounded w-full mb-4"></div>
             <div className="absolute bottom-6 left-6 right-6 flex justify-between">
                <div className="h-3 bg-gray-800 rounded w-1/4"></div>
                <div className="h-3 bg-gray-800 rounded w-1/4"></div>
             </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold capitalize">{category} News</h2>
            <span className="text-sm text-gray-400 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-800">
                {articles.length} articles
            </span>
        </div>
        <div className="flex items-center gap-4">
            {lastUpdated && (
                <span className="text-xs text-gray-500 hidden sm:block">
                    Updated {new Date(lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            )}
            <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors border border-gray-800 text-gray-300",
                    isRefreshing && "opacity-70 cursor-not-allowed"
                )}
            >
                <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                Refresh
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article, index) => (
          <article 
            key={`${article.link}-${index}`}
            className="group relative flex flex-col justify-between rounded-xl bg-[#0D0D0D] border border-gray-800 p-6 transition-all hover:border-gray-700 hover:bg-[#111]"
          >
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-400 px-2 py-1 bg-blue-400/10 rounded-full">
                        {article.source}
                    </span>
                    <div className="flex items-center text-xs text-gray-500 gap-1">
                        <Clock className="w-3 h-3" />
                        {article.pubDate}
                    </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-100 group-hover:text-blue-400 transition-colors line-clamp-2">
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="focus:outline-none">
                        <span className="absolute inset-0" aria-hidden="true" />
                        {article.title}
                    </a>
                </h3>
                
                <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                    {article.description}
                </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800/50 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   {/* Sentiment indicator placeholder - logic based on title keywords */}
                   {getSentimentIcon(article.title)}
                </div>
                <span className="text-xs text-gray-500 flex items-center gap-1 group-hover:text-gray-300 transition-colors">
                    Read more <ExternalLink className="w-3 h-3" />
                </span>
            </div>
          </article>
        ))}
      </div>

       {articles.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-500">
          <p>No suitable articles found within the last 48 hours.</p>
          <button onClick={handleRefresh} className="mt-4 text-blue-400 hover:underline">Try Refreshing</button>
        </div>
      )}
    </div>
  );
}

function getSentimentIcon(title: string) {
    const lowercaseTitle = title.toLowerCase();
    const positiveWords = ['surge', 'soar', 'jump', 'rally', 'record', 'high', 'gain', 'bull', 'growth'];
    const negativeWords = ['drop', 'fall', 'plunge', 'crash', 'loss', 'bear', 'down', 'decline', 'risk'];

    if (positiveWords.some(w => lowercaseTitle.includes(w))) {
        return <span className="text-green-500 flex items-center text-xs font-medium gap-1"><TrendingUp className="w-3 h-3" /> Bullish</span>;
    }
    if (negativeWords.some(w => lowercaseTitle.includes(w))) {
        return <span className="text-red-500 flex items-center text-xs font-medium gap-1"><TrendingDown className="w-3 h-3" /> Bearish</span>;
    }
    return <span className="text-gray-500 flex items-center text-xs font-medium gap-1"><Minus className="w-3 h-3" /> Neutral</span>;
}
