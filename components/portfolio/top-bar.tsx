"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Settings, Bell, LogOut, ChevronDown, User, CreditCard, Shield, Building, Gem, Banknote, Bitcoin, TrendingUp } from "lucide-react";
import { useBetterAuth } from "../../contexts/better-auth-context";
import { PortfolioCurrencySelector } from "./currency-selector";
import { usePortfolioContext } from "../../contexts/portfolio-context";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { FancySearchBar, type SearchResult } from "../ui/fancy-search-bar";
import { Dock, DockIcon } from "../magicui/dock";
import { createPortal } from "react-dom";

interface TopBarProps {
  onOpenSettings?: () => void;
  onNavigate?: (type: string, id?: string) => void;
}

export function TopBar({ onOpenSettings, onNavigate }: TopBarProps) {
  const { user, logout } = useBetterAuth();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [valuableItems, setValuableItems] = useState<any[]>([]);
  const [realEstate, setRealEstate] = useState<any[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);

  // Get Holdings from Context (already realtime)
  const { cryptoHoldings, stockHoldings } = usePortfolioContext();

  // Load other searchable assets
  useEffect(() => {
    const fetchAssets = async () => {
        const [valuables, properties, cash] = await Promise.all([
            SupabaseDataService.getValuableItems(),
            SupabaseDataService.getRealEstate(),
            SupabaseDataService.getCashAccounts()
        ]);
        setValuableItems(valuables);
        setRealEstate(properties);
        setCashAccounts(cash);
    };
    fetchAssets();
  }, []);

  const handleEsc = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsSettingsOpen(false);
      setIsSearchFocused(false);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Filter Assets
  const filteredAssets = searchQuery.trim() === "" ? [] : [
      ...cryptoHoldings.map(h => ({ 
          id: h.id, type: 'crypto', label: h.name, subLabel: h.symbol, icon: Bitcoin, value: h.value 
      })),
      ...stockHoldings.map(h => ({ 
          id: h.id, type: 'stock', label: h.name, subLabel: h.symbol, icon: TrendingUp, value: h.value 
      })),
      ...valuableItems.map(i => ({ 
          id: i.id, type: 'valuable', label: i.name, subLabel: i.category, icon: Gem, value: i.currentValue || 0
      })),
      ...realEstate.map(p => ({ 
          id: p.id, type: 'real_estate', label: p.name, subLabel: p.propertyType, icon: Building, value: p.currentValue 
      })),
      ...cashAccounts.map(c => ({ 
          id: c.id, type: 'cash', label: c.name, subLabel: c.bank, icon: Banknote, value: c.balance 
      })),
  ].filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.subLabel && item.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 10); // Limit to 10 results

  const handleSelectAsset = (asset: any) => {
      setSearchQuery("");
      setIsSearchFocused(false);
      if (onNavigate) {
          onNavigate(asset.type, asset.id);
      }
  };

  return (
    <div className="flex h-16 items-center justify-between px-8 bg-black border-b border-gray-800 relative z-[100]">
        
      <div className="flex items-center gap-4">
         <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-700">
            <img 
                src={user?.avatarUrl || "/api/auth/avatar"} 
                alt="User" 
                className="h-full w-full object-cover"
            />
         </div>
         <span className="text-white font-medium">{user?.name || "User"}</span>
      </div>


      {/* Center - Search */}
      <div className="flex-1 max-w-xl mx-8 relative z-50">
        <FancySearchBar
            placeholder="Search..."
            value={searchQuery}
            onChange={setSearchQuery}
            suggestions={filteredAssets}
            onSelect={handleSelectAsset}
            onFocusChange={setIsSearchFocused}
        />
      </div>

      {/* Right - Stats & Settings */}
      <div className="flex items-center gap-6">

        <div className="hidden xl:block">
            <Dock direction="middle" className="border-none bg-transparent p-0 h-auto">
                <DockIcon>
                     <div className="h-full w-full flex items-center justify-center rounded-full bg-black border border-gray-800">
                         <PortfolioCurrencySelector iconOnly />
                     </div>
                </DockIcon>
                <DockIcon>
                    <div className="relative h-full w-full">
                        <button 
                            ref={settingsButtonRef}
                            className={`flex h-full w-full items-center justify-center rounded-full bg-black border border-gray-800 text-gray-300 hover:text-white hover:border-gray-600 transition-colors ${isSettingsOpen ? 'bg-gray-800 text-white border-gray-600' : ''}`}
                            title="Settings"
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        >
                            <Settings className="w-5 h-5" />
                        </button>

                        {isSettingsOpen && typeof document !== 'undefined' && createPortal(
                            <>
                            <div 
                                className="fixed inset-0 z-[200] bg-transparent" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSettingsOpen(false);
                                }} 
                            />
                             <div 
                                className="fixed w-64 bg-[#0D0D0D] border border-gray-800 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] z-[201] overflow-hidden ring-1 ring-white/10"
                                style={{
                                    top: settingsButtonRef.current ? settingsButtonRef.current.getBoundingClientRect().bottom + 8 : 0,
                                    right: settingsButtonRef.current ? window.innerWidth - settingsButtonRef.current.getBoundingClientRect().right : 0
                                }}
                            >
                                <div className="p-2 space-y-1">
                                    <button 
                                    onClick={() => {
                                        setIsSettingsOpen(false);
                                        if (onOpenSettings) {
                                            onOpenSettings();
                                        } else {
                                            router.push('/settings');
                                        }
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors group text-left"
                                    >
                                        <User className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                                        <span>Account Settings</span>
                                    </button>
                                    <Link 
                                    href="/billing" 
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors group"
                                    >
                                        <CreditCard className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                                        <span>Billing & Plans</span>
                                    </Link>
                                    <div className="h-px bg-gray-800 my-1 mx-2"></div>
                                    <Link 
                                    href="/terms" 
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors group"
                                    >
                                        <Shield className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                        <span>Terms & Conditions</span>
                                    </Link>
                                    <Link 
                                    href="/privacy" 
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors group"
                                    >
                                        <Shield className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                        <span>Privacy Policy</span>
                                    </Link>
                                </div>
                            </div>
                            </>,
                            document.body
                        )}
                    </div>
                </DockIcon>
                <DockIcon>
                     <button
                        onClick={logout}
                        className="flex h-full w-full items-center justify-center rounded-full bg-black border border-gray-800 text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
                        title="Sign out"
                        >
                        <LogOut className="w-5 h-5" />
                    </button>
                </DockIcon>
            </Dock>
        </div>

        {/* Mobile View - Fallback to regular buttons */}
        <div className="flex items-center gap-4 xl:hidden">
            <PortfolioCurrencySelector />
             <div className="relative">
                <button 
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-800 transition-colors min-h-touch ${isSettingsOpen ? 'bg-gray-800 text-white' : ''}`}
                    title="Settings"
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                >
                    <Settings className="w-5 h-5" />
                    <ChevronDown className={`w-4 h-4 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSettingsOpen && (
                    <>
                    <div 
                        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm cursor-default" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsSettingsOpen(false);
                        }} 
                    />
                    <div className="absolute top-full right-0 mt-2 w-64 bg-[#0D0D0D] border border-gray-800 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] z-[201] overflow-hidden ring-1 ring-white/10">
                        <div className="p-2 space-y-1">
                            <button 
                            onClick={() => {
                                setIsSettingsOpen(false);
                                if (onOpenSettings) {
                                    onOpenSettings();
                                } else {
                                    router.push('/settings');
                                }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors group text-left"
                            >
                                <User className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                                <span>Account Settings</span>
                            </button>
                            <Link 
                              href="/billing" 
                              onClick={() => setIsSettingsOpen(false)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors group"
                            >
                                <CreditCard className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                                <span>Billing & Plans</span>
                            </Link>
                            <div className="h-px bg-gray-800 my-1 mx-2"></div>
                            <Link 
                              href="/terms" 
                              onClick={() => setIsSettingsOpen(false)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors group"
                            >
                                 <Shield className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                <span>Terms & Conditions</span>
                            </Link>
                            <Link 
                              href="/privacy" 
                              onClick={() => setIsSettingsOpen(false)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors group"
                            >
                                <Shield className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                <span>Privacy Policy</span>
                            </Link>
                        </div>
                    </div>
                    </>
                )}
            </div>
            
            <button
                onClick={logout}
                className="inline-flex items-center px-2 sm:px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-300 hover:text-white hover:bg-gray-700"
                title="Sign out"
            >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign out</span>
            </button>
        </div>
      </div>
    </div>
  );
}
