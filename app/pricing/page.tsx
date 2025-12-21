/**
 * Pricing Page
 * Public pricing page accessible from landing page
 */

import PricingSection from '@/components/pricing/pricing-section';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';

export const metadata = {
  title: 'Pricing - OmniFolio',
  description: 'Simple, transparent pricing for everyone. Start with a 7-day free trial with unlimited features.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative">
      {/* Animated Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      {/* Header */}
      <header className="relative z-20 border-b border-gray-800/50 backdrop-blur-xl bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <a href="/">
              <OmnifolioLogo size="md" />
            </a>
            
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                ← Back to Home
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Content */}
      <main className="py-12">
        <PricingSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} OmniFolio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
