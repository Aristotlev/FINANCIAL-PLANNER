"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, MapPin, Search, Navigation, Lock } from "lucide-react";
import { GoogleMap, LoadScript, Marker, Autocomplete } from "@react-google-maps/api";
import { useSubscription, useAdminStatus } from "@/hooks/use-subscription";
import { PLAN_CONFIG, getEffectivePlanLimits } from "@/types/subscription";

const libraries: ("places" | "geometry" | "drawing")[] = ["places"];

interface MapLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (location: { lat: number; lng: number; address?: string }) => void;
  initialLocation?: { lat: number; lng: number };
  apiKey: string;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "500px"
};

const defaultCenter = {
  lat: 30.2672,
  lng: -97.7431
};

export function MapLocationPicker({
  isOpen,
  onClose,
  onConfirm,
  initialLocation = defaultCenter,
  apiKey
}: MapLocationPickerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [searchInput, setSearchInput] = useState("");
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { subscription } = useSubscription();
  const { isAdmin } = useAdminStatus();
  const planLimits = subscription ? getEffectivePlanLimits(subscription) : PLAN_CONFIG.STARTER;
  const isMapAllowed = planLimits.paid_apis_allowed || isAdmin;

  useEffect(() => {
    if (isOpen) {
      setSelectedLocation(initialLocation);
    }
  }, [isOpen, initialLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const newLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setSelectedLocation(newLocation);
        map?.panTo(newLocation);
        map?.setZoom(15);
      }
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSelectedLocation({
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      });
    }
  };

  const handleSearchClick = () => {
    if (searchInput.trim()) {
      setIsSearching(true);
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: searchInput }, (results, status) => {
        setIsSearching(false);
        if (status === "OK" && results && results[0]) {
          const location = results[0].geometry.location;
          const newLocation = {
            lat: location.lat(),
            lng: location.lng()
          };
          setSelectedLocation(newLocation);
          map?.panTo(newLocation);
          map?.setZoom(15);
        } else {
          alert("Location not found. Please try a different search term.");
        }
      });
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setSelectedLocation(newLocation);
          map?.panTo(newLocation);
          map?.setZoom(15);
        },
        (error) => {
          console.error("Error getting current location:", error);
          alert("Unable to get your current location. Please check your browser settings.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedLocation);
    onClose();
  };

  if (!isOpen) return null;

  if (!isMapAllowed) {
    return (
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200001] p-4"
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

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200001] p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Pick Location on Map
            </h3>
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
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearchClick()}
                    placeholder="Search for an address or place..."
                    className="w-full pl-10 pr-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-lime-500 dark:focus:border-lime-400 focus:ring-4 focus:ring-lime-500/20 transition-all shadow-sm"
                  />
                </Autocomplete>
              </div>
              <button
                onClick={handleSearchClick}
                disabled={isSearching}
                className="px-6 py-3 bg-lime-500 hover:bg-lime-600 disabled:bg-lime-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg min-w-[120px]"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
              <button
                onClick={handleGetCurrentLocation}
                className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                title="Use my current location"
              >
                <Navigation className="w-5 h-5" />
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
          <div className="flex-1 relative" style={{ minHeight: "500px" }}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={selectedLocation}
              zoom={15}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onClick={handleMapClick}
              options={{
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: false,
                zoomControl: true
              }}
            >
              <Marker
                position={selectedLocation}
                draggable={true}
                onDragEnd={(e) => {
                  if (e.latLng) {
                    setSelectedLocation({
                      lat: e.latLng.lat(),
                      lng: e.latLng.lng()
                    });
                  }
                }}
              />
            </GoogleMap>
          </div>

          {/* Footer with Coordinates and Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="mb-3 text-center">
              <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
                <MapPin className="w-4 h-4 text-lime-500" />
                <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
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
    </LoadScript>
  );
}
