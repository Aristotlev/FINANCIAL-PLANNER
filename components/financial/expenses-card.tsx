"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  CreditCard, 
  Plus, 
  Edit3, 
  Trash2, 
  TrendingDown,
  Calendar,
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  Home,
  Car,
  Zap,
  X,
  Target,
  TrendingUp,
  Receipt,
  ChevronDown
} from "lucide-react";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { MarketAnalysisWidget } from "../ui/market-analysis-widget";
import { ThemedStatBox, CARD_THEME_COLORS } from "../ui/themed-stat-box";
import { formatNumber } from "../../lib/utils";
import { useFinancialData } from "../../contexts/financial-data-context";
import { useCurrency } from "../../contexts/currency-context";
import { SubscriptionManager, type SubscriptionItem } from "./subscription-manager";

interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
  budget: number;
  color: string;
  icon: string;
  description: string;
}

interface DebtAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  minPayment: number;
  interestRate: number;
  dueDate: string;
  description: string;
}

const initialExpenseCategories: ExpenseCategory[] = [
  {
    id: "1",
    name: "Housing",
    amount: 1200,
    budget: 1300,
    color: "#ef4444",
    icon: "home",
    description: "Rent, utilities, maintenance"
  },
  {
    id: "2", 
    name: "Food & Dining",
    amount: 680,
    budget: 750,
    color: "#f59e0b",
    icon: "shopping",
    description: "Groceries, restaurants, delivery"
  },
  {
    id: "3",
    name: "Transportation",
    amount: 420,
    budget: 500,
    color: "#8b5cf6",
    icon: "car",
    description: "Gas, public transit, rideshare"
  },
  {
    id: "4",
    name: "Subscriptions",
    amount: 450,
    budget: 400,
    color: "#06b6d4",
    icon: "credit-card",
    description: "Netflix, Spotify, software licenses"
  },
  {
    id: "5",
    name: "Utilities",
    amount: 315,
    budget: 350,
    color: "#10b981",
    icon: "zap",
    description: "Electricity, water, internet, phone"
  }
];

const initialDebtAccounts: DebtAccount[] = [
  {
    id: "1",
    name: "Chase Credit Card",
    type: "Credit Card",
    balance: 4850,
    minPayment: 125,
    interestRate: 18.99,
    dueDate: "2025-10-15",
    description: "Main rewards credit card"
  },
  {
    id: "2",
    name: "Auto Loan",
    type: "Auto Loan", 
    balance: 18750,
    minPayment: 385,
    interestRate: 4.25,
    dueDate: "2025-10-08",
    description: "2022 Honda Accord financing"
  },
  {
    id: "3",
    name: "Student Loan",
    type: "Student Loan",
    balance: 12400,
    minPayment: 185,
    interestRate: 5.8,
    dueDate: "2025-10-20",
    description: "Federal student loan"
  },
  {
    id: "4",
    name: "Personal Loan",
    type: "Personal Loan",
    balance: 3200,
    minPayment: 95,
    interestRate: 12.5,
    dueDate: "2025-10-12",
    description: "Home improvement loan"
  },
  {
    id: "5",
    name: "Amex Card",
    type: "Credit Card",
    balance: 2100,
    minPayment: 55,
    interestRate: 21.49,
    dueDate: "2025-10-18",
    description: "Business expenses card"
  }
];

function getCategoryIcon(iconType: string, className = "w-4 h-4") {
  switch (iconType) {
    case "home": return <Home className={className} />;
    case "shopping": return <ShoppingCart className={className} />;
    case "car": return <Car className={className} />;
    case "credit-card": return <CreditCard className={className} />;
    case "zap": return <Zap className={className} />;
    default: return <DollarSign className={className} />;
  }
}

