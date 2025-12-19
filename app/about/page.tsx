"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Target,
  Shield,
  Zap,
  Heart,
  Lightbulb,
  Layers,
  Puzzle,
  Eye,
  Sparkles,
  Check,
  ArrowRight
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';

export default function AboutPage() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.push('/');
  };
  const problemsWeSolve = [
    {
      icon: Puzzle,
      title: "Fragmented Finances",
      description: "No more juggling between banking apps, crypto wallets, stock brokers, and spreadsheets. Everything lives in one place."
    },
    {
      icon: Eye,
      title: "Lack of Visibility",
      description: "Get a complete picture of your net worth across all asset classes—cash, investments, crypto, real estate, and more."
    },
    {
      icon: Layers,
      title: "Complex Tools",
      description: "Financial software shouldn't require a finance degree. We built OmniFolio to be powerful yet intuitive."
    },
    {
      icon: Sparkles,
      title: "Disconnected Insights",
      description: "See how all your financial decisions connect. Track expenses, monitor investments, and plan your future in one unified view."
    }
  ];

  const values = [
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Your financial data stays yours. We use bank-level encryption and never sell your information."
    },
    {
      icon: Target,
      title: "Simplicity",
      description: "Complex finances made simple. Every feature is designed to save you time and reduce confusion."
    },
    {
      icon: Lightbulb,
      title: "Continuous Innovation",
      description: "We're always improving, adding new features and integrations based on what you need."
    },
    {
      icon: Heart,
      title: "Transparency",
      description: "Open, honest, and straightforward. No hidden agendas, just tools that help you succeed."
    }
  ];

  const features = [
    "Track cash, savings, and bank accounts",
    "Monitor crypto portfolios with real-time prices",
    "Follow stocks and investment accounts",
    "Manage real estate and property values",
    "Log expenses and track spending patterns",
    "Calculate taxes across multiple jurisdictions",
    "Support for 30+ currencies worldwide",
    "Beautiful visualizations and reports"
  ];

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
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            The Vision Behind <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">OmniFolio</span>
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            We dreamed of a world where managing your entire financial life didn't require 
            a dozen different apps, endless spreadsheets, and hours of manual work.
          </p>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">The Problem We Set Out to Solve</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              We've all been there. Your cash is in one banking app. Your crypto is on an exchange. 
              Your stocks are with a broker. Your real estate values are in a spreadsheet. Your expenses? 
              Who knows. Getting a clear picture of your total financial health felt impossible.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {problemsWeSolve.map((problem, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 hover:border-purple-500/50 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center mb-4 border border-purple-500/30">
                  <problem.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{problem.title}</h3>
                <p className="text-gray-400">{problem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Vision Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white">Our Vision</h2>
              </div>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                We envisioned an <strong className="text-white">all-in-one financial command center</strong> where 
                you could track <em>everything</em>—and actually <em>do</em> everything—without ever leaving 
                the platform.
              </p>
              <p className="text-gray-400 leading-relaxed mb-6">
                Imagine seeing your complete net worth update in real-time. Your crypto gains, stock 
                performance, property values, and savings—all in one beautiful dashboard. No more 
                switching between apps. No more forgotten accounts. No more manual calculations.
              </p>
              <p className="text-gray-400 leading-relaxed">
                That's what we're building. A single source of truth for your entire financial life.
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Everything in One Place</h3>
              <div className="grid grid-cols-1 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why We Built This Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Why We Built This</h2>
          </div>
          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              We were tired of the fragmentation. Every financial tool we tried solved one piece of the 
              puzzle but ignored the rest. Budget apps didn't track investments. Investment apps didn't 
              handle crypto. Crypto apps didn't care about your savings account.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              We wanted to see our <strong className="text-white">complete financial picture</strong>—not 
              just a slice of it. We wanted to understand how our spending affected our savings, how our 
              investments compared to our debts, and whether we were actually making progress toward 
              our goals.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              So we built OmniFolio: the financial dashboard we always wanted but could never find. 
              A place where every dollar, euro, bitcoin, and asset comes together in one unified, 
              beautiful interface.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">What We Believe In</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              The principles that guide how we build OmniFolio
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 hover:border-purple-500/50 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{value.title}</h3>
                <p className="text-gray-400">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Future Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Where We're Headed</h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-6">
            We're just getting started. Our vision extends beyond tracking—we want to help you 
            make smarter financial decisions with AI-powered insights, automated recommendations, 
            and tools that grow with your wealth.
          </p>
          <p className="text-gray-400 leading-relaxed">
            Whether you're just starting your financial journey or managing a complex portfolio, 
            OmniFolio is designed to be your lifelong financial companion.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-cyan-600 rounded-3xl p-8 sm:p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to See Your Complete Financial Picture?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Join us in building the future of personal finance management. 
              Your entire financial life, finally in one place.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
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
          </div>
        </div>
      </footer>
    </div>
  );
}
