"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { 
  MapPin,
  X,
  Navigation,
  Map,
  Lock
} from "lucide-react";
import { useSubscription, useAdminStatus } from "@/hooks/use-subscription";
import { PLAN_CONFIG, getEffectivePlanLimits } from "@/types/subscription";

export interface RealEstateProperty {
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

// Keep libraries array as constant to prevent reloading
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ['places'];

// Define map container style outside component to prevent recreation
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
  minHeight: '500px',
  touchAction: 'pan-x pan-y',
} as const;

// Google Maps Component
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
  const isInitialized = useRef(false);

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
  }), []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const onLoad = React.useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    
    const newMarker = new google.maps.Marker({
      position: markerPosition,
      map: mapInstance,
      draggable: true,
      animation: google.maps.Animation.DROP,
      title: 'Property Location'
    });
    
    newMarker.addListener('dragstart', () => {
      isDragging.current = true;
      isUserInteraction.current = true;
    });
    
    newMarker.addListener('dragend', () => {
      const pos = newMarker.getPosition();
      if (pos) {
        const lat = pos.lat();
        const lng = pos.lng();
        previousPosition.current = { lat, lng };
        onMarkerPositionChange(lat, lng);
      }
      isDragging.current = false;
      setTimeout(() => {
        isUserInteraction.current = false;
      }, 100);
    });
    
    setMarker(newMarker);
    isInitialized.current = true;
  }, [markerPosition, onMarkerPositionChange]);

  const onUnmount = React.useCallback(() => {
    if (marker) {
      marker.setMap(null);
    }
    setMap(null);
    setMarker(null);
    isInitialized.current = false;
  }, [marker]);

  React.useEffect(() => {
    if (!map || !marker || !isInitialized.current) return;
    
    if (isDragging.current || isUserInteraction.current) return;
    
    const posChanged = 
      Math.abs(markerPosition.lat - previousPosition.current.lat) > 0.0001 ||
      Math.abs(markerPosition.lng - previousPosition.current.lng) > 0.0001;
    
    if (posChanged) {
      previousPosition.current = markerPosition;
      marker.setPosition(markerPosition);
      map.panTo(markerPosition);
    }
  }, [map, marker, markerPosition]);

  const handleMapClick = React.useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && marker) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      isUserInteraction.current = true;
      previousPosition.current = { lat, lng };
      marker.setPosition(e.latLng);
      onMarkerPositionChange(lat, lng);
      setTimeout(() => {
        isUserInteraction.current = false;
      }, 100);
    }
  }, [marker, onMarkerPositionChange]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
        <p className="text-red-500">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
        <div className="animate-spin h-8 w-8 border-4 border-lime-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
    />
  );
}

// Dynamic import for Google Maps
const DynamicGoogleMap = dynamic(
  () => Promise.resolve(GoogleMapComponent),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
        <div className="animate-spin h-8 w-8 border-4 border-lime-500 border-t-transparent rounded-full mr-3"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    )
  }
);

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
  const { isAdmin } = useAdminStatus();
  const planLimits = subscription ? getEffectivePlanLimits(subscription) : PLAN_CONFIG.STARTER;
  const isMapAllowed = planLimits.paid_apis_allowed || isAdmin;

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
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pick Location on Map</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-white" />
          </button>
        </div>

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

        <div className="flex-1 relative" style={{ minHeight: '500px' }}>
          <DynamicGoogleMap 
            markerPosition={markerPosition}
            onMarkerPositionChange={(lat: number, lng: number) => setMarkerPosition({ lat, lng })}
          />
        </div>

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

export function AddPropertyModal({ 
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

  const handleMapLocationSelect = async (lat: number, lng: number) => {
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
      setFormData({
        ...formData,
        coordinates: { lat, lng }
      });
      setShowMapPicker(false);
    }
  };

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
              className="flex items-center justify-center gap-2 flex-1 bg-[#212121] text-white px-4 py-2 rounded-lg border border-[#212121] transition-all duration-200 active:scale-95 hover:bg-[#333]"
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
      
      {showMapPicker && <MapPickerModal onClose={() => setShowMapPicker(false)} onSelect={handleMapLocationSelect} />}
    </div>
  );
}
