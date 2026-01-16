"use client";

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Clock, ExternalLink, Heart, Repeat2, MessageCircle, Bookmark, Eye, Twitter, AlertCircle, TrendingUp, Globe, DollarSign, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_profile_image?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    bookmark_count: number;
    impression_count: number;
  };
  is_relevant: boolean;
  matched_keywords: string[];
}

interface TwitterApiResponse {
  success: boolean;
  count: number;
  total_fetched: number;
  tweets: Tweet[];
  last_updated: string;
  error?: string;
}

const STORAGE_KEY = 'omnifolio-twitter-cache';
const CACHE_DURATION = 60 * 1000; // 1 minute (Real-time updates)

// Categorize keywords
const CATEGORY_MAP: Record<string, { icon: typeof TrendingUp; label: string; color: string }> = {
  politics: { icon: Globe, label: 'Politics', color: 'text-purple-400 bg-purple-400/10' },
  geopolitics: { icon: Globe, label: 'Geopolitics', color: 'text-cyan-400 bg-cyan-400/10' },
  finance: { icon: DollarSign, label: 'Finance', color: 'text-green-400 bg-green-400/10' },
};

const POLITICS_KEYWORDS = [
  'politics', 'president', 'congress', 'senate', 'election', 'vote', 'campaign',
  'democrat', 'republican', 'gop', 'liberal', 'conservative', 'government',
  'legislation', 'policy', 'maga', 'america first', 'biden', 'trump',
  'white house', 'capitol', 'supreme court', 'bill', 'law', 'regulation'
];

const GEOPOLITICS_KEYWORDS = [
  'china', 'russia', 'ukraine', 'nato', 'eu', 'europe', 'asia', 'middle east',
  'war', 'conflict', 'sanctions', 'tariff', 'trade war', 'diplomacy', 'treaty',
  'border', 'immigration', 'military', 'defense', 'nuclear', 'alliance',
  'iran', 'israel', 'gaza', 'taiwan', 'north korea', 'putin', 'xi'
];

const FINANCE_KEYWORDS = [
  'economy', 'stock', 'market', 'crypto', 'bitcoin', 'doge', 'dogecoin', 'tesla',
  'inflation', 'fed', 'federal reserve', 'interest rate', 'gdp', 'recession',
  'tax', 'tariff', 'trade', 'dollar', 'currency', 'investment', 'investor',
  'wall street', 'nasdaq', 'dow', 's&p', 'sec', 'bank', 'banking',
  'spacex', 'twitter', 'x corp', 'business', 'company', 'corporation',
  'oil', 'energy', 'gold', 'commodity', 'price', 'billion', 'trillion',
  'job', 'employment', 'unemployment', 'wage', 'debt', 'deficit', 'budget',
  'starlink', 'neuralink', 'grok', 'ai', 'artificial intelligence',
  'd.o.g.e', 'department of government efficiency'
];

