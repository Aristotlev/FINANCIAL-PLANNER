"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  priority: 'High' | 'Medium' | 'Low';
  color: string;
  monthlyContribution: number;
  apy: number;
}

const priorityColors = {
  'High': '#ef4444',
  'Medium': '#f59e0b', 
  'Low': '#10b981'
};

const COMMON_SAVINGS_GOALS = [
  { name: 'Emergency Fund', target: 25000, priority: 'High' as const, monthlyContribution: 500 },
  { name: 'House Down Payment', target: 50000, priority: 'High' as const, monthlyContribution: 800 },
  { name: 'Car Fund', target: 15000, priority: 'Medium' as const, monthlyContribution: 300 },
  { name: 'Wedding', target: 20000, priority: 'High' as const, monthlyContribution: 500 },
  { name: 'Vacation Fund', target: 10000, priority: 'Medium' as const, monthlyContribution: 250 },
  { name: 'New Laptop', target: 2000, priority: 'Low' as const, monthlyContribution: 100 },
  { name: 'Home Renovation', target: 30000, priority: 'Medium' as const, monthlyContribution: 600 },
  { name: 'Education Fund', target: 40000, priority: 'High' as const, monthlyContribution: 700 },
  { name: 'Investment Capital', target: 25000, priority: 'Medium' as const, monthlyContribution: 500 },
  { name: 'Retirement Supplement', target: 100000, priority: 'High' as const, monthlyContribution: 1000 },
  { name: 'Medical Emergency', target: 15000, priority: 'High' as const, monthlyContribution: 400 },
  { name: 'Business Startup', target: 50000, priority: 'Medium' as const, monthlyContribution: 800 },
  { name: 'Debt Payoff', target: 20000, priority: 'High' as const, monthlyContribution: 500 },
  { name: 'Holiday Shopping', target: 3000, priority: 'Low' as const, monthlyContribution: 150 },
  { name: 'Pet Emergency Fund', target: 5000, priority: 'Medium' as const, monthlyContribution: 200 }
];

export function AddGoalModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onAdd: (goal: Omit<SavingsGoal, 'id' | 'color'>) => void;
}) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [apy, setApy] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredGoals, setFilteredGoals] = useState(COMMON_SAVINGS_GOALS);

  useEffect(() => {
    if (name.trim().length > 0) {
      const filtered = COMMON_SAVINGS_GOALS.filter(goal =>
        goal.name.toLowerCase().includes(name.toLowerCase())
      );
      setFilteredGoals(filtered);
    } else {
      setFilteredGoals(COMMON_SAVINGS_GOALS);
    }
  }, [name]);

  const selectGoal = (goal: typeof COMMON_SAVINGS_GOALS[0]) => {
    setName(goal.name);
    setTarget(goal.target.toString());
    setPriority(goal.priority);
    setMonthlyContribution(goal.monthlyContribution.toString());
    setShowSuggestions(false);
  };

  const handleAdd = () => {
    if (name && target && current && monthlyContribution && apy) {
      onAdd({
        name,
        target: parseFloat(target),
        current: parseFloat(current),
        priority,
        monthlyContribution: parseFloat(monthlyContribution),
        apy: parseFloat(apy)
      });
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setTarget('');
    setCurrent('');
    setPriority('Medium');
    setMonthlyContribution('');
    setApy('');
    setShowSuggestions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[15000]">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-[500px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Savings Goal</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white">
            <X className="w-4 h-4" style={{ color: "inherit" }} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Goal Name with Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Goal Name</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                placeholder="e.g., Car Fund, Wedding, New Laptop..."
                autoComplete="off"
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && filteredGoals.length > 0 && (
                <div className="absolute z-[15010] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {filteredGoals.map((goal, index) => (
                    <button
                      key={index}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectGoal(goal);
                      }}
                      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white">{goal.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            ${goal.target.toLocaleString()} target • ${goal.monthlyContribution}/month
                          </div>
                        </div>
                        <div 
                          className="px-2 py-1 rounded text-xs font-medium ml-2"
                          style={{ 
                            backgroundColor: `${priorityColors[goal.priority]}20`,
                            color: priorityColors[goal.priority]
                          }}
                        >
                          {goal.priority}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {showSuggestions && name.trim().length > 0 && filteredGoals.length === 0 && (
                <div className="absolute z-[15010] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No matching goals. Type your custom goal name.
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Click to select from popular goals or type your own
            </p>
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Target Amount ($)</label>
            <input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Enter target amount..."
            />
          </div>

          {/* Current Amount */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Current Amount ($)</label>
            <input
              type="number"
              step="any"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Enter current savings..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Monthly Contribution */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">Monthly Contribution ($)</label>
            <input
              type="number"
              step="any"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Monthly savings amount..."
            />
          </div>

          {/* APY */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">APY (%)</label>
            <input
              type="number"
              step="0.01"
              value={apy}
              onChange={(e) => setApy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Annual percentage yield..."
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name || !target || !current || !monthlyContribution || !apy}
            className="flex-1 px-4 py-2 bg-[#0D0D0D] border border-white/20 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Add Goal
          </button>
        </div>
      </div>
    </div>
  );
}
