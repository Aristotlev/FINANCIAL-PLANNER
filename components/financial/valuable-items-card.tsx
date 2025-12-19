"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Diamond, 
  Plus, 
  Edit3, 
  Trash2, 
  TrendingUp,
  Package,
  DollarSign,
  Star,
  Watch,
  Palette,
  Monitor,
  Car,
  Camera
} from "lucide-react";
import { TbDiamond } from "react-icons/tb";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { MarketAnalysisWidget } from "../ui/market-analysis-widget";
import { ThemedStatBox, ConditionalThemedStatBox, ThemedContainer, CARD_THEME_COLORS } from "../ui/themed-stat-box";
import { formatNumber } from "../../lib/utils";
import { useCurrency } from "../../contexts/currency-context";

interface ValuableItem {
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
    // Gracefully handle null data - this means item is not in the market database
    return result.data || null;
  } catch (error) {
    // Silently fail - this is expected for items not in the market database
    return null;
  }
}

const initialValuableItems: ValuableItem[] = [
  {
    id: "1",
    name: "Rolex Submariner",
    category: "Jewelry & Watches",
    purchasePrice: 8500,
    currentValue: 12500,
    purchaseDate: "2020-03-15",
    description: "Stainless steel, black dial, excellent condition",
    condition: "Excellent",
    insured: true,
    insuranceValue: 15000,
    color: "#f59e0b"
  },
  {
    id: "2", 
    name: "Original Basquiat Print",
    category: "Art & Collectibles",
    purchasePrice: 25000,
    currentValue: 45000,
    purchaseDate: "2018-08-22",
    description: "Limited edition print, authenticated",
    condition: "Mint",
    insured: true,
    insuranceValue: 50000,
    color: "#8b5cf6"
  },
  {
    id: "3",
    name: "MacBook Pro M2 Max",
    category: "Electronics",
    purchasePrice: 3200,
    currentValue: 2800,
    purchaseDate: "2023-01-10",
    description: "16-inch, 32GB RAM, 1TB SSD",
    condition: "Very Good",
    insured: false,
    insuranceValue: 0,
    color: "#06b6d4"
  },
  {
    id: "4",
    name: "Vintage Porsche Parts Collection",
    category: "Collectibles",
    purchasePrice: 15000,
    currentValue: 22000,
    purchaseDate: "2019-06-12",
    description: "Rare 911 Carrera parts from 1970s",
    condition: "Good",
    insured: true,
    insuranceValue: 25000,
    color: "#84cc16"
  }
];

function getCategoryIcon(category: string, className = "w-4 h-4") {
  const colorClass = "text-gray-700 dark:text-white";
  const fullClassName = `${className} ${colorClass}`;
  switch (category.toLowerCase()) {
    case "jewelry & watches": return <Watch className={fullClassName} />;
    case "art & collectibles": return <Palette className={fullClassName} />;
    case "electronics": return <Monitor className={fullClassName} />;
    case "collectibles": return <Star className={fullClassName} />;
    case "automotive": return <Car className={fullClassName} />;
    case "photography": return <Camera className={fullClassName} />;
    default: return <Package className={fullClassName} />;
  }
}

