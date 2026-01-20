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
  HappyIcon, 
  UserMultiple02Icon, 
  BankIcon, 
  Invoice01Icon, 
  Building02Icon,
  Coins01Icon
} from "hugeicons-react";
import { Lock } from "lucide-react";
import { cn } from "../../lib/utils";
import { OmnifolioLogo, OmnifolioIcon } from "../ui/omnifolio-logo";
import { Sidebar as SidebarContainer, SidebarBody, SidebarLink } from "../ui/sidebar";
import { useSubscription, useAdminStatus } from "@/hooks/use-subscription";
import { isTrialActive } from "@/types/subscription";
import UpgradeModal from "../pricing/upgrade-modal";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedCategory: string;
}

const ValuablesOverviewIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="currentColor" className={className}>
    <path d="M2 18C2 16.4596 2 15.6893 2.34673 15.1235C2.54074 14.8069 2.80693 14.5407 3.12353 14.3467C3.68934 14 4.45956 14 6 14C7.54044 14 8.31066 14 8.87647 14.3467C9.19307 14.5407 9.45926 14.8069 9.65327 15.1235C10 15.6893 10 16.4596 10 18C10 19.5404 10 20.3107 9.65327 20.8765C9.45926 21.1931 9.19307 21.4593 8.87647 21.6533C8.31066 22 7.54044 22 6 22C4.45956 22 3.68934 22 3.12353 21.6533C2.80693 21.4593 2.54074 21.1931 2.34673 20.8765C2 20.3107 2 19.5404 2 18Z" stroke="currentColor"></path>
    <path d="M14 18C14 16.4596 14 15.6893 14.3467 15.1235C14.5407 14.8069 14.8069 14.5407 15.1235 14.3467C15.6893 14 16.4596 14 18 14C19.5404 14 20.3107 14 20.8765 14.3467C21.1931 14.5407 21.4593 14.8069 21.6533 15.1235C22 15.6893 22 16.4596 22 18C22 19.5404 22 20.3107 21.6533 20.8765C21.4593 21.1931 21.1931 21.4593 20.8765 21.6533C20.3107 22 19.5404 22 18 22C16.4596 22 15.6893 22 15.1235 21.6533C14.8069 21.4593 14.5407 21.1931 14.3467 20.8765C14 20.3107 14 19.5404 14 18Z" stroke="currentColor"></path>
    <path d="M2 6C2 4.45956 2 3.68934 2.34673 3.12353C2.54074 2.80693 2.80693 2.54074 3.12353 2.34673C3.68934 2 4.45956 2 6 2C7.54044 2 8.31066 2 8.87647 2.34673C9.19307 2.54074 9.45926 2.80693 9.65327 3.12353C10 3.68934 10 4.45956 10 6C10 7.54044 10 8.31066 9.65327 8.87647C9.45926 9.19307 9.19307 9.45926 8.87647 9.65327C8.31066 10 7.54044 10 6 10C4.45956 10 3.68934 10 3.12353 9.65327C2.80693 9.45926 2.54074 9.19307 2.34673 8.87647C2 8.31066 2 7.54044 2 6Z" stroke="currentColor"></path>
    <path d="M14 6C14 4.45956 14 3.68934 14.3467 3.12353C14.5407 2.80693 14.8069 2.54074 15.1235 2.34673C15.6893 2 16.4596 2 18 2C19.5404 2 20.3107 2 20.8765 2.34673C21.1931 2.54074 21.4593 2.80693 21.6533 3.12353C22 3.68934 22 4.45956 22 6C22 7.54044 22 8.31066 21.6533 8.87647C21.4593 9.19307 21.1931 9.45926 20.8765 9.65327C20.3107 10 19.5404 10 18 10C16.4596 10 15.6893 10 15.1235 9.65327C14.8069 9.45926 14.5407 9.19307 14.3467 8.87647C14 8.31066 14 7.54044 14 6Z" stroke="currentColor"></path>
  </svg>
);

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
  { name: "Fear & Greed", id: "fear-and-greed", icon: ChartLineData01Icon },
];

