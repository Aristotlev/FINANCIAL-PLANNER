"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBetterAuth } from '../../contexts/better-auth-context';
import { Preloader } from '../../components/ui/preloader';
import { 
  TrendingUp, 
  FileText, 
  Users, 
  BarChart3, 
  Bell,
  Search,
  ArrowRight,
  Building2,
  Briefcase,
  LineChart,
  Shield,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

const marketTools = [
  {
    title: 'SEC Filings',
    description: 'Track 10-K, 10-Q, 8-K, Form 4 insider trades, and 13F institutional holdings',
    href: '/markets/sec',
    icon: FileText,
    color: 'from-blue-500 to-indigo-600',
    badge: 'Live'
  },
  {
    title: 'Insider Trading',
    description: 'Monitor executive and director stock transactions in real-time',
    href: '/markets/sec?tab=insider',
    icon: Users,
    color: 'from-green-500 to-emerald-600',
    badge: null
  },
  {
    title: 'Institutional Holdings',
    description: 'Track hedge fund and institutional investor 13F filings',
    href: '/markets/sec?tab=holdings',
    icon: Building2,
    color: 'from-purple-500 to-violet-600',
    badge: null
  },
  {
    title: 'Financial Screener',
    description: 'Screen companies by financial metrics, insider activity, and filings',
    href: '/markets/sec?tab=screener',
    icon: BarChart3,
    color: 'from-orange-500 to-amber-600',
    badge: 'Pro'
  },
  {
    title: 'Filing Comparison',
    description: 'Compare filings year-over-year to identify material changes',
    href: '/markets/sec?tab=diff',
    icon: LineChart,
    color: 'from-pink-500 to-rose-600',
    badge: null
  },
  {
    title: 'Market News',
    description: 'Real-time financial news from major sources',
    href: '/markets/news',
    icon: Globe,
    color: 'from-cyan-500 to-teal-600',
    badge: 'Soon',
    disabled: true
  }
];

export default function MarketsPage() {
  const { user, isAuthenticated, isLoading } = useBetterAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <Preloader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex-shrink-0 font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                OmniFolio
              </Link>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  <Link href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
                  <Link href="/community" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Community</Link>
                  <Link href="/markets" className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm font-medium">SEC Filings</Link>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block w-64 pl-10 p-2.5"
                  placeholder="Search markets..."
                />
              </div>
              <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800">
                <Bell className="h-5 w-5" />
              </button>
              <Link href="/dashboard" className="h-8 w-8 rounded-full overflow-hidden border border-gray-700">
                <img src={user?.avatarUrl || '/api/auth/avatar'} alt="User" className="h-full w-full object-cover" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              SEC EDGAR Integration
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                Market Intelligence
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Real-time SEC filings, insider trading data, and institutional holdings. 
              Everything you need to make informed investment decisions.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                href="/markets/sec"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium transition-all duration-200"
              >
                <FileText className="h-5 w-5" />
                Browse SEC Filings
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link 
                href="/markets/sec?tab=screener"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium border border-gray-700 transition-all duration-200"
              >
                <BarChart3 className="h-5 w-5" />
                Open Screener
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold mb-8">Market Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketTools.map((tool, index) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {tool.disabled ? (
                <div className="relative h-full p-6 bg-gray-900/50 rounded-2xl border border-gray-800 opacity-60 cursor-not-allowed">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${tool.color} mb-4`}>
                    <tool.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{tool.title}</h3>
                    {tool.badge && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700 text-gray-400">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm">{tool.description}</p>
                </div>
              ) : (
                <Link href={tool.href} className="block group h-full">
                  <div className="relative h-full p-6 bg-gray-900 rounded-2xl border border-gray-800 hover:border-gray-700 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-500/10">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${tool.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <tool.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold group-hover:text-blue-400 transition-colors">{tool.title}</h3>
                      {tool.badge && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          tool.badge === 'Live' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : tool.badge === 'Pro'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{tool.description}</p>
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-900 rounded-2xl border border-gray-800 p-8">
          <h2 className="text-2xl font-bold mb-6">Why Use Our SEC Tools?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">10K+</div>
              <div className="text-gray-400">Daily Filings Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">&lt;5min</div>
              <div className="text-gray-400">Filing Delay</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">15+</div>
              <div className="text-gray-400">Filing Types Supported</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-pink-400 mb-2">100%</div>
              <div className="text-gray-400">Free SEC Data</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
