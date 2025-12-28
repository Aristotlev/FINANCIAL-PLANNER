"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Wallet, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Copy, 
  Check,
  ArrowUpRight,
  DollarSign,
  MousePointerClick,
  UserPlus,
  CreditCard
} from 'lucide-react';
import { OmnifolioLogo } from '../../../components/ui/omnifolio-logo';
import { useBetterAuth } from '../../../contexts/better-auth-context';
import { useRouter } from 'next/navigation';
import AccountSettingsForm from '../../../components/settings/account-settings-form';

export default function AffiliateDashboard() {
  const { user, logout, isAuthenticated, isLoading } = useBetterAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'payouts' | 'referrals' | 'settings'>('overview');

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/affiliates');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-900/30 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-800/50">
          <Link href="/">
            <OmnifolioLogo size="md" />
          </Link>
          <div className="mt-2 text-xs font-medium text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full inline-block">
            PARTNER PORTAL
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Overview" 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
          />
          <NavItem 
            icon={<BarChart3 size={20} />} 
            label="Performance" 
            active={activeTab === 'performance'}
            onClick={() => setActiveTab('performance')}
          />
          <NavItem 
            icon={<Wallet size={20} />} 
            label="Payouts" 
            active={activeTab === 'payouts'}
            onClick={() => setActiveTab('payouts')}
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Referrals" 
            active={activeTab === 'referrals'}
            onClick={() => setActiveTab('referrals')}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </nav>

        <div className="p-4 border-t border-gray-800/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'Affiliate User'}</p>
              <p className="text-xs text-gray-500 truncate">Affiliate Partner</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {activeTab === 'overview' && <OverviewContent />}
          {activeTab === 'performance' && <PerformanceContent />}
          {activeTab === 'payouts' && <PayoutsContent />}
          {activeTab === 'referrals' && <ReferralsContent />}
          {activeTab === 'settings' && <SettingsContent />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      active 
        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
        : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
    }`}>
      {icon}
      {label}
    </button>
  );
}

function OverviewContent() {
  const [copied, setCopied] = useState(false);
  const referralLink = "https://omnifolio.app/?ref=aristotle";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-gray-400">Welcome back, here's how your campaigns are performing.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Next Payout:</span>
          <span className="text-sm font-medium text-white bg-gray-800 px-3 py-1 rounded-lg border border-gray-700">
            Jan 1, 2026
          </span>
        </div>
      </div>

      {/* Referral Link Card */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="relative z-10">
          <h3 className="text-lg font-medium mb-2">Your Unique Referral Link</h3>
          <p className="text-gray-400 text-sm mb-4">Share this link to track referrals and earn commissions.</p>
          
          <div className="flex gap-2 max-w-xl">
            <div className="flex-1 bg-black/30 border border-gray-600 rounded-lg px-4 py-3 text-gray-300 font-mono text-sm truncate">
              {referralLink}
            </div>
            <button 
              onClick={handleCopy}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Earnings" 
          value="$1,240.50" 
          change="+12.5%" 
          icon={<DollarSign className="text-green-400" />} 
          trend="up"
        />
        <StatCard 
          title="Active Referrals" 
          value="48" 
          change="+4" 
          icon={<UserPlus className="text-purple-400" />} 
          trend="up"
        />
        <StatCard 
          title="Link Clicks" 
          value="1,892" 
          change="+24%" 
          icon={<MousePointerClick className="text-cyan-400" />} 
          trend="up"
        />
        <StatCard 
          title="Conversion Rate" 
          value="2.5%" 
          change="-0.1%" 
          icon={<ArrowUpRight className="text-orange-400" />} 
          trend="down"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 className="font-semibold">Recent Referrals</h3>
          <button className="text-sm text-cyan-400 hover:text-cyan-300">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Commission</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium">User_{1000 + i}</td>
                  <td className="px-6 py-4 text-gray-400">Dec {28 - i}, 2025</td>
                  <td className="px-6 py-4">
                    <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded text-xs border border-purple-500/20">
                      Pro Plan
                    </span>
                  </td>
                  <td className="px-6 py-4 text-green-400 font-medium">+$9.00</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function PerformanceContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Performance Analytics</h1>
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-300">Detailed Analytics Coming Soon</h3>
        <p className="text-gray-500 mt-2">We're building advanced charts to help you track your success.</p>
      </div>
    </div>
  );
}

function PayoutsContent() {
  const [method, setMethod] = useState<'paypal' | 'card'>('paypal');
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payout Settings</h1>
        <p className="text-gray-400">Manage how you get paid.</p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Payment Method</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button 
            onClick={() => setMethod('paypal')}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
              method === 'paypal' 
                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' 
                : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:bg-gray-800/40'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <span className="font-bold italic">P</span>
            </div>
            <div className="text-left">
              <div className="font-medium">PayPal</div>
              <div className="text-xs opacity-70">Get paid via email</div>
            </div>
            {method === 'paypal' && <div className="ml-auto"><Check size={18} /></div>}
          </button>

          <button 
            onClick={() => setMethod('card')}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
              method === 'card' 
                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' 
                : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:bg-gray-800/40'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
              <CreditCard size={20} />
            </div>
            <div className="text-left">
              <div className="font-medium">Credit Card</div>
              <div className="text-xs opacity-70">Direct deposit to card</div>
            </div>
            {method === 'card' && <div className="ml-auto"><Check size={18} /></div>}
          </button>
        </div>

        <div className="space-y-4 max-w-md">
          {method === 'paypal' ? (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">PayPal Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Card Number</label>
                <input 
                  type="text" 
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Expiry Date</label>
                  <input 
                    type="text" 
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">CVC</label>
                  <input 
                    type="text" 
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium py-2.5 rounded-lg transition-colors mt-4">
            Save Payout Details
          </button>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Payout History</h3>
        <div className="text-center py-8 text-gray-500">
          No payouts yet. Start referring users to earn!
        </div>
      </div>
    </div>
  );
}

function ReferralsContent() {
  const [referralCode, setReferralCode] = useState("aristotle");
  const [isEditing, setIsEditing] = useState(false);
  const [tempCode, setTempCode] = useState(referralCode);
  const [copied, setCopied] = useState(false);

  const fullLink = `https://omnifolio.app/?ref=${referralCode}`;

  const handleSave = () => {
    setReferralCode(tempCode);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referral Tools</h1>
        <p className="text-gray-400">Customize your link and view your referrals.</p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Personalized Link</h3>
        <p className="text-gray-400 text-sm mb-4">
          Customize your referral code to make it easier to share and remember.
        </p>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 w-full">
            <div className="flex items-center bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 font-mono text-sm">
              <span className="text-gray-500 select-none">https://omnifolio.app/?ref=</span>
              {isEditing ? (
                <input 
                  type="text" 
                  value={tempCode}
                  onChange={(e) => setTempCode(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 p-0 text-white w-full ml-1"
                  autoFocus
                />
              ) : (
                <span className="text-white ml-1">{referralCode}</span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave}
                  className="flex-1 md:flex-none bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/15 px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Save
                </button>
                <button 
                  onClick={() => {
                    setTempCode(referralCode);
                    setIsEditing(false);
                  }}
                  className="flex-1 md:flex-none bg-gray-800 text-gray-400 hover:bg-gray-700/50 px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex-1 md:flex-none bg-gray-800 text-white hover:bg-gray-700/50 px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Edit Code
                </button>
                <button 
                  onClick={handleCopy}
                  className="flex-1 md:flex-none bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Referral Stats</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Clicks</div>
            <div className="text-2xl font-bold text-white">1,892</div>
          </div>
          <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Signups</div>
            <div className="text-2xl font-bold text-white">48</div>
          </div>
          <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Conversion</div>
            <div className="text-2xl font-bold text-cyan-400">2.5%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Account Settings</h1>
      <AccountSettingsForm />
    </div>
  );
}

function StatCard({ title, value, change, icon, trend }: { title: string, value: string, change: string, icon: React.ReactNode, trend: 'up' | 'down' }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-800 rounded-lg">
          {icon}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trend === 'up' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {change}
        </span>
      </div>
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
