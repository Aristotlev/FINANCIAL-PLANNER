"use client";

import { ArrowDown, ArrowUp, Wallet } from "lucide-react";
import { cn } from "../../lib/utils";
import { useFinancialData } from '../../contexts/financial-data-context';
import { usePortfolioValues } from '../../hooks/use-portfolio';
import { useCurrency } from '../../contexts/currency-context';

interface TotalWorthCardProps {
  // Props can still be passed for overrides or testing
  totalWorth?: number;
  change24h?: number;
  change24hPercent?: number;
  selectedCategory?: string;
}

export function TotalWorthCard({ 
  totalWorth: initialTotalWorth, 
  change24h: initialChange24h, 
  change24hPercent: initialChangePercent,
  selectedCategory
}: TotalWorthCardProps = {}) {
  const { formatCurrency: format, convert, mainCurrency } = useCurrency();
  const { 
    cash, 
    savings, 
    valuableItems, 
    realEstate, 
    tradingAccount 
  } = useFinancialData();
  
  const { total: portfolioTotal, crypto, stocks } = usePortfolioValues();

  // If props are provided, use them (fallback to real data)
  // This allows the component to be used in "dumb" mode if needed, 
  // but defaults to smart mode connecting to context.
  
  let financialTotal = 0;
  let calculatedTotalWorth = 0;
  let calculatedChange24h = 0;

  if (selectedCategory === "Crypto") {
      calculatedTotalWorth = crypto.value;
      calculatedChange24h = crypto.change24h;
  } else {
      financialTotal = cash + savings + valuableItems + realEstate + tradingAccount;
      calculatedTotalWorth = financialTotal + portfolioTotal.value;
      calculatedChange24h = portfolioTotal.change24h; // Assuming only portfolio changes daily
  }
  
  // Calculate yesterday's value to get percentage
  const yesterdayValue = calculatedTotalWorth - calculatedChange24h;
  const calculatedChangePercent = yesterdayValue !== 0 
    ? (calculatedChange24h / yesterdayValue) * 100 
    : 0;

  // Use props if provided, otherwise used calculated values
  const totalWorth = initialTotalWorth ?? calculatedTotalWorth;
  const change24h = initialChange24h ?? calculatedChange24h;
  const change24hPercent = initialChangePercent ?? calculatedChangePercent;

  // Convert values from USD (base currency) to selected currency
  const displayTotalWorth = convert(totalWorth, 'USD', mainCurrency.code);
  const displayChange24h = convert(change24h, 'USD', mainCurrency.code);

  const isPositive = change24h >= 0;

  return (
    <div className="rounded-3xl bg-[#0D0D0D] border border-gray-800 p-8 w-full relative overflow-hidden">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-400">
            {selectedCategory === "Crypto" ? "Total Crypto Balance" : "Total Worth"}
        </h3>
        <div className="text-4xl font-bold text-white tracking-tight">
          {format(displayTotalWorth)}
        </div>
        <div className="flex items-center gap-2 text-sm pt-1">
          <span className={cn(
            "font-medium", 
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            {format(Math.abs(displayChange24h))}
          </span>
          <span className={cn(
            "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium",
             isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
            {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(change24hPercent).toFixed(2)}%
          </span>
          <span className="text-gray-500">24H</span>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-400">
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {selectedCategory === "Crypto" ? "Crypto Portfolio" : "Main Wallet"}
                </span>
            </div>
            <span className="text-white font-bold">{format(displayTotalWorth)}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
          <div 
            className="h-full rounded-full bg-cyan-500" 
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400" />
    </div>
  );
}
