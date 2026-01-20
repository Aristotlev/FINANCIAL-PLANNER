"use client";

import React, { useState, useEffect } from "react";
import { X, DollarSign, Building2, Calendar } from "lucide-react";
import { SupabaseDataService } from "../../../lib/supabase/supabase-data-service";
import { CashAccount } from "./add-cash-account-modal";

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'bi-weekly' | 'yearly' | 'one-time';
  category: 'salary' | 'side-hustle' | 'freelance' | 'passive' | 'bonus' | 'other';
  connectedAccount: string; // Account ID where income is deposited
  isRecurring: boolean;
  nextPaymentDate?: string;
  notes?: string;
  color: string;
}

export function AddIncomeModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (income: Omit<IncomeSource, 'id'>) => Promise<void> | void;
}) {
  const [formData, setFormData] = useState<Omit<IncomeSource, 'id'>>({
    name: '',
    amount: 0,
    frequency: 'monthly',
    category: 'salary',
    connectedAccount: '',
    isRecurring: true,
    nextPaymentDate: '',
    notes: '',
    color: '#10b981'
  });

  const [accounts, setAccounts] = useState<CashAccount[]>([]);

  useEffect(() => {
    if (isOpen) {
      const loadAccounts = async () => {
        const data = await SupabaseDataService.getCashAccounts([]);
        setAccounts(data);
      };
      loadAccounts();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd(formData);
    setFormData({
      name: '',
      amount: 0,
      frequency: 'monthly',
      category: 'salary',
      connectedAccount: '',
      isRecurring: true,
      nextPaymentDate: '',
      notes: '',
      color: '#10b981'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[15000]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[500px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Income Source</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-4 h-4 text-gray-900 dark:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Income Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              placeholder="e.g., Main Salary, Freelance Work, YouTube"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Amount ($)</label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value as any})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-Time</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value as any})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="salary">Salary</option>
              <option value="side-hustle">Side Hustle</option>
              <option value="freelance">Freelance</option>
              <option value="passive">Passive Income</option>
              <option value="bonus">Bonus</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Connected Account</label>
            <select
              value={formData.connectedAccount}
              onChange={(e) => setFormData({...formData, connectedAccount: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              required
            >
              <option value="">Select account where income is deposited</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.bank}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              Recurring Income
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
              Uncheck for one-time payments like bonuses or gifts
            </p>
          </div>

          {formData.isRecurring && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Next Payment Date (Optional)</label>
              <input
                type="date"
                value={formData.nextPaymentDate}
                onChange={(e) => setFormData({...formData, nextPaymentDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              rows={2}
              placeholder="Additional details about this income source..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Color for visual identification
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#0D0D0D] border border-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#0D0D0D] border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              Add Income Source
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
