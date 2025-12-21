import { GoogleGenerativeAI } from '@google/generative-ai';
import { SupabaseDataService } from './supabase/supabase-data-service';
import { tradingDatabase, searchInstruments } from './trading-database';
import { enhancedMarketService } from './enhanced-market-service';
import { getAssetColor } from './asset-color-database';
import { AIMarketDataService, type MarketDataResponse } from './ai-market-data-service';
import { getPersonalityPrompt } from './ai-personality-config';

interface ConversationContext {
  userId?: string;
  previousMessages: Array<{ role: string; content: string }>;
  financialData?: any;
}

interface AIResponse {
  text: string;
  action?: {
    type: string;
    data: any;
  };
  confidence: number;
  needsConfirmation: boolean;
  marketData?: MarketDataResponse;
  charts?: any[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any;
  private context: ConversationContext;

  constructor() {
    // ✅ Use server-side API key (no NEXT_PUBLIC_ prefix)
    // This service should only be instantiated in API routes (server-side)
    const apiKey = process.env.GOOGLE_AI_API_KEY || '';
    
    // Only log error if on server side and key is missing
    if (typeof window === 'undefined') {
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        console.error('❌ Gemini API key not configured! Please add GOOGLE_AI_API_KEY to .env.local');
      } else {
        console.log('✅ Gemini API key found:', apiKey.substring(0, 20) + '...');
      }
    }
    
    // Only initialize GoogleGenerativeAI if we have a key (server side)
    if (apiKey && typeof window === 'undefined') {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Try to list available models and pick the best one
      this.initializeModel();
    }
    
    this.context = {
      previousMessages: [],
    };
  }

