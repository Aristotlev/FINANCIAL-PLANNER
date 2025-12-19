/**
 * Advanced TTS Preprocessor using Gemini API
 * Converts text to natural, spoken-friendly format
 * Handles numbers, percentages, currency, symbols, and technical terms
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export class TTSPreprocessor {
  private static genAI: GoogleGenerativeAI | null = null;
  private static model: any = null;
  private static initializationAttempted: boolean = false;

  /**
   * Initialize Gemini API for text preprocessing with robust model selection
   * NOTE: This should only be called from server-side code (API routes)
   */
  private static async initialize() {
    if (this.genAI || this.initializationAttempted) return;

    this.initializationAttempted = true;

    // ✅ Use server-side API key (no NEXT_PUBLIC_ prefix)
    const apiKey = process.env.GOOGLE_AI_API_KEY || '';
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn('⚠️ [TTS] Gemini API key not configured - using fallback preprocessing');
      console.warn('📝 [TTS] Add GOOGLE_AI_API_KEY to .env.local for AI-powered TTS');
      return;
    }

    console.log('🔑 [TTS] Gemini API key found:', apiKey.substring(0, 20) + '...');
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different models in order of preference (same as GeminiService)
    const modelNames = [
      'gemini-2.5-flash',      // Latest and fastest
      'gemini-2.0-flash',      // Fallback
      'gemini-flash-latest',   // Generic latest
      'gemini-pro-latest',     // Pro version
    ];

    for (const modelName of modelNames) {
      try {
        console.log(`🔍 [TTS] Trying model: ${modelName}`);
        this.model = this.genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.3,  // Lower temperature for more consistent TTS preprocessing
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        });
        
        // Test the model with a simple request
        const testResult = await this.model.generateContent('Test');
        await testResult.response;
        
        console.log(`✅ [TTS] Successfully initialized with model: ${modelName}`);
        return;
      } catch (error: any) {
        console.log(`❌ [TTS] Model ${modelName} failed:`, error.message);
        continue;
      }
    }
    
    console.warn('⚠️ [TTS] No working Gemini model found - using fallback preprocessing');
    this.model = null;
  }

  /**
   * Main preprocessing function - uses Gemini AI to convert text for TTS
   */
  static async preprocessForTTS(text: string): Promise<string> {
    console.log('🎙️ [TTS Preprocessor] Starting text preprocessing...');
    console.log('📝 [TTS Preprocessor] Original length:', text.length);

    // Initialize if needed
    await this.initialize();

    // If Gemini not available, use fallback
    if (!this.model) {
      console.log('⚠️ [TTS Preprocessor] Gemini AI unavailable - using fallback preprocessing');
      return this.fallbackPreprocess(text);
    }

    try {
      // Use Gemini to intelligently convert text to speech-friendly format
      const prompt = `You are a professional financial voice assistant TTS preprocessor. Convert the following text into natural, spoken English that sounds perfect when read aloud by a premium AI voice (like a Bloomberg anchor or financial news reporter).

**CRITICAL RULES - Follow EXACTLY:**

1. **Remove ALL Visual Formatting:**
   - ❌ Remove ALL vertical bars: | → (space or remove)
   - ❌ Remove ALL emojis: 🚀💰📈📊💵 etc.
   - ❌ Remove ALL markdown: **bold**, *italic*, \`code\`, # headers
   - ❌ Remove ALL bullets: •, -, *, numbered lists
   - ❌ Remove ALL symbols: ━━━, ═══, ───, etc.
   - ❌ Remove section dividers and decorative elements

2. **Financial Technical Indicators (Pronounce Naturally):**
   - "RSI" → "R S I" (spell it out)
   - "MACD" → "M A C D" (spell it out)
   - "50MA" → "fifty day moving average"
   - "200MA" → "two hundred day moving average"
   - "50-day MA" → "fifty day moving average"
   - "EMA" → "E M A" or "exponential moving average"
   - "SMA" → "S M A" or "simple moving average"
   - "ATR" → "A T R" or "average true range"
   - "ADX" → "A D X"
   - "Stochastic" → "stochastic" (keep as-is)
   - "Bollinger Bands" → "bollinger bands" (keep as-is)
   - "Fibonacci" → "fibonacci" (keep as-is)
   - "Volume" → "volume" (keep as-is)

3. **Market Terms & Ratios:**
   - "P/E ratio" → "price to earnings ratio"
   - "P/B ratio" → "price to book ratio"
   - "EPS" → "E P S" or "earnings per share"
   - "ROE" → "R O E" or "return on equity"
   - "ROI" → "R O I" or "return on investment"
   - "YTD" → "year to date"
   - "YoY" → "year over year"
   - "QoQ" → "quarter over quarter"
   - "ATH" → "all time high"
   - "ATL" → "all time low"
   - "IPO" → "I P O" or "initial public offering"
   - "ETF" → "E T F" or "exchange traded fund"
   - "S&P 500" → "S and P five hundred"
   - "Dow Jones" → "dow jones" (keep as-is)
   - "NASDAQ" → "nasdaq" (keep as-is)

4. **Crypto & Stock Symbols:**
   - "BTC" → "Bitcoin"
   - "ETH" → "Ethereum"
   - "USDT" → "Tether"
   - "BNB" → "Binance Coin"
   - "SOL" → "Solana"
   - "ADA" → "Cardano"
   - "AAPL" → "Apple"
   - "TSLA" → "Tesla"
   - "MSFT" → "Microsoft"
   - "GOOGL" → "Google"
   - "AMZN" → "Amazon"
   - "META" → "Meta"
   - "NVDA" → "Nvidia"

5. **Numbers & Currency (Natural Pronunciation):**
   - "$1,234" → "one thousand two hundred thirty four dollars"
   - "$1,234,567" → "one point two three million dollars" (round for speech)
   - "$5.50" → "five dollars and fifty cents"
   - "$0.99" → "ninety nine cents"
   - "0.5 BTC" → "zero point five Bitcoin"
   - "1.23456 ETH" → "one point two three Ethereum" (round decimals)

6. **Percentages (Clear & Natural):**
   - "+2.5%" → "up two point five percent"
   - "-3.75%" → "down three point seven five percent"
   - "26.82%" → "twenty six point eight two percent"

7. **Time Periods:**
   - "24h" → "twenty four hour"
   - "7d" → "seven day"
   - "30d" → "thirty day"
   - "52W" → "fifty two week"
   - "1Y" → "one year"
   - "YTD" → "year to date"
   - "Q1 2024" → "first quarter twenty twenty four"

8. **Large Numbers:**
   - "1,000" → "one thousand"
   - "1.5M" → "one point five million"
   - "2.5B" → "two point five billion"
   - "750K" → "seven hundred fifty thousand"

9. **Natural Speech Flow:**
   - Break long sentences into shorter ones
   - Add natural pauses with periods
   - Remove redundant information
   - Make it conversational and professional
   - Sound like a Bloomberg financial anchor

**ABSOLUTE REQUIREMENTS:**
✅ Output ONLY the speech-ready text
✅ NO explanations or meta-commentary
✅ NO emojis in output
✅ NO markdown in output
✅ NO vertical bars (|) in output
✅ Sound professional and natural
✅ Perfect for financial news voice

**Text to convert:**

${text}

**Output (professional speech text only):**`;

      console.log('🤖 [TTS Preprocessor] Calling Gemini API...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const processedText = response.text().trim();

      console.log('✅ [TTS Preprocessor] Gemini processing complete');
      console.log('📝 [TTS Preprocessor] Processed length:', processedText.length);
      console.log('🎯 [TTS Preprocessor] Sample:', processedText.substring(0, 150) + '...');

      return processedText;

    } catch (error) {
      console.error('❌ [TTS Preprocessor] Gemini API error:', error);
      console.log('⚠️ [TTS Preprocessor] Falling back to rule-based preprocessing');
      return this.fallbackPreprocess(text);
    }
  }

  /**
   * Fallback preprocessing using rule-based approach (when Gemini unavailable)
   */
  private static fallbackPreprocess(text: string): string {
    console.log('🔧 [TTS Preprocessor] Using fallback rule-based preprocessing');
    
    let processed = text;

    // ❌ REMOVE VERTICAL BARS (critical for clean speech)
    processed = processed.replace(/\|/g, ' ');  // Replace with space
    processed = processed.replace(/\s*\|\s*/g, ' '); // Remove bars with surrounding spaces

    // Remove all emojis (comprehensive pattern)
    processed = processed.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''); // Surrogate pairs (emojis)
    processed = processed.replace(/[\u2600-\u27BF]/g, ''); // Misc symbols and dingbats
    processed = processed.replace(/[\uE000-\uF8FF]/g, ''); // Private use area
    processed = processed.replace(/[\u2300-\u23FF]/g, ''); // Miscellaneous Technical
    processed = processed.replace(/[\u2B00-\u2BFF]/g, ''); // Miscellaneous Symbols and Arrows

    // Remove markdown formatting
    processed = processed.replace(/\*\*/g, '');     // Bold
    processed = processed.replace(/\*/g, '');       // Italic
    processed = processed.replace(/#{1,6}\s/g, ''); // Headers
    processed = processed.replace(/`{1,3}/g, '');   // Code
    processed = processed.replace(/_{1,2}/g, '');   // Underline
    processed = processed.replace(/~/g, '');        // Strikethrough
    processed = processed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links
    processed = processed.replace(/━+/g, '');       // Dividers
    processed = processed.replace(/═+/g, '');       // Double dividers
    processed = processed.replace(/─+/g, '');       // Light dividers
    processed = processed.replace(/•/g, '');        // Bullets

    // ✅ FINANCIAL TECHNICAL INDICATORS (proper pronunciation)
    const technicalIndicators: Record<string, string> = {
      '50MA': 'fifty day moving average',
      '200MA': 'two hundred day moving average',
      '50-day MA': 'fifty day moving average',
      '200-day MA': 'two hundred day moving average',
      '50 day MA': 'fifty day moving average',
      '200 day MA': 'two hundred day moving average',
      'EMA': 'E M A',
      'SMA': 'S M A',
      'ATR': 'A T R',
      'ADX': 'A D X',
      'RSI': 'R S I',
      'MACD': 'M A C D',
      'P/E ratio': 'price to earnings ratio',
      'P/B ratio': 'price to book ratio',
      'P/E': 'price to earnings',
      'P/B': 'price to book',
      'EPS': 'E P S',
      'ROE': 'R O E',
      'ROI': 'R O I',
      'YTD': 'year to date',
      'YoY': 'year over year',
      'QoQ': 'quarter over quarter',
      'ATH': 'all time high',
      'ATL': 'all time low',
      'IPO': 'I P O',
      'ETF': 'E T F',
    };

    // Replace technical indicators (case-insensitive)
    Object.entries(technicalIndicators).forEach(([indicator, expansion]) => {
      const regex = new RegExp(`\\b${indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      processed = processed.replace(regex, expansion);
    });

    // ✅ MARKET INDICES & COMMON TERMS
    processed = processed.replace(/\bS&P 500\b/gi, 'S and P five hundred');
    processed = processed.replace(/\bS&P\b/gi, 'S and P');
    processed = processed.replace(/\bDow Jones\b/gi, 'dow jones');
    processed = processed.replace(/\bNASDAQ\b/gi, 'nasdaq');

    // Expand common crypto/finance acronyms
    const acronyms: Record<string, string> = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'USDT': 'Tether',
      'USDC': 'U S D C',
      'BNB': 'Binance Coin',
      'SOL': 'Solana',
      'ADA': 'Cardano',
      'DOGE': 'Dogecoin',
      'XRP': 'Ripple',
      'AAPL': 'Apple',
      'TSLA': 'Tesla',
      'MSFT': 'Microsoft',
      'GOOGL': 'Google',
      'AMZN': 'Amazon',
      'META': 'Meta',
      'NVDA': 'Nvidia',
      'GDP': 'G D P',
      'VIX': 'V I X',
      'CEO': 'C E O',
      'CFO': 'C F O',
      'CTO': 'C T O',
    };

    // Replace acronyms with pronunciations (word boundaries)
    Object.entries(acronyms).forEach(([acronym, expansion]) => {
      const regex = new RegExp(`\\b${acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      processed = processed.replace(regex, expansion);
    });

    // Format large currency amounts
    processed = processed.replace(/\$(\d{1,3}),?(\d{3}),?(\d{3}),?(\d{3})\b/g, (match, billions, millions, thousands, ones) => {
      const num = parseInt(billions + millions + thousands + ones);
      if (num >= 1000000000) {
        return `$${(num / 1000000000).toFixed(2)} billion`;
      }
      return match;
    });

    processed = processed.replace(/\$(\d{1,3}),?(\d{3}),?(\d{3})\b/g, (match, millions, thousands, ones) => {
      const num = parseInt(millions + thousands + ones);
      if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(2)} million`;
      }
      return match;
    });

    processed = processed.replace(/\$(\d{1,3}),?(\d{3})\b/g, (match, thousands, ones) => {
      const num = parseInt(thousands + ones);
      if (num >= 1000) {
        return `$${(num / 1000).toFixed(2)} thousand`;
      }
      return match;
    });

    // Format percentages - read decimals digit by digit
    processed = processed.replace(/\+?([\d,]+)\.(\d+)%/g, (match, whole, decimal) => {
      const cleanWhole = whole.replace(/,/g, '');
      const decimalSpaced = decimal.split('').join(' ');
      const prefix = match.startsWith('+') ? 'up ' : '';
      return `${prefix}${cleanWhole} point ${decimalSpaced} percent`;
    });

    processed = processed.replace(/-([\d,]+)\.(\d+)%/g, (match, whole, decimal) => {
      const cleanWhole = whole.replace(/,/g, '');
      const decimalSpaced = decimal.split('').join(' ');
      return `down ${cleanWhole} point ${decimalSpaced} percent`;
    });

    processed = processed.replace(/([\d,]+)%/g, (match, num) => {
      const cleanNum = num.replace(/,/g, '');
      return `${cleanNum} percent`;
    });

    // Format decimal numbers (for crypto amounts)
    processed = processed.replace(/\b(\d+)\.(\d+)\b/g, (match, whole, decimal) => {
      if (decimal.length <= 2) {
        return match; // Keep short decimals as-is
      }
      // For long decimals (like 0.123456), read digit by digit
      const decimalSpaced = decimal.split('').join(' ');
      return `${whole} point ${decimalSpaced}`;
    });

    // Format time references
    processed = processed.replace(/24h/gi, 'twenty four hour');
    processed = processed.replace(/52W/gi, 'fifty two week');
    processed = processed.replace(/\bQ(\d)/g, (match, quarter) => {
      const quarters = ['first', 'second', 'third', 'fourth'];
      return quarters[parseInt(quarter) - 1] + ' quarter';
    });

    // Replace symbols
    processed = processed.replace(/→/g, 'to');
    processed = processed.replace(/×/g, 'times');
    processed = processed.replace(/÷/g, 'divided by');
    processed = processed.replace(/≈/g, 'approximately');
    processed = processed.replace(/±/g, 'plus or minus');

    // Replace multiple newlines with periods for pauses
    processed = processed.replace(/\n\n+/g, '. ');
    processed = processed.replace(/\n/g, ' ');

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ');
    processed = processed.trim();

    console.log('✅ [TTS Preprocessor] Fallback processing complete');
    return processed;
  }

  /**
   * Quick preprocessing for real-time use (no AI, pure rules)
   * Use this when you need instant results without API calls
   */
  static quickPreprocess(text: string): string {
    return this.fallbackPreprocess(text);
  }

  /**
   * Batch preprocessing for multiple texts (optimized)
   */
  static async preprocessBatch(texts: string[]): Promise<string[]> {
    console.log(`🎙️ [TTS Preprocessor] Batch processing ${texts.length} texts...`);
    
    // Process all texts in parallel
    const results = await Promise.all(
      texts.map(text => this.preprocessForTTS(text))
    );
    
    console.log('✅ [TTS Preprocessor] Batch processing complete');
    return results;
  }
}
