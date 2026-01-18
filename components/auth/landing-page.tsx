"use client";

import React, { useState, useEffect } from 'react';
import {
  CommandIcon,
  Blockchain02Icon,
  LockKeyIcon,
  ArrowRight01Icon,
  PlayCircle02Icon,
  ChartIncreaseIcon,
  Building02Icon,
  Coins01Icon,
  ChartLineData01Icon,
  BotIcon,
  SparklesIcon,
  UserGroupIcon,
  BankIcon,
  Database01Icon,
  File01Icon,
  CheckmarkCircle01Icon,
  FingerPrintIcon,
  Globe02Icon,
} from 'hugeicons-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';

// Dynamically import components to avoid circular dependencies and reduce bundle size
const OmnifolioLogo = dynamic(() => import('@/components/ui/omnifolio-logo').then(mod => mod.OmnifolioLogo), {
  loading: () => <div className="w-10 h-10" />
});

const AuthModal = dynamic(() => import('./auth-modal').then(mod => mod.AuthModal), {
  ssr: false,
  loading: () => null
});

export function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const openLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const openSignup = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const trustedCompanies = ["Gemini", "Google Cloud", "Yahoo Finance", "CoinGecko", "CoinMarketCap", "Finnhub", "TradingView", "Binance", "FMP", "SEC EDGAR® Data"];

  return (
    <div className="min-h-screen bg-[#0B0C10] text-gray-300 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        {/* Abstract Background Gradients - Adjusted for Dark Cyan Theme */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-950/20 rounded-full blur-[150px]" />
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-teal-900/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-emerald-900/10 rounded-full blur-[150px]" />
        </div>

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0B0C10]/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <OmnifolioLogo size="sm" />
              </div>

              <nav className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-sm font-medium hover:text-white transition-colors">Features</a>
                <a href="#pro-features" className="text-sm font-medium hover:text-white transition-colors">Pro</a>
                <a href="#pricing" className="text-sm font-medium hover:text-white transition-colors">Pricing</a>
              </nav>

              <div className="flex items-center gap-4">
                <button onClick={openLogin} className="text-sm font-medium hover:text-white transition-colors">
                  Log in
                </button>
                <button
                  onClick={openSignup}
                  className="px-4 py-2 bg-white text-black hover:bg-gray-200 rounded-full text-sm font-medium transition-all"
                >
                  Sign up
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 pt-32">
          {/* Hero Section */}
          <section className="px-4 sm:px-6 lg:px-8 mb-32">
            <div className="max-w-7xl mx-auto text-center">
              <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-cyan-950/30 border border-cyan-500/20 text-xs font-semibold text-cyan-400 mb-8 animate-fade-in-out">
                 <div className="flex items-center gap-1"><CommandIcon size={14} className="animate-pulse" /> 100% Open Source</div>
                 <div className="w-1 h-1 rounded-full bg-cyan-500/50" />
                 <div className="flex items-center gap-1"><Blockchain02Icon size={14} /> Decentralized</div>
                 <div className="w-1 h-1 rounded-full bg-cyan-500/50" />
                 <div className="flex items-center gap-1"><LockKeyIcon size={14} /> Encrypted</div>
              </div>
              
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-8">
                Master your <br />
                <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                  Digital Worth
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                The all-in-one platform for tracking cash, crypto, stocks, and valuables. 
                Experience financial clarity with real-time analytics and Omni Gemini AI.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                <button
                  onClick={openSignup}
                  className="w-full sm:w-auto px-8 py-4 bg-cyan-500 text-black rounded-full text-lg font-medium hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)]"
                >
                  Start for free <ArrowRight01Icon className="w-4 h-4" />
                </button>
                <button className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-lg font-medium text-white transition-all flex items-center justify-center gap-2">
                  <PlayCircle02Icon className="w-4 h-4" /> Watch demo
                </button>
              </div>

              {/* Hero Dashboard Preview */}
              <div className="relative max-w-6xl mx-auto rounded-xl border border-white/10 bg-[#15161A] shadow-2xl overflow-hidden group">
                {/* Glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 blur-sm group-hover:opacity-100 transition-opacity" />
                
                {/* Simulated Window UI */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#1A1B20]">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <div className="flex-1 text-center text-xs text-gray-500 font-mono">omnifolio.app</div>
                </div>

                {/* Main Dashboard Placeholder / Screenshot */}
                <div className="aspect-[16/10] bg-[#0F1014] relative overflow-hidden flex items-center justify-center group-hover:scale-[1.01] transition-transform duration-700">
                  {/* Replace this div with an actual Image component when you have the screenshot */}
                  {/* <Image src="/images/dashboard-hero.png" alt="Dashboard" fill className="object-cover" /> */}
                  
                  {/* Placeholder UI for now */}
                   <div className="absolute inset-0 bg-gradient-to-br from-[#121318] to-black p-8 flex flex-col">
                      <div className="flex justify-between items-end mb-8">
                        <div>
                           <p className="text-sm text-gray-500 mb-1">Total Net Worth</p>
                           <h2 className="text-5xl font-bold text-white tracking-tight">$1,247,892.45</h2>
                        </div>
                        <div className="flex gap-2 text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full text-sm font-medium">
                          <ChartIncreaseIcon className="w-4 h-4" /> +12.4%
                        </div>
                      </div>
                      
                      {/* Grid representation */}
                      <div className="grid grid-cols-12 gap-6 h-full">
                        <div className="col-span-8 bg-[#1A1B20]/50 rounded-lg border border-white/5 p-6 relative overflow-hidden">
                           <div className="flex justify-between mb-6">
                              <h3 className="text-white font-medium">Portfolio Performance</h3>
                              <div className="flex gap-2">
                                <span className="px-3 py-1 rounded-full bg-white/5 text-xs text-gray-400">1D</span>
                                <span className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">1W</span>
                                <span className="px-3 py-1 rounded-full bg-white/5 text-xs text-gray-400">1M</span>
                              </div>
                           </div>
                           {/* Chart placeholder */}
                           <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-cyan-500/10 to-transparent" />
                           <svg className="w-full h-48 stroke-cyan-500 stroke-2 fill-none" viewBox="0 0 400 100" preserveAspectRatio="none">
                              <path d="M0,80 C50,80 50,40 100,50 C150,60 150,20 200,30 C250,40 250,10 300,20 C350,30 350,0 400,10" />
                           </svg>
                        </div>
                        <div className="col-span-4 flex flex-col gap-4">
                           <div className="flex-1 bg-[#1A1B20]/50 rounded-lg border border-white/5 p-4">
                              <div className="flex items-center gap-3 mb-2">
                                 <div className="p-2 bg-cyan-500/10 rounded-md"><Building02Icon className="w-4 h-4 text-cyan-400"/></div>
                                 <span className="text-sm text-gray-300">Real Estate</span>
                              </div>
                              <p className="text-2xl font-semibold text-white">$650,000</p>
                           </div>
                           <div className="flex-1 bg-[#1A1B20]/50 rounded-lg border border-white/5 p-4">
                              <div className="flex items-center gap-3 mb-2">
                                 <div className="p-2 bg-purple-500/10 rounded-md"><Coins01Icon className="w-4 h-4 text-purple-400"/></div>
                                 <span className="text-sm text-gray-300">Crypto</span>
                              </div>
                              <p className="text-2xl font-semibold text-white">$89,340</p>
                           </div>
                           <div className="flex-1 bg-[#1A1B20]/50 rounded-lg border border-white/5 p-4">
                              <div className="flex items-center gap-3 mb-2">
                                 <div className="p-2 bg-green-500/10 rounded-md"><ChartLineData01Icon className="w-4 h-4 text-green-400"/></div>
                                 <span className="text-sm text-gray-300">Stocks</span>
                              </div>
                              <p className="text-2xl font-semibold text-white">$456,780</p>
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
              </div>

              {/* Trusted by */}
              <div className="mt-20 pt-10 border-t border-white/5">
                <p className="text-sm font-bold text-center text-white tracking-widest mb-12">POWERED BY</p>
                <div className="relative flex overflow-x-hidden group [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
                  <div className="flex flex-nowrap animate-scroll [animation-duration:60s] hover:[animation-play-state:paused] opacity-50 grayscale group-hover:grayscale-0 transition-all duration-500">
                    <div className="flex items-center gap-x-20 shrink-0 pr-20">
                      {trustedCompanies.map((company) => (
                        <span key={company} className="text-2xl md:text-3xl font-bold whitespace-nowrap">{company}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-x-20 shrink-0 pr-20">
                      {trustedCompanies.map((company) => (
                        <span key={`clone-${company}`} className="text-2xl md:text-3xl font-bold whitespace-nowrap">{company}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bento Grid Features Section */}
          <section id="features" className="px-4 sm:px-6 lg:px-8 py-32 border-t border-white/5">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 text-center md:text-left">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Everything you need to <br/>track your wealth</h2>
                <p className="text-xl text-gray-400 max-w-2xl">
                   Built for the modern investor with 100% transparency and privacy.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-6">
                
                {/* Live Market Intelligence */}
                <div className="md:col-span-2 row-span-1 bg-[#15161A] border border-white/5 rounded-3xl p-6 relative overflow-hidden group flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                     <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Globe02Icon className="w-6 h-6 text-cyan-400" />
                     </div>
                     <h3 className="text-xl font-bold text-white mb-2">Market Intelligence</h3>
                     <p className="text-gray-400 text-sm leading-relaxed mb-4">
                        Real-time news & sentiment analysis.
                     </p>
                  </div>
                  
                  <div className="flex-1 relative h-[250px] md:h-auto flex items-center">
                       <div className="absolute right-0 w-[120%] h-auto aspect-video bg-[#0B0C10] rounded-xl border border-white/10 shadow-2xl overflow-hidden transform rotate-6 hover:rotate-2 transition-all duration-500 origin-center translate-x-12 hover:translate-x-8 group-hover:scale-105">
                          <Image 
                            src="/images/newsfeed.png" 
                            alt="Live Market News Feed" 
                            fill 
                            className="object-cover object-top-left"
                            priority
                          />
                      </div>
                  </div>
                </div>

                {/* Unified Asset Tracking - Re-added below */}
                <div className="md:col-span-2 row-span-1 bg-[#15161A] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                   <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                              <Coins01Icon className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-white/5 text-emerald-400 border border-emerald-500/20">Unified Dashboard</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Asset Segmentation</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                             Track Cash, Crypto, Stocks, and Real Estate in one view.
                        </p>
                      </div>
                      
                      <div className="mt-6 flex gap-3">
                          <div className="bg-[#0B0C10] px-3 py-2 rounded-lg border border-white/5 flex items-center gap-2 flex-1">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              <div>
                                  <div className="text-[10px] text-gray-500 uppercase">Crypto</div>
                                  <div className="text-xs text-white font-mono">$42.5k</div>
                              </div>
                          </div>
                          <div className="bg-[#0B0C10] px-3 py-2 rounded-lg border border-white/5 flex items-center gap-2 flex-1">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <div>
                                  <div className="text-[10px] text-gray-500 uppercase">Stocks</div>
                                  <div className="text-xs text-white font-mono">$128k</div>
                              </div>
                          </div>
                      </div>
                   </div>
                </div>

                {/* Curated Social Feed - Promoted to 2 cols */}
                <div className="md:col-span-2 bg-[#15161A] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-colors" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row h-full gap-8">
                         <div className="flex-1 flex flex-col justify-center">
                            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-6">
                                <PlayCircle02Icon className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Social Intelligence</h3>
                            <p className="text-gray-400 text-base leading-relaxed mb-6">
                                Access "Viral Finance" YouTube feed, filtered Twitter insights, and market news in one place.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"/> YouTube Feed</span>
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full"/> X (Twitter)</span>
                            </div>
                         </div>
                         <div className="flex-1 relative flex items-center min-h-[250px]">
                            <div className="absolute right-0 w-[120%] h-auto aspect-video bg-[#0B0C10] rounded-xl border border-white/10 shadow-2xl overflow-hidden transform rotate-6 hover:rotate-2 transition-all duration-500 origin-center translate-x-12 hover:translate-x-8 group-hover:scale-105">
                                <Image 
                                    src="/images/viral-finance-feed.png" 
                                    alt="Viral Finance YouTube Feed" 
                                    fill 
                                    className="object-cover object-top"
                                    priority
                                />
                            </div>
                         </div>
                    </div>
                </div>

                {/* Omni Gemini AI - Demoted to 1 col */}
                <div className="bg-[#15161A] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="relative z-10 flex flex-col h-full justify-between">
                     <div>
                        <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                            <BotIcon className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Omni Gemini AI</h3>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            Powered by Google's Gemini 2.0. Analyze portfolio health and get projections.
                        </p>
                     </div>
                  </div>
                </div>

                {/* Gov & Deep Data */}
                <div className="bg-[#15161A] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                   <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
                      <BankIcon className="w-5 h-5 text-cyan-400" />
                   </div>
                   <h3 className="text-lg font-bold text-white mb-2">Gov Contracts</h3>
                   <p className="text-gray-400 text-xs leading-relaxed">
                      Track Senate Lobbying, Insider Transactions, and Government Spending in real-time.
                   </p>
                </div>
              </div>
            </div>
          </section>

          {/* Detailed Features (Zig-Zag) */}
          <section id="pro-features" className="py-32 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
              
              {/* Feature 1: Deep Data */}
              <div className="flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1 space-y-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/20">
                    <Database01Icon className="w-3 h-3" /> Professional Data Access
                  </div>
                  <h3 className="text-4xl font-bold text-white">Institutional Grade <br/>Data Access</h3>
                  <p className="text-lg text-gray-400 leading-relaxed">
                    Stop trading in the dark. We provide direct access to government contracts, insider trading reports, and Senate lobbying activities so you can follow the smart money.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-[#15161A] p-4 rounded-xl border border-white/5">
                        <File01Icon className="w-6 h-6 text-cyan-400 mb-2" />
                        <h4 className="text-white font-medium">SEC Edgar Scraper</h4>
                        <p className="text-gray-500 text-sm mt-1">Instant filing analysis</p>
                     </div>
                     <div className="bg-[#15161A] p-4 rounded-xl border border-white/5">
                        <BankIcon className="w-6 h-6 text-cyan-400 mb-2" />
                        <h4 className="text-white font-medium">Senate Lobbying</h4>
                        <p className="text-gray-500 text-sm mt-1">Track political influence</p>
                     </div>
                     <div className="bg-[#15161A] p-4 rounded-xl border border-white/5">
                        <UserGroupIcon className="w-6 h-6 text-cyan-400 mb-2" />
                        <h4 className="text-white font-medium">Insider Transactions</h4>
                        <p className="text-gray-500 text-sm mt-1">CEO & Director trades</p>
                     </div>
                     <div className="bg-[#15161A] p-4 rounded-xl border border-white/5">
                        <File01Icon className="w-6 h-6 text-cyan-400 mb-2" />
                        <h4 className="text-white font-medium">Gov Contracts</h4>
                        <p className="text-gray-500 text-sm mt-1">Federal spending data</p>
                     </div>
                  </div>
                </div>
                <div className="flex-1 w-full relative">
                   <div className="w-full aspect-square md:aspect-[4/3] bg-[#15161A] rounded-2xl border border-white/10 shadow-3xl overflow-hidden relative group p-8 flex flex-col gap-3">
                       {/* Mock Data Table */}
                       <div className="flex items-center gap-4 text-xs text-gray-500 uppercase tracking-wider mb-2 border-b border-white/10 pb-2">
                          <div className="w-24">Date</div>
                          <div className="flex-1">Insider</div>
                          <div className="w-20 text-right">Value</div>
                       </div>
                       {[...Array(6)].map((_, i) => (
                          <div key={i} className="flex items-center gap-4 text-sm p-3 bg-white/5 rounded-lg">
                             <div className="w-24 text-gray-400">2026-01-1{8-i}</div>
                             <div className="flex-1 text-white font-medium">
                                {['Cook Tim', 'Nadella Satya', 'Musk Elon', 'Zuckerberg Mark', 'Huang Jensen', 'Bezos Jeff'][i]}
                             </div>
                             <div className="w-20 text-right text-emerald-400">
                                {['1.2', '4.5', '8.9', '3.2', '6.7', '9.1'][i]}M
                             </div>
                          </div>
                       ))}
                       <div className="mt-auto p-4 bg-cyan-950/30 rounded-lg border border-cyan-500/20 flex gap-3 items-center">
                          <CheckmarkCircle01Icon className="w-5 h-5 text-cyan-400" />
                          <span className="text-cyan-200 text-sm">Real-time filing detection enabled</span>
                       </div>
                   </div>
                   <div className="absolute -bottom-10 -right-10 w-full h-full bg-cyan-500/10 blur-[100px] -z-10" />
                </div>
              </div>

               {/* Feature 2: Portfolio Snapshot */}
               <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                <div className="flex-1 space-y-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20">
                    <FingerPrintIcon className="w-3 h-3" /> Snapshot Technology
                  </div>
                  <h3 className="text-4xl font-bold text-white">Travel back in time <br/>through your finances</h3>
                  <p className="text-lg text-gray-400 leading-relaxed">
                    OmniFolio captures the state of your portfolio at every significant change. Rewind to see exactly what your net worth was effectively on any specific date.
                  </p>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3 text-gray-300">
                      <CheckmarkCircle01Icon className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div>
                        <strong className="text-white block font-medium">Historical Replay</strong>
                        View your exact asset allocation from last year.
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-gray-300">
                      <CheckmarkCircle01Icon className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div>
                        <strong className="text-white block font-medium">Tax Optimization</strong>
                        Identify tax-loss harvesting opportunities easily.
                      </div>
                    </li>
                  </ul>
                </div>
                <div className="flex-1 w-full relative">
                   {/* Placeholder for Portfolio Screenshot */}
                   <div className="w-full aspect-square md:aspect-[4/3] bg-[#15161A] rounded-2xl border border-white/10 shadow-3xl overflow-hidden relative group">
                      {/* Detailed Table Mockup */}
                      <div className="p-6">
                        <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                          <div className="w-32 h-8 bg-white/10 rounded" />
                          <div className="flex-1" />
                          <div className="w-8 h-8 rounded-full bg-white/5" />
                        </div>
                        <div className="space-y-3">
                          {[1, 2, 3, 4, 5].map((row) => (
                            <div key={row} className="flex items-center p-3 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                              <div className="w-8 h-8 rounded bg-white/10 mr-4" />
                              <div className="flex-1 space-y-2">
                                <div className="w-24 h-3 bg-white/20 rounded" />
                                <div className="w-16 h-2 bg-white/10 rounded" />
                              </div>
                              <div className="text-right space-y-2">
                                <div className="w-20 h-3 bg-white/20 rounded ml-auto" />
                                <div className="w-12 h-2 bg-green-500/20 rounded ml-auto" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                   </div>
                   <div className="absolute -bottom-10 -right-10 w-full h-full bg-purple-500/10 blur-[100px] -z-10" />
                </div>
              </div>

               {/* Feature 3: Omni AI */}
               <div className="flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1 space-y-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-medium border border-pink-500/20">
                    <SparklesIcon className="w-3 h-3" /> Omni AI
                  </div>
                  <h3 className="text-4xl font-bold text-white">Your personal <br/>wealth consultant</h3>
                  <p className="text-lg text-gray-400 leading-relaxed">
                    Not just a chatbot. Omni understands your entire financial picture and proactively suggests moves that could increase your returns.
                  </p>
                  <button onClick={openSignup} className="flex items-center gap-2 text-white hover:text-cyan-400 transition-colors font-medium group">
                    Chat with Omni <ArrowRight01Icon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="flex-1 w-full relative">
                   {/* Chat Screenshot Recreation */}
                   <div className="w-full aspect-square md:aspect-[4/3] bg-[#050505] rounded-2xl border border-white/10 shadow-3xl overflow-hidden relative flex flex-col font-sans select-none">
                      {/* Header */}
                      <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-md border-b border-white/5 z-20">
                        <div className="flex items-center gap-3">
                          <SparklesIcon className="w-5 h-5 text-white" />
                          <div>
                            <h3 className="font-semibold text-white text-sm">Omni AI Assistant</h3>
                            <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Voice: OFF
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400">
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer hover:text-white transition-colors"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer hover:text-white transition-colors"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer hover:text-white transition-colors"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer hover:text-white transition-colors"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 relative overflow-hidden bg-[#0A0A0B] p-6">
                          <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-full bg-purple-600 flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold shadow-lg shadow-purple-900/50">AI</div>
                              <div className="bg-[#1A1B20] p-4 rounded-2xl rounded-tl-none text-sm text-gray-300 border border-white/5 shadow-sm w-full font-sans">
                                  <div className="flex items-center gap-2 mb-3">
                                      <span className="font-semibold text-white">Bitcoin (BTC)</span>
                                      <span className="text-gray-400">🪙</span>
                                  </div>
                                  
                                  <div className="mb-4">
                                      <div className="text-lg font-bold text-white mb-1">
                                          💰 Price: $95,007.83 <span className="text-green-400 text-base">+0.00%</span> <span className="text-gray-500 text-sm font-normal">(24h)</span>
                                      </div>
                                  </div>

                                  <div className="mb-4 space-y-2">
                                      <h4 className="font-semibold text-white flex items-center gap-2">📊 Technical Analysis</h4>
                                      <div className="text-gray-300">
                                          <strong className="text-white">Trend:</strong> Neutral - Consolidating near moving averages.
                                      </div>
                                      <div className="text-gray-300">
                                          <strong className="text-white">RSI:</strong> 50 (Bullish) | <strong className="text-white">MACD:</strong> Neutral
                                      </div>
                                  </div>

                                  <div className="space-y-2">
                                      <h4 className="font-semibold text-white flex items-center gap-2">💡 Summary</h4>
                                      <p className="text-gray-300 leading-relaxed">
                                          BTC is consolidating in the current range. Watch for volume expansion and price breakouts for the next major move. The crypto market sentiment remains dynamic.
                                      </p>
                                      
                                      <p className="text-gray-300 leading-relaxed mt-4">
                                          It's crucial to remember that this is a <strong className="text-white">moderately volatile</strong> crypto, and it's essential to align any decisions with your personal risk tolerance and investment goals.
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Footer (Input) */}
                      <div className="p-4 border-t border-white/5 bg-[#0F1014] blur-[2px] pointer-events-none opacity-80">
                          <div className="flex gap-3">
                             <div className="h-11 w-11 flex items-center justify-center bg-[#1A1B20] text-gray-500 rounded-xl border border-white/5">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                             </div>
                             <div className="flex-1 relative">
                                 <div className="w-full h-11 bg-[#1A1B20] rounded-xl flex items-center px-4 text-gray-500 text-sm font-medium border border-white/5">
                                    Type or speak your command...
                                 </div>
                                 <div className="absolute right-2 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-[#28292E] rounded-lg text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                                 </div>
                             </div>
                             <div className="h-11 w-11 flex items-center justify-center bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white rounded-xl shadow-lg opacity-80">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                             </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-600 pl-1">
                              <span className="flex items-center gap-1.5"><span className="text-yellow-500/50">💡</span> Drag & drop files or click <span className="opacity-70">📎</span> to attach</span>
                          </div>
                      </div>
                   </div>
                   <div className="absolute -bottom-10 -left-10 w-full h-full bg-pink-500/10 blur-[100px] -z-10" />
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-32 border-t border-white/5">
            <div className="max-w-5xl mx-auto px-6 text-center">
               <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight">
                 Build your legacy.
               </h2>
               <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                 Join thousands of investors who have already taken control of their financial future.
               </p>
               <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <button 
                  onClick={openSignup}
                  className="px-8 py-4 bg-white text-black rounded-full text-lg font-bold hover:bg-gray-200 transition-colors w-full sm:w-auto"
                 >
                   Get Started Now
                 </button>
                 <button 
                  onClick={openLogin}
                  className="px-8 py-4 bg-transparent border border-white/20 text-white rounded-full text-lg font-medium hover:bg-white/5 transition-colors w-full sm:w-auto"
                 >
                   Log In
                 </button>
               </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8 bg-[#0B0C10]">
             <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-2 filter grayscale opacity-50">
                  <OmnifolioLogo size="sm" />
                </div>
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-gray-500">
                   <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
                   <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                   <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                   <Link href="/affiliates" className="hover:text-white transition-colors">Affiliates</Link>
                   <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                   <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                   {/* <a href="#" className="hover:text-white transition-colors">Twitter</a> */}
                   {/* <a href="#" className="hover:text-white transition-colors">GitHub</a> */}
                </div>
                <div className="text-sm text-gray-600">
                  © {new Date().getFullYear()} OmniFolio Inc.
                </div>
             </div>
          </footer>
        </main>

        {showAuthModal && (
          <AuthModal 
            mode={authMode}
            onClose={() => setShowAuthModal(false)}
            onSwitchMode={(mode) => setAuthMode(mode)}
          />
        )}
    </div>
  );
}

