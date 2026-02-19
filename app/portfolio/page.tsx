"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBetterAuth } from '../../contexts/better-auth-context';
import { Preloader } from '../../components/ui/preloader';
import { Sidebar } from '../../components/portfolio/sidebar';
import { TopBar } from '../../components/portfolio/top-bar';
import { TotalWorthCard } from '../../components/portfolio/total-worth-card';
import { AllocationCard } from '../../components/portfolio/allocation-card';
import { AIChatAssistant } from '../../components/ui/ai-chat';
import { Plus, ArrowUpRight, ShoppingCart, Repeat, Newspaper, ChartColumn, Wallet, CreditCard, Gem, Home, Receipt, TrendingUp, Bitcoin, Wrench, Landmark } from 'lucide-react';
import { FloatingDock } from '../../components/ui/floating-dock';

import { NewsFeed } from '../../components/portfolio/news-feed';
import { ProprietaryIPOCalendar } from '../../components/portfolio/proprietary-ipo-calendar';
import { ProprietaryEarningsCalendar } from '../../components/portfolio/proprietary-earnings-calendar';
import { TwitterFeed } from '../../components/portfolio/twitter-feed-curated';
import { YoutubeFeed } from '../../components/portfolio/youtube-feed';
import { SettingsModal } from '../../components/settings/settings-modal';
import { AddCryptoPositionModal } from '../../components/portfolio/modals/add-crypto-position-modal';
import { AddStockPositionModal } from '../../components/portfolio/modals/add-stock-position-modal';
import { AddPropertyModal, RealEstateProperty } from '../../components/portfolio/modals/add-property-modal';
import { AddValuableItemModal, ValuableItem } from '../../components/portfolio/modals/add-valuable-item-modal';
import { AddExpenseCategoryModal, ExpenseCategory } from '../../components/portfolio/modals/add-expense-category-modal';
import { AddCashAccountModal, CashAccount } from '../../components/portfolio/modals/add-cash-account-modal';
import { AddIncomeModal, IncomeSource } from '../../components/portfolio/modals/add-income-modal';
import { AddGoalModal, SavingsGoal } from '../../components/portfolio/modals/add-goal-modal';
import { ImprovedTaxProfileModal } from '../../components/financial/improved-tax-profile-modal';
import { TaxProfile } from '../../lib/types/tax-profile';
import { CryptoTransactionsView } from '../../components/portfolio/crypto-transactions-view';
import { StockTransactionsView } from '../../components/portfolio/stock-transactions-view';
import { CryptoAIAnalyticsView } from '../../components/portfolio/crypto-ai-analytics-view';
import { StockAIAnalyticsView } from '../../components/portfolio/stock-ai-analytics-view';
import { NetworthAIAnalyticsView } from '../../components/portfolio/networth/networth-ai-analytics-view';
import { LiquidAssetsAnalyticsView } from '../../components/portfolio/liquid-assets/liquid-assets-analytics-view';
import { ValuablesAIAnalyticsView } from '../../components/portfolio/valuables/valuables-ai-analytics-view';
import { CryptoProjectionsView } from '../../components/portfolio/crypto-projections-view';
import { StockProjectionsView } from '../../components/portfolio/stock-projections-view';
import { FearAndGreedView } from '../../components/portfolio/fear-and-greed-view';
import { StockFearAndGreedView } from '../../components/portfolio/stock-fear-and-greed-view';
import { usePortfolioContext, CryptoHolding, StockHolding } from '../../contexts/portfolio-context';
import { SupabaseDataService } from '../../lib/supabase/supabase-data-service';
import { useAssetPrices } from '../../hooks/use-price';
import { getBrandColor } from '../../lib/brand-colors';
import { Select } from '../../components/ui/select';

