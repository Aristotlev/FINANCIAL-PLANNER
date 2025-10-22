import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number to locale string with no decimal places
 * @param value - The number to format
 * @returns Formatted string with no decimals
 */
export function formatNumber(value: number): string {
  if (!value || isNaN(value) || !isFinite(value)) return '0';
  return Math.round(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}
