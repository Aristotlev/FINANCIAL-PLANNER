# Google Maps Location Picker Component

A fully functional, responsive Google Maps location picker modal for Next.js applications with TypeScript support.

## Features

✅ **Interactive Map** - Click anywhere to set location  
✅ **Draggable Marker** - Fine-tune your selection  
✅ **Address Search** - Autocomplete with Google Places  
✅ **Current Location** - Get user's GPS coordinates  
✅ **Responsive Design** - Works on all screen sizes  
✅ **Dark Mode Support** - Automatic theme detection  
✅ **Coordinate Display** - Shows lat/lng in real-time  

## Setup Instructions

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
4. Create credentials → API Key
5. (Optional) Restrict your API key:
   - Application restrictions: HTTP referrers
   - API restrictions: Enable only the 3 APIs above

### 2. Add API Key to Environment Variables

Create or update `.env.local` in your project root:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Important:** The `NEXT_PUBLIC_` prefix is required for client-side access in Next.js.

### 3. Restart Development Server

```bash
npm run dev
```

## Usage

### Basic Example

```tsx
import { useState } from "react";
import { MapLocationPicker } from "@/components/ui/map-location-picker";

export default function MyComponent() {
  const [showMap, setShowMap] = useState(false);
  const [location, setLocation] = useState({ lat: 30.2672, lng: -97.7431 });

  const handleConfirm = (newLocation) => {
    setLocation(newLocation);
    console.log("Selected:", newLocation);
  };

  return (
    <>
      <button onClick={() => setShowMap(true)}>
        Pick Location
      </button>

      <MapLocationPicker
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onConfirm={handleConfirm}
        initialLocation={location}
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
      />
    </>
  );
}
```

### With Form Integration

```tsx
import { MapLocationPicker } from "@/components/ui/map-location-picker";

export default function AddressForm() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    lat: null,
    lng: null
  });
  const [showMap, setShowMap] = useState(false);

  const handleLocationConfirm = (location) => {
    setFormData({
      ...formData,
      lat: location.lat,
      lng: location.lng,
      address: location.address || ""
    });
  };

  return (
    <form>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="Location name"
      />
      
      <input
        type="text"
        value={formData.address}
        readOnly
        placeholder="Click to pick location"
        onClick={() => setShowMap(true)}
      />

      {formData.lat && formData.lng && (
        <p>Coordinates: {formData.lat}, {formData.lng}</p>
      )}

      <MapLocationPicker
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onConfirm={handleLocationConfirm}
        initialLocation={
          formData.lat && formData.lng 
            ? { lat: formData.lat, lng: formData.lng }
            : { lat: 30.2672, lng: -97.7431 }
        }
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
      />
    </form>
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | boolean | Yes | - | Controls modal visibility |
| `onClose` | () => void | Yes | - | Called when modal is closed |
| `onConfirm` | (location) => void | Yes | - | Called with selected location |
| `initialLocation` | { lat: number, lng: number } | No | Austin, TX | Starting map position |
| `apiKey` | string | Yes | - | Google Maps API key |

### Location Object Structure

```typescript
{
  lat: number;      // Latitude
  lng: number;      // Longitude
  address?: string; // Optional address (if searched)
}
```

## Features in Detail

### 🔍 Address Search
- Type any address or place name
- Autocomplete suggestions from Google Places
- Press Enter or click "Search" button

### 📍 Current Location
- Click the navigation button (📍)
- Browser will request location permission
- Map automatically centers on your position

### 🖱️ Interactive Map
- Click anywhere to set marker
- Drag marker to fine-tune position
- Zoom in/out with controls
- Pan around the map

### 📋 Coordinates Display
- Real-time lat/lng updates
- 6 decimal places precision
- Easy to copy coordinates

## Styling

The component uses Tailwind CSS classes and supports:
- Light/Dark mode automatically
- Responsive breakpoints
- Custom color scheme (Lime green primary)

To customize colors, search and replace in the component:
- `lime-500` → your primary color
- `lime-600` → your primary hover color

## Troubleshooting

### Map doesn't load
1. Check API key is correct in `.env.local`
2. Verify APIs are enabled in Google Cloud Console
3. Check browser console for errors
4. Ensure `.env.local` changes require server restart

### "This page can't load Google Maps correctly"
- API key might be restricted
- Billing not enabled on Google Cloud project
- API quotas exceeded

### Autocomplete not working
- Ensure Places API is enabled
- Check API key restrictions
- Clear browser cache

### Location permission denied
- User must allow location access in browser
- HTTPS required for geolocation (works on localhost)

## Dependencies

```json
{
  "@react-google-maps/api": "^2.20.7",
  "@types/google.maps": "^3.58.1",
  "lucide-react": "^0.436.0"
}
```

All already installed in your project! ✅

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support (requires HTTPS)

## Cost Considerations

Google Maps APIs have free tier quotas:
- **Maps JavaScript API**: $200/month free credit
- **Places API**: First 1,000 requests/month free
- **Geocoding API**: First 40,000 requests/month free

For most applications, you'll stay within free tier limits.

## Security Best Practices

1. **Restrict your API key** in Google Cloud Console
2. **Never commit** `.env.local` to version control
3. **Use HTTP referrer restrictions** in production
4. **Monitor usage** in Google Cloud Console

## License

MIT - Use freely in your projects!

## Support

For issues or questions:
1. Check Google Maps API documentation
2. Review browser console errors
3. Verify environment variables
4. Test with a fresh API key

---

**Happy mapping! 🗺️**
