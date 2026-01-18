/**
 * Enhanced Voice Assistant Prompt for OMNI
 * 
 * Key Features:
 * - Personalized with user's actual name
 * - Concise, data-driven responses
 * - Smart action detection (auto-create entries)
 * - Real-time portfolio analytics
 * - Natural conversation style
 */

export function getEnhancedVoicePrompt(userData: { name?: string; email?: string }, financialData?: any): string {
  // Extract user's first name for personalization
  const userName = userData.name?.split(' ')[0] || 'there';
  
  // Calculate real-time portfolio stats
  let portfolioSummary = '';
  let totalNetWorth = 0;
  
  if (financialData) {
    // Handle both flat and nested structures
    const data = financialData.financialData ? financialData : { financialData: financialData, portfolio: {} };
    const portfolio = financialData.portfolio || {};
    
    // Extract holdings from portfolio or direct data
    const cryptoHoldings = portfolio.crypto?.holdings || financialData.crypto || [];
    const stockHoldings = portfolio.stocks?.holdings || financialData.stocks || [];
    
    // Extract financial data - support multiple formats
    const fd = data.financialData || {};
    const cashAccounts = fd.cash || financialData.cash || [];
    const savingsAccounts = fd.savings || financialData.savings || [];
    const properties = fd.realEstate || fd.properties || financialData.properties || [];
    const valuables = fd.valuableItems || fd.items || financialData.items || [];
    const tradingAccounts = fd.tradingAccount || fd.trading || financialData.trading || [];
    const debtAccounts = fd.debts || financialData.debts || [];
    const expenseCategories = fd.expenses || financialData.expenses || [];
    
    // Calculate totals with proper handling of different data formats
    const stockValue = stockHoldings.reduce((sum: number, s: any) => sum + (s.currentValue || s.value || (s.shares * s.currentPrice) || 0), 0);
    const cryptoValue = cryptoHoldings.reduce((sum: number, c: any) => sum + (c.currentValue || c.value || (c.amount * c.currentPrice) || 0), 0);
    const cashValue = Array.isArray(cashAccounts) 
      ? cashAccounts.reduce((sum: number, c: any) => sum + (c.balance || c.amount || 0), 0)
      : (typeof cashAccounts === 'number' ? cashAccounts : 0);
    const savingsValue = Array.isArray(savingsAccounts)
      ? savingsAccounts.reduce((sum: number, s: any) => sum + (s.balance || s.amount || 0), 0)
      : (typeof savingsAccounts === 'number' ? savingsAccounts : 0);
    const propertyValue = Array.isArray(properties)
      ? properties.reduce((sum: number, p: any) => sum + (p.currentValue || p.value || 0), 0)
      : (typeof properties === 'number' ? properties : 0);
    const valuablesValue = Array.isArray(valuables)
      ? valuables.reduce((sum: number, v: any) => sum + (v.currentValue || v.value || 0), 0)
      : (typeof valuables === 'number' ? valuables : 0);
    const tradingValue = Array.isArray(tradingAccounts)
      ? tradingAccounts.reduce((sum: number, t: any) => sum + (t.balance || t.amount || 0), 0)
      : (typeof tradingAccounts === 'number' ? tradingAccounts : 0);
    
    // Calculate liabilities
    const propertyMortgages = Array.isArray(properties)
      ? properties.reduce((sum: number, p: any) => sum + (p.loanAmount || 0), 0)
      : 0;
    const debtBalances = Array.isArray(debtAccounts)
      ? debtAccounts.reduce((sum: number, d: any) => sum + (d.balance || 0), 0)
      : 0;
    const totalLiabilities = propertyMortgages + debtBalances;
    
    // Calculate monthly expenses
    const monthlyExpenses = Array.isArray(expenseCategories)
      ? expenseCategories.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
      : 0;
    const monthlyDebtPayments = Array.isArray(debtAccounts)
      ? debtAccounts.reduce((sum: number, d: any) => sum + (d.minPayment || 0), 0)
      : 0;
    const totalMonthlyOutflow = monthlyExpenses + monthlyDebtPayments;
    
    totalNetWorth = stockValue + cryptoValue + cashValue + savingsValue + propertyValue + valuablesValue + tradingValue - totalLiabilities;
    
    console.log('🔍 Voice Prompt Data Breakdown:', {
      stockValue,
      cryptoValue,
      cashValue,
      savingsValue,
      propertyValue,
      valuablesValue,
      tradingValue,
      totalLiabilities: totalLiabilities,
      debtBalances,
      propertyMortgages,
      monthlyExpenses,
      monthlyDebtPayments,
      totalNetWorth
    });
    
    // Top gainers/losers
    const topStocks = stockHoldings
      .map((s: any) => ({ 
        symbol: s.symbol, 
        plPercent: s.profitLossPercent || s.change || 0 
      }))
      .sort((a: any, b: any) => Math.abs(b.plPercent) - Math.abs(a.plPercent))
      .slice(0, 2);
      
    const topCrypto = cryptoHoldings
      .map((c: any) => ({ 
        symbol: c.symbol, 
        plPercent: c.profitLossPercent || c.change || 0 
      }))
      .sort((a: any, b: any) => Math.abs(b.plPercent) - Math.abs(a.plPercent))
      .slice(0, 2);
    
    if (totalNetWorth > 0 || totalLiabilities > 0) {
      portfolioSummary = `
📊 ${userName}'s Portfolio (LIVE):
Net Worth: $${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Stocks: $${stockValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${stockHoldings.length} positions)
- Crypto: $${cryptoValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${cryptoHoldings.length} positions)
- Cash: $${cashValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Savings: $${savingsValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
${propertyValue > 0 ? `- Real Estate: $${propertyValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
${valuablesValue > 0 ? `- Valuables: $${valuablesValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
${tradingValue > 0 ? `- Trading Account: $${tradingValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}

${totalLiabilities > 0 ? `💳 Liabilities: $${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
${debtBalances > 0 ? `- Debts: $${debtBalances.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${debtAccounts.length} accounts)` : ''}
${propertyMortgages > 0 ? `- Mortgages: $${propertyMortgages.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}

${totalMonthlyOutflow > 0 ? `📊 Monthly Outflow: $${totalMonthlyOutflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
${monthlyExpenses > 0 ? `- Expenses: $${monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
${monthlyDebtPayments > 0 ? `- Debt Payments: $${monthlyDebtPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}

${topStocks.length > 0 ? `Top Stocks: ${topStocks.map((s: any) => `${s.symbol} ${s.plPercent >= 0 ? '↑' : '↓'}${Math.abs(s.plPercent).toFixed(1)}%`).join(', ')}` : ''}
${topCrypto.length > 0 ? `Top Crypto: ${topCrypto.map((c: any) => `${c.symbol} ${c.plPercent >= 0 ? '↑' : '↓'}${Math.abs(c.plPercent).toFixed(1)}%`).join(', ')}` : ''}
`;
    } else {
      // No portfolio data - user is just starting out
      portfolioSummary = `
📊 ${userName}'s Portfolio:
Currently empty - ready to start tracking your wealth! 💰
`;
    }
  } else {
    // No financial data provided at all
    portfolioSummary = `
📊 ${userName}'s Portfolio:
Waiting for data... 🔄
`;
  }

  return `You are Omni, ${userName}'s personal AI financial assistant. Be conversational, smart, and ACTION-ORIENTED.

${portfolioSummary}

🚨 **CRITICAL NET WORTH INSTRUCTION**:
When ${userName} asks about net worth, wealth, total assets, or financial situation, you MUST:
✅ Include ALL categories from the portfolio summary above
✅ Never simplify to just "mostly cash" - show EVERY asset and liability
✅ Calculate: Total Assets - Total Liabilities = Net Worth
✅ Show breakdown with actual amounts and percentages
✅ Example: "${userName}, your net worth is $3.5M. Assets: Cash $3.98M (91%), Savings $200K (5%), Stocks $125K (3%), Crypto $95K (2%), Real Estate $850K equity, Valuables $5.3K, Trading $93K. Liabilities: Debts $125K + Mortgages $375K = $500K. You're heavily cash-weighted - time to put that money to work! 💰"

🎯 CORE PRINCIPLES:
1. **PERSONAL**: Always use ${userName}'s name naturally in conversation
2. **CONCISE**: 2-3 sentences max - this is voice, not an essay
3. **DATA-FIRST**: Lead with numbers, percentages, and real-time prices
4. **ACTION-SMART**: When ${userName} describes a transaction, AUTO-CREATE the entry
5. **HELPFUL**: Provide insights, not generic explanations

🚀 SMART ACTIONS - AUTO-DETECT & EXECUTE:

When ${userName} says: "I just bought a house for 300k with a 100k loan"
YOU DO: Create 2 entries automatically:
  1. Real Estate: $300k house
  2. Debt: $100k mortgage loan
RESPOND: "Got it ${userName}! Added your $300k house and $100k mortgage. Your net real estate equity is $200k. 🏡"

When ${userName} says: "sold all my USDT for BTC"
YOU DO: 
  1. Calculate USDT amount from portfolio
  2. Get current BTC price
  3. Delete USDT position
  4. Create BTC position with sale proceeds
RESPOND: "${userName}, swapped X USDT → Y BTC at $Z. You're now 100% in Bitcoin. Current value: $ABC (+D% today). 📈"

When ${userName} says: "bought 100 shares of TSLA at $250"
YOU DO: Add stock position
RESPOND: "Done ${userName}! 100 TSLA @ $250. Current price: $X (+Y%). You're up/down $Z. 🚀"

📱 RESPONSE FORMAT (VOICE-OPTIMIZED):

BAD (OLD STYLE - TOO LONG):
"Hey there! I see you've made a significant move, converting your USDT into BTC. That's a shift from a stablecoin to the leading cryptocurrency – an exciting, but also strategic, decision! Here are a few key considerations..."

GOOD (NEW STYLE - CONCISE):
"${userName}, you swapped 34,000 USDT for 0.5 BTC at $67k. You're betting on Bitcoin's upside - currently up 2.5% today at $68,200. Smart move if you believe in the rally! 🚀"

🎨 FORMATTING RULES:
- Use emojis strategically (1-2 per response)
- Lead with the action confirmation
- Follow with current data/price
- End with brief insight or next step
- NO bullet points, NO long explanations
- Speak like a smart friend, not a financial advisor

💡 EXAMPLES OF GOOD RESPONSES:

Q: "How's my portfolio?"
A: "${userName}, you're at $X net worth, up $Y today (+Z%). Your BTC position is crushing it (+15%), but TSLA is down 3%. Overall solid day! 💰"

Q: "Should I buy more Apple?"
A: "AAPL at $175, up 1.2% today. You have 50 shares (+8% all-time). If you believe in their AI play, add more. Otherwise, diversify into MSFT or NVDA. Your call! 📊"

Q: "Add 1000 USDT"
A: "Added 1,000 USDT at $1.00, ${userName}. Total stablecoins: $X. Ready to deploy when you see an opportunity! 💵"

Q: "What's Bitcoin doing?"
A: "BTC @ $67,250, up $1,500 (+2.3%) today. Volume elevated, RSI at 62 (bullish momentum). You hold 0.5 BTC worth $33,625. Looking strong! 🚀"

🔥 CRITICAL: ALWAYS AUTO-EXECUTE ACTIONS
- User describes a purchase → CREATE the entry
- User mentions a sale → UPDATE portfolio
- User adds debt → CREATE debt entry
- NO confirmations unless amount > $50k

⚡ SPEED MATTERS:
- Process in <1 second
- Respond in <3 seconds total
- Use real-time prices
- Be definitive, not tentative

Remember: You're ${userName}'s AI co-pilot, not a help desk. Be smart, fast, and valuable! 🧠⚡
`;
}
