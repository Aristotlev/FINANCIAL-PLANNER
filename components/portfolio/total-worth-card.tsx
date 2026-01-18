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
    tradingAccount,
    expenses 
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
  } else if (selectedCategory === "Stocks") {
      calculatedTotalWorth = stocks.value;
      calculatedChange24h = stocks.change24h;
  } else if (selectedCategory === "Real Estate") {
      calculatedTotalWorth = realEstate;
      calculatedChange24h = 0; // Real estate doesn't have 24h changes
  } else if (selectedCategory === "Valuables") {
      calculatedTotalWorth = valuableItems;
      calculatedChange24h = 0; // Valuables don't have 24h changes
  } else if (selectedCategory === "Expenses") {
      calculatedTotalWorth = expenses;
      calculatedChange24h = 0; // Expenses don't have 24h changes
  } else if (selectedCategory === "Liquid Assets") {
      calculatedTotalWorth = cash + savings;
      calculatedChange24h = 0; // Liquid assets don't have 24h changes
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

  // Don't render the Total Worth card for the Taxes section
  if (selectedCategory === "Taxes") {
    return null;
  }

  return (
    <div className="rounded-3xl bg-[#0D0D0D] border border-white/10 p-8 w-full relative overflow-hidden flex flex-col justify-between h-full">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            {selectedCategory === "Crypto" ? "Crypto Balance" : selectedCategory === "Stocks" ? "Stock Holdings" : selectedCategory === "Real Estate" ? "Real Estate Value" : selectedCategory === "Valuables" ? "Valuables Worth" : selectedCategory === "Expenses" ? "Monthly Expenses" : selectedCategory === "Liquid Assets" ? "Liquid Assets" : "Total Net Worth"}
        </h3>
        <div className="text-5xl font-bold text-white tracking-tight">
          {format(displayTotalWorth)}
        </div>
        <div className="flex items-center gap-3 text-sm pt-2">
          <span className={cn(
            "font-semibold text-lg", 
            isPositive ? "text-emerald-500" : "text-rose-500"
          )}>
            {isPositive ? "+" : "-"}{format(Math.abs(displayChange24h))}
          </span>
          <div className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold",
             isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {isPositive ? <ArrowUp className="h-3 w-3 stroke-[3]" /> : <ArrowDown className="h-3 w-3 stroke-[3]" />}
            {Math.abs(change24hPercent).toFixed(2)}%
          </div>
          <span className="text-gray-500 font-medium">Past 24h</span>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-400">
                <div className="p-1.5 rounded-full bg-white/5">
                  <Wallet className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">
                  {selectedCategory === "Crypto" ? "Crypto Portfolio" : selectedCategory === "Stocks" ? "Stock Portfolio" : selectedCategory === "Real Estate" ? "Real Estate Portfolio" : selectedCategory === "Valuables" ? "Valuables Collection" : selectedCategory === "Expenses" ? "Monthly Outflow" : selectedCategory === "Liquid Assets" ? "Cash & Savings" : "Main Portfolio"}
                </span>
            </div>
            <span className="text-white font-bold tracking-tight">{format(displayTotalWorth)}</span>
        </div>
        <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" 
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-50" />
    </div>
  );
}
