/**
 * Finnhub API Route Handler
 * Proxies requests to Finnhub API with proper authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { FinnhubAPI, createFinnhubClient } from '@/lib/api/finnhub-api';

// Supported operations
type Operation = 
  | 'quote'
  | 'quotes'
  | 'candles'
  | 'profile'
  | 'metrics'
  | 'news'
  | 'market-news'
  | 'earnings'
  | 'lobbying'
  | 'usa-spending'
  | 'forex'
  | 'crypto'
  | 'search'
  | 'asset-data'
  | 'market-overview';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operation = searchParams.get('operation') as Operation;

    if (!operation) {
      return NextResponse.json(
        { error: 'Missing operation parameter' },
        { status: 400 }
      );
    }

    // Create Finnhub client
    const client = createFinnhubClient();

    // Handle different operations
    switch (operation) {
      case 'quote': {
        const symbol = searchParams.get('symbol');
        if (!symbol) {
          return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
        }
        const data = await client.getQuote(symbol);
        return NextResponse.json({ success: true, data });
      }

      case 'quotes': {
        const symbols = searchParams.get('symbols')?.split(',') || [];
        if (symbols.length === 0) {
          return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 });
        }
        const data = await client.getQuotes(symbols);
        return NextResponse.json({ success: true, data: Object.fromEntries(data) });
      }

      case 'candles': {
        const symbol = searchParams.get('symbol');
        const resolution = searchParams.get('resolution') as any;
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!symbol || !resolution || !from || !to) {
          return NextResponse.json(
            { error: 'Missing required parameters: symbol, resolution, from, to' },
            { status: 400 }
          );
        }

        const data = await client.getCandles(symbol, resolution, parseInt(from), parseInt(to));
        return NextResponse.json({ success: true, data });
      }

      case 'profile': {
        const symbol = searchParams.get('symbol');
        if (!symbol) {
          return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
        }
        const data = await client.getCompanyProfile(symbol);
        return NextResponse.json({ success: true, data });
      }

      case 'metrics': {
        const symbol = searchParams.get('symbol');
        if (!symbol) {
          return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
        }
        const data = await client.getMetrics(symbol);
        return NextResponse.json({ success: true, data });
      }

      case 'news': {
        const symbol = searchParams.get('symbol');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const days = searchParams.get('days');

        if (!symbol) {
          return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
        }

        let data;
        if (days) {
          data = await client.getRecentNews(symbol, parseInt(days));
        } else if (from && to) {
          data = await client.getCompanyNews(symbol, from, to);
        } else {
          data = await client.getRecentNews(symbol, 7); // Default to 7 days
        }

        return NextResponse.json({ success: true, data });
      }

      case 'market-news': {
        const category = (searchParams.get('category') || 'general') as any;
        const data = await client.getMarketNews(category);
        return NextResponse.json({ success: true, data });
      }

      case 'earnings': {
        const symbol = searchParams.get('symbol');
        if (!symbol) {
          return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
        }
        const data = await client.getEarnings(symbol);
        return NextResponse.json({ success: true, data });
      }

      case 'lobbying': {
        const symbol = searchParams.get('symbol');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const years = searchParams.get('years');

        if (!symbol) {
          return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
        }

        let data;
        if (years) {
          data = await client.getRecentLobbying(symbol, parseInt(years));
        } else if (from && to) {
          data = await client.getLobbying(symbol, from, to);
        } else {
          data = await client.getRecentLobbying(symbol, 2); // Default to 2 years
        }

        return NextResponse.json({ success: true, data });
      }

      case 'usa-spending': {
        const symbol = searchParams.get('symbol');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const years = searchParams.get('years');

        if (!symbol) {
          return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
        }

        let data;
        if (years) {
          data = await client.getRecentUSASpending(symbol, parseInt(years));
        } else if (from && to) {
          data = await client.getUSASpending(symbol, from, to);
        } else {
          data = await client.getRecentUSASpending(symbol, 2); // Default to 2 years
        }

        return NextResponse.json({ success: true, data });
      }

      case 'forex': {
        const base = searchParams.get('base');
        const quote = searchParams.get('quote');
        if (!base || !quote) {
          return NextResponse.json(
            { error: 'Missing base or quote parameter' },
            { status: 400 }
          );
        }
        const data = await client.getForexRate(base, quote);
        return NextResponse.json({ success: true, data });
      }

      case 'crypto': {
        const symbol = searchParams.get('symbol');
        const resolution = searchParams.get('resolution') as any;
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!symbol || !resolution || !from || !to) {
          return NextResponse.json(
            { error: 'Missing required parameters: symbol, resolution, from, to' },
            { status: 400 }
          );
        }

        const data = await client.getCryptoCandles(symbol, resolution, parseInt(from), parseInt(to));
        return NextResponse.json({ success: true, data });
      }

      case 'search': {
        const query = searchParams.get('q');
        if (!query) {
          return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
        }
        const data = await client.searchSymbols(query);
        return NextResponse.json({ success: true, data });
      }

      case 'asset-data': {
        const symbol = searchParams.get('symbol');
        if (!symbol) {
          return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
        }
        const data = await client.getAssetData(symbol);
        return NextResponse.json({ success: true, data });
      }

      case 'market-overview': {
        const symbols = searchParams.get('symbols')?.split(',') || [];
        if (symbols.length === 0) {
          return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 });
        }
        const data = await client.getMarketOverview(symbols);
        return NextResponse.json({ success: true, data: Object.fromEntries(data) });
      }

      default:
        return NextResponse.json(
          { error: `Unsupported operation: ${operation}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Finnhub API route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, ...params } = body;

    if (!operation) {
      return NextResponse.json(
        { error: 'Missing operation in request body' },
        { status: 400 }
      );
    }

    // Create Finnhub client
    const client = createFinnhubClient();

    // Handle batch operations
    if (operation === 'batch-quotes') {
      const { symbols } = params;
      if (!symbols || !Array.isArray(symbols)) {
        return NextResponse.json(
          { error: 'Missing or invalid symbols array' },
          { status: 400 }
        );
      }

      const data = await client.getQuotes(symbols);
      return NextResponse.json({ success: true, data: Object.fromEntries(data) });
    }

    if (operation === 'batch-asset-data') {
      const { symbols } = params;
      if (!symbols || !Array.isArray(symbols)) {
        return NextResponse.json(
          { error: 'Missing or invalid symbols array' },
          { status: 400 }
        );
      }

      const data = await client.getMarketOverview(symbols);
      return NextResponse.json({ success: true, data: Object.fromEntries(data) });
    }

    return NextResponse.json(
      { error: `Unsupported POST operation: ${operation}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Finnhub API POST route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
