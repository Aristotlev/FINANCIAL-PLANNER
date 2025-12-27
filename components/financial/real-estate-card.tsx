"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from 'next/dynamic';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { 
  Building, 
  Plus, 
  Edit3, 
  Trash2, 
  TrendingUp,
  Calculator,
  DollarSign,
  MapPin,
  Home,
  Calendar,
  Percent,
  X,
  Navigation,
  Map,
  Satellite,
  ExternalLink,
  Lock
} from "lucide-react";
import { EnhancedFinancialCard } from "../ui/enhanced-financial-card";
import { SupabaseDataService } from "../../lib/supabase/supabase-data-service";
import { MarketAnalysisWidget } from "../ui/market-analysis-widget";
import { ThemedStatBox, ConditionalThemedStatBox, ThemedContainer, CARD_THEME_COLORS } from "../ui/themed-stat-box";
import { formatNumber } from "../../lib/utils";
import { useCurrency } from "../../contexts/currency-context";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_CONFIG, getEffectivePlanLimits } from "@/types/subscription";

interface RealEstateProperty {
  id: string;
  address: string;
  propertyType: string;
  purchasePrice: number;
  currentValue: number;
  downPayment: number;
  loanAmount: number;
  monthlyPayment: number;
  interestRate: number;
  propertyTax: number;
  insurance: number;
  maintenance: number;
  rentalIncome: number;
  purchaseDate: string;
  notes: string;
  color: string;
  // Geographic data for map integration
  coordinates?: {
    lat: number;
    lng: number;
  };
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
}

const initialRealEstateProperties: RealEstateProperty[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440021",
    address: "123 Oak Street",
    propertyType: "Primary Residence",
    purchasePrice: 450000,
    currentValue: 520000,
    downPayment: 90000,
    loanAmount: 360000,
    monthlyPayment: 2850,
    interestRate: 6.5,
    propertyTax: 8500,
    insurance: 1200,
    maintenance: 3000,
    rentalIncome: 0,
    purchaseDate: "2022-03-15",
    notes: "Primary residence in great neighborhood",
    color: "#84cc16",
    coordinates: { lat: 30.2672, lng: -97.7431 },
    neighborhood: "Hyde Park",
    city: "Austin",
    state: "TX",
    zipCode: "78751",
    sqft: 2200,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 1995
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440022", 
    address: "456 Pine Avenue",
    propertyType: "Rental Property",
    purchasePrice: 280000,
    currentValue: 315000,
    downPayment: 56000,
    loanAmount: 224000,
    monthlyPayment: 1680,
    interestRate: 7.0,
    propertyTax: 4200,
    insurance: 800,
    maintenance: 2400,
    rentalIncome: 2200,
    purchaseDate: "2021-08-20",
    notes: "Cash-flowing rental in growing area",
    color: "#a3e635",
    coordinates: { lat: 32.7767, lng: -96.7970 },
    neighborhood: "Deep Ellum",
    city: "Dallas",
    state: "TX",
    zipCode: "75226",
    sqft: 1800,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 1985
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440023",
    address: "789 Maple Drive",
    propertyType: "Investment Property",
    purchasePrice: 195000,
    currentValue: 225000,
    downPayment: 39000,
    loanAmount: 156000,
    monthlyPayment: 1250,
    interestRate: 6.8,
    propertyTax: 3100,
    insurance: 600,
    maintenance: 1800,
    rentalIncome: 1650,
    purchaseDate: "2020-11-10",
    notes: "Fix-and-flip turned rental",
    color: "#65a30d",
    coordinates: { lat: 29.7604, lng: -95.3698 },
    neighborhood: "Heights",
    city: "Houston",
    state: "TX",
    zipCode: "77008",
    sqft: 1500,
    bedrooms: 2,
    bathrooms: 2,
    yearBuilt: 1978
  }
];

