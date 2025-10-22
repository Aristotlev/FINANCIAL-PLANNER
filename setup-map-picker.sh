#!/bin/bash

# Google Maps Location Picker - Quick Setup Script
# Run this to check your setup and create necessary files

echo "🗺️  Google Maps Location Picker - Setup Check"
echo "=============================================="
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local file found"
    
    # Check if API key is set
    if grep -q "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" .env.local; then
        echo "✅ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set"
        
        # Check if it's not empty
        if grep -q "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza" .env.local; then
            echo "✅ API key appears to be valid (starts with AIza)"
        else
            echo "⚠️  API key might be empty or invalid"
        fi
    else
        echo "❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not found"
        echo ""
        echo "Adding template to .env.local..."
        echo "" >> .env.local
        echo "# Google Maps API Configuration" >> .env.local
        echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here" >> .env.local
        echo "✅ Template added. Please update with your actual API key."
    fi
else
    echo "❌ .env.local file not found"
    echo ""
    echo "Creating .env.local file..."
    cat > .env.local << 'EOF'
# Google Maps API Configuration
# Get your API key from: https://console.cloud.google.com/
# Enable: Maps JavaScript API, Places API, Geocoding API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
EOF
    echo "✅ .env.local created. Please add your Google Maps API key."
fi

echo ""
echo "📦 Checking dependencies..."

# Check if package.json has required dependencies
if grep -q "@react-google-maps/api" package.json; then
    echo "✅ @react-google-maps/api is installed"
else
    echo "❌ @react-google-maps/api not found"
    echo "   Run: npm install @react-google-maps/api"
fi

if grep -q "@types/google.maps" package.json; then
    echo "✅ @types/google.maps is installed"
else
    echo "❌ @types/google.maps not found"
    echo "   Run: npm install --save-dev @types/google.maps"
fi

echo ""
echo "📁 Checking component files..."

if [ -f "components/ui/map-location-picker.tsx" ]; then
    echo "✅ map-location-picker.tsx exists"
else
    echo "❌ map-location-picker.tsx not found"
fi

if [ -f "components/ui/map-location-picker-example.tsx" ]; then
    echo "✅ map-location-picker-example.tsx exists"
else
    echo "⚠️  Example file not found (optional)"
fi

echo ""
echo "📚 Next Steps:"
echo "============="
echo ""
echo "1. Get Google Maps API Key:"
echo "   → https://console.cloud.google.com/"
echo ""
echo "2. Enable Required APIs:"
echo "   ✓ Maps JavaScript API"
echo "   ✓ Places API"
echo "   ✓ Geocoding API"
echo ""
echo "3. Add API Key to .env.local:"
echo "   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
echo ""
echo "4. Restart Development Server:"
echo "   npm run dev"
echo ""
echo "5. Test the Component:"
echo "   Import and use MapLocationPicker in your component"
echo ""
echo "📖 For detailed documentation, see:"
echo "   components/ui/MAP_LOCATION_PICKER_README.md"
echo ""
