import React, { useState, useMemo, useEffect } from "react";
import { Coins } from "lucide-react";

// Generate a consistent color based on symbol
const getCryptoColor = (symbol: string): string => {
  const colors = [
    'from-orange-500 to-orange-700',
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
    'from-green-500 to-green-700',
    'from-pink-500 to-pink-700',
    'from-cyan-500 to-cyan-700',
    'from-yellow-500 to-yellow-700',
    'from-red-500 to-red-700',
  ];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Crypto Icon Component - Dynamic icon fetching with multiple fallbacks
export function CryptoIcon({ symbol, className = "w-5 h-5", iconUrl }: { symbol: string; className?: string; iconUrl?: string }) {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  
  if (!symbol) return <Coins className={className} />;
  
  const upperSymbol = symbol.toUpperCase();
  const lowerSymbol = symbol.toLowerCase();
  
  // Build list of image sources to try (most reliable first)
  const imageSources = useMemo(() => {
    const sources: string[] = [];
    
    // 0. If iconUrl is provided (e.g., from CoinGecko API), try it first
    if (iconUrl) {
      sources.push(iconUrl);
    }
    
    // 1. CoinCap - Very reliable and comprehensive
    sources.push(`https://assets.coincap.io/assets/icons/${lowerSymbol}@2x.png`);
    
    // 2. CryptoCompare - Another reliable source
    sources.push(`https://www.cryptocompare.com/media/37746251/${lowerSymbol}.png`);
    
    // 3. CoinGecko small images (works well)
    sources.push(`https://assets.coingecko.com/coins/images/1/small/${lowerSymbol}.png`);
    
    // 4. Binance static CDN (for trading pairs)
    sources.push(`https://bin.bnbstatic.com/image/admin_mgs_image_upload/20201110/${lowerSymbol}.png`);
    
    // 5. Trust Wallet GitHub assets
    sources.push(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${lowerSymbol}.png`);
    
    return sources;
  }, [upperSymbol, lowerSymbol, iconUrl]);
  
  useEffect(() => {
    setImageError(false);
    setFallbackIndex(0);
  }, [symbol]);
  
  const handleImageError = () => {
    if (fallbackIndex < imageSources.length - 1) {
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };
  
  if (!imageError && imageSources.length > 0) {
    return (
      <img 
        src={imageSources[fallbackIndex]}
        alt={`${symbol} logo`}
        className={`${className} rounded-full object-contain`}
        onError={handleImageError}
        loading="lazy"
      />
    );
  }

  // Final fallback: colorful gradient placeholder
  return (
    <div className={`${className} rounded-full bg-gradient-to-br ${getCryptoColor(symbol)} flex items-center justify-center font-bold text-white shadow-lg text-xs`}>
      {symbol.slice(0, 2)}
    </div>
  );
}
