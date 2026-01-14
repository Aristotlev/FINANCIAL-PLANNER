"use client";

import Link from "next/link";
import { 
  LayoutDashboard,
  BarChart3, 
  Clock, 
  Bot, 
  Newspaper, 
  Settings,
  Wallet,
  ChartColumn,
  TrendingUp,
  PieChart,
  DollarSign,
  Coins,
  Target,
  List
} from "lucide-react";
import { cn } from "../../lib/utils";
import { OmnifolioLogo } from "../ui/omnifolio-logo";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedCategory: string;
}

const defaultNavigation = [
  { name: "Analytics", id: "analytics", icon: ChartColumn || BarChart3 },
  { name: "Assets", id: "assets", icon: Wallet },
  { name: "Activity", id: "activity", icon: Clock },
  { name: "AI Analytics", id: "ai-analytics", icon: Bot },
  { name: "News", id: "news", icon: Newspaper },
];

const networthNavigation = [
  { name: "Overview", id: "overview", icon: ChartColumn || BarChart3 },
  { name: "Breakdown", id: "breakdown", icon: List },
  { name: "Goals", id: "goals", icon: Target },
  { name: "AI Analysis", id: "ai-analysis", icon: Bot },
];

const cryptoNavigation = [
  { name: "Holdings", id: "overview", icon: Wallet },
  { name: "Breakdown", id: "breakdown", icon: PieChart },
  { name: "Transactions", id: "transactions", icon: List },
  { name: "Analytics", id: "analytics", icon: ChartColumn || BarChart3 },
];

const newsNavigation = [
  { name: "Stocks", id: "stocks", icon: TrendingUp },
  { name: "Indices", id: "indices", icon: PieChart },
  { name: "Forex", id: "forex", icon: DollarSign },
  { name: "Crypto", id: "crypto", icon: Coins },
];

export function Sidebar({ activeTab, onTabChange, selectedCategory }: SidebarProps) {
  const isNewsSection = ['news', 'stocks', 'indices', 'forex', 'crypto'].includes(activeTab);
  
  let currentNavigation;
  if (isNewsSection) {
    currentNavigation = newsNavigation;
  } else if (selectedCategory === "Networth") {
    currentNavigation = networthNavigation;
  } else if (selectedCategory === "Crypto") {
    currentNavigation = cryptoNavigation;
  } else {
    currentNavigation = defaultNavigation;
  }

  return (
    <div className="flex h-full w-64 flex-col bg-black border-r border-gray-800 flex-shrink-0">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <OmnifolioLogo size="sm" textClassName="text-xl" />
        </Link>
      </div>
      
      <div className="flex-1 flex flex-col justify-between py-6">
        <nav className="space-y-1 px-3">
          {currentNavigation.map((item) => {
            // @ts-ignore
            if (item.href) {
              return (
                <Link
                  key={item.id}
                  // @ts-ignore
                  href={item.href}
                  className="w-full group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors text-gray-400 hover:bg-gray-900 hover:text-white"
                >
                  <item.icon
                    className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white"
                  />
                  {item.name}
                </Link>
              );
            }

            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-900 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-400" : "text-gray-400 group-hover:text-white"
                  )}
                />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="px-3">
            <Link
                href="/settings"
                className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-900 hover:text-white transition-colors"
              >
                <Settings
                  className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white"
                />
                Settings
              </Link>
        </div>
      </div>
    </div>
  );
}

