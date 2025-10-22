"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Info, Lightbulb, BarChart3, Globe } from 'lucide-react';
import { MarketAnalysisService } from '../../lib/market-analysis-service';

interface MarketAnalysisProps {
  category: 'cash' | 'stocks' | 'crypto' | 'realEstate' | 'debt' | 'valuableItems' | 'trading' | 'portfolio';
  className?: string;
}

interface AnalysisData {
  riskLevel?: string;
  opportunityScore?: number;
  recommendation?: string;
  marketInsight?: string;
  [key: string]: any;
}

export function MarketAnalysisWidget({ category, className = "" }: MarketAnalysisProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load analysis data based on category
  useEffect(() => {
    const loadAnalysis = () => {
      setIsLoading(true);
      try {
        let data: AnalysisData = {};
        
        switch (category) {
          case 'cash':
            data = MarketAnalysisService.getCashAnalysis();
            break;
          case 'stocks':
            data = MarketAnalysisService.getStockAnalysis();
            break;
          case 'crypto':
            data = MarketAnalysisService.getCryptoAnalysis();
            break;
          case 'realEstate':
            data = MarketAnalysisService.getRealEstateAnalysis();
            break;
          case 'debt':
            data = MarketAnalysisService.getDebtAnalysis();
            break;
          case 'valuableItems':
            data = MarketAnalysisService.getValuableItemsAnalysis();
            break;
          case 'trading':
            data = MarketAnalysisService.getTradingAnalysis();
            break;
          case 'portfolio':
            data = MarketAnalysisService.getPortfolioAnalysis();
            break;
          default:
            data = { recommendation: 'No analysis available for this category' };
        }
        
        setAnalysisData(data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error loading market analysis:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalysis();
    
    // Update every 5 minutes in real app (simulate real-time data)
    const interval = setInterval(() => {
      MarketAnalysisService.updateMarketData();
      loadAnalysis();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [category]);

  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
      case 'very low':
        return 'text-green-600';
      case 'moderate':
      case 'moderate-low':
        return 'text-yellow-600';
      case 'moderate-high':
        return 'text-orange-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getOpportunityColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <h4 className="font-semibold text-xs text-gray-900 dark:text-white">Market Analysis</h4>
        </div>
        <div className="text-[10px] text-gray-500">
          {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Risk & Opportunity Scores */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {analysisData.riskLevel && (
          <div className="bg-white dark:bg-gray-800 rounded-md p-1.5">
            <div className="text-[10px] text-gray-600 dark:text-gray-400">Risk Level</div>
            <div className={`font-semibold text-xs ${getRiskColor(analysisData.riskLevel)}`}>
              {analysisData.riskLevel}
            </div>
          </div>
        )}
        
        {analysisData.opportunityScore && (
          <div className="bg-white dark:bg-gray-800 rounded-md p-1.5">
            <div className="text-[10px] text-gray-600 dark:text-gray-400">Opportunity</div>
            <div className={`font-semibold text-xs ${getOpportunityColor(analysisData.opportunityScore)}`}>
              {analysisData.opportunityScore}/10
            </div>
          </div>
        )}
      </div>

      {/* Category-Specific Data */}
      {category === 'cash' && analysisData.bestOptions && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-gray-900 dark:text-white">Best Options:</div>
          {analysisData.bestOptions.slice(0, 2).map((option: any, idx: number) => (
            <div key={idx} className="flex justify-between text-[10px] bg-white dark:bg-gray-800 rounded px-2 py-1">
              <span className="text-gray-900 dark:text-white">{option.type}</span>
              <span className="font-medium text-green-600 dark:text-green-400">{option.rate}%</span>
            </div>
          ))}
        </div>
      )}

      {category === 'stocks' && analysisData.marketOverview && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-gray-900 dark:text-white">Market:</div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="bg-white dark:bg-gray-800 rounded px-2 py-1">
              <div>S&P 500</div>
              <div className="font-medium">{analysisData.marketOverview.sp500.change}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded px-2 py-1">
              <div>Volatility</div>
              <div className="font-medium">{analysisData.marketOverview.volatility}</div>
            </div>
          </div>
        </div>
      )}

      {category === 'crypto' && analysisData.topPerformers && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-gray-900 dark:text-white">Top Performers:</div>
          {analysisData.topPerformers.slice(0, 2).map((crypto: any, idx: number) => (
            <div key={idx} className="flex justify-between text-[10px] bg-white dark:bg-gray-800 rounded px-2 py-1">
              <span>{crypto.symbol}</span>
              <span className={`font-medium ${crypto.change && crypto.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {crypto.change || '0%'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 pt-1.5 border-t border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>Market Data</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Market Alerts Component
export function MarketAlertsWidget({ className = "" }: { className?: string }) {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const loadAlerts = () => {
      const marketAlerts = MarketAnalysisService.getMarketAlerts();
      setAlerts(marketAlerts.slice(0, 3)); // Show top 3 alerts
    };

    loadAlerts();
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Market Alerts</h3>
      </div>
      
      {alerts.map((alert, idx) => (
        <div key={idx} className={`rounded-lg p-3 border ${getAlertBg(alert.type)}`}>
          <div className="flex items-start gap-3">
            {getAlertIcon(alert.type)}
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {alert.title}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {alert.message}
              </div>
            </div>
            {alert.urgency === 'high' && (
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
