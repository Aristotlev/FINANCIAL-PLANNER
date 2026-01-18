/**
 * News Cache API
 * 
 * Fetch cached IPO, Earnings, and Twitter data.
 * Data is served from cache, no external API calls are made.
 * 
 * Endpoints:
 *   GET /api/news/cache?type=ipo
 *   GET /api/news/cache?type=earnings
 *   GET /api/news/cache?type=twitter
 *   GET /api/news/cache?type=status
 */

import { NextRequest, NextResponse } from 'next/server';
import { newsCacheService } from '@/lib/news-cache-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'status';
    const limit = parseInt(searchParams.get('limit') || '50');
    const symbol = searchParams.get('symbol') || undefined;
    const fromDate = searchParams.get('from') || undefined;
    const toDate = searchParams.get('to') || undefined;

    switch (type) {
      case 'ipo': {
        const data = await newsCacheService.getAllIPOs({
          fromDate,
          toDate,
          limit
        });
        return NextResponse.json({ data, count: data.length });
      }

      case 'upcoming-ipo': {
        const data = await newsCacheService.getUpcomingIPOs(limit);
        return NextResponse.json({ data, count: data.length });
      }

      case 'earnings': {
        const data = await newsCacheService.getEarnings({
          symbol,
          fromDate,
          toDate,
          limit
        });
        return NextResponse.json({ data, count: data.length });
      }

      case 'weekly-earnings': {
        const data = await newsCacheService.getWeeklyEarnings();
        return NextResponse.json({ data, count: data.length });
      }

      case 'twitter': {
        const category = searchParams.get('category') || undefined;
        const sentiment = searchParams.get('sentiment') || undefined;
        const hashtag = searchParams.get('hashtag') || undefined;
        const hoursAgo = searchParams.get('hoursAgo') 
          ? parseInt(searchParams.get('hoursAgo')!) 
          : undefined;

        const data = await newsCacheService.getTweets({
          symbol,
          category,
          sentiment,
          hashtag,
          hoursAgo,
          limit
        });
        return NextResponse.json({ data, count: data.length });
      }

      case 'recent-tweets': {
        const data = await newsCacheService.getRecentTweets(limit);
        return NextResponse.json({ data, count: data.length });
      }

      case 'status': {
        const status = await newsCacheService.getCacheStatus();
        return NextResponse.json({ status });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: ipo, earnings, twitter, or status' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Cache API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cached data' },
      { status: 500 }
    );
  }
}
