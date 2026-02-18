"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Clock, ExternalLink, Youtube, Play, TrendingUp, Eye, Search, ListFilter, Calendar, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Client-side cache ────────────────────────────────────────────────
// Survives component unmount / re-mount (page navigation) but not a full
// page reload.  Each unique (timeFilter + searchQuery) gets its own slot.
const CLIENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_CLIENT_CACHE_SLOTS = 8;

interface ClientCacheEntry {
  videos: YoutubeVideo[];
  isMock: boolean;
  timestamp: number;
}

const clientCache = new Map<string, ClientCacheEntry>();

function getClientCacheKey(timeFilter: string, search: string) {
  return `${timeFilter}::${search}`;
}

function getClientCache(key: string): ClientCacheEntry | null {
  const entry = clientCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CLIENT_CACHE_TTL) {
    clientCache.delete(key);
    return null;
  }
  return entry;
}

function setClientCache(key: string, videos: YoutubeVideo[], isMock: boolean) {
  // Evict oldest if at capacity
  if (clientCache.size >= MAX_CLIENT_CACHE_SLOTS && !clientCache.has(key)) {
    let oldest: string | null = null;
    let oldestTs = Infinity;
    for (const [k, v] of clientCache) {
      if (v.timestamp < oldestTs) { oldest = k; oldestTs = v.timestamp; }
    }
    if (oldest) clientCache.delete(oldest);
  }
  clientCache.set(key, { videos, isMock, timestamp: Date.now() });
}


interface YoutubeVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
  duration: string;
  thumbnail?: string;
}