import { EconomicCalendar } from '../../components/portfolio/economic-calendar';
import { InsiderSentimentView } from '../../components/portfolio/insider-sentiment-view';
import { InsiderTransactionsProprietaryView } from '../../components/portfolio/insider-transactions-proprietary-view';
import { EarningsSurprisesView } from '../../components/portfolio/earnings-surprises-view';
import { SenateLobbyingView } from '../../components/portfolio/senate-lobbying-view';
import { USASpendingView } from '../../components/portfolio/usa-spending-view';
import { ToolsView } from '../../components/tools/ToolsView';
import { CompanyLookup } from '../../components/tools/CompanyLookup';
import { BloombergWidget } from '../../components/portfolio/bloomberg-widget';

import { NetworthOverview } from '../../components/portfolio/networth-overview';
import { ExpensesOverview } from '../../components/portfolio/expenses/expenses-overview';
import { ValuablesOverview } from '../../components/portfolio/valuables/valuables-overview';
import { RealEstateOverview } from '../../components/portfolio/real-estate/real-estate-overview';
import { RealEstateAIAnalyticsView } from '../../components/portfolio/real-estate/real-estate-ai-analytics-view';
import { ExpensesAIAnalyticsView } from '../../components/portfolio/expenses/expenses-ai-analytics-view';

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

const OverviewView = ({ selectedCategory }: { selectedCategory: string }) => {
    // If selectedCategory is "Networth", use the new NetworthOverview component
    if (selectedCategory === "Networth") {
        return <NetworthOverview />;
    }
    
    // If selectedCategory is "Expenses", use the new ExpensesOverview component
    if (selectedCategory === "Expenses") {
        return <ExpensesOverview />;
    }

    // If selectedCategory is "Valuables", use the new ValuablesOverview component
    if (selectedCategory === "Valuables") {
        return <ValuablesOverview />;
    }

    // If selectedCategory is "Real Estate", use the new RealEstateOverview component
    if (selectedCategory === "Real Estate") {
        return <RealEstateOverview />;
    }

    // Default layout for other categories
    const showAllocation = ["Crypto", "Stocks", "Valuables"].includes(selectedCategory);

    return (
    <div className="space-y-8">
        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TotalWorthCard selectedCategory={selectedCategory} />
            {showAllocation && <AllocationCard selectedCategory={selectedCategory} />}
        </div>
    </div>
    );
};

const BreakdownView = ({ selectedCategory }: { selectedCategory: string }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AllocationCard selectedCategory={selectedCategory} />
    </div>
);

const GoalsView = () => (
    <div className="text-white">Goals View Content</div>
);

const AIAnalyticsView = () => (
    <div className="text-white">AI Analytics View Content</div>
);

const NewsView = ({ activeTab }: { activeTab: string }) => {
    const { cryptoHoldings, stockHoldings } = usePortfolioContext();

    const categoryMap: Record<string, string> = {
        'news': 'general',
        'holdings-news': 'holdings',
        'stocks': 'stocks',
        'indices': 'indices',
        'forex': 'forex',
        'crypto': 'crypto',
        'commodities': 'commodities'
    };
    
    // Default to 'general' if tab not found in map, or use the tab name itself if supported
    const category = categoryMap[activeTab] || 'general';

    // Prepare holdings data for the news feed if needed
    const allHoldings = category === 'holdings' ? [
        ...cryptoHoldings.map(h => ({ symbol: h.symbol, name: h.name, type: 'crypto' as const })),
        ...stockHoldings.map(h => ({ symbol: h.symbol, name: h.name, type: 'stock' as const }))
    ] : [];

    return (
        <NewsFeed category={category} holdings={allHoldings} />
    );
};

