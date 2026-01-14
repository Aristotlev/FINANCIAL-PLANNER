"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  CreditCard, 
  Home,
  Car,
  Zap,
  DollarSign,
  ShoppingCart
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
              className="flex items-center justify-center gap-2 flex-1 bg-[#212121] text-white px-4 py-2 rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333]"
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
