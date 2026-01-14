"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatNumber } from "../../../lib/utils";

export interface ValuableItem {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
  description: string;
  condition: string;
  insured: boolean;
  insuranceValue: number;
  color: string;
  marketPrice?: number;
  marketPriceRange?: {
    low: number;
    high: number;
  };
  marketTrend?: 'up' | 'down' | 'stable';
  priceChange30d?: number;
  lastMarketUpdate?: string;
}

// Popular items for suggestions
const popularItems: Record<string, string[]> = {
  "Jewelry & Watches": [
    "Rolex Submariner",
    "Rolex Daytona",
    "Patek Philippe Nautilus",
    "Audemars Piguet Royal Oak",
    "Omega Speedmaster",
    "Cartier Love Bracelet",
    "Tiffany Diamond Ring",
    "Gold Wedding Band",
    "Diamond Stud Earrings",
    "Pearl Necklace"
  ],
  "Art & Collectibles": [
    "Original Oil Painting",
    "Limited Edition Print",
    "Bronze Sculpture",
    "Antique Vase",
    "First Edition Book",
    "Vintage Poster",
    "Signed Sports Memorabilia",
    "Comic Book Collection",
    "Rare Coins",
    "Stamp Collection"
  ],
  "Electronics": [
    "MacBook Pro",
    "iPhone Pro Max",
    "Sony A7 Camera",
    "4K OLED TV",
    "Gaming PC",
    "iPad Pro",
    "AirPods Max",
    "Apple Watch Ultra",
    "DJI Drone",
    "Home Theater System"
  ],
  "Collectibles": [
    "Pokemon Cards",
    "Magic: The Gathering Cards",
    "Baseball Card Collection",
    "Action Figures",
    "LEGO Sets",
    "Funko Pop Collection",
    "Vinyl Records",
    "Antique Furniture",
    "Wine Collection",
    "Whiskey Collection"
  ],
  "Automotive": [
    "Classic Car",
    "Motorcycle",
    "Sports Car",
    "Luxury Vehicle",
    "Custom Wheels",
    "Car Art",
    "Vintage Parts",
    "Race Memorabilia"
  ],
  "Photography": [
    "Canon EOS R5",
    "Sony A7R V",
    "Nikon Z9",
    "Leica M11",
    "Hasselblad X2D",
    "Professional Lenses",
    "Lighting Equipment",
    "Studio Setup"
  ]
};

