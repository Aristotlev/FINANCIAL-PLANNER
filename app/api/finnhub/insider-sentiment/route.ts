import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubClient } from '../../../../lib/api/finnhub-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  // Default date range if not provided (last 2 years)
  let fromDate = from;
  let toDate = to;

  if (!fromDate || !toDate) {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 2);
    
    toDate = end.toISOString().split('T')[0];
    fromDate = start.toISOString().split('T')[0];
  }

  try {
    const finnhub = createFinnhubClient();
    const data = await finnhub.getInsiderSentiment(symbol, fromDate!, toDate!);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching insider sentiment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insider sentiment' },
      { status: 500 }
    );
  }
}
