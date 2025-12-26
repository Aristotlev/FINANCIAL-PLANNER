// Worker for heavy financial calculations
// This runs in a separate thread to keep the UI responsive

// ROI Calculation
function calculateROI(assets) {
  let totalCost = 0;
  let totalValue = 0;
  
  assets.forEach(asset => {
    const cost = asset.amount * asset.entryPoint;
    const value = asset.amount * asset.currentPrice;
    
    totalCost += cost;
    totalValue += value;
  });
  
  const gainLoss = totalValue - totalCost;
  const percentage = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
  
  return {
    totalCost,
    totalValue,
    gainLoss,
    percentage
  };
}

// Portfolio Stats Calculation
function calculatePortfolioStats(assets) {
  // Simulate heavy calculation
  const start = performance.now();
  
  const stats = {
    totalAssets: assets.length,
    diversificationScore: 0,
    riskScore: 0,
    projectedAnnualReturn: 0
  };
  
  // Calculate diversification (Herfindahl-Hirschman Index)
  const totalValue = assets.reduce((sum, a) => sum + (a.amount * a.currentPrice), 0);
  let hhi = 0;
  
  if (totalValue > 0) {
    assets.forEach(asset => {
      const weight = (asset.amount * asset.currentPrice) / totalValue;
      hhi += weight * weight;
    });
  }
  
  // HHI ranges from 1/N to 1. Lower is better diversification.
  // Normalize to 0-100 score where 100 is best
  stats.diversificationScore = Math.max(0, Math.min(100, (1 - hhi) * 100));
  
  // Calculate risk score based on volatility (simulated)
  let weightedVolatility = 0;
  assets.forEach(asset => {
    const weight = (asset.amount * asset.currentPrice) / totalValue;
    // Assign mock volatility based on asset type if available, or random
    const volatility = asset.type === 'crypto' ? 0.8 : asset.type === 'stock' ? 0.3 : 0.1;
    weightedVolatility += weight * volatility;
  });
  
  stats.riskScore = weightedVolatility * 100;
  
  // Calculate projected return
  let weightedReturn = 0;
  assets.forEach(asset => {
    const weight = (asset.amount * asset.currentPrice) / totalValue;
    // Assign mock return based on asset type
    const annualReturn = asset.type === 'crypto' ? 0.15 : asset.type === 'stock' ? 0.08 : 0.04;
    weightedReturn += weight * annualReturn;
  });
  
  stats.projectedAnnualReturn = weightedReturn * 100;
  
  const end = performance.now();
  console.log(`Portfolio stats calculation took ${(end - start).toFixed(2)}ms`);
  
  return stats;
}

// Rebalancing Calculation
function calculateRebalancing(data) {
  const { assets, targetAllocation } = data;
  const totalValue = assets.reduce((sum, a) => sum + (a.amount * a.currentPrice), 0);
  
  const suggestions = [];
  
  // Group assets by category/symbol
  const currentAllocation = {};
  
  assets.forEach(asset => {
    const value = asset.amount * asset.currentPrice;
    const key = asset.category || asset.symbol; // Use category if available, else symbol
    currentAllocation[key] = (currentAllocation[key] || 0) + value;
  });
  
  // Compare with target
  Object.keys(targetAllocation).forEach(key => {
    const targetPercent = targetAllocation[key];
    const targetValue = totalValue * (targetPercent / 100);
    const currentValue = currentAllocation[key] || 0;
    const difference = targetValue - currentValue;
    
    if (Math.abs(difference) > totalValue * 0.01) { // Only suggest if diff > 1%
      suggestions.push({
        asset: key,
        action: difference > 0 ? 'buy' : 'sell',
        amount: Math.abs(difference),
        currentPercent: (currentValue / totalValue) * 100,
        targetPercent
      });
    }
  });
  
  return suggestions;
}

// Message handler
self.onmessage = (event) => {
  const { id, type, data } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'roi':
        result = calculateROI(data);
        break;
      case 'portfolio-stats':
        result = calculatePortfolioStats(data);
        break;
      case 'rebalancing':
        result = calculateRebalancing(data);
        break;
      default:
        throw new Error(`Unknown calculation type: ${type}`);
    }
    
    const response = {
      id,
      type,
      result
    };
    
    self.postMessage(response);
  } catch (error) {
    const response = {
      id,
      type,
      result: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    self.postMessage(response);
  }
};
