"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Square,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  Settings,
  ChevronDown,
  ChevronUp,
  FileText,
  TrendingUp,
  Bell,
} from 'lucide-react';

interface MonitorStatus {
  isRunning: boolean;
  startedAt?: string;
  lastPollAt?: string;
  filingsProcessed: number;
  errors: number;
  watchlistSize: number;
  formTypes: string[];
}

interface MonitorConfig {
  userAgent: string;
  pollInterval: number;
  maxFilingsPerPoll: number;
  webhookEnabled: boolean;
  rateLimit: number;
}

export function SECMonitorPanel() {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [config, setConfig] = useState<MonitorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sec/monitor');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
        setConfig(data.config);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    
    // Poll status every 30 seconds when running
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(action);
    try {
      const response = await fetch('/api/sec/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gray-800 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-gray-800 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status?.isRunning ? 'bg-green-500/20' : 'bg-gray-700'}`}>
              {status?.isRunning ? (
                <Wifi className="h-5 w-5 text-green-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">SEC Filing Monitor</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  status?.isRunning 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {status?.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                {status?.isRunning 
                  ? `Last poll: ${formatTime(status.lastPollAt)}` 
                  : 'Background monitoring inactive'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-gray-800 p-4 space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex flex-wrap gap-2">
                {!status?.isRunning ? (
                  <button
                    onClick={() => handleAction('start')}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading === 'start' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start Monitor
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('stop')}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading === 'stop' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Stop Monitor
                  </button>
                )}
                <button
                  onClick={() => handleAction('restart')}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {actionLoading === 'restart' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Restart
                </button>
                <button
                  onClick={fetchStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                >
                  <Activity className="h-4 w-4" />
                  Refresh Status
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <FileText className="h-3.5 w-3.5" />
                    Filings Processed
                  </div>
                  <div className="text-xl font-semibold">{status?.filingsProcessed || 0}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Watchlist Size
                  </div>
                  <div className="text-xl font-semibold">{status?.watchlistSize || 0}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Errors
                  </div>
                  <div className={`text-xl font-semibold ${(status?.errors || 0) > 0 ? 'text-red-400' : ''}`}>
                    {status?.errors || 0}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    Poll Interval
                  </div>
                  <div className="text-xl font-semibold">
                    {config ? formatDuration(config.pollInterval) : '-'}
                  </div>
                </div>
              </div>

              {/* Configuration Details */}
              {config && (
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Settings className="h-4 w-4 text-gray-400" />
                    Configuration
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">User-Agent:</span>
                      <span className="text-gray-200 truncate max-w-[200px]">{config.userAgent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rate Limit:</span>
                      <span className="text-gray-200">{config.rateLimit} req/sec</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Filings/Poll:</span>
                      <span className="text-gray-200">{config.maxFilingsPerPoll}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Webhook:</span>
                      <span className={config.webhookEnabled ? 'text-green-400' : 'text-gray-500'}>
                        {config.webhookEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  {status?.formTypes && status.formTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                      <span className="text-gray-400 text-sm">Monitoring:</span>
                      {status.formTypes.map(form => (
                        <span 
                          key={form}
                          className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs"
                        >
                          {form}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Timestamps */}
              {status?.startedAt && (
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Started: {new Date(status.startedAt).toLocaleString()}
                  </div>
                  {status.lastPollAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last Poll: {formatTime(status.lastPollAt)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SECMonitorPanel;
