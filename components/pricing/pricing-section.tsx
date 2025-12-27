/**
 * Pricing Component
 * Clean, minimal pricing cards with OmniFolio dark theme branding
 */

"use client";

import React, { useState } from 'react';
import { CircleCheck, X, Sparkles, Lock, Shield, CreditCard } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { useBetterAuth } from '@/contexts/better-auth-context';
import { PLAN_CONFIG, PLAN_FEATURES, formatPrice, getPlanDisplayName } from '@/types/subscription';
import type { SubscriptionPlan } from '@/types/subscription';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';
import { CardContainer, CardItem } from '@/components/ui/3d-card';

// ---- Utility: cn (className merge) ----
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

// ---- Section & Container Components ----
type SectionProps = { children: React.ReactNode; className?: string; id?: string };
type ContainerProps = { children: React.ReactNode; className?: string; id?: string };

const Section = ({ children, className, id }: SectionProps) => (
  <section className={cn("py-8 md:py-12", className)} id={id}>
    {children}
  </section>
);

const Container = ({ children, className, id }: ContainerProps) => (
  <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)} id={id}>
    {children}
  </div>
);

// ---- Badge Component ----
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'featured' | 'premium';
  className?: string;
}

const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  const variants = {
    default: 'bg-gray-800 text-gray-300 border-gray-700',
    secondary: 'bg-gray-700/50 text-gray-400 border-gray-600',
    featured: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent',
    premium: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-transparent',
  };
  
  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

// ---- Button Component ----
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'pro' | 'premium';
  size?: 'sm' | 'md' | 'lg';
}

