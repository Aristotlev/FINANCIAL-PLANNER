import React, { useState } from "react";
import { Coins, ChartColumn as ChartIcon } from "lucide-react";
import {
  SiBitcoin,
  SiEthereum,
  SiCardano,
  SiPolkadot,
  SiSolana,
  SiChainlink,
  SiPolygon,
  SiLitecoin,
  SiMonero,
  SiTether,
  SiBinance
} from "react-icons/si";
import {
  BTCIconTV,
  ETHIconTV,
  BNBIconTV,
  SOLIconTV,
  USDTIcon,
  USDCIcon,
  XRPIcon,
  DOGEIcon,
  TRXIcon,
  ADAIcon,
  AVAXIcon,
  SHIBIcon,
  LINKIcon,
  DOTIcon,
  MATICIcon,
  LTCIcon,
  UNIIcon,
  ATOMIcon,
  XLMIcon,
  XMRIcon,
  HBARIcon,
  NEARIcon,
  APTIcon,
  ARBIcon,
  OPIcon,
  FILIcon,
  ALGOIcon,
  VETIcon,
  AAVEIcon,
  ICPIcon,
  INJIcon,
  SUIIcon,
  GRTIcon,
  RUNEIcon,
  FTMIcon,
  SANDIcon,
  MANAIcon,
  PEPEIcon
} from "../../lib/tradingview-icons";

// Crypto Icon Component - Binance style
export function CryptoIcon({ symbol, className = "w-5 h-5", iconUrl }: { symbol: string; className?: string; iconUrl?: string }) {
  const [imageError, setImageError] = useState(false);

  if (!symbol) return <Coins className={className} />;

  switch (symbol.toUpperCase()) {
    case 'BTC':
    case 'BTCUSD':
      return <BTCIconTV className={className} />;
    case 'ETH':
    case 'ETHUSD':
      return <ETHIconTV className={className} />;
    case 'BNB':
      return <BNBIconTV className={className} />;
    case 'SOL':
      return <SOLIconTV className={className} />;
    case 'USDT':
      return <USDTIcon className={className} />;
    case 'USDC':
      return <USDCIcon className={className} />;
    case 'XRP':
      return <XRPIcon className={className} />;
    case 'DOGE':
      return <DOGEIcon className={className} />;
    case 'TRX':
      return <TRXIcon className={className} />;
    case 'ADA':
    case 'ADAUSD':
      return <ADAIcon className={className} />;
    case 'AVAX':
      return <AVAXIcon className={className} />;
    case 'SHIB':
      return <SHIBIcon className={className} />;
    case 'LINK':
      return <LINKIcon className={className} />;
    case 'DOT':
      return <DOTIcon className={className} />;
    case 'MATIC':
    case 'POL':
      return <MATICIcon className={className} />;
    case 'LTC':
      return <LTCIcon className={className} />;
    case 'UNI':
      return <UNIIcon className={className} />;
    case 'ATOM':
      return <ATOMIcon className={className} />;
    case 'XLM':
      return <XLMIcon className={className} />;
    case 'XMR':
      return <XMRIcon className={className} />;
    case 'HBAR':
      return <HBARIcon className={className} />;
    case 'NEAR':
      return <NEARIcon className={className} />;
    case 'APT':
      return <APTIcon className={className} />;
    case 'ARB':
      return <ARBIcon className={className} />;
    case 'OP':
      return <OPIcon className={className} />;
    case 'FIL':
      return <FILIcon className={className} />;
    case 'ALGO':
      return <ALGOIcon className={className} />;
    case 'VET':
      return <VETIcon className={className} />;
    case 'AAVE':
      return <AAVEIcon className={className} />;
    case 'ICP':
      return <ICPIcon className={className} />;
    case 'INJ':
      return <INJIcon className={className} />;
    case 'SUI':
      return <SUIIcon className={className} />;
    case 'GRT':
      return <GRTIcon className={className} />;
    case 'RUNE':
      return <RUNEIcon className={className} />;
    case 'FTM':
      return <FTMIcon className={className} />;
    case 'SAND':
      return <SANDIcon className={className} />;
    case 'MANA':
      return <MANAIcon className={className} />;
    case 'PEPE':
      return <PEPEIcon className={className} />;
    default:
      if (!imageError) {
        return (
          <img 
            src={iconUrl || `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`}
            alt={symbol}
            className={`${className} rounded-full`}
            onError={() => setImageError(true)}
          />
        );
      }
      return <ChartIcon className={className} color="#F59E0B" />;
  }
}
