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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-800/50 backdrop-blur-xl bg-gray-900/50">
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
