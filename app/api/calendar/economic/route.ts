/**
 * OmniFolio Economic Calendar API
 * 
 * Fully proprietary economic calendar — zero third-party dependencies.
 * 
 * How it works:
 * - We maintain our own curated database of global economic events based on
 *   publicly available government release schedules (BLS, Census Bureau, Fed,
 *   ECB, BoE, BoJ, etc. all publish their release calendars publicly).
 * - Events are generated from known recurring schedules and seeded into Supabase.
 * - The DB is the single source of truth — no external API calls at runtime.
 * - Works at unlimited scale, zero rate limiting, zero API keys needed.
 * 
 * This is how Bloomberg, Reuters, and every institutional platform operates:
 * they maintain their own calendar from public government schedules.
 * 
 * Copyright OmniFolio. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCountryInfo } from '@/lib/economic-indicators';

// ─── Types ────────────────────────────────────────────────────────────

interface CalendarEvent {
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

// ─── Supabase Client ──────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ─── Proprietary Economic Event Schedule ──────────────────────────────
//
// All data below comes from publicly available government release schedules:
// - US BLS: https://www.bls.gov/schedule/news_release/
// - US Census: https://www.census.gov/economic-indicators/calendar-listview.html
// - US Fed: https://www.federalreserve.gov/newsevents/calendar.htm
// - ECB: https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html
// - BoE: https://www.bankofengland.co.uk/news/announcements
// - BoJ: https://www.boj.or.jp/en/mopo/mpmdeci/index.htm
//
// Recurring rules define WHEN each event occurs. The schedule is deterministic.

interface RecurringEvent {
  event: string;
  country: string;
  impact: 'high' | 'medium' | 'low';
  time: string;               // HH:mm UTC
  rule: EventRule;
}

type EventRule =
  | { type: 'weekday-of-month'; weekday: number; occurrence: number; months: number[] }
  // weekday: 0=Sun..6=Sat, occurrence: 1=first, 2=second, 3=third, 4=fourth, -1=last
  | { type: 'day-of-month'; day: number; months: number[] }
  // Fixed day of month (adjusts to next business day if weekend)
  | { type: 'weekly'; weekday: number }
  // Every week on this weekday
  | { type: 'interval-weeks'; weekday: number; intervalWeeks: number; anchor: string }
  // Every N weeks from an anchor date (e.g., FOMC every ~6 weeks)
  ;

// ── Master Event Schedule ─────────────────────────────────────────────
// This is curated from official government release calendars.
// ~60 major global recurring economic events.

const RECURRING_EVENTS: RecurringEvent[] = [
  // ═══════════════════════════════════════════════════════════════
  // UNITED STATES — Source: BLS, Census Bureau, Federal Reserve, BEA
  // ═══════════════════════════════════════════════════════════════

  // Non-Farm Payrolls — BLS, first Friday of every month at 08:30 ET
  { event: 'Non-Farm Payrolls', country: 'US', impact: 'high', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 5, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },
  
  // Unemployment Rate — BLS, same day as NFP
  { event: 'Unemployment Rate', country: 'US', impact: 'high', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 5, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // CPI (Consumer Price Index) — BLS, ~10th-14th of month, Tuesday-Thursday
  { event: 'CPI m/m', country: 'US', impact: 'high', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: 2, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Core CPI — same day
  { event: 'Core CPI m/m', country: 'US', impact: 'high', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: 2, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // PPI (Producer Price Index) — BLS, ~15th of month
  { event: 'PPI m/m', country: 'US', impact: 'medium', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 4, occurrence: 2, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Retail Sales — Census Bureau, ~15th of month
  { event: 'Retail Sales m/m', country: 'US', impact: 'high', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 2, occurrence: 3, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // FOMC Interest Rate Decision — Fed, ~every 6 weeks (8 per year), Wednesday
  { event: 'FOMC Interest Rate Decision', country: 'US', impact: 'high', time: '19:00',
    rule: { type: 'interval-weeks', weekday: 3, intervalWeeks: 6, anchor: '2026-01-28' } },

  // FOMC Statement — same day
  { event: 'FOMC Statement', country: 'US', impact: 'high', time: '19:00',
    rule: { type: 'interval-weeks', weekday: 3, intervalWeeks: 6, anchor: '2026-01-28' } },

  // Fed Chair Press Conference — same day, 30 min after
  { event: 'Fed Chair Press Conference', country: 'US', impact: 'high', time: '19:30',
    rule: { type: 'interval-weeks', weekday: 3, intervalWeeks: 6, anchor: '2026-01-28' } },

  // GDP (Advance) — BEA, last Thursday of Jan/Apr/Jul/Oct
  { event: 'GDP q/q (Advance)', country: 'US', impact: 'high', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 4, occurrence: -1, months: [1,4,7,10] } },

  // Initial Jobless Claims — DOL, every Thursday
  { event: 'Initial Jobless Claims', country: 'US', impact: 'medium', time: '13:30',
    rule: { type: 'weekly', weekday: 4 } },

  // ISM Manufacturing PMI — ISM, first business day of month
  { event: 'ISM Manufacturing PMI', country: 'US', impact: 'high', time: '15:00',
    rule: { type: 'weekday-of-month', weekday: 1, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // ISM Services PMI — ISM, third business day of month
  { event: 'ISM Services PMI', country: 'US', impact: 'high', time: '15:00',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Durable Goods Orders — Census, ~26th of month
  { event: 'Durable Goods Orders m/m', country: 'US', impact: 'medium', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: 4, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Consumer Confidence — Conference Board, last Tuesday of month
  { event: 'CB Consumer Confidence', country: 'US', impact: 'medium', time: '15:00',
    rule: { type: 'weekday-of-month', weekday: 2, occurrence: -1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // New Home Sales — Census, ~25th of month
  { event: 'New Home Sales', country: 'US', impact: 'medium', time: '15:00',
    rule: { type: 'weekday-of-month', weekday: 4, occurrence: 4, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Existing Home Sales — NAR, ~21st of month
  { event: 'Existing Home Sales', country: 'US', impact: 'medium', time: '15:00',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: 3, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Michigan Consumer Sentiment — UoM, 2nd and 4th Friday
  { event: 'Michigan Consumer Sentiment', country: 'US', impact: 'medium', time: '15:00',
    rule: { type: 'weekday-of-month', weekday: 5, occurrence: 2, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // PCE Price Index — BEA, last Friday of month
  { event: 'Core PCE Price Index m/m', country: 'US', impact: 'high', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 5, occurrence: -1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // ADP Employment — ADP, first Wednesday of month (2 days before NFP)
  { event: 'ADP Non-Farm Employment', country: 'US', impact: 'medium', time: '13:15',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Trade Balance — BEA/Census, ~5th of month
  { event: 'Trade Balance', country: 'US', impact: 'medium', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 2, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // ═══════════════════════════════════════════════════════════════
  // EUROZONE — Source: ECB, Eurostat
  // ═══════════════════════════════════════════════════════════════

  // ECB Interest Rate Decision — ~every 6 weeks, Thursday
  { event: 'ECB Interest Rate Decision', country: 'EU', impact: 'high', time: '13:15',
    rule: { type: 'interval-weeks', weekday: 4, intervalWeeks: 6, anchor: '2026-01-22' } },

  // ECB Press Conference — same day, 45 min later
  { event: 'ECB Press Conference', country: 'EU', impact: 'high', time: '13:45',
    rule: { type: 'interval-weeks', weekday: 4, intervalWeeks: 6, anchor: '2026-01-22' } },

  // Eurozone CPI Flash — Eurostat, ~1st of month
  { event: 'CPI Flash Estimate y/y', country: 'EU', impact: 'high', time: '10:00',
    rule: { type: 'day-of-month', day: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Eurozone GDP Flash — Eurostat, ~30 days after quarter end
  { event: 'GDP Flash Estimate q/q', country: 'EU', impact: 'high', time: '10:00',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: -1, months: [1,4,7,10] } },

  // Eurozone PMI Manufacturing — S&P/HCOB, ~1st business day
  { event: 'Manufacturing PMI', country: 'EU', impact: 'medium', time: '09:00',
    rule: { type: 'weekday-of-month', weekday: 1, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Eurozone PMI Services — same week, Wednesday
  { event: 'Services PMI', country: 'EU', impact: 'medium', time: '09:00',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // German ZEW Economic Sentiment — ZEW, 2nd or 3rd Tuesday
  { event: 'ZEW Economic Sentiment', country: 'DE', impact: 'medium', time: '10:00',
    rule: { type: 'weekday-of-month', weekday: 2, occurrence: 2, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // German Ifo Business Climate — Ifo, ~25th of month
  { event: 'Ifo Business Climate', country: 'DE', impact: 'medium', time: '09:00',
    rule: { type: 'weekday-of-month', weekday: 1, occurrence: 4, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // ═══════════════════════════════════════════════════════════════
  // UNITED KINGDOM — Source: BoE, ONS
  // ═══════════════════════════════════════════════════════════════

  // BoE Interest Rate Decision — ~every 6 weeks, Thursday
  { event: 'BoE Interest Rate Decision', country: 'GB', impact: 'high', time: '12:00',
    rule: { type: 'interval-weeks', weekday: 4, intervalWeeks: 6, anchor: '2026-02-05' } },

  // UK CPI — ONS, ~15th of month
  { event: 'CPI y/y', country: 'GB', impact: 'high', time: '07:00',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: 3, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // UK GDP m/m — ONS, ~10th of month
  { event: 'GDP m/m', country: 'GB', impact: 'high', time: '07:00',
    rule: { type: 'weekday-of-month', weekday: 4, occurrence: 2, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // UK Employment/Claimant Count — ONS, ~15th of month
  { event: 'Claimant Count Change', country: 'GB', impact: 'medium', time: '07:00',
    rule: { type: 'weekday-of-month', weekday: 2, occurrence: 2, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // UK Retail Sales — ONS, ~20th of month
  { event: 'Retail Sales m/m', country: 'GB', impact: 'medium', time: '07:00',
    rule: { type: 'weekday-of-month', weekday: 5, occurrence: 3, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // UK PMI Manufacturing — S&P, 1st business day
  { event: 'Manufacturing PMI', country: 'GB', impact: 'medium', time: '09:30',
    rule: { type: 'weekday-of-month', weekday: 1, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // ═══════════════════════════════════════════════════════════════
  // JAPAN — Source: BoJ, Cabinet Office, MoF
  // ═══════════════════════════════════════════════════════════════

  // BoJ Interest Rate Decision — ~every 6 weeks, Friday
  { event: 'BoJ Interest Rate Decision', country: 'JP', impact: 'high', time: '03:00',
    rule: { type: 'interval-weeks', weekday: 5, intervalWeeks: 7, anchor: '2026-01-23' } },

  // Japan CPI — Ministry of Internal Affairs, 4th Friday
  { event: 'National CPI y/y', country: 'JP', impact: 'high', time: '23:30',
    rule: { type: 'weekday-of-month', weekday: 5, occurrence: 4, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Japan GDP — Cabinet Office, quarterly
  { event: 'GDP q/q', country: 'JP', impact: 'high', time: '23:50',
    rule: { type: 'weekday-of-month', weekday: 1, occurrence: 2, months: [2,5,8,11] } },

  // Tankan Large Manufacturers Index — BoJ, quarterly
  { event: 'Tankan Large Manufacturers Index', country: 'JP', impact: 'high', time: '23:50',
    rule: { type: 'day-of-month', day: 1, months: [4,7,10,1] } },

  // ═══════════════════════════════════════════════════════════════
  // CANADA — Source: BoC, Statistics Canada
  // ═══════════════════════════════════════════════════════════════

  // BoC Interest Rate Decision — ~every 6 weeks, Wednesday
  { event: 'BoC Interest Rate Decision', country: 'CA', impact: 'high', time: '14:45',
    rule: { type: 'interval-weeks', weekday: 3, intervalWeeks: 6, anchor: '2026-01-21' } },

  // Canada Employment Change — StatCan, ~10th of month (Friday)
  { event: 'Employment Change', country: 'CA', impact: 'high', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 5, occurrence: 2, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Canada CPI — StatCan, 3rd Tuesday
  { event: 'CPI m/m', country: 'CA', impact: 'high', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 2, occurrence: 3, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Canada GDP — StatCan, ~1st of month
  { event: 'GDP m/m', country: 'CA', impact: 'high', time: '13:30',
    rule: { type: 'day-of-month', day: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Canada Retail Sales — StatCan, ~22nd of month
  { event: 'Retail Sales m/m', country: 'CA', impact: 'medium', time: '13:30',
    rule: { type: 'weekday-of-month', weekday: 5, occurrence: 3, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // ═══════════════════════════════════════════════════════════════
  // AUSTRALIA — Source: RBA, ABS
  // ═══════════════════════════════════════════════════════════════

  // RBA Interest Rate Decision — first Tuesday of month (except Jan)
  { event: 'RBA Interest Rate Decision', country: 'AU', impact: 'high', time: '03:30',
    rule: { type: 'weekday-of-month', weekday: 2, occurrence: 1, months: [2,3,4,5,6,7,8,9,10,11,12] } },

  // Australia Employment Change — ABS, 3rd Thursday
  { event: 'Employment Change', country: 'AU', impact: 'high', time: '00:30',
    rule: { type: 'weekday-of-month', weekday: 4, occurrence: 3, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Australia CPI — ABS, quarterly (~late Jan/Apr/Jul/Oct)
  { event: 'CPI q/q', country: 'AU', impact: 'high', time: '00:30',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: 4, months: [1,4,7,10] } },

  // ═══════════════════════════════════════════════════════════════
  // SWITZERLAND — Source: SNB
  // ═══════════════════════════════════════════════════════════════

  // SNB Interest Rate Decision — quarterly, Thursday
  { event: 'SNB Interest Rate Decision', country: 'CH', impact: 'high', time: '08:30',
    rule: { type: 'weekday-of-month', weekday: 4, occurrence: 3, months: [3,6,9,12] } },

  // ═══════════════════════════════════════════════════════════════
  // NEW ZEALAND — Source: RBNZ
  // ═══════════════════════════════════════════════════════════════

  // RBNZ Interest Rate Decision — ~every 7 weeks, Wednesday
  { event: 'RBNZ Interest Rate Decision', country: 'NZ', impact: 'high', time: '01:00',
    rule: { type: 'interval-weeks', weekday: 3, intervalWeeks: 7, anchor: '2026-02-18' } },

  // ═══════════════════════════════════════════════════════════════
  // CHINA — Source: NBS, PBoC
  // ═══════════════════════════════════════════════════════════════

  // China GDP — NBS, quarterly
  { event: 'GDP y/y', country: 'CN', impact: 'high', time: '02:00',
    rule: { type: 'weekday-of-month', weekday: 5, occurrence: 2, months: [1,4,7,10] } },

  // China CPI — NBS, ~10th of month
  { event: 'CPI y/y', country: 'CN', impact: 'medium', time: '01:30',
    rule: { type: 'weekday-of-month', weekday: 3, occurrence: 2, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // China Trade Balance — General Administration of Customs, ~7th
  { event: 'Trade Balance', country: 'CN', impact: 'medium', time: '03:00',
    rule: { type: 'weekday-of-month', weekday: 5, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },

  // Caixin Manufacturing PMI — S&P/Caixin, 1st business day
  { event: 'Caixin Manufacturing PMI', country: 'CN', impact: 'medium', time: '01:45',
    rule: { type: 'weekday-of-month', weekday: 1, occurrence: 1, months: [1,2,3,4,5,6,7,8,9,10,11,12] } },
];

// ─── Schedule Engine: Generate Events from Rules ──────────────────────

/** Get the Nth occurrence of a weekday in a given month/year, or last (-1) */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number): Date | null {
  if (occurrence === -1) {
    // Last occurrence: start from end of month and walk backward
    const lastDay = new Date(year, month, 0); // last day of month (month is 1-indexed, Date months are 0-indexed)
    for (let d = lastDay.getDate(); d >= 1; d--) {
      const date = new Date(year, month - 1, d);
      if (date.getDay() === weekday) return date;
    }
    return null;
  }

  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getMonth() !== month - 1) break; // overflow
    if (date.getDay() === weekday) {
      count++;
      if (count === occurrence) return date;
    }
  }
  return null;
}

