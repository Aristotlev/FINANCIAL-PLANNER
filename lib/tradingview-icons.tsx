// TradingView-style SVG icon components
// These match the exact visual style used on TradingView platform

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Stock Exchange Icons (TradingView style)
export const NASDAQIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#00A3DA"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Q</text>
  </svg>
);

export const NYSEIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#11609E"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">NYSE</text>
  </svg>
);

// Forex Currency Icons (TradingView style - circular with currency symbol)
export const USDIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#2E7D32"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">$</text>
  </svg>
);

export const EURIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#003399"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">€</text>
  </svg>
);

export const GBPIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#C8102E"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">£</text>
  </svg>
);

export const JPYIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#BC002D"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">¥</text>
  </svg>
);

export const CHFIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#FF0000"/>
    <rect x="10" y="7" width="4" height="10" fill="white"/>
    <rect x="7" y="10" width="10" height="4" fill="white"/>
  </svg>
);

export const AUDIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#012169"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A$</text>
  </svg>
);

export const CADIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#FF0000"/>
    <path d="M12 7L13 11L12 15L11 11L12 7Z" fill="white"/>
  </svg>
);

export const NZDIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#00247D"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">NZ$</text>
  </svg>
);

// Forex Pair Icons (TradingView style - dual currency display)
export const EURUSDIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="12" height="24" fill="#003399"/>
    <rect x="12" width="12" height="24" fill="#2E7D32"/>
    <text x="6" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">€</text>
    <text x="18" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">$</text>
  </svg>
);

export const GBPUSDIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="12" height="24" fill="#C8102E"/>
    <rect x="12" width="12" height="24" fill="#2E7D32"/>
    <text x="6" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">£</text>
    <text x="18" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">$</text>
  </svg>
);

export const USDJPYIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="12" height="24" fill="#2E7D32"/>
    <rect x="12" width="12" height="24" fill="#BC002D"/>
    <text x="6" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">$</text>
    <text x="18" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">¥</text>
  </svg>
);

export const USDCHFIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="12" height="24" fill="#2E7D32"/>
    <rect x="12" width="12" height="24" fill="#FF0000"/>
    <text x="6" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">$</text>
    <text x="18" y="10" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">CHF</text>
  </svg>
);

export const AUDUSDIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="12" height="24" fill="#012169"/>
    <rect x="12" width="12" height="24" fill="#2E7D32"/>
    <text x="6" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">A$</text>
    <text x="18" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">$</text>
  </svg>
);

export const USDCADIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="12" height="24" fill="#2E7D32"/>
    <rect x="12" width="12" height="24" fill="#FF0000"/>
    <text x="6" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">$</text>
    <text x="18" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">C$</text>
  </svg>
);

export const NZDUSDIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="12" height="24" fill="#00247D"/>
    <rect x="12" width="12" height="24" fill="#2E7D32"/>
    <text x="6" y="10" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">NZ$</text>
    <text x="18" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">$</text>
  </svg>
);

export const EURGBPIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="12" height="24" fill="#003399"/>
    <rect x="12" width="12" height="24" fill="#C8102E"/>
    <text x="6" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">€</text>
    <text x="18" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">£</text>
  </svg>
);

export const EURJPYIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="12" height="24" fill="#003399"/>
    <rect x="12" width="12" height="24" fill="#BC002D"/>
    <text x="6" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">€</text>
    <text x="18" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">¥</text>
  </svg>
);

export const GBPJPYIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="12" height="24" fill="#C8102E"/>
    <rect x="12" width="12" height="24" fill="#BC002D"/>
    <text x="6" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">£</text>
    <text x="18" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">¥</text>
  </svg>
);

// Commodity Icons (TradingView style)
export const GoldIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#FFD700"/>
    <path d="M12 6L15 10H9L12 6Z" fill="#FFB300"/>
    <path d="M12 18L15 14H9L12 18Z" fill="#FFB300"/>
    <path d="M6 12L10 9V15L6 12Z" fill="#FFB300"/>
    <path d="M18 12L14 9V15L18 12Z" fill="#FFB300"/>
  </svg>
);

