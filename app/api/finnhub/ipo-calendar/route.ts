import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubClient } from '../../../../lib/api/finnhub-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const finnhub = createFinnhubClient();
    
    // Default to 6 months back and 6 months forward if dates not provided
    let fromDate = from;
    let toDate = to;
    
    if (!fromDate || !toDate) {
      const today = new Date();
      const defaultFrom = new Date(today);
      defaultFrom.setMonth(defaultFrom.getMonth() - 6);
      const defaultTo = new Date(today);
      defaultTo.setMonth(defaultTo.getMonth() + 6);
      
      fromDate = fromDate || defaultFrom.toISOString().split('T')[0];
      toDate = toDate || defaultTo.toISOString().split('T')[0];
    }
    
    const data = await finnhub.getIPOCalendar(fromDate, toDate);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching IPO calendar:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch IPO calendar' },
      { status: 500 }
    );
  }
}
