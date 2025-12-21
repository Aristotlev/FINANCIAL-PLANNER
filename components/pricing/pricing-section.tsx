/**
 * Pricing Component
 * Clean, minimal pricing cards with OmniFolio dark theme branding
 */

"use client";

import React from 'react';
import { CircleCheck, X, Sparkles, Lock, Shield, CreditCard } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { PLAN_CONFIG, PLAN_FEATURES, formatPrice, getPlanDisplayName } from '@/types/subscription';
import type { SubscriptionPlan } from '@/types/subscription';

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
    primary: 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/25',
    secondary: 'bg-white/5 border border-gray-700 hover:border-gray-600 text-white hover:bg-white/10',
    ghost: 'bg-gray-800/50 text-gray-500 cursor-not-allowed',
    pro: 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/25',
    premium: 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-500/25',
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
}

function PricingCard({ plan, isCurrentPlan, onSelect }: PricingCardProps) {
  const config = PLAN_CONFIG[plan];
  const features = PLAN_FEATURES[plan];

  const isFeatured = plan === 'PRO';
  const isPremium = plan === 'UNLIMITED';
  const isFree = plan === 'FREE';

  const planBadgeText: Record<SubscriptionPlan, string | null> = {
    FREE: null,
    PRO: '🔥 Best value',
    UNLIMITED: '⚡ Most powerful',
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
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-300",
        "bg-gray-900/40 backdrop-blur-xl hover:bg-gray-900/60",
        isCurrentPlan && "border-green-500/50 ring-2 ring-green-500/20",
        isFeatured && !isCurrentPlan && "border-purple-500/50 ring-1 ring-purple-500/20 shadow-2xl shadow-purple-500/10 scale-105 z-10",
        isPremium && !isCurrentPlan && "border-orange-500/30 hover:border-orange-500/50",
        !isFeatured && !isPremium && !isCurrentPlan && "border-gray-800 hover:border-gray-700"
      )}
      aria-label={`${getPlanDisplayName(plan)} plan`}
    >
      {/* Top Badge */}
      {planBadgeText[plan] && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge variant={getBadgeVariant()}>
            {planBadgeText[plan]}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="text-center pt-2">
        <Badge variant={getBadgeVariant()} className="mb-4">
          {getPlanDisplayName(plan)}
        </Badge>
        
        {/* Price */}
        <h4 className="mb-2 mt-4 text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {formatPrice(config.price_monthly_usd)}
        </h4>
        <p className="text-sm text-gray-500">
          per month
        </p>
        {plan === 'FREE' && (
          <div className="mt-2 space-y-1">
            <p className="text-cyan-400 text-xs font-semibold">✨ 7-day trial with UNLIMITED features</p>
            <p className="text-gray-500 text-xs">Then free forever with basic limits</p>
          </div>
        )}
      </div>

      <div className="my-5 border-t border-gray-800" />

      {/* Features List */}
      <ul className="space-y-3 flex-grow">
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

      {/* CTA Button */}
      <div className="mt-6 pt-4">
        <Button
          size="md"
          variant={getButtonVariant()}
          className="w-full"
          onClick={() => onSelect(plan)}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? '✓ Current Plan' : 'Choose Plan'}
        </Button>
      </div>

      {/* Current Plan Indicator */}
      {isCurrentPlan && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-green-500 text-white rounded-full p-1.5 shadow-lg shadow-green-500/30">
            <CircleCheck className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingSection() {
  const { subscription, upgrade } = useSubscription();

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (subscription && subscription.plan === plan) {
      return;
    }

    if (plan === 'FREE') {
      alert('Free plan is automatically available after your trial ends');
      return;
    }

    const confirmUpgrade = confirm(
      `Upgrade to ${getPlanDisplayName(plan)} for ${formatPrice(PLAN_CONFIG[plan].price_monthly_usd)}/month?`
    );

    if (confirmUpgrade) {
      await upgrade(plan);
      alert(`Successfully upgraded to ${getPlanDisplayName(plan)}!`);
    }
  };

  return (
    <Section>
      <Container className="flex flex-col items-center gap-6 text-center">
        {/* Header */}
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
        <div className="not-prose mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
          <PricingCard
            plan="FREE"
            isCurrentPlan={subscription?.plan === 'FREE'}
            onSelect={handleSelectPlan}
          />
          <PricingCard
            plan="PRO"
            isCurrentPlan={subscription?.plan === 'PRO'}
            onSelect={handleSelectPlan}
          />
          <PricingCard
            plan="UNLIMITED"
            isCurrentPlan={subscription?.plan === 'UNLIMITED'}
            onSelect={handleSelectPlan}
          />
        </div>

        {/* Comparison Table */}
        <div className="mt-12 w-full max-w-4xl">
          <h3 className="text-2xl font-bold text-white mb-6">
            Compare All Features
          </h3>
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800/50">
                    <th className="p-4 text-left text-gray-300 font-semibold text-sm">Feature</th>
                    <th className="p-4 text-center text-gray-300 font-semibold text-sm">Free</th>
                    <th className="p-4 text-center text-gray-300 font-semibold text-sm bg-purple-900/20">Pro</th>
                    <th className="p-4 text-center text-gray-300 font-semibold text-sm">Unlimited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    { feature: 'Entries per asset class', values: ['5', '20', '50'] },
                    { feature: 'AI calls per day', values: ['0', '20', '50'] },
                    { feature: 'Basic analytics', values: [true, true, true] },
                    { feature: 'Advanced analytics', values: [false, true, true] },
                    { feature: 'Email support', values: [true, true, true] },
                    { feature: 'Priority support', values: [false, false, true] },
                    { feature: 'Custom categories', values: [false, true, true] },
                    { feature: 'Export data', values: [false, true, true] },
                    { feature: 'API access', values: [false, false, true] },
                  ].map((row, index) => (
                    <tr key={index} className="hover:bg-gray-800/30 transition-colors">
                      <td className="p-4 text-gray-300 font-medium text-sm">{row.feature}</td>
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
                              "font-bold",
                              value === '0' ? 'text-gray-600' : 'text-gray-400'
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
                <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-1">Secure Payments</h4>
                <p className="text-gray-500 text-sm">Bank-level encryption with Stripe</p>
              </div>
              <div className="text-center group">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-1">30-Day Guarantee</h4>
                <p className="text-gray-500 text-sm">Full refund, no questions asked</p>
              </div>
              <div className="text-center group">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-1">Cancel Anytime</h4>
                <p className="text-gray-500 text-sm">No contracts or commitments</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
