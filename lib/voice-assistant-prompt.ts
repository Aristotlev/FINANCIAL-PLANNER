/**
 * Optimized system prompt for LISA voice assistant
 * Focused on: Speed, brevity, real-time data
 */

export function getVoiceAssistantPrompt(financialData: any): string {
  let prompt = `You are Lisa, a fast AI voice assistant. Keep responses under 3 sentences.

**Portfolio Data (LIVE):`;

  if (financialData) {
    // Stocks
    if (financialData.stocks?.length > 0) {
      const total = financialData.stocks.reduce((sum: number, s: any) => 
        sum + (s.currentValue || s.shares * s.currentPrice), 0);
      const pl = financialData.stocks.reduce((sum: number, s: any) => {
        const val = s.currentValue || s.shares * s.currentPrice;
        return sum + (val - s.shares * s.entryPoint);
      }, 0);
      const plPercent = (pl / (total - pl)) * 100;
      
      prompt += `\n📈 Stocks: $${total.toFixed(0)} (${pl >= 0 ? '+' : ''}${plPercent.toFixed(1)}%)`;
      financialData.stocks.slice(0, 2).forEach((s: any) => {
        const price = s.currentPrice || s.entryPoint;
        const gain = ((price - s.entryPoint) / s.entryPoint) * 100;
        prompt += `\n  ${s.symbol}: $${price.toFixed(2)} (${gain >= 0 ? '+' : ''}${gain.toFixed(1)}%)`;
      });
    }

    // Crypto
    if (financialData.crypto?.length > 0) {
      const total = financialData.crypto.reduce((sum: number, c: any) => 
        sum + (c.currentValue || c.amount * c.currentPrice), 0);
      const pl = financialData.crypto.reduce((sum: number, c: any) => {
        const val = c.currentValue || c.amount * c.currentPrice;
        return sum + (val - c.amount * c.entryPoint);
      }, 0);
      const plPercent = (pl / (total - pl)) * 100;
      
      prompt += `\n💰 Crypto: $${total.toFixed(0)} (${pl >= 0 ? '+' : ''}${plPercent.toFixed(1)}%)`;
      financialData.crypto.slice(0, 2).forEach((c: any) => {
        const price = c.currentPrice || c.entryPoint;
        const gain = ((price - c.entryPoint) / c.entryPoint) * 100;
        prompt += `\n  ${c.symbol}: $${price.toFixed(2)} (${gain >= 0 ? '+' : ''}${gain.toFixed(1)}%)`;
      });
    }

    // Cash & Savings
    const cash = financialData.cash?.reduce((s: number, c: any) => s + c.balance, 0) || 0;
    const savings = financialData.savings?.reduce((s: number, c: any) => s + c.balance, 0) || 0;
    if (cash > 0) prompt += `\n💵 Cash: $${cash.toFixed(0)}`;
    if (savings > 0) prompt += `\n🏦 Savings: $${savings.toFixed(0)}`;
  }

  prompt += `\n\n**Rules:**
• 2-3 sentences max (voice response)
• Lead with price & P/L data
• Use exact numbers (user says "5 shares" = 5, not 50)
• Auto-add to existing positions
• For actions: {"action": {"type": "add_stock", "data": {symbol, shares, entryPrice}}, "message": "..."}`;

  return prompt;
}
