"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Settings, Bell, LogOut, ChevronDown, User, CreditCard, Shield, Users, FileText } from "lucide-react";
import { useBetterAuth } from "../../contexts/better-auth-context";
import { PortfolioCurrencySelector } from "./currency-selector";
import { LanguageSelector } from "../ui/language-selector";

interface TopBarProps {
  onOpenSettings?: () => void;
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const { user, logout } = useBetterAuth();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="flex h-16 items-center justify-between px-8 bg-black border-b border-gray-800 relative z-[100]">
        {/* Left side - User Name (from image) */}
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
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Assets, Wallets, ENS"
            className="w-full rounded-full bg-[#1A1A1A] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-gray-800"
          />
        </div>
      </div>

      {/* Right - Stats & Settings */}
      <div className="flex items-center gap-6">
        <Link 
          href="/community" 
          className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
          title="Community"
        >
          <Users className="w-5 h-5" />
          <span className="hidden xl:inline text-sm font-medium">Community</span>
        </Link>
        <Link 
          href="/markets/sec" 
          className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
          title="SEC Edgar Scraper"
        >
          <FileText className="w-5 h-5" />
          <span className="hidden xl:inline text-sm font-medium">SEC Scraper</span>
        </Link>

        <PortfolioCurrencySelector />

        <LanguageSelector />
        
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

        <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-700">
          <img 
            src={user?.avatarUrl || "/api/auth/avatar"} 
            alt="User" 
            className="h-full w-full object-cover"
          />
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
  );
}
