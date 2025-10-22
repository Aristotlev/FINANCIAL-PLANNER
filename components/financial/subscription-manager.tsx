"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  ChevronRight,
  X,
  Check
} from "lucide-react";
import { formatNumber } from "../../lib/utils";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";

export interface SubscriptionItem {
  id: string;
  name: string;
  amount: number;
  billing_cycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  next_billing_date: string;
  category: string;
  description: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface SubscriptionManagerProps {
  onSubscriptionsChange?: (subscriptions: SubscriptionItem[]) => void;
}

// Calculate days until next billing
const getDaysUntilBilling = (nextBillingDate: string): number => {
  const today = new Date();
  const billingDate = new Date(nextBillingDate);
  const diffTime = billingDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Calculate yearly cost based on billing cycle
const calculateYearlyCost = (amount: number, billingCycle: string): number => {
  switch (billingCycle) {
    case 'weekly':
      return amount * 52;
    case 'monthly':
      return amount * 12;
    case 'quarterly':
      return amount * 4;
    case 'yearly':
      return amount;
    default:
      return amount * 12;
  }
};

// Get next billing date after current one
const getNextBillingDate = (currentDate: string, billingCycle: string): string => {
  const date = new Date(currentDate);
  
  switch (billingCycle) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
};

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

// Popular subscription services database
// Prices are updated via live API, these are fallback values
const RECOMMENDED_SUBSCRIPTIONS = [
  // AI Tools (Popular - shown first)
  { name: 'ChatGPT Plus', amount: 20.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'OpenAI GPT-4 access' },
  { name: 'Claude Pro', amount: 20.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'Anthropic Claude AI' },
  { name: 'Gemini Advanced', amount: 19.99, billing_cycle: 'monthly', category: 'AI Tools', description: 'Google AI with 2TB storage' },
  { name: 'GitHub Copilot', amount: 10.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'AI pair programmer' },
  { name: 'Midjourney', amount: 30.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'AI image generation' },
  { name: 'ElevenLabs', amount: 22.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'AI voice generation' },
  { name: 'HeyGen', amount: 29.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'AI video generation' },
  { name: 'Perplexity Pro', amount: 20.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'AI-powered search' },
  
  // Entertainment & Streaming
  { name: 'Netflix', amount: 15.49, billing_cycle: 'monthly', category: 'Entertainment', description: 'Streaming movies and TV shows' },
  { name: 'Disney+', amount: 13.99, billing_cycle: 'monthly', category: 'Entertainment', description: 'Disney, Pixar, Marvel, Star Wars content' },
  { name: 'Spotify', amount: 11.99, billing_cycle: 'monthly', category: 'Music', description: 'Music streaming service' },
  { name: 'YouTube Premium', amount: 13.99, billing_cycle: 'monthly', category: 'Entertainment', description: 'Ad-free YouTube and YouTube Music' },
  
  // Productivity & Creative (Popular)
  { name: 'Notion', amount: 10.00, billing_cycle: 'monthly', category: 'Productivity', description: 'All-in-one workspace' },
  { name: 'Canva Pro', amount: 14.99, billing_cycle: 'monthly', category: 'Creative', description: 'Graphic design platform' },
  { name: 'Figma', amount: 15.00, billing_cycle: 'monthly', category: 'Creative', description: 'Collaborative design tool' },
  { name: 'Grammarly Premium', amount: 12.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'AI writing assistant' },
  { name: 'Microsoft 365', amount: 9.99, billing_cycle: 'monthly', category: 'Productivity', description: 'Office apps and cloud storage' },
  { name: 'Adobe Creative Cloud', amount: 59.99, billing_cycle: 'monthly', category: 'Creative', description: 'All Adobe apps' },
  
  // More Streaming
  { name: 'Hulu', amount: 17.99, billing_cycle: 'monthly', category: 'Entertainment', description: 'Streaming TV shows and movies' },
  { name: 'HBO Max', amount: 15.99, billing_cycle: 'monthly', category: 'Entertainment', description: 'Premium streaming service' },
  { name: 'Amazon Prime Video', amount: 8.99, billing_cycle: 'monthly', category: 'Entertainment', description: 'Video streaming service' },
  { name: 'Apple TV+', amount: 9.99, billing_cycle: 'monthly', category: 'Entertainment', description: 'Apple original content streaming' },
  { name: 'Paramount+', amount: 11.99, billing_cycle: 'monthly', category: 'Entertainment', description: 'Paramount streaming service' },
  { name: 'Peacock', amount: 11.99, billing_cycle: 'monthly', category: 'Entertainment', description: 'NBCUniversal streaming service' },
  { name: 'Max', amount: 15.99, billing_cycle: 'monthly', category: 'Entertainment', description: 'HBO and Discovery content' },
  
  // More Music
  { name: 'Apple Music', amount: 10.99, billing_cycle: 'monthly', category: 'Music', description: 'Apple music streaming service' },
  { name: 'YouTube Music', amount: 10.99, billing_cycle: 'monthly', category: 'Music', description: 'Music streaming from YouTube' },
  { name: 'Tidal', amount: 10.99, billing_cycle: 'monthly', category: 'Music', description: 'High-fidelity music streaming' },
  { name: 'Amazon Music Unlimited', amount: 10.99, billing_cycle: 'monthly', category: 'Music', description: 'Amazon music streaming' },
  
  // More AI Tools
  { name: 'ChatGPT Pro', amount: 200.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'Unlimited GPT-4, o1 access' },
  { name: 'Runway ML', amount: 15.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'AI video editing tools' },
  { name: 'Jasper AI', amount: 49.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'AI content writing' },
  { name: 'Copy.ai', amount: 49.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'AI copywriting tool' },
  { name: 'Grok', amount: 8.00, billing_cycle: 'monthly', category: 'AI Tools', description: 'X Premium AI assistant' },
  
  // More Productivity & Cloud
  { name: 'Google One', amount: 9.99, billing_cycle: 'monthly', category: 'Cloud Storage', description: 'Google cloud storage (2TB)' },
  { name: 'iCloud+', amount: 9.99, billing_cycle: 'monthly', category: 'Cloud Storage', description: 'Apple cloud storage (2TB)' },
  { name: 'Dropbox', amount: 11.99, billing_cycle: 'monthly', category: 'Cloud Storage', description: 'Cloud file storage and sync' },
  { name: 'Evernote', amount: 14.99, billing_cycle: 'monthly', category: 'Productivity', description: 'Note-taking and organization' },
  
  // More Creative Tools
  { name: 'Adobe Photoshop', amount: 22.99, billing_cycle: 'monthly', category: 'Creative', description: 'Photo editing software' },
  { name: 'Adobe Lightroom', amount: 9.99, billing_cycle: 'monthly', category: 'Creative', description: 'Photo editing and organization' },
  { name: 'Adobe Premiere Pro', amount: 22.99, billing_cycle: 'monthly', category: 'Creative', description: 'Video editing software' },
  
  // Gaming
  { name: 'Xbox Game Pass Ultimate', amount: 19.99, billing_cycle: 'monthly', category: 'Gaming', description: 'Xbox and PC game library' },
  { name: 'PlayStation Plus', amount: 17.99, billing_cycle: 'monthly', category: 'Gaming', description: 'PlayStation online gaming' },
  { name: 'Nintendo Switch Online', amount: 3.99, billing_cycle: 'monthly', category: 'Gaming', description: 'Nintendo online services' },
  { name: 'EA Play', amount: 4.99, billing_cycle: 'monthly', category: 'Gaming', description: 'EA games library' },
  
  // Fitness & Health
  { name: 'Planet Fitness', amount: 24.99, billing_cycle: 'monthly', category: 'Fitness', description: 'Gym membership' },
  { name: 'LA Fitness', amount: 34.99, billing_cycle: 'monthly', category: 'Fitness', description: 'Gym membership' },
  { name: 'Peloton', amount: 44.00, billing_cycle: 'monthly', category: 'Fitness', description: 'Digital fitness classes' },
  { name: 'Apple Fitness+', amount: 9.99, billing_cycle: 'monthly', category: 'Fitness', description: 'Apple workout classes' },
  { name: 'Headspace', amount: 12.99, billing_cycle: 'monthly', category: 'Health', description: 'Meditation and mindfulness' },
  { name: 'Calm', amount: 14.99, billing_cycle: 'monthly', category: 'Health', description: 'Sleep and meditation app' },
  
  // News & Reading
  { name: 'The New York Times', amount: 17.00, billing_cycle: 'monthly', category: 'News', description: 'Digital news subscription' },
  { name: 'The Washington Post', amount: 12.00, billing_cycle: 'monthly', category: 'News', description: 'Digital news subscription' },
  { name: 'Medium', amount: 5.00, billing_cycle: 'monthly', category: 'Reading', description: 'Online publishing platform' },
  { name: 'Kindle Unlimited', amount: 11.99, billing_cycle: 'monthly', category: 'Reading', description: 'eBook subscription service' },
  { name: 'Audible', amount: 14.95, billing_cycle: 'monthly', category: 'Reading', description: 'Audiobook subscription' },
  
  // Developer Tools
  { name: 'GitHub Pro', amount: 4.00, billing_cycle: 'monthly', category: 'Developer Tools', description: 'Code hosting platform' },
  { name: 'Replit Core', amount: 20.00, billing_cycle: 'monthly', category: 'Developer Tools', description: 'Online IDE with AI' },
  { name: 'Linear', amount: 10.00, billing_cycle: 'monthly', category: 'Developer Tools', description: 'Issue tracking software' },
  { name: 'AWS', amount: 50.00, billing_cycle: 'monthly', category: 'Cloud Services', description: 'Amazon Web Services' },
  { name: 'Google Cloud', amount: 50.00, billing_cycle: 'monthly', category: 'Cloud Services', description: 'Google Cloud Platform' },
  { name: 'Heroku', amount: 7.00, billing_cycle: 'monthly', category: 'Cloud Services', description: 'Cloud application platform' },
  { name: 'Vercel', amount: 20.00, billing_cycle: 'monthly', category: 'Cloud Services', description: 'Frontend cloud platform' },
  
  // Communication
  { name: 'Slack', amount: 8.00, billing_cycle: 'monthly', category: 'Communication', description: 'Team collaboration platform' },
  { name: 'Zoom', amount: 14.99, billing_cycle: 'monthly', category: 'Communication', description: 'Video conferencing' },
  { name: 'Discord Nitro', amount: 9.99, billing_cycle: 'monthly', category: 'Communication', description: 'Enhanced Discord features' },
  
  // VPN & Security
  { name: 'NordVPN', amount: 12.99, billing_cycle: 'monthly', category: 'Security', description: 'VPN service' },
  { name: 'ExpressVPN', amount: 12.95, billing_cycle: 'monthly', category: 'Security', description: 'VPN service' },
  { name: '1Password', amount: 7.99, billing_cycle: 'monthly', category: 'Security', description: 'Password manager' },
  { name: 'LastPass', amount: 3.00, billing_cycle: 'monthly', category: 'Security', description: 'Password manager' },
  
  // Food & Delivery
  { name: 'DoorDash DashPass', amount: 9.99, billing_cycle: 'monthly', category: 'Food Delivery', description: 'Food delivery subscription' },
  { name: 'Uber One', amount: 9.99, billing_cycle: 'monthly', category: 'Food Delivery', description: 'Uber Eats and rides benefits' },
  { name: 'Instacart+', amount: 9.99, billing_cycle: 'monthly', category: 'Food Delivery', description: 'Grocery delivery subscription' },
  
  // Utilities
  { name: 'Internet', amount: 70.00, billing_cycle: 'monthly', category: 'Utilities', description: 'Home internet service' },
  { name: 'Mobile Phone', amount: 60.00, billing_cycle: 'monthly', category: 'Utilities', description: 'Cell phone service' },
  { name: 'Electricity', amount: 120.00, billing_cycle: 'monthly', category: 'Utilities', description: 'Electric utility' },
  { name: 'Water', amount: 50.00, billing_cycle: 'monthly', category: 'Utilities', description: 'Water utility' },
  { name: 'Gas', amount: 80.00, billing_cycle: 'monthly', category: 'Utilities', description: 'Natural gas utility' },
];

function AddEditSubscriptionModal({
  isOpen,
  onClose,
  onSave,
  subscription
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subscription: Omit<SubscriptionItem, 'id'> | SubscriptionItem) => void;
  subscription?: SubscriptionItem | null;
}) {
  const [formData, setFormData] = useState<Omit<SubscriptionItem, 'id'>>({
    name: '',
    amount: 0,
    billing_cycle: 'monthly',
    next_billing_date: '',
    category: 'Subscriptions',
    description: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (subscription) {
      setFormData({
        name: subscription.name,
        amount: subscription.amount,
        billing_cycle: subscription.billing_cycle,
        next_billing_date: subscription.next_billing_date,
        category: subscription.category,
        description: subscription.description
      });
      setSearchTerm(subscription.name);
    } else {
      // Set default next billing date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        name: '',
        amount: 0,
        billing_cycle: 'monthly',
        next_billing_date: tomorrow.toISOString().split('T')[0],
        category: 'Subscriptions',
        description: ''
      });
      setSearchTerm('');
    }
  }, [subscription, isOpen]);

  // Fetch live prices for recommended subscriptions
  useEffect(() => {
    const fetchLivePrices = async () => {
      if (!showDropdown || fetchingPrices) return;
      
      setFetchingPrices(true);
      try {
        const subscriptionNames = RECOMMENDED_SUBSCRIPTIONS.slice(0, 50).map(sub => sub.name);
        const response = await fetch('/api/subscription-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: subscriptionNames })
        });
        
        if (response.ok) {
          const data = await response.json();
          const priceMap: Record<string, number> = {};
          data.results.forEach((result: any) => {
            if (result.found) {
              priceMap[result.name] = result.amount;
            }
          });
          setLivePrices(priceMap);
        }
      } catch (error) {
        console.error('Error fetching live prices:', error);
      } finally {
        setFetchingPrices(false);
      }
    };

    fetchLivePrices();
  }, [showDropdown]);

  // Filter subscriptions based on search
  const filteredSubscriptions = searchTerm.length > 0
    ? RECOMMENDED_SUBSCRIPTIONS.filter(sub =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.description.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 15) // Limit to top 15 results
    : RECOMMENDED_SUBSCRIPTIONS.slice(0, 20); // Show top 20 popular ones by default
  
  // Update subscriptions with live prices
  const subscriptionsWithLivePrices = filteredSubscriptions.map(sub => ({
    ...sub,
    amount: livePrices[sub.name] || sub.amount
  }));

  const selectSubscription = (sub: typeof RECOMMENDED_SUBSCRIPTIONS[0]) => {
    setFormData({
      ...formData,
      name: sub.name,
      amount: sub.amount,
      billing_cycle: sub.billing_cycle as any,
      category: sub.category,
      description: sub.description
    });
    setSearchTerm(sub.name);
    setShowDropdown(false);
  };

  // Calculate dropdown position based on available space
  useEffect(() => {
    if (showDropdown && inputRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;
      const dropdownHeight = 320; // max-h-[320px]

      // Position dropdown above if not enough space below
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [showDropdown]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subscription) {
      onSave({ ...formData, id: subscription.id });
    } else {
      onSave(formData);
    }
    onClose();
  };

  if (!isOpen) return null;

  const yearlyCost = calculateYearlyCost(formData.amount, formData.billing_cycle);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000003] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-[500px] max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {subscription ? 'Edit Subscription' : 'Add Subscription'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
              Service Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm || formData.name}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setFormData({...formData, name: e.target.value});
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => {
                // Delay hiding dropdown to allow click events to register
                setTimeout(() => setShowDropdown(false), 250);
              }}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              placeholder="Search popular subscriptions or enter custom..."
              required
            />
            
            {/* Dropdown with recommended subscriptions */}
            {showDropdown && subscriptionsWithLivePrices.length > 0 && (
              <div
                ref={dropdownRef}
                className={`absolute z-[15010] w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto ${
                  dropdownPosition === 'bottom' ? 'mt-1' : 'bottom-full mb-1'
                }`}
              >
                {subscriptionsWithLivePrices.map((sub, index) => (
                  <button
                    key={index}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSubscription(sub);
                    }}
                    className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-start gap-3 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                          {sub.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-semibold whitespace-nowrap">
                          {sub.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {sub.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <div className="font-bold text-cyan-600 dark:text-cyan-400">
                          ${sub.amount.toFixed(2)}
                        </div>
                        {livePrices[sub.name] && (
                          <span className="text-[8px] text-green-600 dark:text-green-400" title="Live price">
                            ●
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        /{sub.billing_cycle === 'monthly' ? 'mo' : sub.billing_cycle === 'yearly' ? 'yr' : sub.billing_cycle === 'quarterly' ? 'qtr' : 'wk'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* No results message */}
            {showDropdown && searchTerm && filteredSubscriptions.length === 0 && (
              <div className="absolute z-[15010] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  No matching subscriptions found for "{searchTerm}"
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
                  Continue typing to add a custom subscription
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 pl-7 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
                Billing Cycle
              </label>
              <select
                value={formData.billing_cycle}
                onChange={(e) => setFormData({...formData, billing_cycle: e.target.value as any})}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
              Next Billing Date
            </label>
            <input
              type="date"
              value={formData.next_billing_date}
              onChange={(e) => setFormData({...formData, next_billing_date: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
              Category (Optional)
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              placeholder="e.g., Entertainment, Productivity, Cloud Services"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              rows={2}
              placeholder="Notes about this subscription..."
            />
          </div>

          {/* Yearly Cost Preview */}
          <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Yearly Cost</span>
              <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                ${formatNumber(yearlyCost)}
              </span>
            </div>
          </div>

        </form>
        
        <div className="flex gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2.5 rounded-lg font-bold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40"
          >
            {subscription ? '✓ Update' : '+ Add'} Subscription
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionCalendar({ subscriptions }: { subscriptions: SubscriptionItem[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  
  // Get subscriptions for each day of the month
  const getSubscriptionsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return subscriptions.filter(sub => sub.next_billing_date === dateStr);
  };
  
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-16" />);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const daySubs = getSubscriptionsForDay(day);
    const isToday = new Date().getDate() === day && 
                    new Date().getMonth() === currentMonth.getMonth() &&
                    new Date().getFullYear() === currentMonth.getFullYear();
    
    days.push(
      <div 
        key={day} 
        className={`h-16 border border-gray-200 dark:border-gray-700 p-1 ${
          isToday ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-400' : ''
        }`}
      >
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{day}</div>
        {daySubs.length > 0 && (
          <div className="space-y-0.5 mt-1">
            {daySubs.slice(0, 2).map(sub => (
              <div 
                key={sub.id}
                className="text-[9px] bg-cyan-500 text-white px-1 py-0.5 rounded truncate"
                title={`${sub.name} - $${formatNumber(sub.amount)}`}
              >
                ${formatNumber(sub.amount)}
              </div>
            ))}
            {daySubs.length > 2 && (
              <div className="text-[8px] text-gray-500 dark:text-gray-400">+{daySubs.length - 2}</div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <h3 className="font-semibold text-gray-900 dark:text-white">{monthName}</h3>
        <button 
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-xs font-medium text-center text-gray-600 dark:text-gray-400 pb-2">
            {day}
          </div>
        ))}
        {days}
      </div>
    </div>
  );
}

export function SubscriptionManager({ onSubscriptionsChange }: SubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Load subscriptions on mount
  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        const data = await SupabaseDataService.getSubscriptions([]);
        setSubscriptions(data);
        onSubscriptionsChange?.(data);
      } catch (error) {
        console.error('Error loading subscriptions:', error);
      }
    };
    loadSubscriptions();
  }, []);

  const handleSaveSubscription = async (subscriptionData: Omit<SubscriptionItem, 'id'> | SubscriptionItem) => {
    try {
      let newSubscription: SubscriptionItem;
      
      if ('id' in subscriptionData) {
        // Update existing
        newSubscription = subscriptionData as SubscriptionItem;
        await SupabaseDataService.saveSubscription(newSubscription);
        setSubscriptions(subscriptions.map(sub => 
          sub.id === newSubscription.id ? newSubscription : sub
        ));
      } else {
        // Create new
        newSubscription = {
          ...subscriptionData,
          id: Date.now().toString()
        };
        await SupabaseDataService.saveSubscription(newSubscription);
        setSubscriptions([...subscriptions, newSubscription]);
      }
      
      onSubscriptionsChange?.([...subscriptions.filter(s => s.id !== newSubscription.id), newSubscription]);
      setEditingSubscription(null);
      window.dispatchEvent(new Event('financialDataChanged'));
    } catch (error) {
      console.error('Error saving subscription:', error);
      alert('Failed to save subscription. Please try again.');
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    
    try {
      await SupabaseDataService.deleteSubscription(subscriptionId);
      const updated = subscriptions.filter(sub => sub.id !== subscriptionId);
      setSubscriptions(updated);
      onSubscriptionsChange?.(updated);
      window.dispatchEvent(new Event('financialDataChanged'));
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Failed to delete subscription. Please try again.');
    }
  };

  const handleEditSubscription = (subscription: SubscriptionItem) => {
    setEditingSubscription(subscription);
    setShowModal(true);
  };

  // Calculate totals
  const totalMonthly = subscriptions.reduce((sum, sub) => {
    switch (sub.billing_cycle) {
      case 'weekly': return sum + (sub.amount * 52 / 12);
      case 'monthly': return sum + sub.amount;
      case 'quarterly': return sum + (sub.amount * 4 / 12);
      case 'yearly': return sum + (sub.amount / 12);
      default: return sum + sub.amount;
    }
  }, 0);

  const totalYearly = subscriptions.reduce((sum, sub) => 
    sum + calculateYearlyCost(sub.amount, sub.billing_cycle), 0
  );

  // Sort subscriptions by next billing date
  const sortedSubscriptions = [...subscriptions].sort((a, b) => 
    new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime()
  );

  // Get upcoming subscriptions (next 30 days)
  const upcomingSubscriptions = sortedSubscriptions.filter(sub => {
    const days = getDaysUntilBilling(sub.next_billing_date);
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-cyan-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Cost</span>
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
            ${formatNumber(totalMonthly)}
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Yearly Cost</span>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            ${formatNumber(totalYearly)}
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Upcoming (30d)</span>
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {upcomingSubscriptions.length}
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {subscriptions.length}
          </div>
        </div>
      </div>

      {/* View Toggle and Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-cyan-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'calendar' 
                ? 'bg-cyan-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Calendar View
          </button>
        </div>

        <button
          onClick={() => {
            setEditingSubscription(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Subscription
        </button>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <SubscriptionCalendar subscriptions={subscriptions} />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {sortedSubscriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No subscriptions yet</p>
              <p className="text-sm">Click "Add Subscription" to start tracking your recurring expenses</p>
            </div>
          ) : (
            sortedSubscriptions.map((subscription) => {
              const daysUntil = getDaysUntilBilling(subscription.next_billing_date);
              const yearlyCost = calculateYearlyCost(subscription.amount, subscription.billing_cycle);
              const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
              const isDue = daysUntil === 0;
              const isOverdue = daysUntil < 0;
              
              return (
                <div 
                  key={subscription.id}
                  className={`p-4 bg-white dark:bg-gray-800 rounded-lg border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${
                    isOverdue 
                      ? 'border-red-300 dark:border-red-600 hover:shadow-red-500/30'
                      : isDue
                      ? 'border-orange-300 dark:border-orange-600 hover:shadow-orange-500/30'
                      : isUpcoming
                      ? 'border-yellow-300 dark:border-yellow-600 hover:shadow-yellow-500/30'
                      : 'border-gray-200 dark:border-gray-700 hover:shadow-cyan-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{subscription.name}</h4>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {subscription.billing_cycle}
                            </span>
                            {isOverdue && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                            {isDue && (
                              <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Due Today
                              </span>
                            )}
                            {isUpcoming && !isDue && (
                              <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                                Due in {daysUntil}d
                              </span>
                            )}
                          </div>
                          {subscription.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {subscription.description}
                            </p>
                          )}
                          {subscription.category && subscription.category !== 'Subscriptions' && (
                            <span className="text-xs text-gray-500 dark:text-gray-500 mt-1 inline-block">
                              {subscription.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-3 pl-13">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Amount</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            ${formatNumber(subscription.amount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Yearly Cost</div>
                          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            ${formatNumber(yearlyCost)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Next Billing</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatDate(subscription.next_billing_date)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {daysUntil >= 0 ? `in ${daysUntil} days` : `${Math.abs(daysUntil)} days ago`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 ml-4">
                      <button
                        onClick={() => handleEditSubscription(subscription)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Edit subscription"
                      >
                        <Edit3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubscription(subscription.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Delete subscription"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddEditSubscriptionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSubscription(null);
        }}
        onSave={handleSaveSubscription}
        subscription={editingSubscription}
      />
    </div>
  );
}
