"use client";

import React from "react";
import { MapLocationPickerExample } from "@/components/ui/map-location-picker-example";

export default function MapTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Google Maps Location Picker
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Test the interactive map location picker component
          </p>

          <MapLocationPickerExample />

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              🚀 Quick Start
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Get API key from Google Cloud Console</li>
              <li>Enable: Maps JavaScript API, Places API, Geocoding API</li>
              <li>Add to .env.local: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code></li>
              <li>Restart dev server with <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">npm run dev</code></li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              📚 Documentation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Full documentation available at:{" "}
              <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                components/ui/MAP_LOCATION_PICKER_README.md
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
