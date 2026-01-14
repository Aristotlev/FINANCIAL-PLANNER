"use client";

import { useEffect, useState } from "react";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { useCurrency } from "../../contexts/currency-context";
import { ArrowDownLeft, ArrowUpRight, Search, FileText } from "lucide-react";
import { cn } from "../../lib/utils";

interface CryptoTransaction {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  name: string;
  amount: number;
  pricePerUnit: number;
  totalValue: number;
  date: string;
  originalPrice?: number;
}

export function CryptoTransactionsView() {
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadTransactions() {
      try {
        const data = await SupabaseDataService.getCryptoTransactions();
        setTransactions(data);
      } catch (error) {
        console.error("Failed to load crypto transactions", error);
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  const filteredTransactions = transactions.filter(tx => 
    tx.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tx.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-400 border-t-white mb-4" />
            <p>Loading transactions...</p>
        </div>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-white">Crypto Transactions</h2>
            <p className="text-gray-400 text-sm">History of your crypto buy and sell orders</p>
        </div>
        
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
                type="text" 
                placeholder="Search symbol or name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-[#0D0D0D] border border-gray-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-600"
            />
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0D0D0D] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-[#141414]">
                <th className="px-6 py-4 font-medium text-gray-400">Type</th>
                <th className="px-6 py-4 font-medium text-gray-400">Asset</th>
                <th className="px-6 py-4 font-medium text-gray-400">Date</th>
                <th className="px-6 py-4 font-medium text-gray-400 text-right">Amount</th>
                <th className="px-6 py-4 font-medium text-gray-400 text-right">Price</th>
                <th className="px-6 py-4 font-medium text-gray-400 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                                tx.type === 'buy' 
                                    ? "bg-green-500/10 text-green-500 group-hover:bg-green-500/20" 
                                    : "bg-red-500/10 text-red-500 group-hover:bg-red-500/20"
                            )}>
                                {tx.type === 'buy' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <span className={cn(
                                "font-medium capitalize",
                                tx.type === 'buy' ? "text-green-500" : "text-red-400"
                            )}>
                                {tx.type}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-medium text-white">{tx.name}</span>
                            <span className="text-xs text-gray-500">{tx.symbol}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300 font-medium whitespace-nowrap">
                        {tx.amount} <span className="text-gray-500 text-xs ml-0.5">{tx.symbol}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 whitespace-nowrap">
                        {formatCurrency(tx.pricePerUnit)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white whitespace-nowrap">
                        {formatCurrency(tx.totalValue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                            <div className="bg-gray-900 rounded-full p-4 mb-3">
                                <FileText className="h-6 w-6 text-gray-600" />
                            </div>
                            <p className="text-lg font-medium text-gray-400">No transactions found</p>
                            <p className="text-sm">Your crypto transaction history will appear here</p>
                        </div>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
