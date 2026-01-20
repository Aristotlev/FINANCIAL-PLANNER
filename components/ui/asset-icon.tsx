import React, { useState, useMemo, useEffect } from "react";
import { Coins, Globe, TrendingUp, Droplets, Gem, Factory, Wheat } from "lucide-react";
import { CryptoIcon } from "./crypto-icon";
import { tickerDomains } from "@/lib/ticker-domains";
import { getCountryCodeFromCurrency } from "@/lib/currency-flags";

// Generate a consistent color based on symbol
export const getAssetColor = (symbol: string): string => {
  const colors = [
    'from-amber-500 to-amber-700',
    'from-orange-500 to-orange-700',
    'from-yellow-500 to-yellow-700',
    'from-red-500 to-red-700',
    'from-pink-500 to-pink-700',
    'from-purple-500 to-purple-700',
    'from-blue-500 to-blue-700',
    'from-cyan-500 to-cyan-700',
    'from-teal-500 to-teal-700',
    'from-indigo-500 to-indigo-700',
  ];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

type AssetType = 'stock' | 'crypto' | 'forex' | 'etf' | 'index' | 'commodity';

interface AssetIconProps {
  symbol: string;
  type?: AssetType;
  className?: string;
  website?: string;
  iconUrl?: string; // For explicit overrides or crypto
  showPlaceholder?: boolean;
}

// Special mapping for common commodities to Lucide icons
const COMMODITY_ICONS: Record<string, React.ElementType> = {
  'GC': Gem,     // Gold
  'SI': Gem,     // Silver
  'PL': Gem,     // Platinum
  'PA': Gem,     // Palladium
  'CL': Droplets, // Crude Oil
  'BRN': Droplets,// Brent Crude
  'NG': Droplets, // Natural Gas
  'RB': Droplets, // Gasoline
  'HO': Droplets, // Heating Oil
  'HG': Factory,  // Copper
  'ALI': Factory, // Aluminum
  'ZC': Wheat,    // Corn
  'ZS': Wheat,    // Soybean
  'ZW': Wheat,    // Wheat
  'KC': Wheat,    // Coffee
  'SB': Wheat,    // Sugar
  'CC': Wheat,    // Cocoa
  'CT': Wheat,    // Cotton
};

// Helper to get currency code from forex pair symbol (e.g., EURUSD -> EUR, USD)
const parseForexPair = (symbol: string): [string, string] | null => {
    if (symbol.length !== 6) return null; // Standard pairs are 6 chars usually
    return [symbol.substring(0, 3), symbol.substring(3, 6)];
};

// Helper to determine ETF issuer domain from symbol
function getEtfIssuerDomain(symbol: string): string | null {
    const s = symbol.toUpperCase();
    
    // SPDR (State Street) - SPY, GLD, XL* (Sectors)
    if (['SPY', 'GLD', 'MDY', 'JNK', 'DIA'].includes(s) || s.startsWith('XL') || s.startsWith('SPY')) {
        return 'ssga.com';
    }
    
    // Vanguard - V* (VOO, VTI, etc), BND*
    if ((s.startsWith('V') && s.length === 3) || ['BND', 'BNDX', 'BSV', 'BLV'].includes(s)) {
        return 'investor.vanguard.com';
    }
    
    // iShares (BlackRock) - I* (IVV, IWM), EEM, EFA, AGG, TLT, SLV
    if ((s.startsWith('I') && s !== 'INTC' && s !== 'IBM') || // Exclude common stocks starting with I if they leak in
        ['EEM', 'EFA', 'AGG', 'TLT', 'SLV', 'IAU', 'ACWI', 'GOVT', 'HYG', 'LQD', 'MUB', 'PFF'].includes(s)) {
        return 'ishares.com';
    }
    
    // Invesco - QQQ, QQQM, RSP
    if (['QQQ', 'QQQM', 'RSP', 'SPLV', 'SPHD', 'PGX'].includes(s)) {
        return 'invesco.com'; 
    }
    
    // ARK Invest
    if (s.startsWith('ARK')) {
        return 'ark-funds.com';
    }
    
    // Charles Schwab
    if (s.startsWith('SCH')) {
        return 'schwab.com';
    }
    
    // ProShares (Leveraged/Inverse)
    if (['TQQQ', 'SQQQ', 'SSO', 'SDS', 'UPRO', 'SPXU'].includes(s)) {
        return 'proshares.com';
    }

    return null;
}

// Component for displaying a single Stock/ETF/Index/Company icon
function CompanyOrIndexIcon({ symbol, className, website, type }: AssetIconProps) {
    const [imageError, setImageError] = useState(false);
    const [fallbackIndex, setFallbackIndex] = useState(0);
    const upperTicker = symbol.toUpperCase();

    // If it's an index, try to determine country from currency or explicit mapping
    // But often indices symbols like SPX, DJI don't map directly to a country code easily without a map.
    // However, we can try some common ones.
    const isIndex = type === 'index';
    
    // Build list of image sources
    const imageSources = useMemo(() => {
        const sources: string[] = [];
        
        // 1. If website is provided, try that first
        if (website) {
            const domain = website.startsWith('http') ? website : `http://${website}`;
            sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${domain}&size=128`);
        }

        // 2. Known domain from our mapping
        if (tickerDomains[upperTicker]) {
            sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${tickerDomains[upperTicker]}&size=128`);
        }
        
        // 3. ETF Specific Logic
        if (type === 'etf') {
            const etfDomain = getEtfIssuerDomain(upperTicker);
            if (etfDomain) {
                sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${etfDomain}&size=128`);
            }
        }

        // 4. For indices, try to use TradingView logos if possible, or country flags
        if (isIndex) {
             // Heuristic for some indices
             if (['SPX', 'DJI', 'NDX', 'RUT', 'VIX', 'DXY'].includes(upperTicker)) {
                 sources.push(`https://flagcdn.com/w80/us.png`);
             } else if (upperTicker === 'UKX' || upperTicker === 'FTSE') {
                 sources.push(`https://flagcdn.com/w80/gb.png`);
             } else if (upperTicker === 'DAX') {
                 sources.push(`https://flagcdn.com/w80/de.png`);
             } else if (upperTicker === 'CAC') {
                 sources.push(`https://flagcdn.com/w80/fr.png`);
             } else if (upperTicker === 'STOXX50E' || upperTicker === 'SX5E') {
                 sources.push(`https://flagcdn.com/w80/eu.png`);
             } else if (upperTicker === 'NKY' || upperTicker === 'NI225') {
                 sources.push(`https://flagcdn.com/w80/jp.png`);
             } else if (upperTicker === 'HSI') {
                 sources.push(`https://flagcdn.com/w80/hk.png`);
             } else if (upperTicker === 'SHCOMP' || upperTicker === 'SSEC') {
                 sources.push(`https://flagcdn.com/w80/cn.png`);
             }
        }
        
        // 4. Try logo.dev API
        if (!isIndex) {
            sources.push(`https://img.logo.dev/ticker/${upperTicker}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`);
            // 5. Try common domain patterns
            sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${symbol.toLowerCase()}.com&size=128`);
        }
        
        return sources;
    }, [upperTicker, symbol, website, isIndex]);
  
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
                className={`${className} rounded-lg object-contain bg-white/10 p-0.5`}
                onError={handleImageError}
                loading="lazy"
            />
        );
    }
    
    // Fallback for Index/Company
    return (
        <div className={`${className} rounded-lg bg-gradient-to-br ${getAssetColor(symbol)} flex items-center justify-center font-bold text-white shadow-lg text-xs`}>
            {symbol.slice(0, 2)}
        </div>
    );
}

// Main Asset Icon Component
export function AssetIcon({ symbol, type = 'stock', className = "w-6 h-6", website, iconUrl }: AssetIconProps) {
    // 1. Crypto - Delegate to CryptoIcon
    if (type === 'crypto') {
        return <CryptoIcon symbol={symbol} className={className} iconUrl={iconUrl} />;
    }

    // 2. Forex - Double Flag
    if (type === 'forex') {
        const currencies = parseForexPair(symbol);
        if (currencies) {
            const [base, quote] = currencies;
            const baseFlag = getCountryCodeFromCurrency(base);
            const quoteFlag = getCountryCodeFromCurrency(quote);
            
            if (baseFlag && quoteFlag) {
                // Determine size for the two bubbles
                // Assuming className="w-6 h-6" -> 24px.
                // We want two smaller circles overlapping.
                // We can't easily parse className to get px size, so we'll use relative sizing container.
                return (
                    <div className={`${className} relative flex items-center justify-center`}>
                        <img 
                            src={`https://flagcdn.com/w40/${baseFlag}.png`} 
                            alt={base}
                            className="absolute left-0 top-0 w-[70%] h-[70%] rounded-full object-cover border border-gray-800 z-10"
                        />
                        <img 
                            src={`https://flagcdn.com/w40/${quoteFlag}.png`} 
                            alt={quote}
                            className="absolute right-0 bottom-0 w-[70%] h-[70%] rounded-full object-cover border border-gray-800"
                        />
                    </div>
                );
            }
        }
        // Fallback for forex if parsing fails
        return (
            <div className={`${className} rounded-full bg-blue-600 flex items-center justify-center`}>
                <Globe className="w-1/2 h-1/2 text-white" />
            </div>
        );
    }

    // 3. Commodity - Icon or specific
    if (type === 'commodity') {
        // Check if we have a mapped icon
        const Icon = COMMODITY_ICONS[symbol.toUpperCase()];
        if (Icon) {
            return (
                 <div className={`${className} rounded-lg bg-gradient-to-br ${getAssetColor(symbol)} flex items-center justify-center`}>
                    <Icon className="w-1/2 h-1/2 text-white" />
                </div>
            );
        }
        // Fallback to generic commodity icon logic (or CompanyIcon with limited sources)
         return (
            <div className={`${className} rounded-lg bg-gradient-to-br ${getAssetColor(symbol)} flex items-center justify-center font-bold text-white shadow-lg text-xs`}>
                {symbol.slice(0, 2)}
            </div>
        );
    }
    
    // 4. Stock / ETF / Index
    return <CompanyOrIndexIcon symbol={symbol} type={type} className={className} website={website} />;
}
