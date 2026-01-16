"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  BarChart3, 
  Clock, 
  Bot, 
  Settings,
  Wallet,
  ChartColumn,
  TrendingUp,
  PieChart,
  DollarSign,
  Coins,
  Target,
  List,
  Briefcase,
  CalendarDays,
  Twitter,
  Youtube,
  Activity,
  CalendarPlus,
  Users,
  Landmark,
  Banknote
} from "lucide-react";
import { cn } from "../../lib/utils";
import { OmnifolioLogo, OmnifolioIcon } from "../ui/omnifolio-logo";
import { Sidebar as SidebarContainer, SidebarBody, SidebarLink } from "../ui/sidebar";

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
];

const networthNavigation = [
  { name: "Overview", id: "overview", icon: ChartColumn || BarChart3 },
  { name: "Breakdown", id: "breakdown", icon: List },
  { name: "Goals", id: "goals", icon: Target },
  { name: "AI Analytics", id: "analytics", icon: Bot },
];

const cryptoNavigation = [
  { name: "Holdings", id: "overview", icon: Wallet },
  { name: "Breakdown", id: "breakdown", icon: PieChart },
  { name: "Projections", id: "projections", icon: Target },
  { name: "Transactions", id: "transactions", icon: List },
  { name: "Analytics", id: "analytics", icon: ChartColumn || BarChart3 },
];

const stocksNavigation = [
  { name: "Holdings", id: "overview", icon: Wallet },
  { name: "Breakdown", id: "breakdown", icon: PieChart },
  { name: "Projections", id: "projections", icon: Target },
  { name: "Transactions", id: "transactions", icon: List },
  { name: "Analytics", id: "analytics", icon: ChartColumn || BarChart3 },
];

const newsNavigation = [
  { name: "My Holdings", id: "holdings-news", icon: Briefcase },
  { name: "Stocks", id: "stocks", icon: TrendingUp },
  { name: "Crypto", id: "crypto", icon: Coins },
  { name: "Indices", id: "indices", icon: PieChart },
  { name: "Forex", id: "forex", icon: DollarSign },
  { name: "IPO Calendar", id: "ipo-calendar", icon: CalendarPlus },
  { name: "Earnings Calendar", id: "earnings-calendar", icon: BarChart3 },
  { name: "Economic Calendar", id: "calendar", icon: CalendarDays },
  { name: "Twitter (X)", id: "twitter-x", icon: Twitter },
  { name: "Youtube Feed", id: "youtube-feed", icon: Youtube },
];

const toolsNavigation = [
  { name: "Trades", id: "trades", icon: Activity },
  { name: "Insider Sentiment", id: "insider-sentiment", icon: TrendingUp },
  { name: "Insider Transactions", id: "insider-transactions", icon: Users },
  { name: "Senate Lobbying", id: "senate-lobbying", icon: Landmark },
  { name: "USA Spending", id: "usa-spending", icon: Banknote },
  { name: "Earnings Surprises", id: "earnings-surprises", icon: Target },
];

export function Sidebar({ activeTab, onTabChange, selectedCategory }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const isNewsSection = ['news', 'stocks', 'indices', 'forex', 'crypto', 'holdings-news', 'calendar', 'twitter-x', 'youtube-feed', 'ipo-calendar', 'earnings-calendar'].includes(activeTab);
  const isToolsSection = ['trades', 'insider-sentiment', 'insider-transactions', 'earnings-surprises', 'senate-lobbying', 'usa-spending'].includes(activeTab);
  
  let currentNavigation;
  if (isNewsSection) {
    currentNavigation = newsNavigation;
  } else if (isToolsSection || selectedCategory === "Tools") {
    currentNavigation = toolsNavigation;
  } else if (selectedCategory === "Networth") {
    currentNavigation = networthNavigation;
  } else if (selectedCategory === "Crypto") {
    currentNavigation = cryptoNavigation;
  } else if (selectedCategory === "Stocks") {
    currentNavigation = stocksNavigation;
  } else {
    currentNavigation = defaultNavigation;
  }

  return (
    <SidebarContainer open={open} setOpen={setOpen} animate={true}>
      <SidebarBody className="justify-between gap-10 bg-black border-r border-gray-800">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <div className="py-4 flex flex-col items-start min-h-[64px]">
             {open ? (
                 <Link href="/" className="hover:opacity-80 transition-opacity pl-2">
                    <OmnifolioLogo size="sm" textClassName="text-xl" />
                 </Link>
             ) : (
                 <Link href="/" className="hover:opacity-80 transition-opacity pl-1">
                    <OmnifolioIcon size={32} />
                 </Link>
             )}
          </div>
          
          <div className="mt-8 flex flex-col gap-2">
            {currentNavigation.map((item) => {
              // @ts-ignore
              const onClick = item.href ? undefined : () => onTabChange(item.id);
              // @ts-ignore
              const href = item.href || "#";
              const isActive = activeTab === item.id;
              
              const IconComponent = item.icon;

              return (
                <SidebarLink
                  key={item.id}
                  link={{
                    label: item.name,
                    href: href,
                    icon: (
                      <IconComponent
                        className={cn(
                          "h-5 w-5 flex-shrink-0",
                          isActive ? "text-blue-400" : "text-neutral-200 dark:text-neutral-200"
                        )}
                      />
                    ),
                    onClick: onClick
                  }}
                  className={cn(
                      isActive && "bg-gray-900 rounded-md"
                  )}
                />
              );
            })}
          </div>
        </div>

        <div>
            <SidebarLink
                link={{
                    label: "Settings",
                    href: "/settings",
                    icon: (
                        <Settings className="h-5 w-5 flex-shrink-0 text-neutral-200 dark:text-neutral-200" />
                    )
                }}
            />
        </div>
      </SidebarBody>
    </SidebarContainer>
  );
}

