"use client";

import React, { useState } from "react";
import { MapPin } from "lucide-react";
import { MapLocationPicker } from "./map-location-picker";

/**
 * Example usage of MapLocationPicker component
 * 
 * Before using:
 * 1. Get a Google Maps API key from: https://console.cloud.google.com/
 * 2. Enable the following APIs:
 *    - Maps JavaScript API
 *    - Places API
 *    - Geocoding API
 * 3. Add to your .env.local file:
 *    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
 */

export function MapLocationPickerExample() {
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);

  const handleConfirmLocation = (location: { lat: number; lng: number; address?: string }) => {
    setSelectedLocation(location);
    console.log("Selected location:", location);
  };

  // Get the API key from environment variables
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  if (!apiKey) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-2">
          Google Maps API Key Required
        </h3>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
          To use the map location picker, you need to:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
          <li>Get a Google Maps API key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
          <li>Enable: Maps JavaScript API, Places API, and Geocoding API</li>
          <li>Create a <code className="bg-yellow-200 dark:bg-yellow-800 px-1 py-0.5 rounded">.env.local</code> file in your project root</li>
          <li>Add: <code className="bg-yellow-200 dark:bg-yellow-800 px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here</code></li>
          <li>Restart your development server</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowMapPicker(true)}
        className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-600 text-white rounded-lg font-semibold transition-colors"
      >
        <MapPin className="w-5 h-5" />
        Pick Location on Map
      </button>

      {selectedLocation && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            Selected Location:
          </h4>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <p>Latitude: {selectedLocation.lat.toFixed(6)}</p>
            <p>Longitude: {selectedLocation.lng.toFixed(6)}</p>
            {selectedLocation.address && (
              <p>Address: {selectedLocation.address}</p>
            )}
          </div>
        </div>
      )}

      <MapLocationPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleConfirmLocation}
        initialLocation={selectedLocation || { lat: 30.2672, lng: -97.7431 }}
        apiKey={apiKey}
      />
    </div>
  );
}
