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
import { Plus, ArrowUpRight, ShoppingCart, Repeat, ChevronDown } from 'lucide-react';

import { NewsFeed } from '../../components/portfolio/news-feed';
import { SettingsModal } from '../../components/settings/settings-modal';
import { AddCryptoPositionModal } from '../../components/portfolio/modals/add-crypto-position-modal';
import { AddStockPositionModal } from '../../components/portfolio/modals/add-stock-position-modal';
import { AddPropertyModal, RealEstateProperty } from '../../components/portfolio/modals/add-property-modal';
import { AddValuableItemModal, ValuableItem } from '../../components/portfolio/modals/add-valuable-item-modal';
import { AddExpenseCategoryModal, ExpenseCategory } from '../../components/portfolio/modals/add-expense-category-modal';
import { AddCashAccountModal, CashAccount } from '../../components/portfolio/modals/add-cash-account-modal';
import { ImprovedTaxProfileModal } from '../../components/financial/improved-tax-profile-modal';
import { TaxProfile } from '../../lib/types/tax-profile';
import { CryptoTransactionsView } from '../../components/portfolio/crypto-transactions-view';
import { StockTransactionsView } from '../../components/portfolio/stock-transactions-view';
import { CryptoAIAnalyticsView } from '../../components/portfolio/crypto-ai-analytics-view';
import { StockAIAnalyticsView } from '../../components/portfolio/stock-ai-analytics-view';
import { usePortfolioContext, CryptoHolding, StockHolding } from '../../contexts/portfolio-context';
import { SupabaseDataService } from '../../lib/supabase/supabase-data-service';
import { useAssetPrices } from '../../hooks/use-price';
import { getBrandColor } from '../../lib/brand-colors';

import { EconomicCalendar } from '../../components/portfolio/economic-calendar';

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
    // If we are in the Crypto section, we might want to pass specific props or 
    // rely on the component to detect the context. 
    // TotalWorthCard already access usePortfolioValues() hook which contains crypto,
    // but lets make it explicit if needed or just rely on the component logic.
    // However, the user specifically asked "this <div class='grid...'... " 
    // AND "for the crypto section should showcase users real crypto data".
    // The TotalWorthCard is fetching data from useFinancialData and usePortfolioValues.
    // If selectedCategory is "Crypto", we should probably instruct TotalWorthCard to display ONLY crypto data.

    const showAllocation = ["Networth", "Crypto", "Stocks"].includes(selectedCategory);

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
        'crypto': 'crypto'
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
  const [activeTab, setActiveTab] = useState('holdings-news');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("News");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddCryptoModalOpen, setIsAddCryptoModalOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  const [isAddValuableItemModalOpen, setIsAddValuableItemModalOpen] = useState(false);
  const [isAddExpenseCategoryModalOpen, setIsAddExpenseCategoryModalOpen] = useState(false);
  const [isAddCashAccountModalOpen, setIsAddCashAccountModalOpen] = useState(false);
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
        }
        return <OverviewView selectedCategory={selectedCategory} />;
      case 'calendar':
        return <EconomicCalendar />;
      case 'news':
      case 'holdings-news':
      case 'stocks':
      case 'indices':
      case 'forex':
      case 'crypto':
        return <NewsView activeTab={activeTab} />;
      default:
        return <OverviewView selectedCategory={selectedCategory} />;
    }
  };


  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar - Fixed width, sticky or fixed behavior handled by flex layout */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} selectedCategory={selectedCategory} />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header */}
        <TopBar onOpenSettings={() => setIsSettingsModalOpen(true)} />

        {/* Scrollable Content Area */}
        <main className="flex-1 p-8 overflow-y-auto scrollbar-hide">
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* Global Dashboard Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <div className="relative">
                            <button 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 text-blue-400 font-medium hover:text-blue-300 transition-colors"
                            >
                                {selectedCategory}
                                <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setIsDropdownOpen(false)} 
                                    />
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#1A1A1A] border border-gray-800 rounded-lg shadow-xl z-20 py-1 max-h-64 overflow-y-auto">
                                        {categories.map((category) => (
                                            <button
                                                key={category}
                                                onClick={() => {
                                                    if (category === "News") {
                                                        setActiveTab("news");
                                                        setSelectedCategory("News");
                                                    } else {
                                                        setSelectedCategory(category);
                                                        setActiveTab("overview");
                                                    }
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${
                                                    selectedCategory === category ? 'text-blue-400 bg-gray-800/50' : 'text-gray-300'
                                                }`}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {!['news', 'stocks', 'indices', 'forex', 'crypto', 'holdings-news', 'calendar'].includes(activeTab) && selectedCategory !== "Networth" && (
                        <div className="flex items-center gap-3">
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
                                <button 
                                    onClick={() => setIsAddCashAccountModalOpen(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Add Account</span>
                                    <span className="sm:hidden">Add</span>
                                </button>
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

      <ImprovedTaxProfileModal 
        isOpen={isAddTaxProfileModalOpen} 
        onClose={() => setIsAddTaxProfileModalOpen(false)} 
        onSave={handleAddTaxProfile}
      />

      <AIChatAssistant theme="portfolio" />
    </div>
  );
}
