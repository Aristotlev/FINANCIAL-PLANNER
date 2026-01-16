import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubClient } from '../../../../lib/api/finnhub-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = searchParams.get('limit');

  try {
    const finnhub = createFinnhubClient();
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 100;
    
    const data = await finnhub.getInsiderTransactions(
      symbol || undefined,
      from || undefined,
      to || undefined,
      limitNum
    );
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching insider transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insider transactions' },
      { status: 500 }
    );
  }
}
