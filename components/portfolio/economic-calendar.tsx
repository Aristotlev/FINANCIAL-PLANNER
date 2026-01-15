"use client";

import { useEffect, useState, useMemo } from 'react';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  RefreshCw, 
  AlertCircle,
  Clock,
  Globe
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Preloader } from '../ui/preloader';

interface EconomicEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  currency: string;
  impact: 'High' | 'Medium' | 'Low';
  event: string;
  previous: string;
  forecast: string;
  actual: string;
  url: string; // Direct link to event details
}

export function EconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [filterImpact, setFilterImpact] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

  // Load events
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const res = await fetch('/api/calendar');
        const data = await res.json();
        if (data && data.events) {
          setEvents(data.events);
        }
      } catch (err) {
        console.error("Failed to load calendar events", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  // Get unique dates from events or at least today + next 6 days
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    // Default range
    for(let i=0; i<7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        dates.add(d.toISOString().split('T')[0]);
    }
    // Add from events
    events.forEach(e => dates.add(e.date));
    return Array.from(dates).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
       const dateMatch = viewMode === 'day' ? e.date === selectedDate : true;
       // For week view, we might want to range filter, but assuming all fetched events are recent/relevant
       // mock api returns ~7 days of data.
       
       const impactMatch = filterImpact === 'All' ? true : e.impact === filterImpact;
       return dateMatch && impactMatch;
    });
  }, [events, selectedDate, filterImpact, viewMode]);

  // Group by date for week/list view
  const groupedEvents = useMemo(() => {
     const groups: Record<string, EconomicEvent[]> = {};
     filteredEvents.forEach(e => {
         if (!groups[e.date]) groups[e.date] = [];
         groups[e.date].push(e);
     });
     // Sort within groups
     Object.keys(groups).forEach(k => {
         groups[k].sort((a,b) => a.time.localeCompare(b.time));
     });
     return groups;
  }, [filteredEvents]);

  const getImpactColor = (impact: string) => {
      switch(impact) {
          case 'High': return 'text-red-500 bg-red-500/10 border-red-500/20';
          case 'Medium': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
          case 'Low': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
          default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      }
  };

  const getImpactBadge = (impact: string) => {
      switch(impact) {
          case 'High': return (
              <div className="flex gap-0.5">
                  <div className="w-1.5 h-4 bg-red-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-red-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-red-500 rounded-sm"></div>
              </div>
          );
          case 'Medium': return (
            <div className="flex gap-0.5 opacity-80">
                <div className="w-1.5 h-4 bg-orange-500 rounded-sm"></div>
                <div className="w-1.5 h-4 bg-orange-500 rounded-sm"></div>
                <div className="w-1.5 h-4 bg-gray-700 rounded-sm"></div>
            </div>
          );
          case 'Low': return (
            <div className="flex gap-0.5 opacity-60">
                <div className="w-1.5 h-4 bg-yellow-500 rounded-sm"></div>
                <div className="w-1.5 h-4 bg-gray-700 rounded-sm"></div>
                <div className="w-1.5 h-4 bg-gray-700 rounded-sm"></div>
            </div>
          );
          default: return null;
      }
  }

  const getCurrencyFlag = (currency: string) => {
    switch (currency) {
      case 'USD': return '🇺🇸';
      case 'EUR': return '🇪🇺';
      case 'GBP': return '🇬🇧';
      case 'JPY': return '🇯🇵';
      case 'CAD': return '🇨🇦';
      case 'AUD': return '🇦🇺';
      case 'NZD': return '🇳🇿';
      case 'CHF': return '🇨🇭';
      case 'CNY': return '🇨🇳';
      case 'INR': return '🇮🇳';
      case 'BRL': return '🇧🇷';
      case 'RUB': return '🇷🇺';
      case 'ZAR': return '🇿🇦';
      case 'BTC': return '₿';
      case 'ETH': return 'Ξ';
      default: return currency;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
             <p className="text-gray-400">Loading Economic Calendar...</p>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-blue-400" />
                  Economic Calendar
              </h2>
              <p className="text-sm text-gray-400">Upcoming global economic events and indicators</p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#0D0D0D] p-1 rounded-lg border border-gray-800">
              <button 
                onClick={() => setFilterImpact('All')}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", filterImpact === 'All' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white')}
              >
                  All
              </button>
              <button 
                onClick={() => setFilterImpact('High')}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", filterImpact === 'High' ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white')}
              >
                  High Impact
              </button>
          </div>
      </div>

       {/* Date Selector Row */}
       <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {availableDates.map(date => {
              const d = new Date(date);
              const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
              const dayNum = d.getDate();
              const isToday = date === new Date().toISOString().split('T')[0];
              const isSelected = selectedDate === date;

              return (
                  <button
                    key={date}
                    onClick={() => { setSelectedDate(date); setViewMode('day'); }}
                    className={cn(
                        "flex flex-col items-center justify-center min-w-[60px] h-[64px] rounded-xl border transition-all",
                        isSelected 
                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105" 
                            : isToday 
                                ? "bg-[#1A1A1A] border-blue-500/50 text-blue-400" 
                                : "bg-[#0D0D0D] border-gray-800 text-gray-400 hover:border-gray-700 hover:bg-[#1A1A1A]"
                    )}
                  >
                      <span className="text-xs font-medium uppercase opacity-70">{dayName}</span>
                      <span className="text-lg font-bold">{dayNum}</span>
                      {isToday && <span className="w-1 h-1 rounded-full bg-blue-400 mt-1"></span>}
                  </button>
              )
          })}
       </div>

       {/* Events List */}
       <div className="space-y-8">
          {Object.keys(groupedEvents).sort().map(date => (
              <div key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Date Header if in list mode or multiple dates shown - for single day view, mainly informative */}
                  <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
                      <span className="text-sm font-medium text-gray-400 border border-gray-800 rounded-full px-4 py-1 bg-[#0D0D0D]">
                          {formatDate(date)}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
                  </div>

                  <div className="bg-[#0D0D0D] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#141414] border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3 font-medium w-24">Time</th>
                                    <th className="px-6 py-3 font-medium w-20 text-center">Impact</th>
                                    <th className="px-6 py-3 font-medium">Event</th>
                                    <th className="px-6 py-3 font-medium text-right w-32">Actual</th>
                                    <th className="px-6 py-3 font-medium text-right w-32">Forecast</th>
                                    <th className="px-6 py-3 font-medium text-right w-32">Previous</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {groupedEvents[date].map((event) => (
                                    <tr key={event.id} className="group hover:bg-[#1A1A1A] transition-colors">
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-400 font-mono">
                                            {event.time}
                                        </td>
                                        <td className="px-6 py-4 flex justify-center">
                                            {getImpactBadge(event.impact)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-2xl text-gray-200 border border-gray-700" title={event.currency}>
                                                    {getCurrencyFlag(event.currency)}
                                                </span>
                                                <a 
                                                    href={event.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-medium text-gray-200 hover:text-blue-400 hover:underline hover:decoration-blue-400 transition-colors flex items-center gap-2 group/link"
                                                >
                                                    {event.event}
                                                    <Globe className="w-3 h-3 opacity-0 -ml-1 transition-all group-hover/link:opacity-50 group-hover/link:ml-0" />
                                                </a>
                                            </div>
                                        </td>
                                        <td className={cn(
                                            "px-6 py-4 text-sm font-bold text-right",
                                            event.actual ? "text-white" : "text-gray-600"
                                        )}>
                                            {event.actual || '--'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400 text-right">
                                            {event.forecast || '--'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 text-right">
                                            {event.previous || '--'}
                                        </td>
                                    </tr>
                                ))}
                                {groupedEvents[date].length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No events scheduled for this period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                      </div>
                  </div>
              </div>
          ))}
          
          {Object.keys(groupedEvents).length === 0 && (
             <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                 <AlertCircle className="w-10 h-10 mb-4 opacity-50" />
                 <p className="text-lg">No events found matching your filter</p>
                 <button 
                    onClick={() => setFilterImpact('All')}
                    className="mt-4 text-sm text-blue-400 hover:text-blue-300 underline"
                 >
                     Clear filters
                 </button>
             </div>
          )}
       </div>
    </div>
  );
}
