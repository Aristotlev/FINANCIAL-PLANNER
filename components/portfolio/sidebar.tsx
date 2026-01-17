"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  AnalyticsUpIcon, 
  Wallet02Icon, 
  Clock01Icon, 
  AiBrain01Icon, 
  DashboardSquare01Icon, 
  Task01Icon, 
  Target01Icon, 
  PieChartIcon, 
  Telescope01Icon, 
  Exchange02Icon, 
  Briefcase02Icon, 
  ChartBreakoutSquareIcon, 
  BitcoinCircleIcon, 
  ChartBreakoutCircleIcon, 
  Exchange01Icon, 
  Calendar03Icon, 
  CalendarAdd01Icon, 
  NewTwitterIcon, 
  YoutubeIcon, 
  ChartLineData01Icon, 
  TradeUpIcon, 
  HappyIcon, 
  UserMultiple02Icon, 
  BankIcon, 
  Invoice01Icon, 
  Settings02Icon,
  Building02Icon
} from "hugeicons-react";
import { Lock } from "lucide-react";
import { cn } from "../../lib/utils";
import { OmnifolioLogo, OmnifolioIcon } from "../ui/omnifolio-logo";
import { Sidebar as SidebarContainer, SidebarBody, SidebarLink } from "../ui/sidebar";
import { useSubscription } from "@/hooks/use-subscription";
import { isTrialActive } from "@/types/subscription";
import UpgradeModal from "../pricing/upgrade-modal";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedCategory: string;
}

const defaultNavigation = [
  { name: "Analytics", id: "analytics", icon: AnalyticsUpIcon },
  { name: "Assets", id: "assets", icon: Wallet02Icon },
  { name: "Activity", id: "activity", icon: Clock01Icon },
  { name: "AI Analytics", id: "ai-analytics", icon: AiBrain01Icon },
];

const networthNavigation = [
  { name: "Overview", id: "overview", icon: DashboardSquare01Icon },
  { name: "Breakdown", id: "breakdown", icon: Task01Icon },
  { name: "Goals", id: "goals", icon: Target01Icon },
  { name: "AI Analytics", id: "analytics", icon: AiBrain01Icon },
];

const cryptoNavigation = [
  { name: "Holdings", id: "overview", icon: Wallet02Icon },
  { name: "Breakdown", id: "breakdown", icon: PieChartIcon },
  { name: "Projections", id: "projections", icon: Telescope01Icon },
  { name: "Transactions", id: "transactions", icon: Exchange02Icon },
  { name: "Analytics", id: "analytics", icon: AnalyticsUpIcon },
];

const stocksNavigation = [
  { name: "Holdings", id: "overview", icon: Wallet02Icon },
  { name: "Breakdown", id: "breakdown", icon: PieChartIcon },
  { name: "Projections", id: "projections", icon: Telescope01Icon },
  { name: "Transactions", id: "transactions", icon: Exchange02Icon },
  { name: "Analytics", id: "analytics", icon: AnalyticsUpIcon },
];

const newsNavigation = [
  { name: "My Holdings", id: "holdings-news", icon: Briefcase02Icon },
  { name: "Stocks", id: "stocks", icon: ChartBreakoutSquareIcon },
  { name: "Crypto", id: "crypto", icon: BitcoinCircleIcon },
  { name: "Indices", id: "indices", icon: ChartBreakoutCircleIcon },
  { name: "Forex", id: "forex", icon: Exchange01Icon },
  { name: "Economic Calendar", id: "calendar", icon: Calendar03Icon },
  { name: "IPO Calendar", id: "ipo-calendar", icon: CalendarAdd01Icon },
  { name: "Earnings Calendar", id: "earnings-calendar", icon: Calendar03Icon },
  { name: "Twitter (X)", id: "twitter-x", icon: NewTwitterIcon },
  { name: "Youtube Feed", id: "youtube-feed", icon: YoutubeIcon },
];

