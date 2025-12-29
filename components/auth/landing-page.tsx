"use client";

import React, { useState } from 'react';
import {
  TrendingUp,
  Shield,
  BarChart3,
  PieChart,
  Target,
  Smartphone,
  Star,
  ArrowRight,
  Play,
  Zap,
  Check,
  Wallet,
  LineChart,
  Building2,
  Coins,
  Receipt,
  Lock,
  Database,
  Bot,
  Newspaper,
  Code2,
  Sparkles,
  Trophy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import dynamic from 'next/dynamic';

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
  const [currentSlide, setCurrentSlide] = useState(0);

  const openLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const openSignup = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const slides = [
    {
      title: "Meet Lisa, Your AI Financial Genius",
      description: "Powered by Google's Gemini models, Lisa analyzes your portfolio 24/7 to find opportunities you might miss.",
      icon: <Bot className="w-16 h-16 text-purple-400" />,
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      title: "Bank-Grade Security",
      description: "Your data is protected with AES-256 encryption. We use the same security standards as major financial institutions.",
      icon: <Shield className="w-16 h-16 text-green-400" />,
      bg: "bg-green-500/10",
      border: "border-green-500/20"
    },
    {
      title: "100% Open Source",
      description: "Transparency is trust. Our code is open for audit, ensuring no hidden backdoors or data selling.",
      icon: <Code2 className="w-16 h-16 text-blue-400" />,
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      title: "World-Class Design",
      description: "Experience the most intuitive, beautiful, and responsive financial interface ever built.",
      icon: <Sparkles className="w-16 h-16 text-amber-400" />,
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    {
      title: "The #1 Finance Tracker",
      description: "Crypto, Stocks, Real Estate, Expenses. Everything you own, tracked in one powerful dashboard.",
      icon: <Trophy className="w-16 h-16 text-yellow-400" />,
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20"
    }
  ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  const features = [
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Smart Portfolio Tracking",
      description: "AI-powered tracking for stocks, crypto, real estate, and valuables in one unified dashboard.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <PieChart className="w-6 h-6" />,
      title: "Intelligent Expense Management",
      description: "Auto-categorize expenses and get AI-driven insights to optimize your spending habits.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Real-Time Analytics",
      description: "Track performance, growth, and ROI across all your assets with live market data.",
      gradient: "from-purple-500 to-violet-500"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Bank-Level Security",
      description: "256-bit encryption with multi-factor authentication protects your financial data.",
      gradient: "from-red-500 to-rose-500"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Goal-Based Planning",
      description: "Set financial milestones and get personalized roadmaps to achieve them faster.",
      gradient: "from-orange-500 to-amber-500"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Access Anywhere",
      description: "Responsive design works seamlessly on desktop, tablet, and mobile devices.",
      gradient: "from-indigo-500 to-blue-500"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Marketing Director at TechCo",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face&auto=format",
      content: "OmniFolio transformed how I manage my finances. I went from chaos to clarity in just one week."
    },
    {
      name: "Marcus Chen",
      role: "Founder of StartupX",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face&auto=format",
      content: "The AI insights are shockingly good. It actually helped me rebalance my portfolio and save $50K."
    },
    {
      name: "Emily Davis",
      role: "SEO Lead at GrowthLab",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face&auto=format",
      content: "Managing crypto, stocks, and real estate used to be a nightmare. Now it takes me 5 minutes a day."
    }
  ];



  const trustedCompanies = ["Gemini", "Google Cloud", "Yahoo Finance", "CoinGecko", "CoinMarketCap", "Finnhub", "TradingView"];

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="fixed inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>
        </div>

        {/* Grid Pattern Overlay */}
        <div className="fixed inset-0 z-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>

        {/* Header */}
        <header className="relative z-20 px-4 sm:px-6 lg:px-8 border-b border-gray-800/50 backdrop-blur-xl bg-gray-900/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center py-4">
              <OmnifolioLogo size="md" />

              <nav className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Features</a>
                <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">How it Works</a>
                <a href="#testimonials" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Testimonials</a>
                <a href="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Pricing</a>
              </nav>

              <div className="flex items-center gap-3">
                <button
                  onClick={openLogin}
                  className="hidden sm:block text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={openSignup}
                  className="px-4 py-2 bg-white/5 border border-gray-700 hover:border-gray-600 rounded-lg text-sm font-medium hover:bg-white/10 transition-all duration-300"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative z-10 pt-20 pb-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-full mb-8">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-300">AI-Powered Financial Intelligence</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
                <span className="block text-white">Master Your Wealth</span>
                <span className="block bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  on Autopilot
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                Track investments, manage expenses, and grow your net worth with intelligent insights.
                Your complete financial command center — while you sleep.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <button
                  onClick={openSignup}
                  className="group w-full sm:w-auto px-8 py-4 bg-white/5 border border-gray-700 hover:border-gray-600 rounded-xl text-lg font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={openLogin}
                  className="group w-full sm:w-auto px-8 py-4 bg-white/5 border border-gray-700 hover:border-gray-600 rounded-xl text-lg font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 text-cyan-400" />
                  Watch Demo
                </button>
              </div>

              {/* Social Proof - Avatars */}
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="flex -space-x-3">
                  {[
                    "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face&auto=format",
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face&auto=format",
                    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face&auto=format",
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face&auto=format"
                  ].map((src, i) => (
                    <img key={i} src={src} alt="" className="w-10 h-10 rounded-full border-2 border-gray-900" />
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                    +2k
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="text-gray-400 text-sm">Join 2,000+ early adopters</span>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="mt-20 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10 pointer-events-none"></div>
              <div className="relative bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-1 shadow-2xl shadow-purple-500/10">
                <div className="bg-gray-900/80 rounded-xl p-6">
                  {/* Dashboard Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Total Net Worth</h3>
                        <p className="text-sm text-gray-400">Updated just now</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">$1,247,892</p>
                      <p className="text-sm text-green-400">+$24,567 (12.4%) this month</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <LineChart className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-gray-400">Stocks</span>
                      </div>
                      <p className="text-xl font-bold text-white">$456,780</p>
                      <p className="text-xs text-green-400">+8.2%</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-gray-400">Crypto</span>
                      </div>
                      <p className="text-xl font-bold text-white">$89,340</p>
                      <p className="text-xs text-green-400">+15.7%</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-gray-400">Real Estate</span>
                      </div>
                      <p className="text-xl font-bold text-white">$650,000</p>
                      <p className="text-xs text-green-400">+5.3%</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-gray-400">Expenses</span>
                      </div>
                      <p className="text-xl font-bold text-white">$4,250</p>
                      <p className="text-xs text-red-400">-12% vs avg</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="relative z-10 py-12 border-y border-gray-800/50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs uppercase tracking-widest text-gray-500 mb-8">Powered by</p>
            <div className="relative flex overflow-hidden opacity-50 mask-linear-gradient">
              <div className="flex animate-scroll whitespace-nowrap min-w-full">
                {[...trustedCompanies, ...trustedCompanies, ...trustedCompanies, ...trustedCompanies].map((company, i) => (
                  <span key={i} className="mx-8 text-lg sm:text-xl font-bold text-gray-400 hover:text-gray-300 transition-colors cursor-default inline-block">
                    {company}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-medium text-cyan-400 uppercase tracking-widest">Features</span>
              <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold text-white">
                Everything you need to{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  dominate your finances
                </span>
              </h2>
              <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                Powerful tools designed to automate your entire financial workflow, from tracking to optimization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <div key={i} className="group relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5">
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-medium text-cyan-400 uppercase tracking-widest">How It Works</span>
              <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold text-white">
                Build wealth in{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  3 simple steps
                </span>
              </h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="text-6xl font-extrabold text-gray-800 mb-4">01</div>
                <h3 className="text-2xl font-bold text-white mb-3">Secure & Private</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">No external connections required. Maximum security with military-grade encryption for your peace of mind.</p>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="text-green-400 text-sm font-medium">AES-256 Encryption</span>
                      <Check className="w-4 h-4 text-green-400 ml-auto" />
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Lock className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-blue-400 text-sm font-medium">Zero External Access</span>
                      <Check className="w-4 h-4 text-blue-400 ml-auto" />
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <Database className="w-4 h-4 text-orange-400" />
                      </div>
                      <span className="text-orange-400 text-sm font-medium">Local Data Control</span>
                      <Check className="w-4 h-4 text-orange-400 ml-auto" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="text-6xl font-extrabold text-gray-800 mb-4">02</div>
                <h3 className="text-2xl font-bold text-white mb-3">Meet Lisa & Gemini</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">Your personal assistant for personalized news feeds and Gemini-powered analytics.</p>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <Bot className="w-5 h-5 text-purple-400" />
                      <div className="flex-1">
                        <p className="text-xs text-purple-300 font-medium">Lisa (AI Assistant)</p>
                        <p className="text-xs text-gray-400">"Your portfolio is up 12% today!"</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                      <Newspaper className="w-5 h-5 text-cyan-400" />
                      <div className="flex-1">
                        <p className="text-xs text-cyan-300 font-medium">Smart News Feed</p>
                        <p className="text-xs text-gray-400">Curated updates for your assets</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="text-6xl font-extrabold text-gray-800 mb-4">03</div>
                <h3 className="text-2xl font-bold text-white mb-3">Master Every Metric</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">Manage your finances with precision. Check every analytic and data point in existence.</p>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-end justify-between h-20 gap-2">
                    {[40, 55, 45, 70, 60, 85, 75, 90].map((height, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-cyan-500 to-purple-500 rounded-t opacity-80 hover:opacity-100 transition-opacity" style={{ height: height + '%' }}></div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500">Data</span>
                    <span className="text-xs text-green-400 font-medium">Real-time</span>
                    <span className="text-xs text-gray-500">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Slideshow Section */}
        <section className="relative z-10 py-20 border-y border-gray-800/50 bg-gray-900/30 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative">
              <div className="overflow-hidden rounded-2xl bg-gray-900/50 border border-gray-800 backdrop-blur-sm p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                  
                  {/* Icon Side */}
                  <div className={`flex-shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center ${slides[currentSlide].bg} ${slides[currentSlide].border} border-2 transition-all duration-500`}>
                    {slides[currentSlide].icon}
                  </div>

                  {/* Content Side */}
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl md:text-4xl font-bold text-white mb-4 transition-all duration-300">
                      {slides[currentSlide].title}
                    </h3>
                    <p className="text-lg text-gray-400 leading-relaxed max-w-2xl transition-all duration-300">
                      {slides[currentSlide].description}
                    </p>
                  </div>

                  {/* Navigation */}
                  <div className="flex gap-4 mt-6 md:mt-0">
                    <button 
                      onClick={prevSlide}
                      className="p-3 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={nextSlide}
                      className="p-3 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 mt-8 md:mt-0 md:absolute md:bottom-8 md:left-1/2 md:-translate-x-1/2">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        currentSlide === index ? 'w-8 bg-cyan-500' : 'w-2 bg-gray-700 hover:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-medium text-cyan-400 uppercase tracking-widest">Testimonials</span>
              <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold text-white">
                Loved by{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  financial professionals
                </span>
              </h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, i) => (
                <div key={i} className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:border-gray-700 transition-all">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 leading-relaxed text-lg">&quot;{testimonial.content}&quot;</p>
                  <div className="flex items-center gap-4">
                    <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      <p className="text-sm text-gray-400">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl p-12 text-center">
              <div className="relative z-10">
                <span className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-medium mb-6">
                  Start creating magic today
                </span>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
                  Ready to take control?
                </h2>
                <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                  Join 2,000+ users who have transformed their financial lives with OmniFolio.
                </p>
                <button
                  onClick={openSignup}
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  Get Started for Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-gray-800/50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div className="md:col-span-1">
                <OmnifolioLogo size="md" />
                <p className="mt-4 text-gray-400 text-sm">
                  Your complete financial command center. Track, analyze, and grow your wealth.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-2">
                  <li><a href="#features" className="text-gray-400 hover:text-white text-sm transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="text-gray-400 hover:text-white text-sm transition-colors">How it Works</a></li>
                  <li><a href="/pricing" className="text-gray-400 hover:text-white text-sm transition-colors">Pricing</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-4">Company</h4>
                <ul className="space-y-2">
                  <li><a href="/about" className="text-gray-400 hover:text-white text-sm transition-colors">About</a></li>
                  <li><a href="/blog" className="text-gray-400 hover:text-white text-sm transition-colors">Blog</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Contact</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a></li>
                  <li><a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a></li>
                  <li><a href="/affiliates" className="text-gray-400 hover:text-white text-sm transition-colors">Affiliates</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-gray-500 text-sm">
                © {new Date().getFullYear()} OmniFolio. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                {/* Twitter */}
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                </a>
                {/* YouTube */}
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                </a>
                {/* Instagram */}
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={(mode) => setAuthMode(mode)}
        />
      )}
    </>
  );
}
