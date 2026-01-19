"use client";

import * as React from 'react';
import { cn } from "@/lib/utils";
import { Check, X, ArrowLeft } from "lucide-react";
import { useRouter } from 'next/navigation';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { OmnifolioLogo } from '@/components/ui/omnifolio-logo';
import { useSubscription } from '@/hooks/use-subscription';
import { useBetterAuth } from '@/contexts/better-auth-context';
import type { SubscriptionPlan } from '@/types/subscription';

// --- 0. Shim Components (Replacing shadcn/ui with OmniFolio Branding) ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'default' | 'sm' | 'lg' | 'icon' }>(
  ({ className, size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          size === 'default' && "h-10 px-4 py-2",
          size === 'sm' && "h-9 rounded-md px-3",
          size === 'lg' && "h-11 rounded-md px-8",
          size === 'icon' && "h-10 w-10",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-3xl border border-white/10 bg-gray-900/40 backdrop-blur-sm text-card-foreground shadow-sm", className)} {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight text-white", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-gray-400", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

const ToggleGroup = React.forwardRef<HTMLDivElement, { value: string; onValueChange: (value: string) => void; type: 'single'; children: React.ReactNode; className?: string }>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, { 
              'data-state': child.props.value === value ? 'on' : 'off',
              onClick: () => onValueChange(child.props.value)
            });
          }
          return child;
        })}
      </div>
    );
  }
);
ToggleGroup.displayName = "ToggleGroup"

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          "data-[state=on]:bg-gray-800 data-[state=on]:text-white data-[state=on]:shadow-sm",
          "text-gray-400 hover:text-gray-200",
          className
        )}
        {...props}
      />
    )
  }
)
ToggleGroupItem.displayName = "ToggleGroupItem"


// --- 1. Typescript Interfaces (API) ---

type BillingCycle = 'monthly' | 'annually';

interface Feature {
  name: string;
  isIncluded: boolean;
  tooltip?: string;
}

interface PriceTier {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnually: number;
  isPopular: boolean;
  buttonLabel: string;
  features: Feature[];
}

interface PricingComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The list of pricing tiers to display. */
  plans: PriceTier[];
  /** The currently selected billing cycle. */
  billingCycle: BillingCycle;
  /** Callback function when the user changes the billing cycle. */
  onCycleChange: (cycle: BillingCycle) => void;
  /** Callback function when a user selects a plan. */
  onPlanSelect: (planId: string, cycle: BillingCycle) => void;
}

// --- 2. Utility Components ---

/** Renders a single feature row with an icon. */
const FeatureItem: React.FC<{ feature: Feature }> = ({ feature }) => {
  const Icon = feature.isIncluded ? Check : X;
  // Branding: text-primary -> text-purple-400, text-muted-foreground -> text-gray-600
  const iconColor = feature.isIncluded ? "text-purple-400" : "text-gray-600";

  return (
    <li className="flex items-start space-x-3 py-2">
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", iconColor)} aria-hidden="true" />
      <span className={cn("text-sm", feature.isIncluded ? "text-gray-200" : "text-gray-500")}>
        {feature.name}
      </span>
    </li>
  );
};

// --- 3. Main Component: PricingComponent ---

