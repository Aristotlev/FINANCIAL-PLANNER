
import { getAssetColor } from './asset-color-database';

// Fallback palette for generated colors
const FALLBACK_PALETTE = [
  '#EF4444', // Red 500
  '#F97316', // Orange 500
  '#F59E0B', // Amber 500
  '#84CC16', // Lime 500
  '#10B981', // Emerald 500
  '#06B6D4', // Cyan 500
  '#3B82F6', // Blue 500
  '#6366F1', // Indigo 500
  '#8B5CF6', // Violet 500
  '#D946EF', // Fuchsia 500
  '#F43F5E', // Rose 500
];

/**
 * Generates a deterministic color from a string input.
 * Uses a hash function to select a color from a palette or generate a hex code.
 */
function generateColorFromSymbol(symbol: string): string {
  const normalizedSymbol = symbol.toUpperCase();
  let hash = 0;
  for (let i = 0; i < normalizedSymbol.length; i++) {
    hash = normalizedSymbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick from the curated palette for better consistency
  const index = Math.abs(hash) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[index];
}

export const DEFAULT_CRYPTO_COLOR = '#f59e0b';
export const DEFAULT_STOCK_COLOR = '#8b5cf6';

/**
 * Get the brand color for a given asset symbol.
 * Returns a known brand color or generates a deterministic one.
 * 
 * @param symbol The asset symbol (e.g., 'BTC', 'AAPL')
 * @param type The type of asset ('crypto' or 'stock') to determine the default color
 * @returns The hex color string
 */
export function getBrandColor(symbol: string, type: 'crypto' | 'stock' = 'crypto'): string {
  if (!symbol) return type === 'crypto' ? DEFAULT_CRYPTO_COLOR : DEFAULT_STOCK_COLOR;
  
  // 1. Try to get from the comprehensive database
  const dbColor = getAssetColor(symbol, type);
  
  // Check if getAssetColor returned a specific color or just a default
  // The getAssetColor function returns defaults if not found, so we need to check if it's a "real" match
  // We can do this by checking if the returned color is one of the generic defaults
  const genericDefaults = ['#f59e0b', '#8b5cf6', '#3b82f6', '#84cc16', '#06b6d4', '#6366f1'];
  
  if (dbColor && !genericDefaults.includes(dbColor)) {
    return dbColor;
  }

  // 2. If no specific database match, generate a deterministic color
  return generateColorFromSymbol(symbol);
}

// Re-export for compatibility if needed, though we prefer using the database directly
export const BRAND_COLORS: Record<string, string> = {}; 

