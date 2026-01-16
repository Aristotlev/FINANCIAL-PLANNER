import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubClient } from '../../../../lib/api/finnhub-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  try {
    const finnhub = createFinnhubClient();
    
    // Default to last 2 years if dates not provided
    let fromDate = from;
    let toDate = to;
    
    if (!fromDate || !toDate) {
      const now = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      toDate = toDate || now.toISOString().split('T')[0];
      fromDate = fromDate || twoYearsAgo.toISOString().split('T')[0];
    }
    
    const data = await finnhub.getUSASpending(symbol, fromDate, toDate);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching USA spending data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch USA spending data' },
      { status: 500 }
    );
  }
}
