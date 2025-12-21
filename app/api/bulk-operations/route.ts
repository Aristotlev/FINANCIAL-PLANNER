/**
 * Bulk Operations API
 * Add/Remove multiple assets at once + AI-powered bulk operations
 * Protected by authentication and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDataService } from '@/lib/supabase/supabase-data-service';
import { enhancedMarketService } from '@/lib/enhanced-market-service';
import { getAssetColor } from '@/lib/asset-color-database';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit, getClientIP, RateLimitConfigs } from "@/lib/rate-limit";

export interface BulkAddRequest {
  type: 'stocks' | 'crypto' | 'cash' | 'savings' | 'properties' | 'items';
  items: Array<{
    symbol?: string;
    name?: string;
    shares?: number;
    amount?: number;
    entryPrice?: number;
    balance?: number;
    [key: string]: any;
  }>;
}

export interface BulkRemoveRequest {
  type: 'stocks' | 'crypto' | 'cash' | 'savings' | 'properties' | 'items';
  ids?: string[]; // Specific IDs to remove
  symbols?: string[]; // Remove by symbol
  removeAll?: boolean; // Remove everything of this type
}

export interface BulkOperationResponse {
  success: boolean;
  added?: number;
  removed?: number;
  failed?: number;
  errors?: Array<{ item: string; error: string }>;
  message: string;
}

/**
 * POST /api/bulk-operations
 * Perform bulk add or remove operations
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Please sign in to perform bulk operations' },
        { status: 401 }
      );
    }

    console.log('[BULK-OPS] Processing authenticated request from user:', session.user.id);

    // ✅ Rate limiting - Bulk operations can be resource-intensive
    const headersList = await headers();
    const identifier = session.user?.id || getClientIP(headersList);
    const rateLimitResult = await rateLimit(identifier, RateLimitConfigs.AI_LENIENT);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Rate limit exceeded. Please try again later.',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: new Date(rateLimitResult.reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { operation, data } = body;

    if (operation === 'add') {
      return await handleBulkAdd(data as BulkAddRequest);
    } else if (operation === 'remove') {
      return await handleBulkRemove(data as BulkRemoveRequest);
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid operation type' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle bulk add operations
 */
