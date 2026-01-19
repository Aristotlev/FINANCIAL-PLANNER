"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatNumber } from "../../../lib/utils";
import { X, Search, DollarSign } from "lucide-react";

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000001]" onClick={onClose}>
      <div className="bg-[#0D0D0D] border border-white/10 p-6 rounded-3xl w-[500px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Add Valuable Item</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <label className="block text-sm font-medium mb-2 text-gray-400">Item Name</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => formData.name.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-medium"
                placeholder="Start typing or select a suggestion..."
                required
              />
            </div>
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-[1000010] w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto">
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
                      className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{suggestion}</span>
                            {isDifferentCategory && (
                              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-500 rounded-full border border-emerald-500/20">
                                {itemCategory}
                              </span>
                            )}
                          </div>
                        </div>
                        {price && (
                          <span className="text-sm text-emerald-500 font-medium ml-2">
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
              <div className="mt-3 flex flex-wrap gap-2">
                {popularItems[formData.category as keyof typeof popularItems]?.slice(0, 6).map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectSuggestion(item)}
                    className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-gray-400 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Category</label>
            <div className="relative">
              <select
                value={formData.category}
                onChange={(e) => {
                  setFormData({...formData, category: e.target.value, name: ''});
                  setShowSuggestions(false);
                }}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white appearance-none cursor-pointer font-medium"
              >
                <option value="Jewelry & Watches">Jewelry & Watches</option>
                <option value="Art & Collectibles">Art & Collectibles</option>
                <option value="Electronics">Electronics</option>
                <option value="Collectibles">Collectibles</option>
                <option value="Automotive">Automotive</option>
                <option value="Photography">Photography</option>
              </select>
               <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Purchase Price</label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="number"
                  value={isNaN(formData.purchasePrice) ? '' : formData.purchasePrice}
                  onChange={(e) => setFormData({...formData, purchasePrice: parseFloat(e.target.value)})}
                  className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-mono font-medium"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Current Value</label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="number"
                  value={isNaN(formData.currentValue) ? '' : formData.currentValue}
                  onChange={(e) => setFormData({...formData, currentValue: parseFloat(e.target.value)})}
                  className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-mono font-medium"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>
          </div>

          {(marketPriceLoading || suggestedMarketPrice) && (
              <div className="mt-2">
                {marketPriceLoading && (
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <div className="animate-spin w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                    Fetching market price...
                  </div>
                )}
                {suggestedMarketPrice && !marketPriceLoading && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                    <div className="text-xs">
                      <div className="font-semibold text-emerald-500">
                        💰 Market Avg: ${formatNumber(suggestedMarketPrice)}
                      </div>
                      <div className="text-gray-400 mt-0.5">
                        Based on current market data
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={applySuggestedPrice}
                      className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
                    >
                      Use This
                    </button>
                  </div>
                )}
              </div>
            )}

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-medium [color-scheme:dark]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Condition</label>
              <div className="relative">
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({...formData, condition: e.target.value})}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white appearance-none cursor-pointer font-medium"
                >
                  <option value="Mint">Mint</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Very Good">Very Good</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 border border-white/10 rounded-xl bg-[#1A1A1A] cursor-pointer group hover:border-white/20 transition-colors">
              <input
                type="checkbox"
                checked={formData.insured}
                onChange={(e) => setFormData({...formData, insured: e.target.checked})}
                className="w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 bg-gray-800"
              />
              <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">Item is Insured</span>
            </label>
          </div>

          {formData.insured && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium mb-2 text-gray-400">Insurance Value</label>
               <div className="relative group">
                <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="number"
                  value={isNaN(formData.insuranceValue) ? '' : formData.insuranceValue}
                  onChange={(e) => setFormData({...formData, insuranceValue: parseFloat(e.target.value)})}
                  className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-mono font-medium"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Chart Color</label>
            <div className="flex items-center gap-4 bg-[#1A1A1A] border border-white/10 p-2 rounded-xl">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border-none p-0"
              />
              <span className="text-sm text-gray-400">
                Used for charts and visualizations
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-gray-600 transition-all font-medium resize-none"
              rows={2}
              placeholder="Brief description of the item"
            />
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
              className="flex-1 px-4 py-3 bg-white text-black rounded-xl hover:bg-gray-200 transition-all font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
