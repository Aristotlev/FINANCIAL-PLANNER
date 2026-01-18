/**
 * FMP Company Profile API Route
 * Fetches company profiles by CIK or ticker symbol
 * Implements caching to optimize free tier API usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { FMPApi, FMPCompanyProfile, isValidCIK } from '@/lib/api/fmp-api';

// In-memory cache for API responses (server-side)
const profileCache = new Map<string, { data: FMPCompanyProfile; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes - aggressive caching for free tier

/**
 * GET /api/fmp/company-profile
 * 
 * Query params:
 * - cik: CIK number (e.g., "320193" for Apple)
 * - symbol: Stock ticker (e.g., "AAPL") - alternative to CIK
 * - search: Search query for company name
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cik = searchParams.get('cik');
    const symbol = searchParams.get('symbol');
    const search = searchParams.get('search');

    // Validate input - need at least one parameter
    if (!cik && !symbol && !search) {
      return NextResponse.json(
        { error: 'Missing required parameter. Provide cik, symbol, or search query.' },
        { status: 400 }
      );
    }

    const fmp = new FMPApi();

    // Check if API is configured
    if (!fmp.isConfigured()) {
      return NextResponse.json(
        { error: 'FMP API key not configured. Please add FMP_API_KEY to environment variables.' },
        { status: 503 }
      );
    }

    // Handle search query
    if (search) {
      const results = await fmp.searchCompanies(search, 10);
      return NextResponse.json({ 
        success: true, 
        data: results,
        type: 'search'
      });
    }

    // Determine cache key
    const cacheKey = cik ? `cik:${cik}` : `symbol:${symbol}`;
    
    // Check cache first
    const cached = profileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ 
        success: true, 
        data: cached.data,
        cached: true,
        type: 'profile'
      });
    }

    // Fetch from API
    let profile: FMPCompanyProfile | null = null;

    if (cik) {
      // Validate CIK format
      if (!isValidCIK(cik)) {
        return NextResponse.json(
          { error: 'Invalid CIK format. Must be a 1-10 digit number.' },
          { status: 400 }
        );
      }
      profile = await fmp.getProfileByCIK(cik);
    } else if (symbol) {
      profile = await fmp.getProfile(symbol.toUpperCase());
      
      // If not found by symbol, try searching by name (in case user passed company name)
      if (!profile) {
        const searchResults = await fmp.searchCompanies(symbol, 1);
        if (searchResults.length > 0) {
          // Try to get the profile for the first search result
          profile = await fmp.getProfile(searchResults[0].symbol);
          
          // If still not found, provide helpful suggestion
          if (!profile) {
            return NextResponse.json(
              { 
                error: `Company not found for symbol: ${symbol}`,
                suggestion: `Did you mean "${searchResults[0].symbol}" (${searchResults[0].name})?`,
                searchResult: searchResults[0]
              },
              { status: 404 }
            );
          }
        }
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: `Company not found for ${cik ? `CIK: ${cik}` : `symbol: ${symbol}`}. Use ticker symbols (e.g., AAPL for Apple, TSLA for Tesla).` },
        { status: 404 }
      );
    }

    // Cache the result
    profileCache.set(cacheKey, { data: profile, timestamp: Date.now() });

    // Also cache by the alternative key for cross-lookup efficiency
    if (cik && profile.symbol) {
      profileCache.set(`symbol:${profile.symbol}`, { data: profile, timestamp: Date.now() });
    } else if (symbol && profile.cik) {
      profileCache.set(`cik:${profile.cik.replace(/^0+/, '')}`, { data: profile, timestamp: Date.now() });
    }

    return NextResponse.json({ 
      success: true, 
      data: profile,
      cached: false,
      type: 'profile'
    });

  } catch (error: any) {
    console.error('FMP API Error:', error);
    
    // Handle specific error types
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'FMP API authentication failed. Check API key.' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('rate limit') || error.message?.includes('limit')) {
      return NextResponse.json(
        { error: 'API rate limit reached. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch company profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fmp/company-profile
 * Bulk fetch profiles (more efficient for multiple lookups)
 * 
 * Body:
 * - ciks: Array of CIK numbers
 * - symbols: Array of ticker symbols
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ciks, symbols } = body;

    if (!ciks?.length && !symbols?.length) {
      return NextResponse.json(
        { error: 'Missing required parameter. Provide ciks or symbols array.' },
        { status: 400 }
      );
    }

    const fmp = new FMPApi();

    if (!fmp.isConfigured()) {
      return NextResponse.json(
        { error: 'FMP API key not configured.' },
        { status: 503 }
      );
    }

    const results: FMPCompanyProfile[] = [];
    const errors: { identifier: string; error: string }[] = [];

    // Process CIKs
    if (ciks?.length) {
      for (const cik of ciks.slice(0, 10)) { // Limit to 10 to preserve API calls
        const cacheKey = `cik:${cik}`;
        const cached = profileCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          results.push(cached.data);
        } else {
          try {
            const profile = await fmp.getProfileByCIK(cik);
            if (profile) {
              profileCache.set(cacheKey, { data: profile, timestamp: Date.now() });
              results.push(profile);
            } else {
              errors.push({ identifier: `CIK:${cik}`, error: 'Not found' });
            }
          } catch (e: any) {
            errors.push({ identifier: `CIK:${cik}`, error: e.message });
          }
        }
      }
    }

    // Process symbols
    if (symbols?.length) {
      for (const symbol of symbols.slice(0, 10)) {
        const cacheKey = `symbol:${symbol}`;
        const cached = profileCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          results.push(cached.data);
        } else {
          try {
            const profile = await fmp.getProfile(symbol);
            if (profile) {
              profileCache.set(cacheKey, { data: profile, timestamp: Date.now() });
              results.push(profile);
            } else {
              errors.push({ identifier: symbol, error: 'Not found' });
            }
          } catch (e: any) {
            errors.push({ identifier: symbol, error: e.message });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      count: results.length
    });

  } catch (error: any) {
    console.error('FMP Bulk API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch company profiles' },
      { status: 500 }
    );
  }
}