function getCategoryFromKeywords(keywords: string[]): 'politics' | 'geopolitics' | 'finance' {
  let politicsScore = 0;
  let geopoliticsScore = 0;
  let financeScore = 0;

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (POLITICS_KEYWORDS.includes(lowerKeyword)) politicsScore++;
    if (GEOPOLITICS_KEYWORDS.includes(lowerKeyword)) geopoliticsScore++;
    if (FINANCE_KEYWORDS.includes(lowerKeyword)) financeScore++;
  }

  if (financeScore >= politicsScore && financeScore >= geopoliticsScore) return 'finance';
  if (geopoliticsScore >= politicsScore) return 'geopolitics';
  return 'politics';
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TweetCard({ tweet }: { tweet: Tweet }) {
  const category = getCategoryFromKeywords(tweet.matched_keywords);
  const categoryInfo = CATEGORY_MAP[category];
  const CategoryIcon = categoryInfo.icon;

  // Parse tweet text and highlight mentions/hashtags
  const parseTweetText = (text: string) => {
    const parts = text.split(/(@\w+|#\w+|https?:\/\/\S+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <a
            key={index}
            href={`https://twitter.com/${part.substring(1)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-blue-400">
            {part}
          </span>
        );
      }
      if (part.startsWith('http')) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline truncate inline-block max-w-[200px] align-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {part.replace(/https?:\/\//, '').substring(0, 30)}...
          </a>
        );
      }
      return part;
    });
  };

  return (
    <article
      className="group relative flex flex-col rounded-xl bg-[#0D0D0D] border border-gray-800 p-5 transition-all hover:border-gray-700 hover:bg-[#111] cursor-pointer"
      onClick={() => window.open(`https://twitter.com/${tweet.author_username}/status/${tweet.id}`, '_blank')}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {tweet.author_profile_image ? (
            <img
              src={tweet.author_profile_image.replace('_normal', '_bigger')}
              alt={tweet.author_name}
              className="w-12 h-12 rounded-full border border-gray-700"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
              <Twitter className="w-6 h-6 text-gray-500" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{tweet.author_name}</span>
              {(tweet.author_username === 'elonmusk' || tweet.author_username === 'realDonaldTrump') && (
                <svg viewBox="0 0 22 22" className="w-5 h-5 text-blue-400 fill-current">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              )}
            </div>
            <span className="text-gray-500 text-sm">@{tweet.author_username}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${categoryInfo.color}`}>
            <CategoryIcon className="w-3 h-3" />
            {categoryInfo.label}
          </span>
        </div>
      </div>

      {/* Tweet Content */}
      <p className="text-gray-100 text-[15px] leading-relaxed mb-4 whitespace-pre-wrap">
        {parseTweetText(tweet.text)}
      </p>

      {/* Keywords */}
      {tweet.matched_keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tweet.matched_keywords.slice(0, 5).map((keyword, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700"
            >
              <Tag className="w-2.5 h-2.5 inline mr-1" />
              {keyword}
            </span>
          ))}
          {tweet.matched_keywords.length > 5 && (
            <span className="text-xs text-gray-500">
              +{tweet.matched_keywords.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Footer with metrics */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
        <div className="flex items-center gap-4">
          {tweet.public_metrics && (
            <>
              <span className="flex items-center gap-1.5 text-gray-500 text-sm hover:text-red-400 transition-colors">
                <Heart className="w-4 h-4" />
                {formatNumber(tweet.public_metrics.like_count)}
              </span>
              <span className="flex items-center gap-1.5 text-gray-500 text-sm hover:text-green-400 transition-colors">
                <Repeat2 className="w-4 h-4" />
                {formatNumber(tweet.public_metrics.retweet_count)}
              </span>
              <span className="flex items-center gap-1.5 text-gray-500 text-sm hover:text-blue-400 transition-colors">
                <MessageCircle className="w-4 h-4" />
                {formatNumber(tweet.public_metrics.reply_count)}
              </span>
              {tweet.public_metrics.impression_count > 0 && (
                <span className="flex items-center gap-1.5 text-gray-500 text-sm">
                  <Eye className="w-4 h-4" />
                  {formatNumber(tweet.public_metrics.impression_count)}
                </span>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(tweet.created_at)}
        </div>
      </div>
    </article>
  );
}

export function TwitterFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'politics' | 'geopolitics' | 'finance'>('all');

  const fetchTweets = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Check cache first
      if (!forceRefresh) {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setTweets(data);
            setLastUpdated(new Date(timestamp).toISOString());
            setLoading(false);
            return;
          }
        }
      }

      const response = await fetch(`/api/twitter?t=${Date.now()}`);
      const data: TwitterApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch tweets');
      }

      setTweets(data.tweets);
      setLastUpdated(data.last_updated);

      // Update cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: data.tweets,
        timestamp: Date.now()
      }));

    } catch (err) {
      console.error('Failed to fetch tweets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tweets');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTweets();
  }, [fetchTweets]);

  const handleRefresh = () => {
    fetchTweets(true);
  };

  // Filter tweets based on category
  const filteredTweets = filter === 'all' 
    ? tweets 
    : tweets.filter(tweet => getCategoryFromKeywords(tweet.matched_keywords) === filter);

  if (loading && tweets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Twitter className="w-6 h-6 text-[#1DA1F2]" />
            <h2 className="text-2xl font-bold">Twitter Feed</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-[#0D0D0D] border border-gray-800 animate-pulse p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-800" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-800 rounded w-32" />
                  <div className="h-3 bg-gray-800 rounded w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-800 rounded w-full" />
                <div className="h-4 bg-gray-800 rounded w-5/6" />
                <div className="h-4 bg-gray-800 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#1DA1F2]/10">
            <Twitter className="w-6 h-6 text-[#1DA1F2]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Twitter Feed</h2>
            <p className="text-sm text-gray-500">Curated market insights from key influencers & institutions</p>
          </div>
          <span className="text-sm text-gray-400 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-800">
            {filteredTweets.length} tweets
          </span>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-gray-500 hidden sm:block">
              Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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



      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load tweets</p>
            <p className="text-sm text-red-400/80">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="ml-auto px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tweets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} />
        ))}
      </div>

      {/* Empty State */}
      {filteredTweets.length === 0 && !loading && !error && (
        <div className="text-center py-20 text-gray-500">
          <Twitter className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No relevant tweets found</p>
          <p className="text-sm mt-2">
            {filter !== 'all' 
              ? `No ${filter} tweets available. Try switching to a different category.`
              : 'Check back later for updates from market movers.'}
          </p>
          <button onClick={handleRefresh} className="mt-4 text-blue-400 hover:underline">
            Try Refreshing
          </button>
        </div>
      )}
    </div>
  );
}