function ExpensesHoverContent() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      const savedCategories = await SupabaseDataService.getExpenseCategories([]);
      setCategories(savedCategories);
    };
    loadCategories();
    
    // Listen for data changes
    const handleDataChange = () => loadCategories();
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => window.removeEventListener('financialDataChanged', handleDataChange);
  }, []);

  const totalExpenses = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const budgetTotal = categories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
  const budgetDiff = budgetTotal - totalExpenses;
  
  // Show top 3 expense categories
  const topCategories = [...categories].sort((a, b) => b.amount - a.amount).slice(0, 3);

  return (
    <div className="space-y-1">
      {topCategories.map((category) => (
        <div key={category.id} className="flex justify-between text-xs">
          <span className="flex items-center gap-1">
            {category.icon} {category.name}
          </span>
          <span className="font-semibold text-red-600 dark:text-red-400">-${formatNumber(category.amount)}</span>
        </div>
      ))}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
        <div className="flex justify-between text-xs">
          <span>Monthly Expenses</span>
          <span className="font-semibold text-red-600 dark:text-red-400">-${formatNumber(totalExpenses)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Monthly Budget</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">${formatNumber(budgetTotal)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>{budgetDiff >= 0 ? 'Under Budget' : 'Over Budget'}</span>
          <span className={`font-semibold ${budgetDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {budgetDiff >= 0 ? '+' : ''}${formatNumber(budgetDiff)}
          </span>
        </div>
      </div>
    </div>
  );
}

function AddExpenseCategoryModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (category: Omit<ExpenseCategory, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
    budget: 0,
    color: '#ef4444',
    icon: 'home',
    description: ''
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recommended expense categories
  const recommendedCategories = [
    { name: 'Housing', icon: 'home', color: '#ef4444', description: 'Rent, utilities, maintenance' },
    { name: 'Food & Dining', icon: 'shopping', color: '#f59e0b', description: 'Groceries, restaurants, delivery' },
    { name: 'Transportation', icon: 'car', color: '#8b5cf6', description: 'Gas, public transit, rideshare' },
    { name: 'Subscriptions', icon: 'credit-card', color: '#06b6d4', description: 'Netflix, Spotify, software licenses' },
    { name: 'Utilities', icon: 'zap', color: '#10b981', description: 'Electricity, water, internet, phone' },
    { name: 'Night Out', icon: 'shopping', color: '#ec4899', description: 'Bars, clubs, entertainment venues' },
    { name: 'Activities & Experiences', icon: 'shopping', color: '#f97316', description: 'Events, concerts, activities' },
    { name: 'Travel', icon: 'car', color: '#3b82f6', description: 'Flights, hotels, vacation expenses' }
  ];

  const filteredCategories = searchTerm.length > 0
    ? recommendedCategories.filter(cat => 
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : recommendedCategories;

  const selectCategory = (category: typeof recommendedCategories[0]) => {
    setFormData({
      ...formData,
      name: category.name,
      icon: category.icon,
      color: category.color,
      description: category.description
    });
    setSearchTerm(category.name);
    setShowDropdown(false);
  };

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
    onAdd(formData);
    setFormData({ name: '', amount: 0, budget: 0, color: '#ef4444', icon: 'home', description: '' });
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000001]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[800px] max-h-[90vh] overflow-visible" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Expense Category</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Category Name</label>
                <div className="relative">
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
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    placeholder="Search or enter category name..."
                    required
                  />
                  {showDropdown && filteredCategories.length > 0 && (
                      <div 
                        ref={dropdownRef}
                        className="absolute z-[10000] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                        style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)' }}
                      >
                        {filteredCategories.map((category, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectCategory(category)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${category.color}20` }}
                              >
                                <div style={{ color: category.color }}>
                                  {getCategoryIcon(category.icon, "w-4 h-4")}
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">{category.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{category.description}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Icon</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  >
                    <option value="home">Home</option>
                    <option value="shopping">Shopping Cart</option>
                    <option value="car">Car</option>
                    <option value="credit-card">Credit Card</option>
                    <option value="zap">Lightning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Color</label>
                  <div className="flex items-center h-[42px]">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-full h-full p-1 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Current Amount</label>
                  <input
                    type="number"
                    value={isNaN(formData.amount) ? '' : formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Monthly Budget</label>
                  <input
                    type="number"
                    value={isNaN(formData.budget) ? '' : formData.budget}
                    onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  rows={4}
                  placeholder="Brief description of this expense category"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Add Category
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white dark:text-white px-4 py-2 rounded hover:bg-gray-600 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditExpenseCategoryModal({ 
  isOpen, 
  onClose, 
  category, 
  onUpdate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  category: ExpenseCategory | null;
  onUpdate: (category: ExpenseCategory) => Promise<void>;
}) {
  const [formData, setFormData] = useState<ExpenseCategory>({
    id: '',
    name: '',
    amount: 0,
    budget: 0,
    color: '#ef4444',
    icon: 'home',
    description: ''
  });

  React.useEffect(() => {
    if (category) {
      setFormData(category);
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
    onClose();
  };

  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000001]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit Expense Category</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Icon</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  >
                    <option value="home">Home</option>
                    <option value="shopping">Shopping Cart</option>
                    <option value="car">Car</option>
                    <option value="credit-card">Credit Card</option>
                    <option value="zap">Lightning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Color</label>
                  <div className="flex items-center h-[42px]">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-full h-full p-1 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Current Amount</label>
                  <input
                    type="number"
                    value={isNaN(formData.amount) ? '' : formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Monthly Budget</label>
                  <input
                    type="number"
                    value={isNaN(formData.budget) ? '' : formData.budget}
                    onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  rows={4}
                  placeholder="Brief description of this expense category"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Update Category
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white dark:text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddSubscriptionModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (subscription: Omit<SubscriptionItem, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
    billing_cycle: 'monthly' as 'monthly' | 'yearly',
    next_billing_date: '',
    category: 'Subscriptions',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({
      name: '',
      amount: 0,
      billing_cycle: 'monthly',
      next_billing_date: '',
      category: 'Subscriptions',
      description: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000002]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Subscription</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Service Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              placeholder="e.g., Netflix, Spotify, AWS"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Monthly Amount</label>
            <input
              type="number"
              value={isNaN(formData.amount) ? '' : formData.amount}
              onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Billing Cycle</label>
            <select
              value={formData.billing_cycle}
              onChange={(e) => setFormData({...formData, billing_cycle: e.target.value as 'monthly' | 'yearly'})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Next Billing Date</label>
            <input
              type="date"
              value={formData.next_billing_date}
              onChange={(e) => setFormData({...formData, next_billing_date: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              rows={2}
              placeholder="Brief description of this subscription"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-cyan-500 text-white px-4 py-2 rounded hover:bg-cyan-600"
            >
              Add Subscription
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white dark:text-white px-4 py-2 rounded hover:bg-gray-600 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExpensesModalContent() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'subscriptions' | 'debt'>('expenses');
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddSubscriptionModal, setShowAddSubscriptionModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const isInitialMount = useRef(true);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      const savedCategories = await SupabaseDataService.getExpenseCategories([]);
      const savedDebts = await SupabaseDataService.getDebtAccounts([]);
      const savedSubscriptions = await SupabaseDataService.getSubscriptions([]);
      setCategories(savedCategories);
      setDebtAccounts(savedDebts);
      setSubscriptions(savedSubscriptions);
    };
    loadData();
    
    // Listen for data changes from AI or other components
    const handleDataChange = () => loadData();
    window.addEventListener('expensesDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('expensesDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  // Data is now saved immediately on each operation (add/update/delete)
  // No need for a separate useEffect that watches all categories changes

  // Save debt accounts to Supabase when they change
  useEffect(() => {
    if (debtAccounts.length > 0 && !isInitialMount.current) {
      // Save each debt account individually to Supabase
      debtAccounts.forEach(async (debt) => {
        await SupabaseDataService.saveDebtAccount(debt);
      });
    }
    isInitialMount.current = false;
  }, [debtAccounts]);

  const totalExpenses = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const totalBudget = categories.reduce((sum, cat) => sum + cat.budget, 0);
  const totalDebtPayments = debtAccounts.reduce((sum, debt) => sum + debt.minPayment, 0);
  const totalDebtBalance = debtAccounts.reduce((sum, debt) => sum + debt.balance, 0);
  const budgetRemaining = totalBudget - totalExpenses;

  const addCategory = async (categoryData: Omit<ExpenseCategory, 'id'>) => {
    const newCategory: ExpenseCategory = {
      ...categoryData,
      id: crypto.randomUUID()
    };
    // Save to database first
    await SupabaseDataService.saveExpenseCategory(newCategory);
    setCategories([...categories, newCategory]);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const updateCategory = async (updatedCategory: ExpenseCategory) => {
    await SupabaseDataService.saveExpenseCategory(updatedCategory);
    setCategories(categories.map(category => 
      category.id === updatedCategory.id ? updatedCategory : category
    ));
    setEditingCategory(null);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const deleteCategory = async (categoryId: string) => {
    await SupabaseDataService.deleteExpenseCategory(categoryId);
    setCategories(categories.filter(category => category.id !== categoryId));
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const editCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setShowEditModal(true);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const addSubscription = async (subscription: Omit<SubscriptionItem, 'id'>) => {
    const newSubscription: SubscriptionItem = {
      ...subscription,
      id: crypto.randomUUID()
    };
    await SupabaseDataService.saveSubscription(newSubscription);
    setSubscriptions([...subscriptions, newSubscription]);
    
    // Update the Subscriptions category amount
    const subsCategory = categories.find(c => c.name === 'Subscriptions');
    if (subsCategory) {
      const totalSubs = subscriptions.reduce((sum, s) => sum + s.amount, 0) + newSubscription.amount;
      subsCategory.amount = totalSubs;
      await updateCategory(subsCategory);
    }
    
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const deleteSubscription = async (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    await SupabaseDataService.deleteSubscription(subscriptionId);
    setSubscriptions(subscriptions.filter(s => s.id !== subscriptionId));
    
    // Update the Subscriptions category amount
    if (sub) {
      const subsCategory = categories.find(c => c.name === 'Subscriptions');
      if (subsCategory) {
        const totalSubs = subscriptions.reduce((sum, s) => sum + s.amount, 0) - sub.amount;
        subsCategory.amount = totalSubs;
        await updateCategory(subsCategory);
      }
    }
    
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const getCategorySubscriptions = (categoryName: string) => {
    return subscriptions.filter(s => s.category === categoryName);
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-1 min-w-0">
            <div className="flex overflow-x-auto scrollbar-hide w-full">
              {[
                { id: 'expenses', label: 'Expenses', icon: TrendingDown, amount: totalExpenses },
                { id: 'subscriptions', label: 'Subscriptions', icon: Calendar, amount: subscriptions.length },
                { id: 'debt', label: 'Debt', icon: CreditCard, amount: totalDebtPayments }
              ].map(({ id, label, icon: Icon, amount }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 border-b-2 transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === id
                      ? 'border-red-500 text-red-600 dark:text-red-400 font-semibold'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {activeTab !== 'subscriptions' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add {activeTab === 'expenses' ? 'Category' : 'Debt'}</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {/* Subscriptions Tab Content */}
        {activeTab === 'subscriptions' && (
          <SubscriptionManager 
            onSubscriptionsChange={(subs) => {
              setSubscriptions(subs);
              window.dispatchEvent(new Event('financialDataChanged'));
            }}
          />
        )}

        {/* Expenses Tab Content */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {categories.sort((a, b) => b.amount - a.amount).map((category) => {
                const budgetUsed = (category.amount / category.budget) * 100;
                const isOverBudget = budgetUsed > 100;
                const isSubscriptions = category.name === 'Subscriptions';
                const categorySubscriptions = isSubscriptions ? getCategorySubscriptions(category.name) : [];
                const isExpanded = expandedCategories.has(category.id);
                
                return (
                  <div key={category.id} className="relative">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-red-500/30 dark:hover:shadow-red-400/40 cursor-pointer"
                    onClick={() => isSubscriptions && toggleCategory(category.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: category.color + '20' }}
                      >
                        <div style={{ color: category.color }}>
                          {getCategoryIcon(category.icon)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{category.name}</span>
                          {isSubscriptions && categorySubscriptions.length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200">
                              {categorySubscriptions.length} {categorySubscriptions.length === 1 ? 'item' : 'items'}
                            </span>
                          )}
                          {isOverBudget && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                              Over Budget
                            </span>
                          )}
                          {isSubscriptions && (
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          -${formatNumber(category.amount)} / ${formatNumber(category.budget)} • {budgetUsed.toFixed(1)}% used
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className="h-2 rounded-full transition-all" 
                            style={{ 
                              width: `${Math.min(budgetUsed, 100)}%`,
                              backgroundColor: isOverBudget ? '#ef4444' : category.color
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">-${formatNumber(category.amount)}</div>
                        <div className={`text-sm ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                          ${formatNumber(category.budget - category.amount)} left
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {isSubscriptions && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAddSubscriptionModal(true);
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            title="Add Subscription"
                          >
                            <Plus className="w-4 h-4 text-green-600 dark:text-green-400 dark:drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editCategory(category);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <Edit3 className="w-4 h-4 text-gray-700 dark:text-cyan-400 dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await deleteCategory(category.id);
                            } catch (error) {
                              console.error('Failed to delete category:', error);
                              alert('Failed to delete category. Please try again.');
                            }
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
                        >
                          <Trash2 className="w-4 h-4 dark:text-red-400 dark:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subscription Items Dropdown */}
                  {isSubscriptions && isExpanded && categorySubscriptions.length > 0 && (
                    <div className="ml-4 mt-2 space-y-2 pb-2">
                      {categorySubscriptions.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{sub.name}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {sub.billing_cycle}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Next billing: {sub.next_billing_date}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">-${formatNumber(sub.amount)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete ${sub.name}?`)) {
                                  deleteSubscription(sub.id);
                                }
                              }}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>

            {categories.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <TrendingDown className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No expense categories yet. Click Add Category to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Debt Tab Content */}
        {activeTab === 'debt' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.expenses}
                value={`-$${formatNumber(totalDebtBalance)}`}
                label="Total Balance"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.expenses}
                value={`-$${formatNumber(totalDebtPayments)}`}
                label="Monthly Payment"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.expenses}
                value={`${debtAccounts.length > 0 ? ((debtAccounts.reduce((sum, d) => sum + d.interestRate, 0) / debtAccounts.length).toFixed(2)) : '0.00'}%`}
                label="Avg APR"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.expenses}
                value={debtAccounts.length}
                label="Accounts"
              />
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {debtAccounts.sort((a, b) => b.balance - a.balance).map((debt) => {
                const monthsRemaining = debt.balance / debt.minPayment;
                const totalInterest = (debt.balance * debt.interestRate / 100) / 12;
                
                return (
                  <div key={debt.id} className="relative flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-red-500/30 dark:hover:shadow-red-400/40 cursor-pointer">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{debt.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {debt.type}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          -${debt.minPayment}/mo • {debt.interestRate}% APR • Due: {debt.dueDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">-${formatNumber(debt.balance)}</div>
                        <div className="text-sm text-red-600">
                          ~{monthsRemaining.toFixed(0)} months
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                          <Edit3 className="w-4 h-4 text-gray-700 dark:text-cyan-400 dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        </button>
                        <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500">
                          <Trash2 className="w-4 h-4 dark:text-red-400 dark:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {debtAccounts.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No debt accounts yet. Click Add Debt to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AddExpenseCategoryModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAdd={addCategory}
      />
      
      <EditExpenseCategoryModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        category={editingCategory}
        onUpdate={updateCategory}
      />

      <AddSubscriptionModal
        isOpen={showAddSubscriptionModal}
        onClose={() => setShowAddSubscriptionModal(false)}
        onAdd={addSubscription}
      />
    </div>
  );
}

export function ExpensesCard() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const { mainCurrency, convert } = useCurrency();

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      const savedCategories = await SupabaseDataService.getExpenseCategories([]);
      const savedDebts = await SupabaseDataService.getDebtAccounts([]);
      setCategories(savedCategories);
      setDebtAccounts(savedDebts);
    };
    loadData();
    
    // Listen for data changes from AI or other components
    const handleDataChange = () => loadData();
    window.addEventListener('expensesDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('currencyChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('expensesDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('currencyChanged', handleDataChange);
    };
  }, []);

  // Calculate dynamic values from saved data (values are stored in USD)
  const totalExpensesUSD = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const totalDebtPaymentsUSD = debtAccounts.reduce((sum, debt) => sum + debt.minPayment, 0);
  const totalDebtBalanceUSD = debtAccounts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalMonthlyOutflowUSD = totalExpensesUSD + totalDebtPaymentsUSD;
  
  // Convert to main currency for display
  const totalExpenses = convert(totalExpensesUSD, 'USD', mainCurrency.code);
  const totalDebtPayments = convert(totalDebtPaymentsUSD, 'USD', mainCurrency.code);
  const totalDebtBalance = convert(totalDebtBalanceUSD, 'USD', mainCurrency.code);
  const totalMonthlyOutflow = totalExpenses + totalDebtPayments;

  // Calculate average budget overrun percentage
  const avgOverrun = categories.length > 0
    ? categories.reduce((sum, cat) => sum + ((cat.amount - cat.budget) / cat.budget * 100), 0) / categories.length
    : 0;
  const changePercent = categories.length === 0 && debtAccounts.length === 0 ? "0.0%" : `${avgOverrun >= 0 ? '+' : ''}${avgOverrun.toFixed(1)}%`;
  const changeType = "negative" as const; // Expenses are always negative

  // Dynamic chart data based on actual categories and debt - sort by amount and show top items
  const expenseChartData = categories
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map(category => ({
      value: category.amount,
      change: `${((category.amount / category.budget - 1) * 100).toFixed(2)}%`
    }));
  
  const debtChartData = debtAccounts
    .sort((a, b) => b.minPayment - a.minPayment)
    .slice(0, 4)
    .map(debt => ({
      value: debt.minPayment,
      change: "0%"
    }));

  const chartData = [...expenseChartData, ...debtChartData].slice(0, 12);

  // Currency conversion - show in user's selected currency
  const displayAmount = `-${mainCurrency.symbol}${formatNumber(totalMonthlyOutflow)}`;
  const originalAmount = mainCurrency.code !== 'USD' ? `-$${formatNumber(totalMonthlyOutflowUSD)}` : undefined;

  return (
    <EnhancedFinancialCard
      title="Expenses & Debt"
      description="Monthly spending and debt obligations"
      amount={displayAmount}
      change={changePercent}
      changeType={changeType}
      mainColor="#ef4444"
      secondaryColor="#f87171"
      gridColor="#ef444415"
      stats={[
        { label: "Monthly Expenses", value: `-${mainCurrency.symbol}${formatNumber(totalExpenses)}`, color: "#ef4444" },
        { label: "Total Debt Balance", value: `-${mainCurrency.symbol}${formatNumber(totalDebtBalance)}`, color: "#dc2626" },
        { label: "Debt Payments/mo", value: `-${mainCurrency.symbol}${formatNumber(totalDebtPayments)}`, color: "#f87171" }
      ]}
      icon={Receipt}
      hoverContent={<ExpensesHoverContent />}
      modalContent={<ExpensesModalContent />}
      chartData={chartData}
      convertedAmount={originalAmount}
      sourceCurrency={mainCurrency.code}
    />
  );
}