export const SilverIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#C0C0C0"/>
    <path d="M12 6L15 10H9L12 6Z" fill="#A8A8A8"/>
    <path d="M12 18L15 14H9L12 18Z" fill="#A8A8A8"/>
  </svg>
);

export const OilIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#1A1A1A"/>
    <path d="M8 6h8v12h-8z" fill="#333"/>
    <circle cx="12" cy="12" r="3" fill="#666"/>
  </svg>
);

// Crypto Icons (Binance exact style - circular with official brand colors and logos)
export const BTCIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z" fill="white"/>
  </svg>
);

export const ETHIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#627EEA"/>
    <path d="M16.498 4v8.87l7.497 3.35z" fill="white" fillOpacity="0.602"/>
    <path d="M16.498 4L9 16.22l7.498-3.35z" fill="white"/>
    <path d="M16.498 21.968v6.027L24 17.616z" fill="white" fillOpacity="0.602"/>
    <path d="M16.498 27.995v-6.028L9 17.616z" fill="white"/>
    <path d="M16.498 20.573l7.497-4.353-7.497-3.348z" fill="white" fillOpacity="0.2"/>
    <path d="M9 16.22l7.498 4.353v-7.701z" fill="white" fillOpacity="0.602"/>
  </svg>
);

export const BNBIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#F0B90B"/>
    <path d="M16 6L13.5 8.5L16 11L18.5 8.5L16 6Z" fill="white"/>
    <path d="M21.5 11L19 13.5L21.5 16L24 13.5L21.5 11Z" fill="white"/>
    <path d="M8 13.5L10.5 16L8 18.5L5.5 16L8 13.5Z" fill="white"/>
    <path d="M16 16L13.5 18.5L16 21L18.5 18.5L16 16Z" fill="white"/>
    <path d="M19 23.5L21.5 21L24 23.5L21.5 26L19 23.5Z" fill="white"/>
  </svg>
);

export const SOLIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="solGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00FFA3"/>
        <stop offset="100%" stopColor="#DC1FFF"/>
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="16" fill="url(#solGradient)"/>
    <path d="M7.5 19.5L10 17H24.5L22 19.5H7.5Z" fill="white"/>
    <path d="M7.5 12.5L10 10H24.5L22 12.5H7.5Z" fill="white" fillOpacity="0.6"/>
    <path d="M7.5 16L10 13.5H24.5L22 16H7.5Z" fill="white" fillOpacity="0.8"/>
  </svg>
);

// Additional Binance-style Crypto Icons (circular with brand colors)
export const USDTIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#26A17B"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">USDT</text>
  </svg>
);

export const USDCIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#2775CA"/>
    <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="2" fill="none"/>
    <text x="12" y="15" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">USD</text>
  </svg>
);

export const XRPIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#23292F"/>
    <path d="M7 8L12 13L17 8M7 16L12 11L17 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const DOGEIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#C2A633"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Ð</text>
  </svg>
);

export const TRXIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#FF060A"/>
    <path d="M8 16L16 8L12 12L16 16L8 8" stroke="white" strokeWidth="1.5" fill="none"/>
  </svg>
);

export const ADAIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#0033AD"/>
    <circle cx="12" cy="12" r="3" fill="white"/>
    <circle cx="8" cy="8" r="1.5" fill="white"/>
    <circle cx="16" cy="8" r="1.5" fill="white"/>
    <circle cx="8" cy="16" r="1.5" fill="white"/>
    <circle cx="16" cy="16" r="1.5" fill="white"/>
  </svg>
);

export const AVAXIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#E84142"/>
    <path d="M12 6L16 14H8L12 6Z" fill="white"/>
    <path d="M6 18H18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const SHIBIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#FFA409"/>
    <path d="M8 10C8 10 10 8 12 8C14 8 16 10 16 10" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="9" cy="11" r="1" fill="white"/>
    <circle cx="15" cy="11" r="1" fill="white"/>
    <path d="M9 14C9 14 10 16 12 16C14 16 15 14 15 14" stroke="white" strokeWidth="1.5" fill="none"/>
  </svg>
);

