"use client";

import React from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Globe, 
  ArrowRight, 
  CheckCircle2,
  BarChart3,
  Shield
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const OmnifolioLogo = dynamic(() => import('@/components/ui/omnifolio-logo').then(mod => mod.OmnifolioLogo), {
  loading: () => <div className="w-10 h-10" />
});

export default function AffiliatesPage() {
  return (
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
            <Link href="/">
              <OmnifolioLogo size="md" />
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/login?callbackUrl=/affiliates/dashboard"
                className="hidden sm:block text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Affiliate Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-white/5 border border-gray-700 hover:border-gray-600 rounded-lg text-sm font-medium hover:bg-white/10 transition-all duration-300"
              >
                Join Program
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-full mb-8">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-300">OmniFolio Partner Program</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="block text-white">Earn While You</span>
            <span className="block bg-gradient-to-r from-cyan-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Empower Others
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join the OmniFolio Affiliate Program and earn up to 30% recurring commission for every user you refer. Help others master their wealth while growing yours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/signup"
              className="group w-full sm:w-auto px-8 py-4 bg-white/5 border border-gray-700 hover:border-gray-600 rounded-xl text-lg font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Become a Partner
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-16 border-y border-gray-800/50 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                30%
              </p>
              <p className="mt-2 text-gray-400">Recurring Commission</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                60 Days
              </p>
              <p className="mt-2 text-gray-400">Cookie Duration</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                $1,200+
              </p>
              <p className="mt-2 text-gray-400">Avg. Partner Earnings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Why Partner With Us?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              We provide everything you need to succeed and grow your revenue stream.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <DollarSign className="w-6 h-6" />,
                title: "High Commission Rates",
                description: "Earn industry-leading recurring commissions on all paid plans for the lifetime of the customer.",
                gradient: "from-green-500 to-emerald-500"
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Real-Time Tracking",
                description: "Monitor clicks, conversions, and earnings in real-time through your dedicated partner dashboard.",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: <Globe className="w-6 h-6" />,
                title: "Global Reach",
                description: "Promote OmniFolio to audiences worldwide with multi-currency and multi-language support.",
                gradient: "from-purple-500 to-violet-500"
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "High Conversion",
                description: "Our optimized landing pages and free trial offer ensure maximum conversion rates for your traffic.",
                gradient: "from-orange-500 to-amber-500"
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Reliable Payouts",
                description: "Get paid on time, every time. Monthly payouts via PayPal, Stripe, or direct bank transfer.",
                gradient: "from-red-500 to-rose-500"
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Dedicated Support",
                description: "Get access to a dedicated affiliate manager and marketing resources to help you succeed.",
                gradient: "from-indigo-500 to-blue-500"
              }
            ].map((feature, i) => (
              <div key={i} className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all">
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-gray-900/30 border-y border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="relative text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700 text-2xl font-bold text-cyan-400">1</div>
              <h3 className="text-xl font-bold text-white mb-3">Join Program</h3>
              <p className="text-gray-400">Sign up for our affiliate program. It's free, fast, and easy to get started.</p>
            </div>
            <div className="relative text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700 text-2xl font-bold text-purple-400">2</div>
              <h3 className="text-xl font-bold text-white mb-3">Promote OmniFolio</h3>
              <p className="text-gray-400">Share your unique referral link with your audience via content, social media, or email.</p>
            </div>
            <div className="relative text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700 text-2xl font-bold text-green-400">3</div>
              <h3 className="text-xl font-bold text-white mb-3">Earn Commissions</h3>
              <p className="text-gray-400">Earn 30% recurring commission for every customer who signs up through your link.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl p-12 text-center">
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
                Ready to Start Earning?
              </h2>
              <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                Join thousands of partners who are already earning with OmniFolio.
              </p>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Join Now - It's Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <OmnifolioLogo size="sm" />
            <span className="text-gray-400 text-sm">© {new Date().getFullYear()} OmniFolio. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Home</Link>
            <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">Terms</Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy</Link>
            <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
