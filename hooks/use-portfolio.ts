"use client";

import { useState, useEffect } from 'react';
import { useAssetPrices } from './use-price';
import { SupabaseDataService } from '../lib/supabase/supabase-data-service';

export function usePortfolioValues() {
  const [cryptoHoldings, setCryptoHoldings] = useState<any[]>([]);
  const [stockHoldings, setStockHoldings] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false); // Changed from true to false - show data immediately
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load actual holdings from database
  useEffect(() => {
    const loadHoldings = async () => {
      // Don't set loading to true - prevents flashing
      try {
        const [crypto, stocks] = await Promise.all([
          SupabaseDataService.getCryptoHoldings([]),
          SupabaseDataService.getStockHoldings([])
        ]);
        setCryptoHoldings(crypto);
        setStockHoldings(stocks);
      } catch (error) {
        console.error('Error loading portfolio holdings:', error);
      }
    };
    loadHoldings();
  }, [refreshTrigger]);

  // Listen for data changes from individual cards
  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout | null = null;
    
    const handleDataChange = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 500);
    };

    window.addEventListener('cryptoDataChanged', handleDataChange);
    window.addEventListener('stockDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      window.removeEventListener('cryptoDataChanged', handleDataChange);
      window.removeEventListener('stockDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  const cryptoSymbols = cryptoHoldings.map(h => h.symbol);
  const stockSymbols = stockHoldings.map(h => h.symbol);
  
  const { prices: cryptoPrices, loading: cryptoLoading } = useAssetPrices(cryptoSymbols);
  const { prices: stockPrices, loading: stockLoading } = useAssetPrices(stockSymbols);

  // Calculate crypto portfolio value from actual database holdings
  const cryptoValue = cryptoHoldings.reduce((sum, holding) => {
    const currentPriceData = cryptoPrices[holding.symbol];
    if (currentPriceData) {
      return sum + (holding.amount * currentPriceData.price);
    }
    return sum + (holding.amount * (holding.entryPoint || holding.buyPrice || 0)); // fallback to entry price
  }, 0);

  // Calculate stock portfolio value from actual database holdings
  const stockValue = stockHoldings.reduce((sum, holding) => {
    const currentPriceData = stockPrices[holding.symbol];
    if (currentPriceData) {
      return sum + (holding.shares * currentPriceData.price);
    }
    return sum + (holding.shares * (holding.entryPoint || holding.buyPrice || 0)); // fallback to entry price
  }, 0);

  // Calculate gains/losses
  const cryptoCostBasis = cryptoHoldings.reduce((sum, holding) => 
    sum + (holding.amount * (holding.entryPoint || holding.buyPrice || 0)), 0);
  const stockCostBasis = stockHoldings.reduce((sum, holding) => 
    sum + (holding.shares * (holding.entryPoint || holding.buyPrice || 0)), 0);

  const cryptoGainLoss = cryptoValue - cryptoCostBasis;
  const stockGainLoss = stockValue - stockCostBasis;

  const cryptoReturn = cryptoCostBasis > 0 ? (cryptoGainLoss / cryptoCostBasis) * 100 : 0;
  const stockReturn = stockCostBasis > 0 ? (stockGainLoss / stockCostBasis) * 100 : 0;

  const isLoading = dataLoading || cryptoLoading || stockLoading;

  return {
    crypto: {
      value: cryptoValue,
      gainLoss: cryptoGainLoss,
      return: cryptoReturn,
      loading: isLoading
    },
    stocks: {
      value: stockValue,
      gainLoss: stockGainLoss,
      return: stockReturn,
      loading: isLoading
    },
    total: {
      value: cryptoValue + stockValue,
      gainLoss: cryptoGainLoss + stockGainLoss,
      loading: isLoading
    }
  };
}