export const LINKIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#375BD2"/>
    <path d="M12 6L16 9V15L12 18L8 15V9L12 6Z" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

export const DOTIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#E6007A"/>
    <circle cx="12" cy="8" r="2" fill="white"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
    <circle cx="12" cy="16" r="2" fill="white"/>
  </svg>
);

export const MATICIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#8247E5"/>
    <path d="M12 6L8 9L12 12L16 9L12 6Z" fill="white"/>
    <path d="M12 12L8 15L12 18L16 15L12 12Z" fill="white" opacity="0.7"/>
  </svg>
);

export const LTCIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#345D9D"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Ł</text>
  </svg>
);

export const UNIIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#FF007A"/>
    <circle cx="9" cy="10" r="2" fill="white"/>
    <circle cx="15" cy="14" r="2" fill="white"/>
    <path d="M9 10C9 10 11 14 15 14" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

export const ATOMIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#6F7390"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
    <circle cx="12" cy="7" r="1.5" fill="white"/>
    <circle cx="12" cy="17" r="1.5" fill="white"/>
    <circle cx="7" cy="12" r="1.5" fill="white"/>
    <circle cx="17" cy="12" r="1.5" fill="white"/>
  </svg>
);

export const XLMIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#000000"/>
    <path d="M6 14L12 8L18 14" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

export const XMRIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#FF6600"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">XMR</text>
  </svg>
);

export const HBARIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#000000"/>
    <path d="M8 8H16M8 12H16M8 16H16" stroke="white" strokeWidth="2"/>
  </svg>
);

export const NEARIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#00C08B"/>
    <path d="M8 16L12 8L16 16" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

export const APTIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#000000"/>
    <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

export const ARBIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#28A0F0"/>
    <path d="M8 14L12 8L16 14L12 11L8 14Z" fill="white"/>
  </svg>
);

export const OPIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#FF0420"/>
    <circle cx="10" cy="12" r="3" fill="white"/>
    <circle cx="14" cy="12" r="3" fill="white"/>
  </svg>
);

export const FILIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#0090FF"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">FIL</text>
  </svg>
);

export const ALGOIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#000000"/>
    <path d="M8 16L12 8L14 12L16 8" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

export const VETIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#15BDFF"/>
    <path d="M8 8L12 16L16 8" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

export const AAVEIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#B6509E"/>
    <path d="M8 16L12 6L16 16H8Z" fill="white"/>
  </svg>
);

export const ICPIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#29ABE2"/>
    <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="2" fill="none"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
  </svg>
);

export const INJIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#00F2FE"/>
    <path d="M8 8L12 12L16 8M8 16L12 12L16 16" stroke="black" strokeWidth="2"/>
  </svg>
);

export const SUIIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#4DA2FF"/>
    <circle cx="9" cy="10" r="2" fill="white"/>
    <circle cx="15" cy="14" r="2" fill="white"/>
  </svg>
);

export const GRTIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#6747ED"/>
    <path d="M8 12L12 8L16 12L12 16L8 12Z" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

export const RUNEIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#00CCFF"/>
    <path d="M12 6L8 10L12 14L16 10L12 6Z" fill="white"/>
    <path d="M12 14L8 18H16L12 14Z" fill="white"/>
  </svg>
);

export const FTMIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#1969FF"/>
    <path d="M12 6L8 9V15L12 18L16 15V9L12 6Z" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

export const SANDIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#00ADEF"/>
    <rect x="8" y="8" width="8" height="8" fill="white"/>
    <rect x="10" y="10" width="4" height="4" fill="#00ADEF"/>
  </svg>
);

export const MANAIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#FF2D55"/>
    <path d="M8 14L12 8L16 14" stroke="white" strokeWidth="2" fill="none"/>
    <rect x="10" y="14" width="4" height="4" fill="white"/>
  </svg>
);