function ValuableItemsHoverContent() {
  const [items, setItems] = useState<ValuableItem[]>([]);

  useEffect(() => {
    const loadItems = async () => {
      const savedItems = await SupabaseDataService.getValuableItems([]);
      setItems(savedItems);
    };
    loadItems();
    
    // Listen for data changes
    const handleDataChange = () => loadItems();
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => window.removeEventListener('financialDataChanged', handleDataChange);
  }, []);

  const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0);
  const appreciation = items.reduce((sum, item) => sum + (item.currentValue - item.purchasePrice), 0);
  
  // Group by category and show top 2 categories
  const categoryTotals = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.currentValue;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2);
  
  const getCategoryIcon = (category: string) => {
    if (category.toLowerCase().includes('jewelry') || category.toLowerCase().includes('watch')) return '💍';
    if (category.toLowerCase().includes('art') || category.toLowerCase().includes('collect')) return '🎨';
    if (category.toLowerCase().includes('vehicle') || category.toLowerCase().includes('car')) return '🚗';
    if (category.toLowerCase().includes('electronic')) return '💻';
    return '💎';
  };

  return (
    <div className="space-y-1">
      {topCategories.map(([category, value]) => (
        <div key={category} className="flex justify-between text-xs">
          <span className="flex items-center gap-1">
            {getCategoryIcon(category)} {category}
          </span>
          <span className="font-semibold text-lime-600 dark:text-lime-400">${formatNumber(value)}</span>
        </div>
      ))}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
        <div className="flex justify-between text-xs">
          <span>Total Value</span>
          <span className="font-semibold text-lime-600 dark:text-lime-400">${formatNumber(totalValue)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Appreciation</span>
          <span className="font-semibold text-green-600 dark:text-green-400">+${formatNumber(appreciation)}</span>
        </div>
      </div>
    </div>
  );
}

