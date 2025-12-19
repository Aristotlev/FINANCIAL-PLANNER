"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Wallet,
  TrendingUp,
  PieChart,
  Shield,
  Coins,
  Building2,
  Receipt,
  Globe,
  Zap,
  LineChart
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';
import { blogPosts } from './blog-data';

export default function BlogPage() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.push('/');
  };

  const getCategoryColor = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    };
    return colors[color] || colors.purple;
  };

  const getIconBgColor = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'from-purple-500 to-purple-600',
      amber: 'from-amber-500 to-amber-600',
      emerald: 'from-emerald-500 to-emerald-600',
      cyan: 'from-cyan-500 to-cyan-600',
      rose: 'from-rose-500 to-rose-600',
      orange: 'from-orange-500 to-orange-600',
      blue: 'from-blue-500 to-blue-600',
      violet: 'from-violet-500 to-violet-600',
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <OmnifolioLogo size="sm" />
            </Link>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            The <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">OmniFolio</span> Blog
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Learn how to take control of your finances with guides, tips, and insights 
            about using OmniFolio to manage your complete financial life.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-purple-600/20 to-cyan-600/20 rounded-3xl p-8 md:p-12 border border-purple-500/30">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(blogPosts[0].color)} mb-4`}>
                  {blogPosts[0].category}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  {blogPosts[0].title}
                </h2>
                <p className="text-gray-300 mb-6">
                  {blogPosts[0].excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {blogPosts[0].date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {blogPosts[0].readTime}
                  </span>
                </div>
                <Link
                  href={`/blog/${blogPosts[0].id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Read Article
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="hidden md:flex items-center justify-center">
                {(() => {
                  const IconComponent = blogPosts[0].icon;
                  return (
                    <div className={`w-32 h-32 bg-gradient-to-br ${getIconBgColor(blogPosts[0].color)} rounded-3xl flex items-center justify-center`}>
                      <IconComponent className="w-16 h-16 text-white" />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Posts Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">All Articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.slice(1).map((post) => {
              const PostIcon = post.icon;
              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  className="group bg-gray-800/50 rounded-2xl p-6 border border-gray-700 hover:border-purple-500/50 transition-all hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getIconBgColor(post.color)} rounded-xl flex items-center justify-center`}>
                      <PostIcon className="w-6 h-6 text-white" />
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(post.color)}`}>
                      {post.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-cyan-600 rounded-3xl p-8 sm:p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to See It in Action?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Stop reading about financial management and start experiencing it. 
              Try OmniFolio and see your complete financial picture today.
            </p>
            <button
              onClick={handleBackToHome}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <OmnifolioLogo size="sm" />
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} OmniFolio. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-gray-400 hover:text-white text-sm transition-colors">
              About
            </Link>
            <Link href="/blog" className="text-gray-400 hover:text-white text-sm transition-colors">
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
