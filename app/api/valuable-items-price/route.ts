import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchMarketPrice, 
  getAvailableItems, 
  getCategoryStats,
  searchItems 
} from '@/lib/api/valuable-items-market-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    
    // Get market price for a specific item
    if (action === 'price') {
      const itemName = searchParams.get('itemName');
      const category = searchParams.get('category');
      
      if (!itemName || !category) {
        return NextResponse.json(
          { error: 'Missing itemName or category parameter' },
          { status: 400 }
        );
      }
      
      const priceData = await fetchMarketPrice(itemName, category);
      
      if (!priceData) {
        // Return success with null data instead of 404 - this is expected for items not in database
        return NextResponse.json({ 
          success: true, 
          data: null,
          message: 'Market price data not available for this item'
        });
      }
      
      return NextResponse.json({ success: true, data: priceData });
    }
    
    // Get available items for a category
    if (action === 'available') {
      const category = searchParams.get('category');
      const items = getAvailableItems(category || undefined);
      
      return NextResponse.json({ success: true, data: items });
    }
    
    // Get category statistics
    if (action === 'stats') {
      const category = searchParams.get('category');
      
      if (!category) {
        return NextResponse.json(
          { error: 'Missing category parameter' },
          { status: 400 }
        );
      }
      
      const stats = getCategoryStats(category);
      
      return NextResponse.json({ success: true, data: stats });
    }
    
    // Search for items
    if (action === 'search') {
      const query = searchParams.get('query');
      const limit = parseInt(searchParams.get('limit') || '10');
      
      if (!query) {
        return NextResponse.json(
          { error: 'Missing query parameter' },
          { status: 400 }
        );
      }
      
      const results = searchItems(query, limit);
      
      return NextResponse.json({ success: true, data: results });
    }
    
    return NextResponse.json(
      { error: 'Invalid action parameter. Use: price, available, stats, or search' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Valuable items price API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
