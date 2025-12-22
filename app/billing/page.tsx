/**
 * Billing & Pricing Plans Page
 * Comprehensive billing management with payment methods, history, and subscription control
 */

"use client";

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  CreditCard, 
  Shield, 
  Lock, 
  Receipt, 
  Wallet,
  Calendar,
  Download,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Settings,
  RefreshCw,
  XCircle,
  Star,
  Sparkles
} from 'lucide-react';
import PricingSection from '@/components/pricing/pricing-section';
import SubscriptionDashboard from '@/components/pricing/subscription-dashboard';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
import { formatPrice, getPlanDisplayName, PLAN_CONFIG } from '@/types/subscription';

type BillingTab = 'overview' | 'plans' | 'payment-methods' | 'history' | 'settings';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  last4: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
  email?: string;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  pdfUrl?: string;
}

// Mock data for demonstration
const mockPaymentMethods: PaymentMethod[] = [
  { id: '1', type: 'card', last4: '4242', brand: 'Visa', expMonth: 12, expYear: 2027, isDefault: true },
  { id: '2', type: 'card', last4: '8888', brand: 'Mastercard', expMonth: 6, expYear: 2026, isDefault: false },
];

  const mockInvoices: Invoice[] = [
  { id: 'INV-2024-001', date: '2024-12-01', amount: 19.99, status: 'paid', description: 'Investor Plan - Monthly' },
  { id: 'INV-2024-002', date: '2024-11-01', amount: 19.99, status: 'paid', description: 'Investor Plan - Monthly' },
  { id: 'INV-2024-003', date: '2024-10-01', amount: 19.99, status: 'paid', description: 'Investor Plan - Monthly' },
  { id: 'INV-2024-004', date: '2024-09-01', amount: 0, status: 'paid', description: 'Starter Plan' },
];export default function BillingPage() {
  const router = useRouter();
  const { subscription, cancel } = useSubscription();
  const [activeTab, setActiveTab] = useState<BillingTab>('overview');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [invoices] = useState<Invoice[]>(mockInvoices);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const tabs: { id: BillingTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Wallet className="w-4 h-4" /> },
    { id: 'plans', label: 'Plans', icon: <Star className="w-4 h-4" /> },
    { id: 'payment-methods', label: 'Payment Methods', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'history', label: 'Billing History', icon: <Receipt className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleSetDefaultPayment = (id: string) => {
    setPaymentMethods(methods => 
      methods.map(m => ({ ...m, isDefault: m.id === id }))
    );
  };

  const handleRemovePayment = (id: string) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      setPaymentMethods(methods => methods.filter(m => m.id !== id));
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
    }
  };

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'amex': return '💳';
      default: return '💳';
    }
  };

  const nextBillingDate = subscription?.subscription_end_date 
    ? new Date(subscription.subscription_end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'January 18, 2025';

  const currentPlanConfig = (subscription?.plan && PLAN_CONFIG[subscription.plan]) 
    ? PLAN_CONFIG[subscription.plan] 
    : PLAN_CONFIG.STARTER;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-200/50 dark:border-green-700/50">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Billing & Plans
            </h1>
          </div>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Manage your subscription, payment methods, and billing history
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 p-1.5 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 min-w-max mx-auto max-w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Quick Stats */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                      <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Current Plan</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {subscription ? getPlanDisplayName(subscription.plan) : 'Starter Plan'}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                      <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Monthly Cost</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(currentPlanConfig.price_monthly_usd)}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Next Billing</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {nextBillingDate}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                      <Receipt className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Spent</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(invoices.reduce((sum, inv) => sum + inv.amount, 0))}
                  </p>
                </div>
              </div>

              {/* Current Subscription Dashboard */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Your Subscription
                  </h2>
                </div>
                <SubscriptionDashboard />
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700 hover:shadow-md transition-all group"
                  >
                    <div className="p-2 bg-blue-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                      <Star className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">Change Plan</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Upgrade or downgrade</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                  </button>

                  <button
                    onClick={() => setActiveTab('payment-methods')}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700 hover:shadow-md transition-all group"
                  >
                    <div className="p-2 bg-green-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">Payment Methods</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Add or update cards</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                  </button>

                  <button
                    onClick={() => setActiveTab('history')}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700 hover:shadow-md transition-all group"
                  >
                    <div className="p-2 bg-yellow-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">View Invoices</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Download receipts</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                  </button>

                  <button
                    onClick={() => setActiveTab('settings')}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group"
                  >
                    <div className="p-2 bg-gray-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">Billing Settings</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Preferences & more</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Plans Tab */}
          {activeTab === 'plans' && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Choose Your Plan
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Simple, transparent pricing for everyone
                </p>
              </div>
              <PricingSection />

              {/* Trust Badges */}
              <div className="mt-12 bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-12 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <h3 className="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
                  Why Choose OmniFolio?
                </h3>
                <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
                  <div className="text-center group">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Secure Payments</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Bank-level encryption with Stripe</p>
                  </div>
                  
                  <div className="text-center group">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">30-Day Guarantee</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Full refund, no questions asked</p>
                  </div>
                  
                  <div className="text-center group">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <CreditCard className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Cancel Anytime</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">No contracts or commitments</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Payment Methods Tab */}
          {activeTab === 'payment-methods' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Payment Methods</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your payment methods securely</p>
                </div>
                <button
                  onClick={() => setShowAddPayment(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  Add New
                </button>
              </div>

              {/* Payment Methods List */}
              <div className="space-y-4">
                {paymentMethods.map(method => (
                  <div
                    key={method.id}
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 transition-all ${
                      method.isDefault 
                        ? 'border-blue-500 shadow-lg shadow-blue-500/10' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{getCardIcon(method.brand)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 dark:text-white">
                              {method.brand} •••• {method.last4}
                            </p>
                            {method.isDefault && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Expires {method.expMonth}/{method.expYear}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.isDefault && (
                          <button
                            onClick={() => handleSetDefaultPayment(method.id)}
                            className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleRemovePayment(method.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {paymentMethods.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">No payment methods added</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Add a card to start your subscription</p>
                  </div>
                )}
              </div>

              {/* Add Payment Modal */}
              {showAddPayment && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add Payment Method</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Card Number</label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiry</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CVC</label>
                          <input
                            type="text"
                            placeholder="123"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Lock className="w-4 h-4" />
                        Secured by Stripe - Your data is encrypted
                      </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                      <button
                        onClick={() => setShowAddPayment(false)}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          // Mock adding a new payment method
                          setPaymentMethods([...paymentMethods, {
                            id: crypto.randomUUID(),
                            type: 'card',
                            last4: '1234',
                            brand: 'Visa',
                            expMonth: 12,
                            expYear: 2028,
                            isDefault: paymentMethods.length === 0
                          }]);
                          setShowAddPayment(false);
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                      >
                        Add Card
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Billing History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Billing History</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">View and download your past invoices</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <Download className="w-5 h-5" />
                  Export All
                </button>
              </div>

              {/* Invoice List */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Invoice</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Date</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Status</th>
                        <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {invoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{invoice.id}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-700 dark:text-gray-300">
                            {new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white">
                            {formatPrice(invoice.amount)}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(invoice.status)}`}>
                              {getStatusIcon(invoice.status)}
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              <Download className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Billing Settings</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your billing preferences and subscription</p>
              </div>

              {/* Billing Email */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Billing Email</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Invoices and billing notifications will be sent to this email</p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    defaultValue="user@example.com"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
                    Update
                  </button>
                </div>
              </div>

              {/* Auto-Renewal */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Auto-Renewal</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Automatically renew your subscription each billing period</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Invoice Preferences */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Invoice Preferences</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 dark:text-gray-300">Send invoice via email after each payment</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 dark:text-gray-300">Include company details on invoices</span>
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border-2 border-red-200 dark:border-red-800">
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Danger Zone</h3>
                <p className="text-red-600 dark:text-red-300 mb-4">
                  Cancel your subscription or delete your billing information. This action cannot be undone.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2.5 bg-white dark:bg-gray-800 text-red-600 border-2 border-red-300 dark:border-red-700 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Cancel Subscription
                  </button>
                </div>
              </div>

              {/* Cancel Modal */}
              {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cancel Subscription?</h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        You'll lose access to premium features at the end of your billing period.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCancelModal(false)}
                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        Keep Subscription
                      </button>
                      <button
                        onClick={async () => {
                          const success = await cancel();
                          if (success) {
                            alert('Subscription cancelled. You will have access until the end of your billing period.');
                          } else {
                            alert('Failed to cancel subscription. Please try again.');
                          }
                          setShowCancelModal(false);
                        }}
                        className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                      >
                        Cancel Anyway
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FAQ Section - Show on Plans Tab */}
        {activeTab === 'plans' && (
          <div className="mt-12">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Frequently Asked Questions
            </h3>
            <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
              {[
                {
                  q: "How does billing work?",
                  a: "You're billed monthly. Your subscription automatically renews unless you cancel. Starter plan users are never charged."
                },
                {
                  q: "Can I upgrade or downgrade?",
                  a: "Yes! You can change your plan at any time. Upgrades are instant, and downgrades take effect at the end of your billing period."
                },
                {
                  q: "What payment methods do you accept?",
                  a: "We accept all major credit cards (Visa, Mastercard, Amex), debit cards, and digital wallets through Stripe."
                },
                {
                  q: "What happens after my free trial?",
                  a: "During your 7-day trial, you get UNLIMITED features (Unlimited entries, Unlimited AI calls/day). After that, you can continue with the Starter plan (3 entries per class, no AI) or upgrade to Trader ($9.99/mo), Investor ($19.99/mo) or Whale ($49.99/mo)."
                }
              ].map((faq, index) => (
                <div 
                  key={index}
                  className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300"
                >
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                    {faq.q}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 sm:p-10 text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
            
            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-bold mb-3">
                Need Help with Billing?
              </h3>
              <p className="text-base sm:text-lg mb-6 opacity-95 max-w-xl mx-auto">
                Our support team is here to help with any billing questions
              </p>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105">
                Contact Support
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
