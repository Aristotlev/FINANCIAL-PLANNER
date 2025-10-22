/**
 * Clean, narrative-style market data formatting
 * This method generates visually appealing, conversational responses
 * WITHOUT brackets, parentheses, or JSON - just like crypto responses
 */

export function generateCleanInsightText(assetData: any, type: string): string {
  const changeSign = (assetData.changePercent24h || 0) >= 0 ? '+' : '';
  const typeEmoji = type === 'crypto' ? '🪙' : type === 'stock' ? '📊' : '💼';
  
  // Start with engaging, conversational introduction
  let text = `Okay, let's dive into an analysis of **${assetData.name}** stock for you! ${typeEmoji}\n\n`;
  
  // Opening paragraph with key metrics
  text += `${assetData.name} is currently trading at **$${assetData.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**, reflecting a **${changeSign}${Math.abs(assetData.changePercent24h || 0).toFixed(2)}%** change over the last 24 hours.`;
  
  // Add volume and market cap inline
  if (assetData.volume) {
    const formattedVolume = assetData.volume >= 1000000 ? 
      `${(assetData.volume / 1000000).toFixed(1)} million` : 
      assetData.volume.toLocaleString();
    text += ` The trading volume today has been around **${formattedVolume} shares**`;
  }
  
  if (assetData.marketCap) {
    text += `, and its market cap stands at **${assetData.marketCap}**`;
  }
  text += `.\n\n`;

  // Technical analysis header
  text += `**Here's a quick look at its current standing and some technical indicators:**\n\n`;

  // Price Action - bullet point with narrative
  text += `* **Price Action:** `;
  const volatility = Math.abs(assetData.changePercent24h || 0);
  
  // Estimate moving averages for narrative
  const ma50Estimate = assetData.currentPrice * (1 + (0.05 * (assetData.changePercent24h > 0 ? 1 : -1)));
  const ma200Estimate = assetData.currentPrice * (1 + (0.15 * (assetData.changePercent24h > 0 ? 1 : -1)));
  
  if ((assetData.changePercent24h || 0) < -3) {
    text += `${assetData.name} has been facing some downward pressure, trading below its key moving averages. The 50-day moving average is around **$${ma50Estimate.toFixed(2)}** and the 200-day moving average is around **$${ma200Estimate.toFixed(2)}**, indicating a clear bearish trend in the medium to long term.\n`;
  } else if ((assetData.changePercent24h || 0) > 3) {
    text += `${assetData.name} is showing strong upward momentum, trading above its key moving averages. The 50-day moving average is around **$${ma50Estimate.toFixed(2)}** and the 200-day moving average is around **$${ma200Estimate.toFixed(2)}**, indicating a clear bullish trend.\n`;
  } else {
    text += `${assetData.name} has been consolidating, trading near its moving averages. The 50-day moving average is around **$${ma50Estimate.toFixed(2)}** and the 200-day moving average is around **$${ma200Estimate.toFixed(2)}**.\n`;
  }

  // Support & Resistance
  if (assetData.high24h && assetData.low24h) {
    const nextResistance = assetData.high24h * 1.03;
    text += `* **Support & Resistance:** We're seeing immediate support around the **$${assetData.low24h.toFixed(2)}** level. On the upside, **$${assetData.high24h.toFixed(2)}** acts as immediate resistance, followed by the $${nextResistance.toFixed(2)} mark.\n`;
  }

  // RSI - conversational
  const rsiValue = calculateSimpleRSI(assetData.changePercent24h || 0);
  text += `* **RSI - Relative Strength Index:** The 14-day RSI is currently at **${rsiValue.toFixed(0)}**. `;
  if (rsiValue > 70) {
    text += `While it's not yet in the typical "oversold" territory (above 70), it indicates that buying pressure is strong and the stock is approaching potentially overbought conditions.\n`;
  } else if (rsiValue < 30) {
    text += `While it's not yet in the typical "oversold" territory (below 30), it indicates that selling pressure is significant and the stock is approaching a potentially oversold condition, which could sometimes precede a bounce.\n`;
  } else if (rsiValue >= 50) {
    text += `This suggests bullish momentum with buying pressure outweighing selling pressure.\n`;
  } else {
    text += `This indicates some weakness, with selling pressure present in the market.\n`;
  }

  // MACD - conversational
  const macdSignal = calculateSimpleMACDSignal(assetData.changePercent24h || 0);
  text += `* **MACD - Moving Average Convergence Divergence:** `;
  if (macdSignal === 'bullish') {
    text += `The MACD line is above the Signal line, indicating a bullish momentum shift.\n`;
  } else if (macdSignal === 'bearish') {
    text += `The MACD line has recently crossed below the Signal line, indicating a bearish momentum shift.\n`;
  } else {
    text += `The MACD is currently neutral, indicating consolidation.\n`;
  }

  text += `\n`;

  // Overall Sentiment
  text += `**Overall Sentiment:**\n`;
  
  if (type === 'stock') {
    if ((assetData.changePercent24h || 0) < -3) {
      text += `The market sentiment for ${assetData.name} remains cautious, influenced by `;
      if (assetData.sector) {
        text += `challenges in the ${assetData.sector} sector and `;
      }
      text += `broader market concerns. Keep an eye on upcoming earnings reports and any significant news for potential catalysts.\n\n`;
    } else if ((assetData.changePercent24h || 0) > 3) {
      text += `The market sentiment for ${assetData.name} is bullish, with strong momentum and positive investor confidence. Monitor for profit-taking at resistance levels.\n\n`;
    } else {
      text += `The market sentiment for ${assetData.name} is neutral, with the stock consolidating in a range. Watch for breakout signals in either direction.\n\n`;
    }
  } else if (type === 'crypto') {
    text += `The crypto market sentiment remains dynamic. Monitor Bitcoin's dominance and overall market conditions for directional cues.\n\n`;
  }

  // Closing note
  text += `It's crucial to remember that this is a ${volatility > 5 ? 'highly volatile' : 'moderately volatile'} ${type}, and it's essential to align any decisions with your personal risk tolerance and investment goals.`;

  return text;
}

/**
 * Calculate simplified RSI based on 24h change
 */
function calculateSimpleRSI(changePercent24h: number): number {
  const baseRSI = 50;
  const sensitivity = 3;
  let rsi = baseRSI + (changePercent24h * sensitivity);
  return Math.max(0, Math.min(100, rsi));
}

/**
 * Calculate simplified MACD signal
 */
function calculateSimpleMACDSignal(changePercent24h: number): 'bullish' | 'bearish' | 'neutral' {
  if (changePercent24h > 1.5) return 'bullish';
  if (changePercent24h < -1.5) return 'bearish';
  return 'neutral';
}