const stocksNavigation = [
  { name: "Holdings", id: "overview", icon: Wallet02Icon },
  { name: "Breakdown", id: "breakdown", icon: PieChartIcon },
  { name: "Projections", id: "projections", icon: Telescope01Icon },
  { name: "Transactions", id: "transactions", icon: Exchange02Icon },
  { name: "Analytics", id: "analytics", icon: AnalyticsUpIcon },
];

const expensesNavigation = [
  { name: "Overview", id: "overview", icon: DashboardSquare01Icon },
  { name: "Breakdown", id: "breakdown", icon: PieChartIcon },
  { name: "Activity", id: "activity", icon: Clock01Icon },
  { name: "AI Analytics", id: "analytics", icon: AiBrain01Icon },
];

const valuablesNavigation = [
  { name: "Overview", id: "overview", icon: ValuablesOverviewIcon },
  { name: "Breakdown", id: "breakdown", icon: PieChartIcon },
  { name: "Activity", id: "activity", icon: Clock01Icon },
  { name: "AI Analytics", id: "analytics", icon: AiBrain01Icon },
];

const realEstateNavigation = [
  { name: "Overview", id: "overview", icon: DashboardSquare01Icon },
  { name: "Breakdown", id: "breakdown", icon: PieChartIcon },
  { name: "Activity", id: "activity", icon: Clock01Icon },
  { name: "AI Analytics", id: "analytics", icon: AiBrain01Icon },
];

const newsNavigation = [
  { name: "My Holdings", id: "holdings-news", icon: Briefcase02Icon },
  { name: "Stocks", id: "stocks", icon: ChartBreakoutSquareIcon },
  { name: "Crypto", id: "crypto", icon: BitcoinCircleIcon },
  { name: "Indices", id: "indices", icon: ChartBreakoutCircleIcon },
  { name: "Forex", id: "forex", icon: Exchange01Icon },
  { name: "Commodities", id: "commodities", icon: Coins01Icon },
  { name: "Economic Calendar", id: "calendar", icon: Calendar03Icon },
  { name: "IPO Calendar", id: "ipo-calendar", icon: CalendarAdd01Icon },
  { name: "Earnings Calendar", id: "earnings-calendar", icon: Calendar03Icon },
  { name: "Twitter (X)", id: "twitter-x", icon: NewTwitterIcon },
  { name: "Youtube Feed", id: "youtube-feed", icon: YoutubeIcon },
];

const toolsNavigation = [
  { name: "Live Charts", id: "charts", icon: ChartLineData01Icon },
  { name: "Company Lookup", id: "company-lookup", icon: Building02Icon },
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
  const { isAdmin } = useAdminStatus();

  // Helper to check access - Tools are restricted to INVESTOR and WHALE plans (or admin)
  const hasToolsAccess = isAdmin || (subscription ? (
      ['INVESTOR', 'WHALE'].includes(subscription.plan) || 
      isTrialActive(subscription)
  ) : false);

  const handleRestrictedClick = (featureName: string) => {
      setUpgradeReason(`The ${featureName} feature is available on Investor and Whale plans only.`);
      setShowUpgradeModal(true);
  };
 
  const isNewsSection = ['news', 'stocks', 'indices', 'forex', 'crypto', 'commodities', 'holdings-news', 'calendar', 'twitter-x', 'youtube-feed', 'ipo-calendar', 'earnings-calendar'].includes(activeTab);
  const isToolsSection = ['charts', 'company-lookup', 'insider-sentiment', 'insider-transactions', 'earnings-surprises', 'senate-lobbying', 'usa-spending'].includes(activeTab);
  
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
  } else if (selectedCategory === "Expenses") {
    currentNavigation = expensesNavigation;
  } else if (selectedCategory === "Valuables") {
    currentNavigation = valuablesNavigation;
  } else if (selectedCategory === "Real Estate") {
    currentNavigation = realEstateNavigation;
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