// Popular item suggestions by category
const popularItems = {
  "Jewelry & Watches": [
    "Rolex Submariner", "Rolex Daytona", "Rolex GMT-Master", "Rolex Datejust",
    "Patek Philippe Nautilus", "Patek Philippe Calatrava", "Patek Philippe Aquanaut",
    "Audemars Piguet Royal Oak", "Audemars Piguet Royal Oak Offshore",
    "Richard Mille RM 011", "Richard Mille RM 055",
    "Omega Speedmaster", "Omega Seamaster", "Omega Constellation",
    "Cartier Love Bracelet", "Cartier Juste un Clou", "Cartier Tank Watch", "Cartier Santos",
    "Van Cleef & Arpels Alhambra Necklace", "Van Cleef & Arpels Vintage Alhambra",
    "Tiffany & Co. Engagement Ring", "Tiffany & Co. T Bracelet", "Tiffany Diamond Necklace",
    "Chrome Hearts Cross Necklace", "Chrome Hearts Ring", "Chrome Hearts Bracelet",
    "Bulgari Serpenti Watch", "Bulgari B.zero1 Ring",
    "Harry Winston Diamond Ring", "Harry Winston Necklace",
    "Chopard Happy Diamonds", "Chopard Mille Miglia",
    "Jaeger-LeCoultre Reverso", "Jaeger-LeCoultre Master",
    "Vacheron Constantin Overseas", "IWC Big Pilot", "Panerai Luminor",
    "Hublot Big Bang", "Tag Heuer Carrera", "Breitling Navitimer"
  ],
  "Art & Collectibles": [
    "Original Painting", "Contemporary Art", "Modern Art", "Abstract Art",
    "Banksy Print", "Banksy Original", "KAWS Sculpture", "KAWS Companion",
    "Basquiat Print", "Warhol Silkscreen", "Picasso Lithograph",
    "Limited Edition Sculpture", "Bronze Sculpture", "Marble Sculpture",
    "Vintage Poster", "Concert Poster", "Movie Poster",
    "Signed Artwork", "Artist Proof", "Gallery Piece",
    "Antique Furniture", "Mid-Century Modern Furniture", "Eames Chair",
    "Hermès Birkin Bag", "Hermès Kelly Bag", "Louis Vuitton Trunk",
    "Rare Books", "First Edition Books", "Signed Books",
    "Persian Rug", "Oriental Rug", "Vintage Rug"
  ],
  "Electronics": [
    // Apple Products
    "MacBook Pro M3 Max", "MacBook Pro M2 Max", "MacBook Pro 16-inch", "MacBook Air M3", "MacBook Air M2",
    "Mac Studio M2 Ultra", "Mac Mini M2 Pro", "iMac 24-inch M3", "Mac Studio", "Mac Pro", "iMac Pro",
    "iPad Pro 12.9", "iPad Pro M2", "iPad Air M2", "iPad Mini 6",
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 13 Pro Max",
    "Apple Vision Pro", "Apple Watch Ultra 2", "Apple Watch Series 9",
    "AirPods Max", "AirPods Pro 2", "Apple Pro Display XDR",
    // Samsung Products
    "Samsung Galaxy S24 Ultra", "Samsung Galaxy S23 Ultra", "Samsung Galaxy Z Fold 5", "Samsung Galaxy Z Flip 5",
    "Samsung Galaxy Tab S9 Ultra", "Samsung Galaxy Watch 6 Classic", "Samsung Galaxy Buds 2 Pro",
    // Other Laptops
    "Dell XPS 15", "Dell XPS 13", "Microsoft Surface Laptop Studio", "Microsoft Surface Pro 9",
    "HP Spectre x360", "Lenovo ThinkPad X1 Carbon", "ASUS ROG Zephyrus G14", "Razer Blade 15",
    // Other Phones
    "Google Pixel 8 Pro", "OnePlus 12 Pro",
    // Gaming & Entertainment
    "Gaming PC RTX 4090", "Gaming PC Custom Build", "Alienware Aurora",
    "PlayStation 5", "Xbox Series X", "Nintendo Switch OLED", "Meta Quest 3", "PlayStation VR2",
    "Sony A95L OLED TV", "LG C3 OLED TV", "Samsung QN90C",
    "LG UltraFine 5K", "ASUS ROG Swift",
    "Sony WH-1000XM5", "Bose QuietComfort Ultra",
    "HomePod", "Sonos Arc", "Bowers & Wilkins 800 Series",
    "Herman Miller Aeron Chair", "Herman Miller Embody"
  ],
  "Photography": [
    // Camera Bodies
    "Canon EOS R5", "Canon EOS R3", "Canon EOS R6 Mark II",
    "Sony A1", "Sony A7R V", "Sony A7 IV", "Sony A9 III",
    "Nikon Z9", "Nikon Z8", "Nikon Z6 III",
    "Leica M11", "Leica Q3", "Leica SL3",
    "Fujifilm X-T5", "Fujifilm X-H2S", "Panasonic Lumix S5 II",
    "Hasselblad X2D", "Hasselblad 907X", "Phase One XF",
    // Canon Lenses
    "Canon RF 50mm f/1.2L", "Canon RF 85mm f/1.2L", "Canon RF 24-70mm f/2.8L",
    "Canon RF 70-200mm f/2.8L", "Canon RF 100-500mm f/4.5-7.1L", "Canon RF 15-35mm f/2.8L",
    "Canon RF 28-70mm f/2",
    // Sony Lenses
    "Sony FE 24-70mm f/2.8 GM II", "Sony FE 50mm f/1.2 GM", "Sony FE 85mm f/1.4 GM",
    "Sony FE 70-200mm f/2.8 GM OSS II", "Sony FE 200-600mm f/5.6-6.3 G OSS", "Sony FE 16-35mm f/2.8 GM",
    // Nikon Lenses
    "Nikon Z 50mm f/1.2 S", "Nikon Z 85mm f/1.2 S", "Nikon Z 24-70mm f/2.8 S",
    "Nikon Z 70-200mm f/2.8 VR S", "Nikon Z 14-24mm f/2.8 S",
    // Third-Party Lenses
    "Sigma 24-70mm f/2.8 DG DN Art", "Sigma 85mm f/1.4 DG DN Art",
    "Tamron 28-75mm f/2.8 Di III VXD G2", "Tamron 70-180mm f/2.8 Di III VXD",
    "Sigma Art Lens", "Tamron G2 Lens", "Zeiss Otus",
    // Accessories
    "DJI Mavic 3 Pro", "DJI Air 3", "DJI Mini 4 Pro", "DJI Inspire 3",
    "GoPro Hero 12", "Insta360 X3", "DJI Osmo Action 4",
    "DJI Ronin 4D", "DJI RS 4 Pro", "Zhiyun Crane 4",
    "Peak Design Camera Bag", "Think Tank Photo Bag",
    "Manfrotto Tripod", "Gitzo Tripod", "Really Right Stuff Tripod",
    "Profoto B10X", "Godox AD600", "Broncolor Siros"
  ],
  "Collectibles": [
    "Pokémon Card Charizard", "Magic The Gathering Black Lotus", "Yu-Gi-Oh! Blue-Eyes",
    "Vintage Comic Spider-Man #1", "Action Comics #1", "Detective Comics #27",
    "LEGO UCS Millennium Falcon", "LEGO Star Destroyer", "LEGO Colosseum",
    "Hot Toys Iron Man", "Hot Toys Batman", "Sideshow Collectibles",
    "Funko Pop Chase", "Funko Pop Grail", "Bearbrick 1000%",
    "Supreme Box Logo Hoodie", "Supreme Brick", "Off-White Jordan 1",
    "Nike Dunk SB", "Air Jordan 1 Chicago", "Yeezy Boost 350",
    "Rolex Box Set", "Hermès Scarf Collection",
    "Vintage Vinyl Beatles", "Vinyl First Pressing", "Signed Album",
    "Sports Memorabilia", "Signed Jersey", "Game-Used Equipment",
    "Rare Coins", "Gold Coins", "Silver Coins", "Ancient Coins",
    "Vintage Stamps", "First Day Covers", "Rare Stamps"
  ],
  "Automotive": [
    "Porsche 911 Turbo S", "Porsche 911 GT3", "Porsche Carrera GT",
    "Ferrari 488", "Ferrari F8 Tributo", "Ferrari SF90",
    "Lamborghini Huracán", "Lamborghini Aventador", "Lamborghini Urus",
    "McLaren 720S", "McLaren P1", "McLaren Senna",
    "Mercedes-AMG GT", "Mercedes-Benz G-Class", "Mercedes S-Class",
    "BMW M3", "BMW M5", "BMW i8",
    "Aston Martin DB11", "Aston Martin Vantage",
    "Tesla Model S Plaid", "Tesla Roadster",
    "Vintage Porsche 911", "Vintage Ferrari", "Classic Mercedes",
    "Racing Wheels", "Carbon Fiber Parts", "Performance Exhaust",
    "Vintage Car Parts", "OEM Parts Collection",
    "Motorcycle Ducati", "Motorcycle Harley-Davidson", "Motorcycle BMW"
  ]
};

