"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';
import { BackgroundBeams } from '@/components/ui/background-beams';
import PricingSection from '@/components/pricing/pricing-section';

export default function PricingPage() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 overflow-x-hidden">
      <BackgroundBeams />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <OmnifolioLogo size="sm" />
            </Link>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ x: -4 }}
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm font-medium">Back to Home</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-20">
        {/* Hero Section */}
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-4xl mx-auto text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-block px-4 py-1.5 mb-6 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium tracking-wide"
              >
                Simple, Transparent Pricing
              </motion.div>
              <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8">
                Invest in Your <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Financial Future</span>
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
                Start for free, upgrade as you grow. No hidden fees, no surprises.
                Just powerful tools to help you build wealth.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <div className="relative z-10">
          <PricingSection showHeader={false} />
        </div>

        {/* FAQ / Trust Section */}
        <section className="py-24 relative bg-gradient-to-b from-transparent via-purple-500/5 to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold mb-6">Frequently Asked Questions</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Everything you need to know about our pricing and plans.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {[
                {
                  q: "Can I cancel anytime?",
                  a: "Yes, absolutely. There are no long-term contracts or commitments. You can cancel your subscription at any time from your account settings."
                },
                {
                  q: "Is there a free trial?",
                  a: "Yes! The Starter plan includes a 7-day free trial with unlimited access to all features, so you can experience the full power of OmniFolio."
                },
                {
                  q: "Is my financial data secure?",
                  a: "Security is our top priority. We use bank-level encryption (AES-256) to protect your data. We never sell your personal information to third parties."
                },
                {
                  q: "What payment methods do you accept?",
                  a: "We accept all major credit cards (Visa, Mastercard, American Express) and secure online payments via Stripe."
                }
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-8 border border-white/5 hover:border-purple-500/30 transition-colors"
                >
                  <h3 className="text-xl font-bold text-white mb-3">{faq.q}</h3>
                  <p className="text-gray-400 leading-relaxed">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-4 relative overflow-hidden">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-purple-600 to-blue-700 rounded-[3rem] p-12 sm:p-20 text-center relative overflow-hidden shadow-2xl shadow-purple-900/40"
            >
              <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_85%)]" />
              <div className="relative z-10">
                <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8 tracking-tight leading-tight">
                  Ready to See Your Complete <br className="hidden sm:block" /> Financial Picture?
                </h2>
                <p className="text-white/80 text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                  Join us in building the future of personal finance management.
                  Your entire financial life, finally in one place.
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-white text-purple-600 rounded-2xl text-xl font-bold hover:bg-gray-100 transition-all shadow-xl shadow-black/20"
                  >
                    Get Started Now
                    <ArrowRight className="w-6 h-6" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-16 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
            <OmnifolioLogo size="sm" />
            <p className="text-gray-500 text-sm italic">
              Empowering your financial future.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">
                Home
              </Link>
              <Link href="/about" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">
                About
              </Link>
              <Link href="/pricing" className="text-white text-sm transition-colors font-semibold">
                Pricing
              </Link>
              <Link href="/blog" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">
                Blog
              </Link>
            </div>
            <p className="text-gray-600 text-xs tracking-widest uppercase">
              © {new Date().getFullYear()} OmniFolio. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-4 text-gray-500 text-sm">
            <span>Built for the future of finance.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