const Button = ({ children, variant = 'primary', size = 'md', className, ...props }: ButtonProps) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/25',
    secondary: 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:border-gray-600',
    ghost: 'bg-gray-800/50 text-gray-500 cursor-not-allowed',
    pro: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/25',
    premium: 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/25',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  
  return (
    <button
      className={cn(
        "font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// ---- Pricing Card Props ----
interface PricingCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan?: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
  isLoading?: boolean;
}

function PricingCard({ plan, isCurrentPlan, onSelect, isLoading }: PricingCardProps) {
  const config = PLAN_CONFIG[plan];
  const features = PLAN_FEATURES[plan];

  const isFeatured = plan === 'TRADER';
  const isPremium = plan === 'INVESTOR' || plan === 'WHALE';
  const isFree = plan === 'STARTER';

  const planBadgeText: Record<SubscriptionPlan, string | null> = {
    STARTER: null,
    TRADER: '🔥 Best value',
    INVESTOR: '⚡ Most powerful',
    WHALE: '💎 Ultimate',
  };

  const getButtonVariant = (): 'ghost' | 'pro' | 'premium' | 'primary' | 'secondary' => {
    if (isCurrentPlan) return 'ghost';
    if (isFeatured) return 'pro';
    if (isPremium) return 'premium';
    if (isFree) return 'secondary';
    return 'primary';
  };

  const getBadgeVariant = (): 'featured' | 'premium' | 'default' => {
    if (isFeatured) return 'featured';
    if (isPremium) return 'premium';
    return 'default';
  };

  return (
    <CardContainer className="inter-var h-full">
      <div
        className={cn(
          "relative flex flex-col h-full rounded-3xl border p-8 text-left transition-all duration-300 group/card w-full",
          "bg-gray-900/40 backdrop-blur-sm",
          isCurrentPlan ? "border-green-500/50 shadow-2xl shadow-green-500/10" :
          isFeatured ? "border-purple-500/50 shadow-2xl shadow-purple-500/10" :
          isPremium ? "border-orange-500/30 hover:border-orange-500/50" :
          "border-white/5 hover:border-white/10 hover:shadow-2xl hover:shadow-purple-500/[0.1]"
        )}
        aria-label={`${getPlanDisplayName(plan)} plan`}
      >
        {/* Top Badge */}
        {planBadgeText[plan] && (
          <CardItem translateZ={50} className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-auto">
            <Badge variant={getBadgeVariant()}>
              {planBadgeText[plan]}
            </Badge>
          </CardItem>
        )}

        {/* Header */}
        <CardItem translateZ={40} className="text-center pt-2 w-full">
          <Badge variant={getBadgeVariant()} className="mb-4">
            {getPlanDisplayName(plan)}
          </Badge>
          
          {/* Price */}
          <h4 className="mb-2 mt-4 text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {formatPrice(config.price_monthly_usd)}
          </h4>
          <p className="text-sm text-gray-500">
            {plan === 'STARTER' ? 'forever' : 'per month'}
          </p>
          {plan === 'STARTER' && (
            <div className="mt-2 space-y-1">
              <p className="text-cyan-400 text-xs font-semibold">✨ 7-day trial with UNLIMITED features</p>
              <p className="text-gray-500 text-xs">Then free forever</p>
            </div>
          )}
        </CardItem>

        <CardItem translateZ={30} className="w-full">
          <div className="my-5 border-t border-gray-800" />
        </CardItem>

        {/* Features List */}
        <CardItem translateZ={30} className="flex-grow w-full">
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li 
                key={index} 
                className={cn(
                  "flex items-center text-sm",
                  feature.included ? "text-gray-300" : "text-gray-600"
                )}
              >
                <CircleCheck 
                  className={cn(
                    "mr-2.5 h-4 w-4 flex-shrink-0",
                    feature.included ? "text-cyan-400" : "text-gray-700"
                  )} 
                  aria-hidden 
                />
                <span className={!feature.included ? "line-through" : ""}>
                  {feature.name}
                </span>
              </li>
            ))}
          </ul>
        </CardItem>

        {/* CTA Button */}
        <CardItem translateZ={50} className="mt-6 pt-4 w-full">
          <Button
            size="md"
            variant={getButtonVariant()}
            className="w-full"
            onClick={() => onSelect(plan)}
            disabled={isCurrentPlan || isLoading}
          >
            {isCurrentPlan ? '✓ Current Plan' : isLoading ? 'Loading...' : 'Choose Plan'}
          </Button>
        </CardItem>

        {/* Current Plan Indicator */}
        {isCurrentPlan && (
          <CardItem translateZ={60} className="absolute -top-2 -right-2 w-auto">
            <div className="bg-green-500 text-white rounded-full p-1.5 shadow-lg shadow-green-500/30">
              <CircleCheck className="w-4 h-4" />
            </div>
          </CardItem>
        )}
      </div>
    </CardContainer>
  );
}

interface PricingSectionProps {
  showHeader?: boolean;
}