function AddValuableItemModal({ 
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
      // Search across ALL categories, not just the selected one
      const allResults: { item: string; category: string }[] = [];
      
      Object.entries(popularItems).forEach(([category, items]) => {
        items.forEach(item => {
          if (item.toLowerCase().includes(formData.name.toLowerCase())) {
            allResults.push({ item, category });
          }
        });
      });
      
      // Sort by relevance (exact match first, then by length)
      allResults.sort((a, b) => {
        const aExact = a.item.toLowerCase().startsWith(formData.name.toLowerCase()) ? 0 : 1;
        const bExact = b.item.toLowerCase().startsWith(formData.name.toLowerCase()) ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.item.length - b.item.length;
      });
      
      const filtered = allResults.map(r => r.item);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      
      // Fetch prices for filtered suggestions with caching
      allResults.slice(0, 10).forEach(async ({ item: itemName, category }) => {
        const cacheKey = `${itemName}:${category}`;
        // Check cache first to avoid redundant API calls
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
      // Check cache first
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
        // If purchase price is not set, set it to the market price
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
                  // Find which category this item belongs to
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
              value={formData.purchasePrice}
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
              value={formData.currentValue}
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
                value={formData.insuranceValue}
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
              className="flex-1 bg-lime-500 text-white px-4 py-2 rounded hover:bg-lime-600"
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

function EditValuableItemModal({ 
  isOpen, 
  onClose, 
  item, 
  onUpdate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  item: ValuableItem | null;
  onUpdate: (item: ValuableItem) => Promise<void>;
}) {
  const [formData, setFormData] = useState<ValuableItem>({
    id: '',
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

  React.useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit Valuable Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Item Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
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
              value={formData.purchasePrice}
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
              value={formData.currentValue}
              onChange={(e) => setFormData({...formData, currentValue: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              step="0.01"
              min="0"
              required
            />
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
                value={formData.insuranceValue}
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
              className="flex-1 bg-lime-500 text-white px-4 py-2 rounded hover:bg-lime-600"
            >
              Update Item
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white dark:text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ValuableItemsModalContent() {
  const [activeTab, setActiveTab] = useState<'items' | 'analytics' | 'insurance'>('items');
  const [items, setItems] = useState<ValuableItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ValuableItem | null>(null);
  const isInitialMount = useRef(true);
  const [loadingMarketPrices, setLoadingMarketPrices] = useState(false);

  // Load data on component mount and fetch market prices
  useEffect(() => {
    const loadItems = async () => {
      const savedItems = await SupabaseDataService.getValuableItems([]);
      setItems(savedItems);
      
      // Fetch market prices only for items without existing data (lazy loading)
      // This prevents excessive API calls on every modal open
      setLoadingMarketPrices(true);
      const itemsWithPrices = await Promise.all(
        savedItems.map(async (item) => {
          // Skip if we already have market data
          if (item.marketPrice && item.lastMarketUpdate) {
            const lastUpdate = new Date(item.lastMarketUpdate);
            const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
            // Only refresh if data is older than 24 hours
            if (hoursSinceUpdate < 24) {
              return item;
            }
          }
          
          const marketData = await fetchItemMarketPrice(item.name, item.category);
          if (marketData) {
            return {
              ...item,
              marketPrice: marketData.averagePrice,
              marketPriceRange: marketData.priceRange,
              marketTrend: marketData.marketTrend,
              priceChange30d: marketData.priceChange30d,
              lastMarketUpdate: marketData.lastUpdated
            };
          }
          return item;
        })
      );
      setItems(itemsWithPrices);
      setLoadingMarketPrices(false);
    };
    loadItems();
    
    // Listen for data changes from AI or other components
    const handleDataChange = () => loadItems();
    window.addEventListener('itemsDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('itemsDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  // Data is now saved immediately on each operation (add/update/delete)
  // No need for a separate useEffect that watches all items changes

  const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0);
  const totalPurchase = items.reduce((sum, item) => sum + item.purchasePrice, 0);
  const totalAppreciation = totalValue - totalPurchase;
  const totalInsured = items.filter(item => item.insured).reduce((sum, item) => sum + item.insuranceValue, 0);

  const addItem = async (itemData: Omit<ValuableItem, 'id'>) => {
    const newItem: ValuableItem = {
      ...itemData,
      id: Date.now().toString()
    };
    // Save to database first
    await SupabaseDataService.saveValuableItem(newItem);
    setItems([...items, newItem]);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const updateItem = async (updatedItem: ValuableItem) => {
    await SupabaseDataService.saveValuableItem(updatedItem);
    setItems(items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
    setEditingItem(null);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const deleteItem = async (itemId: string) => {
    await SupabaseDataService.deleteValuableItem(itemId);
    setItems(items.filter(item => item.id !== itemId));
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const editItem = (item: ValuableItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'items', label: 'Items', icon: Package },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'insurance', label: 'Insurance', icon: Star }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          
          {activeTab === 'items' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          )}
        </div>

        {/* Items Tab */}
        {activeTab === 'items' && (
          <div className="space-y-6">
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {items.sort((a, b) => b.currentValue - a.currentValue).map((item) => {
                const appreciation = item.currentValue - item.purchasePrice;
                const appreciationPercent = ((appreciation / item.purchasePrice) * 100);
                const hasMarketPrice = item.marketPrice && item.marketPrice > 0;
                const marketDiff = hasMarketPrice ? item.marketPrice! - item.currentValue : 0;
                const marketDiffPercent = hasMarketPrice && item.currentValue > 0 
                  ? ((marketDiff / item.currentValue) * 100) 
                  : 0;
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-lime-300 dark:hover:border-lime-600 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: item.color + '20' }}
                      >
                        {getCategoryIcon(item.category, 'w-5 h-5')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{item.name}</span>
                          {item.insured && <Star className="w-4 h-4 text-yellow-500" />}
                          {item.marketTrend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {item.marketTrend === 'down' && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.category} • {item.condition} • Purchased: {new Date(item.purchaseDate).toLocaleDateString()}
                        </div>
                        {hasMarketPrice && (
                          <div className="text-xs text-lime-600 dark:text-lime-400 mt-1 flex items-center gap-2">
                            <DollarSign className="w-3 h-3" />
                            Market Avg: ${formatNumber(item.marketPrice!)}
                            {item.marketPriceRange && (
                              <span className="text-gray-500">
                                (${formatNumber(item.marketPriceRange.low)} - ${formatNumber(item.marketPriceRange.high)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">${formatNumber(item.currentValue)}</div>
                        <div className={`text-sm ${appreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {appreciation >= 0 ? '+' : ''}{appreciationPercent.toFixed(2)}%
                        </div>
                        {hasMarketPrice && marketDiff !== 0 && (
                          <div className={`text-xs ${marketDiff > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {marketDiff > 0 ? '↑' : '↓'} {Math.abs(marketDiffPercent).toFixed(1)}% vs market
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => editItem(item)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <Edit3 className="w-4 h-4 text-gray-700 dark:text-cyan-400 dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await deleteItem(item.id);
                            } catch (error) {
                              console.error('Failed to delete item:', error);
                              alert('Failed to delete item. Please try again.');
                            }
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
                        >
                          <Trash2 className="w-4 h-4 dark:text-red-400 dark:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No items yet. Click Add Item to get started.</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 -mx-2 py-2 -my-2">
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.valuableItems}
                value={`$${formatNumber(totalValue)}`}
                label="Current Value"
              />
              <ConditionalThemedStatBox
                themeColor={CARD_THEME_COLORS.valuableItems}
                value={`${totalAppreciation >= 0 ? '+' : ''}$${formatNumber(totalAppreciation)}`}
                label="Appreciation"
                valueType={totalAppreciation >= 0 ? 'positive' : 'negative'}
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.valuableItems}
                value={`$${formatNumber(totalInsured)}`}
                label="Insured Value"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.valuableItems}
                value={items.length}
                label="Total Items"
              />
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 px-2 -mx-2 py-2 -my-2">
              {Object.entries(
                items.reduce((acc, item) => {
                  acc[item.category] = (acc[item.category] || 0) + item.currentValue;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([category, value]) => (
                <div key={category} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-lime-500/50 dark:hover:shadow-lime-500/30 cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryIcon(category)}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{category}</h3>
                  </div>
                  <div className="text-2xl font-bold text-lime-600">${formatNumber(value)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {items.filter(i => i.category === category).length} items
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insurance Tab */}
        {activeTab === 'insurance' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {items.filter(item => item.insured).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-yellow-500/50 dark:hover:shadow-yellow-500/30 cursor-pointer">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(item.category)}
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{item.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">${formatNumber(item.insuranceValue)}</div>
                    <div className="text-sm text-yellow-600">Insured</div>
                  </div>
                </div>
              ))}
            </div>

            {items.filter(item => !item.insured).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Uninsured Items</h3>
                <div className="space-y-2">
                  {items.filter(item => !item.insured).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/50 dark:hover:shadow-red-500/30 cursor-pointer">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(item.category)}
                        <span className="text-sm text-gray-900 dark:text-white">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">${formatNumber(item.currentValue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AddValuableItemModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAdd={addItem}
      />
      
      <EditValuableItemModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        item={editingItem}
        onUpdate={updateItem}
      />
    </div>
  );
}

export function ValuableItemsCard() {
  const [items, setItems] = useState<ValuableItem[]>([]);
  const { mainCurrency, convert } = useCurrency();

  // Load data on component mount
  useEffect(() => {
    const loadItems = async () => {
      const savedItems = await SupabaseDataService.getValuableItems([]);
      setItems(savedItems);
    };
    loadItems();
    
    // Listen for data changes and reload
    const handleDataChange = () => loadItems();
    window.addEventListener('valuableItemsDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('currencyChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('valuableItemsDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('currencyChanged', handleDataChange);
    };
  }, []);

  // Calculate dynamic values from saved data (values are stored in USD)
  const totalValueUSD = items.reduce((sum, item) => sum + item.currentValue, 0);
  const totalPurchaseUSD = items.reduce((sum, item) => sum + item.purchasePrice, 0);
  
  // Convert to main currency for display
  const totalValue = convert(totalValueUSD, 'USD', mainCurrency.code);
  const totalPurchase = convert(totalPurchaseUSD, 'USD', mainCurrency.code);
  const totalAppreciation = totalValue - totalPurchase;
  const appreciationPercentage = totalPurchase > 0 ? ((totalAppreciation / totalPurchase) * 100) : 0;

  const changePercent = items.length === 0 ? "0.0%" : `${appreciationPercentage >= 0 ? '+' : ''}${appreciationPercentage.toFixed(2)}%`;
  const changeType = appreciationPercentage >= 0 ? "positive" as const : "negative" as const;

  // Group items by category for stats
  const categories = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.currentValue;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 2);

  // Dynamic chart data based on actual items - sort by value and show top items
  const chartData = items
    .filter(item => item.currentValue && !isNaN(item.currentValue) && isFinite(item.currentValue))
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 12)
    .map(item => ({
      value: item.currentValue,
      change: `+${(((item.currentValue - item.purchasePrice) / item.purchasePrice) * 100).toFixed(2)}%`
    }));

  // Currency conversion - show in user's selected currency
  const displayAmount = `${mainCurrency.symbol}${formatNumber(totalValue)}`;
  const originalAmount = mainCurrency.code !== 'USD' ? `$${formatNumber(totalValueUSD)}` : undefined;
  
  // Convert category stats to user's currency
  const category0Value = topCategories[0]?.[1] ? convert(topCategories[0][1], 'USD', mainCurrency.code) : 0;
  const category1Value = topCategories[1]?.[1] ? convert(topCategories[1][1], 'USD', mainCurrency.code) : 0;

  return (
    <EnhancedFinancialCard
      title="Valuable Items"
      description="Collectibles, jewelry, art, and other valuable assets"
      amount={displayAmount}
      change={changePercent}
      changeType={changeType}
      mainColor="#84cc16"
      secondaryColor="#a3e635"
      gridColor="#84cc1615"
      stats={[
        { label: topCategories[0]?.[0] || "Art & Items", value: `${mainCurrency.symbol}${category0Value.toLocaleString()}`, color: "#84cc16" },
        { label: topCategories[1]?.[0] || "Electronics", value: `${mainCurrency.symbol}${category1Value.toLocaleString()}`, color: "#a3e635" }
      ]}
      icon={TbDiamond}
      hoverContent={<ValuableItemsHoverContent />}
      modalContent={<ValuableItemsModalContent />}
      chartData={chartData}
      convertedAmount={originalAmount}
      sourceCurrency={mainCurrency.code}
    />
  );
}