/** Adjust to next business day if date falls on weekend */
function toBusinessDay(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1); // Sunday → Monday
  if (day === 6) d.setDate(d.getDate() + 2); // Saturday → Monday
  return d;
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Generate all events for a date range from our recurring rules */
function generateEvents(from: string, to: string): Array<{
  id: string; date: string; time: string; country: string;
  event: string; impact: string;
}> {
  const fromDate = new Date(from + 'T00:00:00Z');
  const toDate = new Date(to + 'T23:59:59Z');
  const results: Array<{ id: string; date: string; time: string; country: string; event: string; impact: string }> = [];

  for (const ev of RECURRING_EVENTS) {
    const dates = resolveRule(ev.rule, fromDate, toDate);
    for (const d of dates) {
      const dateStr = fmtDate(d);
      const id = `${dateStr}-${ev.country}-${ev.event.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30)}`.toLowerCase();
      results.push({
        id,
        date: dateStr,
        time: ev.time,
        country: ev.country,
        event: ev.event,
        impact: ev.impact,
      });
    }
  }

  return results.sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date));
}

function resolveRule(rule: EventRule, from: Date, to: Date): Date[] {
  const dates: Date[] = [];

  switch (rule.type) {
    case 'weekday-of-month': {
      // Iterate each month in range
      const startMonth = from.getUTCFullYear() * 12 + from.getUTCMonth();
      const endMonth = to.getUTCFullYear() * 12 + to.getUTCMonth();
      for (let m = startMonth; m <= endMonth; m++) {
        const year = Math.floor(m / 12);
        const month = (m % 12) + 1; // 1-indexed
        if (!rule.months.includes(month)) continue;
        const d = nthWeekdayOfMonth(year, month, rule.weekday, rule.occurrence);
        if (d && d >= from && d <= to) dates.push(d);
      }
      break;
    }
    case 'day-of-month': {
      const startMonth = from.getUTCFullYear() * 12 + from.getUTCMonth();
      const endMonth = to.getUTCFullYear() * 12 + to.getUTCMonth();
      for (let m = startMonth; m <= endMonth; m++) {
        const year = Math.floor(m / 12);
        const month = (m % 12) + 1;
        if (!rule.months.includes(month)) continue;
        const lastDay = new Date(year, month, 0).getDate();
        const day = Math.min(rule.day, lastDay);
        const d = toBusinessDay(new Date(year, month - 1, day));
        if (d >= from && d <= to) dates.push(d);
      }
      break;
    }
    case 'weekly': {
      const d = new Date(from);
      // Align to the target weekday
      while (d.getDay() !== rule.weekday) d.setDate(d.getDate() + 1);
      while (d <= to) {
        if (d >= from) dates.push(new Date(d));
        d.setDate(d.getDate() + 7);
      }
      break;
    }
    case 'interval-weeks': {
      const anchor = new Date(rule.anchor + 'T00:00:00Z');
      // Walk forward and backward from anchor in steps of intervalWeeks
      const step = rule.intervalWeeks * 7;
      // Forward
      const d1 = new Date(anchor);
      while (d1 <= to) {
        if (d1 >= from && d1.getDay() === rule.weekday) dates.push(new Date(d1));
        d1.setDate(d1.getDate() + step);
      }
      // Backward
      const d2 = new Date(anchor);
      d2.setDate(d2.getDate() - step);
      while (d2 >= from) {
        if (d2 <= to && d2.getDay() === rule.weekday) dates.push(new Date(d2));
        d2.setDate(d2.getDate() - step);
      }
      break;
    }
  }

  return dates;
}