// Helper function to fetch market price for an item
async function fetchItemMarketPrice(itemName: string, category: string) {
  try {
    const response = await fetch(
      `/api/valuable-items-price?action=price&itemName=${encodeURIComponent(itemName)}&category=${encodeURIComponent(category)}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    return null;
  }
}

export function AddValuableItemModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (item: Omit<ValuableItem, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Jewelry & Watches',
    purchasePrice: 0,
    currentValue: 0,
    purchaseDate: '',
    description: '',
    condition: 'Excellent',
    insured: false,
    insuranceValue: 0,
    color: '#f59e0b'
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [suggestedMarketPrice, setSuggestedMarketPrice] = useState<number | null>(null);
  const [marketPriceLoading, setMarketPriceLoading] = useState(false);
  const [suggestionPrices, setSuggestionPrices] = useState<Record<string, number>>({});
  const priceCache = useRef<Record<string, number | null>>({});

  // Update suggestions when name or category changes
  useEffect(() => {
    if (formData.name.length > 0) {
      const allResults: { item: string; category: string }[] = [];
      
      Object.entries(popularItems).forEach(([category, items]) => {
        items.forEach(item => {
          if (item.toLowerCase().includes(formData.name.toLowerCase())) {
            allResults.push({ item, category });
          }
        });
      });
      
      allResults.sort((a, b) => {
        const aExact = a.item.toLowerCase().startsWith(formData.name.toLowerCase()) ? 0 : 1;
        const bExact = b.item.toLowerCase().startsWith(formData.name.toLowerCase()) ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.item.length - b.item.length;
      });
      
      const filtered = allResults.map(r => r.item);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      
      allResults.slice(0, 10).forEach(async ({ item: itemName, category }) => {
        const cacheKey = `${itemName}:${category}`;
        if (priceCache.current[cacheKey] === undefined && !suggestionPrices[itemName]) {
          const marketData = await fetchItemMarketPrice(itemName, category);
          priceCache.current[cacheKey] = marketData?.averagePrice || null;
          if (marketData?.averagePrice) {
            setSuggestionPrices(prev => ({ ...prev, [itemName]: marketData.averagePrice }));
          }
        }
      });
    } else {
      const allSuggestions = popularItems[formData.category as keyof typeof popularItems] || [];
      setFilteredSuggestions(allSuggestions);
      setShowSuggestions(false);
    }
  }, [formData.name, formData.category]);

  // Fetch market price when item name is selected or changed
  useEffect(() => {
    const fetchMarketPrice = async () => {
      if (formData.name.length < 3) {
        setSuggestedMarketPrice(null);
        return;
      }
      
      const cacheKey = `${formData.name}:${formData.category}`;
      if (priceCache.current[cacheKey] !== undefined) {
        setSuggestedMarketPrice(priceCache.current[cacheKey]);
        return;
      }
      
      setMarketPriceLoading(true);
      const marketData = await fetchItemMarketPrice(formData.name, formData.category);
      const price = marketData?.averagePrice || null;
      priceCache.current[cacheKey] = price;
      setSuggestedMarketPrice(price);
      setMarketPriceLoading(false);
    };
    
    const debounceTimer = setTimeout(fetchMarketPrice, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.name, formData.category]);

  const handleNameChange = (value: string) => {
    setFormData({...formData, name: value});
    setShowSuggestions(value.length > 0);
  };

  const selectSuggestion = (suggestion: string) => {
    setFormData({...formData, name: suggestion});
    setShowSuggestions(false);
  };

  const applySuggestedPrice = () => {
    if (suggestedMarketPrice) {
      setFormData({
        ...formData, 
        currentValue: suggestedMarketPrice,
        purchasePrice: formData.purchasePrice === 0 ? suggestedMarketPrice : formData.purchasePrice
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({ 
      name: '', 
      category: 'Jewelry & Watches', 
      purchasePrice: 0, 
      currentValue: 0, 
      purchaseDate: '', 
      description: '', 
      condition: 'Excellent', 
      insured: false, 
      insuranceValue: 0,
      color: '#f59e0b'
    });
    setShowSuggestions(false);
    onClose();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ 
        name: '', 
        category: 'Jewelry & Watches', 
        purchasePrice: 0, 
        currentValue: 0, 
        purchaseDate: '', 
        description: '', 
        condition: 'Excellent', 
        insured: false, 
        insuranceValue: 0,
        color: '#f59e0b'
      });
      setShowSuggestions(false);
      setSuggestedMarketPrice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000001]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Valuable Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Item Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => formData.name.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              placeholder="Start typing or select a suggestion..."
              required
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-[1000010] w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredSuggestions.slice(0, 15).map((suggestion, index) => {
                  const price = suggestionPrices[suggestion];
                  let itemCategory = formData.category;
                  for (const [cat, items] of Object.entries(popularItems)) {
                    if (items.includes(suggestion)) {
                      itemCategory = cat;
                      break;
                    }
                  }
                  const isDifferentCategory = itemCategory !== formData.category;
                  
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setFormData({...formData, name: suggestion, category: itemCategory});
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-lime-50 dark:hover:bg-lime-900/20 text-gray-900 dark:text-white transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>{suggestion}</span>
                            {isDifferentCategory && (
                              <span className="text-xs px-2 py-0.5 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400 rounded-full">
                                {itemCategory}
                              </span>
                            )}
                          </div>
                        </div>
                        {price && (
                          <span className="text-sm text-lime-600 dark:text-lime-400 font-semibold ml-2">
                            ${formatNumber(price)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {!showSuggestions && formData.name.length === 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {popularItems[formData.category as keyof typeof popularItems]?.slice(0, 6).map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectSuggestion(item)}
                    className="px-3 py-1 text-xs bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400 rounded-full hover:bg-lime-100 dark:hover:bg-lime-900/30 transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Category</label>
            <select
              value={formData.category}
              onChange={(e) => {
                setFormData({...formData, category: e.target.value, name: ''});
                setShowSuggestions(false);
              }}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            >
              <option value="Jewelry & Watches">Jewelry & Watches</option>
              <option value="Art & Collectibles">Art & Collectibles</option>
              <option value="Electronics">Electronics</option>
              <option value="Collectibles">Collectibles</option>
              <option value="Automotive">Automotive</option>
              <option value="Photography">Photography</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Purchase Price</label>
            <input
              type="number"
              value={isNaN(formData.purchasePrice) ? '' : formData.purchasePrice}
              onChange={(e) => setFormData({...formData, purchasePrice: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Current Value</label>
            <input
              type="number"
              value={isNaN(formData.currentValue) ? '' : formData.currentValue}
              onChange={(e) => setFormData({...formData, currentValue: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
              required
            />
            {marketPriceLoading && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <div className="animate-spin w-3 h-3 border-2 border-lime-500 border-t-transparent rounded-full"></div>
                Fetching market price...
              </div>
            )}
            {suggestedMarketPrice && !marketPriceLoading && (
              <div className="mt-2 p-2 bg-lime-50 dark:bg-lime-900/20 rounded flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-semibold text-lime-700 dark:text-lime-400">
                    💰 Market Avg: ${formatNumber(suggestedMarketPrice)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Based on current market data
                  </div>
                </div>
                <button
                  type="button"
                  onClick={applySuggestedPrice}
                  className="px-3 py-1 text-xs bg-lime-500 text-white rounded hover:bg-lime-600 transition-colors"
                >
                  Use This
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Purchase Date</label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 dark:[color-scheme:dark]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Condition</label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({...formData, condition: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            >
              <option value="Mint">Mint</option>
              <option value="Excellent">Excellent</option>
              <option value="Very Good">Very Good</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.insured}
                onChange={(e) => setFormData({...formData, insured: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Insured</span>
            </label>
          </div>
          {formData.insured && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Insurance Value</label>
              <input
                type="number"
                value={isNaN(formData.insuranceValue) ? '' : formData.insuranceValue}
                onChange={(e) => setFormData({...formData, insuranceValue: parseFloat(e.target.value)})}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                step="0.01"
                min="0"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Chart Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Color for charts and visualizations</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              rows={2}
              placeholder="Brief description of the item"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 flex-1 bg-[#212121] text-white px-4 py-2 rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333]"
            >
              Add Item
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
