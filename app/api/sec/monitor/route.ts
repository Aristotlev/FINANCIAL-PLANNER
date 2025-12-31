/**
 * SEC Monitor Control API
 * Manages the background SEC filing watcher service
 * 
 * POST /api/sec/monitor - Start/stop/control the monitor
 * GET /api/sec/monitor - Get monitor status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSECBackgroundMonitor } from '@/lib/sec/sec-background-monitor';
import { getSECConfig, validateSECConfig } from '@/lib/sec/sec-config';
import type { FilingType } from '@/lib/api/sec-edgar-api';

// ==================== GET - Monitor Status ====================

export async function GET() {
  try {
    const monitor = getSECBackgroundMonitor();
    const status = monitor.getStatus();
    const config = getSECConfig();
    const validation = validateSECConfig(config);

    return NextResponse.json({
      success: true,
      status,
      config: {
        userAgent: config.userAgent,
        pollInterval: config.pollInterval,
        maxFilingsPerPoll: config.maxFilingsPerPoll,
        webhookEnabled: config.webhookEnabled,
        rateLimit: config.rateLimit,
      },
      configValid: validation.valid,
      configErrors: validation.errors,
    });
  } catch (error) {
    console.error('[SEC Monitor API] Error getting status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// ==================== POST - Control Monitor ====================

interface ControlRequest {
  action: 'start' | 'stop' | 'restart' | 'subscribe' | 'unsubscribe' | 'add_ticker' | 'remove_ticker';
  userId?: string;
  ticker?: string;
  tickers?: string[];
  formTypes?: FilingType[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ControlRequest;
    const { action, userId, ticker, tickers, formTypes } = body;

    const monitor = getSECBackgroundMonitor();

    switch (action) {
      case 'start': {
        await monitor.start();
        return NextResponse.json({
          success: true,
          message: 'Monitor started',
          status: monitor.getStatus(),
        });
      }

      case 'stop': {
        await monitor.stop();
        return NextResponse.json({
          success: true,
          message: 'Monitor stopped',
          status: monitor.getStatus(),
        });
      }

      case 'restart': {
        await monitor.stop();
        await monitor.start();
        return NextResponse.json({
          success: true,
          message: 'Monitor restarted',
          status: monitor.getStatus(),
        });
      }

      case 'subscribe': {
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'userId is required' },
            { status: 400 }
          );
        }

        if (!tickers || tickers.length === 0) {
          return NextResponse.json(
            { success: false, error: 'tickers array is required' },
            { status: 400 }
          );
        }

        monitor.subscribe({
          userId,
          tickers,
          formTypes: formTypes || ['10-K', '10-Q', '8-K', '4'],
          emailNotifications: false,
          pushNotifications: true,
        });

        return NextResponse.json({
          success: true,
          message: `User ${userId} subscribed to ${tickers.length} tickers`,
        });
      }

      case 'unsubscribe': {
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'userId is required' },
            { status: 400 }
          );
        }

        monitor.unsubscribe(userId);

        return NextResponse.json({
          success: true,
          message: `User ${userId} unsubscribed`,
        });
      }

      case 'add_ticker': {
        if (!userId || !ticker) {
          return NextResponse.json(
            { success: false, error: 'userId and ticker are required' },
            { status: 400 }
          );
        }

        await monitor.addToWatchlist(
          userId, 
          ticker, 
          undefined,
          formTypes || ['10-K', '10-Q', '8-K', '4']
        );

        return NextResponse.json({
          success: true,
          message: `Added ${ticker} to watchlist for user ${userId}`,
          status: monitor.getStatus(),
        });
      }

      case 'remove_ticker': {
        if (!userId || !ticker) {
          return NextResponse.json(
            { success: false, error: 'userId and ticker are required' },
            { status: 400 }
          );
        }

        monitor.removeFromWatchlist(userId, ticker);

        return NextResponse.json({
          success: true,
          message: `Removed ${ticker} from watchlist`,
          status: monitor.getStatus(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SEC Monitor API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
