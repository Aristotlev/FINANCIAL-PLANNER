"use client";

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label="Toggle theme"
    >
      {/* Sun Icon (Light Mode) */}
      <Sun 
        className={`w-5 h-5 text-amber-500 transition-all duration-300 ${
          theme === 'light' 
            ? 'rotate-0 scale-100 opacity-100' 
            : 'rotate-90 scale-0 opacity-0 absolute top-2 left-2'
        }`}
      />
      
      {/* Moon Icon (Dark Mode) */}
      <Moon 
        className={`w-5 h-5 text-blue-500 transition-all duration-300 ${
          theme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0 absolute top-2 left-2'
        }`}
      />
      
      {/* Tooltip */}
      <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {theme === 'light' ? 'Dark mode' : 'Light mode'}
      </span>
    </button>
  );
}

export function ThemeToggleWithLabel() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5">
        <Sun 
          className={`w-5 h-5 text-amber-500 transition-all duration-300 ${
            theme === 'light' 
              ? 'rotate-0 scale-100 opacity-100' 
              : 'rotate-90 scale-0 opacity-0 absolute'
          }`}
        />
        <Moon 
          className={`w-5 h-5 text-blue-500 transition-all duration-300 ${
            theme === 'dark' 
              ? 'rotate-0 scale-100 opacity-100' 
              : '-rotate-90 scale-0 opacity-0 absolute'
          }`}
        />
      </div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
      </span>
    </button>
  );
}

export function ThemeToggleSwitch() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-3">
      <Sun className="w-4 h-4 text-amber-500" />
      <button
        onClick={toggleTheme}
        className="relative w-12 h-6 rounded-full bg-gray-300 dark:bg-gray-600 transition-colors"
        aria-label="Toggle theme"
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
            theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
      <Moon className="w-4 h-4 text-blue-500" />
    </div>
  );
}