async function handleBulkAdd(request: BulkAddRequest): Promise<NextResponse> {
  const { type, items } = request;
  let added = 0;
  let failed = 0;
  const errors: Array<{ item: string; error: string }> = [];

  try {
    switch (type) {
      case 'stocks':
        for (const item of items) {
          try {
            // Validate required fields
            if (!item.symbol || !item.shares || !item.entryPrice) {
              throw new Error('Missing required fields: symbol, shares, or entryPrice');
            }

            // Fetch market data
            const marketData = await enhancedMarketService.fetchAssetPrice(item.symbol, 'stock');
            const currentPrice = marketData?.currentPrice || item.entryPrice;
            const name = marketData?.name || item.symbol;
            const color = marketData?.color || getAssetColor(item.symbol, 'stock');

            // Save to database
            await SupabaseDataService.saveStockHolding({
              id: crypto.randomUUID(),
              symbol: item.symbol,
              name,
              shares: item.shares,
              entryPoint: item.entryPrice,
              currentPrice,
              type: item.type || 'Long Term',
              color,
            });

            added++;
          } catch (error) {
            failed++;
            errors.push({
              item: item.symbol || 'Unknown',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      case 'crypto':
        for (const item of items) {
          try {
            if (!item.symbol || !item.amount || !item.entryPrice) {
              throw new Error('Missing required fields: symbol, amount, or entryPrice');
            }

            const marketData = await enhancedMarketService.fetchAssetPrice(item.symbol, 'crypto');
            const currentPrice = marketData?.currentPrice || item.entryPrice;
            const name = marketData?.name || item.symbol;
            const color = marketData?.color || getAssetColor(item.symbol, 'crypto');

            await SupabaseDataService.saveCryptoHolding({
              id: crypto.randomUUID(),
              symbol: item.symbol,
              name,
              amount: item.amount,
              entryPoint: item.entryPrice,
              currentPrice,
              color,
            });

            added++;
          } catch (error) {
            failed++;
            errors.push({
              item: item.symbol || 'Unknown',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      case 'cash':
        for (const item of items) {
          try {
            if (!item.name || !item.bank || item.balance === undefined) {
              throw new Error('Missing required fields: name, bank, or balance');
            }

            const color = getAssetColor(item.bank, 'stock');

            await SupabaseDataService.saveCashAccount({
              id: crypto.randomUUID(),
              name: item.name,
              bank: item.bank,
              balance: item.balance,
              type: item.type || 'Checking',
              apy: item.apy || 0,
              color,
            });

            added++;
          } catch (error) {
            failed++;
            errors.push({
              item: item.name || 'Unknown',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      case 'savings':
        for (const item of items) {
          try {
            if (!item.name || !item.bank || item.balance === undefined) {
              throw new Error('Missing required fields: name, bank, or balance');
            }

            const color = getAssetColor(item.bank, 'stock');

            await SupabaseDataService.saveSavingsAccount({
              id: crypto.randomUUID(),
              name: item.name,
              bank: item.bank,
              balance: item.balance,
              apy: item.apy || 0,
              color,
            });

            added++;
          } catch (error) {
            failed++;
            errors.push({
              item: item.name || 'Unknown',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      default:
        return NextResponse.json(
          { success: false, message: `Bulk add not implemented for type: ${type}` },
          { status: 400 }
        );
    }

    // Dispatch events to update UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(`${type}DataChanged`));
      window.dispatchEvent(new Event('financialDataChanged'));
    }

    return NextResponse.json({
      success: true,
      added,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      message: `✅ Successfully added ${added} items${failed > 0 ? `, ${failed} failed` : ''}`,
    });
  } catch (error) {
    console.error('Bulk add error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle bulk remove operations
 */
async function handleBulkRemove(request: BulkRemoveRequest): Promise<NextResponse> {
  const { type, ids, symbols, removeAll } = request;
  let removed = 0;

  try {
    if (removeAll) {
      // Remove all items of this type
      switch (type) {
        case 'stocks':
          const stocks = await SupabaseDataService.getStockHoldings([]);
          for (const stock of stocks) {
            await SupabaseDataService.deleteStockHolding(stock.id);
            removed++;
          }
          break;

        case 'crypto':
          const cryptos = await SupabaseDataService.getCryptoHoldings([]);
          for (const crypto of cryptos) {
            await SupabaseDataService.deleteCryptoHolding(crypto.id);
            removed++;
          }
          break;

        case 'cash':
          const cashAccounts = await SupabaseDataService.getCashAccounts([]);
          for (const account of cashAccounts) {
            await SupabaseDataService.deleteCashAccount(account.id);
            removed++;
          }
          break;

        case 'savings':
          const savingsAccounts = await SupabaseDataService.getSavingsAccounts([]);
          for (const account of savingsAccounts) {
            await SupabaseDataService.deleteSavingsAccount(account.id);
            removed++;
          }
          break;

        default:
          return NextResponse.json(
            { success: false, message: `Bulk remove not implemented for type: ${type}` },
            { status: 400 }
          );
      }
    } else if (ids && ids.length > 0) {
      // Remove specific IDs
      for (const id of ids) {
        try {
          switch (type) {
            case 'stocks':
              await SupabaseDataService.deleteStockHolding(id);
              removed++;
              break;
            case 'crypto':
              await SupabaseDataService.deleteCryptoHolding(id);
              removed++;
              break;
            case 'cash':
              await SupabaseDataService.deleteCashAccount(id);
              removed++;
              break;
            case 'savings':
              await SupabaseDataService.deleteSavingsAccount(id);
              removed++;
              break;
          }
        } catch (error) {
          console.error(`Failed to remove ${id}:`, error);
        }
      }
    } else if (symbols && symbols.length > 0) {
      // Remove by symbols
      if (type === 'stocks') {
        const stocks = await SupabaseDataService.getStockHoldings([]);
        for (const stock of stocks) {
          if (symbols.includes(stock.symbol)) {
            await SupabaseDataService.deleteStockHolding(stock.id);
            removed++;
          }
        }
      } else if (type === 'crypto') {
        const cryptos = await SupabaseDataService.getCryptoHoldings([]);
        for (const crypto of cryptos) {
          if (symbols.includes(crypto.symbol)) {
            await SupabaseDataService.deleteCryptoHolding(crypto.id);
            removed++;
          }
        }
      }
    }

    // Dispatch events to update UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(`${type}DataChanged`));
      window.dispatchEvent(new Event('financialDataChanged'));
    }

    return NextResponse.json({
      success: true,
      removed,
      message: `✅ Successfully removed ${removed} items`,
    });
  } catch (error) {
    console.error('Bulk remove error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