export default function PricingSection({ showHeader = true }: PricingSectionProps) {
  const { subscription, startCheckout, loading: subscriptionLoading, error: subscriptionError } = useSubscription();
  const { user } = useBetterAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    console.log('handleSelectPlan called with:', plan);
    console.log('Current subscription:', subscription);
    console.log('Current user:', user);
    
    // Clear any previous error
    setCheckoutError(null);
    
    if (subscription && subscription.plan === plan) {
      console.log('Plan is already current, returning');
      return;
    }

    if (plan === 'STARTER') {
      alert('Free plan is automatically available after your trial ends');
      return;
    }

    // If user is not authenticated, show auth modal
    if (!user) {
      console.log('User not authenticated, showing auth modal');
      setPendingPlan(plan);
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }

    console.log('Starting checkout for plan:', plan);
    setCheckoutLoading(true);
    
    try {
      // Pass the BetterAuth user directly to startCheckout
      const success = await startCheckout(plan, { id: user.id, email: user.email });
      
      if (!success) {
        // If startCheckout returns false, show an error
        setCheckoutError('Failed to start checkout. Please try again or contact support.');
      }
      // If successful, the user will be redirected to Stripe
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAuthClose = async () => {
    setShowAuthModal(false);
    // If user just authenticated and had a pending plan, proceed to checkout
    if (user && pendingPlan) {
      setCheckoutLoading(true);
      try {
        await startCheckout(pendingPlan, { id: user.id, email: user.email });
      } catch (err) {
        console.error('Checkout error after auth:', err);
        setCheckoutError(err instanceof Error ? err.message : 'Failed to start checkout');
      } finally {
        setCheckoutLoading(false);
        setPendingPlan(null);
      }
    }
  };

  return (
    <Section>
      <Container className="flex flex-col items-center gap-6 text-center">
        {/* Error Banner */}
        {(checkoutError || subscriptionError) && (
          <div className="w-full max-w-2xl p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
            <div className="flex items-center justify-center gap-3 text-red-300">
              <X className="w-5 h-5 flex-shrink-0" />
              <p className="font-medium">{checkoutError || subscriptionError}</p>
              <button 
                onClick={() => setCheckoutError(null)}
                className="ml-2 text-red-400 hover:text-red-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Loading Overlay */}
        {checkoutLoading && (
          <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-4 border border-gray-700">
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-white font-medium">Redirecting to checkout...</p>
            </div>
          </div>
        )}
        
        {/* Header */}
        {showHeader && (
          <div className="mb-4">
            <span className="text-sm font-medium text-cyan-400 uppercase tracking-widest">Pricing</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">
              Choose Your{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Plan
              </span>
            </h2>
            <p className="mt-3 text-gray-400 text-lg max-w-xl mx-auto">
              Simple, transparent pricing for everyone. Start free, upgrade when you need more.
            </p>
          </div>
        )}

        {/* Trial Banner */}
        {subscription && subscription.status === 'TRIAL' && (
          <div className="w-full max-w-2xl p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl">
            <div className="flex items-center justify-center gap-3 text-cyan-300">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <p className="font-semibold">
                You&apos;re on a free trial! {subscription.trial_end_date && `${Math.max(0, Math.ceil((new Date(subscription.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining`}
              </p>
            </div>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="not-prose mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
          <PricingCard
            plan="STARTER"
            isCurrentPlan={subscription?.plan === 'STARTER'}
            onSelect={handleSelectPlan}
            isLoading={checkoutLoading}
          />
          <PricingCard
            plan="TRADER"
            isCurrentPlan={subscription?.plan === 'TRADER'}
            onSelect={handleSelectPlan}
            isLoading={checkoutLoading}
          />
          <PricingCard
            plan="INVESTOR"
            isCurrentPlan={subscription?.plan === 'INVESTOR'}
            onSelect={handleSelectPlan}
            isLoading={checkoutLoading}
          />
          <PricingCard
            plan="WHALE"
            isCurrentPlan={subscription?.plan === 'WHALE'}
            onSelect={handleSelectPlan}
            isLoading={checkoutLoading}
          />
        </div>

        {/* Comparison Table */}
        <div className="mt-12 w-full max-w-6xl">
          <h3 className="text-2xl font-bold text-white mb-6">
            Compare All Features
          </h3>
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800/50">
                    <th className="p-4 text-left text-gray-300 font-semibold text-sm">Feature</th>
                    <th className="p-4 text-center text-gray-300 font-semibold text-sm">Starter<br/><span className="text-xs text-gray-500">Free Forever</span></th>
                    <th className="p-4 text-center text-gray-300 font-semibold text-sm bg-purple-900/20">Trader<br/><span className="text-xs text-purple-300">$9.99/mo</span></th>
                    <th className="p-4 text-center text-gray-300 font-semibold text-sm">Investor<br/><span className="text-xs text-orange-300">$19.99/mo</span></th>
                    <th className="p-4 text-center text-gray-300 font-semibold text-sm">Whale<br/><span className="text-xs text-yellow-300">$49.99/mo</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    { feature: 'Multi Asset Tracking', values: [true, true, true, true], tooltip: 'Track cash, crypto, stocks, and more' },
                    { feature: 'Real Time Updates', values: [true, true, true, true], tooltip: 'Live market data' },
                    { feature: 'Dual Currency Display', values: [true, true, true, true], tooltip: 'Original and converted values' },
                    { feature: 'Multi Currency Bank Accounts', values: [true, true, true, true] },
                    { feature: 'Automatic Conversions', values: [true, true, true, true] },
                    { feature: '150+ Supported Countries', values: [true, true, true, true] },
                    { feature: 'Trading Accounts', values: [true, true, true, true], tooltip: 'Manage multiple brokerage and crypto accounts' },
                    { feature: 'Interactive Charts', values: ['Basic', 'Advanced', 'Advanced', 'Advanced'] },
                    { feature: 'Advanced Tax Calculator', values: ['41+ Countries', '41+ Countries', '41+ Countries', '41+ Countries'] },
                    { feature: 'Custom Income Sources', values: [true, true, true, true] },
                    { feature: 'Tax Optimization', values: [true, true, true, true] },
                    { feature: 'Google Maps Integration', values: [false, true, true, true], tooltip: 'Paid API feature' },
                    { feature: 'Lisa AI Assistant', values: ['❌ None', '10 msgs/day', '50 msgs/day', 'Unlimited + Voice'], tooltip: 'Gemini Powered' },
                    { feature: 'Priority Support', values: [false, false, true, true], tooltip: 'Faster email response' },
                    { feature: 'VIP Support', values: [false, false, false, true], tooltip: 'Skip the line' },
                    { feature: 'Beta Access', values: [false, false, false, true], tooltip: 'Try new features first' },
                  ].map((row, index) => (
                    <tr key={index} className="hover:bg-gray-800/30 transition-colors">
                      <td className="p-4 text-gray-300 font-medium text-sm">
                        {row.feature}
                        {row.tooltip && (
                          <span className="block text-xs text-gray-500">{row.tooltip}</span>
                        )}
                      </td>
                      {row.values.map((value, i) => (
                        <td key={i} className={cn("p-4 text-center", i === 1 && "bg-purple-900/10")}>
                          {typeof value === 'boolean' ? (
                            value ? (
                              <div className="inline-flex w-6 h-6 rounded-full bg-cyan-500/20 items-center justify-center">
                                <CircleCheck className="w-4 h-4 text-cyan-400" />
                              </div>
                            ) : (
                              <X className="w-5 h-5 text-gray-700 mx-auto" />
                            )
                          ) : (
                            <span className={cn(
                              "font-bold text-sm",
                              value.startsWith('❌') ? 'text-gray-600' : 'text-gray-400'
                            )}>
                              {value}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 w-full max-w-3xl">
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl border border-gray-800 p-8">
            <h3 className="text-xl font-bold text-white mb-6 text-center">Why Choose OmniFolio?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center group">
                <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg  transition-transform">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-1">Secure Payments</h4>
                <p className="text-gray-500 text-sm">Bank-level encryption with Stripe</p>
              </div>
              <div className="text-center group">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg  transition-transform">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-1">30-Day Guarantee</h4>
                <p className="text-gray-500 text-sm">Full refund, no questions asked</p>
              </div>
              <div className="text-center group">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg  transition-transform">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-1">Cancel Anytime</h4>
                <p className="text-gray-500 text-sm">No contracts or commitments</p>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowAuthModal(false)} 
          />
          <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {authMode === 'login' ? (
              <LoginForm
                onClose={handleAuthClose}
                onSwitchToSignup={() => setAuthMode('signup')}
              />
            ) : (
              <SignupForm
                onClose={handleAuthClose}
                onSwitchToLogin={() => setAuthMode('login')}
              />
            )}
          </div>
        </div>
      )}
    </Section>
  );
}