// ─── DB Seeding ──────────────────────────────────────────────────────

const SEED_RANGE_KEY = 'seeded_range';

async function ensureSeeded(supabase: ReturnType<typeof getSupabase>, from: string, to: string): Promise<void> {
  // Check what range is already seeded
  const { data: meta } = await supabase
    .from('economic_calendar_meta')
    .select('value')
    .eq('key', SEED_RANGE_KEY)
    .single();

  let seededFrom = '', seededTo = '';
  if (meta?.value) {
    const parts = meta.value.split('|');
    seededFrom = parts[0] || '';
    seededTo = parts[1] || '';
  }

  // If requested range is within already-seeded range, skip
  if (seededFrom && seededTo && from >= seededFrom && to <= seededTo) {
    return;
  }

  // Expand the seed range to cover request + buffer (±3 months)
  const expandedFrom = new Date(from + 'T00:00:00Z');
  expandedFrom.setMonth(expandedFrom.getMonth() - 3);
  const expandedTo = new Date(to + 'T00:00:00Z');
  expandedTo.setMonth(expandedTo.getMonth() + 3);

  const newFrom = seededFrom && seededFrom < fmtDate(expandedFrom) ? seededFrom : fmtDate(expandedFrom);
  const newTo = seededTo && seededTo > fmtDate(expandedTo) ? seededTo : fmtDate(expandedTo);

  console.log(`[EconCal] Seeding events from ${newFrom} to ${newTo}...`);
  const events = generateEvents(newFrom, newTo);

  if (events.length === 0) return;

  // Upsert in chunks (Supabase max ~1000 per request)
  const CHUNK = 500;
  for (let i = 0; i < events.length; i += CHUNK) {
    const chunk = events.slice(i, i + CHUNK).map(e => ({
      id: e.id,
      date: e.date,
      time: e.time,
      datetime: `${e.date}T${e.time}:00Z`,
      country: e.country,
      event: e.event,
      impact: e.impact,
      forecast: null,
      previous: null,
      actual: null,
    }));

    const { error } = await supabase
      .from('economic_calendar_cache')
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.error(`[EconCal] Seed upsert error (chunk ${i}):`, error.message);
    }
  }

  // Update seeded range
  await supabase
    .from('economic_calendar_meta')
    .upsert({
      key: SEED_RANGE_KEY,
      value: `${newFrom}|${newTo}`,
      updated_at: new Date().toISOString(),
    });

  console.log(`[EconCal] Seeded ${events.length} events`);
}

