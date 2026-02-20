/**
 * OmniFolio Economic Calendar
 * 
 * Clean, proprietary economic calendar backed by Supabase DB.
 * Shows global economic events with country flags, impact bars,
 * and forecast/previous/actual values.
 * 
 * Copyright OmniFolio. All rights reserved.
 */

"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  countryName: string;
  flag: string;
  event: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
}

interface APIResponse {
  success: boolean;
  events: EconomicEvent[];
  total: number;
  source?: string;
  error?: string;
  dateRange?: { from: string; to: string };
}

// ─── Constants ────────────────────────────────────────────────────────

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

// ─── Helpers ──────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getWeekDates(centerDate: Date): string[] {
  const dates: string[] = [];
  const start = new Date(centerDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(fmtDate(d));
  }
  return dates;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatDateShort(dateStr: string): { day: string; dayNum: number } {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: d.getDate(),
  };
}

function checkIsToday(dateStr: string): boolean {
  return dateStr === fmtDate(new Date());
}

// ─── Component ────────────────────────────────────────────────────────

export function EconomicCalendar() {
  // ── State ───────────────────────────────────────────
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');

  const [selectedDate, setSelectedDate] = useState<string>(fmtDate(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Date Range ──────────────────────────────────────
  const weekDates = useMemo(() => {
    const center = new Date();
    center.setDate(center.getDate() + (weekOffset * 7));
    return getWeekDates(center);
  }, [weekOffset]);

  const dateRange = useMemo(() => {
    if (weekDates.length === 0) return { from: fmtDate(new Date()), to: fmtDate(new Date()) };
    return { from: weekDates[0], to: weekDates[weekDates.length - 1] };
  }, [weekDates]);

  // ── Data Fetching ───────────────────────────────────
  const fetchEvents = useCallback(async (showLoadingState = true) => {
    try {
      if (showLoadingState) setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
      });

      const res = await fetch(`/api/calendar/economic?${params}`);
      const data: APIResponse = await res.json();

      if (data.success) {
        setEvents(data.events || []);
        setSource(data.source || 'unknown');
      } else {
        setError(data.error || 'Failed to load events');
        setEvents([]);
      }
    } catch (err) {
      console.error('[EconomicCalendar] Fetch error:', err);
      setError('Unable to connect to data source');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchEvents();
    refreshTimerRef.current = setInterval(() => {
      fetchEvents(false);
    }, AUTO_REFRESH_MS);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchEvents]);

  // ── Derived Data ────────────────────────────────────
  const dayEvents = useMemo(() => {
    return events.filter(e => e.date === selectedDate);
  }, [events, selectedDate]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, EconomicEvent[]> = {};
    dayEvents.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return groups;
  }, [dayEvents]);

  // ── Handlers ────────────────────────────────────────
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEvents(false);
  };

  const navigateWeek = (direction: number) => {
    setWeekOffset(prev => prev + direction);
  };

  // ── Render Helpers ──────────────────────────────────

  const renderImpactBars = (impact: string) => {
    const level = impact.toLowerCase();
    const configs: Record<string, { count: number; color: string }> = {
      high: { count: 3, color: 'bg-red-500' },
      medium: { count: 2, color: 'bg-orange-500' },
      low: { count: 1, color: 'bg-yellow-500' },
      holiday: { count: 0, color: 'bg-gray-600' },
    };
    const { count, color } = configs[level] || { count: 0, color: 'bg-gray-600' };
    return (
      <div className="flex gap-0.5 items-end h-4" title={`${impact} impact`}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={cn(
              'w-1.5 rounded-sm transition-colors',
              i < count ? color : 'bg-gray-700/40',
              i === 0 ? 'h-2' : i === 1 ? 'h-3' : 'h-4'
            )}
          />
        ))}
      </div>
    );
  };

  // ── Loading State ───────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
        <p className="text-gray-400">Loading Economic Calendar...</p>
      </div>
    );
  }

  // ── Main Render ─────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-400" />
            Economic Calendar
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Global economic events &amp; indicators
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Source dot */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-600 mr-2">
            <div className={cn(
              'w-1.5 h-1.5 rounded-full',
              source === 'refreshed' ? 'bg-green-500' : source === 'database' ? 'bg-blue-500' : 'bg-gray-600'
            )} />
            {source === 'refreshed' ? 'Live' : source === 'database' ? 'Cached' : '...'}
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg border border-gray-800 bg-[#0D0D0D] text-gray-400 hover:text-white hover:border-gray-700 transition-all disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Week Navigation ─────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 rounded-lg border border-gray-800 bg-[#0D0D0D] text-gray-400 hover:text-white hover:border-gray-700 transition-all flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {weekDates.map(date => {
            const { day, dayNum } = formatDateShort(date);
            const isTodayDate = checkIsToday(date);
            const isSelected = selectedDate === date;
            const dayEventCount = events.filter(e => e.date === date).length;
            const highCount = events.filter(e => e.date === date && e.impact === 'high').length;

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[56px] h-[68px] rounded-xl border transition-all flex-shrink-0',
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105'
                    : isTodayDate
                      ? 'bg-[#1A1A1A] border-blue-500/40 text-blue-400'
                      : 'bg-[#0D0D0D] border-gray-800 text-gray-400 hover:border-gray-700 hover:bg-[#1A1A1A]'
                )}
              >
                <span className="text-[10px] font-medium uppercase opacity-70">{day}</span>
                <span className="text-lg font-bold leading-tight">{dayNum}</span>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {isTodayDate && <span className="w-1 h-1 rounded-full bg-blue-400" />}
                  {highCount > 0 && <span className="w-1 h-1 rounded-full bg-red-500" />}
                  {dayEventCount > 0 && highCount === 0 && <span className="w-1 h-1 rounded-full bg-gray-600" />}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => navigateWeek(1)}
          className="p-2 rounded-lg border border-gray-800 bg-[#0D0D0D] text-gray-400 hover:text-white hover:border-gray-700 transition-all flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {weekOffset !== 0 && (
          <button
            onClick={() => { setWeekOffset(0); setSelectedDate(fmtDate(new Date())); }}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-800 bg-[#0D0D0D] text-blue-400 hover:bg-[#1A1A1A] transition-all flex-shrink-0"
          >
            Today
          </button>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={handleRefresh} className="text-red-300 hover:text-white underline text-xs">
            Retry
          </button>
        </div>
      )}

      {/* ── Day Header ──────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
        <span className={cn(
          'text-sm font-medium border rounded-full px-4 py-1',
          checkIsToday(selectedDate)
            ? 'border-blue-500/30 text-blue-400 bg-blue-500/5'
            : 'border-gray-800 text-gray-400 bg-[#0D0D0D]'
        )}>
          {checkIsToday(selectedDate) ? '📍 Today — ' : ''}{formatDateDisplay(selectedDate)}
          <span className="ml-2 text-gray-600">({dayEvents.length} events)</span>
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
      </div>

      {/* ── Events Table ────────────────────────────── */}
      {dayEvents.length > 0 ? (
        <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-[#0A0A0A] border-b border-gray-800 text-[11px] text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium w-16">Time</th>
                  <th className="px-4 py-3 font-medium w-10 text-center">
                    <span title="Impact Level">⚡</span>
                  </th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium text-right w-24">Actual</th>
                  <th className="px-4 py-3 font-medium text-right w-24">Forecast</th>
                  <th className="px-4 py-3 font-medium text-right w-24">Previous</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {dayEvents.map(event => (
                  <tr
                    key={event.id}
                    className={cn(
                      'group hover:bg-[#141414] transition-colors',
                      event.impact === 'high' && 'border-l-2 border-l-red-500/30'
                    )}
                  >
                    {/* Time */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 opacity-50" />
                        {event.time || '—'}
                      </span>
                    </td>

                    {/* Impact */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {renderImpactBars(event.impact)}
                      </div>
                    </td>

                    {/* Event + Flag + Country */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-800/80 text-lg border border-gray-700/50 flex-shrink-0"
                          title={event.countryName}
                        >
                          {event.flag}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-200 truncate">
                            {event.event}
                          </div>
                          <span className="text-[10px] text-gray-600">
                            {event.countryName} · {event.country}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actual */}
                    <td className={cn(
                      'px-4 py-3 text-sm text-right font-mono',
                      event.actual
                        ? 'text-white font-semibold'
                        : 'text-gray-700'
                    )}>
                      {event.actual || '—'}
                    </td>

                    {/* Forecast */}
                    <td className="px-4 py-3 text-sm text-gray-400 text-right font-mono">
                      {event.forecast || '—'}
                    </td>

                    {/* Previous */}
                    <td className="px-4 py-3 text-sm text-gray-500 text-right font-mono">
                      {event.previous || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <CalendarDays className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No events</p>
          <p className="text-sm mt-1 text-gray-600">
            No economic events scheduled for this day
          </p>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────── */}
      <div className="flex items-center justify-between text-[10px] text-gray-600 border-t border-gray-800/50 pt-3">
        <span>OmniFolio Economic Calendar • Data refreshes every 30 min</span>
        <span>{dayEvents.length} events</span>
      </div>
    </div>
  );
}
