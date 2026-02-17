/**
 * API Route: /api/crypto-symbols
 * 
 * Provides access to cryptocurrency symbols via CoinGecko
 * 
 * Endpoints:
 * - GET /api/crypto-symbols - Get all crypto symbols
 * - GET /api/crypto-symbols?search=bitcoin - Search for specific cryptos
 * - GET /api/crypto-symbols?symbol=BTC - Get specific symbol details
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedMarketService } from '@/lib/enhanced-market-service';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // Cache for 24 hours

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('search');
    const symbolQuery = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Search for specific crypto
    if (searchQuery) {
      const results = await enhancedMarketService.searchCryptoSymbol(searchQuery);
      return NextResponse.json({
        success: true,
        query: searchQuery,
        count: results.length,
        data: results.slice(0, limit),
      });
    }

    // Get specific symbol
    if (symbolQuery) {
      const result = await enhancedMarketService.getCryptoBySymbol(symbolQuery);
      if (result) {
        return NextResponse.json({
          success: true,
          data: result,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `Cryptocurrency symbol "${symbolQuery}" not found`,
          },
          { status: 404 }
        );
      }
    }

    // Get all symbols (with optional limit)
    const allSymbols = await enhancedMarketService.fetchAllCryptoSymbols();
    const limitedSymbols = limit > 0 ? allSymbols.slice(0, limit) : allSymbols;

    return NextResponse.json({
      success: true,
      total: allSymbols.length,
      returned: limitedSymbols.length,
      data: limitedSymbols,
      metadata: {
        fetchedAt: new Date().toISOString(),
        cacheValid: '24 hours',
      },
    });
  } catch (error) {
    console.error('Error in /api/crypto-symbols:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