export default function PortfolioPage() {
  const { isAuthenticated, isLoading } = useBetterAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('news');
  const [selectedCategory, setSelectedCategory] = useState("News");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddCryptoModalOpen, setIsAddCryptoModalOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  const [isAddValuableItemModalOpen, setIsAddValuableItemModalOpen] = useState(false);
  const [isAddExpenseCategoryModalOpen, setIsAddExpenseCategoryModalOpen] = useState(false);
  const [isAddCashAccountModalOpen, setIsAddCashAccountModalOpen] = useState(false);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isAddTaxProfileModalOpen, setIsAddTaxProfileModalOpen] = useState(false);
  
  const { cryptoHoldings, setCryptoHoldings, stockHoldings, setStockHoldings } = usePortfolioContext();
  const symbols = cryptoHoldings.map(h => h.symbol);
  const { prices } = useAssetPrices(symbols);

  const handleAddCryptoPosition = async (newHolding: Omit<CryptoHolding, 'id' | 'value' | 'change'>) => {
    // Check if we already have a position in this symbol (merge regardless of wallet)
    const existingHolding = cryptoHoldings.find(h => h.symbol === newHolding.symbol);
    
    if (existingHolding) {
      // Merge positions: calculate weighted average entry point
      const totalAmount = existingHolding.amount + newHolding.amount;
      const totalCostBasis = (existingHolding.amount * existingHolding.entryPoint) + (newHolding.amount * newHolding.entryPoint);
      const avgEntryPoint = totalCostBasis / totalAmount;
      
      // Get current price for value calculation
      const currentPriceData = prices[newHolding.symbol];
      const currentPrice = currentPriceData?.price || avgEntryPoint;
      const value = totalAmount * currentPrice;
      const changePercent = ((currentPrice - avgEntryPoint) / avgEntryPoint * 100);
      const change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
      
      const mergedHolding: CryptoHolding = {
        ...existingHolding,
        amount: totalAmount,
        entryPoint: avgEntryPoint,
        value,
        change,
        // Keep the existing wallet info (or update if the new one has wallet info)
        walletType: newHolding.walletType || existingHolding.walletType,
        walletName: newHolding.walletName || existingHolding.walletName,
        iconUrl: newHolding.iconUrl || existingHolding.iconUrl
      };
      
      // Update state optimistically
      setCryptoHoldings(cryptoHoldings.map(h => h.id === existingHolding.id ? mergedHolding : h));
      
      // Save to database
      await SupabaseDataService.saveCryptoHolding(mergedHolding);
      
      // Record transaction
      const transaction: CryptoTransaction = {
        id: crypto.randomUUID(),
        type: 'buy',
        symbol: newHolding.symbol,
        name: newHolding.name,
        amount: newHolding.amount,
        pricePerUnit: newHolding.entryPoint,
        totalValue: newHolding.amount * newHolding.entryPoint,
        date: new Date().toISOString()
      };
      
      await SupabaseDataService.saveCryptoTransaction(transaction);
      
    } else {
      // Create new holding
      // Get current price for value calculation
      const currentPriceData = prices[newHolding.symbol];
      const currentPrice = currentPriceData?.price || newHolding.entryPoint;
      const value = newHolding.amount * currentPrice;
      const changePercent = ((currentPrice - newHolding.entryPoint) / newHolding.entryPoint * 100);
      const change = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;

      const holdingToAdd: CryptoHolding = {
        ...newHolding,
        id: crypto.randomUUID(),
        value,
        change
      };
      
      // Update state optimistically
      setCryptoHoldings([...cryptoHoldings, holdingToAdd]);
      
      // Save to database
      await SupabaseDataService.saveCryptoHolding(holdingToAdd);
      
      // Record transaction
      const transaction: CryptoTransaction = {
        id: crypto.randomUUID(),
        type: 'buy',
        symbol: newHolding.symbol,
        name: newHolding.name,
        amount: newHolding.amount,
        pricePerUnit: newHolding.entryPoint,
        totalValue: newHolding.amount * newHolding.entryPoint,
        date: new Date().toISOString()
      };
      
      await SupabaseDataService.saveCryptoTransaction(transaction);
    }
    
    // Dispatch events to update charts
    window.dispatchEvent(new Event('cryptoDataChanged'));
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const handleAddStockPosition = async (newHolding: Omit<StockHolding, 'id' | 'value' | 'change' | 'color'>) => {
    // Check if we already have a position in this symbol
    const existingHolding = stockHoldings.find(h => h.symbol === newHolding.symbol);
    
    if (existingHolding) {
      // Merge positions: calculate weighted average entry point
      const totalShares = existingHolding.shares + newHolding.shares;
      const totalCostBasis = (existingHolding.shares * existingHolding.entryPoint) + (newHolding.shares * newHolding.entryPoint);
      const avgEntryPoint = totalCostBasis / totalShares;
      
      // Value will be calculated with current price via the context/price hook
      const value = totalShares * avgEntryPoint; // Placeholder, will be updated by price hook
      const changePercent = 0; // Will be calculated by price hook
      const change = '+0.00%';
      
      const mergedHolding: StockHolding = {
        ...existingHolding,
        shares: totalShares,
        entryPoint: avgEntryPoint,
        value,
        change,
      };
      
      // Update state optimistically
      setStockHoldings(stockHoldings.map(h => h.id === existingHolding.id ? mergedHolding : h));
      
      // Save to database
      await SupabaseDataService.saveStockHolding(mergedHolding);
      
    } else {
      // Create new holding
      const value = newHolding.shares * newHolding.entryPoint;
      const change = '+0.00%';
      const color = getBrandColor(newHolding.symbol, 'stock');

      const holdingToAdd: StockHolding = {
        ...newHolding,
        id: crypto.randomUUID(),
        value,
        change,
        color
      };
      
      // Update state optimistically
      setStockHoldings([...stockHoldings, holdingToAdd]);
      
      // Save to database
      await SupabaseDataService.saveStockHolding(holdingToAdd);
    }
    
    // Dispatch events to update charts
    window.dispatchEvent(new Event('stockDataChanged'));
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const handleAddProperty = async (newProperty: Omit<RealEstateProperty, 'id'>) => {
    const propertyToAdd: RealEstateProperty = {
      ...newProperty,
      id: crypto.randomUUID(),
    };
    
    // Save to database
    await SupabaseDataService.saveRealEstate(propertyToAdd);
    
    // Dispatch events to update charts
    window.dispatchEvent(new Event('realEstateDataChanged'));
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const handleAddValuableItem = async (newItem: Omit<ValuableItem, 'id'>) => {
    const itemToAdd: ValuableItem = {
      ...newItem,
      id: crypto.randomUUID(),
    };
    
    // Save to database
    await SupabaseDataService.saveValuableItem(itemToAdd);
    
    // Dispatch events to update charts
    window.dispatchEvent(new Event('valuablesDataChanged'));
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const handleAddExpenseCategory = async (newCategory: Omit<ExpenseCategory, 'id'>) => {
    const categoryToAdd: ExpenseCategory = {
      ...newCategory,
      id: crypto.randomUUID(),
    };
    
    // Save to database
    await SupabaseDataService.saveExpenseCategory(categoryToAdd);
    
    // Dispatch events to update charts
    window.dispatchEvent(new Event('expensesDataChanged'));
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const handleAddCashAccount = async (newAccount: Omit<CashAccount, 'id'>) => {
    const accountToAdd: CashAccount = {
      ...newAccount,
      id: crypto.randomUUID(),
    };
    
    // Save to database
    await SupabaseDataService.saveCashAccount(accountToAdd);
    
    // Dispatch events to update charts
    window.dispatchEvent(new Event('cashDataChanged'));
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const handleAddIncome = async (newIncome: Omit<IncomeSource, 'id'>) => {
    const incomeToAdd: IncomeSource = {
      ...newIncome,
      id: crypto.randomUUID(),
    };
    
    // Save to database
    await SupabaseDataService.saveIncomeSource(incomeToAdd);
    
    // Dispatch events to update charts
    window.dispatchEvent(new Event('cashDataChanged'));
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const handleAddGoal = async (newGoal: Omit<SavingsGoal, 'id' | 'color'>) => {
    const colors = ['#3b82f6', '#6366f1', '#0ea5e9', '#8b5cf6', '#06b6d4', '#10b981'];
    // Mock getting existing goals count or just random/sequential color assignment
    // In a real app we might want to check existing goals to cycle colors properly, 
    // but random or time-based is fine for now
    const color = colors[Math.floor(Math.random() * colors.length)];

    const goalToAdd: SavingsGoal = {
      ...newGoal,
      id: crypto.randomUUID(),
      color
    };
    
    // Save to database
    await SupabaseDataService.saveSavingsAccount(goalToAdd);
    
    // Dispatch events to update charts
    window.dispatchEvent(new Event('savingsDataChanged'));
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const handleAddTaxProfile = async (profile: Omit<TaxProfile, 'id'> | TaxProfile) => {
    const profileToAdd: TaxProfile = {
      ...profile,
      id: 'id' in profile ? profile.id : crypto.randomUUID(),
    };
    
    // Save to database
    await SupabaseDataService.saveTaxProfile(profileToAdd);
    
    // Dispatch events to update charts
    window.dispatchEvent(new Event('taxDataChanged'));
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const categories = [
      "News",
      "Networth",
      "Liquid Assets",
      "Expenses",
      "Valuables",
      "Real Estate",
      "Taxes",
      "Stocks",
      "Crypto",
      "Tools"
  ];

  const floatingDockItems = [
      {
          title: "News",
          icon: <Newspaper className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
          onClick: () => {
              setActiveTab("news");
              setSelectedCategory("News");
          }
      },
      {
          title: "Networth",
          icon: <ChartColumn className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
          onClick: () => {
              setSelectedCategory("Networth");
              setActiveTab("overview");
          }
      },
      {
          title: "Liquid Assets",
          icon: <Landmark className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
          onClick: () => {
              setSelectedCategory("Liquid Assets");
              setActiveTab("analytics");
          }
      },
      {
          title: "Expenses",
          icon: <CreditCard className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
          onClick: () => {
              setSelectedCategory("Expenses");
              setActiveTab("overview");
          }
      },
      {
          title: "Valuables",
          icon: <Gem className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
          onClick: () => {
              setSelectedCategory("Valuables");
              setActiveTab("overview");
          }
      },
      {
          title: "Real Estate",
          icon: <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
          onClick: () => {
              setSelectedCategory("Real Estate");
              setActiveTab("overview");
          }
      },
      {
          title: "Taxes",
          icon: <Receipt className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
          onClick: () => {
              setSelectedCategory("Taxes");
              setActiveTab("analytics");
          }
      },
      {
          title: "Stocks",
          icon: <TrendingUp className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
          onClick: () => {
              setSelectedCategory("Stocks");
              setActiveTab("overview");
          }
      },
      {
          title: "Crypto",
          icon: <Bitcoin className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
          onClick: () => {
              setSelectedCategory("Crypto");
              setActiveTab("overview");
          }
      },
      {
          title: "Tools",
          icon: <Wrench className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
          onClick: () => {
              setSelectedCategory("Tools");
              setActiveTab("charts");
          }
      },
  ];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <Preloader />;
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView selectedCategory={selectedCategory} />;
      case 'breakdown':
        return <BreakdownView selectedCategory={selectedCategory} />;
      case 'goals':
        return <GoalsView />;
      case 'ai-analysis':
        return <AIAnalyticsView />;
      case 'activity':
          // Placeholder for Activity/Transactions across categories if not specific view
          if (selectedCategory === "Expenses") {
              return <div className="text-white p-4">Expense Activity Coming Soon</div>;
          }
           return <div className="text-white p-4">Activity Feed</div>;
      case 'transactions':
        if (selectedCategory === "Stocks") {
            return <StockTransactionsView />;
        }
        return <CryptoTransactionsView />;
      case 'analytics':
        if (selectedCategory === "Crypto") {
           return <CryptoAIAnalyticsView />;
        } else if (selectedCategory === "Stocks") {
            return <StockAIAnalyticsView />;
        } else if (selectedCategory === "Networth") {
            return <NetworthAIAnalyticsView />;
        } else if (selectedCategory === "Liquid Assets") {
            return <LiquidAssetsAnalyticsView />;
        } else if (selectedCategory === "Expenses") {
            return <ExpensesAIAnalyticsView />; 
        } else if (selectedCategory === "Valuables") {
            return <ValuablesAIAnalyticsView />;
        } else if (selectedCategory === "Real Estate") {
            return <RealEstateAIAnalyticsView />;
        }
        return <OverviewView selectedCategory={selectedCategory} />;
      case 'fear-and-greed':
        return <FearAndGreedView />;
      case 'stock-fear-and-greed':
        return <StockFearAndGreedView />;
      case 'projections':
        if (selectedCategory === "Crypto") {
            return <CryptoProjectionsView />;
        }
        if (selectedCategory === "Stocks") {
            return <StockProjectionsView />;
        }
        return <OverviewView selectedCategory={selectedCategory} />;
      case 'calendar':
        return <EconomicCalendar />;
      case 'twitter-x':
        return <TwitterFeed />;
      case 'youtube-feed':
        return <YoutubeFeed />;
      case 'ipo-calendar':
      case 'ipo-calendar-pro':
        return <ProprietaryIPOCalendar />;
      case 'earnings-calendar':
        return <ProprietaryEarningsCalendar />;
      case 'news':
      case 'holdings-news':
      case 'stocks':
      case 'indices':
      case 'forex':
      case 'crypto':
      case 'commodities':
        return <NewsView activeTab={activeTab} />;
      case 'insider-sentiment':
        return <InsiderSentimentView />;
      case 'insider-transactions':
        return <InsiderTransactionsProprietaryView />;
      case 'earnings-surprises':
        return <EarningsSurprisesView />;
      case 'senate-lobbying':
        return <SenateLobbyingView />;
      case 'usa-spending':
        return <USASpendingView />;
      case 'company-lookup':
        return <CompanyLookup />;
      case 'charts':
        return <ToolsView />;
      default:
        return <OverviewView selectedCategory={selectedCategory} />;
    }
  };


  const handleSearchNavigation = (type: string, id?: string) => {
      // Map asset types to categories
      const typeToCategory: Record<string, string> = {
          'crypto': 'Crypto',
          'stock': 'Stocks',
          'real_estate': 'Real Estate',
          'valuable': 'Valuables',
          'cash': 'Liquid Assets',
          'savings': 'Liquid Assets',
          'expense': 'Expenses',
          'tax': 'Taxes'
      };

      const category = typeToCategory[type];
      if (category) {
          setSelectedCategory(category);
          
          if (category === "Crypto" || category === "Stocks" || category === "Expenses" || category === "Valuables" || category === "Real Estate") {
              setActiveTab('overview');
          } else {
              // For all categories using defaultNavigation (Liquid Assets, Real Estate, Taxes)
              // The first tab is "Analytics" (id: 'analytics')
              setActiveTab('analytics');
          }
          
          // If we had a way to scroll to the specific item or open a modal, handle it here
          // For now, just switching category is the baseline requirement.
      }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-black text-white md:h-screen md:overflow-hidden">
      {/* Sidebar - Fixed width, sticky or fixed behavior handled by flex layout */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} selectedCategory={selectedCategory} />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top Header */}
        <TopBar 
            onOpenSettings={() => setIsSettingsModalOpen(true)} 
            onNavigate={handleSearchNavigation}
        />

        {/* Scrollable Content Area */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto scrollbar-hide">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24 sm:pb-20">

                {/* Global Dashboard Header */}
                <div className="flex flex-col xl:grid xl:grid-cols-3 gap-6 items-start mt-4 sm:mt-8 mb-8 relative">
                    {/* Spacer for centering logic */}
                    <div className="hidden xl:block"></div>

                    <div className="flex justify-center w-full min-w-0 z-20">
                         <FloatingDock 
                            items={floatingDockItems}
                            desktopClassName=""
                         />
                    </div>

                    <div className="flex flex-col items-center xl:items-end gap-3 w-full z-10 pt-2">
                        <div className="w-auto">
                           <BloombergWidget />
                        </div>
                    {!['news', 'stocks', 'indices', 'forex', 'crypto', 'commodities', 'holdings-news', 'calendar', 'twitter-x', 'youtube-feed', 'ipo-calendar', 'earnings-calendar', 'insider-sentiment', 'insider-transactions', 'senate-lobbying', 'usa-spending', 'company-lookup'].includes(activeTab) && selectedCategory !== "Networth" && (
                        <div className="flex items-center gap-2">
                            {selectedCategory === "Real Estate" ? (
                                <button 
                                    onClick={() => setIsAddPropertyModalOpen(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Property
                                </button>
                            ) : selectedCategory === "Valuables" ? (
                                <button 
                                    onClick={() => setIsAddValuableItemModalOpen(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Add Item</span>
                                    <span className="sm:hidden">Add</span>
                                </button>
                            ) : selectedCategory === "Expenses" ? (
                                <button 
                                    onClick={() => setIsAddExpenseCategoryModalOpen(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Add Category</span>
                                    <span className="sm:hidden">Add</span>
                                </button>
                            ) : selectedCategory === "Liquid Assets" ? (
                                <>
                                    <button 
                                        onClick={() => setIsAddCashAccountModalOpen(true)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden sm:inline">Add Account</span>
                                        <span className="sm:hidden">Add</span>
                                    </button>
                                    <button 
                                        onClick={() => setIsAddIncomeModalOpen(true)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden sm:inline">Add Income</span>
                                        <span className="sm:hidden">Add</span>
                                    </button>
                                </>
                            ) : selectedCategory === "Crypto" ? (
                                <button 
                                    onClick={() => setIsAddCryptoModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors border border-gray-800"
                                >
                                    <Plus className="w-4 h-4 text-gray-400" />
                                    Add Position
                                </button>
                            ) : selectedCategory === "Stocks" ? (
                                <button 
                                    onClick={() => setIsAddStockModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors border border-gray-800"
                                >
                                    <Plus className="w-4 h-4 text-gray-400" />
                                    Add Position
                                </button>
                            ) : selectedCategory === "Taxes" ? (
                                <button 
                                    onClick={() => setIsAddTaxProfileModalOpen(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Profile
                                </button>
                            ) : null}
                        </div>
                    )}
                    </div>
                </div>

                {renderContent()}
            </div>
        </main>
      </div>
      
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />

      <AddCryptoPositionModal 
        isOpen={isAddCryptoModalOpen} 
        onClose={() => setIsAddCryptoModalOpen(false)} 
        onAdd={handleAddCryptoPosition}
      />

      <AddStockPositionModal 
        isOpen={isAddStockModalOpen} 
        onClose={() => setIsAddStockModalOpen(false)} 
        onAdd={handleAddStockPosition}
      />

      <AddPropertyModal 
        isOpen={isAddPropertyModalOpen} 
        onClose={() => setIsAddPropertyModalOpen(false)} 
        onAdd={handleAddProperty}
      />

      <AddValuableItemModal 
        isOpen={isAddValuableItemModalOpen} 
        onClose={() => setIsAddValuableItemModalOpen(false)} 
        onAdd={handleAddValuableItem}
      />

      <AddExpenseCategoryModal 
        isOpen={isAddExpenseCategoryModalOpen} 
        onClose={() => setIsAddExpenseCategoryModalOpen(false)} 
        onAdd={handleAddExpenseCategory}
      />

      <AddCashAccountModal 
        isOpen={isAddCashAccountModalOpen} 
        onClose={() => setIsAddCashAccountModalOpen(false)} 
        onAdd={handleAddCashAccount}
      />

      <AddIncomeModal 
        isOpen={isAddIncomeModalOpen} 
        onClose={() => setIsAddIncomeModalOpen(false)} 
        onAdd={handleAddIncome}
      />

      <AddGoalModal 
        isOpen={isAddGoalModalOpen} 
        onClose={() => setIsAddGoalModalOpen(false)} 
        onAdd={handleAddGoal}
      />

      <ImprovedTaxProfileModal 
        isOpen={isAddTaxProfileModalOpen} 
        onClose={() => setIsAddTaxProfileModalOpen(false)} 
        onSave={handleAddTaxProfile}
      />

      <AIChatAssistant theme="portfolio" />
    </div>
  );
}
// End of Portfolio Page
