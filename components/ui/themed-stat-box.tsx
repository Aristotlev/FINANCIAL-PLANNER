"use client";

import React from "react";
import { cn } from "../../lib/utils";

interface ThemedStatBoxProps {
  /** The main theme color (hex format, e.g., "#6366f1") */
  themeColor: string;
  /** The value to display prominently */
  value: React.ReactNode;
  /** The label describing the value */
  label: string;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional custom value color class (if not provided, uses theme color) */
  valueColorClass?: string;
}

/**
 * Converts a hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * A themed stat box component that matches the 3D card's color theme.
 * Used inside modals to display statistics with consistent theming.
 */
export function ThemedStatBox({
  themeColor,
  value,
  label,
  className = "",
  valueColorClass,
}: ThemedStatBoxProps) {
  const rgb = hexToRgb(themeColor);
  
  // Create CSS custom properties for the theme color
  const bgStyle = rgb
    ? {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
        "--theme-color": themeColor,
        "--theme-color-light": `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
        "--theme-color-dark": `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
      } as React.CSSProperties
    : {};

  return (
    <div
      className={cn("p-4 rounded-lg transition-all duration-300 cursor-pointer", className)}
      style={{
        ...bgStyle,
        boxShadow: "none",
      }}
    >
      <div
        className={`text-xl font-bold ${valueColorClass || ""}`}
        style={!valueColorClass ? { color: themeColor } : {}}
      >
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}

/**
 * A themed stat box with conditional value coloring (positive/negative)
 */
interface ConditionalThemedStatBoxProps extends Omit<ThemedStatBoxProps, 'valueColorClass'> {
  /** Whether the value is positive (green), negative (red), or neutral (theme color) */
  valueType?: 'positive' | 'negative' | 'neutral';
}

export function ConditionalThemedStatBox({
  themeColor,
  value,
  label,
  className = "",
  valueType = 'neutral',
}: ConditionalThemedStatBoxProps) {
  let valueColorClass = "";
  let valueStyle: React.CSSProperties = {};

  switch (valueType) {
    case 'positive':
      valueColorClass = "text-green-600";
      break;
    case 'negative':
      valueColorClass = "text-red-600";
      break;
    default:
      valueStyle = { color: themeColor };
  }

  const rgb = hexToRgb(themeColor);
  
  const bgStyle = rgb
    ? {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
      } as React.CSSProperties
    : {};

  return (
    <div
      className={cn("p-4 rounded-lg transition-all duration-300 cursor-pointer", className)}
      style={{
        ...bgStyle,
        boxShadow: "none",
      }}
    >
      <div
        className={`text-xl font-bold ${valueColorClass}`}
        style={valueStyle}
      >
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}

// Export card theme colors for easy reference
export const CARD_THEME_COLORS = {
  stocks: "#6366f1",
  tools: "#f43f5e",
  crypto: "#f59e0b",
  news: "#f97316",
  netWorth: "#d946ef",
  tradingAccount: "#06b6d4",
  tradingTools: "#0284c7",
  taxes: "#3b82f6",
  savings: "#3b82f6",
  valuableItems: "#84cc16",
  cash: "#10b981",
  expenses: "#ef4444",
  realEstate: "#14b8a6",
} as const;

/**
 * A themed container for custom content with the card's color theme.
 * Use when you need full control over the content inside the themed box.
 */
interface ThemedContainerProps {
  /** The main theme color (hex format, e.g., "#6366f1") */
  themeColor: string;
  /** Optional additional CSS classes */
  className?: string;
  /** Children to render inside the container */
  children: React.ReactNode;
}

export function ThemedContainer({
  themeColor,
  className = "",
  children,
}: ThemedContainerProps) {
  const rgb = hexToRgb(themeColor);
  
  const bgStyle = rgb
    ? {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
      } as React.CSSProperties
    : {};

  return (
    <div
      className={cn("p-4 rounded-xl transition-all duration-300 cursor-pointer", className)}
      style={{
        ...bgStyle,
        boxShadow: "none",
      }}
    >
      {children}
    </div>
  );
}