export const PEPEIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#3D9970"/>
    <circle cx="9" cy="10" r="1.5" fill="white"/>
    <circle cx="15" cy="10" r="1.5" fill="white"/>
    <path d="M8 14C8 14 10 16 12 16C14 16 16 14 16 14" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

// Index Icons (TradingView style)
export const SP500Icon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#0052CC"/>
    <text x="12" y="10" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">S&P</text>
    <text x="12" y="18" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">500</text>
  </svg>
);

export const DJIIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#004080"/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">DJI</text>
  </svg>
);

export const NASDAQIndexIcon = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#00A3DA"/>
    <text x="12" y="10" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">NDX</text>
    <text x="12" y="18" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">100</text>
  </svg>
);

// ETF Icons (TradingView style - rectangular with letters)
export const ETFIcon = ({ symbol, className = "w-5 h-5", size = 20, color = "#6366F1" }: IconProps & { symbol: string; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill={color}/>
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">{symbol.slice(0, 4)}</text>
  </svg>
);

// Generic Trading Icon (TradingView style - chart pattern)
export const ChartIcon = ({ className = "w-5 h-5", size = 20, color = "#2196F3" }: IconProps & { color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill={color}/>
    <path d="M5 15L9 11L13 13L19 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="11" r="1.5" fill="white"/>
    <circle cx="13" cy="13" r="1.5" fill="white"/>
  </svg>
);

// Stock Logo Icons (TradingView exact style)
export const AppleIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#000000"/>
    <path d="M17.5 12.5c0-1.5.8-2.8 2-3.5-.8-1.1-2-1.8-3.5-1.8-1.5 0-2.2.7-3.2.7s-1.9-.7-3.2-.7C7.9 7.2 6 8.9 6 11.5c0 2.9 2.3 6.2 4.2 6.2.9 0 1.4-.6 2.5-.6s1.5.6 2.5.6c2 0 3.3-2.8 3.3-3.2m-2-8c.6-.7 1-1.7.9-2.7-.8 0-1.8.5-2.4 1.2-.5.6-1 1.6-.8 2.5.9.1 1.8-.4 2.3-1z" fill="white"/>
  </svg>
);

export const MicrosoftIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#00A4EF"/>
    <rect x="6" y="6" width="6" height="6" fill="#FFB900"/>
    <rect x="13" y="6" width="6" height="6" fill="#F25022"/>
    <rect x="6" y="13" width="6" height="6" fill="#00A4EF"/>
    <rect x="13" y="13" width="6" height="6" fill="#7FBA00"/>
  </svg>
);

export const TeslaIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#E82127"/>
    <path d="M12 8L9 10V14L12 16L15 14V10L12 8Z" fill="white"/>
    <path d="M6 7L12 5L18 7" stroke="white" strokeWidth="1.5"/>
  </svg>
);

export const AmazonIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#FF9900"/>
    <path d="M8 14c3 2 8 2 11 0" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="17" cy="15" r="1" fill="#000"/>
  </svg>
);

export const GoogleIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#4285F4"/>
    <path d="M12 10v4h5.5c-.5 2-2 3.5-4.5 3.5-3 0-5.5-2.5-5.5-5.5S9 6.5 12 6.5c1.5 0 2.8.6 3.8 1.5l2.9-2.9C16.8 3.5 14.5 2.5 12 2.5 6.5 2.5 2 7 2 12.5s4.5 10 10 10c5 0 9.5-3.5 9.5-9.5 0-.7-.1-1.3-.2-2H12z" fill="white"/>
  </svg>
);

export const NvidiaIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#76B900"/>
    <path d="M8 16L12 8L16 16" stroke="white" strokeWidth="2" fill="none"/>
    <circle cx="12" cy="13" r="2" fill="white"/>
  </svg>
);

export const MetaIconTV = ({ className = "w-5 h-5", size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#0668E1"/>
    <path d="M6 12c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="white" strokeWidth="2" fill="none"/>
    <path d="M14 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);