const PricingComponent: React.FC<PricingComponentProps> = ({
  plans,
  billingCycle,
  onCycleChange,
  onPlanSelect,
  className,
  ...props
}) => {
  // Note: Removed the strict check for 3 plans to accommodate our 4 plans (Starter, Trader, Investor, Whale)
  // if (plans.length !== 3) { ... }

  const annualDiscountPercent = 20; // Example: 20% discount for annual billing
  const [expandedPlans, setExpandedPlans] = React.useState<Set<string>>(new Set());

  const togglePlanFeatures = (planId: string) => {
    setExpandedPlans(prev => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  // --- 3.1. Billing Toggle ---
  const CycleToggle = (
    <div className="flex justify-center mb-10 mt-2">
      <ToggleGroup
        type="single"
        value={billingCycle}
        onValueChange={(value) => {
          if (value && (value === 'monthly' || value === 'annually')) {
            onCycleChange(value);
          }
        }}
        aria-label="Select billing cycle"
        className="border border-white/10 rounded-lg p-1 bg-gray-900/60"
      >
        <ToggleGroupItem
          value="monthly"
          aria-label="Monthly Billing"
          className="px-6 py-1.5 text-sm font-medium rounded-md transition-colors"
        >
          Monthly
        </ToggleGroupItem>
        <ToggleGroupItem
          value="annually"
          aria-label="Annual Billing"
          className="px-6 py-1.5 text-sm font-medium rounded-md transition-colors relative"
        >
          Annually
          <span className="absolute -top-3 right-0 text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 rounded-full whitespace-nowrap">
            Save {annualDiscountPercent}%
          </span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  // --- 3.2. Pricing Cards & Comparison Table Data ---

  // Extract all unique feature names across all plans for the comparison table header
  const allFeatures = Array.from(new Set(plans.flatMap(p => p.features.map(f => f.name))));
  
  // Render the list of pricing cards
  const PricingCards = (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 md:gap-6 lg:gap-6">
      {plans.map((plan) => {
        const isExpanded = expandedPlans.has(plan.id);
        const isFeatured = plan.isPopular;
        const currentPrice = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceAnnually;
        const originalMonthlyPrice = plan.priceMonthly;
        const priceSuffix = billingCycle === 'monthly' ? '/mo' : '/yr';

        return (
          <Card
            key={plan.id}
            className={cn(
              "flex flex-col transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-purple-500/5",
              isFeatured && "ring-2 ring-purple-500 shadow-xl shadow-purple-500/20 transform md:scale-[1.02] hover:scale-[1.04] z-10"
            )}
          >
            <CardHeader className="p-6 pb-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                {isFeatured && (
                  <span className="text-[10px] font-bold px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
              </div>
              <CardDescription className="text-sm mt-1 min-h-[40px]">{plan.description}</CardDescription>
              <div className="mt-4">
                <p className="text-4xl font-extrabold text-white">
                  ${currentPrice}
                  <span className="text-base font-normal text-gray-500 ml-1">{priceSuffix}</span>
                </p>
                {billingCycle === 'annually' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Billed annually (${plan.priceAnnually})
                  </p>
                )}
                {billingCycle === 'annually' && (
                    <p className="text-xs text-gray-500 line-through opacity-70 mt-1">
                        ${originalMonthlyPrice}/mo
                    </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-grow p-6 pt-0">
              <h4 className="text-sm font-semibold mb-2 mt-4 text-gray-300">Key Features:</h4>
              <ul className="list-none space-y-0">
                {plan.features.slice(0, 5).map((feature) => (
                  <FeatureItem key={feature.name} feature={feature} />
                ))}
                
                {isExpanded && plan.features.slice(5).map((feature) => (
                  <FeatureItem key={feature.name} feature={feature} />
                ))}

                {plan.features.length > 5 && (
                    <li 
                        className="text-sm text-gray-500 mt-2 pl-7 cursor-pointer hover:text-gray-300 transition-colors select-none"
                        onClick={(e) => {
                            e.preventDefault();
                            togglePlanFeatures(plan.id);
                        }}
                    >
                        {isExpanded ? "Show less" : `+ ${plan.features.length - 5} more features`}
                    </li>
                )}
              </ul>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button
                onClick={() => onPlanSelect(plan.id, billingCycle)}
                className={cn(
                  "w-full transition-all duration-200",
                  isFeatured
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-gray-800 text-white hover:bg-gray-700 border border-gray-700"
                )}
                size="lg"
                aria-label={`Select ${plan.name} plan for ${currentPrice} ${priceSuffix}`}
              >
                {plan.buttonLabel}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );

  // --- 3.3. Comparison Table (Mobile hidden, Tablet/Desktop visible) ---
  const ComparisonTable = (
    <div className="mt-16 hidden md:block border border-white/10 rounded-2xl overflow-hidden shadow-sm bg-gray-900/20 backdrop-blur-sm">
      <table className="min-w-full divide-y divide-white/10">
        <thead>
          <tr className="bg-white/5">
            <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-300 w-[200px] whitespace-nowrap">
              Feature
            </th>
            {plans.map((plan) => (
              <th
                key={`th-${plan.id}`}
                scope="col"
                className={cn(
                  "px-6 py-4 text-center text-sm font-semibold text-gray-300 whitespace-nowrap",
                  plan.isPopular && "bg-purple-500/10 text-purple-300"
                )}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {allFeatures.map((featureName, index) => (
            <tr key={featureName} className={cn("transition-colors hover:bg-white/5", index % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]")}>
              <td className="px-6 py-3 text-left text-sm font-medium text-gray-400 whitespace-nowrap">
                {featureName}
              </td>
              {plans.map((plan) => {
                const feature = plan.features.find(f => f.name === featureName);
                const isIncluded = feature?.isIncluded ?? false;
                const Icon = isIncluded ? Check : X;
                const iconColor = isIncluded ? "text-purple-400" : "text-gray-700";

                return (
                  <td
                    key={`${plan.id}-${featureName}`}
                    className={cn(
                      "px-6 py-3 text-center transition-all duration-150",
                      plan.isPopular && "bg-purple-500/5"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 mx-auto", iconColor)} aria-hidden="true" />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // --- 3.4. Final Render ---
  return (
    <div className={cn("w-full py-12 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", className)} {...props}>
      <header className="text-center mb-10">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          Choose the right plan for your <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">wealth</span>.
        </h2>
        <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
          Scale as you grow.
        </p>
      </header>
      
      {CycleToggle}
      
      {/* Pricing Cards (Mobile-first layout) */}
      <section aria-labelledby="pricing-plans">
        {PricingCards}
      </section>

      {/* Comparison Table (Desktop/Tablet visibility) */}
      <section aria-label="Feature Comparison Table" className="mt-16">
        <h3 className="text-2xl font-bold mb-6 hidden md:block text-center text-white">
          Detailed Feature Comparison
        </h3>
        {ComparisonTable}
      </section>
    </div>
  );
};

// --- 4. Data & Page Component ---

const omniPlans: PriceTier[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'Perfect for getting started.',
    priceMonthly: 0,
    priceAnnually: 0,
    isPopular: false,
    buttonLabel: 'Start Free',
    features: [
      { name: 'Multi Asset Tracking', isIncluded: true },
      { name: 'Real Time Updates', isIncluded: true },
      { name: 'Dual Currency Display', isIncluded: true },
      { name: 'Trading Accounts', isIncluded: true },
      { name: 'Basic Charts', isIncluded: true },
      { name: 'Advanced Tax Calculator', isIncluded: true },
      { name: 'Google Maps Integration', isIncluded: false },
      { name: 'Omni AI Assistant', isIncluded: false },
      { name: 'Priority Support', isIncluded: false },
    ],
  },
  {
    id: 'TRADER',
    name: 'Trader',
    description: 'For active traders.',
    priceMonthly: 9.99,
    priceAnnually: 99,
    isPopular: false,
    buttonLabel: 'Choose Trader',
    features: [
      { name: 'Multi Asset Tracking', isIncluded: true },
      { name: 'Real Time Updates', isIncluded: true },
      { name: 'Dual Currency Display', isIncluded: true },
      { name: 'Trading Accounts', isIncluded: true },
      { name: 'Advanced Charts', isIncluded: true },
      { name: 'Advanced Tax Calculator', isIncluded: true },
      { name: 'Google Maps Integration', isIncluded: true },
      { name: 'Omni AI Assistant (10/day)', isIncluded: true },
      { name: 'Priority Support', isIncluded: false },
    ],
  },
  {
    id: 'INVESTOR',
    name: 'Investor',
    description: 'For serious investors.',
    priceMonthly: 19.99,
    priceAnnually: 199,
    isPopular: true,
    buttonLabel: 'Choose Investor',
    features: [
      { name: 'Multi Asset Tracking', isIncluded: true },
      { name: 'Real Time Updates', isIncluded: true },
      { name: 'Dual Currency Display', isIncluded: true },
      { name: 'Trading Accounts', isIncluded: true },
      { name: 'Advanced Charts', isIncluded: true },
      { name: 'Advanced Tax Calculator', isIncluded: true },
      { name: 'Google Maps Integration', isIncluded: true },
      { name: 'Omni AI Assistant (50/day)', isIncluded: true },
      { name: 'Priority Support', isIncluded: true },
    ],
  },
  {
    id: 'WHALE',
    name: 'Whale',
    description: 'The ultimate experience.',
    priceMonthly: 49.99,
    priceAnnually: 499,
    isPopular: false,
    buttonLabel: 'Choose Whale',
    features: [
      { name: 'Multi Asset Tracking', isIncluded: true },
      { name: 'Real Time Updates', isIncluded: true },
      { name: 'Dual Currency Display', isIncluded: true },
      { name: 'Trading Accounts', isIncluded: true },
      { name: 'Advanced Charts', isIncluded: true },
      { name: 'Advanced Tax Calculator', isIncluded: true },
      { name: 'Google Maps Integration', isIncluded: true },
      { name: 'Omni AI Assistant (Unlimited)', isIncluded: true },
      { name: 'Priority Support', isIncluded: true },
      { name: 'VIP Support', isIncluded: true },
      { name: 'Beta Access', isIncluded: true },
    ],
  },
];

export default function BillingPage() {
  const router = useRouter();
  const { startCheckout } = useSubscription();
  const { user } = useBetterAuth();
  const [cycle, setCycle] = React.useState<BillingCycle>('monthly');

  const handleCycleChange = (newCycle: BillingCycle) => {
    setCycle(newCycle);
  };

  const handlePlanSelect = async (planId: string, currentCycle: BillingCycle) => {
    console.log(`User selected plan: ${planId} with cycle: ${currentCycle}`);
    
    if (!user) {
      // Redirect to login if not logged in
      router.push('/login');
      return;
    }

    if (planId === 'STARTER') {
        // Handle starter plan selection (maybe nothing needed if it's default)
        return;
    }

    try {
        await startCheckout(planId as SubscriptionPlan, { id: user.id, email: user.email }, currentCycle === 'annually' ? 'yearly' : 'monthly');
    } catch (error) {
        console.error("Checkout failed", error);
    }
  };

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
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleBackToHome}>
              <OmnifolioLogo size="sm" />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-20">
        <PricingComponent
          plans={omniPlans}
          billingCycle={cycle}
          onCycleChange={handleCycleChange}
          onPlanSelect={handlePlanSelect}
        />
      </main>
    </div>
  );
}
