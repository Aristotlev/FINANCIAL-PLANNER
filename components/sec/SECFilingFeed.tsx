'use client';

/**
 * SEC Filing Feed Component
 * Displays a chronological timeline of SEC filings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileText, Calendar, Building2, User, Loader2 } from 'lucide-react';

interface Form4Summary {
  totalBought: number;
  totalSold: number;
  totalValue: number;
  ownerTitle: string;
}

interface FilingItem {
  title: string;
  company: string;
  reportingPerson?: string;
  formType: string;
  formDescription: string;
  link: string;
  pubDate: string;
  pubDateFormatted: string;
  description: string;
  form4Summary?: Form4Summary;
}

interface FilingSection {
  title: string;
  content: string;
}

interface Form4Transaction {
  securityTitle: string;
  transactionDate: string;
  transactionCode: string;
  sharesAmount: number;
  pricePerShare?: number;
  sharesOwnedAfter: number;
  directOrIndirect: 'D' | 'I';
  isAcquisition: boolean;
}

interface Form4Filing {
  reportingOwner: {
    name: string;
    isDirector: boolean;
    isOfficer: boolean;
    officerTitle?: string;
    isTenPercentOwner: boolean;
  };
  transactions: Form4Transaction[];
}

interface FilingDetail {
  accessionNumber: string;
  form: string;
  filingDate: string;
  reportDate: string;
  sections?: FilingSection[];
  form4?: Form4Filing;
}

interface SECFilingFeedProps {
  initialFormType?: string;
  watchlistOnly?: boolean;
  refreshInterval?: number; // in seconds
  maxItems?: number;
  ticker?: string;
}

const FORM_TYPES = [
  { value: '', label: 'All Filings' },
  { value: '10-K', label: '10-K (Annual)' },
  { value: '10-Q', label: '10-Q (Quarterly)' },
  { value: '8-K', label: '8-K (Current)' },
  { value: '4', label: 'Form 4 (Insider)' },
  { value: '13F-HR', label: '13F (Holdings)' },
];

const getFormTypeColor = (formType: string): string => {
  const colors: Record<string, string> = {
    '10-K': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    '10-Q': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    '8-K': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    '4': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    '13F-HR': 'bg-green-500/20 text-green-400 border-green-500/30',
    '13F-NT': 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return colors[formType] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
};

const getFormTypeIcon = (formType: string): string => {
  const icons: Record<string, string> = {
    '10-K': '📊',
    '10-Q': '📈',
    '8-K': '📰',
    '4': '👤',
    '13F-HR': '🏦',
    '13F-NT': '🏦',
  };
  return icons[formType] || '📄';
};

export function SECFilingFeed({
  initialFormType = '',
  watchlistOnly = false,
  refreshInterval = 60,
  maxItems = 50,
  ticker,
}: SECFilingFeedProps) {
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formType, setFormType] = useState(initialFormType);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedFiling, setSelectedFiling] = useState<FilingItem | null>(null);
  const [filingDetails, setFilingDetails] = useState<FilingDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchFilings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (formType) params.set('formType', formType);
      if (ticker) params.set('ticker', ticker);
      params.set('limit', maxItems.toString());

      const response = await fetch(`/api/sec/feed?${params}`);
      if (!response.ok) throw new Error('Failed to fetch filings');

      const data = await response.json();
      setFilings(data.filings);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [formType, maxItems, ticker]);

  useEffect(() => {
    fetchFilings();
  }, [fetchFilings]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchFilings, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchFilings]);

  // Fetch details when a filing is selected
  useEffect(() => {
    if (selectedFiling) {
      const fetchDetails = async () => {
        setLoadingDetails(true);
        setFilingDetails(null);
        
        // Extract CIK and Accession Number from link
        // Link format: https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/0000320193-24-000123-index.htm
        const matches = selectedFiling.link.match(/data\/(\d+)\/.*\/(\d{10}-\d{2}-\d{6})/);
        
        if (matches && matches.length >= 3) {
          const cik = matches[1];
          // Sanitize accession number to remove any trailing characters (like :1)
          const accessionNumber = matches[2].split(':')[0];
          
          try {
            const res = await fetch(`/api/sec/filing-details?cik=${cik}&accessionNumber=${accessionNumber}`);
            if (res.ok) {
              const data = await res.json();
              setFilingDetails(data);
            }
          } catch (e) {
            console.error("Failed to fetch details", e);
          }
        }
        setLoadingDetails(false);
      };
      fetchDetails();
    }
  }, [selectedFiling]);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Clean up description for display
  const cleanDescription = (html: string) => {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');
    // Remove "Filed:" and "AccNo:" and "Size:" lines if present
    // Using [\s\S] to match across newlines instead of 's' flag for compatibility
    text = text.replace(/Filed:[\s\S]*?Size:[\s\S]*?(KB|MB)/, '');
    // Clean up whitespace
    return text.replace(/\s+/g, ' ').trim();
  };

  return (
    <>
      <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">SEC Filing Feed</h2>
                <p className="text-xs text-gray-400">
                  {lastUpdated && `Updated ${formatTimeAgo(lastUpdated.toISOString())}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-[#212121] text-gray-400'
                }`}
                title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={fetchFilings}
                disabled={loading}
                className="p-2 bg-[#212121] hover:bg-gray-700 rounded-lg text-gray-300 transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {FORM_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setFormType(type.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  formType === type.value
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                    : 'bg-[#212121] text-gray-400 hover:bg-gray-700 border border-transparent'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto">
          {loading && filings.length === 0 ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-gray-400">Loading filings...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchFilings}
                className="mt-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filings.map((filing, index) => (
                <motion.div
                  key={`${filing.link}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => setSelectedFiling(filing)}
                  className="block p-4 border-b border-gray-800 hover:bg-[#212121] transition-colors group cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl" role="img" aria-label={filing.formType}>
                      {getFormTypeIcon(filing.formType)}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getFormTypeColor(filing.formType)}`}>
                          {filing.formType}
                        </span>
                        <span className="text-sm text-gray-300 truncate">
                          {filing.company}{filing.reportingPerson ? ` • ${filing.reportingPerson}` : ''}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTimeAgo(filing.pubDate)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-400 mt-1 truncate">
                        {filing.formDescription}
                      </p>
                    </div>

                    <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800 bg-[#212121]">
          <p className="text-xs text-gray-500 text-center">
            Showing {filings.length} recent filings • Data from SEC EDGAR
          </p>
        </div>
      </div>

      {/* Context Window / Modal */}
      <AnimatePresence>
        {selectedFiling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1A1A1A] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-800 flex items-start justify-between bg-[#212121]">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-1 rounded-lg text-sm font-medium border ${getFormTypeColor(selectedFiling.formType)}`}>
                      {selectedFiling.formType}
                    </span>
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {selectedFiling.pubDateFormatted}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">{selectedFiling.company}</h2>
                  {selectedFiling.reportingPerson && (
                    <div className="flex items-center gap-2 text-cyan-400 text-sm">
                      <User className="w-4 h-4" />
                      <span>Filer: {selectedFiling.reportingPerson}</span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedFiling(null)}
                  className="p-2 hover:bg-[#1A1A1A] rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-6">
                  {/* TLDR Summary Section */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Filing Summary (TLDR)
                    </h3>
                    <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                      <p className="font-medium text-white">{selectedFiling.formDescription}</p>
                      
                      {/* Form 4 Insider Trading Details */}
                      {loadingDetails && (selectedFiling.formType === '4' || selectedFiling.formType === '4/A') ? (
                        <div className="mt-3 pt-3 border-t border-blue-500/20 flex items-center gap-2 text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading transaction details...</span>
                        </div>
                      ) : filingDetails?.form4 ? (
                        <div className="mt-3 pt-3 border-t border-blue-500/20">
                          {/* Summary Headline */}
                          {(() => {
                            const txs = filingDetails.form4.transactions;
                            const totalBought = txs.filter(t => t.transactionCode === 'P' || t.isAcquisition).reduce((sum, t) => sum + t.sharesAmount, 0);
                            const totalSold = txs.filter(t => t.transactionCode === 'S' || (!t.isAcquisition && t.transactionCode !== 'P')).reduce((sum, t) => sum + t.sharesAmount, 0);
                            const totalValue = txs.reduce((sum, t) => sum + (t.sharesAmount * (t.pricePerShare || 0)), 0);
                            const ownerName = filingDetails.form4.reportingOwner.name;
                            const title = filingDetails.form4.reportingOwner.officerTitle || (filingDetails.form4.reportingOwner.isDirector ? 'Director' : 'Insider');
                            
                            let summaryText = '';
                            if (totalBought > 0 && totalSold === 0) {
                              summaryText = `${ownerName} (${title}) acquired ${totalBought.toLocaleString()} shares`;
                              if (totalValue > 0) summaryText += ` worth $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                            } else if (totalSold > 0 && totalBought === 0) {
                              summaryText = `${ownerName} (${title}) sold ${totalSold.toLocaleString()} shares`;
                              if (totalValue > 0) summaryText += ` worth $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                            } else if (totalBought > 0 && totalSold > 0) {
                              summaryText = `${ownerName} (${title}) bought ${totalBought.toLocaleString()} and sold ${totalSold.toLocaleString()} shares`;
                            } else if (txs.length > 0) {
                              summaryText = `${ownerName} (${title}) reported ${txs.length} transaction(s)`;
                            } else {
                              summaryText = `${ownerName} (${title}) filed ownership changes`;
                            }
                            
                            return (
                              <div className="mb-4 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                                <p className="text-white font-medium text-base">{summaryText}</p>
                                {filingDetails.form4.transactions[0]?.sharesOwnedAfter > 0 && (
                                  <p className="text-gray-400 text-xs mt-1">
                                    Now owns {filingDetails.form4.transactions[0].sharesOwnedAfter.toLocaleString()} shares total
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                          
                          <div className="flex items-center gap-2 mb-3">
                            <User className="w-4 h-4 text-blue-400" />
                            <span className="font-medium text-white">
                              {filingDetails.form4.reportingOwner.name}
                            </span>
                                  <span className="text-xs text-gray-400 px-2 py-0.5 bg-[#212121] rounded-full border border-gray-800">
                                {filingDetails.form4.reportingOwner.officerTitle || (filingDetails.form4.reportingOwner.isDirector ? 'Director' : 'Insider')}
                            </span>
                            {filingDetails.form4.reportingOwner.isTenPercentOwner && (
                              <span className="text-xs text-yellow-400 px-2 py-0.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                                10%+ Owner
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Transaction Details</p>
                          <div className="space-y-3">
                            {filingDetails.form4.transactions.length > 0 ? (
                              filingDetails.form4.transactions.map((tx, i) => (
                                <div key={i} className="flex items-start justify-between text-sm bg-[#212121] p-3 rounded-lg border border-gray-800">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        tx.transactionCode === 'P' ? 'bg-green-500/20 text-green-400' : 
                                        tx.transactionCode === 'S' ? 'bg-red-500/20 text-red-400' :
                                        tx.transactionCode === 'A' ? 'bg-blue-500/20 text-blue-400' :
                                        tx.transactionCode === 'M' ? 'bg-purple-500/20 text-purple-400' :
                                        tx.transactionCode === 'G' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-gray-700 text-gray-300'
                                      }`}>
                                        {tx.transactionCode === 'P' ? 'Bought' : 
                                         tx.transactionCode === 'S' ? 'Sold' : 
                                         tx.transactionCode === 'A' ? 'Award' :
                                         tx.transactionCode === 'M' ? 'Exercise' :
                                         tx.transactionCode === 'G' ? 'Gift' :
                                         tx.transactionCode === 'F' ? 'Tax' :
                                         tx.transactionCode}
                                      </span>
                                      <span className="text-gray-300 font-medium">{tx.securityTitle}</span>
                                    </div>
                                    <div className="text-gray-400 text-xs">
                                      {new Date(tx.transactionDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="text-white font-mono">
                                      {tx.sharesAmount.toLocaleString()} shares
                                    </div>
                                    {tx.pricePerShare ? (
                                      <div className="text-gray-400 text-xs">
                                        @ ${tx.pricePerShare.toFixed(2)}
                                        <span className="ml-1 text-gray-500">
                                          (${(tx.sharesAmount * tx.pricePerShare).toLocaleString(undefined, { maximumFractionDigits: 0 })})
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-gray-500 text-xs">No price reported</div>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-400 italic">No non-derivative transactions reported.</p>
                            )}
                          </div>
                        </div>
                      ) : (selectedFiling.formType === '4' || selectedFiling.formType === '4/A') && selectedFiling.reportingPerson ? (
                        /* Show basic info from feed data while loading */
                        <div className="mt-3 pt-3 border-t border-blue-500/20">
                          <div className="mb-4 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                            {(() => {
                              const summary = selectedFiling.form4Summary;
                              if (summary) {
                                let action = '';
                                if (summary.totalBought > 0 && summary.totalSold === 0) {
                                  action = `acquired ${summary.totalBought.toLocaleString()} shares`;
                                  if (summary.totalValue > 0) action += ` worth $${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                                } else if (summary.totalSold > 0 && summary.totalBought === 0) {
                                  action = `sold ${summary.totalSold.toLocaleString()} shares`;
                                  if (summary.totalValue > 0) action += ` worth $${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                                } else if (summary.totalBought > 0 && summary.totalSold > 0) {
                                  action = `bought ${summary.totalBought.toLocaleString()} and sold ${summary.totalSold.toLocaleString()} shares`;
                                } else {
                                  action = 'filed ownership changes';
                                }
                                return (
                                  <p className="text-white font-medium text-base">
                                    {selectedFiling.reportingPerson} ({summary.ownerTitle}) {action}
                                  </p>
                                );
                              }
                              return (
                                <p className="text-white font-medium text-base">
                                  {selectedFiling.reportingPerson} filed an insider trading report for {selectedFiling.company}
                                </p>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-400" />
                            <span className="font-medium text-white">{selectedFiling.reportingPerson}</span>
                            {selectedFiling.form4Summary?.ownerTitle && (
                              <span className="text-xs text-gray-400 px-2 py-0.5 bg-[#212121] rounded-full border border-gray-800">
                                {selectedFiling.form4Summary.ownerTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Standard Item Extraction for other forms */
                        cleanDescription(selectedFiling.description) && (
                          <div className="mt-3 pt-3 border-t border-blue-500/20">
                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Contents</p>
                            <div className="text-gray-300">
                              {cleanDescription(selectedFiling.description).split('<br>').map((line, i) => (
                                <p key={i} className="mb-1">{line.replace(/Item \d+\.\d+:/, (match) => `• ${match}`)}</p>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* AI Analysis / Detailed Sections */}
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-8 text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      <span>Loading filing details...</span>
                    </div>
                  ) : filingDetails?.sections && filingDetails.sections.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        Key Sections
                      </h3>
                      {filingDetails.sections.map((section, idx) => (
                        <div key={idx} className="bg-[#212121] rounded-lg p-4 border border-gray-800">
                          <h4 className="text-blue-300 font-medium mb-2">{section.title}</h4>
                          <p className="text-gray-400 text-sm line-clamp-6 hover:line-clamp-none transition-all cursor-pointer">
                            {section.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Additional Context */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      About this Filing
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      This is a <strong>{selectedFiling.formType}</strong> filing submitted to the SEC. 
                      {selectedFiling.formType === '8-K' && " This form is used to notify investors of specific events that may be important to shareholders or the SEC."}
                      {selectedFiling.formType === '10-K' && " This is an annual report that provides a comprehensive summary of the company's financial performance."}
                      {selectedFiling.formType === '10-Q' && " This is a quarterly report that includes unaudited financial statements and provides a continuing view of the company's financial position."}
                      {selectedFiling.formType === '4' && " This form is filed to report changes in beneficial ownership of securities (insider trading)."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-800 bg-[#212121] flex justify-end">
                <a 
                  href={selectedFiling.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                >
                  View Full Filing on SEC.gov
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SECFilingFeed;
