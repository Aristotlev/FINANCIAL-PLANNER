"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { OmnifolioIcon } from "../../components/ui/omnifolio-logo";
import { formatNumber } from "../../lib/utils";
import Link from "next/link";

export function ShareCard() {
  const searchParams = useSearchParams();
  
  const type = searchParams.get("type");
  const title = searchParams.get("title") || "Portfolio";
  const value = parseFloat(searchParams.get("value") || "0");
  const currency = searchParams.get("currency") || "$";
  const user = searchParams.get("user") || "User";
  const change = searchParams.get("change") || "0%";
  
  // Net Worth specific
  const assets = parseFloat(searchParams.get("assets") || "0");
  const liabilities = parseFloat(searchParams.get("liabilities") || "0");
  
  // Portfolio specific
  const theme = searchParams.get("theme") || "#f59e0b";
  const holdingsParam = searchParams.get("holdings");
  let holdings: any[] = [];
  try {
    holdings = holdingsParam ? JSON.parse(decodeURIComponent(holdingsParam)) : [];
  } catch (e) {
    console.error("Failed to parse holdings", e);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
        <div className="text-gray-900 dark:text-white">
          <OmnifolioIcon size={40} />
        </div>
        <span className="font-bold text-2xl tracking-tight text-gray-900 dark:text-white">Omnifolio</span>
      </Link>

      <div className="relative w-full max-w-md aspect-[1.6/1] bg-gradient-to-br from-gray-900 to-black text-white p-6 rounded-xl shadow-2xl overflow-hidden border border-gray-800">
        {/* Background Effects */}
        <div 
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-20"
          style={{ backgroundColor: type === 'net-worth' ? '#9333ea' : theme }}
        ></div>
        <div 
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 opacity-20"
          style={{ backgroundColor: type === 'net-worth' ? '#2563eb' : theme }}
        ></div>
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center justify-center">
                  <OmnifolioIcon size={48} />
                </div>
                <span className="font-bold text-xl tracking-tight">Omnifolio</span>
              </div>
              <div className="text-gray-400 text-sm ml-1">Financial Analytics</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase tracking-wider">User</div>
              <div className="font-semibold">{user}</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-gray-400 uppercase tracking-wider">{type === 'net-worth' ? 'Total Net Worth' : title}</div>
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
              {currency}{formatNumber(value)}
            </div>
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              change.includes('+') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {change} This Month
            </div>
          </div>

          {type === 'net-worth' ? (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
              <div>
                <div className="text-xs text-gray-400 mb-1">Assets</div>
                <div className="font-semibold text-lg text-blue-400">{currency}{formatNumber(assets)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Liabilities</div>
                <div className="font-semibold text-lg text-red-400">{currency}{formatNumber(liabilities)}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
              {holdings.slice(0, 2).map((holding: any, index: number) => (
                <div key={index}>
                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: holding.color || theme }}></div>
                    {holding.symbol}
                  </div>
                  <div className="font-semibold text-lg" style={{ color: theme }}>
                    {currency}{formatNumber(holding.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Track your own net worth, crypto, and stocks with Omnifolio.
        </p>
        <Link 
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
        >
          Get Started for Free
        </Link>
      </div>
    </div>
  );
}