const toolsNavigation = [
  { name: "Live Charts", id: "charts", icon: ChartLineData01Icon },
  { name: "Company Lookup", id: "company-lookup", icon: Building02Icon },
  { name: "Trades", id: "trades", icon: TradeUpIcon },
  { name: "Insider Sentiment", id: "insider-sentiment", icon: HappyIcon },
  { name: "Insider Transactions", id: "insider-transactions", icon: UserMultiple02Icon },
  { name: "Senate Lobbying", id: "senate-lobbying", icon: BankIcon },
  { name: "USA Spending", id: "usa-spending", icon: Invoice01Icon },
  { name: "Earnings Surprises", id: "earnings-surprises", icon: Target01Icon },
];

export function Sidebar({ activeTab, onTabChange, selectedCategory }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  
  const { subscription, startCheckout } = useSubscription();

  // Helper to check access - Tools are restricted to INVESTOR and WHALE plans
  const hasToolsAccess = subscription ? (
      ['INVESTOR', 'WHALE'].includes(subscription.plan) || 
      isTrialActive(subscription)
  ) : false;

  const handleRestrictedClick = (featureName: string) => {
      setUpgradeReason(`The ${featureName} feature is available on Investor and Whale plans only.`);
      setShowUpgradeModal(true);
  };
 
  const isNewsSection = ['news', 'stocks', 'indices', 'forex', 'crypto', 'holdings-news', 'calendar', 'twitter-x', 'youtube-feed', 'ipo-calendar', 'earnings-calendar'].includes(activeTab);
  const isToolsSection = ['charts', 'company-lookup', 'trades', 'insider-sentiment', 'insider-transactions', 'earnings-surprises', 'senate-lobbying', 'usa-spending'].includes(activeTab);
  
  // Define restricted tabs for News section
  const restrictedNewsTabs = ['ipo-calendar', 'earnings-calendar', 'twitter-x', 'youtube-feed'];

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
              const isLockedTool = isToolsSection && item.id !== 'charts';
              const isLockedNews = isNewsSection && restrictedNewsTabs.includes(item.id);
              
              const isLocked = (isLockedTool || isLockedNews) && !hasToolsAccess;

              // @ts-ignore
              const onClick = item.href ? undefined : () => {
                 if (isLocked) {
                    handleRestrictedClick(item.name);
                 } else {
                    onTabChange(item.id);
                 }
              };
              // @ts-ignore
              const href = item.href || "#";
              const isActive = activeTab === item.id;
              
              const IconComponent = item.icon;

              return (
                <SidebarLink
                  key={item.id}
                  link={{
                    label: item.name,
                    href: isLocked ? "#" : href,
                    icon: (
                      <div className="relative">
                        <IconComponent
                          className={cn(
                            "h-5 w-5 flex-shrink-0",
                            isActive ? "text-blue-400" : "text-neutral-200 dark:text-neutral-200",
                            isLocked && "text-gray-500"
                          )}
                        />
                         {isLocked && (
                              <div className="absolute -top-1 -right-1 bg-black rounded-full p-[1px]">
                                <Lock className="h-3 w-3 text-yellow-500" />
                              </div>
                          )}
                      </div>
                    ),
                    onClick: onClick
                  }}
                  className={cn(
                      isActive && "bg-gray-900 rounded-md",
                      isLocked && "opacity-70 cursor-not-allowed hover:bg-transparent"
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
                        <Settings02Icon className="h-5 w-5 flex-shrink-0 text-neutral-200 dark:text-neutral-200" />
                    )
                }}
            />
        </div>
      </SidebarBody>
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
        currentPlan={subscription?.plan || 'STARTER'}
        suggestedPlan="INVESTOR"
        onUpgrade={async (plan) => {
            try {
               await startCheckout(plan);
            } catch (error) {
               console.error("Upgrade failed", error);
               window.location.href = '/settings';
            }
        }}
      />
    </SidebarContainer>
  );
}

