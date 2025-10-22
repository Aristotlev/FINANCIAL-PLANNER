/**
 * Tool Registry for Gemini Function Calling
 * Defines available tools and their schemas
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

/**
 * Tool definitions for Gemini function calling
 * These match the tools implemented in /app/api/tools/route.ts
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'fetchPrice',
    description: 'Fetch the current market price for a financial asset including stocks, cryptocurrencies, and forex pairs. Returns real-time price data.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'The asset symbol to fetch price for. Examples: AAPL (Apple stock), BTCUSDT (Bitcoin), EURUSD (Euro/Dollar forex pair)'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'readArticle',
    description: 'Read and extract the main content from a web article or news URL. Useful for summarizing or analyzing online content.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full URL of the article to read (must start with http:// or https://)'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'modifyApp',
    description: 'Modify the application state by performing actions like adding transactions, updating assets, or deleting items from the portfolio.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['addTransaction', 'updateAsset', 'deleteAsset'],
          description: 'The type of modification to perform on the app state'
        },
        data: {
          type: 'object',
          description: 'The data payload for the action. Structure depends on the action type.'
        }
      },
      required: ['action', 'data']
    }
  }
];

/**
 * Convert tool definitions to Gemini function declaration format
 */
export function getGeminiTools() {
  return TOOL_DEFINITIONS.map(tool => ({
    functionDeclarations: [{
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }]
  }));
}

/**
 * Parse function call response from Gemini
 */
export interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

export function parseFunctionCall(response: any): FunctionCall | null {
  try {
    // Check if response contains function call
    if (!response?.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
      return null;
    }

    const functionCall = response.candidates[0].content.parts[0].functionCall;
    
    return {
      name: functionCall.name,
      args: functionCall.args || {}
    };
  } catch (error) {
    console.error('[TOOLS] Failed to parse function call:', error);
    return null;
  }
}

/**
 * Execute a tool via the tools API
 */
export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  console.log(`[TOOLS] Executing ${name} with args:`, args);
  
  try {
    const response = await fetch('/api/tools', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, args })
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Tool execution failed');
    }

    return result.data;
  } catch (error) {
    console.error(`[TOOLS] Error executing ${name}:`, error);
    throw error;
  }
}
