"use client";

import React, { useState, useCallback } from 'react';
import { 
  CashCard, 
  SavingsCard, 
  CryptoCard, 
  StocksCard, 
  ExpensesCard, 
  ValuableItemsCard, 
  TradingAccountCard,
  NetWorthCard,
  RealEstateCard,
  ToolsCard,
  NewsCard,
  TaxesCard
} from "./financial/financial-cards";
import { useBetterAuth } from '../contexts/better-auth-context';
import { LayoutDashboard, Search, Bell, Settings, Database, LogOut, Download, Upload, Save, Trash2, User, Users, Moon, Sun, Bot, ChevronDown, Key, Bitcoin, TrendingUp, DollarSign, Building, BarChart3, Plug, RotateCcw, Shield, CreditCard, Lock, X } from "lucide-react";
import Link from 'next/link';
import AccountSettingsForm from './settings/account-settings-form';
import { AIChatAssistant } from './ui/ai-chat';
import { CurrencySelector } from './ui/currency-selector';
import { BackgroundBeams } from './ui/background-beams';
import { DataService } from '../lib/data-service';
import { HiddenCardsFolder } from './ui/hidden-cards-folder';
import { DraggableCardWrapper } from './ui/draggable-card-wrapper';
import { CardOrderPanel } from './ui/card-order-panel';
import { useHiddenCards, CardType } from '../contexts/hidden-cards-context';
import { useCardOrder } from '../contexts/card-order-context';
import { useImportExportLimit } from '../hooks/use-subscription';
import { useTranslation } from '../contexts/translation-context';
import { GPUOptimizedWrapper } from './ui/gpu-optimized-wrapper';
import { LanguageSelector } from './ui/language-selector';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF interface to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function Dashboard() {
  const { user, logout } = useBetterAuth();
  const { isCardHidden } = useHiddenCards();
  const { cardOrder } = useCardOrder();
  const { canUse: canUseImportExport, limitInfo: importExportLimitInfo } = useImportExportLimit();
  const { t } = useTranslation();
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showApiKeysMenu, setShowApiKeysMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [openApiCategory, setOpenApiCategory] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isZooming, setIsZooming] = useState(false);
  const [showZoomHint, setShowZoomHint] = useState(false);
  const [showCardOrderPanel, setShowCardOrderPanel] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);

  // NOTE: Total assets calculation removed - each card now shows its own real data
  // Net worth will aggregate from individual cards when they have data

  // Auto-create portfolio snapshots for historical tracking (once per day)
  // Portfolio snapshots are now handled by useEnhancedTimeTracking in PortfolioContext
  // This prevents duplicate snapshot creation
  React.useEffect(() => {
    if (!user?.id) return;
    // Snapshot tracking is managed by the PortfolioContext via useEnhancedTimeTracking
  }, [user?.id]);

  // Last saved is now tracked via Supabase operations
  // No localStorage polling needed

  // Show zoom hint instantly when user logs in
  React.useEffect(() => {
    if (user) {
      // Check if user has seen zoom hint this session
      const hasSeenThisSession = sessionStorage.getItem('moneyHub_zoomHintShownThisSession');
      
      if (!hasSeenThisSession) {
        // Show immediately when user logs in
        setShowZoomHint(true);
        
        // Auto-hide after 8 seconds
        const hideTimer = setTimeout(() => {
          setShowZoomHint(false);
          sessionStorage.setItem('moneyHub_zoomHintShownThisSession', 'true');
        }, 8000);
        
        return () => clearTimeout(hideTimer);
      }
    }
  }, [user]);

  // Memoized reset handlers
  const resetCardPositions = useCallback(() => {
    const event = new CustomEvent('resetCardPositions');
    window.dispatchEvent(event);
    setResetTrigger(prev => prev + 1);
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1.0);
  }, []);

  // Add keyboard shortcut for reset layout (Command+Z or Ctrl+Z)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Command+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        resetCardPositions();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetCardPositions]);

  // Smooth wheel-based zoom with momentum - optimized with requestAnimationFrame
  React.useEffect(() => {
    let rafId: number | null = null;
    let isZoomingTimeout: NodeJS.Timeout;
    
    const handleWheel = (e: WheelEvent) => {
      // Check if Ctrl/Cmd key is pressed for zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        if (rafId) return;

        setIsZooming(true);
        clearTimeout(isZoomingTimeout);
        
        rafId = requestAnimationFrame(() => {
          // Calculate zoom delta - smoother increments
          const delta = -e.deltaY * 0.001;
          
          setZoomLevel(prevZoom => {
            const newZoom = prevZoom * (1 + delta);
            return Math.max(0.5, Math.min(1.0, newZoom));
          });
          
          rafId = null;
        });
        
        // Reset zooming state after animation completes
        isZoomingTimeout = setTimeout(() => setIsZooming(false), 150);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(isZoomingTimeout);
    };
  }, []);

  const exportDataAsJSON = useCallback(() => {
    try {
      const data = DataService.exportAllData();
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `omnifolio-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setShowDataMenu(false);
    } catch (error) {
      console.error('Export error:', error);
    }
  }, []);

  const exportDataAsPDF = useCallback(() => {
    try {
      const data = DataService.exportAllData();
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const currentDate = new Date().toLocaleDateString();
      let yPosition = 20;

      doc.setFontSize(20);
      doc.text('OmniFolio - Portfolio Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      doc.setFontSize(12);
      doc.text(`Generated: ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
      
      const totalCash = data.CASH_ACCOUNTS?.reduce((sum: number, account: any) => sum + (account.balance || 0), 0) || 0;
      const totalStocks = data.STOCK_HOLDINGS?.reduce((sum: number, stock: any) => sum + (stock.value || 0), 0) || 0;
      const totalCrypto = data.CRYPTO_HOLDINGS?.reduce((sum: number, crypto: any) => sum + (crypto.value || 0), 0) || 0;
      const totalNetWorth = totalCash + totalStocks + totalCrypto;

      yPosition += 20;
      doc.setFontSize(16);
      doc.text('Portfolio Summary', 14, yPosition);
      yPosition += 10;

      autoTable(doc, {
        body: [
          ['Cash', `$${totalCash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
          ['Stocks', `$${totalStocks.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
          ['Crypto', `$${totalCrypto.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
          ['Net Worth', `$${totalNetWorth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ],
        startY: yPosition,
        theme: 'plain',
      });

      doc.save(`omnifolio-portfolio-${new Date().toISOString().split('T')[0]}.pdf`);
      setShowDataMenu(false);
    } catch (error) {
      console.error('PDF Export error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  }, []);

  const importData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        DataService.importAllData(data);
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  const clearAllData = useCallback(async () => {
    if (window.confirm('Clear all data? This cannot be undone.')) {
      try {
        // Import SupabaseDataService dynamically to avoid circular dependencies
        const { SupabaseDataService } = await import('../lib/supabase/supabase-data-service');
        
        // Clear all data from both Supabase and localStorage
        await SupabaseDataService.clearAllData();
        
        // Force reload to reset all state
        window.location.reload();
      } catch (error) {
        console.error('Error clearing data:', error);
        // Fallback to just clearing localStorage
        DataService.clearAllData();
        window.location.reload();
      }
    }
  }, []);

  // Memoized helper function to render the appropriate card component based on cardId
  const renderCard = useCallback((cardId: CardType) => {
    switch (cardId) {
      case 'cash':
        return <CashCard />;
      case 'savings':
        return <SavingsCard />;
      case 'crypto':
        return <CryptoCard userName={user?.name || 'User'} />;
      case 'stocks':
        return <StocksCard userName={user?.name || 'User'} />;
      case 'networth':
        return <NetWorthCard userName={user?.name || 'User'} />;
      case 'tools':
        return <ToolsCard />;
      case 'news':
        return <NewsCard />;
      case 'realestate':
        return <RealEstateCard />;
      case 'trading':
        return <TradingAccountCard />;
      case 'valuableitems':
        return <ValuableItemsCard />;
      case 'expenses':
        return <ExpensesCard />;
      case 'taxes':
        return <TaxesCard />;
      default:
        return null;
    }
  }, []);

  return (
    <div className="min-h-screen h-full bg-black dark:bg-black relative overflow-hidden">
      {/* Zoom Hint Overlay */}
      <div 
        className={`fixed inset-0 z-[9999] pointer-events-none transition-opacity duration-1000 ${
          showZoomHint ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 backdrop-blur-xl border-2 border-purple-500/50 rounded-2xl p-8 shadow-2xl max-w-md">
          <div className="text-center space-y-4">
            <div className="text-4xl mb-2">🖱️</div>
            <h3 className="text-2xl font-bold text-white">{t('dashboard.zoomHint')}</h3>
            <p className="text-gray-300 text-lg">
              {t('dashboard.zoomInstruction')}
            </p>
            <p className="text-gray-400 text-sm">
              Zoom from 50% to 100% smoothly
            </p>
            <div className="pt-2 text-xs text-gray-500">
              This hint will only show once
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed top-2 sm:top-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center justify-center space-x-2 sm:space-x-4 flex-wrap sm:flex-nowrap gap-2 sm:gap-0">
              {/* Zoom Indicator - Shows during zoom, fades out when idle */}
              <div 
                className={`hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-800/80 dark:bg-gray-900/80 backdrop-blur-md rounded-lg border border-gray-700 shadow-lg transition-all duration-300 ${
                  isZooming || zoomLevel !== 1.0 
                    ? 'opacity-100 scale-100' 
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className="text-xs font-medium text-gray-300">
                  {Math.round(zoomLevel * 100)}%
                </div>
                {zoomLevel !== 1.0 && (
                  <button
                    onClick={resetZoom}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    title="Reset to 100%"
                  >
                    Reset
                  </button>
                )}
              </div>
              
              {/* Currency Selector */}
              <CurrencySelector />
              
              {/* Language Selector */}
              <LanguageSelector />
              
              {/* Hidden Cards Folder */}
              <HiddenCardsFolder />

              {/* Reset Card Positions Button */}
              <button 
                onClick={resetCardPositions}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-700 transition-colors relative group min-h-touch"
                title={t('dashboard.resetLayout')}
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm hidden lg:inline">{t('dashboard.resetLayout')}</span>
                <span className="text-xs text-gray-400 ml-1 hidden xl:inline">(⌘Z)</span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-gray-700">
                  <div className="font-semibold mb-1">{t('dashboard.resetLayout')}: ⌘Z / Ctrl+Z</div>
                  <div className="text-gray-400">{t('dashboard.zoomInstruction')}</div>
                </span>
              </button>
              
              {/* Community Page Link */}
              <Link 
                href="/community"
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-700 transition-colors min-h-touch"
                title={t('dashboard.community')}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm hidden lg:inline">{t('dashboard.community')}</span>
              </Link>

              {/* Data Management Dropdown */}
              <div className="relative hidden md:block">
                <button 
                  onClick={() => setShowDataMenu(!showDataMenu)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-700 transition-colors min-h-touch"
                  title={t('dashboard.data')}
                >
                  <Database className="w-4 h-4" />
                  <span className="text-sm hidden lg:inline">{t('dashboard.data')}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDataMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showDataMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-[10001]" 
                      onClick={() => setShowDataMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[10002]">
                      {/* Stats Section */}
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Save className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {t('dashboard.autoSaveActive')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lastSaved ? t('dashboard.lastSaved', { time: lastSaved.toLocaleString() }) : t('dashboard.noDataSaved')}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="p-2">
                        {canUseImportExport ? (
                          <>
                            <button
                              onClick={exportDataAsJSON}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            >
                              <Download className="w-4 h-4 text-blue-500" />
                              <span>{t('dashboard.exportJSON')}</span>
                            </button>
                            
                            <button
                              onClick={exportDataAsPDF}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            >
                              <Download className="w-4 h-4 text-green-500" />
                              <span>{t('dashboard.exportPDF')}</span>
                            </button>
                            
                            <label className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors">
                              <Upload className="w-4 h-4 text-green-500" />
                              <span>{t('dashboard.importBackup')}</span>
                              <input
                                type="file"
                                accept=".json"
                                onChange={importData}
                                className="hidden"
                              />
                            </label>
                          </>
                        ) : (
                          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Lock className="w-4 h-4 text-purple-400" />
                              <span className="text-sm font-medium text-purple-300">{t('dashboard.upgradeRequired')}</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">
                              {t('dashboard.upgradeDescription')}
                            </p>
                            <a
                              href="/pricing"
                              className="block w-full text-center py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
                            >
                              {t('dashboard.viewPlans')}
                            </a>
                          </div>
                        )}
                        
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                        
                        <button
                          onClick={clearAllData}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{t('dashboard.clearAllData')}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Settings Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-700 transition-colors min-h-touch"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSettingsMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showSettingsMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-[10001]" 
                      onClick={() => setShowSettingsMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[10002]">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            setShowAccountSettingsModal(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <User className="w-4 h-4 text-blue-500" />
                          <span>{t('dashboard.accountSettings')}</span>
                        </button>

                        <a
                          href="/billing"
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <CreditCard className="w-4 h-4 text-green-500" />
                          <span>{t('dashboard.billingPlans')}</span>
                        </a>
                        
                        <a
                          href="/terms"
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <Shield className="w-4 h-4 text-blue-500" />
                          <span>{t('dashboard.termsConditions')}</span>
                        </a>
                        
                        <a
                          href="/privacy"
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <Shield className="w-4 h-4 text-purple-500" />
                          <span>{t('dashboard.privacyPolicy')}</span>
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-600 flex-shrink-0">
                <img 
                  key={user?.avatarUrl}
                  src={user?.avatarUrl || '/api/auth/avatar'} 
                  alt={user?.name || 'User avatar'}
                  className="w-full h-full object-cover"
                  onLoad={() => {
                    console.log('✅ Avatar image loaded successfully:', user?.avatarUrl);
                  }}
                  onError={(e) => {
                    console.error('❌ Avatar image failed to load:', user?.avatarUrl);
                    console.error('Error event:', e);
                    e.currentTarget.src = '/api/auth/avatar';
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-200 dark:text-gray-300 hidden md:inline truncate max-w-[150px] lg:max-w-[200px]">
                {user?.name || 'User'}
              </span>
              
              <button
                onClick={logout}
                className="inline-flex items-center px-2 sm:px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-200 hover:bg-gray-700 dark:hover:bg-gray-800 min-h-touch"
                title={t('dashboard.signOut')}
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('dashboard.signOut')}</span>
              </button>
            </div>

      {/* Animated Background - Fixed outside zoom container */}
      <BackgroundBeams />

      {/* Main Dashboard */}
      <div 
        className="pt-20 sm:pt-32 pb-8 px-2 sm:px-4 relative z-10 flex items-center justify-center min-h-screen"
        data-dashboard-zoom-container
        style={{ 
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isZooming ? 'transform 0.05s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
          willChange: isZooming ? 'transform' : 'auto'
        }}
      >
        
        <div className="container mx-auto px-2 sm:px-4">
          {/* All Financial Cards - Dynamic Order with Drag-and-Drop */}
          <GPUOptimizedWrapper estimatedHeight="800px" className="flex flex-wrap gap-4 sm:gap-6 justify-center py-4 px-2">
            {cardOrder.map(cardId => {
              if (isCardHidden(cardId)) return null;
              
              return (
                <DraggableCardWrapper key={cardId} cardId={cardId}>
                  {renderCard(cardId)}
                </DraggableCardWrapper>
              );
            })}
          </GPUOptimizedWrapper>
        </div>
      </div>

      {/* AI Chat Assistant with Voice */}
      <AIChatAssistant />

      {/* Account Settings Modal */}
      {showAccountSettingsModal && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAccountSettingsModal(false)}>
          <div className="relative w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowAccountSettingsModal(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white">Account Settings</h2>
              <p className="text-gray-300">Manage your account information and profile.</p>
            </div>

            <AccountSettingsForm />
          </div>
        </div>
      )}

      {/* Card Order Panel */}
      <CardOrderPanel 
        isOpen={showCardOrderPanel}
        onClose={() => setShowCardOrderPanel(false)}
      />
    </div>
  );
}