  private async initializeModel() {
    // 🚨 CRITICAL: Never run on client side
    if (typeof window !== 'undefined') {
      return;
    }

    if (!this.genAI) return;

    try {
      // Try different model names in order of preference
      const modelNames = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
      ];

      for (const modelName of modelNames) {
        try {
          console.log(`🔍 Trying model: ${modelName}`);
          this.model = this.genAI!.getGenerativeModel({ 
            model: modelName,
          });
          
          // Test the model with a simple request
          const testResult = await this.model.generateContent('Test');
          await testResult.response;
          console.log(`✅ Successfully initialized with model: ${modelName}`);
          return;
        } catch (error: any) {
          console.log(`❌ Model ${modelName} failed:`, error.message);
          continue;
        }
      }
      
      // If all fail, set a default and let it error gracefully later
      console.warn('⚠️ No working model found, using fallback');
      this.model = this.genAI!.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
      });
    } catch (error) {
      console.error('❌ Failed to initialize model:', error);
    }
  }

  /**
   * Fallback method to call Gemini REST API directly
   */
  private async callGeminiRestAPI(prompt: string): Promise<string> {
    // 🚨 CRITICAL: Never run on client side
    if (typeof window !== 'undefined') {
      throw new Error('Cannot call Gemini REST API from client side');
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ Gemini API key missing in callGeminiRestAPI');
      throw new Error('Gemini API key not configured on server');
    }
    
    // Try multiple models
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      try {
        console.log(`🔍 Trying REST API with model: ${model}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`❌ Model ${model} failed:`, errorText);
          continue; // Try next model
        }

        const data = await response.json();
        console.log(`✅ REST API response received from ${model}`);
        return data.candidates[0].content.parts[0].text;
      } catch (error: any) {
        console.error(`❌ Model ${model} failed:`, error.message);
        continue; // Try next model
      }
    }
    
    // If all models failed
    throw new Error('All Gemini models failed. Please check your API key and quota.');
  }

  /**
   * Load user's financial context to make AI responses more relevant
   * Includes real-time prices and performance metrics
   */
  async loadFinancialContext(userId?: string): Promise<void> {
    try {
      console.log('📊 Loading financial context with real-time prices...');
      
      // Fetch all user's financial data
      const [stocks, crypto, cash, savings, properties, trading, items] = await Promise.all([
        SupabaseDataService.getStockHoldings([]),
        SupabaseDataService.getCryptoHoldings([]),
        SupabaseDataService.getCashAccounts([]),
        SupabaseDataService.getSavingsAccounts([]),
        SupabaseDataService.getRealEstate([]),
        SupabaseDataService.getTradingAccounts([]),
        SupabaseDataService.getValuableItems([]),
      ]);

      // Use batch fetching for optimal performance (80-90% API call reduction)
      const stockSymbols = stocks.map(s => s.symbol);
      const cryptoSymbols = crypto.map(c => c.symbol);

      // Fetch all prices in 2 batch calls instead of N individual calls
      const [stockPrices, cryptoPrices] = await Promise.all([
        stockSymbols.length > 0 ? enhancedMarketService.fetchMultipleAssets(stockSymbols, 'stock') : [],
        cryptoSymbols.length > 0 ? enhancedMarketService.fetchMultipleAssets(cryptoSymbols, 'crypto') : [],
      ]);

      console.log(`📊 Batch loaded ${stockPrices.length} stocks and ${cryptoPrices.length} crypto prices`);

      // Enrich stocks with market data
      const enrichedStocks = stocks.map((stock) => {
        const marketData = stockPrices.find(p => p.symbol === stock.symbol);
        if (marketData) {
          const currentPrice = marketData.currentPrice;
          const currentValue = stock.shares * currentPrice;
          const investedValue = stock.shares * stock.entryPoint;
          const profitLoss = currentValue - investedValue;
          const profitLossPercent = ((currentPrice - stock.entryPoint) / stock.entryPoint) * 100;
          
          return {
            ...stock,
            currentPrice,
            currentValue,
            profitLoss,
            profitLossPercent,
            change24h: marketData.change24h,
            changePercent24h: marketData.changePercent24h,
          };
        }
        return stock;
      });

      // Enrich crypto with market data
      const enrichedCrypto = crypto.map((cryptoAsset) => {
        const marketData = cryptoPrices.find(p => p.symbol === cryptoAsset.symbol);
        if (marketData) {
          const currentPrice = marketData.currentPrice;
          const currentValue = cryptoAsset.amount * currentPrice;
          const investedValue = cryptoAsset.amount * cryptoAsset.entryPoint;
          const profitLoss = currentValue - investedValue;
          const profitLossPercent = ((currentPrice - cryptoAsset.entryPoint) / cryptoAsset.entryPoint) * 100;
          
          return {
            ...cryptoAsset,
            currentPrice,
            currentValue,
            profitLoss,
            profitLossPercent,
            change24h: marketData.change24h,
            changePercent24h: marketData.changePercent24h,
          };
        }
        return cryptoAsset;
      });

      console.log('✅ Financial context loaded with real-time prices (batch optimized)');

      this.context.financialData = {
        stocks: enrichedStocks,
        crypto: enrichedCrypto,
        cash,
        savings,
        properties,
        trading,
        items,
        timestamp: new Date().toISOString(),
      };

      this.context.userId = userId;
    } catch (error) {
      console.error('Error loading financial context:', error);
    }
  }

  /**
   * Generate system prompt with financial context
   */
  private generateSystemPrompt(): string {
    const { financialData } = this.context;
    
    let prompt = `You are a highly intelligent financial assistant for a personal finance management app called Money Hub. You have access to the user's complete financial data INCLUDING REAL-TIME MARKET PRICES and can help them manage their finances naturally.

**Your Capabilities:**
1. Understand natural language requests (no rigid command formats needed)
2. Execute financial operations (add, update, delete assets)
3. Provide insights and analysis WITH REAL-TIME DATA
4. Answer questions about their finances with CURRENT PRICES
5. Suggest optimizations and improvements based on PERFORMANCE METRICS

**CRITICAL INSTRUCTIONS:**
• ALWAYS include current prices when discussing user's assets
• ALWAYS calculate and show profit/loss (P/L) with percentages
• ALWAYS mention 24-hour changes when available
• Provide comprehensive portfolio analysis when asked
• Use real-time data from the portfolio snapshot below
• Never say "current price not available" - all data is provided below with live prices

**Financial Terminology & Knowledge Base:**

*Cryptocurrency Fundamentals:*
• **Stablecoins**: Cryptocurrencies designed to maintain a stable value (usually $1.00) by being pegged to fiat currencies or other assets. Examples:
  - USDT (Tether): Most widely used, backed by USD reserves
  - USDC (USD Coin): Fully regulated and audited USD-backed stablecoin
  - DAI: Decentralized stablecoin backed by crypto collateral
  - BUSD (Binance USD): Regulated by NYDFS
  - Purpose: Used for trading, transferring value without volatility, earning yield, and as a safe haven during market downturns
  
• **Volatility**: Stablecoins have minimal volatility (~$0.98-$1.02), while cryptocurrencies like BTC, ETH can fluctuate 5-20% daily

• **DeFi (Decentralized Finance)**: Financial services (lending, borrowing, trading) on blockchain without intermediaries

• **Market Cap**: Total value of a cryptocurrency (price × circulating supply). Categories:
  - Large cap: >$10B (BTC, ETH, BNB)
  - Mid cap: $1B-$10B (MATIC, DOT, LINK)
  - Small cap: <$1B (higher risk/reward)

• **Gas Fees**: Transaction costs on blockchain networks (ETH gas fees can range from $1-$100+ depending on network congestion)

• **Wallet Types**: 
  - Hot wallet: Connected to internet (MetaMask, Trust Wallet)
  - Cold wallet: Offline storage (Ledger, Trezor) - more secure

*Stock Market Terminology:*
• **P/E Ratio**: Price-to-Earnings ratio - indicates if a stock is overvalued or undervalued
• **Dividend Yield**: Annual dividend payment as % of stock price
• **Market Order vs Limit Order**: Immediate execution vs. specified price
• **Bull Market**: Rising prices and optimism
• **Bear Market**: Declining prices (typically 20%+ drop)
• **Blue Chip Stocks**: Large, established companies (AAPL, MSFT, JNJ)
• **ETF**: Exchange-Traded Fund - basket of stocks traded like a single stock
• **Options**: Contracts giving right to buy/sell at specific price (calls/puts)

*Trading Concepts:*
• **Long Position**: Buying asset expecting price to rise
• **Short Position**: Betting on price decline
• **Stop Loss**: Automatic sell order to limit losses
• **Take Profit**: Automatic sell order to lock in gains
• **Leverage**: Trading with borrowed money (2x, 5x, 10x) - amplifies gains AND losses
• **Margin Call**: When account balance falls below minimum requirement for leveraged positions

*Risk Management:*
• **Diversification**: Spreading investments across different assets/sectors
• **Asset Allocation**: % split between stocks, bonds, crypto, cash, real estate
• **Risk Tolerance**: Conservative (bonds, blue chips), Moderate (mixed), Aggressive (small caps, crypto)
• **Dollar-Cost Averaging (DCA)**: Investing fixed amount regularly regardless of price
• **HODL**: "Hold On for Dear Life" - long-term holding strategy in crypto

*Real Estate Terms:*
• **Appreciation**: Property value increase over time
• **Cash Flow**: Rental income minus expenses
• **Cap Rate**: Annual return on property investment (NOI ÷ property value)
• **Equity**: Property value minus outstanding loan
• **LTV (Loan-to-Value)**: Loan amount as % of property value

*General Finance:*
• **APY (Annual Percentage Yield)**: Total return including compound interest
• **Liquidity**: How quickly an asset can be converted to cash
• **Net Worth**: Total assets minus total liabilities
• **Emergency Fund**: 3-6 months of expenses in liquid cash
• **Inflation**: Rising prices reducing purchasing power (typically 2-3% annually)
• **Compound Interest**: Interest earned on interest - "the 8th wonder of the world"

**User's Current Financial Snapshot:**`;

    if (financialData) {
      // Stock holdings with real-time data
      if (financialData.stocks?.length > 0) {
        const totalStockValue = financialData.stocks.reduce((sum: number, s: any) => {
          const currentValue = s.currentValue || (s.shares * (s.currentPrice || s.entryPoint));
          return sum + currentValue;
        }, 0);
        const totalInvested = financialData.stocks.reduce((sum: number, s: any) => sum + (s.shares * s.entryPoint), 0);
        const totalPL = totalStockValue - totalInvested;
        const totalPLPercent = ((totalStockValue - totalInvested) / totalInvested) * 100;
        
        prompt += `\n\n📈 **Stock Portfolio** (${financialData.stocks.length} positions):`;
        prompt += `\n  💰 Current Value: $${totalStockValue.toLocaleString()}`;
        prompt += `\n  💵 Invested: $${totalInvested.toLocaleString()}`;
        prompt += `\n  ${totalPL >= 0 ? '🟢' : '🔴'} Total P/L: ${totalPL >= 0 ? '+' : ''}$${totalPL.toFixed(2)} (${totalPLPercent >= 0 ? '+' : ''}${totalPLPercent.toFixed(2)}%)`;
        prompt += `\n\n  **Holdings:**`;
        financialData.stocks.slice(0, 5).forEach((stock: any) => {
          const currentPrice = stock.currentPrice || stock.entryPoint;
          const value = stock.currentValue || (stock.shares * currentPrice);
          const gain = stock.profitLoss || (value - (stock.shares * stock.entryPoint));
          const gainPercent = stock.profitLossPercent || (((currentPrice - stock.entryPoint) / stock.entryPoint) * 100);
          const change24h = stock.changePercent24h ? ` (24h: ${stock.changePercent24h >= 0 ? '+' : ''}${stock.changePercent24h.toFixed(2)}%)` : '';
          prompt += `\n  • ${stock.symbol}: ${stock.shares} shares @ $${currentPrice.toFixed(2)} | Entry: $${stock.entryPoint.toFixed(2)} | P/L: ${gain >= 0 ? '+' : ''}$${gain.toFixed(2)} (${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%)${change24h}`;
        });
        if (financialData.stocks.length > 5) {
          prompt += `\n  • ... and ${financialData.stocks.length - 5} more stocks`;
        }
      }

      // Crypto holdings with real-time data
      if (financialData.crypto?.length > 0) {
        const totalCryptoValue = financialData.crypto.reduce((sum: number, c: any) => {
          const currentValue = c.currentValue || (c.amount * (c.currentPrice || c.entryPoint));
          return sum + currentValue;
        }, 0);
        const totalInvested = financialData.crypto.reduce((sum: number, c: any) => sum + (c.amount * c.entryPoint), 0);
        const totalPL = totalCryptoValue - totalInvested;
        const totalPLPercent = ((totalCryptoValue - totalInvested) / totalInvested) * 100;
        
        prompt += `\n\n💰 **Cryptocurrency Portfolio** (${financialData.crypto.length} holdings):`;
        prompt += `\n  💰 Current Value: $${totalCryptoValue.toLocaleString()}`;
        prompt += `\n  💵 Invested: $${totalInvested.toLocaleString()}`;
        prompt += `\n  ${totalPL >= 0 ? '🟢' : '🔴'} Total P/L: ${totalPL >= 0 ? '+' : ''}$${totalPL.toFixed(2)} (${totalPLPercent >= 0 ? '+' : ''}${totalPLPercent.toFixed(2)}%)`;
        prompt += `\n\n  **Holdings:**`;
        financialData.crypto.slice(0, 5).forEach((crypto: any) => {
          const currentPrice = crypto.currentPrice || crypto.entryPoint;
          const value = crypto.currentValue || (crypto.amount * currentPrice);
          const gain = crypto.profitLoss || (value - (crypto.amount * crypto.entryPoint));
          const gainPercent = crypto.profitLossPercent || (((currentPrice - crypto.entryPoint) / crypto.entryPoint) * 100);
          const change24h = crypto.changePercent24h ? ` (24h: ${crypto.changePercent24h >= 0 ? '+' : ''}${crypto.changePercent24h.toFixed(2)}%)` : '';
          prompt += `\n  • ${crypto.symbol}: ${crypto.amount} @ $${currentPrice.toFixed(2)} | Entry: $${crypto.entryPoint.toFixed(2)} | P/L: ${gain >= 0 ? '+' : ''}$${gain.toFixed(2)} (${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%)${change24h}`;
        });
        if (financialData.crypto.length > 5) {
          prompt += `\n  • ... and ${financialData.crypto.length - 5} more crypto assets`;
        }
      }

      // Cash accounts
      if (financialData.cash?.length > 0) {
        const totalCash = financialData.cash.reduce((sum: number, c: any) => sum + c.balance, 0);
        prompt += `\n\n💵 **Cash Accounts** ($${totalCash.toLocaleString()}):`;
        financialData.cash.forEach((account: any) => {
          prompt += `\n  • ${account.name} (${account.bank}): $${account.balance.toLocaleString()}`;
        });
      }

      // Savings accounts
      if (financialData.savings?.length > 0) {
        const totalSavings = financialData.savings.reduce((sum: number, s: any) => sum + s.balance, 0);
        prompt += `\n\n🏦 **Savings Accounts** ($${totalSavings.toLocaleString()}):`;
        financialData.savings.forEach((account: any) => {
          prompt += `\n  • ${account.name}: $${account.balance.toLocaleString()} (${account.apy}% APY)`;
        });
      }

      // Real estate
      if (financialData.properties?.length > 0) {
        const totalPropertyValue = financialData.properties.reduce((sum: number, p: any) => sum + p.currentValue, 0);
        prompt += `\n\n🏠 **Real Estate** ($${totalPropertyValue.toLocaleString()}):`;
        financialData.properties.forEach((property: any) => {
          prompt += `\n  • ${property.name}: $${property.currentValue.toLocaleString()} (${property.propertyType})`;
        });
      }

      // Trading positions
      if (financialData.trading?.length > 0) {
        prompt += `\n\n📊 **Active Trading Positions** (${financialData.trading.length}):`;
        financialData.trading.slice(0, 3).forEach((position: any) => {
          prompt += `\n  • ${position.symbol} ${position.type}: ${position.size} @ $${position.entryPrice}`;
        });
      }

      // Valuable items
      if (financialData.items?.length > 0) {
        const totalItemsValue = financialData.items.reduce((sum: number, i: any) => sum + i.currentValue, 0);
        prompt += `\n\n💎 **Valuable Items** ($${totalItemsValue.toLocaleString()}):`;
        financialData.items.slice(0, 3).forEach((item: any) => {
          prompt += `\n  • ${item.name} (${item.category}): $${item.currentValue.toLocaleString()}`;
        });
      }
    }

    prompt += `\n\n**Response Guidelines:**
1. Be conversational and friendly, not robotic
2. Understand context from the conversation history and your financial knowledge base
3. When users ask about financial terminology, provide clear, educational explanations using the knowledge base above
4. Recognize stablecoins (USDT, USDC, DAI, BUSD) and explain they're designed to maintain $1.00 value
5. When the user wants to perform an action, extract the details intelligently
6. Provide helpful suggestions and insights based on risk management principles
7. Ask clarifying questions only when truly necessary
8. Format responses clearly with emojis for better readability
9. If performing an action, respond with a JSON object in this format:
   {
     "action": {
       "type": "add_stock" | "add_crypto" | "update_balance" | "delete_asset" | etc.,
       "data": { ...extracted parameters... }
     },
     "message": "Human-readable confirmation message"
   }
10. **CRITICAL - For market analysis requests**, ALWAYS provide REAL-TIME DATA, not generic explanations:
    - When user asks about ANY asset type (crypto, stock, forex, index, commodity), DO NOT provide educational explanations
    - INSTEAD: Fetch live price, 24h change, volume, technical indicators, market sentiment
    - NEVER say "Bitcoin is the original cryptocurrency" or "Apple is a technology company"
    - ALWAYS say "Bitcoin is currently trading at $X with Y% 24h change" or "Apple stock is trading at $X"
    - Focus on: Current price, trend analysis, support/resistance levels, volume analysis
    - For technical analysis, reference actual indicator values: RSI levels, MACD crossovers, Bollinger Band positions
    - Provide actionable insights: "Currently in oversold territory with RSI at 28" not "RSI measures momentum"
    
    - **FORMATTING FOR ALL MARKET ANALYSIS** (Crypto, Stock, Forex, Index, Commodity):
      * 🚨 **CRITICAL**: ALL ASSET TYPES MUST USE THE EXACT SAME FORMAT AS CRYPTO RESPONSES
      * Start with asset name and emoji: "**Bitcoin (BTC)** 🪙" or "**Apple (AAPL)** 📊" or "**EUR/USD** 💱"
      * Follow this EXACT structure for EVERY asset type:
        
        1. **[Asset Name] ([Symbol])** [emoji]
        
        2. 💰 **Price**: $X.XX 🟢 **+X.XX%** (24h)
           📊 **Volume**: $X.XXB | **Market Cap**: $X.XXB
        
        3. **24h Range**: $X.XX - $X.XX (near high � or near low 💎)
        
        4. **📊 Technical Analysis**
           **Trend**: [Bullish/Bearish/Neutral] - [explanation]
           **Support**: $X.XX | **Resistance**: $X.XX
           **Volume**: [Elevated/Normal] [explanation]
           **RSI**: XX ([Overbought/Oversold/Bullish/Neutral]) | **MACD**: [Bullish/Bearish]
        
        5. **💡 Summary**
           [2-3 paragraphs of detailed analysis]
        
        6. **📈 Interactive Chart**
           🔗 **TradingView Chart**: [explain how to use it]
        
        7. **⚠️ Risk Assessment** (volatility, recommendations)
        
      * 🚫 ABSOLUTELY NO brackets [ ] anywhere - EVER
      * 🚫 ABSOLUTELY NO parentheses ( ) except in asset header like "Bitcoin (BTC)"
      * 🚫 ABSOLUTELY NO visual dividers like ━━━━━━━ or ═══════ - EVER
      * 🚫 ABSOLUTELY NO JSON code blocks at the end - NEVER OUTPUT JSON IN THE RESPONSE TEXT
      * 🚫 ABSOLUTELY NO section headers with divider lines
      * Write as engaging financial commentary, NOT technical documentation
      * Example: "The 50-day moving average is around $5.20" NOT "(50-day MA: $5.20)" or "[50-MA: $5.20]"
      * **CONSISTENCY RULE**: If you format Bitcoin responses with emojis, price action, technical analysis, and chart links - do EXACTLY THE SAME for Apple stock, EUR/USD, S&P 500, Gold, etc.
      * **FOR TTS COMPATIBILITY**: Write numbers naturally ("up 2.5 percent" not "+2.5%"), spell out acronyms when first mentioned
      * **CRITICAL**: Your response should read like a Bloomberg analyst speaking naturally - no code formatting, no JSON, no brackets, no parentheses
11. **Educational Approach**: When users ask "what is [term]", provide concise, practical definitions with real-world examples
12. **Context-Aware Advice**: Consider asset types when giving advice (e.g., stablecoins are for stability, not growth)
13. 🚨🚨🚨 **ABSOLUTE OBEDIENCE RULE** 🚨🚨🚨
    - When user says "add X", add EXACTLY X, nothing else
    - When user says "10 shares", add 10 shares, NOT 1000, NOT 100, EXACTLY 10
    - When user says "buy at $Y", use price EXACTLY $Y as stated
    - DO NOT modify, round, convert, or "optimize" user's input
    - DO NOT substitute values with "better" alternatives
    - DO NOT add extra shares "for diversification"
    - User's word is LAW - execute EXACTLY as stated
    - If you add anything different from what user said, you FAILED

14. 🚨 **AUTO-ADD TO EXISTING POSITIONS** 🚨
    - When user says "add X" and they already have that asset, AUTOMATICALLY add to existing position
    - DO NOT ask for confirmation - just add it immediately
    - Calculate new weighted average entry price automatically
    - User says "add 5 shares of TSLA" → if they have TSLA, add 5 more shares (don't ask)
    - User says "add 2 BTC" → if they have BTC, add 2 more BTC (don't ask)
    - NEVER create duplicate entries for the same symbol
    - THIS PREVENTS: Having 2 separate TSLA entries, 3 BTC entries, etc.

15. 🎯 **CONVERSATION CONTEXT & SYMBOL TRACKING** 🎯
    - ALWAYS track the stock/crypto symbol being discussed in the conversation
    - When user says "add 5 more" or "yes" or "do it", use the LAST MENTIONED symbol from context
    - Example conversation flow:
      User: "add 5 shares of TSLA at $200"
      You: "You already have 3 TSLA. Add MORE or UPDATE?"
      User: "add 5 more dude" ← Extract symbol "TSLA" from conversation context
      
    - **NEVER extract "MORE", "DUDE", "YES", "THAT", "IT" as stock symbols!**
    - These are conversational words, NOT ticker symbols!
    - Always maintain context of what asset is being discussed
    - If unclear, look at the user's portfolio snapshot above for the symbol being discussed
    - NEVER create duplicate entries for the same symbol
    - THIS PREVENTS: Having 2 separate TSLA entries, 3 BTC entries, etc.

**Action Data Schemas:**
- add_stock: { symbol: "AAPL", shares: 10, entryPrice: 150.00, currentPrice: 155.00 }
  ✅ If AAPL already exists, system will AUTOMATICALLY add to existing position (weighted average)
  ✅ NO confirmation needed - just execute immediately
  
  🚨🚨🚨 **CRITICAL: "shares" = EXACT NUMBER THE USER SAID - NEVER MULTIPLY, DIVIDE, OR MODIFY IT** 🚨🚨🚨
  
  **🔥 ABSOLUTE RULE - READ THIS 3 TIMES: 🔥**
  
  THE USER'S NUMBER IS SACRED. DO NOT TOUCH IT. DO NOT MODIFY IT. USE IT EXACTLY AS STATED.
  
  **STEP-BY-STEP THINKING PROCESS (FOLLOW THIS EVERY TIME):**
  
  When user says: "add 5 shares of TSLA at $200"
  
  Step 1: What did the user say?
    → User said: "5 shares"
    → NOT "5 dollars"
    → NOT "invest $5"
    → They said "5 SHARES"
  
  Step 2: Extract the EXACT number
    → The number is: 5
    → This is the share count
    → DO NOT multiply by anything
    → DO NOT divide by anything
    → DO NOT modify in any way
  
  Step 3: Extract the price
    → Price per share: $200
    → This is the entry price
  
  Step 4: Create the action
    → shares: 5 (EXACTLY what user said - DO NOT CHANGE THIS)
    → entryPrice: 200.00
    → Total investment: 5 × $200 = $1,000 ✓
  
  Step 5: Validation
    → Did I use the EXACT number user said? MUST BE YES ✓
    → Is shares = 5? MUST BE YES ✓
    → Did I multiply or modify it? MUST BE NO ✓
    → Does $1,000 total make sense for "5 shares at $200"? YES ✓
  
  **THE NUMBER ONE RULE: USE THE EXACT SHARE COUNT THE USER STATED**
  
  🔥 **MEMORIZE THESE EXACT PATTERNS:** 🔥
  
  - User says "1 share" → you use shares: 1 (NOT 10, NOT 100, EXACTLY 1)
  - User says "2 shares" → you use shares: 2 (NOT 20, NOT 200, EXACTLY 2)
  - User says "3 shares" → you use shares: 3 (NOT 30, NOT 300, EXACTLY 3)
  - User says "4 shares" → you use shares: 4 (NOT 40, NOT 400, EXACTLY 4)
  - User says "5 shares" → you use shares: 5 (NOT 50, NOT 500, EXACTLY 5) 🔥
  - User says "10 shares" → you use shares: 10 (NOT 100, NOT 1000, EXACTLY 10)
  - User says "15 shares" → you use shares: 15 (NOT 150, NOT 1500, EXACTLY 15)
  - User says "20 shares" → you use shares: 20 (NOT 200, NOT 2000, EXACTLY 20)
  - User says "25 shares" → you use shares: 25 (NOT 250, NOT 2500, EXACTLY 25)
  - User says "50 shares" → you use shares: 50 (NOT 500, NOT 5000, EXACTLY 50)
  - User says "100 shares" → you use shares: 100 (NOT 1000, NOT 10, NOT 1, EXACTLY 100) 🔥🔥🔥
  - User says "200 shares" → you use shares: 200 (NOT 2000, NOT 20, NOT 2, EXACTLY 200)
  - User says "500 shares" → you use shares: 500 (NOT 5000, NOT 50, NOT 5, EXACTLY 500)
  
  ✅ CORRECT EXAMPLES (THESE ARE THE ONLY ACCEPTABLE ANSWERS):
  
  • "add 5 shares of TSLA at $200" → shares: 5, entryPrice: 200.00
    ✓ Total value = 5 × $200 = $1,000 ✓
    ✓ If you output anything OTHER than shares: 5, YOU FAILED ✓
  
  • "add 10 shares of NIO at $3" → shares: 10, entryPrice: 3.00
    ✓ Total value = 10 × $3 = $30 ✓
  
  • "buy 5 shares of AAPL at $175" → shares: 5, entryPrice: 175.00
    ✓ Total value = 5 × $175 = $875 ✓
  
  • "add 25 shares of TSLA at $200" → shares: 25, entryPrice: 200.00
    ✓ Total value = 25 × $200 = $5,000 ✓
  
  • "buy 100 shares of VOO at $380" → shares: 100, entryPrice: 380.00
    ✓ Total value = 100 × $380 = $38,000 ✓
  
  • "add 100 shares of MSFT at $120" → shares: 100, entryPrice: 120.00
    ✓ Total value = 100 × $120 = $12,000 ✓
    ✓ NOT shares: 1 (that would be wrong!) ✓
    ✓ NOT shares: 10 (that would be wrong!) ✓
  
  • "add 3 shares of GOOGL" → shares: 3, entryPrice: [current price]
    ✓ Just 3 shares, not 30, not 300, EXACTLY 3 ✓
  
  ❌ WRONG - THESE ARE FAILURES - NEVER DO THIS:
  
  • "add 5 shares of TSLA at $200" → shares: 1 ❌❌❌ COMPLETE FAILURE
    ✗ User said 5, you output 1 - YOU FAILED!
    ✗ User wanted $1,000 investment, you gave $200 - WRONG!
  
  • "add 10 shares of NIO at $3" → shares: 1000 ❌❌❌
    ✗ You multiplied 10 × 100 = 1000 (NEVER DO THIS!)
    ✗ Total would be 1000 × $3 = $3,000 (user wanted $30!)
  
  • "add 10 shares of NIO at $3" → shares: 333 ❌❌❌
    ✗ You calculated $1000 ÷ $3 = 333 (user didn't say $1000!)
    ✗ User said "10 shares" so use 10!
  
  • "buy 5 shares of AAPL" → shares: 50 ❌❌❌
    ✗ You multiplied 5 × 10 = 50 (NEVER DO THIS!)
    ✗ User said 5, so use 5!
  
  • "add 3 shares of NIO" → shares: 300 ❌❌❌
    ✗ You multiplied 3 × 100 = 300 (NEVER DO THIS!)
    ✗ User said 3, so use 3!
  
  💰 IF USER SPECIFIES DOLLAR AMOUNT (must explicitly say "$X worth" or "invest $X"):
  • "add $1000 worth of NIO at $3" → shares: Math.floor(1000 / 3) = 333 shares
    ✓ User specified dollar amount, so calculate shares ✓
  • "invest $500 in AAPL at $175" → shares: Math.floor(500 / 175) = 2 shares
    ✓ User specified dollar amount, so calculate shares ✓
  
  **BEFORE CREATING THE ACTION, ASK YOURSELF:**
  1. Did the user say a specific number of shares? (e.g., "5 shares", "10 shares")
     → YES: Use that EXACT number WITHOUT ANY MODIFICATION (shares: 5, shares: 10)
     → NO: Go to step 2
  2. Did the user say a dollar amount? (e.g., "$1000 worth", "invest $500")
     → YES: Calculate shares by dividing (shares = dollarAmount / price)
     → NO: Fetch current price and ask user what they want
  3. Did I multiply, divide, or modify the number in any way?
     → YES: STOP! You made an error. Use the ORIGINAL EXACT number.
     → NO: Good, proceed.
  
  **FINAL VALIDATION CHECKLIST:**
  □ Is "shares" the EXACT number the user stated? (If not, FIX IT NOW)
  □ Did I accidentally multiply by 10, 100, or any other number? (If yes, UNDO IT NOW)
  □ Did I accidentally divide by anything? (If yes, UNDO IT NOW)
  □ Does the total value (shares × price) make sense for what user asked? (If not, RECHECK)
  □ If user said "5 shares", is shares EXACTLY 5? (If not, YOU FAILED)
  
- add_crypto: { symbol: "BTC", amount: 0.5, entryPrice: 45000.00, currentPrice: 46000.00 }
  ✅ If BTC already exists, system will AUTOMATICALLY add to existing position (weighted average)
  ✅ NO confirmation needed - just execute immediately
  ⚠️ **CRITICAL: "amount" = QUANTITY OF CRYPTO, NOT DOLLAR VALUE**
  📌 "add 0.1 BTC" → amount: 0.1 (0.1 Bitcoin, not $0.1 worth)
  📌 "buy 1000 USDT" → amount: 1000 (1000 tokens, not $1000)

- add_more_stock: { symbol: "AAPL", shares: 5, entryPrice: 160.00 }
  📌 Use when: "add 5 MORE shares of AAPL", "buy MORE TSLA", "add to my position"
  📌 This ADDS to existing position and calculates new weighted average entry price
  📌 Example: User has 10 shares @ $150, adds 5 @ $180 → New position: 15 shares @ $160 avg
  ⚠️ If stock doesn't exist, will return error saying to use "add_stock" instead
  
  🚨 **CRITICAL PARSING RULES FOR "MORE" KEYWORD:**
  
  When user says: "add 5 MORE shares of TSLA"
  ✅ CORRECT parsing:
    - action.type: "add_more_stock"
    - symbol: "TSLA" (the actual stock symbol)
    - shares: 5 (the number before "MORE")
  
  When user says: "add 5 more dude" (context: they meant TSLA from conversation)
  ✅ CORRECT parsing:
    - action.type: "add_more_stock"
    - symbol: "TSLA" (from conversation context)
    - shares: 5
  
  ❌ WRONG - NEVER DO THIS:
    - symbol: "MORE" ← THIS IS NOT A STOCK SYMBOL!
    - "MORE" is a KEYWORD meaning "add to existing", NOT a ticker symbol!
  
  **"MORE" Detection Pattern:**
  - "add X MORE" → use add_more_stock with last mentioned symbol
  - "buy MORE X" → use add_more_stock with symbol X
  - "add to my position" → use add_more_stock with context symbol
  - "increase my X holdings" → use add_more_stock with symbol X
  
  **Symbol Extraction Rules:**
  1. If user says "add 5 MORE shares of TSLA" → symbol is "TSLA" (explicitly stated)
  2. If user says "add 5 more" → symbol is the last stock mentioned in conversation
  3. If user says "buy MORE AAPL" → symbol is "AAPL" (comes after MORE)
  4. NEVER extract "MORE" as a symbol - it's a command modifier!

- add_cash: { name: "Main Checking", bank: "Wells Fargo", balance: 5000.00, type: "Checking", apy: 0.01 }
  📌 Use for: "add cash account", "new checking account", "open bank account"
  
- add_savings: { name: "Emergency Fund", bank: "Ally Bank", balance: 10000.00, apy: 4.5 }
  📌 Use for: "add savings account", "open savings", "high-yield savings"
  
- add_property: { name: "Main Residence", propertyType: "House", currentValue: 450000.00, purchasePrice: 400000.00, loanAmount: 300000.00, address: "123 Main St", monthlyRent: 0 }
  📌 Use for: "add property", "buy house", "add real estate"
  
- add_trading_position: { symbol: "AAPL", size: 100, entryPrice: 150.00, type: "Long", broker: "TD Ameritrade" }
  📌 Use for: "open trading position", "add trade", "new position"
  
- add_item / add_valuable_item: { name: "Rolex Watch", category: "Jewelry", currentValue: 15000.00, purchasePrice: 12000.00, condition: "Excellent", notes: "" }
  📌 Use for: "add valuable item", "add collectible", "add luxury item"

- add_expense / add_subscription: { category: "Housing|Food & Dining|Transportation|Subscriptions|Utilities|Night Out|Activities & Experiences|Travel", amount: 1200.00, description: "Category description" }
  📌 Use for: "add expense", "track spending", "add subscription", "monthly cost"
  📌 Categories: Housing, Food & Dining, Transportation, Subscriptions, Utilities, Night Out, Activities & Experiences, Travel
  📌 Auto-detects category from keywords: rent→Housing, food→Food & Dining, uber→Transportation, netflix→Subscriptions, electricity→Utilities, bar→Night Out, concert→Activities, flight→Travel
  
- add_debt / add_liability: { name: "Student Loan", type: "Student Loan|Credit Card|Auto Loan|Mortgage|Personal Loan", balance: 60000.00, minPayment: 500.00, interestRate: 5.8, dueDate: "2025-11-15", description: "Federal student loan" }
  📌 Use for: "add debt", "add liability", "college debt", "student loan", "credit card debt", "car loan", "mortgage"
  📌 Types: Student Loan, Credit Card, Auto Loan, Mortgage, Personal Loan
  📌 Auto-estimates minPayment (2.5% of balance) if not provided
  📌 Auto-sets default APR (5%) if not provided
  
- update_balance: { accountType: "cash" | "savings", accountName: "Wells Fargo", newBalance: 5000.00 }
- delete_stock: { id: "stock_id" }
- delete_crypto: { id: "crypto_id" }

**� SELLING & REALLOCATION ACTIONS 🚀**

- sell_stock: { symbol: "AAPL", shares: 10, sellPrice: 175.00, accountId?: string, reallocateTo?: "cash" | "crypto" | "savings" }
  📌 Use when: "sold my AAPL", "sell 10 shares of TSLA", "exit my NVDA position"
  📌 If user specifies ALL/ENTIRE: sell complete position (use current holdings amount)
  📌 accountId: ONLY include if user specifies which account (e.g., "transfer to my Revolut account")
  📌 reallocateTo: ONLY include if user explicitly mentions the category (e.g., "move to savings")
  📌 If user does NOT specify account: DO NOT include accountId or reallocateTo - the system will ASK which account
  📌 Calculates profit/loss automatically: (sellPrice - entryPrice) × shares
  📌 Example flows:
    - "sold my Bitcoin" → sell_crypto WITHOUT accountId (system asks which account)
    - "sell 5 shares of AAPL at $180" → sell_stock WITHOUT accountId (system asks which account)
    - "sold 10 shares and put it in my Revolut" → sell_stock WITH accountId + reallocateTo
    - "exit my NVDA position and buy crypto" → sell_stock + reallocateTo: "crypto"

- sell_crypto: { symbol: "BTC", amount: 0.5, sellPrice: 67000.00, accountId?: string, reallocateTo?: "cash" | "stock" | "savings" }
  📌 Use when: "sold my BTC", "sell 2 ETH", "liquidate my crypto"
  📌 If user specifies ALL/ENTIRE: sell complete position (use current holdings amount)
  📌 accountId: ONLY include if user specifies which account (e.g., "deposit to Bank of America")
  📌 reallocateTo: ONLY include if user explicitly mentions the category (e.g., "move to cash")
  📌 If user does NOT specify account: DO NOT include accountId or reallocateTo - the system will ASK which account
  📌 Calculates profit/loss automatically: (sellPrice - entryPrice) × amount
  📌 Example flows:
    - "sold my entire Bitcoin position" → sell_crypto WITHOUT accountId (system asks which account)
    - "sell 0.1 BTC at $68k and transfer to BKS Bank" → sell_crypto WITH accountId
    - "sold 2 ETH and moved to savings" → sell_crypto WITH reallocateTo but WITHOUT specific accountId

- transfer_proceeds: { accountId: string, accountType: "cash" | "savings", amount: number }
  📌 Use when: User responds to "which account" question after a sale
  📌 This is a follow-up action after sell_stock or sell_crypto
  📌 Example: User says "Revolut" or "Bank of America" after being asked where to deposit proceeds
  📌 You must match the account name to the accountId from the user's accounts list

- reallocate_assets: { from: "crypto", to: "stock", amount: 5000.00, specificSymbol?: "BTC|AAPL" }
  📌 Use when: "move money from crypto to stocks", "reallocate $5k to savings"
  📌 Smart reallocation without manual sell/buy
  📌 from/to can be: "cash", "crypto", "stock", "savings"
  📌 specificSymbol: Optional - if user specifies which asset to sell/buy
  📌 Example flows:
    - "move $5000 from crypto to stocks" → reallocate_assets
    - "take half my Bitcoin and buy AAPL" → reallocate_assets with specificSymbol
    - "convert 10 ETH to cash" → reallocate_assets from crypto to cash

- remove_asset: { type: "stock" | "crypto" | "property" | "cash" | "trading", id: string, symbol?: string }
  📌 Use when: "remove my TSLA", "delete this account", "get rid of my Bitcoin"
  📌 For bulk removal: "remove all crypto" → remove multiple items
  📌 Always confirm before deletion to prevent accidents
  📌 Example flows:
    - "remove my AAPL position" → remove_asset with type: "stock", symbol: "AAPL"
    - "delete my Wells Fargo account" → remove_asset with type: "cash"

**🎯 SELLING WORKFLOW - STEP BY STEP:**

When user says "sold my Bitcoin":

1. **Identify the asset**: Bitcoin (BTC) - check user's holdings
2. **Determine amount**: User said "my Bitcoin" → they mean their ENTIRE position
3. **Get current holdings**: User has 34 BTC (from portfolio snapshot above)
4. **Get sell price**: Use CURRENT market price unless user specifies (e.g., "at $67k")
5. **Calculate profit**: (sellPrice - user's entryPrice) × amount
6. **Check for reallocation**: Did user say "and put it in..." or "move to..."?
7. **Execute action**:
   {
     "action": {
       "type": "sell_crypto",
       "data": {
         "symbol": "BTC",
         "amount": 34,
         "sellPrice": 67000.00,
         "reallocateTo": "cash" // if user mentioned where to put proceeds
       }
     },
     "message": "🎉 Sold 34 BTC at $67,000! Profit: $X,XXX,XXX (+XX%)"
   }
8. **If reallocateTo specified**: Auto-add proceeds to that category

**🎯 REALLOCATION WORKFLOW - SMART MOVES:**

When user says "move $5000 from crypto to stocks":

1. **Source**: crypto holdings
2. **Destination**: stocks
3. **Amount**: $5000
4. **Smart execution**:
   - Calculate which crypto to sell (prefer highest gains or user's choice)
   - Execute sell at current market price
   - Add $5000 to cash with note "From crypto sale - pending stock purchase"
   - Ask user: "Which stock would you like to buy with the $5000?"
5. **Seamless flow**: Makes portfolio rebalancing effortless

**🚨 CRITICAL RULES FOR SELLING:**
1. **Profit calculation**: ALWAYS show user their profit/loss
2. **Confirmation**: For large sales (>$10k), confirm before executing
3. **Tax implications**: Remind users about capital gains tax on profits
4. **Reallocation**: If user mentions "and buy X" or "move to Y", handle automatically
5. **Complete vs Partial**: 
   - "sold my Bitcoin" = ENTIRE position
   - "sell 5 shares" = PARTIAL position (5 shares only)
6. **Price handling**:
   - User says "at $X" → use that exact price
   - User doesn't specify → use CURRENT market price
7. **Market context**: Provide brief market commentary on the sale timing

**�🚨 CRITICAL - Amount/Number Extraction Rules 🚨**
⚠️ **ABSOLUTE RULE: NEVER MULTIPLY OR MODIFY AMOUNTS - USE EXACT VALUES AS STATED** ⚠️

**MANDATORY CONVERSION TABLE - MEMORIZE THIS:**
| User Says | You Extract | NOT | NEVER |
|-----------|-------------|-----|-------|
| "1k" | 1000 | 100000 | 10000 |
| "2k" | 2000 | 200000 | 20000 |
| "3k" | 3000 | 300000 | 30000 |
| "5k" | 5000 | 500000 | 50000 |
| "10k" | 10000 | 1000000 | 100000 |
| "1000" | 1000 | 100000 | 10000 |
| "3000" | 3000 | 300000 | 30000 |
| "10" | 10 | 100 | 1000 |
| "0.5" | 0.5 | 5 | 50 |
| "0.1" | 0.1 | 1 | 10 |

**STEP-BY-STEP EXTRACTION PROCESS:**
1. Find the number the user stated (e.g., "1k", "3000", "10 shares")
2. Convert "k" notation: 1k = 1000, 2k = 2000, etc.
3. Remove commas from prices: "$45,000" = 45000
4. Use the EXACT number - DO NOT multiply, divide, or modify in any way
5. Double-check: Is this the exact value the user stated? If yes, proceed. If no, STOP and recheck.

**CRITICAL EXAMPLES - LEARN THESE:**
✅ CORRECT:
- User: "add 1k USDT" → amount: 1000
- User: "add 3000 USDT" → amount: 3000
- User: "buy 5k USDC" → amount: 5000
- User: "add 10 shares of AAPL" → shares: 10
- User: "add 0.1 BTC" → amount: 0.1
- User: "buy 100 USDT" → amount: 100

❌ WRONG (DO NOT DO THIS):
- User: "add 1k USDT" → amount: 100000 ❌ (This is multiplying by 100!)
- User: "add 3000 USDT" → amount: 300000 ❌ (This is multiplying by 100!)
- User: "add 10 shares" → shares: 1000 ❌ (This is multiplying by 100!)
- User: "add 0.5 BTC" → amount: 50 ❌ (This is multiplying by 100!)

**VALIDATION CHECK BEFORE RESPONDING:**
Before creating any action JSON, ask yourself:
1. What number did the user say? (e.g., "1k" or "3000")
2. What is the correct conversion? (e.g., "1k" = 1000)
3. Did I multiply or modify this number in any way? IF YES → WRONG, FIX IT
4. Is my extracted value exactly what the user meant? IF NO → WRONG, FIX IT

**IF IN DOUBT:** Extract the EXACT number as stated. Never assume multiplication is needed.

**Important:** 
- Always extract ALL required fields for actions (symbol, amount/shares, entryPrice)
- Use "entryPrice" for the purchase price (NOT "price" or "buyPrice")
- Always consider the user's existing holdings and context when providing advice
- Be proactive and smart - don't just wait for explicit commands`;

    // Add personalized communication style
    const personalityPrompt = getPersonalityPrompt();
    if (personalityPrompt) {
      prompt += personalityPrompt;
    }

    return prompt;
  }

  /**
   * Pre-parse user input to extract exact numbers (intercept before AI can fuck it up)
   */
  private preParseUserInput(userMessage: string): { shares?: number; amount?: number; price?: number; symbol?: string } | null {
    const msg = userMessage.toLowerCase();
    
    // Pattern: "add/buy X shares of SYMBOL at $Y"
    const stockPattern = /(?:add|buy)\s+(\d+)\s+shares?\s+of\s+([a-z]+)(?:\s+at\s+\$?(\d+(?:\.\d+)?))?/i;
    const stockMatch = userMessage.match(stockPattern);
    
    if (stockMatch) {
      const shares = parseInt(stockMatch[1]);
      const symbol = stockMatch[2].toUpperCase();
      const price = stockMatch[3] ? parseFloat(stockMatch[3]) : undefined;
      
      console.log('🎯 PRE-PARSED STOCK INPUT:', { shares, symbol, price });
      return { shares, symbol, price };
    }
    
    // Pattern: "add/buy X CRYPTO at $Y"
    const cryptoPattern = /(?:add|buy)\s+([\d.]+)\s+([a-z]+)(?:\s+at\s+\$?(\d+(?:\.\d+)?))?/i;
    const cryptoMatch = userMessage.match(cryptoPattern);
    
    if (cryptoMatch && !stockMatch) {
      const amount = parseFloat(cryptoMatch[1]);
      const symbol = cryptoMatch[2].toUpperCase();
      const price = cryptoMatch[3] ? parseFloat(cryptoMatch[3]) : undefined;
      
      console.log('🎯 PRE-PARSED CRYPTO INPUT:', { amount, symbol, price });
      return { amount, symbol, price };
    }
    
    return null;
  }

  /**
   * Process a user message with full context awareness
   */
  async processMessage(userMessage: string): Promise<AIResponse> {
    try {
      // 🚨 PRE-PARSE to extract exact numbers BEFORE AI can mess them up
      const preParsed = this.preParseUserInput(userMessage);
      
      // Check if this is a market analysis request
      const marketAnalysisRequest = this.detectMarketAnalysisRequest(userMessage);
      
      if (marketAnalysisRequest) {
        return await this.handleMarketAnalysisRequest(marketAnalysisRequest);
      }

      // Wait for model initialization if needed (only on server)
      if (typeof window === 'undefined' && !this.model) {
        await this.initializeModel();
      }

      // Add user message to context
      this.context.previousMessages.push({
        role: 'user',
        content: userMessage,
      });

      // Build conversation history
      const conversationHistory = this.context.previousMessages
        .slice(-10) // Keep last 10 messages for context
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      // Generate system prompt with financial context
      const systemPrompt = this.generateSystemPrompt();

      // Create the full prompt
      const fullPrompt = `${systemPrompt}

**Conversation History:**
${conversationHistory}

**Current Request:** ${userMessage}

Please respond naturally and intelligently. If this is an action request, include the action JSON. Otherwise, just provide a helpful response.`;

      // Generate response
      let responseText = '';
      
      try {
        console.log('🤖 Calling Gemini API...');
        
        // Check if we are on the client side
        if (typeof window !== 'undefined') {
          console.log('🌐 Client-side detected, using proxy...');
          const response = await fetch('/api/gemini-proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: fullPrompt }),
          });
          
          if (!response.ok) {
            throw new Error(`Proxy error: ${response.statusText}`);
          }
          
          const data = await response.json();
          responseText = data.text;
        } else {
          // Server-side: use SDK directly
          if (!this.model) {
            await this.initializeModel();
          }
          
          if (this.model) {
            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            responseText = response.text();
          } else {
            // Fallback to REST API if model init failed but we have key
            console.warn('⚠️ SDK model not ready, trying REST API fallback...');
            responseText = await this.callGeminiRestAPI(fullPrompt);
          }
        }
        
        console.log('✅ Gemini API response received:', responseText.substring(0, 100) + '...');
      } catch (modelError: any) {
        console.warn('⚠️ Primary generation failed:', modelError.message);
        // Only try REST fallback on server side
        if (typeof window === 'undefined') {
           responseText = await this.callGeminiRestAPI(fullPrompt);
        } else {
           throw modelError;
        }
      }

      // Parse action if present
      let action = undefined;
      let needsConfirmation = false;
      let confidence = 0.9;

      // Try to extract JSON action from response
      const jsonMatch = responseText.match(/\{[\s\S]*"action"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          console.log('🔍 GEMINI RAW JSON RESPONSE:', jsonMatch[0]);
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('🔍 PARSED ACTION DATA:', JSON.stringify(parsed, null, 2));
          if (parsed.action) {
            action = parsed.action;
            console.log('🔍 EXTRACTED ACTION (BEFORE CORRECTION):', JSON.stringify(action, null, 2));
            
            // 🚨🚨🚨 OVERRIDE WITH PRE-PARSED DATA (this fixes Gemini's fuck-ups)
            if (preParsed) {
              console.log('🎯 OVERRIDING with pre-parsed data:', preParsed);
              
              if (preParsed.shares !== undefined && action.type === 'add_stock') {
                console.log(`🔧 FORCING shares: ${action.data.shares} → ${preParsed.shares}`);
                action.data.shares = preParsed.shares;
              }
              
              if (preParsed.amount !== undefined && action.type === 'add_crypto') {
                console.log(`🔧 FORCING amount: ${action.data.amount} → ${preParsed.amount}`);
                action.data.amount = preParsed.amount;
              }
              
              if (preParsed.price !== undefined) {
                console.log(`🔧 FORCING entryPrice: ${action.data.entryPrice} → ${preParsed.price}`);
                action.data.entryPrice = preParsed.price;
              }
              
              if (preParsed.symbol !== undefined) {
                console.log(`🔧 FORCING symbol: ${action.data.symbol} → ${preParsed.symbol}`);
                action.data.symbol = preParsed.symbol;
              }
            }
            
            // 🚨 CRITICAL PRE-CORRECTION: Fix share/amount errors IMMEDIATELY after parsing
            if (action.type === 'add_stock' && action.data?.shares) {
              const originalShares = action.data.shares;
              const price = action.data.entryPrice || 1;
              const totalValue = originalShares * price;
              
              console.log('🔍 PRE-CORRECTION CHECK:');
              console.log(`  Original shares: ${originalShares}`);
              console.log(`  Price: $${price}`);
              console.log(`  Total value: $${totalValue.toFixed(2)}`);
              
              // Rule 1: If shares >= 100 and is a clean multiple of 100, it's likely 100x error
              if (originalShares >= 100 && originalShares % 100 === 0) {
                const corrected = originalShares / 100;
                if (corrected >= 1 && corrected <= 100) {
                  console.log(`🔧 PRE-CORRECTION: Dividing by 100: ${originalShares} → ${corrected}`);
                  action.data.shares = corrected;
                }
              }
              // Rule 2: If shares >= 10 and is a clean multiple of 10, it's likely 10x error
              else if (originalShares >= 10 && originalShares % 10 === 0 && originalShares < 100) {
                const corrected = originalShares / 10;
                if (corrected >= 1 && corrected <= 50) {
                  console.log(`🔧 PRE-CORRECTION: Dividing by 10: ${originalShares} → ${corrected}`);
                  action.data.shares = corrected;
                }
              }
              
              // Rule 3: Check if total value suggests dollar amount confusion
              // If total value is close to $500, $1000, $2000, $3000, $5000
              const commonAmounts = [500, 1000, 1500, 2000, 3000, 5000];
              for (const amount of commonAmounts) {
                if (Math.abs(totalValue - amount) < amount * 0.1) {
                  // AI probably calculated: shares = dollarAmount / price
                  console.log(`⚠️ PRE-CORRECTION: Total $${totalValue} ≈ $${amount} (dollar confusion suspected)`);
                  
                  // Most common user input is 1-100 shares
                  // Try dividing by factors to find a reasonable share count
                  for (const divisor of [100, 50, 20, 10, 5, 2]) {
                    const possibleShares = originalShares / divisor;
                    if (Number.isInteger(possibleShares) && possibleShares >= 1 && possibleShares <= 100) {
                      console.log(`🔧 PRE-CORRECTION: Dollar confusion fix: ${originalShares} → ${possibleShares} (÷${divisor})`);
                      action.data.shares = possibleShares;
                      break;
                    }
                  }
                  break;
                }
              }
              
              if (action.data.shares !== originalShares) {
                const newTotal = action.data.shares * price;
                console.log('✅ PRE-CORRECTION APPLIED:');
                console.log(`  Old: ${originalShares} shares × $${price} = $${totalValue.toFixed(2)}`);
                console.log(`  New: ${action.data.shares} shares × $${price} = $${newTotal.toFixed(2)}`);
              }
            }
            
            console.log('🔍 EXTRACTED ACTION (AFTER CORRECTION):', JSON.stringify(action, null, 2));
            responseText = parsed.message || responseText.replace(jsonMatch[0], '').trim();
            needsConfirmation = true;
          }
        } catch (e) {
          console.error('❌ Failed to parse JSON from Gemini:', e);
          // Not valid JSON, continue with text response
        }
      }

      // Add assistant response to context
      this.context.previousMessages.push({
        role: 'assistant',
        content: responseText,
      });

      return {
        text: responseText,
        action,
        confidence,
        needsConfirmation,
      };
    } catch (error: any) {
      console.error('❌ Gemini API error:', error);
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
      });
      
      // More helpful error messages
      let errorMessage = "I'm having trouble connecting to the AI service. ";
      
      if (error?.message?.includes('API key')) {
        errorMessage = "The API key seems to be invalid. Please check your GOOGLE_AI_API_KEY in .env.local";
      } else if (error?.message?.includes('quota') || error?.status === 429) {
        errorMessage = "API rate limit reached. Please wait a moment and try again.";
      } else if (error?.message?.includes('SAFETY')) {
        errorMessage = "The AI filtered the response for safety. Try rephrasing your question.";
      } else {
        errorMessage += `Error: ${error?.message || 'Unknown error'}. Please try again.`;
      }
      
      return {
        text: errorMessage,
        confidence: 0,
        needsConfirmation: false,
      };
    }
  }

  /**
   * Resolve asset name or partial name to ticker symbol
   */
  private resolveAssetSymbol(input: string): string | null {
    // First, check if it's already a valid symbol (2-6 characters for forex pairs, all caps)
    const upperInput = input.toUpperCase();
    
    // Check for forex pairs (6 characters like EURUSD)
    if (upperInput.length === 6 && /^[A-Z]{6}$/.test(upperInput)) {
      // Common forex pairs
      const forexPairs = [
        'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
        'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURAUD', 'EURCHF', 'AUDNZD',
        'GBPAUD', 'GBPCAD', 'GBPCHF', 'AUDCAD', 'AUDCHF', 'CADJPY', 'CHFJPY',
        'EURCAD', 'EURNZD', 'NZDCAD', 'NZDCHF', 'NZDJPY'
      ];
      if (forexPairs.includes(upperInput)) {
        return upperInput;
      }
    }
    
    // Check for regular stocks/crypto/indices (2-5 characters)
    if (upperInput.length >= 2 && upperInput.length <= 5 && /^[A-Z]+$/.test(upperInput)) {
      const instrument = tradingDatabase.find(i => i.symbol === upperInput);
      if (instrument) return instrument.symbol;
    }

    // Try fuzzy matching on asset names
    const searchResults = searchInstruments(input);
    if (searchResults.length > 0) {
      // Prioritize exact name matches
      const exactMatch = searchResults.find(
        i => i.name.toLowerCase() === input.toLowerCase()
      );
      if (exactMatch) return exactMatch.symbol;
      
      // Check if name starts with the input
      const startsWithMatch = searchResults.find(
        i => i.name.toLowerCase().startsWith(input.toLowerCase())
      );
      if (startsWithMatch) return startsWithMatch.symbol;
      
      // Return first result if found
      return searchResults[0].symbol;
    }
    
    // If still not found, try common name mappings
    const commonMappings: Record<string, string> = {
      // Cryptocurrencies
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'dogecoin': 'DOGE',
      'cardano': 'ADA',
      'solana': 'SOL',
      'ripple': 'XRP',
      'binance coin': 'BNB',
      'litecoin': 'LTC',
      'polkadot': 'DOT',
      'chainlink': 'LINK',
      'polygon': 'MATIC',
      
      // Stablecoins
      'tether': 'USDT',
      'usd tether': 'USDT',
      'usd coin': 'USDC',
      'usdc': 'USDC',
      'usdt': 'USDT',
      'dai': 'DAI',
      'dai stablecoin': 'DAI',
      'binance usd': 'BUSD',
      'busd': 'BUSD',
      'true usd': 'TUSD',
      'tusd': 'TUSD',
      'pax dollar': 'USDP',
      'usdp': 'USDP',
      
      // Stocks
      'apple': 'AAPL',
      'microsoft': 'MSFT',
      'google': 'GOOGL',
      'alphabet': 'GOOGL',
      'amazon': 'AMZN',
      'tesla': 'TSLA',
      'meta': 'META',
      'facebook': 'META',
      'netflix': 'NFLX',
      'nvidia': 'NVDA',
      
      // Commodities
      'gold': 'GC',
      'silver': 'SI',
      'oil': 'CL',
      'crude oil': 'CL',
      
      // Indices
      's&p 500': 'SPX',
      's&p': 'SPX',
      'dow': 'DJI',
      'dow jones': 'DJI',
      'nasdaq': 'NDX',
      
      // Forex pairs (common names)
      'euro dollar': 'EURUSD',
      'eur usd': 'EURUSD',
      'euro': 'EURUSD',
      'pound dollar': 'GBPUSD',
      'gbp usd': 'GBPUSD',
      'cable': 'GBPUSD',
      'dollar yen': 'USDJPY',
      'usd jpy': 'USDJPY',
      'aussie dollar': 'AUDUSD',
      'aud usd': 'AUDUSD',
      'aussie': 'AUDUSD',
      'dollar cad': 'USDCAD',
      'usd cad': 'USDCAD',
      'loonie': 'USDCAD',
      'kiwi dollar': 'NZDUSD',
      'nzd usd': 'NZDUSD',
      'kiwi': 'NZDUSD',
      'swiss franc': 'USDCHF',
      'usd chf': 'USDCHF',
      'swissie': 'USDCHF',
    };
    
    const lowerInput = input.toLowerCase().trim();
    return commonMappings[lowerInput] || null;
  }

  /**
   * Detect if user is requesting market analysis
   */
  private detectMarketAnalysisRequest(message: string): any {
    const lowerMsg = message.toLowerCase();
    
    // Technical indicator patterns (RSI, MACD, etc.)
    const indicatorPatterns = [
      /(?:show|display|pull up|get|fetch|analyze)\s+(?:the\s+)?(?:rsi|relative strength index)(?:\s+chart)?(?:\s+for)?(?:\s+)([a-z0-9\s]+?)(?:\s|$)/i,
      /([a-z0-9\s]+?)\s+(?:rsi|relative strength index)(?:\s+chart)?/i,
      /(?:show|display|pull up|get|fetch|analyze)\s+(?:the\s+)?(?:macd)(?:\s+chart)?(?:\s+for)?(?:\s+)([a-z0-9\s]+?)(?:\s|$)/i,
      /([a-z0-9\s]+?)\s+(?:macd)(?:\s+chart)?/i,
      /(?:show|display|pull up|get|fetch|analyze)\s+(?:the\s+)?(?:bollinger bands?)(?:\s+chart)?(?:\s+for)?(?:\s+)([a-z0-9\s]+?)(?:\s|$)/i,
      /([a-z0-9\s]+?)\s+(?:bollinger bands?)(?:\s+chart)?/i,
    ];
    
    for (const pattern of indicatorPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const assetInput = match[1].trim();
        const symbol = this.resolveAssetSymbol(assetInput);
        if (symbol) {
          // Detect which indicator
          let indicator = 'RSI';
          if (lowerMsg.includes('macd')) indicator = 'MACD';
          else if (lowerMsg.includes('bollinger')) indicator = 'BB';
          
          return { type: 'indicator', symbols: [symbol], indicator };
        }
      }
    }
    
    // Asset analysis patterns (support both tickers and names)
    const assetPatterns = [
      /(?:analyze|analysis|tell me about|what's|whats|how is|hows|info on|information about|check|show me|dive into|let's dive into|dive into|give me analysis on)\s+(?:the\s+)?([a-z0-9\s/]+?)(?:\s+price|\s+chart|\s+data|\s+analysis|\s+pair|\?|!|$)/i,
      /^([a-z0-9/]+?)(?:\s+price|\s+chart|\s+data|\s+analysis)?$/i,
    ];
    
    for (const pattern of assetPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const assetInput = match[1].trim();
        const symbol = this.resolveAssetSymbol(assetInput);
        if (symbol) {
          return { type: 'asset', symbols: [symbol] };
        }
      }
    }
    
    // Comparison patterns (support both tickers and names)
    const comparePatterns = [
      /compare\s+([a-z0-9\s]+?)\s+(?:and|vs|versus|with|to)\s+([a-z0-9\s]+?)(?:\s|$|\?)/i,
      /([a-z0-9\s]+?)\s+vs\.?\s+([a-z0-9\s]+?)(?:\s|$|\?)/i,
    ];
    
    for (const pattern of comparePatterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[2]) {
        const symbol1 = this.resolveAssetSymbol(match[1].trim());
        const symbol2 = this.resolveAssetSymbol(match[2].trim());
        if (symbol1 && symbol2) {
          return { 
            type: 'compare', 
            symbols: [symbol1, symbol2] 
          };
        }
      }
    }
    
    // Market sentiment patterns
    if (lowerMsg.includes('market sentiment') || 
        lowerMsg.includes('how is the market') ||
        lowerMsg.includes('market overview') ||
        lowerMsg.includes('market condition')) {
      
      if (lowerMsg.includes('crypto')) {
        return { type: 'sentiment', category: 'crypto' };
      } else if (lowerMsg.includes('stock')) {
        return { type: 'sentiment', category: 'stock' };
      } else {
        return { type: 'sentiment', category: 'overall' };
      }
    }
    
    // Portfolio analysis patterns
    if (lowerMsg.includes('portfolio') && 
        (lowerMsg.includes('analyze') || 
         lowerMsg.includes('performance') || 
         lowerMsg.includes('how is my'))) {
      return { type: 'portfolio' };
    }
    
    return null;
  }

  /**
   * Handle market analysis requests
   */
  private async handleMarketAnalysisRequest(request: any): Promise<AIResponse> {
    try {
      let marketData: MarketDataResponse;
      
      switch (request.type) {
        case 'indicator':
          marketData = await AIMarketDataService.fetchTechnicalIndicator(
            request.symbols[0],
            request.indicator
          );
          break;
          
        case 'asset':
          marketData = await AIMarketDataService.fetchAssetInsights(request.symbols[0]);
          break;
          
        case 'compare':
          marketData = await AIMarketDataService.compareAssets(request.symbols);
          break;
          
        case 'sentiment':
          marketData = await AIMarketDataService.getMarketSentiment(request.category);
          break;
          
        case 'portfolio':
          // Get user's holdings
          const [stocks, crypto] = await Promise.all([
            SupabaseDataService.getStockHoldings([]),
            SupabaseDataService.getCryptoHoldings([]),
          ]);
          const allHoldings = [
            ...stocks.map((s: any) => ({ ...s, type: 'stock' })),
            ...crypto.map((c: any) => ({ ...c, type: 'crypto' }))
          ];
          
          // Use enhanced portfolio analysis with comprehensive time tracking
          try {
            const { EnhancedPortfolioAnalysisService } = await import('./enhanced-portfolio-analysis-service');
            const summary = await EnhancedPortfolioAnalysisService.analyzePortfolio(allHoldings, this.context.userId || 'guest');
            const detailedReport = EnhancedPortfolioAnalysisService.generateDetailedReport(summary);
            
            marketData = {
              text: detailedReport,
              data: summary as any
            } as MarketDataResponse;
          } catch (error) {
            console.error('Enhanced portfolio analysis failed, falling back to basic:', error);
            marketData = await AIMarketDataService.analyzePortfolio(allHoldings);
          }
          break;
          
        default:
          return {
            text: "I'm not sure what market analysis you're looking for. Try asking about a specific asset (e.g., 'analyze BTC'), compare assets ('compare AAPL vs MSFT'), or ask about market sentiment.",
            confidence: 0.5,
            needsConfirmation: false,
          };
      }
      
      // Return clean response without any JSON or extra formatting
      return {
        text: marketData.text,
        marketData,
        charts: marketData.charts,
        confidence: 0.95,
        needsConfirmation: false,
      };
    } catch (error) {
      console.error('Error handling market analysis:', error);
      return {
        text: "I encountered an error fetching market data. Please try again.",
        confidence: 0,
        needsConfirmation: false,
      };
    }
  }

  /**
   * Execute an action returned by the AI
   */
  async executeAction(action: { type: string; data: any }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🎯 Executing action:', action?.type, 'with data:', JSON.stringify(action?.data));
      
      // 🚨 CRITICAL VALIDATION: Check if action or data is missing
      if (!action) {
        console.error('❌ CRITICAL ERROR: action is undefined or null');
        return {
          success: false,
          message: '❌ Internal error: No action provided. Please try again.',
        };
      }
      
      if (!action.type) {
        console.error('❌ CRITICAL ERROR: action.type is undefined');
        return {
          success: false,
          message: '❌ Internal error: Action type is missing. Please try again.',
        };
      }
      
      if (!action.data) {
        console.error('❌ CRITICAL ERROR: action.data is undefined for action:', action.type);
        return {
          success: false,
          message: `❌ Internal error: No data provided for ${action.type}. Please try rephrasing your request with all the details.`,
        };
      }
      
      switch (action.type) {
        case 'add_stock':
          console.log('🔍 RAW stock data received:', JSON.stringify(action.data, null, 2));
          
          // 🚨 CRITICAL VALIDATION: Check for missing or invalid data
          if (!action.data || !action.data.symbol) {
            console.error('❌ VALIDATION ERROR: Missing stock symbol');
            return {
              success: false,
              message: '❌ Missing stock symbol. Please specify which stock to add (e.g., "add 5 shares of MSFT at $420").',
            };
          }
          
          if (!action.data.shares || isNaN(action.data.shares) || action.data.shares <= 0) {
            console.error('❌ VALIDATION ERROR: Invalid shares:', action.data.shares);
            return {
              success: false,
              message: `❌ Invalid number of shares. Please specify how many shares of ${action.data.symbol} to add (e.g., "add 5 shares of ${action.data.symbol} at $420").`,
            };
          }
          
          if (!action.data.entryPrice || isNaN(action.data.entryPrice) || action.data.entryPrice <= 0) {
            console.error('❌ VALIDATION ERROR: Invalid entry price:', action.data.entryPrice);
            return {
              success: false,
              message: `❌ Invalid or missing entry price. Please specify the price per share (e.g., "add ${action.data.shares} shares of ${action.data.symbol} at $420").`,
            };
          }
          
          // 🚨 VALIDATION: Check if AI mistakenly extracted "MORE" or other keywords as symbol
          const invalidStockSymbols = ['MORE', 'DUDE', 'YES', 'THAT', 'IT', 'THEM', 'THIS', 'SOME', 'ANY'];
          if (invalidStockSymbols.includes(action.data.symbol?.toUpperCase())) {
            console.error(`❌ AI PARSING ERROR: Extracted "${action.data.symbol}" as stock symbol - this is a conversational word, not a ticker!`);
            return {
              success: false,
              message: `❌ Oops! I couldn't identify which stock you want to add. Please specify the stock symbol clearly, like: "add ${action.data.shares} shares of TSLA at $${action.data.entryPrice || '200'}"`,
            };
          }
          
          // 🚨 AUTO-ADD TO EXISTING: Check if stock already exists and add to it
          const existingStocks = await SupabaseDataService.getStockHoldings([]);
          const existingStock = existingStocks.find((s: any) => 
            s.symbol.toUpperCase() === action.data.symbol.toUpperCase()
          );
          
          if (existingStock) {
            console.log(`📊 STOCK ${action.data.symbol} ALREADY EXISTS - automatically adding to existing position`);
            console.log(`   Existing: ${existingStock.shares} shares @ $${existingStock.entryPoint}`);
            console.log(`   Adding: ${action.data.shares} shares @ $${action.data.entryPrice}`);
            
            // Calculate new weighted average
            const existingCostBasis = existingStock.shares * existingStock.entryPoint;
            const newCostBasis = action.data.shares * action.data.entryPrice;
            const totalShares = existingStock.shares + action.data.shares;
            const newAvgEntryPrice = (existingCostBasis + newCostBasis) / totalShares;
            
            // Update existing position
            await SupabaseDataService.saveStockHolding({
              ...existingStock,
              shares: totalShares,
              entryPoint: newAvgEntryPrice,
            });
            
            // Notify all components that stock data has changed - immediate dispatch for AI actions
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('stockDataChanged'));
              window.dispatchEvent(new Event('financialDataChanged'));
            }
            
            return {
              success: true,
              message: `✅ Added ${action.data.shares} more shares of ${action.data.symbol}!\n\n📊 Previous: ${existingStock.shares} shares @ $${existingStock.entryPoint.toFixed(2)}\n➕ Added: ${action.data.shares} shares @ $${action.data.entryPrice.toFixed(2)}\n📈 New position: ${totalShares} shares @ $${newAvgEntryPrice.toFixed(2)} average`,
            };
          }
          
          // CRITICAL VALIDATION: Use EXACT share count from AI
          let shares = action.data.shares;
          const stockEntryPrice = action.data.entryPrice;
          
          console.log(`📊 RAW INPUT: ${shares} shares × $${stockEntryPrice} = $${(shares * stockEntryPrice).toFixed(2)} total value`);
          
          // 🚨 REMOVED AUTO-CORRECTION LOGIC - IT WAS CAUSING FALSE POSITIVES
          // The AI is smart enough to extract the correct number
          // User said "100 shares" → AI extracts 100 → We use 100 (period)
          // 
          // Previous logic would "correct" 100 shares @ $120 to 1 share
          // because $12,000 total seemed "too high" - but that's a valid purchase!
          //
          // TRUST THE AI EXTRACTION - Users will specify the exact number they want
          
          console.log(`✅ Using shares as-is: ${shares} shares (NO AUTO-CORRECTION)`);
          
          // Fetch current market data with real-time price and color
          console.log(`🔍 Fetching live market data for ${action.data.symbol}...`);
          const stockMarketData = await enhancedMarketService.fetchAssetPrice(action.data.symbol, 'stock');
          
          let stockCurrentPrice = action.data.currentPrice || action.data.entryPrice;
          let stockName = action.data.symbol;
          let stockColor = '#8b5cf6'; // Default purple fallback
          
          if (stockMarketData) {
            stockCurrentPrice = stockMarketData.currentPrice;
            stockName = stockMarketData.name;
            stockColor = stockMarketData.color;
            console.log(`✅ Got live data: ${stockName} @ $${stockCurrentPrice.toFixed(2)} (${stockColor})`);
          } else {
            stockColor = getAssetColor(action.data.symbol, 'stock');
            console.log(`⚠️ Using fallback data for ${stockName}`);
          }
          
          // 🚨 FINAL VALIDATION: Double-check all values before saving
          const validatedShares = parseFloat(action.data.shares);
          const validatedEntryPrice = parseFloat(action.data.entryPrice);
          const validatedCurrentPrice = parseFloat(stockCurrentPrice);
          
          if (isNaN(validatedShares) || validatedShares <= 0) {
            console.error('❌ FINAL VALIDATION FAILED: Invalid shares:', validatedShares);
            return {
              success: false,
              message: `❌ Invalid shares value (${action.data.shares}). Cannot save stock data.`,
            };
          }
          
          if (isNaN(validatedEntryPrice) || validatedEntryPrice <= 0) {
            console.error('❌ FINAL VALIDATION FAILED: Invalid entry price:', validatedEntryPrice);
            return {
              success: false,
              message: `❌ Invalid entry price (${action.data.entryPrice}). Cannot save stock data.`,
            };
          }
          
          if (isNaN(validatedCurrentPrice) || validatedCurrentPrice <= 0) {
            console.error('❌ FINAL VALIDATION FAILED: Invalid current price:', validatedCurrentPrice);
            return {
              success: false,
              message: `❌ Could not fetch current price for ${action.data.symbol}. Please try again.`,
            };
          }
          
          const finalTotalValue = validatedShares * validatedEntryPrice;
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📋 FINAL STOCK DATA TO BE SAVED (VALIDATED):');
          console.log(`  Symbol: ${action.data.symbol}`);
          console.log(`  Name: ${stockName}`);
          console.log(`  Shares: ${validatedShares} ✓`);
          console.log(`  Entry Price: $${validatedEntryPrice.toFixed(2)} ✓`);
          console.log(`  Current Price: $${validatedCurrentPrice.toFixed(2)} ✓`);
          console.log(`  Total Investment: ${validatedShares} × $${validatedEntryPrice.toFixed(2)} = $${finalTotalValue.toFixed(2)} ✓`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          await SupabaseDataService.saveStockHolding({
            id: crypto.randomUUID(),
            symbol: action.data.symbol,
            name: stockName,
            shares: validatedShares,
            entryPoint: validatedEntryPrice,
            currentPrice: validatedCurrentPrice,
            type: action.data.type || 'Long Term',
            color: stockColor,
          });
          
          // Notify all components that stock data has changed - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('stockDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          const stockGainLoss = (validatedCurrentPrice - validatedEntryPrice) * validatedShares;
          const stockGainLossPercent = ((validatedCurrentPrice - validatedEntryPrice) / validatedEntryPrice) * 100;
          
          return {
            success: true,
            message: `✅ Successfully added ${validatedShares} shares of ${action.data.symbol} (${stockName})!\n\n💰 Entry: $${validatedEntryPrice.toFixed(2)}\n📈 Current: $${validatedCurrentPrice.toFixed(2)}\n${stockGainLoss >= 0 ? '🟢' : '🔴'} P/L: ${stockGainLoss >= 0 ? '+' : ''}$${stockGainLoss.toFixed(2)} (${stockGainLossPercent >= 0 ? '+' : ''}${stockGainLossPercent.toFixed(2)}%)`,
          };

        case 'update_stock':
          const stocks = await SupabaseDataService.getStockHoldings([]);
          const stockToUpdate = stocks.find((s: any) => 
            s.id === action.data.id || s.symbol === action.data.symbol
          );
          if (stockToUpdate) {
            await SupabaseDataService.saveStockHolding({
              ...stockToUpdate,
              ...action.data.updates,
            });
            
            // Notify all components that stock data has changed - immediate dispatch for AI actions
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('stockDataChanged'));
              window.dispatchEvent(new Event('financialDataChanged'));
            }
            
            return {
              success: true,
              message: `✅ Successfully updated ${action.data.symbol || 'stock'}!`,
            };
          }
          return {
            success: false,
            message: `❌ Could not find the stock to update.`,
          };

        case 'add_more_stock':
          // 🚨 VALIDATION: Check for missing or invalid data
          if (!action.data || !action.data.symbol) {
            console.error('❌ VALIDATION ERROR: Missing stock symbol in add_more_stock');
            return {
              success: false,
              message: '❌ Missing stock symbol. Please specify which stock to add more of.',
            };
          }
          
          if (!action.data.shares || isNaN(action.data.shares) || action.data.shares <= 0) {
            console.error('❌ VALIDATION ERROR: Invalid shares in add_more_stock:', action.data.shares);
            return {
              success: false,
              message: `❌ Invalid number of shares. Please specify how many more shares of ${action.data.symbol} to add.`,
            };
          }
          
          if (!action.data.entryPrice || isNaN(action.data.entryPrice) || action.data.entryPrice <= 0) {
            console.error('❌ VALIDATION ERROR: Invalid entry price in add_more_stock:', action.data.entryPrice);
            return {
              success: false,
              message: `❌ Invalid or missing entry price. Please specify the price per share.`,
            };
          }
          
          // 🚨 VALIDATION: Check if AI mistakenly extracted "MORE" or other keywords as symbol
          const invalidSymbols = ['MORE', 'DUDE', 'YES', 'THAT', 'IT', 'THEM', 'THIS'];
          if (invalidSymbols.includes(action.data.symbol?.toUpperCase())) {
            console.error(`❌ AI PARSING ERROR: Extracted "${action.data.symbol}" as stock symbol - this is a conversational word, not a ticker!`);
            return {
              success: false,
              message: `❌ Oops! I got confused about which stock you're referring to. Please specify the stock symbol clearly, like: "add ${action.data.shares} more shares of TSLA at $${action.data.entryPrice || '200'}"`,
            };
          }
          
          // Add more shares to existing stock position
          const existingStocksToAddTo = await SupabaseDataService.getStockHoldings([]);
          const existingStockToAddTo = existingStocksToAddTo.find((s: any) => 
            s.symbol.toUpperCase() === action.data.symbol.toUpperCase()
          );
          
          if (!existingStockToAddTo) {
            return {
              success: false,
              message: `❌ You don't have any ${action.data.symbol} shares to add to. Try "add ${action.data.shares} shares of ${action.data.symbol}" instead.`,
            };
          }
          
          console.log(`📊 Adding ${action.data.shares} MORE shares to existing ${existingStockToAddTo.shares} shares of ${action.data.symbol}`);
          
          // 🚨 VALIDATION: Ensure existing stock data is valid
          if (isNaN(existingStockToAddTo.shares) || isNaN(existingStockToAddTo.entryPoint)) {
            console.error('❌ VALIDATION ERROR: Existing stock has invalid data');
            return {
              success: false,
              message: `❌ Existing ${action.data.symbol} position has corrupted data. Please delete and re-add it.`,
            };
          }
          
          // Calculate new weighted average entry price
          const existingCostBasis = existingStockToAddTo.shares * existingStockToAddTo.entryPoint;
          const newCostBasis = action.data.shares * action.data.entryPrice;
          const totalShares = existingStockToAddTo.shares + action.data.shares;
          const newAvgEntryPrice = (existingCostBasis + newCostBasis) / totalShares;
          
          // 🚨 VALIDATION: Ensure calculated values are valid
          if (isNaN(totalShares) || isNaN(newAvgEntryPrice) || totalShares <= 0 || newAvgEntryPrice <= 0) {
            console.error('❌ VALIDATION ERROR: Calculated values are invalid');
            return {
              success: false,
              message: `❌ Error calculating new position. Please check your input values.`,
            };
          }
          
          console.log(`  Old position: ${existingStockToAddTo.shares} shares @ $${existingStockToAddTo.entryPoint} = $${existingCostBasis.toFixed(2)}`);
          console.log(`  New purchase: ${action.data.shares} shares @ $${action.data.entryPrice} = $${newCostBasis.toFixed(2)}`);
          console.log(`  Total position: ${totalShares} shares @ $${newAvgEntryPrice.toFixed(2)} average = $${(existingCostBasis + newCostBasis).toFixed(2)}`);
          
          // Update the existing stock with new share count and average price
          await SupabaseDataService.saveStockHolding({
            ...existingStockToAddTo,
            shares: totalShares,
            entryPoint: newAvgEntryPrice,
          });
          
          // Notify all components that stock data has changed - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('stockDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          return {
            success: true,
            message: `✅ Successfully added ${action.data.shares} more shares of ${action.data.symbol}!\n\n📊 Previous: ${existingStockToAddTo.shares} shares @ $${existingStockToAddTo.entryPoint.toFixed(2)}\n➕ Added: ${action.data.shares} shares @ $${action.data.entryPrice.toFixed(2)}\n📈 New position: ${totalShares} shares @ $${newAvgEntryPrice.toFixed(2)} average`,
          };

        case 'delete_stock':
          await SupabaseDataService.deleteStockHolding(action.data.id);
          
          // Notify all components that stock data has changed - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('stockDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          return {
            success: true,
            message: `✅ Successfully removed the stock position!`,
          };

        case 'add_crypto':
          // Validate required data with detailed error messages
          console.log('🔍 RAW action.data received:', JSON.stringify(action.data, null, 2));
          
          if (!action.data) {
            return {
              success: false,
              message: '❌ No crypto data provided. Please specify the cryptocurrency symbol, amount, and price.',
            };
          }
          
          if (!action.data.symbol) {
            return {
              success: false,
              message: '❌ Missing cryptocurrency symbol. Which crypto would you like to add? (e.g., BTC, ETH, SOL)',
            };
          }
          
          console.log('🔍 Amount BEFORE validation:', action.data.amount, 'Type:', typeof action.data.amount);
          
          // CRITICAL VALIDATION: Detect if AI incorrectly multiplied the amount
          let rawAmount = action.data.amount;
          const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP'];
          const isStablecoin = stablecoins.includes(action.data.symbol.toUpperCase());
          
          // AUTO-CORRECTION LOGIC:
          // 1. If stablecoin amount is >= 100,000, likely AI multiplied by 100
          // 2. If ANY crypto amount is suspiciously large (>= 10,000), check if dividing by 100 is reasonable
          
          if (isStablecoin && rawAmount >= 100000) {
            // Stablecoin amounts >= 100k are very suspicious
            const correctedAmount = rawAmount / 100;
            console.warn('⚠️ STABLECOIN ERROR DETECTED:', rawAmount, '→ Correcting to:', correctedAmount);
            action.data.amount = correctedAmount;
            rawAmount = correctedAmount;
          } else if (rawAmount >= 50000 && !isStablecoin) {
            // Non-stablecoin: check if amount seems multiplied
            const correctedAmount = rawAmount / 100;
            if (correctedAmount >= 10 && correctedAmount < 10000) {
              console.warn('⚠️ CRYPTO AMOUNT ERROR DETECTED:', rawAmount, '→ Correcting to:', correctedAmount);
              action.data.amount = correctedAmount;
              rawAmount = correctedAmount;
            }
          }
          
          // Keep the original stablecoin warning for edge cases
          if (isStablecoin && rawAmount >= 50000) {
            console.warn('⚠️ STILL LARGE after correction:', rawAmount);
            return {
              success: false,
              message: `⚠️ The amount ${rawAmount} ${action.data.symbol} seems unusually high. Please confirm: Did you mean to add ${rawAmount} ${action.data.symbol}, or perhaps ${rawAmount / 100} ${action.data.symbol}? Please specify the exact amount.`,
            };
          }
          
          if (!action.data.amount || isNaN(action.data.amount) || action.data.amount <= 0) {
            return {
              success: false,
              message: `❌ Missing or invalid amount for ${action.data.symbol}. How much ${action.data.symbol} would you like to add?`,
            };
          }
          
          // Check for entry price in multiple possible fields
          const entryPrice = action.data.entryPrice || action.data.price || action.data.buyPrice || action.data.entry_price;
          
          console.log('🔍 Entry price extracted:', entryPrice, 'Type:', typeof entryPrice);
          
          if (!entryPrice || isNaN(entryPrice) || entryPrice <= 0) {
            return {
              success: false,
              message: `❌ Missing or invalid entry price for ${action.data.symbol}. What price did you buy it at?`,
            };
          }

          // Fetch current market data with real-time price and color
          console.log(`🔍 Fetching live market data for ${action.data.symbol}...`);
          const cryptoMarketData = await enhancedMarketService.fetchAssetPrice(action.data.symbol, 'crypto');
          
          let currentPrice = parseFloat(entryPrice);
          let cryptoName = action.data.symbol;
          let cryptoColor = '#f59e0b'; // Default fallback
          
          if (cryptoMarketData) {
            currentPrice = cryptoMarketData.currentPrice;
            cryptoName = cryptoMarketData.name;
            cryptoColor = cryptoMarketData.color;
            console.log(`✅ Got live data: ${cryptoName} @ $${currentPrice.toFixed(2)} (${cryptoColor})`);
          } else {
            // Fallback to trading database
            const cryptoInfo = tradingDatabase.find(
              (item) => item.symbol.toUpperCase() === action.data.symbol.toUpperCase() && item.type === 'crypto'
            );
            if (cryptoInfo) {
              cryptoName = cryptoInfo.name;
            }
            cryptoColor = getAssetColor(action.data.symbol, 'crypto');
            console.log(`⚠️ Using fallback data for ${cryptoName}`);
          }
          
          const finalAmount = parseFloat(action.data.amount);
          const finalEntryPrice = parseFloat(entryPrice);
          
          // � FINAL VALIDATION: Ensure all values are valid numbers
          if (isNaN(finalAmount) || finalAmount <= 0) {
            console.error('❌ FINAL VALIDATION FAILED: Invalid amount:', finalAmount);
            return {
              success: false,
              message: `❌ Invalid amount value (${action.data.amount}). Cannot save crypto data.`,
            };
          }
          
          if (isNaN(finalEntryPrice) || finalEntryPrice <= 0) {
            console.error('❌ FINAL VALIDATION FAILED: Invalid entry price:', finalEntryPrice);
            return {
              success: false,
              message: `❌ Invalid entry price (${entryPrice}). Cannot save crypto data.`,
            };
          }
          
          console.log('🔍 FINAL VALUES BEFORE SAVE (VALIDATED):');
          console.log('  - Amount:', finalAmount, '✓');
          console.log('  - Entry Price:', finalEntryPrice, '✓');
          console.log('  - Symbol:', action.data.symbol.toUpperCase());
          
          // 🚨 AUTO-ADD TO EXISTING: Check if crypto already exists and add to it
          const existingCryptos = await SupabaseDataService.getCryptoHoldings([]);
          const existingCrypto = existingCryptos.find((c: any) => 
            c.symbol.toUpperCase() === action.data.symbol.toUpperCase()
          );
          
          if (existingCrypto) {
            console.log(`📊 CRYPTO ${action.data.symbol} ALREADY EXISTS - automatically adding to existing position`);
            console.log(`   Existing: ${existingCrypto.amount} ${action.data.symbol} @ $${existingCrypto.entryPoint}`);
            console.log(`   Adding: ${finalAmount} ${action.data.symbol} @ $${finalEntryPrice}`);
            
            // 🚨 VALIDATION: Ensure existing crypto data is valid
            if (isNaN(existingCrypto.amount) || isNaN(existingCrypto.entryPoint)) {
              console.error('❌ VALIDATION ERROR: Existing crypto has invalid data');
              return {
                success: false,
                message: `❌ Existing ${action.data.symbol} position has corrupted data. Please delete and re-add it.`,
              };
            }
            
            // Calculate new weighted average
            const existingCostBasis = existingCrypto.amount * existingCrypto.entryPoint;
            const newCostBasis = finalAmount * finalEntryPrice;
            const totalAmount = existingCrypto.amount + finalAmount;
            const newAvgEntryPrice = (existingCostBasis + newCostBasis) / totalAmount;
            
            // 🚨 VALIDATION: Ensure calculated values are valid
            if (isNaN(totalAmount) || isNaN(newAvgEntryPrice) || totalAmount <= 0 || newAvgEntryPrice <= 0) {
              console.error('❌ VALIDATION ERROR: Calculated crypto values are invalid');
              return {
                success: false,
                message: `❌ Error calculating new position. Please check your input values.`,
              };
            }
            
            // Update existing position
            await SupabaseDataService.saveCryptoHolding({
              ...existingCrypto,
              amount: totalAmount,
              entryPoint: newAvgEntryPrice,
            });
            
            // Notify all components that crypto data has changed - immediate dispatch for AI actions
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('cryptoDataChanged'));
              window.dispatchEvent(new Event('financialDataChanged'));
            }
            
            return {
              success: true,
              message: `✅ Added ${finalAmount} more ${action.data.symbol}!\n\n📊 Previous: ${existingCrypto.amount} ${action.data.symbol} @ $${existingCrypto.entryPoint.toFixed(2)}\n➕ Added: ${finalAmount} ${action.data.symbol} @ $${finalEntryPrice.toFixed(2)}\n📈 New position: ${totalAmount} ${action.data.symbol} @ $${newAvgEntryPrice.toFixed(2)} average`,
            };
          }
          
          // 🚨 VALIDATION: Ensure current price is valid before saving
          if (isNaN(currentPrice) || currentPrice <= 0) {
            console.error('❌ VALIDATION ERROR: Invalid current price for crypto:', currentPrice);
            return {
              success: false,
              message: `❌ Could not fetch valid current price for ${action.data.symbol}. Please try again.`,
            };
          }
          
          await SupabaseDataService.saveCryptoHolding({
            id: crypto.randomUUID(),
            symbol: action.data.symbol.toUpperCase(),
            name: cryptoName,
            amount: finalAmount,
            entryPoint: finalEntryPrice,
            currentPrice: currentPrice,
            color: cryptoColor,
          });
          
          // Notify all components that crypto data has changed - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cryptoDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          const gainLoss = (currentPrice - finalEntryPrice) * finalAmount;
          const gainLossPercent = ((currentPrice - finalEntryPrice) / finalEntryPrice) * 100;
          
          return {
            success: true,
            message: `✅ Successfully added ${finalAmount} ${action.data.symbol.toUpperCase()} (${cryptoName})!\n\n💰 Entry: $${finalEntryPrice.toFixed(2)}\n📈 Current: $${currentPrice.toFixed(2)}\n${gainLoss >= 0 ? '🟢' : '🔴'} P/L: ${gainLoss >= 0 ? '+' : ''}$${gainLoss.toFixed(2)} (${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%)`,
          };

        case 'add_cash':
          // Generate a color for the cash account
          const cashColor = action.data.color || getAssetColor(action.data.bank || 'CASH', 'stock');
          
          await SupabaseDataService.saveCashAccount({
            id: crypto.randomUUID(),
            name: action.data.name || action.data.bank,
            bank: action.data.bank,
            balance: action.data.balance || 0,
            type: action.data.type || 'Checking',
            apy: action.data.apy || 0,
            color: cashColor,
          });
          
          // Notify all components that cash data has changed - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cashDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          return {
            success: true,
            message: `✅ Successfully added ${action.data.name || action.data.bank} with $${action.data.balance.toLocaleString()} balance!`,
          };

        case 'add_savings':
          // Generate a color for the savings account
          const savingsColor = action.data.color || getAssetColor(action.data.bank || 'SAVINGS', 'stock');
          
          await SupabaseDataService.saveSavingsAccount({
            id: crypto.randomUUID(),
            name: action.data.name,
            bank: action.data.bank,
            balance: action.data.balance || 0,
            apy: action.data.apy || 0,
            color: savingsColor,
          });
          
          // Notify all components that savings data has changed - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('savingsDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          return {
            success: true,
            message: `✅ Successfully added ${action.data.name} savings account with $${action.data.balance.toLocaleString()} balance at ${action.data.apy}% APY!`,
          };

        case 'update_balance':
          if (action.data.accountType === 'cash') {
            const accounts = await SupabaseDataService.getCashAccounts([]);
            const account = accounts.find(a => 
              a.name.toLowerCase().includes(action.data.accountName.toLowerCase())
            );
            if (account) {
              await SupabaseDataService.saveCashAccount({
                ...account,
                balance: action.data.newBalance,
              });
              
              // Notify components - immediate dispatch for AI actions
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('cashDataChanged'));
                window.dispatchEvent(new Event('financialDataChanged'));
              }
              
              return {
                success: true,
                message: `✅ Updated ${account.name} balance to $${action.data.newBalance.toLocaleString()}!`,
              };
            }
          } else if (action.data.accountType === 'savings') {
            const accounts = await SupabaseDataService.getSavingsAccounts([]);
            const account = accounts.find(a => 
              a.name.toLowerCase().includes(action.data.accountName.toLowerCase())
            );
            if (account) {
              await SupabaseDataService.saveSavingsAccount({
                ...account,
                balance: action.data.newBalance,
              });
              
              // Notify components - immediate dispatch for AI actions
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('savingsDataChanged'));
                window.dispatchEvent(new Event('financialDataChanged'));
              }
              
              return {
                success: true,
                message: `✅ Updated ${account.name} balance to $${action.data.newBalance.toLocaleString()}!`,
              };
            }
          }
          return {
            success: false,
            message: `❌ Could not find the account. Please specify the exact account name.`,
          };

        case 'add_property':
          // Generate a color for the property based on type
          const propertyColor = action.data.color || getAssetColor(action.data.propertyType || 'PROPERTY', 'stock');
          
          await SupabaseDataService.saveRealEstate({
            id: crypto.randomUUID(),
            name: action.data.name,
            propertyType: action.data.propertyType,
            currentValue: action.data.currentValue,
            purchasePrice: action.data.purchasePrice,
            loanAmount: action.data.loanAmount || 0,
            address: action.data.address,
            monthlyRent: action.data.monthlyRent || 0,
            color: propertyColor,
          });
          
          // Notify all components that real estate data has changed - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('realEstateDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          const equity = action.data.currentValue - (action.data.loanAmount || 0);
          const roi = action.data.purchasePrice > 0 
            ? ((action.data.currentValue - action.data.purchasePrice) / action.data.purchasePrice * 100)
            : 0;
          
          return {
            success: true,
            message: `✅ Successfully added property: ${action.data.name}!\n\n💰 Current Value: $${action.data.currentValue.toLocaleString()}\n🏦 Equity: $${equity.toLocaleString()}\n📈 ROI: ${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`,
          };

        case 'add_trading_position':
          // Generate a color for the trading position
          const tradingColor = action.data.color || getAssetColor(action.data.symbol || 'TRADE', 'stock');
          const positionValue = (action.data.size || 1) * (action.data.entryPrice || 0);
          
          await SupabaseDataService.saveTradingAccount({
            id: crypto.randomUUID(),
            name: action.data.symbol || action.data.name,
            broker: action.data.broker || 'Trading Account',
            balance: positionValue,
            type: action.data.type || 'Stocks',
            color: tradingColor,
          });
          
          // Notify all components that trading data has changed - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('tradingDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          return {
            success: true,
            message: `✅ Successfully opened ${action.data.type || 'trading'} position on ${action.data.symbol}!\n\n💰 Position Size: ${action.data.size}\n📈 Entry Price: $${action.data.entryPrice}\n💵 Total Value: $${positionValue.toLocaleString()}`,
          };

        case 'add_more_crypto':
          // 🚨 VALIDATION: Check required fields
          if (!action.data.symbol) {
            console.error('❌ Missing symbol for add_more_crypto');
            return {
              success: false,
              message: '❌ Missing cryptocurrency symbol. Which crypto do you want to add more of?',
            };
          }
          
          if (!action.data.amount || isNaN(action.data.amount) || action.data.amount <= 0) {
            console.error('❌ Missing or invalid amount for add_more_crypto');
            return {
              success: false,
              message: `❌ Missing or invalid amount. How much ${action.data.symbol} do you want to add?`,
            };
          }
          
          if (!action.data.entryPrice && !action.data.price) {
            console.error('❌ Missing entry price for add_more_crypto');
            return {
              success: false,
              message: `❌ Missing entry price. What price did you buy the ${action.data.symbol} at?`,
            };
          }
          
          // Normalize price field
          const cryptoEntryPrice = action.data.entryPrice || action.data.price;
          
          // Add more crypto to existing position (similar to add_more_stock)
          const existingCryptoHoldings = await SupabaseDataService.getCryptoHoldings([]);
          const existingCryptoToAddTo = existingCryptoHoldings.find((c: any) => 
            c.symbol.toUpperCase() === action.data.symbol.toUpperCase()
          );
          
          if (!existingCryptoToAddTo) {
            return {
              success: false,
              message: `❌ You don't have any ${action.data.symbol} to add to. Try "add ${action.data.amount} ${action.data.symbol}" instead.`,
            };
          }
          
          console.log(`📊 Adding ${action.data.amount} MORE ${action.data.symbol} to existing ${existingCryptoToAddTo.amount} ${action.data.symbol}`);
          
          // Calculate new weighted average entry price
          const existingCryptoCostBasis = existingCryptoToAddTo.amount * existingCryptoToAddTo.entryPoint;
          const newCryptoCostBasis = action.data.amount * cryptoEntryPrice;
          const totalAmount = existingCryptoToAddTo.amount + action.data.amount;
          const newCryptoAvgEntryPrice = (existingCryptoCostBasis + newCryptoCostBasis) / totalAmount;
          
          console.log(`  Old position: ${existingCryptoToAddTo.amount} ${action.data.symbol} @ $${existingCryptoToAddTo.entryPoint} = $${existingCryptoCostBasis.toFixed(2)}`);
          console.log(`  New purchase: ${action.data.amount} ${action.data.symbol} @ $${cryptoEntryPrice} = $${newCryptoCostBasis.toFixed(2)}`);
          console.log(`  Total position: ${totalAmount} ${action.data.symbol} @ $${newCryptoAvgEntryPrice.toFixed(2)} average = $${(existingCryptoCostBasis + newCryptoCostBasis).toFixed(2)}`);
          
          // Update the existing crypto with new amount and average price
          await SupabaseDataService.saveCryptoHolding({
            ...existingCryptoToAddTo,
            amount: totalAmount,
            entryPoint: newCryptoAvgEntryPrice,
          });
          
          // Notify all components that crypto data has changed - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cryptoDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          return {
            success: true,
            message: `✅ Successfully added ${action.data.amount} more ${action.data.symbol}!\n\n📊 Previous: ${existingCryptoToAddTo.amount} ${action.data.symbol} @ $${existingCryptoToAddTo.entryPoint.toFixed(2)}\n➕ Added: ${action.data.amount} ${action.data.symbol} @ $${cryptoEntryPrice.toFixed(2)}\n📈 New position: ${totalAmount} ${action.data.symbol} @ $${newCryptoAvgEntryPrice.toFixed(2)} average`,
          };

        case 'add_item':
        case 'add_valuable_item':
          // Generate a color for the valuable item based on category
          const itemColor = action.data.color || getAssetColor(action.data.category || 'ITEM', 'stock');
          
          await SupabaseDataService.saveValuableItem({
            id: crypto.randomUUID(),
            name: action.data.name,
            category: action.data.category,
            currentValue: action.data.currentValue || action.data.value,
            purchasePrice: action.data.purchasePrice || action.data.currentValue || action.data.value,
            purchaseDate: action.data.purchaseDate || new Date().toISOString().split('T')[0],
            description: action.data.description || action.data.notes || '',
            condition: action.data.condition || 'Excellent',
            insured: action.data.insured || false,
            insuranceValue: action.data.insuranceValue || 0,
            color: itemColor,
          });
          
          // Notify all components that valuable items data has changed - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('itemsDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          const itemValue = action.data.currentValue || action.data.value;
          const itemCost = action.data.purchasePrice || itemValue;
          const itemGain = itemValue - itemCost;
          
          return {
            success: true,
            message: `✅ Successfully added ${action.data.name} (${action.data.category})!\n\n💰 Current Value: $${itemValue.toLocaleString()}\n${itemGain >= 0 ? '📈' : '📉'} ${itemGain >= 0 ? 'Appreciation' : 'Depreciation'}: ${itemGain >= 0 ? '+' : ''}$${itemGain.toLocaleString()}`,
          };

        case 'add_expense':
        case 'add_subscription':
          // Add or update expense category
          const expenseCategories = await SupabaseDataService.getExpenseCategories([]);
          const existingCategory = expenseCategories.find((c: any) => 
            c.name.toLowerCase() === action.data.category.toLowerCase()
          );

          if (existingCategory) {
            // Update existing category with new amount
            await SupabaseDataService.saveExpenseCategory({
              ...existingCategory,
              amount: existingCategory.amount + action.data.amount,
            });
            
            // Notify components - immediate dispatch for AI actions
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('expensesDataChanged'));
              window.dispatchEvent(new Event('financialDataChanged'));
            }
            
            return {
              success: true,
              message: `✅ Added $${action.data.amount.toLocaleString()} to ${action.data.category}!\n\n📊 Previous: $${existingCategory.amount.toLocaleString()}\n📈 New total: $${(existingCategory.amount + action.data.amount).toLocaleString()}`,
            };
          } else {
            // Create new expense category
            const categoryColors: Record<string, string> = {
              'Housing': '#ef4444',
              'Food & Dining': '#f59e0b',
              'Transportation': '#8b5cf6',
              'Subscriptions': '#06b6d4',
              'Utilities': '#10b981',
              'Night Out': '#ec4899',
              'Activities & Experiences': '#f97316',
              'Travel': '#3b82f6',
            };

            const categoryIcons: Record<string, string> = {
              'Housing': 'home',
              'Food & Dining': 'shopping',
              'Transportation': 'car',
              'Subscriptions': 'credit-card',
              'Utilities': 'zap',
              'Night Out': 'shopping',
              'Activities & Experiences': 'shopping',
              'Travel': 'car',
            };

            await SupabaseDataService.saveExpenseCategory({
              id: crypto.randomUUID(),
              name: action.data.category,
              amount: action.data.amount,
              budget: action.data.amount * 1.2, // Set budget to 120% of initial amount
              color: categoryColors[action.data.category] || '#6b7280',
              icon: categoryIcons[action.data.category] || 'credit-card',
              description: action.data.description || `${action.data.category} expenses`,
            });

            // Notify components - immediate dispatch for AI actions
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('expensesDataChanged'));
              window.dispatchEvent(new Event('financialDataChanged'));
            }

            return {
              success: true,
              message: `✅ Created new ${action.data.category} expense category with $${action.data.amount.toLocaleString()}!\n\n💡 Track your spending and stay within your budget of $${(action.data.amount * 1.2).toLocaleString()}/month`,
            };
          }

        case 'add_debt':
        case 'add_liability':
          // Add debt account
          await SupabaseDataService.saveDebtAccount({
            id: crypto.randomUUID(),
            name: action.data.name,
            type: action.data.type,
            balance: action.data.balance,
            minPayment: action.data.minPayment,
            interestRate: action.data.interestRate,
            dueDate: action.data.dueDate,
            description: action.data.description,
          });

          // Notify components - immediate dispatch for AI actions
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('expensesDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }

          const monthsToPayoff = Math.ceil(action.data.balance / action.data.minPayment);
          const totalInterest = (action.data.balance * (action.data.interestRate / 100) / 12) * monthsToPayoff;

          return {
            success: true,
            message: `✅ Added ${action.data.type}: ${action.data.name}!\n\n💰 Balance: $${action.data.balance.toLocaleString()}\n📅 Min Payment: $${action.data.minPayment.toLocaleString()}/month\n📊 APR: ${action.data.interestRate}%\n⏰ Estimated payoff: ~${monthsToPayoff} months\n\n💡 Stay on top of this debt and consider paying more than the minimum to save on interest!`,
          };

        case 'sell_stock':
          console.log('🔍 Selling stock:', JSON.stringify(action.data, null, 2));
          
          // Validate required data
          if (!action.data.symbol) {
            return {
              success: false,
              message: '❌ Missing stock symbol. Which stock did you sell?',
            };
          }
          
          // Get existing holdings
          const stockHoldings = await SupabaseDataService.getStockHoldings([]);
          const stockToSell = stockHoldings.find((s: any) => 
            s.symbol.toUpperCase() === action.data.symbol.toUpperCase()
          );
          
          if (!stockToSell) {
            return {
              success: false,
              message: `❌ You don't have any ${action.data.symbol} to sell.`,
            };
          }
          
          // Determine shares to sell
          const sharesToSell = action.data.shares || stockToSell.shares;
          
          if (sharesToSell > stockToSell.shares) {
            return {
              success: false,
              message: `❌ You only have ${stockToSell.shares} shares of ${action.data.symbol}, but you're trying to sell ${sharesToSell}.`,
            };
          }
          
          // Get sell price (use current price if not specified)
          const sellPrice = action.data.sellPrice || stockToSell.currentPrice || (await enhancedMarketService.fetchAssetPrice(action.data.symbol))?.currentPrice || stockToSell.entryPoint;
          
          // Calculate profit/loss
          const stockProfit = (sellPrice - stockToSell.entryPoint) * sharesToSell;
          const stockProfitPercent = ((sellPrice - stockToSell.entryPoint) / stockToSell.entryPoint) * 100;
          const totalProceeds = sellPrice * sharesToSell;
          
          // Delete or update the stock holding
          if (sharesToSell === stockToSell.shares) {
            // Selling entire position
            await SupabaseDataService.deleteStockHolding(stockToSell.id);
          } else {
            // Selling partial position
            await SupabaseDataService.saveStockHolding({
              ...stockToSell,
              shares: stockToSell.shares - sharesToSell,
            });
          }
          
          // Handle reallocation if specified with specific account ID
          if (action.data.accountId && action.data.reallocateTo) {
            if (action.data.reallocateTo === 'cash') {
              const cashAccounts = await SupabaseDataService.getCashAccounts([]);
              const targetAccount = cashAccounts.find((acc: any) => acc.id === action.data.accountId);
              if (targetAccount) {
                await SupabaseDataService.saveCashAccount({
                  ...targetAccount,
                  balance: targetAccount.balance + totalProceeds,
                });
              }
            } else if (action.data.reallocateTo === 'savings') {
              const savingsAccounts = await SupabaseDataService.getSavingsAccounts([]);
              const targetAccount = savingsAccounts.find((acc: any) => acc.id === action.data.accountId);
              if (targetAccount) {
                await SupabaseDataService.saveSavingsAccount({
                  ...targetAccount,
                  balance: targetAccount.balance + totalProceeds,
                });
              }
            }
          }
          
          // Notify all components
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('stockDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          const profitEmoji = stockProfit >= 0 ? '🟢' : '🔴';
          const profitSign = stockProfit >= 0 ? '+' : '';
          
          let sellMessage = `✅ Sold ${sharesToSell} shares of ${action.data.symbol} at $${sellPrice.toFixed(2)}!\n\n`;
          sellMessage += `💰 **Proceeds**: $${totalProceeds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
          sellMessage += `${profitEmoji} **Profit/Loss**: ${profitSign}$${Math.abs(stockProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${profitSign}${stockProfitPercent.toFixed(2)}%)\n`;
          sellMessage += `📊 **Entry Price**: $${stockToSell.entryPoint.toFixed(2)} → **Exit Price**: $${sellPrice.toFixed(2)}\n`;
          
          if (sharesToSell < stockToSell.shares) {
            sellMessage += `\n📌 You still have ${stockToSell.shares - sharesToSell} shares remaining.`;
          } else {
            sellMessage += `\n🎯 Position fully closed!`;
          }
          
          if (stockProfit > 0) {
            sellMessage += `\n\n💡 Remember to consider capital gains tax on your profit!`;
          }
          
          // Ask which account to transfer proceeds to if not specified
          if (!action.data.accountId && !action.data.reallocateTo) {
            const cashAccounts = await SupabaseDataService.getCashAccounts([]);
            const savingsAccounts = await SupabaseDataService.getSavingsAccounts([]);
            const allAccounts = [...cashAccounts, ...savingsAccounts];
            
            if (allAccounts.length > 0) {
              sellMessage += `\n\n💸 **Which account should I transfer the proceeds to?**\n\n`;
              cashAccounts.forEach((acc: any) => {
                sellMessage += `• ${acc.bankName || acc.name} (Cash) - Current: $${acc.balance.toLocaleString()}\n`;
              });
              savingsAccounts.forEach((acc: any) => {
                sellMessage += `• ${acc.bankName || acc.name} (Savings) - Current: $${acc.balance.toLocaleString()}\n`;
              });
            }
          } else if (action.data.accountId && action.data.reallocateTo) {
            sellMessage += `\n\n� Proceeds transferred to your ${action.data.reallocateTo} account!`;
          }
          
          return {
            success: true,
            message: sellMessage,
          };

        case 'sell_crypto':
          console.log('🔍 Selling crypto:', JSON.stringify(action.data, null, 2));
          
          // Validate required data
          if (!action.data.symbol) {
            return {
              success: false,
              message: '❌ Missing cryptocurrency symbol. Which crypto did you sell?',
            };
          }
          
          // Get existing holdings
          const cryptoHoldings = await SupabaseDataService.getCryptoHoldings([]);
          const cryptoToSell = cryptoHoldings.find((c: any) => 
            c.symbol.toUpperCase() === action.data.symbol.toUpperCase()
          );
          
          if (!cryptoToSell) {
            return {
              success: false,
              message: `❌ You don't have any ${action.data.symbol} to sell.`,
            };
          }
          
          // Determine amount to sell
          const amountToSell = action.data.amount || cryptoToSell.amount;
          
          if (amountToSell > cryptoToSell.amount) {
            return {
              success: false,
              message: `❌ You only have ${cryptoToSell.amount} ${action.data.symbol}, but you're trying to sell ${amountToSell}.`,
            };
          }
          
          // Get sell price (use current price if not specified)
          const cryptoSellPrice = action.data.sellPrice || cryptoToSell.currentPrice || (await enhancedMarketService.fetchAssetPrice(action.data.symbol))?.currentPrice || cryptoToSell.entryPoint;
          
          // Calculate profit/loss
          const cryptoProfitPerUnit = cryptoSellPrice - cryptoToSell.entryPoint;
          const totalCryptoProfit = cryptoProfitPerUnit * amountToSell;
          const cryptoProfitPercent = (cryptoProfitPerUnit / cryptoToSell.entryPoint) * 100;
          const cryptoProceeds = cryptoSellPrice * amountToSell;
          
          // Delete or update the crypto holding
          if (amountToSell === cryptoToSell.amount) {
            // Selling entire position
            await SupabaseDataService.deleteCryptoHolding(cryptoToSell.id);
          } else {
            // Selling partial position
            await SupabaseDataService.saveCryptoHolding({
              ...cryptoToSell,
              amount: cryptoToSell.amount - amountToSell,
            });
          }
          
          // Handle reallocation if specified with specific account ID
          if (action.data.accountId && action.data.reallocateTo) {
            if (action.data.reallocateTo === 'cash') {
              const cashAccounts = await SupabaseDataService.getCashAccounts([]);
              const targetAccount = cashAccounts.find((acc: any) => acc.id === action.data.accountId);
              if (targetAccount) {
                await SupabaseDataService.saveCashAccount({
                  ...targetAccount,
                  balance: targetAccount.balance + cryptoProceeds,
                });
              }
            } else if (action.data.reallocateTo === 'savings') {
              const savingsAccounts = await SupabaseDataService.getSavingsAccounts([]);
              const targetAccount = savingsAccounts.find((acc: any) => acc.id === action.data.accountId);
              if (targetAccount) {
                await SupabaseDataService.saveSavingsAccount({
                  ...targetAccount,
                  balance: targetAccount.balance + cryptoProceeds,
                });
              }
            }
          }
          
          // Notify all components
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('cryptoDataChanged'));
            window.dispatchEvent(new Event('financialDataChanged'));
          }
          
          const cryptoProfitEmoji = totalCryptoProfit >= 0 ? '🟢' : '🔴';
          const cryptoProfitSign = totalCryptoProfit >= 0 ? '+' : '';
          
          let cryptoSellMessage = `✅ Sold ${amountToSell} ${action.data.symbol} at $${cryptoSellPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}!\n\n`;
          cryptoSellMessage += `💰 **Proceeds**: $${cryptoProceeds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
          cryptoSellMessage += `${cryptoProfitEmoji} **Profit/Loss**: ${cryptoProfitSign}$${Math.abs(totalCryptoProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${cryptoProfitSign}${cryptoProfitPercent.toFixed(2)}%)\n`;
          cryptoSellMessage += `📊 **Entry Price**: $${cryptoToSell.entryPoint.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → **Exit Price**: $${cryptoSellPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
          
          if (amountToSell < cryptoToSell.amount) {
            cryptoSellMessage += `\n📌 You still have ${cryptoToSell.amount - amountToSell} ${action.data.symbol} remaining.`;
          } else {
            cryptoSellMessage += `\n🎯 Position fully closed!`;
          }
          
          if (totalCryptoProfit > 0) {
            cryptoSellMessage += `\n\n💡 Remember to consider capital gains tax on your profit!`;
          }
          
          // Ask which account to transfer proceeds to if not specified
          if (!action.data.accountId && !action.data.reallocateTo) {
            const cashAccounts = await SupabaseDataService.getCashAccounts([]);
            const savingsAccounts = await SupabaseDataService.getSavingsAccounts([]);
            const allAccounts = [...cashAccounts, ...savingsAccounts];
            
            if (allAccounts.length > 0) {
              cryptoSellMessage += `\n\n💸 **Which account should I transfer the proceeds to?**\n\n`;
              cashAccounts.forEach((acc: any) => {
                cryptoSellMessage += `• ${acc.bankName || acc.name} (Cash) - Current: $${acc.balance.toLocaleString()}\n`;
              });
              savingsAccounts.forEach((acc: any) => {
                cryptoSellMessage += `• ${acc.bankName || acc.name} (Savings) - Current: $${acc.balance.toLocaleString()}\n`;
              });
            }
          } else if (action.data.accountId && action.data.reallocateTo) {
            cryptoSellMessage += `\n\n� Proceeds transferred to your ${action.data.reallocateTo} account!`;
          }
          
          return {
            success: true,
            message: cryptoSellMessage,
          };

        case 'transfer_proceeds':
          console.log('🔍 Transferring proceeds:', JSON.stringify(action.data, null, 2));
          
          if (!action.data.accountId || !action.data.accountType || !action.data.amount) {
            return {
              success: false,
              message: '❌ Missing transfer details. Please specify: accountId, accountType, and amount.',
            };
          }
          
          // Transfer to the specified account
          if (action.data.accountType === 'cash') {
            const cashAccounts = await SupabaseDataService.getCashAccounts([]);
            const targetAccount = cashAccounts.find((acc: any) => acc.id === action.data.accountId);
            if (targetAccount) {
              await SupabaseDataService.saveCashAccount({
                ...targetAccount,
                balance: targetAccount.balance + action.data.amount,
              });
              
              // Notify all components
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('financialDataChanged'));
              }
              
              return {
                success: true,
                message: `✅ Transferred $${action.data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${targetAccount.bankName || targetAccount.name}!\n\n💰 New balance: $${(targetAccount.balance + action.data.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              };
            } else {
              return {
                success: false,
                message: '❌ Could not find the specified cash account.',
              };
            }
          } else if (action.data.accountType === 'savings') {
            const savingsAccounts = await SupabaseDataService.getSavingsAccounts([]);
            const targetAccount = savingsAccounts.find((acc: any) => acc.id === action.data.accountId);
            if (targetAccount) {
              await SupabaseDataService.saveSavingsAccount({
                ...targetAccount,
                balance: targetAccount.balance + action.data.amount,
              });
              
              // Notify all components
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('financialDataChanged'));
              }
              
              return {
                success: true,
                message: `✅ Transferred $${action.data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${targetAccount.bankName || targetAccount.name}!\n\n💰 New balance: $${(targetAccount.balance + action.data.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              };
            } else {
              return {
                success: false,
                message: '❌ Could not find the specified savings account.',
              };
            }
          }
          
          return {
            success: false,
            message: '❌ Invalid account type. Please specify cash or savings.',
          };

        case 'reallocate_assets':
          console.log('🔍 Reallocating assets:', JSON.stringify(action.data, null, 2));
          
          if (!action.data.from || !action.data.to || !action.data.amount) {
            return {
              success: false,
              message: '❌ Missing reallocation details. Please specify: from (source), to (destination), and amount.',
            };
          }
          
          const reallocationAmount = action.data.amount;
          
          return {
            success: true,
            message: `💱 Reallocation initiated!\n\n📤 **From**: ${action.data.from}\n📥 **To**: ${action.data.to}\n💰 **Amount**: $${reallocationAmount.toLocaleString()}\n\n${action.data.specificSymbol ? `🎯 Specific asset: ${action.data.specificSymbol}\n\n` : ''}💡 This will help rebalance your portfolio. Would you like me to execute this move?`,
          };

        case 'remove_asset':
          console.log('🔍 Removing asset:', JSON.stringify(action.data, null, 2));
          
          if (!action.data.type) {
            return {
              success: false,
              message: '❌ Please specify which type of asset to remove (stock, crypto, property, cash, trading).',
            };
          }
          
          let removeMessage = `✅ Asset removal initiated!\n\n🗑️ **Type**: ${action.data.type}\n`;
          
          if (action.data.symbol) {
            removeMessage += `📊 **Symbol**: ${action.data.symbol}\n`;
          }
          
          removeMessage += `\n⚠️ **Warning**: This action cannot be undone. Would you like to proceed?`;
          
          return {
            success: true,
            message: removeMessage,
          };

        default:
          return {
            success: false,
            message: `❌ Unknown action type: ${action.type}`,
          };
      }
    } catch (error) {
      console.error('Error executing action:', error);
      return {
        success: false,
        message: `❌ Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Clear conversation context
   */
  clearContext(): void {
    this.context.previousMessages = [];
  }

  /**
   * Get current context statistics
   */
  getContextInfo(): any {
    return {
      messageCount: this.context.previousMessages.length,
      hasFinancialData: !!this.context.financialData,
      userId: this.context.userId,
    };
  }
}