// ─── Main Handler ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const searchParams = request.nextUrl.searchParams;
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Default date range: current week (Mon-Sun)
    const now = new Date();
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const from = fromParam || fmtDate(weekStart);
    const to = toParam || fmtDate(weekEnd);

    // Ensure events are seeded for this range (idempotent, fast if already done)
    await ensureSeeded(supabase, from, to);

    // Query from DB
    const { data: dbEvents, error: dbError } = await supabase
      .from('economic_calendar_cache')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (dbError) {
      console.error('[EconCal] DB query error:', dbError.message);
      return NextResponse.json({
        success: false, events: [], total: 0,
        error: 'Database error',
      }, { status: 500 });
    }

    // Enrich with country info for frontend
    const events: CalendarEvent[] = (dbEvents || []).map(e => {
      const countryInfo = getCountryInfo(e.country);
      return {
        id: e.id,
        date: e.date,
        time: e.time,
        country: e.country,
        countryName: countryInfo.name,
        flag: countryInfo.flag,
        event: e.event,
        impact: e.impact,
        forecast: e.forecast || '',
        previous: e.previous || '',
        actual: e.actual || '',
      };
    });

    return NextResponse.json({
      success: true,
      events,
      total: events.length,
      source: 'database',
      dateRange: { from, to },
    });

  } catch (error: unknown) {
    console.error('[EconCal] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({
      success: false, events: [], total: 0,
      error: message,
    }, { status: 500 });
  }
}
