/**
 * Tool Execution API
 * Server-side tool execution for AI agent
 * Safely runs tools without exposing credentials to client
 */

import { NextRequest, NextResponse } from "next/server";

// Tool type definitions
export type ToolName = "fetchPrice" | "readArticle" | "modifyApp";

export interface ToolInput {
  name: ToolName;
  args: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Tool implementations
const tools = {
  /**
   * Fetch current price for a financial asset
   */
  async fetchPrice({ symbol }: { symbol: string }): Promise<ToolResult> {
    try {
      console.log(`[TOOL:fetchPrice] Fetching price for ${symbol}`);
      
      // Try multiple sources for better reliability
      const apiKey = process.env.FINNHUB_API_KEY;
      
      if (!apiKey) {
        return {
          success: false,
          error: 'Price API not configured'
        };
      }

      // Determine asset type and fetch accordingly
      const upperSymbol = symbol.toUpperCase();
      
      // Check if it's a crypto symbol
      if (upperSymbol.includes('BTC') || upperSymbol.includes('ETH') || 
          upperSymbol.includes('USDT') || upperSymbol.includes('USDC')) {
        
        // Use CoinMarketCap or Binance
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${upperSymbol}`
        );
        
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: {
              symbol: upperSymbol,
              price: parseFloat(data.price),
              source: 'Binance'
            }
          };
        }
      }
      
      // Try Finnhub for stocks
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${upperSymbol}&token=${apiKey}`
      );
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch price: ${response.status}`
        };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: {
          symbol: upperSymbol,
          price: data.c, // Current price
          change: data.d, // Change
          changePercent: data.dp, // Change percent
          high: data.h,
          low: data.l,
          open: data.o,
          previousClose: data.pc,
          source: 'Finnhub'
        }
      };
      
    } catch (error) {
      console.error('[TOOL:fetchPrice] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Read and summarize an article from a URL
   */
  async readArticle({ url }: { url: string }): Promise<ToolResult> {
    try {
      console.log(`[TOOL:readArticle] Reading article from ${url}`);
      
      // Fetch the article
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JarvisBot/1.0)'
        }
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch article: ${response.status}`
        };
      }
      
      const html = await response.text();
      
      // Basic HTML stripping (consider using cheerio for better parsing)
      const text = html
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000); // Limit to 8000 chars
      
      return {
        success: true,
        data: {
          url,
          content: text,
          length: text.length
        }
      };
      
    } catch (error) {
      console.error('[TOOL:readArticle] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Modify app state (e.g., add transaction, update portfolio)
   */
  async modifyApp({ action, data }: { action: string; data: any }): Promise<ToolResult> {
    try {
      console.log(`[TOOL:modifyApp] Action: ${action}`, data);
      
      // For security, only allow specific actions
      const allowedActions = ['addTransaction', 'updateAsset', 'deleteAsset'];
      
      if (!allowedActions.includes(action)) {
        return {
          success: false,
          error: `Action '${action}' is not allowed`
        };
      }
      
      // In a real implementation, this would interact with your database
      // For now, return success with the data
      
      return {
        success: true,
        data: {
          action,
          applied: data,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('[TOOL:modifyApp] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
};

/**
 * POST /api/tools
 * Execute a tool by name with provided arguments
 */
export async function POST(req: NextRequest) {
  try {
    const { name, args }: ToolInput = await req.json();
    
    console.log(`[TOOLS] Executing tool: ${name}`);
    
    // Validate tool name
    if (!(name in tools)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown tool: ${name}`
        },
        { status: 400 }
      );
    }
    
    // Execute the tool
    const result = await (tools as any)[name](args || {});
    
    // Return result
    return NextResponse.json(result, {
      status: result.success ? 200 : 500
    });
    
  } catch (error) {
    console.error('[TOOLS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tools
 * Return available tools and their schemas
 */
export async function GET() {
  return NextResponse.json({
    tools: [
      {
        name: 'fetchPrice',
        description: 'Fetch current price for a financial asset (stocks, crypto, forex)',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Asset symbol (e.g., AAPL, BTCUSDT, EURUSD)'
            }
          },
          required: ['symbol']
        }
      },
      {
        name: 'readArticle',
        description: 'Read and extract content from a web article or news URL',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the article to read'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'modifyApp',
        description: 'Modify app state (add transactions, update assets, etc.)',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['addTransaction', 'updateAsset', 'deleteAsset'],
              description: 'Action to perform'
            },
            data: {
              type: 'object',
              description: 'Data for the action'
            }
          },
          required: ['action', 'data']
        }
      }
    ]
  });
}