function RealEstateHoverContent() {
  const [properties, setProperties] = useState<RealEstateProperty[]>([]);

  useEffect(() => {
    const loadProperties = async () => {
      const savedProperties = await SupabaseDataService.getRealEstate([]);
      setProperties(savedProperties);
    };
    loadProperties();
    
    // Listen for data changes
    const handleDataChange = () => loadProperties();
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => window.removeEventListener('financialDataChanged', handleDataChange);
  }, []);

  const totalValue = properties.reduce((sum, prop) => sum + prop.currentValue, 0);
  const totalEquity = properties.reduce((sum, prop) => sum + (prop.currentValue - prop.loanAmount), 0);
  const totalRentalIncome = properties.reduce((sum, prop) => sum + prop.rentalIncome, 0);
  const totalAppreciation = properties.reduce((sum, prop) => sum + (prop.currentValue - prop.purchasePrice), 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-900 dark:text-white">Total Property Value</span>
        <span className="text-sm font-bold text-lime-600 dark:text-lime-400">${formatNumber(totalValue)}</span>
      </div>
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span>Total Equity:</span>
          <span className="text-gray-900 dark:text-white">${formatNumber(totalEquity)}</span>
        </div>
        <div className="flex justify-between">
          <span>Monthly Rental Income:</span>
          <span className="text-gray-900 dark:text-white">${formatNumber(totalRentalIncome)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Appreciation:</span>
          <span className="text-green-600 dark:text-green-400">+${formatNumber(totalAppreciation)}</span>
        </div>
        <div className="flex justify-between">
          <span>Properties:</span>
          <span className="text-gray-900 dark:text-white">{properties.length}</span>
        </div>
      </div>
    </div>
  );
}

function AddRealEstatePropertyModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (property: Omit<RealEstateProperty, 'id'>) => void;
}) {
  const [formData, setFormData] = useState<Partial<RealEstateProperty>>({
    address: '',
    propertyType: 'Primary Residence',
    purchasePrice: 0,
    currentValue: 0,
    downPayment: 0,
    loanAmount: 0,
    monthlyPayment: 0,
    interestRate: 0,
    propertyTax: 0,
    insurance: 0,
    maintenance: 0,
    rentalIncome: 0,
    purchaseDate: '',
    notes: '',
    color: '#84cc16',
    city: '',
    state: '',
    zipCode: ''
  });
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Search for addresses using Nominatim (OpenStreetMap) API
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&accept-language=en`,
        {
          headers: {
            'User-Agent': 'MoneyHubApp/1.0',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }
      );
      const data = await response.json();
      setAddressSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Error searching address:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Select an address from suggestions
  const selectAddress = (suggestion: any) => {
    const address = suggestion.address || {};
    setFormData({
      ...formData,
      address: suggestion.display_name.split(',')[0],
      city: address.city || address.town || address.village || '',
      state: address.state || '',
      zipCode: address.postcode || '',
      coordinates: {
        lat: parseFloat(suggestion.lat),
        lng: parseFloat(suggestion.lon)
      },
      neighborhood: address.neighbourhood || address.suburb || ''
    });
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  // Handle location selection from map
  const handleMapLocationSelect = async (lat: number, lng: number) => {
    // Reverse geocode to get address from coordinates in English
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`,
        {
          headers: {
            'User-Agent': 'MoneyHubApp/1.0',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }
      );
      const data = await response.json();
      const address = data.address || {};
      
      setFormData({
        ...formData,
        address: data.display_name.split(',')[0] || '',
        city: address.city || address.town || address.village || '',
        state: address.state || '',
        zipCode: address.postcode || '',
        coordinates: { lat, lng },
        neighborhood: address.neighbourhood || address.suburb || ''
      });
      setShowMapPicker(false);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Still set coordinates even if reverse geocoding fails
      setFormData({
        ...formData,
        coordinates: { lat, lng }
      });
      setShowMapPicker(false);
    }
  };

  // Debounced address search - increased delay to prevent spam
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.address && formData.address.length >= 3) {
        searchAddress(formData.address);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.address]);

  // Auto-calculate loan amount when purchase price or down payment changes
  React.useEffect(() => {
    if (formData.purchasePrice && formData.downPayment) {
      setFormData(prev => ({
        ...prev,
        loanAmount: (prev.purchasePrice || 0) - (prev.downPayment || 0),
        currentValue: prev.currentValue || prev.purchasePrice
      }));
    }
  }, [formData.purchasePrice, formData.downPayment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData as Omit<RealEstateProperty, 'id'>);
    setFormData({ 
      address: '', 
      propertyType: 'Primary Residence', 
      purchasePrice: 0, 
      currentValue: 0, 
      downPayment: 0, 
      loanAmount: 0, 
      monthlyPayment: 0, 
      interestRate: 0, 
      propertyTax: 0, 
      insurance: 0, 
      maintenance: 0, 
      rentalIncome: 0, 
      purchaseDate: '', 
      notes: '', 
      color: '#84cc16',
      city: '', 
      state: '', 
      zipCode: '' 
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000001]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Real Estate Property</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="relative" style={{ zIndex: 10 }}>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Address</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({...formData, address: e.target.value});
                        setShowSuggestions(true);
                      }}
                      onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                      onBlur={() => {
                        // Delay hiding to allow click events on suggestions
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      className="w-full p-3 border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-lime-500 dark:focus:border-lime-400 focus:ring-2 focus:ring-lime-500/20 transition-all"
                      placeholder="Start typing an address..."
                      required
                    />
                    {searchingAddress && (
                      <div className="absolute right-3 top-3.5">
                        <div className="animate-spin h-5 w-5 border-2 border-lime-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="p-3 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center min-w-[44px]"
                    title="Pick location on map"
                  >
                    <Map className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Address Suggestions Dropdown */}
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border-2 border-lime-300 dark:border-lime-600 rounded-xl shadow-2xl max-h-96 overflow-y-auto" style={{ zIndex: 1000003 }}>
                    <div className="p-2">
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectAddress(suggestion);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-lime-50 dark:hover:bg-gray-700/50 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1.5 rounded-full bg-lime-100 dark:bg-lime-900/30 group-hover:bg-lime-200 dark:group-hover:bg-lime-800/50 transition-colors">
                              <MapPin className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {suggestion.display_name.split(',').slice(0, 2).join(',')}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                {suggestion.display_name.split(',').slice(2).join(',')}
                              </div>
                              {suggestion.type && (
                                <div className="text-xs text-lime-600 dark:text-lime-400 mt-1 font-medium">
                                  {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    placeholder="Austin"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    placeholder="TX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Zip Code</label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    placeholder="78751"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Property Type</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({...formData, propertyType: e.target.value})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                >
                  <option value="Primary Residence">Primary Residence</option>
                  <option value="Rental Property">Rental Property</option>
                  <option value="Investment Property">Investment Property</option>
                  <option value="Vacation Home">Vacation Home</option>
                  <option value="Commercial Property">Commercial Property</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Purchase Price</label>
                  <input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({...formData, purchasePrice: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
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
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Down Payment</label>
                  <input
                    type="number"
                    value={formData.downPayment}
                    onChange={(e) => setFormData({...formData, downPayment: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Loan Amount</label>
                  <input
                    type="number"
                    value={formData.loanAmount}
                    onChange={(e) => setFormData({...formData, loanAmount: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Monthly Payment</label>
                  <input
                    type="number"
                    value={formData.monthlyPayment}
                    onChange={(e) => setFormData({...formData, monthlyPayment: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Interest Rate (%)</label>
                  <input
                    type="number"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({...formData, interestRate: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Property Tax</label>
                  <input
                    type="number"
                    value={formData.propertyTax}
                    onChange={(e) => setFormData({...formData, propertyTax: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Insurance</label>
                  <input
                    type="number"
                    value={formData.insurance}
                    onChange={(e) => setFormData({...formData, insurance: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Maintenance</label>
                  <input
                    type="number"
                    value={formData.maintenance}
                    onChange={(e) => setFormData({...formData, maintenance: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Monthly Rental Income</label>
                <input
                  type="number"
                  value={formData.rentalIncome}
                  onChange={(e) => setFormData({...formData, rentalIncome: parseFloat(e.target.value)})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  min="0"
                  placeholder="Leave 0 if not rental"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  rows={3}
                  placeholder="Additional property details"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              className="flex-1 bg-lime-500 text-white px-4 py-2 rounded hover:bg-lime-600"
            >
              Add Property
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
      
      {/* Map Picker Modal */}
      {showMapPicker && <MapPickerModal onClose={() => setShowMapPicker(false)} onSelect={handleMapLocationSelect} />}
    </div>
  );
}

// Keep libraries array as constant to prevent reloading
// Memoize the libraries array to prevent re-initialization
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ['places'];

// Define map container style outside component to prevent recreation
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
  minHeight: '500px',
  touchAction: 'pan-x pan-y',
} as const;

// Google Maps Component - Optimized to reduce re-renders
function GoogleMapComponent({ 
  markerPosition, 
  onMarkerPositionChange 
}: {
  markerPosition: { lat: number; lng: number };
  onMarkerPositionChange: (lat: number, lng: number) => void;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const isUserInteraction = useRef(false);
  const previousPosition = useRef(markerPosition);
  const isDragging = useRef(false);
  const dragStartTime = useRef(0);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const isInitialized = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize map options to prevent recreation on every render
  const mapOptions = React.useMemo<google.maps.MapOptions>(() => ({
    zoom: 15,
    center: markerPosition,
    gestureHandling: 'greedy',
    zoomControl: true,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: false,
    scaleControl: true,
    disableDoubleClickZoom: false,
    scrollwheel: true,
    draggable: true,
    clickableIcons: false,
    // Disable some rendering options for better performance
    disableDefaultUI: false,
    isFractionalZoomEnabled: false,
  }), []); // Empty deps - options don't need to change

  // Initialize map
  const onLoad = useCallback((map: google.maps.Map) => {
    // Prevent duplicate initialization in React Strict Mode
    if (isInitialized.current) {
      // Silently skip duplicate initialization (common in dev mode)
      return;
    }
    isInitialized.current = true;
    console.log('[Google Maps] Initializing map and marker...');
    setMap(map);

    // Use standard Marker for better compatibility
    const newMarker = new google.maps.Marker({
      map: map,
      position: markerPosition,
      draggable: true,
      title: 'Drag to reposition',
      animation: google.maps.Animation.DROP,
    });
    
    // Reduced logging - only log initial creation
    console.log('[Google Maps] Marker created');

    // Handle marker drag events
    google.maps.event.addListener(newMarker, 'dragstart', () => {
      isUserInteraction.current = true;
      isDragging.current = true;
    });
    
    google.maps.event.addListener(newMarker, 'dragend', () => {
      const position = newMarker.getPosition();
      if (position) {
        const newLat = position.lat();
        const newLng = position.lng();
        previousPosition.current = { lat: newLat, lng: newLng };
        onMarkerPositionChange(newLat, newLng);
        setTimeout(() => {
          isUserInteraction.current = false;
          isDragging.current = false;
        }, 100);
      }
    });

    // Track map drag to distinguish from clicks
    google.maps.event.addListener(map, 'dragstart', () => {
      isDragging.current = true;
      dragStartTime.current = Date.now();
    });
    
    google.maps.event.addListener(map, 'dragend', () => {
      // Longer delay to ensure click event doesn't fire after drag
      setTimeout(() => {
        isDragging.current = false;
      }, 250); // Increased from 100ms to 250ms
    });

    // Track mouse down/up for click detection
    google.maps.event.addListener(map, 'mousedown', (e: google.maps.MapMouseEvent) => {
      dragStartTime.current = Date.now();
      if (e.domEvent instanceof MouseEvent) {
        dragStartPos.current = { x: e.domEvent.clientX, y: e.domEvent.clientY };
      }
    });

    // Handle map click to move marker - only if it's a real click, not a drag
    google.maps.event.addListener(map, 'click', (e: google.maps.MapMouseEvent) => {
      // Skip if no coordinates or currently dragging
      if (!e.latLng || isDragging.current) {
        dragStartPos.current = null;
        return;
      }
      
      // Check if this was a quick click (not a drag)
      const clickDuration = Date.now() - dragStartTime.current;
      let wasQuickClick = clickDuration < 300;
      
      // Also check if mouse moved significantly
      if (dragStartPos.current && e.domEvent instanceof MouseEvent) {
        const deltaX = Math.abs(e.domEvent.clientX - dragStartPos.current.x);
        const deltaY = Math.abs(e.domEvent.clientY - dragStartPos.current.y);
        // If moved more than 5 pixels, it's a drag
        if (deltaX > 5 || deltaY > 5) {
          wasQuickClick = false;
        }
      }
      
      // Only move marker on actual clicks, not after panning
      if (wasQuickClick) {
        // Reduced logging for cleaner console
        isUserInteraction.current = true;
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        newMarker.setPosition(e.latLng);
        previousPosition.current = { lat: newLat, lng: newLng };
        onMarkerPositionChange(newLat, newLng);
        setTimeout(() => {
          isUserInteraction.current = false;
        }, 50);
      }
      
      // Reset tracking
      dragStartPos.current = null;
    });

    setMarker(newMarker);
  }, [markerPosition, onMarkerPositionChange]);

  const onUnmount = useCallback(() => {
    console.log('[Google Maps] Unmounting and cleaning up...');
    
    // Clear any pending position updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    
    if (marker) {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    }
    if (map) {
      google.maps.event.clearInstanceListeners(map);
    }
    setMap(null);
    setMarker(null);
    isInitialized.current = false;
  }, [marker, map]);

  // Update marker position when prop changes (from search) - debounced and only on significant changes
  useEffect(() => {
    if (marker && map && !isUserInteraction.current) {
      // Clear any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Check if position actually changed significantly (more than ~100 meters)
      const prevLat = previousPosition.current.lat;
      const prevLng = previousPosition.current.lng;
      const latDiff = Math.abs(markerPosition.lat - prevLat);
      const lngDiff = Math.abs(markerPosition.lng - prevLng);
      
      // Only update on significant position change (0.001 degrees ≈ 111 meters)
      // This prevents jitter from minor floating point differences
      if (latDiff > 0.001 || lngDiff > 0.001) {
        // Debounce the update by 150ms to avoid rapid successive updates
        updateTimeoutRef.current = setTimeout(() => {
          if (marker && map) {
            marker.setPosition(markerPosition);
            map.panTo(markerPosition); // Use panTo instead of setCenter for smoother animation
            previousPosition.current = markerPosition;
          }
        }, 150);
      }
    }
    
    // Cleanup on unmount or dependency change
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [markerPosition, marker, map]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      minHeight: '500px',
      touchAction: 'pan-x pan-y',
      position: 'relative'
    }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* Marker is created programmatically for better control */}
      </GoogleMap>
    </div>
  );
}

// Wrapper using useLoadScript hook - Memoized to prevent re-initialization
const GoogleMapWrapper = React.memo(function GoogleMapWrapper({ 
  markerPosition, 
  onMarkerPositionChange 
}: {
  markerPosition: { lat: number; lng: number };
  onMarkerPositionChange: (lat: number, lng: number) => void;
}) {
  // Get API key from environment variable only
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  
  // Minimal debug logging - only once on mount
  useEffect(() => {
    if (!apiKey) {
      console.warn('[Google Maps] API key missing');
    }
  }, []); // Empty deps - only log once
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    preventGoogleFontsLoading: false,
  });
  
  // Debug and error logging - only when status changes
  useEffect(() => {
    if (loadError) {
      console.error('[Google Maps] Load error:', loadError.message || loadError);
    }
  }, [loadError, isLoaded]);
  
  // Validate API key
  if (!apiKey) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center p-6 max-w-lg">
          <MapPin className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 font-medium text-lg mb-2">Google Maps API Key Missing</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    console.error('Google Maps failed to load:', loadError);
    
    // Determine specific error type
    const errorMsg = loadError.message || loadError.toString() || 'Unknown error';
    const isApiKeyError = errorMsg.includes('ApiNotActivatedMapError') || errorMsg.includes('ApiProjectNotActivated');
    const isBillingError = errorMsg.includes('BILLING') || errorMsg.includes('billing');
    const isRefererError = errorMsg.includes('RefererNotAllowedMapError') || errorMsg.includes('referer');
    
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center p-6 max-w-lg">
          <MapPin className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 font-medium text-lg mb-2">Unable to Load Google Maps</p>
          
          {isApiKeyError && (
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="font-semibold mb-2">⚠️ API Not Activated</p>
              <p className="text-xs">The Maps JavaScript API is not enabled for this project.</p>
              <p className="text-xs mt-2">
                <a 
                  href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  → Enable Maps JavaScript API
                </a>
              </p>
            </div>
          )}
          
          {isBillingError && (
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="font-semibold mb-2">💳 Billing Required</p>
              <p className="text-xs">Google Maps requires billing to be enabled (free tier available).</p>
              <p className="text-xs mt-2">
                <a 
                  href="https://console.cloud.google.com/billing" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  → Set up billing (free $200/month credit)
                </a>
              </p>
            </div>
          )}
          
          {isRefererError && (
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="font-semibold mb-2">🔒 Referrer Restriction</p>
              <p className="text-xs">Add localhost to allowed referrers in API restrictions.</p>
            </div>
          )}
          
          {!isApiKeyError && !isBillingError && !isRefererError && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              The Google Maps API key may be invalid or restricted.
            </p>
          )}
          
          <div className="text-xs text-gray-500 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 p-3 rounded-lg font-mono mb-4 max-h-32 overflow-auto">
            {errorMsg}
          </div>
          
          <div className="text-left text-xs text-gray-600 dark:text-gray-400 space-y-2">
            <p className="font-semibold">Quick Fixes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Enable Maps JavaScript API in Google Cloud Console</li>
              <li>Set up billing (includes free $200/month)</li>
              <li>Add localhost to API key restrictions</li>
              <li>Wait 5 minutes after making changes</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-lime-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading Google Maps...</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Initializing map API...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMapComponent 
      markerPosition={markerPosition}
      onMarkerPositionChange={onMarkerPositionChange}
    />
  );
});

// Dynamic import with SSR disabled
const DynamicGoogleMap = dynamic(() => Promise.resolve(GoogleMapWrapper), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    </div>
  )
});

// Map Picker Component
function MapPickerModal({ 
  onClose, 
  onSelect 
}: { 
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
}) {
  const [markerPosition, setMarkerPosition] = useState({ lat: 30.2672, lng: -97.7431 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { subscription } = useSubscription();
  const planLimits = subscription ? getEffectivePlanLimits(subscription) : PLAN_CONFIG.STARTER;
  const isMapAllowed = planLimits.paid_apis_allowed;

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!isMapAllowed || !searchInputRef.current || typeof google === 'undefined' || !google.maps?.places) {
      return;
    }

    const autocompleteInstance = new google.maps.places.Autocomplete(searchInputRef.current, {
      fields: ['formatted_address', 'geometry', 'name'],
      types: ['address']
    });

    autocompleteInstance.addListener('place_changed', () => {
      const place = autocompleteInstance.getPlace();
      
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMarkerPosition({ lat, lng });
        setSearchQuery(place.formatted_address || place.name || '');
      }
    });

    setAutocomplete(autocompleteInstance);

    return () => {
      if (autocompleteInstance) {
        google.maps.event.clearInstanceListeners(autocompleteInstance);
      }
    };
  }, [isMapAllowed]);

  if (!isMapAllowed) {
    return (
      <div 
        className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" 
        style={{ zIndex: 200000 }}
        onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-white" />
          </button>
          
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Premium Feature
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Map integration and location picking is available on Trader plans and above. Upgrade to access Google Maps features.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Close
            </button>
            <a
              href="/pricing"
              className="flex-1 bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-lime-500/25 flex items-center justify-center"
            >
              Upgrade Now
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Search location (fallback if autocomplete doesn't work)
  const searchLocation = async () => {
    if (!searchQuery) return;
    
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            'User-Agent': 'MoneyHubApp/1.0'
          }
        }
      );
      const data = await response.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setMarkerPosition({ lat, lng });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" 
      style={{ zIndex: 200000 }}
      onMouseDown={(e) => {
        // Only close if clicking the backdrop directly
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden" 
        style={{ position: 'relative', zIndex: 200001 }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pick Location on Map</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-white" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !autocomplete && searchLocation()}
                placeholder="Search for an address or place..."
                className="w-full pl-10 pr-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-lime-500 dark:focus:border-lime-400 focus:ring-4 focus:ring-lime-500/20 transition-all shadow-sm"
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
            <button
              onClick={searchLocation}
              disabled={searching}
              className="px-6 py-3 bg-lime-500 hover:bg-lime-600 disabled:bg-lime-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg min-w-[120px]"
            >
              {searching ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Searching
                </span>
              ) : (
                'Search'
              )}
            </button>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Navigation className="w-4 h-4 mt-0.5 flex-shrink-0 text-lime-500" />
            <p>
              <strong className="text-gray-900 dark:text-white">Tip:</strong> Start typing to see suggestions from Google Places, or click directly on the map to set your location. Drag the 📍 pin to fine-tune.
            </p>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative" style={{ minHeight: '500px' }}>
          <DynamicGoogleMap 
            markerPosition={markerPosition}
            onMarkerPositionChange={(lat: number, lng: number) => setMarkerPosition({ lat, lng })}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-3 text-center">
            <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
              <MapPin className="w-4 h-4 text-lime-500" />
              <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onSelect(markerPosition.lat, markerPosition.lng)}
              className="flex-1 bg-lime-500 hover:bg-lime-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Confirm Location
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditRealEstatePropertyModal({ 
  isOpen, 
  onClose, 
  property, 
  onUpdate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  property: RealEstateProperty | null;
  onUpdate: (property: RealEstateProperty) => Promise<void>;
}) {
  const [formData, setFormData] = useState<RealEstateProperty>({
    id: '',
    address: '',
    propertyType: 'Primary Residence',
    purchasePrice: 0,
    currentValue: 0,
    downPayment: 0,
    loanAmount: 0,
    monthlyPayment: 0,
    interestRate: 0,
    propertyTax: 0,
    insurance: 0,
    maintenance: 0,
    rentalIncome: 0,
    purchaseDate: '',
    notes: '',
    color: '#84cc16',
    city: '',
    state: '',
    zipCode: ''
  });

  React.useEffect(() => {
    if (property) {
      setFormData(property);
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
    onClose();
  };

  if (!isOpen || !property) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000001]" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[800px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit Real Estate Property</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Zip Code</label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Property Type</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({...formData, propertyType: e.target.value})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                >
                  <option value="Primary Residence">Primary Residence</option>
                  <option value="Rental Property">Rental Property</option>
                  <option value="Investment Property">Investment Property</option>
                  <option value="Vacation Home">Vacation Home</option>
                  <option value="Commercial Property">Commercial Property</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Purchase Price</label>
                  <input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({...formData, purchasePrice: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
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
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Down Payment</label>
                  <input
                    type="number"
                    value={formData.downPayment}
                    onChange={(e) => setFormData({...formData, downPayment: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Loan Amount</label>
                  <input
                    type="number"
                    value={formData.loanAmount}
                    onChange={(e) => setFormData({...formData, loanAmount: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Monthly Payment</label>
                  <input
                    type="number"
                    value={formData.monthlyPayment}
                    onChange={(e) => setFormData({...formData, monthlyPayment: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Interest Rate (%)</label>
                  <input
                    type="number"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({...formData, interestRate: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Property Tax</label>
                  <input
                    type="number"
                    value={formData.propertyTax}
                    onChange={(e) => setFormData({...formData, propertyTax: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Insurance</label>
                  <input
                    type="number"
                    value={formData.insurance}
                    onChange={(e) => setFormData({...formData, insurance: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Maintenance</label>
                  <input
                    type="number"
                    value={formData.maintenance}
                    onChange={(e) => setFormData({...formData, maintenance: parseFloat(e.target.value)})}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Monthly Rental Income</label>
                <input
                  type="number"
                  value={formData.rentalIncome}
                  onChange={(e) => setFormData({...formData, rentalIncome: parseFloat(e.target.value)})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-200">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              className="flex-1 bg-lime-500 text-white px-4 py-2 rounded hover:bg-lime-600"
            >
              Update Property
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

function RealEstateModalContent() {
  const [properties, setProperties] = useState<RealEstateProperty[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RealEstateProperty | null>(null);
  const [activeTab, setActiveTab] = useState<'properties' | 'analytics' | 'performance'>('properties');
  const isInitialMount = useRef(true);

  // Load data on component mount
  useEffect(() => {
    const loadProperties = async () => {
      const savedProperties = await SupabaseDataService.getRealEstate([]);
      setProperties(savedProperties);
    };
    loadProperties();
    
    // Listen for data changes from AI or other components
    const handleDataChange = () => loadProperties();
    window.addEventListener('realEstateDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('realEstateDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
    };
  }, []);

  // Data is now saved immediately on each operation (add/update/delete)
  // No need for a separate useEffect that watches all properties changes

  const totalValue = properties.reduce((sum, prop) => sum + prop.currentValue, 0);
  const totalEquity = properties.reduce((sum, prop) => sum + (prop.currentValue - prop.loanAmount), 0);
  const totalAppreciation = properties.reduce((sum, prop) => sum + (prop.currentValue - prop.purchasePrice), 0);
  const monthlyRentalIncome = properties.reduce((sum, prop) => sum + prop.rentalIncome, 0);
  const monthlyExpenses = properties.reduce((sum, prop) => sum + prop.monthlyPayment + (prop.propertyTax + prop.insurance + prop.maintenance) / 12, 0);

  const addProperty = async (propertyData: Omit<RealEstateProperty, 'id'>) => {
    const newProperty: RealEstateProperty = {
      ...propertyData,
      id: crypto.randomUUID()
    };
    // Save to database first
    await SupabaseDataService.saveRealEstate(newProperty);
    setProperties([...properties, newProperty]);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const updateProperty = async (updatedProperty: RealEstateProperty) => {
    await SupabaseDataService.saveRealEstate(updatedProperty);
    setProperties(properties.map(property => 
      property.id === updatedProperty.id ? updatedProperty : property
    ));
    setEditingProperty(null);
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const deleteProperty = async (propertyId: string) => {
    await SupabaseDataService.deleteRealEstate(propertyId);
    setProperties(properties.filter(property => property.id !== propertyId));
    // Notify other components
    window.dispatchEvent(new Event('financialDataChanged'));
  };

  const editProperty = (property: RealEstateProperty) => {
    setEditingProperty(property);
    setShowEditModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Real Estate Portfolio</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Value: ${formatNumber(totalValue)} ({properties.length} properties)
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#212121] text-white rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333] flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b dark:border-gray-700 -mx-6 px-6">
        <div className="flex overflow-x-auto scrollbar-hide w-full">
          {[
            { id: 'properties', label: 'Properties', icon: Building },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'performance', label: 'Performance', icon: Calculator }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 transition-all duration-200 font-medium whitespace-nowrap flex-shrink-0 ${
                activeTab === id
                  ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Properties Tab */}
      {activeTab === 'properties' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ThemedStatBox
              themeColor={CARD_THEME_COLORS.realEstate}
              value={`$${formatNumber(totalValue)}`}
              label="Total Value"
            />
            <ThemedStatBox
              themeColor={CARD_THEME_COLORS.realEstate}
              value={`$${formatNumber(totalEquity)}`}
              label="Total Equity"
            />
            <ConditionalThemedStatBox
              themeColor={CARD_THEME_COLORS.realEstate}
              value={`${totalAppreciation >= 0 ? '+' : ''}$${formatNumber(totalAppreciation)}`}
              label="Appreciation"
              valueType={totalAppreciation >= 0 ? 'positive' : 'negative'}
            />
            <ThemedStatBox
              themeColor={CARD_THEME_COLORS.realEstate}
              value={properties.length}
              label="Properties"
            />
          </div>

          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
            {properties.sort((a, b) => b.currentValue - a.currentValue).map((property) => {
              const equity = property.currentValue - property.loanAmount;
              const appreciation = property.currentValue - property.purchasePrice;
              const appreciationPercent = ((appreciation / property.purchasePrice) * 100);
              const monthlyExpense = property.monthlyPayment + (property.propertyTax + property.insurance + property.maintenance) / 12;
              const cashFlow = property.rentalIncome - monthlyExpense;
              
              // Determine property icon based on type
              const PropertyIcon = property.propertyType === 'Primary Residence' ? Home : 
                                  property.propertyType === 'Rental Property' ? Building : 
                                  property.propertyType === 'Commercial' ? Building : 
                                  property.propertyType === 'Vacation Home' ? Home :
                                  Building;
              
              return (
                <div key={property.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-lime-400 dark:hover:border-lime-500 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: property.color + '20' }}
                    >
                      <PropertyIcon 
                        className="w-5 h-5"
                        style={{ color: property.color }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">{property.address}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {property.propertyType} • Purchased: {new Date(property.purchaseDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">${formatNumber(property.currentValue)}</div>
                      <div className={`text-sm ${appreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {appreciation >= 0 ? '+' : ''}{appreciationPercent.toFixed(2)}%
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editProperty(property)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <Edit3 className="w-4 h-4 text-gray-700 dark:text-cyan-400 dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await deleteProperty(property.id);
                          } catch (error) {
                            console.error('Failed to delete property:', error);
                            alert('Failed to delete property. Please try again.');
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
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Real Estate Analysis</h3>
            <div className="bg-gradient-to-r from-lime-50 to-green-50 dark:from-lime-900/20 dark:to-green-900/20 p-6 rounded-xl">
              <ul className="space-y-3 text-sm text-gray-900 dark:text-white">
                <li>• Monitor cap rates and rental yields in your markets</li>
                <li>• Track property appreciation trends and market cycles</li>
                <li>• Optimize cash flow through strategic improvements</li>
                <li>• Consider refinancing opportunities when rates are favorable</li>
                <li>• Diversify across property types and geographic locations</li>
                <li>• Maintain 3-6 months of expenses for property maintenance</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ThemedContainer themeColor={CARD_THEME_COLORS.realEstate}>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Portfolio Metrics</h4>
              <div className="space-y-3 text-sm text-gray-900 dark:text-white">
                <div className="flex justify-between">
                  <span>Average Cap Rate:</span>
                  <span>{properties.length > 0 ? ((monthlyRentalIncome * 12 / totalValue) * 100).toFixed(2) : 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Loan-to-Value Ratio:</span>
                  <span>{totalValue > 0 ? (((properties.reduce((sum, prop) => sum + prop.loanAmount, 0)) / totalValue) * 100).toFixed(2) : 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Cash Flow:</span>
                  <span className={monthlyRentalIncome - monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${(monthlyRentalIncome - monthlyExpenses).toLocaleString()}
                  </span>
                </div>
              </div>
            </ThemedContainer>

            <ThemedContainer themeColor={CARD_THEME_COLORS.realEstate}>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Color Management</h4>
              <div className="space-y-3">
                {properties.slice(0, 4).map((property, index) => (
                  <div key={property.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white truncate">{property.address.slice(0, 20)}...</span>
                    <input
                      type="color"
                      value={property.color}
                      onChange={(e) => {
                        const updatedProperties = properties.map(p => 
                          p.id === property.id ? { ...p, color: e.target.value } : p
                        );
                        setProperties(updatedProperties);
                      }}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </ThemedContainer>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Market Analysis</h3>
            <MarketAnalysisWidget category="realEstate" />
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Performance Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.realEstate}
                value={`${properties.length > 0 ? ((totalAppreciation / properties.reduce((sum, prop) => sum + prop.purchasePrice, 0)) * 100).toFixed(2) : 0}%`}
                label="Total Return"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.realEstate}
                value={`${properties.length > 0 ? ((monthlyRentalIncome * 12 / totalValue) * 100).toFixed(2) : 0}%`}
                label="Annual Yield"
              />
              <ThemedStatBox
                themeColor={CARD_THEME_COLORS.realEstate}
                value={`${totalEquity > 0 ? ((totalEquity / totalValue) * 100).toFixed(2) : 0}%`}
                label="Equity Ratio"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Property Performance</h3>
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
              {properties.map(property => {
                const equity = property.currentValue - property.loanAmount;
                const appreciation = property.currentValue - property.purchasePrice;
                const appreciationPercent = (appreciation / property.purchasePrice) * 100;
                const annualRentalYield = (property.rentalIncome * 12 / property.currentValue) * 100;
                
                return (
                  <div key={property.id} className="border rounded-lg p-4 transition-all duration-200 hover:shadow-lg hover:shadow-lime-500/50 dark:hover:shadow-lime-500/30 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{property.address}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{property.propertyType}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">${formatNumber(property.currentValue)}</div>
                        <div className={`text-sm ${appreciationPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {appreciationPercent >= 0 ? '+' : ''}{appreciationPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Equity:</span>
                        <div className="font-semibold text-gray-900 dark:text-white">${formatNumber(equity)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Monthly Rent:</span>
                        <div className="font-semibold text-gray-900 dark:text-white">${formatNumber(property.rentalIncome)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Annual Yield:</span>
                        <div className="font-semibold text-gray-900 dark:text-white">{annualRentalYield.toFixed(2)}%</div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Purchase Date:</span>
                        <div className="font-semibold text-gray-900 dark:text-white">{property.purchaseDate}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AddRealEstatePropertyModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAdd={addProperty}
      />
      
      <EditRealEstatePropertyModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        property={editingProperty}
        onUpdate={updateProperty}
      />
    </div>
  );
}

export function RealEstateCard() {
  const [properties, setProperties] = useState<RealEstateProperty[]>([]);
  const { mainCurrency, convert } = useCurrency();

  // Load data on component mount
  useEffect(() => {
    const loadProperties = async () => {
      const savedProperties = await SupabaseDataService.getRealEstate([]);
      setProperties(savedProperties);
    };
    loadProperties();
    
    // Listen for data changes and reload
    const handleDataChange = () => loadProperties();
    window.addEventListener('realEstateDataChanged', handleDataChange);
    window.addEventListener('financialDataChanged', handleDataChange);
    window.addEventListener('currencyChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('realEstateDataChanged', handleDataChange);
      window.removeEventListener('financialDataChanged', handleDataChange);
      window.removeEventListener('currencyChanged', handleDataChange);
    };
  }, []);

  // Calculate dynamic values from saved data (values are stored in USD)
  const totalValueUSD = properties.reduce((sum, prop) => sum + prop.currentValue, 0);
  const totalEquityUSD = properties.reduce((sum, prop) => sum + (prop.currentValue - prop.loanAmount), 0);
  const totalAppreciationUSD = properties.reduce((sum, prop) => sum + (prop.currentValue - prop.purchasePrice), 0);
  const monthlyRentalIncomeUSD = properties.reduce((sum, prop) => sum + prop.rentalIncome, 0);
  const totalPurchasePrice = properties.reduce((sum, prop) => sum + prop.purchasePrice, 0);
  
  // Convert to main currency for display
  const totalValue = convert(totalValueUSD, 'USD', mainCurrency.code);
  const totalEquity = convert(totalEquityUSD, 'USD', mainCurrency.code);
  const totalAppreciation = convert(totalAppreciationUSD, 'USD', mainCurrency.code);
  const monthlyRentalIncome = convert(monthlyRentalIncomeUSD, 'USD', mainCurrency.code);
  
  const appreciationPercentage = totalPurchasePrice > 0 ? 
    ((totalAppreciationUSD / totalPurchasePrice) * 100) : 0;
  
  const changePercent = properties.length === 0 ? "0.0%" : `${appreciationPercentage >= 0 ? '+' : ''}${appreciationPercentage.toFixed(2)}%`;
  const changeType = appreciationPercentage >= 0 ? "positive" as const : "negative" as const;

  // Create chart data from properties - sort by value and show top properties
  const chartData = properties
    .filter(property => property.currentValue && !isNaN(property.currentValue) && isFinite(property.currentValue))
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 12)
    .map(property => ({
      value: property.currentValue,
      change: `+${(((property.currentValue - property.purchasePrice) / property.purchasePrice) * 100).toFixed(2)}%`
    }));

  // Currency conversion - show in user's selected currency
  const displayAmount = `${mainCurrency.symbol}${formatNumber(totalValue)}`;
  const originalAmount = mainCurrency.code !== 'USD' ? `$${formatNumber(totalValueUSD)}` : undefined;

  return (
    <EnhancedFinancialCard
      title="Real Estate"
      description="Property portfolio and real estate investments"
      amount={displayAmount}
      change={changePercent}
      changeType={changeType}
      mainColor="#14b8a6"
      secondaryColor="#2dd4bf"
      gridColor="#14b8a615"
      stats={[
        { label: "Equity", value: `${mainCurrency.symbol}${formatNumber(totalEquity)}`, color: "#84cc16" },
        { label: "Rental Income", value: `${mainCurrency.symbol}${formatNumber(monthlyRentalIncome)}/mo`, color: "#a3e635" }
      ]}
      icon={Building}
      hoverContent={<RealEstateHoverContent />}
      modalContent={<RealEstateModalContent />}
      chartData={chartData}
      convertedAmount={originalAmount}
      sourceCurrency={mainCurrency.code}
    />
  );
}