// Video Player Modal Component
function VideoPlayerModal({ 
  video, 
  onClose 
}: { 
  video: YoutubeVideo; 
  onClose: () => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Toggle native browser fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Exit fullscreen error:', err);
      });
    }
  }, []);

  // Listen for fullscreen changes (including ESC key exit)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle escape key to close modal (only when not in fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/95"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFullscreen) onClose();
      }}
    >
      <div 
        ref={containerRef}
        className={cn(
          "relative flex flex-col bg-[#0D0D0D]",
          isFullscreen 
            ? "w-full h-full" 
            : "w-full max-w-5xl mx-4 rounded-xl border border-gray-800"
        )}>
        {/* Header - hidden in fullscreen */}
        {!isFullscreen && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800 rounded-t-xl">
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-lg font-semibold text-white truncate">{video.title}</h3>
              <p className="text-sm text-gray-400">{video.channelTitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Fullscreen"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              <a
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Open on YouTube"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Video Player */}
        <div className={cn(
          "relative bg-black",
          isFullscreen ? "w-full h-full" : "aspect-video"
        )}>
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1&fs=1`}
            title={video.title}
            className="absolute inset-0 w-full h-full"
            style={{ border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>

        {/* Fullscreen Controls Overlay */}
        {isFullscreen && (
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-lg font-semibold text-white truncate">{video.title}</h3>
                <p className="text-sm text-gray-300">{video.channelTitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  title="Exit Fullscreen"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  title="Open on YouTube"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Info - hidden in fullscreen */}
        {!isFullscreen && (
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {formatViews(video.viewCount)} views
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTimeAgo(video.publishedAt)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render directly in body, bypassing any parent CSS restrictions
  return createPortal(modalContent, document.body);
}

// Helper functions
function parseDuration(pt: string) {
    if(!pt) return '0:00';
    const match = pt.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '0:00';

    const h = (match[1] || '').replace('H', '');
    const m = (match[2] || '').replace('M', '');
    const s = (match[3] || '').replace('S', '');

    const hours = parseInt(h || '0');
    const minutes = parseInt(m || '0');
    const seconds = parseInt(s || '0');

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatViews(viewCount: string) {
    const num = parseInt(viewCount);
    if(isNaN(num)) return '0';
    if(num >= 1000000) return (num/1000000).toFixed(1) + 'M';
    if(num >= 1000) return (num/1000).toFixed(1) + 'K';
    return num.toString();
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins}m ago`;
    }
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

export function YoutubeFeed() {
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('week'); // 'day', 'week', 'month'
  const [isDataMocked, setIsDataMocked] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YoutubeVideo | null>(null);
  
  // Custom simple debounce
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchVideos = useCallback(async (forceRefresh = false) => {
    const cacheKey = getClientCacheKey(timeFilter, debouncedSearch);

    // ── Check client-side cache first (unless manual refresh) ──
    if (!forceRefresh) {
      const cached = getClientCache(cacheKey);
      if (cached) {
        setVideos(cached.videos);
        setIsDataMocked(cached.isMock);
        setLoading(false);
        setIsRefreshing(false);
        return; // Skip API call — data is still fresh
      }
    }

    try {
        if (forceRefresh) setIsRefreshing(true);
        else setLoading(true);

        // Calculate publishedAfter date based on filter
        const now = new Date();
        if (timeFilter === 'day') now.setDate(now.getDate() - 1);
        else if (timeFilter === 'week') now.setDate(now.getDate() - 7);
        else if (timeFilter === 'month') now.setDate(now.getDate() - 30);
        
        const publishedAfter = now.toISOString();

        const params = new URLSearchParams({
            publishedAfter,
            order: 'viewCount', // Viral first
            maxResults: '30'
        });
        
        if (debouncedSearch) {
            params.append('q', debouncedSearch);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout (fetches from 26 channels)

        const response = await fetch(`/api/youtube?${params.toString()}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            // Handle non-2xx responses gracefully
            console.error('YouTube API returned error status:', response.status);
            setIsDataMocked(true);
            setVideos([]);
            return;
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const isMock = !!data.isMock;
            setIsDataMocked(isMock);
            const mappedVideos: YoutubeVideo[] = data.items.map((item: any) => ({
                id: item.id?.videoId || `video-${Math.random()}`,
                videoId: item.id?.videoId || '',
                title: item.snippet?.title || 'Untitled',
                description: item.snippet?.description || '',
                channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
                publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
                viewCount: item.statistics?.viewCount || '0',
                duration: item.contentDetails?.duration || 'PT0S',
                thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || ''
            }));
            setVideos(mappedVideos);

            // ── Persist to client-side cache ──
            setClientCache(cacheKey, mappedVideos, isMock);
        } else {
            console.warn('No items found in response', data);
            setIsDataMocked(!!data.isMock);
            setVideos([]);
        }

    } catch (error: any) {
        // Don't log network errors during development/page transitions
        if (error?.name !== 'AbortError' && error?.message !== 'Failed to fetch') {
            console.error('Failed to fetch videos:', error);
        }
        setVideos([]);
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  }, [debouncedSearch, timeFilter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleRefresh = () => {
    fetchVideos(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Youtube className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Viral Finance</h2>
                <p className="text-sm text-gray-500">Most viewed finance videos curated for you</p>
              </div>
            </div>

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

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                      type="text" 
                      placeholder="Search keywords (e.g. CPI, Fed, Earnings)..." 
                      className="w-full bg-[#0D0D0D] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
              
              <div className="flex items-center gap-2 bg-[#0D0D0D] border border-gray-800 rounded-lg p-1">
                  <button 
                    onClick={() => setTimeFilter('day')}
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                        timeFilter === 'day' ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    24h
                  </button>
                  <button 
                    onClick={() => setTimeFilter('week')}
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                        timeFilter === 'week' ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    Week
                  </button>
                  <button 
                    onClick={() => setTimeFilter('month')}
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                        timeFilter === 'month' ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    Month
                  </button>
              </div>
          </div>
      </div>

      {isDataMocked && (
        <div className="bg-yellow-900/20 border border-yellow-800 text-yellow-200 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
          <div className="mt-0.5">⚠️</div>
          <div>
            <p className="font-semibold">Using mock data</p>
            <p className="text-yellow-200/70 mt-1">
              The YouTube API key has security restrictions preventing server-side access (HTTP Referrer blocked). 
              To see real data, update the API key restrictions in Google Cloud Console to allow this server's IP or remove referrer restrictions for development.
            </p>
          </div>
        </div>
      )}

      {loading && videos.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl bg-[#0D0D0D] border border-gray-800 animate-pulse overflow-hidden">
                  <div className="aspect-video bg-gray-800 w-full" />
                  <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-800 rounded w-3/4" />
                      <div className="h-3 bg-gray-800 rounded w-1/2" />
                  </div>
              </div>
            ))}
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.length > 0 ? (
                videos.map((video) => (
                <article 
                    key={video.id}
                    className="group relative flex flex-col rounded-xl bg-[#0D0D0D] border border-gray-800 transition-all hover:border-gray-700 hover:bg-[#111] overflow-hidden cursor-pointer"
                    onClick={() => setSelectedVideo(video)}
                >
                    {/* Thumbnail */}
                    <div className="relative aspect-video block overflow-hidden">
                        <img 
                            src={video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} 
                            alt={video.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {parseDuration(video.duration)}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-red-600 rounded-full p-3 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                <Play className="w-6 h-6 text-white fill-current" />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-base font-semibold text-gray-100 group-hover:text-blue-400 transition-colors line-clamp-2" title={video.title}>
                                {video.title}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 overflow-hidden font-bold">
                                {video.channelTitle.charAt(0)}
                            </div>
                            <span className="text-sm text-gray-400 font-medium truncate">
                                {video.channelTitle}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-gray-800/50">
                            <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {formatViews(video.viewCount)} views
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimeAgo(video.publishedAt)}
                            </div>
                        </div>
                    </div>
                </article>
                ))
            ) : (
                <div className="col-span-full py-20 text-center text-gray-500">
                    <p>No videos found for your search.</p>
                </div>
            )}
          </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayerModal 
          video={selectedVideo} 
          onClose={() => setSelectedVideo(null)} 
        />
      )}
    </div>
  );
}
