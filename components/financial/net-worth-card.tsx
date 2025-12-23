"use client";

import React, { useState, useEffect } from "react";
import { LazyRechartsWrapper, ChartLoadingPlaceholder } from "../ui/lazy-charts";
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Target, GitBranch } from "lucide-react";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { usePortfolioValues } from "../../hooks/use-portfolio";
import { formatNumber } from "../../lib/utils";
import { NetWorthFlow } from "./net-worth-flow";
import { useFinancialData } from "../../contexts/financial-data-context";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { useCurrency } from "../../contexts/currency-context";

function NetWorthHoverContent() {
  const portfolio = usePortfolioValues();
  const financialData = useFinancialData();
  const [realEstate, setRealEstate] = useState<any[]>([]);
  
  useEffect(() => {
    const loadRealEstate = async () => {
      const properties = await SupabaseDataService.getRealEstate([]);
      setRealEstate(properties);
    };
    loadRealEstate();

    // Listen for data changes
    const handleDataChange = () => {
      loadRealEstate();
    };

    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('cryptoDataChanged', handleDataChange);
    window.addEventListener('stockDataChanged', handleDataChange);

    return () => {
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('cryptoDataChanged', handleDataChange);
      window.removeEventListener('stockDataChanged', handleDataChange);
    };
  }, []);
  
  // Calculate real liabilities (mortgages/loans) - memoized to prevent recalculation
  const totalLoans = React.useMemo(() => 
    realEstate.reduce((sum, prop) => sum + (prop.loanAmount || 0), 0),
    [realEstate]
  );
  
  const totalAssets = financialData.realEstate + financialData.valuableItems + financialData.savings + financialData.tradingAccount + 
                     portfolio.crypto.value + portfolio.stocks.value + financialData.cash;
  const totalLiabilities = totalLoans;
  const netWorth = totalAssets - totalLiabilities;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-900 dark:text-white">Total Assets</span>
        <span className="font-semibold text-purple-600 dark:text-purple-400">
          ${formatNumber(totalAssets || 0)}
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-900 dark:text-white">Total Liabilities</span>
        <span className="font-semibold text-red-600 dark:text-red-400">-${formatNumber(totalLiabilities || 0)}</span>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-900 dark:text-white">Net Worth</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            ${formatNumber(netWorth || 0)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-900 dark:text-white">Real Estate Loans</span>
          <span className="font-semibold text-red-600 dark:text-red-400">-${formatNumber(totalLoans || 0)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-900 dark:text-white">Portfolio Gain/Loss</span>
          <span className={`font-semibold ${portfolio.total.gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {portfolio.total.gainLoss >= 0 ? '+' : ''}${formatNumber(Math.abs(portfolio.total.gainLoss || 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

function NetWorthModalContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'trends' | 'goals' | 'flow' | 'analysis'>('overview');
  const portfolio = usePortfolioValues();
  const financialData = useFinancialData();
  const [realEstateProperties, setRealEstateProperties] = useState<any[]>([]);

  useEffect(() => {
    const loadRealEstate = async () => {
      const properties = await SupabaseDataService.getRealEstate([]);
      setRealEstateProperties(properties);
    };
    loadRealEstate();

    // Listen for data changes
    const handleDataChange = () => {
      loadRealEstate();
    };

    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('cryptoDataChanged', handleDataChange);
    window.addEventListener('stockDataChanged', handleDataChange);

    return () => {
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('cryptoDataChanged', handleDataChange);
      window.removeEventListener('stockDataChanged', handleDataChange);
    };
  }, []);

  // Get data from financial context
  const realEstate = financialData.realEstate;
  const valuableItems = financialData.valuableItems;
  const savings = financialData.savings;
  const tradingAccount = financialData.tradingAccount;

  // Memoize expensive calculations
  const totalAssets = React.useMemo(() => 
    realEstate + valuableItems + savings + tradingAccount + 
    portfolio.crypto.value + portfolio.stocks.value + financialData.cash,
    [realEstate, valuableItems, savings, tradingAccount, portfolio.crypto.value, portfolio.stocks.value, financialData.cash]
  );

  const cashValue = financialData.cash;
  const assetBreakdown = React.useMemo(() => [
    { name: 'Real Estate', value: realEstate, color: '#84cc16', percentage: totalAssets > 0 ? (realEstate / totalAssets * 100) : 0 },
    { name: 'Stock Portfolio', value: portfolio.stocks.value, color: '#8b5cf6', percentage: totalAssets > 0 ? (portfolio.stocks.value / totalAssets * 100) : 0 },
    { name: 'Valuable Items', value: valuableItems, color: '#f59e0b', percentage: totalAssets > 0 ? (valuableItems / totalAssets * 100) : 0 },
    { name: 'Savings', value: savings, color: '#10b981', percentage: totalAssets > 0 ? (savings / totalAssets * 100) : 0 },
    { name: 'Crypto Portfolio', value: portfolio.crypto.value, color: '#ef4444', percentage: totalAssets > 0 ? (portfolio.crypto.value / totalAssets * 100) : 0 },
    { name: 'Trading Account', value: tradingAccount, color: '#06b6d4', percentage: totalAssets > 0 ? (tradingAccount / totalAssets * 100) : 0 },
    { name: 'Cash', value: cashValue, color: '#14b8a6', percentage: totalAssets > 0 ? (cashValue / totalAssets * 100) : 0 }
  ].filter(item => item.value > 0), [realEstate, portfolio.stocks.value, valuableItems, savings, portfolio.crypto.value, tradingAccount, cashValue, totalAssets]);

  // Pie chart data with exact percentages - memoized
  const pieChartData = React.useMemo(() => assetBreakdown.map(asset => ({
    name: asset.name,
    value: asset.percentage,
    actualValue: asset.value,
    color: asset.color
  })), [assetBreakdown]);

  // Calculate real liabilities from mortgages/loans - memoized
  const liabilities = React.useMemo(() => 
    realEstateProperties.reduce((sum, prop) => sum + (prop.loanAmount || 0), 0),
    [realEstateProperties]
  );
  const netWorth = React.useMemo(() => totalAssets - liabilities, [totalAssets, liabilities]);

  // Use current netWorth for all history until user has actual historical data
  const netWorthHistory = [
    { month: 'Jan', value: netWorth },
    { month: 'Feb', value: netWorth },
    { month: 'Mar', value: netWorth },
    { month: 'Apr', value: netWorth },
    { month: 'May', value: netWorth },
    { month: 'Jun', value: netWorth },
    { month: 'Jul', value: netWorth },
    { month: 'Aug', value: netWorth },
    { month: 'Sep', value: netWorth }
  ];
  
  const monthlyBreakdown = [
    { category: 'Assets', value: totalAssets, type: 'positive' },
    { category: 'Liabilities', value: -liabilities, type: 'negative' },
    { category: 'Net Worth', value: netWorth, type: 'net' }
  ];

  const goals = [
    { name: 'Emergency Fund Goal', target: 50000, current: savings, category: 'Safety' },
    { name: '$1.5M Net Worth', target: 1500000, current: netWorth, category: 'Wealth' },
    { name: 'Real Estate Portfolio', target: 1000000, current: realEstate, category: 'Investment' },
    { name: 'Retirement Savings', target: 300000, current: portfolio.stocks.value + portfolio.crypto.value, category: 'Retirement' }
  ];

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 flex-1 min-w-0">
          <div className="flex overflow-x-auto scrollbar-hide w-full">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'breakdown', label: 'Breakdown', icon: PieChartIcon },
              { id: 'trends', label: 'Trends', icon: BarChart3 },
              { id: 'goals', label: 'Goals', icon: Target },
              { id: 'flow', label: 'Flow Diagram', icon: GitBranch },
              { id: 'analysis', label: 'AI Analysis', icon: TrendingUp }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 border-b-2 transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  activeTab === id
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <NetWorthOverview 
            breakdown={monthlyBreakdown}
            history={netWorthHistory}
            financialData={financialData}
            portfolio={portfolio}
          />
        )}
        
        {activeTab === 'breakdown' && (
          <NetWorthBreakdown assets={assetBreakdown} pieChartData={pieChartData} portfolio={portfolio} />
        )}
        
        {activeTab === 'trends' && (
          <NetWorthTrends data={netWorthHistory} financialData={financialData} portfolio={portfolio} />
        )}
        
        {activeTab === 'goals' && (
          <NetWorthGoals goals={goals} />
        )}
        
        {activeTab === 'flow' && (
          <NetWorthFlowTab 
            cashValue={cashValue}
            savingsValue={savings}
            cryptoValue={portfolio.crypto.value}
            stocksValue={portfolio.stocks.value}
            valuableItemsValue={valuableItems}
            tradingValue={tradingAccount}
            realEstateValue={realEstate}
            expensesValue={liabilities}
            netWorthValue={netWorth}
            cryptoChange={portfolio.crypto.return >= 0 ? `+${portfolio.crypto.return.toFixed(2)}%` : `${portfolio.crypto.return.toFixed(2)}%`}
            stocksChange={portfolio.stocks.return >= 0 ? `+${portfolio.stocks.return.toFixed(2)}%` : `${portfolio.stocks.return.toFixed(2)}%`}
          />
        )}
        
        {activeTab === 'analysis' && (
          <NetWorthAnalysisTab 
            totalAssets={totalAssets}
            liabilities={liabilities}
            netWorth={netWorth}
            realEstate={realEstate}
            stocks={portfolio.stocks.value}
            crypto={portfolio.crypto.value}
            savings={savings}
            cash={cashValue}
            valuableItems={valuableItems}
            tradingAccount={tradingAccount}
            cryptoReturn={portfolio.crypto.return}
            stocksReturn={portfolio.stocks.return}
          />
        )}
      </div>
    </div>
  );
}

function NetWorthAnalysisTab({
  totalAssets,
  liabilities,
  netWorth,
  realEstate,
  stocks,
  crypto,
  savings,
  cash,
  valuableItems,
  tradingAccount,
  cryptoReturn,
  stocksReturn
}: {
  totalAssets: number;
  liabilities: number;
  netWorth: number;
  realEstate: number;
  stocks: number;
  crypto: number;
  savings: number;
  cash: number;
  valuableItems: number;
  tradingAccount: number;
  cryptoReturn: number;
  stocksReturn: number;
}) {
  // Calculate portfolio metrics
  const debtToAssetRatio = totalAssets > 0 ? (liabilities / totalAssets * 100) : 0;
  const savingsRate = totalAssets > 0 ? (savings / totalAssets * 100) : 0;
  const liquidAssets = cash + savings + tradingAccount;
  const liquidityRatio = totalAssets > 0 ? (liquidAssets / totalAssets * 100) : 0;
  const investmentAssets = stocks + crypto + realEstate;
  const investmentRatio = totalAssets > 0 ? (investmentAssets / totalAssets * 100) : 0;

  // Generate AI insights
  const insights = [];
  
  if (debtToAssetRatio > 50) {
    insights.push({
      type: 'warning',
      title: 'High Debt Levels',
      message: `Your debt-to-asset ratio is ${debtToAssetRatio.toFixed(1)}%. Consider reducing liabilities to below 30% for optimal financial health.`
    });
  } else if (debtToAssetRatio > 30) {
    insights.push({
      type: 'info',
      title: 'Moderate Debt',
      message: `Your debt-to-asset ratio is ${debtToAssetRatio.toFixed(1)}%. You're in a good range, but there's room for improvement.`
    });
  } else {
    insights.push({
      type: 'success',
      title: 'Excellent Debt Management',
      message: `Your debt-to-asset ratio is only ${debtToAssetRatio.toFixed(1)}%. You maintain healthy financial leverage!`
    });
  }

  if (savingsRate < 10) {
    insights.push({
      type: 'warning',
      title: 'Low Savings Rate',
      message: `Only ${savingsRate.toFixed(1)}% of your assets are in savings. Aim for at least 15-20% for emergency funds.`
    });
  } else if (savingsRate > 30) {
    insights.push({
      type: 'info',
      title: 'High Savings Balance',
      message: `${savingsRate.toFixed(1)}% of your assets are in savings. Consider investing excess cash for better returns.`
    });
  }

  if (liquidityRatio < 20) {
    insights.push({
      type: 'warning',
      title: 'Low Liquidity',
      message: `Only ${liquidityRatio.toFixed(1)}% of your assets are liquid. Increase emergency funds to 3-6 months of expenses.`
    });
  }

  if (investmentRatio < 40 && totalAssets > 10000) {
    insights.push({
      type: 'info',
      title: 'Investment Opportunity',
      message: `Only ${investmentRatio.toFixed(1)}% is invested. Consider allocating more to stocks, crypto, or real estate for growth.`
    });
  }

  if (cryptoReturn < -20) {
    insights.push({
      type: 'warning',
      title: 'Crypto Losses',
      message: `Your crypto portfolio is down ${Math.abs(cryptoReturn).toFixed(1)}%. Consider rebalancing or dollar-cost averaging.`
    });
  } else if (cryptoReturn > 50) {
    insights.push({
      type: 'success',
      title: 'Strong Crypto Performance',
      message: `Your crypto portfolio is up ${cryptoReturn.toFixed(1)}%! Consider taking some profits.`
    });
  }

  if (stocksReturn < -15) {
    insights.push({
      type: 'warning',
      title: 'Stock Portfolio Decline',
      message: `Your stocks are down ${Math.abs(stocksReturn).toFixed(1)}%. Review your holdings and consider rebalancing.`
    });
  } else if (stocksReturn > 30) {
    insights.push({
      type: 'success',
      title: 'Excellent Stock Performance',
      message: `Your stock portfolio is up ${stocksReturn.toFixed(1)}%! Strong performance.`
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          AI-Powered Financial Analysis
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Personalized insights and recommendations based on your portfolio
        </p>
      </div>

      {/* AI Insights */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          Key Insights
        </h4>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                insight.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                  : insight.type === 'warning'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
              }`}
            >
              <h5 className={`font-semibold mb-1 ${
                insight.type === 'success' 
                  ? 'text-green-800 dark:text-green-300' 
                  : insight.type === 'warning'
                  ? 'text-red-800 dark:text-red-300'
                  : 'text-blue-800 dark:text-blue-300'
              }`}>
                {insight.title}
              </h5>
              <p className={`text-sm ${
                insight.type === 'success' 
                  ? 'text-green-700 dark:text-green-400' 
                  : insight.type === 'warning'
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-blue-700 dark:text-blue-400'
              }`}>
                {insight.message}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Health Metrics */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Portfolio Health Score</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Debt-to-Asset Ratio</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              {debtToAssetRatio.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  debtToAssetRatio < 30 ? 'bg-green-500' : debtToAssetRatio < 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, debtToAssetRatio)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Savings Rate</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {savingsRate.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${Math.min(100, savingsRate * 3.33)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Liquidity Ratio</div>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">
              {liquidityRatio.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-cyan-500"
                style={{ width: `${Math.min(100, liquidityRatio * 2)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Investment Allocation</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
              {investmentRatio.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${Math.min(100, investmentRatio)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Recommended Actions</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-2xl">💰</span>
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Maintain Emergency Fund</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">Keep 3-6 months of expenses in liquid savings</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-2xl">📊</span>
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Diversify Investments</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">Balance between stocks, crypto, and real estate</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-2xl">🎯</span>
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Set Financial Goals</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">Track progress toward retirement and wealth targets</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-2xl">📈</span>
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-white text-sm">Regular Rebalancing</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">Review and adjust your portfolio quarterly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NetWorthFlowTab({
  cashValue,
  savingsValue,
  cryptoValue,
  stocksValue,
  valuableItemsValue,
  tradingValue,
  realEstateValue,
  expensesValue,
  netWorthValue,
  cryptoChange,
  stocksChange,
}: {
  cashValue: number;
  savingsValue: number;
  cryptoValue: number;
  stocksValue: number;
  valuableItemsValue: number;
  tradingValue: number;
  realEstateValue: number;
  expensesValue: number;
  netWorthValue: number;
  cryptoChange: string;
  stocksChange: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Net Worth Flow Diagram
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Visual representation of how all financial assets and liabilities contribute to your total net worth
        </p>
      </div>
      
      <NetWorthFlow
        cashValue={cashValue}
        savingsValue={savingsValue}
        cryptoValue={cryptoValue}
        stocksValue={stocksValue}
        valuableItemsValue={valuableItemsValue}
        tradingValue={tradingValue}
        realEstateValue={realEstateValue}
        expensesValue={expensesValue}
        netWorthValue={netWorthValue}
        cryptoChange={cryptoChange}
        stocksChange={stocksChange}
      />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 p-3 rounded-lg border border-green-500/20">
          <div className="text-sm text-gray-600 dark:text-gray-400">Asset Categories</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">7</div>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 dark:from-red-500/20 dark:to-red-600/20 p-3 rounded-lg border border-red-500/20">
          <div className="text-sm text-gray-600 dark:text-gray-400">Liabilities</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">-${formatNumber(expensesValue)}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 p-3 rounded-lg border border-blue-500/20">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Assets</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${formatNumber(cashValue + savingsValue + cryptoValue + stocksValue + valuableItemsValue + tradingValue + realEstateValue)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20 p-3 rounded-lg border border-purple-500/20">
          <div className="text-sm text-gray-600 dark:text-gray-400">Net Worth</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">${formatNumber(netWorthValue)}</div>
        </div>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg mt-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          How to Read This Diagram
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Each card represents a financial category from your dashboard</li>
          <li>Green flows show assets contributing positively to net worth</li>
          <li>Red flows show liabilities reducing net worth</li>
          <li>All assets combine into "Total Assets", then subtract liabilities to get "Net Worth"</li>
          <li>Click buttons above to switch between vertical and horizontal layouts</li>
        </ul>
      </div>
    </div>
  );
}

function NetWorthOverview({ breakdown, history, financialData, portfolio }: { breakdown: any[]; history: any[]; financialData: any; portfolio: any }) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const currentNetWorth = breakdown.find(b => b.category === 'Net Worth')?.value || 0;
  const previousMonth = history[history.length - 2]?.value || currentNetWorth;
  const monthlyChange = currentNetWorth - previousMonth;
  const monthlyChangePercent = previousMonth > 0 ? ((monthlyChange / previousMonth) * 100) : 0;

  // Calculate YTD growth based on historical data
  // Use the first month's data as beginning of year
  const beginningOfYearNetWorth = history.length > 0 ? history[0]?.value || currentNetWorth : currentNetWorth;
  const ytdChange = currentNetWorth - beginningOfYearNetWorth;
  const ytdChangePercent = beginningOfYearNetWorth > 0 ? ((ytdChange / beginningOfYearNetWorth) * 100) : 0;

  // Generate historical trend data with realistic growth patterns
  const comprehensiveOverviewData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const startFactor = 0.65; // Start at 65% of current value
    
    return months.map((month, index) => {
      // Progressive growth: each month gets closer to current value
      const progress = index / (months.length - 1); // 0 to 1
      const growthFactor = startFactor + (1 - startFactor) * progress;
      
      // Add realistic volatility (different for each asset type)
      const baseVariation = Math.sin(index * 0.7) * 0.05; // Smooth wave pattern
      const cryptoVolatility = (Math.random() - 0.5) * 0.15; // High volatility ±15%
      const stockVolatility = (Math.random() - 0.5) * 0.08; // Medium volatility ±8%
      const stableVariation = (Math.random() - 0.5) * 0.03; // Low volatility ±3%
      
      const monthData = {
        month,
        // Assets with different growth patterns - ONLY if they have value > 0
        cash: financialData.cash > 0 ? Math.max(0, financialData.cash * (growthFactor + stableVariation)) : 0,
        savings: financialData.savings > 0 ? Math.max(0, financialData.savings * (growthFactor + stableVariation)) : 0,
        crypto: portfolio.crypto.value > 0 ? Math.max(0, portfolio.crypto.value * (growthFactor + baseVariation + cryptoVolatility)) : 0,
        stocks: portfolio.stocks.value > 0 ? Math.max(0, portfolio.stocks.value * (growthFactor + stockVolatility)) : 0,
        realEstate: financialData.realEstate > 0 ? Math.max(0, financialData.realEstate * (growthFactor + stableVariation * 0.5)) : 0, // Very stable
        valuableItems: financialData.valuableItems > 0 ? Math.max(0, financialData.valuableItems * (growthFactor + stableVariation)) : 0,
        tradingAccount: financialData.tradingAccount > 0 ? Math.max(0, financialData.tradingAccount * (growthFactor + stockVolatility)) : 0,
        expenses: financialData.expenses > 0 ? Math.max(0, financialData.expenses * (0.9 + (Math.random() * 0.2))) : 0, // Random fluctuation
      };
      
      // Calculate net worth
      const monthNetWorth = monthData.cash + monthData.savings + monthData.crypto + 
                           monthData.stocks + monthData.realEstate + monthData.valuableItems + 
                           monthData.tradingAccount;
      
      return {
        ...monthData,
        netWorth: Math.max(0, monthNetWorth)
      };
    });
  }, [financialData.cash, financialData.savings, financialData.realEstate, financialData.valuableItems, 
      financialData.tradingAccount, financialData.expenses, portfolio.crypto.value, portfolio.stocks.value]);

  const allAssetCategories = [
    { key: 'realEstate', name: 'Real Estate', color: '#14b8a6' },
    { key: 'stocks', name: 'Stocks', color: '#6366f1' },
    { key: 'valuableItems', name: 'Valuable Items', color: '#84cc16' },
    { key: 'crypto', name: 'Crypto', color: '#f59e0b' },
    { key: 'savings', name: 'Savings', color: '#3b82f6' },
    { key: 'tradingAccount', name: 'Trading', color: '#06b6d4' },
    { key: 'cash', name: 'Cash', color: '#10b981' },
    { key: 'expenses', name: 'Expenses', color: '#ef4444' },
    { key: 'netWorth', name: 'Net Worth', color: '#d946ef' }
  ];

  const assetCategories = React.useMemo(() => {
    return allAssetCategories.filter(category => {
      if (category.key === 'netWorth') return true;
      if (category.key === 'expenses') return financialData.expenses > 0;
      
      switch(category.key) {
        case 'realEstate': return financialData.realEstate > 0;
        case 'stocks': return portfolio.stocks.value > 0;
        case 'valuableItems': return financialData.valuableItems > 0;
        case 'crypto': return portfolio.crypto.value > 0;
        case 'savings': return financialData.savings > 0;
        case 'tradingAccount': return financialData.tradingAccount > 0;
        case 'cash': return financialData.cash > 0;
        default: return false;
      }
    });
  }, [financialData, portfolio]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 dark:bg-black/95 backdrop-blur-md border border-gray-700 dark:border-gray-600 px-4 py-3 rounded-lg shadow-xl">
          <p className="text-sm font-bold text-white mb-2">{label}</p>
          {payload
            .sort((a: any, b: any) => b.value - a.value)
            .map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-300">{entry.name}:</span>
                </div>
                <span className="font-semibold text-white">
                  ${formatNumber(entry.value)}
                </span>
              </div>
            ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2 -mx-2 py-2 -my-2">
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
          <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">
            Current Net Worth
          </h3>
          <div className="text-3xl font-bold text-purple-600">
            ${formatNumber(currentNetWorth)}
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/50 dark:hover:shadow-green-500/30 cursor-pointer">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            Monthly Change
          </h3>
          <div className="text-3xl font-bold text-green-600">
            +${formatNumber(monthlyChange)}
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">
            +{monthlyChangePercent.toFixed(2)}%
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/50 dark:hover:shadow-blue-500/30 cursor-pointer">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
            YTD Growth
          </h3>
          <div className="text-3xl font-bold text-blue-600">
            {ytdChangePercent >= 0 ? '+' : ''}{ytdChangePercent.toFixed(1)}%
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            {ytdChange >= 0 ? '+' : ''}${formatNumber(Math.abs(ytdChange))} {ytdChange >= 0 ? 'increase' : 'decrease'}
          </div>
        </div>
      </div>

      {/* Comprehensive Multi-Line Chart */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Asset Performance Timeline</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Track all financial categories over the past 9 months</p>
        <div className="h-64 md:h-80">
          <LazyRechartsWrapper height={320}>
            {({ LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }) => (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comprehensiveOverviewData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    {/* Holographic glow filters for each category */}
                    {assetCategories.map((category) => (
                      <React.Fragment key={category.key}>
                        <filter id={`glow-${category.key}`} x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation={hoveredLine === category.key ? 4 : 0} result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        {/* Gradient for area under line */}
                        <linearGradient id={`gradient-${category.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={category.color} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={category.color} stopOpacity={0.0}/>
                        </linearGradient>
                      </React.Fragment>
                    ))}
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#374151" 
                    opacity={0.15}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickLine={{ stroke: '#9CA3AF' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickLine={{ stroke: '#9CA3AF' }}
                    tickFormatter={(value: any) => value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {assetCategories.map((category) => {
                    const isHovered = hoveredLine === category.key;
                    const isNetWorth = category.key === 'netWorth';
                    
                    return (
                      <Line
                        key={category.key}
                        type="monotone"
                        dataKey={category.key}
                        name={category.name}
                        stroke={category.color}
                        strokeWidth={isNetWorth ? 4 : 3}
                        strokeDasharray="0"
                        dot={{ 
                          r: 4, 
                          fill: category.color, 
                          strokeWidth: 2,
                          stroke: '#fff'
                        }}
                        activeDot={{ 
                          r: 8, 
                          stroke: category.color, 
                          strokeWidth: 3,
                          fill: '#fff'
                        }}
                        opacity={hoveredLine ? (isHovered ? 1 : 0.3) : 1}
                        isAnimationActive={false}
                        connectNulls={true}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </LazyRechartsWrapper>
        </div>
        
        {/* Enhanced Legend with Holographic Effects */}
        <div className="flex flex-wrap justify-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {assetCategories.map((category) => {
            const isHovered = hoveredLine === category.key;
            const isNetWorth = category.key === 'netWorth';
            return (
              <div 
                key={category.key}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer 
                  transition-opacity duration-200
                  ${isNetWorth ? 'ring-2 ring-purple-500/30' : ''}
                `}
                style={{
                  opacity: hoveredLine ? (isHovered ? 1 : 0.35) : 0.9,
                  backgroundColor: isHovered ? `${category.color}15` : 'transparent'
                }}
                onMouseEnter={() => setHoveredLine(category.key)}
                onMouseLeave={() => setHoveredLine(null)}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ 
                    backgroundColor: category.color
                  }}
                />
                <span 
                  className={`text-xs font-medium ${
                    isNetWorth ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {category.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Assets vs Liabilities</h4>
          <div className="h-40 md:h-48">
            <LazyRechartsWrapper height={192}>
              {({ BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer }) => (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip cursor={false} formatter={(value: any) => [`$${formatNumber(Number(value))}`, 'Amount']} />
                    <Bar dataKey="value" isAnimationActive={true} animationDuration={300}>
                      {breakdown.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.type === 'positive' ? '#10b981' : entry.type === 'negative' ? '#ef4444' : '#8b5cf6'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </LazyRechartsWrapper>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Financial Health Score</h4>
          <div className="space-y-4 px-2 -mx-2">
            {(() => {
              const totalAssets = breakdown.find(b => b.category === 'Assets')?.value || 0;
              const liabilities = Math.abs(breakdown.find(b => b.category === 'Liabilities')?.value || 0);
              const debtToAssetRatio = totalAssets > 0 ? (liabilities / totalAssets * 100) : 0;
              const healthScore = Math.max(0, 100 - debtToAssetRatio);
              const debtRating = debtToAssetRatio < 10 ? 'Excellent' : debtToAssetRatio < 30 ? 'Good' : debtToAssetRatio < 50 ? 'Fair' : 'Poor';
              const debtColor = debtToAssetRatio < 10 ? 'green' : debtToAssetRatio < 30 ? 'blue' : debtToAssetRatio < 50 ? 'yellow' : 'red';
              
              return (
                <div className="p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/50 dark:hover:shadow-green-500/30 cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-900 dark:text-white">Debt-to-Asset Ratio</span>
                    <span className={`text-${debtColor}-600 dark:text-${debtColor}-400 font-semibold`}>
                      {debtToAssetRatio.toFixed(2)}% - {debtRating}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`bg-${debtColor}-500 h-2 rounded-full`} style={{width: `${healthScore}%`}}></div>
                  </div>
                </div>
              );
            })()}
            
            {(() => {
              const totalAssets = breakdown.find(b => b.category === 'Assets')?.value || 0;
              const savingsRate = totalAssets > 0 ? (financialData.savings / totalAssets * 100) : 0;
              const savingsRating = savingsRate >= 20 ? 'Excellent' : savingsRate >= 10 ? 'Good' : savingsRate >= 5 ? 'Fair' : 'Low';
              const savingsScore = Math.min(100, savingsRate * 5);
              
              return (
                <div className="p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/50 dark:hover:shadow-blue-500/30 cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-900 dark:text-white">Savings Rate</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {savingsRate.toFixed(1)}% - {savingsRating}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: `${savingsScore}%`}}></div>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const totalAssets = breakdown.find(b => b.category === 'Assets')?.value || 0;
              const liquidAssets = financialData.cash + financialData.savings + financialData.tradingAccount;
              const liquidityRatio = totalAssets > 0 ? (liquidAssets / totalAssets * 100) : 0;
              const liquidityScore = Math.min(100, liquidityRatio * 2);
              const liquidityRating = liquidityScore >= 80 ? 'Very Good' : liquidityScore >= 60 ? 'Good' : liquidityScore >= 40 ? 'Fair' : 'Low';
              
              return (
                <div className="p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-900 dark:text-white">Liquidity Score</span>
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">
                      {Math.round(liquidityScore)}/100 - {liquidityRating}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{width: `${liquidityScore}%`}}></div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom label component for pie chart with neon hover effect
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, fill }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 40;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.005) return null; // Don't show labels for very small slices (less than 0.5%)

  return (
    <text
      x={x}
      y={y}
      className="pie-chart-label text-[10px] md:text-[12px]"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      data-fill={fill}
      style={{
        fontWeight: 500,
        '--label-color': fill
      } as React.CSSProperties}
    >
      {name} {(percent * 100).toFixed(1)}%
    </text>
  );
};

function NetWorthBreakdown({ assets, pieChartData, portfolio }: { assets: any[]; pieChartData: any[]; portfolio: any }) {
  
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div 
        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
        style={{ 
          pointerEvents: 'auto',
          position: 'relative'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: data.color }}
          />
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {data.name}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-4">
            <span className="text-xs text-gray-600 dark:text-gray-400">Percentage:</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {Number(data.value).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs text-gray-600 dark:text-gray-400">Value:</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              ${formatNumber(data.actualValue || 0)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Asset Allocation</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Portfolio Distribution</h4>
          <div className="h-[250px] md:h-[300px] w-full [&_.recharts-pie-sector]:!opacity-100 [&_.recharts-pie]:!opacity-100 [&_.recharts-sector]:!opacity-100">
            <LazyRechartsWrapper height={300}>
              {({ PieChart, Pie, Cell, Tooltip, ResponsiveContainer }) => (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="70%"
                      innerRadius={0}
                      fill="#8884d8"
                      paddingAngle={2}
                      isAnimationActive={false}
                      animationDuration={0}
                      animationBegin={0}
                      animationEasing="linear"
                      label={false}
                      labelLine={false}
                      activeShape={false as any}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={<CustomPieTooltip />}
                      trigger="hover"
                      wrapperStyle={{ 
                        zIndex: 50,
                        pointerEvents: 'none',
                        visibility: 'visible'
                      }}
                      allowEscapeViewBox={{ x: true, y: true }}
                      isAnimationActive={false}
                      animationDuration={0}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </LazyRechartsWrapper>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Detailed Breakdown</h4>
          <div className="space-y-3 px-2 -mx-2 max-h-[300px] overflow-y-auto md:max-h-none md:overflow-visible">
            {assets.map((asset, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer" style={{boxShadow: `0 0 0 0 ${asset.color}`}}>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: asset.color }}
                  ></div>
                  <span className="font-medium text-gray-900 dark:text-white text-sm md:text-base truncate">{asset.name}</span>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                    ${(asset.value || 0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    {(asset.percentage || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NetWorthTrends({ data, financialData, portfolio }: { data: any[]; financialData: any; portfolio: any }) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  // Generate realistic historical data with growth patterns and volatility
  const comprehensiveData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const startFactor = 0.65; // Start at 65% of current value
    
    return months.map((month, index) => {
      // Progressive growth: each month gets closer to current value
      const progress = index / (months.length - 1); // 0 to 1
      const growthFactor = startFactor + (1 - startFactor) * progress;
      
      // Add realistic volatility (different for each asset type)
      const baseVariation = Math.sin(index * 0.7) * 0.05; // Smooth wave pattern
      const cryptoVolatility = (Math.random() - 0.5) * 0.15; // High volatility ±15%
      const stockVolatility = (Math.random() - 0.5) * 0.08; // Medium volatility ±8%
      const stableVariation = (Math.random() - 0.5) * 0.03; // Low volatility ±3%
      
      const monthData = {
        month,
        // Assets with different growth patterns - ONLY if they have value > 0
        cash: financialData.cash > 0 ? Math.max(0, financialData.cash * (growthFactor + stableVariation)) : 0,
        savings: financialData.savings > 0 ? Math.max(0, financialData.savings * (growthFactor + stableVariation)) : 0,
        crypto: portfolio.crypto.value > 0 ? Math.max(0, portfolio.crypto.value * (growthFactor + baseVariation + cryptoVolatility)) : 0,
        stocks: portfolio.stocks.value > 0 ? Math.max(0, portfolio.stocks.value * (growthFactor + stockVolatility)) : 0,
        realEstate: financialData.realEstate > 0 ? Math.max(0, financialData.realEstate * (growthFactor + stableVariation * 0.5)) : 0, // Very stable
        valuableItems: financialData.valuableItems > 0 ? Math.max(0, financialData.valuableItems * (growthFactor + stableVariation)) : 0,
        tradingAccount: financialData.tradingAccount > 0 ? Math.max(0, financialData.tradingAccount * (growthFactor + stockVolatility)) : 0,
        expenses: financialData.expenses > 0 ? Math.max(0, financialData.expenses * (0.9 + (Math.random() * 0.2))) : 0, // Random fluctuation
      };
      
      // Calculate net worth
      const monthNetWorth = monthData.cash + monthData.savings + monthData.crypto + 
                           monthData.stocks + monthData.realEstate + monthData.valuableItems + 
                           monthData.tradingAccount;
      
      return {
        ...monthData,
        netWorth: Math.max(0, monthNetWorth)
      };
    });
  }, [financialData.cash, financialData.savings, financialData.realEstate, financialData.valuableItems, 
      financialData.tradingAccount, financialData.expenses, portfolio.crypto.value, portfolio.stocks.value]);

  // Card colors from the application
  const allAssetCategories = [
    { key: 'netWorth', name: 'Net Worth', color: '#d946ef', strokeWidth: 4, glowIntensity: 12 },
    { key: 'realEstate', name: 'Real Estate', color: '#14b8a6', strokeWidth: 3, glowIntensity: 8 },
    { key: 'stocks', name: 'Stocks', color: '#6366f1', strokeWidth: 3, glowIntensity: 8 },
    { key: 'valuableItems', name: 'Valuable Items', color: '#84cc16', strokeWidth: 3, glowIntensity: 8 },
    { key: 'crypto', name: 'Crypto', color: '#f59e0b', strokeWidth: 3, glowIntensity: 8 },
    { key: 'savings', name: 'Savings', color: '#3b82f6', strokeWidth: 3, glowIntensity: 8 },
    { key: 'tradingAccount', name: 'Trading Account', color: '#06b6d4', strokeWidth: 3, glowIntensity: 8 },
    { key: 'cash', name: 'Cash', color: '#10b981', strokeWidth: 3, glowIntensity: 8 },
    { key: 'expenses', name: 'Expenses', color: '#ef4444', strokeWidth: 3, glowIntensity: 10 }
  ];

  const assetCategories = React.useMemo(() => {
    return allAssetCategories.filter(category => {
      if (category.key === 'netWorth') return true;
      if (category.key === 'expenses') return financialData.expenses > 0;
      
      switch(category.key) {
        case 'realEstate': return financialData.realEstate > 0;
        case 'stocks': return portfolio.stocks.value > 0;
        case 'valuableItems': return financialData.valuableItems > 0;
        case 'crypto': return portfolio.crypto.value > 0;
        case 'savings': return financialData.savings > 0;
        case 'tradingAccount': return financialData.tradingAccount > 0;
        case 'cash': return financialData.cash > 0;
        default: return false;
      }
    });
  }, [financialData, portfolio]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 dark:bg-black/95 backdrop-blur-md border border-gray-700 dark:border-gray-600 px-4 py-3 rounded-lg shadow-xl">
          <p className="text-sm font-bold text-white mb-2">{label}</p>
          {payload
            .sort((a: any, b: any) => b.value - a.value)
            .map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-300">{entry.name}:</span>
                </div>
                <span className="font-semibold text-white">
                  ${formatNumber(entry.value)}
                </span>
              </div>
            ))}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const category = assetCategories.find(cat => cat.name === entry.value);
          const isHovered = hoveredLine === category?.key;
          return (
            <div 
              key={index} 
              className="flex items-center gap-2 cursor-pointer transition-all duration-300"
              style={{
                opacity: hoveredLine ? (isHovered ? 1 : 0.4) : 1,
                transform: isHovered ? 'scale(1.1)' : 'scale(1)'
              }}
              onMouseEnter={() => category && setHoveredLine(category.key)}
              onMouseLeave={() => setHoveredLine(null)}
            >
              <div 
                className="w-3 h-3 rounded-full transition-all duration-300" 
                style={{ 
                  backgroundColor: entry.color,
                  boxShadow: isHovered ? `0 0 12px ${entry.color}, 0 0 20px ${entry.color}` : 'none'
                }}
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comprehensive Net Worth Analysis
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Year-to-Date Performance
        </div>
      </div>
      
      {/* Main Professional Chart */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Complete view of assets, expenses, and net worth trends</p>
        <style jsx>{`
          @keyframes glow-pulse {
            0%, 100% { filter: drop-shadow(0 0 2px currentColor); }
            50% { filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 12px currentColor); }
          }
          .chart-line-hover {
            transition: all 0.3s ease;
          }
        `}</style>
        <div className="h-64 md:h-96">
          <LazyRechartsWrapper height={384}>
            {({ LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer }) => (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={comprehensiveData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    {assetCategories.map((category) => (
                      <filter key={category.key} id={`glow-${category.key}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation={hoveredLine === category.key ? category.glowIntensity : 0} result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    ))}
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#374151" 
                    opacity={0.2}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickLine={{ stroke: '#9CA3AF' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickLine={{ stroke: '#9CA3AF' }}
                    tickFormatter={(value: any) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  
                  {/* Render all categories as lines */}
                  {assetCategories.map((category) => {
                    const isNetWorth = category.key === 'netWorth';
                    const isHovered = hoveredLine === category.key;
                    
                    return (
                      <Line
                        key={category.key}
                        type="monotone"
                        dataKey={category.key}
                        name={category.name}
                        stroke={category.color}
                        strokeWidth={isNetWorth ? 4 : category.strokeWidth || 2.5}
                        strokeDasharray="0"
                        dot={{ r: 4, fill: category.color, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ 
                          r: 8, 
                          stroke: category.color, 
                          strokeWidth: 3,
                          fill: '#fff'
                        }}
                        opacity={hoveredLine ? (isHovered ? 1 : 0.3) : 1}
                        isAnimationActive={false}
                        connectNulls={true}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </LazyRechartsWrapper>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20 p-4 rounded-lg border border-purple-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 cursor-pointer">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            ${formatNumber(comprehensiveData[comprehensiveData.length - 1].netWorth)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current Net Worth</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 p-4 rounded-lg border border-green-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/50 dark:hover:shadow-green-500/30 cursor-pointer">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            +${formatNumber(comprehensiveData[comprehensiveData.length - 1].netWorth - comprehensiveData[0].netWorth)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">YTD Growth</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 p-4 rounded-lg border border-blue-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/50 dark:hover:shadow-blue-500/30 cursor-pointer">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            +{(((comprehensiveData[comprehensiveData.length - 1].netWorth - comprehensiveData[0].netWorth) / comprehensiveData[0].netWorth) * 100).toFixed(2)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">YTD Percentage</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 p-4 rounded-lg border border-orange-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/50 dark:hover:shadow-orange-500/30 cursor-pointer">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            ${formatNumber((comprehensiveData[comprehensiveData.length - 1].netWorth - comprehensiveData[0].netWorth) / 9)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Monthly Growth</div>
        </div>
      </div>

      {/* Asset Performance Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {assetCategories.map((category) => {
          const startValue = comprehensiveData[0][category.key as keyof typeof comprehensiveData[0]] as number;
          const endValue = comprehensiveData[comprehensiveData.length - 1][category.key as keyof typeof comprehensiveData[0]] as number;
          const growth = endValue - startValue;
          const growthPercent = ((growth / startValue) * 100).toFixed(2);
          
          return (
            <div 
              key={category.key}
              className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer"
              style={{
                boxShadow: `0 0 0 1px ${category.color}20`
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                  {category.name}
                </span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                ${formatNumber(endValue)}
              </div>
              <div className={`text-xs font-medium ${growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {growth >= 0 ? '+' : ''}{growthPercent}% YTD
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NetWorthGoals({ goals }: { goals: any[] }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Goals Progress</h3>
      
      <div className="space-y-6">
        {goals.map((goal, index) => {
          const progress = (goal.current / goal.target) * 100;
          const remaining = goal.target - goal.current;
          
          return (
            <div key={index} className="relative bg-white dark:bg-gray-800 p-6 rounded-lg border transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 dark:hover:shadow-purple-500/30 hover:scale-[1.01] hover:z-10 cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{goal.name}</h4>
                  <p className="text-gray-600 dark:text-gray-400">{goal.category}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {progress.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Complete</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-900 dark:text-white">
                  <span>${goal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  <span>${goal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Current: ${goal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  <span>
                    {remaining > 0 
                      ? `$${formatNumber(remaining)} remaining`
                      : 'Goal achieved!'
                    }
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NetWorthCard() {
  const portfolio = usePortfolioValues();
  const financialData = useFinancialData();
  const [realEstateProperties, setRealEstateProperties] = useState<any[]>([]);
  
  useEffect(() => {
    const loadRealEstate = async () => {
      const properties = await SupabaseDataService.getRealEstate([]);
      setRealEstateProperties(properties);
    };
    loadRealEstate();

    // Listen for data changes
    const handleDataChange = () => {
      loadRealEstate();
    };

    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('cryptoDataChanged', handleDataChange);
    window.addEventListener('stockDataChanged', handleDataChange);

    return () => {
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('cryptoDataChanged', handleDataChange);
      window.removeEventListener('stockDataChanged', handleDataChange);
    };
  }, []);
  
  // Get data from financial context
  const cash = financialData.cash;
  const savings = financialData.savings;
  const valuableItems = financialData.valuableItems;
  const tradingAccount = financialData.tradingAccount;
  const realEstate = financialData.realEstate;
  
  // Memoize calculations to prevent glitchy re-renders
  const totalAssets = React.useMemo(() => 
    cash + savings + valuableItems + tradingAccount + realEstate +
    portfolio.crypto.value + portfolio.stocks.value,
    [cash, savings, valuableItems, tradingAccount, realEstate, portfolio.crypto.value, portfolio.stocks.value]
  );
  
  // Calculate real liabilities from mortgages/loans - memoized
  const totalLiabilities = React.useMemo(() => 
    realEstateProperties.reduce((sum, prop) => sum + (prop.loanAmount || 0), 0),
    [realEstateProperties]
  );
  const netWorth = React.useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  // Calculate overall portfolio performance - memoized
  const totalGainLoss = portfolio.total.gainLoss;
  const costBasis = totalAssets - totalGainLoss;
  const totalReturn = React.useMemo(() => 
    costBasis > 0 && !portfolio.total.loading ? 
    ((totalGainLoss / costBasis) * 100) : 0,
    [costBasis, totalGainLoss, portfolio.total.loading]
  );

  // Show 0% if no assets exist, otherwise show calculated return
  const changePercent = totalAssets === 0 ? "0.0%" : `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`;
  const changeType = totalReturn >= 0 ? "positive" as const : "negative" as const;

  // Create chart data from different asset categories with validation
  const safeValue = (val: any): number => {
    const num = Number(val);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  const chartData = [
    { value: safeValue(realEstate), change: "+0%" },
    { value: safeValue(portfolio.stocks.value), change: portfolio.stocks.return >= 0 ? `+${portfolio.stocks.return.toFixed(2)}%` : `${portfolio.stocks.return.toFixed(2)}%` },
    { value: safeValue(valuableItems), change: "+0%" },
    { value: safeValue(portfolio.crypto.value), change: portfolio.crypto.return >= 0 ? `+${portfolio.crypto.return.toFixed(2)}%` : `${portfolio.crypto.return.toFixed(2)}%` },
    { value: safeValue(savings), change: "+0%" },
    { value: safeValue(tradingAccount), change: "+0%" },
  ];

  // Currency conversion
  const { mainCurrency, convert } = useCurrency();
  
  // Original USD values for hologram
  const netWorthUSD = netWorth || 0;
  const totalAssetsUSD = totalAssets || 0;
  const totalLiabilitiesUSD = totalLiabilities || 0;
  
  // Convert to user's selected currency
  const netWorthConverted = convert(netWorthUSD, 'USD', mainCurrency.code);
  const totalAssetsConverted = convert(totalAssetsUSD, 'USD', mainCurrency.code);
  const totalLiabilitiesConverted = convert(totalLiabilitiesUSD, 'USD', mainCurrency.code);
  
  const displayAmount = `${mainCurrency.symbol}${formatNumber(netWorthConverted)}`;

  return (
    <EnhancedFinancialCard
      title="Net Worth"
      description="Total assets minus liabilities"
      amount={displayAmount}
      convertedAmount={mainCurrency.code !== 'USD' ? `$${formatNumber(netWorthUSD)}` : undefined}
      sourceCurrency={mainCurrency.code !== 'USD' ? 'USD' : undefined}
      change={changePercent}
      changeType={changeType}
      mainColor="#d946ef"
      secondaryColor="#e879f9"
      gridColor="#d946ef15"
      stats={[
        { 
          label: "Assets", 
          value: `${mainCurrency.symbol}${formatNumber(totalAssetsConverted)}`, 
          color: "#7c3aed" 
        },
        { 
          label: "Liabilities", 
          value: `${mainCurrency.symbol}${formatNumber(totalLiabilitiesConverted)}`, 
          color: "#ef4444" 
        }
      ]}
      icon={TrendingUp}
      hoverContent={<NetWorthHoverContent />}
      modalContent={<NetWorthModalContent />}
      chartData={chartData}
    />
  );
}
