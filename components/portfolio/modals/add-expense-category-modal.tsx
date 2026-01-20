"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  CreditCard, 
  Home,
  Car,
  Zap,
  DollarSign,
  ShoppingCart,
  X
} from "lucide-react";

export interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
  budget: number;
  color: string;
  icon: string;
  description: string;
}

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

export function AddExpenseCategoryModal({ 
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: '', amount: 0, budget: 0, color: '#ef4444', icon: 'home', description: '' });
      setSearchTerm('');
      setShowDropdown(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({ name: '', amount: 0, budget: 0, color: '#ef4444', icon: 'home', description: '' });
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000001]" onClick={onClose}>
      <div className="bg-[#0D0D0D] border border-white/10 p-6 rounded-3xl w-[800px] max-h-[90vh] overflow-visible shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Add Expense Category</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Category Name</label>
                <div className="relative group">
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
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-medium"
                    placeholder="Search or enter category name..."
                    required
                  />
                  {showDropdown && filteredCategories.length > 0 && (
                      <div 
                        ref={dropdownRef}
                        className="absolute z-[10000] w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                        style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)' }}
                      >
                        {filteredCategories.map((category, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectCategory(category)}
                            className="w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors"
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
                                <div className="font-medium text-white">{category.name}</div>
                                <div className="text-xs text-gray-500">{category.description}</div>
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
                  <label className="block text-sm font-medium mb-2 text-gray-400">Icon</label>
                  <div className="relative">
                    <select
                        value={formData.icon}
                        onChange={(e) => setFormData({...formData, icon: e.target.value})}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white appearance-none cursor-pointer font-medium"
                    >
                        <option value="home">Home</option>
                        <option value="shopping">Shopping Cart</option>
                        <option value="car">Car</option>
                        <option value="credit-card">Credit Card</option>
                        <option value="zap">Lightning</option>
                    </select>
                     <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">Color</label>
                   <div className="flex items-center gap-4 bg-[#1A1A1A] border border-white/10 p-2 rounded-xl h-[50px]">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-12 h-full rounded-lg cursor-pointer bg-transparent border-none p-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">Current Amount</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="number"
                        value={isNaN(formData.amount) ? '' : formData.amount}
                        onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                        className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-mono font-medium"
                        step="0.01"
                        min="0"
                        required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">Monthly Budget</label>
                   <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="number"
                        value={isNaN(formData.budget) ? '' : formData.budget}
                        onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value)})}
                        className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-mono font-medium"
                        step="0.01"
                        min="0"
                        required
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-medium resize-none"
                  rows={4}
                  placeholder="Brief description of this expense category"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
             <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[#0D0D0D] border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all font-bold"
            >
              Add Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
