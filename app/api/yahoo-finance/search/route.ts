import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    let data;
    try {
      // Try query1 first
      const response = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Query1 returned ${response.status}`);
      }
      data = await response.json();
    } catch (e) {
      console.warn('Query1 failed, trying Query2:', e);
      // Fallback to query2
      const response = await fetch(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Query2 returned ${response.status}`);
      }
      data = await response.json();
    }

    // Transform the data to match our application's needs
    const quotes = data.quotes || [];
    const results = quotes
      .filter((quote: any) => quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF')
      .map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol,
        exchange: quote.exchange,
        sector: quote.sector || 'Unknown',
        industry: quote.industry || 'Unknown',
        quoteType: quote.quoteType,
      }));

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Yahoo Finance Search API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search stocks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
