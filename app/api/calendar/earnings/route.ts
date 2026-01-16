/**
 * Earnings Calendar API Route Handler
 * Fetches upcoming and historical earnings releases from Finnhub
 * API Documentation: https://finnhub.io/docs/api/earnings-calendar
 */

import { NextRequest, NextResponse } from 'next/server';

interface EarningsEvent {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: 'bmo' | 'amc' | 'dmh'; // Before market open, After market close, During market hours
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

interface EarningsCalendarResponse {
  earningsCalendar: EarningsEvent[];
}

// Helper to format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get date range for the request
const getDateRange = (daysBack: number = 30, daysForward: number = 30) => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - daysBack);
  const to = new Date(now);
  to.setDate(to.getDate() + daysForward);
  
  return {
    from: formatDate(from),
    to: formatDate(to)
  };
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const international = searchParams.get('international') === 'true';

    // Check both environment variable names for the API key
    const apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      // Return mock data if no API key
      const mockData = generateMockEarningsData();
      return NextResponse.json({
        success: true,
        data: mockData,
        isMock: true
      });
    }

    // Build the Finnhub URL
    const finnhubUrl = new URL('https://finnhub.io/api/v1/calendar/earnings');
    finnhubUrl.searchParams.append('token', apiKey);
    
    // Use provided dates or default to 30 days back and forward
    if (from) {
      finnhubUrl.searchParams.append('from', from);
    } else {
      const { from: defaultFrom } = getDateRange();
      finnhubUrl.searchParams.append('from', defaultFrom);
    }
    
    if (to) {
      finnhubUrl.searchParams.append('to', to);
    } else {
      const { to: defaultTo } = getDateRange();
      finnhubUrl.searchParams.append('to', defaultTo);
    }
    
    if (symbol) {
      finnhubUrl.searchParams.append('symbol', symbol.toUpperCase());
    }
    
    if (international) {
      finnhubUrl.searchParams.append('international', 'true');
    }

    const response = await fetch(finnhubUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle 403 - could be rate limiting or premium access
      if (response.status === 403) {
        console.warn('Finnhub returned 403:', errorText);
        // Return empty data with a warning instead of an error
        // This prevents the UI from breaking due to rate limiting
        return NextResponse.json({
          success: true,
          data: [],
          isMock: false,
          warning: 'Finnhub API rate limited or requires premium access. Showing empty results.'
        });
      }
      
      throw new Error(`Finnhub API error (${response.status}): ${errorText}`);
    }

    const data: EarningsCalendarResponse = await response.json();

    // Sort by date (most recent first for past, soonest first for future)
    const sortedData = data.earningsCalendar?.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }) || [];

    return NextResponse.json({
      success: true,
      data: sortedData,
      isMock: false
    });

  } catch (error: any) {
    console.error('Earnings Calendar API error:', error);
    
    // Return error instead of falling back to mock data
    return NextResponse.json({
      success: false,
      data: [],
      isMock: false,
      error: error.message
    }, { status: 500 });
  }
}

// Generate mock earnings data for development/demo
function generateMockEarningsData(): EarningsEvent[] {
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'UNH', name: 'UnitedHealth Group' },
    { symbol: 'HD', name: 'Home Depot Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble' },
    { symbol: 'BAC', name: 'Bank of America' },
  ];

  const hours: ('bmo' | 'amc' | 'dmh')[] = ['bmo', 'amc', 'dmh'];
  const events: EarningsEvent[] = [];
  const today = new Date();

  // Generate events for the past 30 days and next 30 days
  for (let dayOffset = -30; dayOffset <= 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Random number of earnings per day (0-5)
    const numEarnings = Math.floor(Math.random() * 6);
    
    for (let i = 0; i < numEarnings; i++) {
      const stock = popularStocks[Math.floor(Math.random() * popularStocks.length)];
      const isPast = dayOffset < 0;
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      const year = date.getFullYear();
      
      // Generate realistic EPS values
      const epsEstimate = parseFloat((Math.random() * 5 + 0.5).toFixed(2));
      const epsSurprise = (Math.random() - 0.3) * 0.5; // Slight positive bias
      const epsActual = isPast ? parseFloat((epsEstimate + epsSurprise).toFixed(2)) : null;
      
      // Generate realistic revenue values (in millions)
      const revenueEstimate = Math.round((Math.random() * 50000 + 5000) * 1000000);
      const revenueSurprise = (Math.random() - 0.3) * 0.1; // Slight positive bias
      const revenueActual = isPast ? Math.round(revenueEstimate * (1 + revenueSurprise)) : null;

      events.push({
        date: formatDate(date),
        epsActual,
        epsEstimate,
        hour: hours[Math.floor(Math.random() * hours.length)],
        quarter,
        revenueActual,
        revenueEstimate,
        symbol: stock.symbol,
        year,
      });
    }
  }

  // Sort by date
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
