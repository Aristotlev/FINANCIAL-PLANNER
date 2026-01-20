import React, { useState, useEffect } from 'react';
import { X, Search, Wallet } from 'lucide-react';
import { CryptoIcon } from '../../ui/crypto-icon';
import { getBrandColor } from '../../../lib/brand-colors';
import { getDeFiWallets, getCeFiWallets, getWalletById, CRYPTO_WALLETS, WalletInfo } from '../../../lib/crypto-wallets-database';
import { CryptoHolding } from '../../../contexts/portfolio-context';

interface SearchResult {
  name: string;
  symbol: string;
  currentPrice: number;
  icon?: string;
  id?: string;
}

// Popular cryptocurrencies for search - Top 50 by market cap (CoinGecko/CMC data)
const popularCryptos: SearchResult[] = [
  { name: 'Bitcoin', symbol: 'BTC', currentPrice: 63500 },
  { name: 'Ethereum', symbol: 'ETH', currentPrice: 3150 },
  { name: 'Tether', symbol: 'USDT', currentPrice: 1.00 },
  { name: 'BNB', symbol: 'BNB', currentPrice: 580 },
  { name: 'Solana', symbol: 'SOL', currentPrice: 145 },
  { name: 'USD Coin', symbol: 'USDC', currentPrice: 1.00 },
  { name: 'XRP', symbol: 'XRP', currentPrice: 0.52 },
  { name: 'Dogecoin', symbol: 'DOGE', currentPrice: 0.15 },
  { name: 'TRON', symbol: 'TRX', currentPrice: 0.16 },
  { name: 'Cardano', symbol: 'ADA', currentPrice: 0.51 },
  { name: 'Avalanche', symbol: 'AVAX', currentPrice: 34.50 },
  { name: 'Shiba Inu', symbol: 'SHIB', currentPrice: 0.000018 },
  { name: 'Chainlink', symbol: 'LINK', currentPrice: 14.50 },
  { name: 'Polkadot', symbol: 'DOT', currentPrice: 6.80 },
  { name: 'Polygon', symbol: 'MATIC', currentPrice: 0.85 },
  { name: 'Litecoin', symbol: 'LTC', currentPrice: 88.00 },
  { name: 'Uniswap', symbol: 'UNI', currentPrice: 8.60 },
  { name: 'Cosmos', symbol: 'ATOM', currentPrice: 10.20 },
  { name: 'Stellar', symbol: 'XLM', currentPrice: 0.11 },
  { name: 'Monero', symbol: 'XMR', currentPrice: 165 },
  { name: 'Hedera', symbol: 'HBAR', currentPrice: 0.06 },
  { name: 'NEAR Protocol', symbol: 'NEAR', currentPrice: 4.20 },
  { name: 'Aptos', symbol: 'APT', currentPrice: 8.50 },
  { name: 'Arbitrum', symbol: 'ARB', currentPrice: 0.75 },
  { name: 'Optimism', symbol: 'OP', currentPrice: 2.10 },
  { name: 'Filecoin', symbol: 'FIL', currentPrice: 5.20 },
  { name: 'Algorand', symbol: 'ALGO', currentPrice: 0.22 },
  { name: 'VeChain', symbol: 'VET', currentPrice: 0.025 },
  { name: 'Aave', symbol: 'AAVE', currentPrice: 160 },
  { name: 'Internet Computer', symbol: 'ICP', currentPrice: 4.50 },
  { name: 'Injective', symbol: 'INJ', currentPrice: 28.00 },
  { name: 'Sui', symbol: 'SUI', currentPrice: 0.65 },
  { name: 'The Graph', symbol: 'GRT', currentPrice: 0.16 },
  { name: 'THORChain', symbol: 'RUNE', currentPrice: 4.80 },
  { name: 'Fantom', symbol: 'FTM', currentPrice: 0.50 },
  { name: 'The Sandbox', symbol: 'SAND', currentPrice: 0.52 },
  { name: 'Decentraland', symbol: 'MANA', currentPrice: 0.54 },
  { name: 'Pepe', symbol: 'PEPE', currentPrice: 0.0000098 }
];

// Internal component for handling wallet logos with robust fallbacks
const WalletLogo = ({ wallet, size = "sm" }: { wallet: WalletInfo | undefined, size?: "sm" | "md" }) => {
  // Determine initial source: explicit logo -> website favicon -> undefined
  const initialSrc = wallet?.logo || (wallet?.website ? `https://www.google.com/s2/favicons?domain=${wallet.website}&sz=128` : undefined);
  
  const [imgSrc, setImgSrc] = useState<string | undefined>(initialSrc);
  const [hasError, setHasError] = useState(false);
  
  // Reset state if wallet changes
  useEffect(() => {
    const newSrc = wallet?.logo || (wallet?.website ? `https://www.google.com/s2/favicons?domain=${wallet.website}&sz=128` : undefined);
    setImgSrc(newSrc);
    setHasError(false);
  }, [wallet?.id, wallet?.logo, wallet?.website]);

  // Dimensions
  const containerSize = size === "md" ? "w-6 h-6" : "w-5 h-5";
  const dotSize = size === "md" ? "w-3 h-3" : "w-2 h-2"; 
  
  // 1. If no wallet provided, show generic gray dot
  if (!wallet) {
    return (
       <div
          className={`${dotSize} rounded-full bg-gray-400`}
          aria-hidden="true"
       />
    );
  }

  // 2. Fallback to colored dot if all image attempts fail
  if (!imgSrc || hasError) {
     return (
        <div
            className={`${dotSize} rounded-full shadow-sm`}
            style={{ backgroundColor: wallet.color }}
            aria-hidden="true"
        />
     );
  }

  // 3. Render logo with fallback logic
  return (
    <img 
       src={imgSrc} 
       alt={wallet.name} 
       className={`${containerSize} rounded-full object-contain bg-[#1A1A1A] shadow-sm`}
       onError={() => {
         // If primary logo fails, try fetching favicon from website
         if (wallet.logo && imgSrc === wallet.logo && wallet.website) {
           setImgSrc(`https://www.google.com/s2/favicons?domain=${wallet.website}&sz=128`);
         } else {
           // If fallback also fails, show colored dot
           setHasError(true);
         }
       }}
    />
  );
};

export function AddCryptoPositionModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (holding: Omit<CryptoHolding, 'id' | 'value' | 'change'>) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState<SearchResult | null>(null);
  const [allCryptos, setAllCryptos] = useState<SearchResult[]>(popularCryptos);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [color, setColor] = useState('#06b6d4');
  const [walletType, setWalletType] = useState('other');
  const [walletName, setWalletName] = useState('');
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  useEffect(() => {
    if (isOpen && allCryptos.length <= popularCryptos.length) {
      const fetchCryptos = async () => {
        setIsLoading(true);
        try {
          // Fetch top 500 coins in two batches
          const [page1, page2] = await Promise.all([
            fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false').then(res => res.json()),
            fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=2&sparkline=false').then(res => res.json())
          ]);

          if (Array.isArray(page1) && Array.isArray(page2)) {
            const combined = [...page1, ...page2].map((coin: any) => ({
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol.toUpperCase(),
              currentPrice: coin.current_price,
              icon: coin.image
            }));
            
            setAllCryptos(combined);
          }
        } catch (error) {
          console.error('Failed to fetch cryptos:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCryptos();
    }
  }, [isOpen]);

  const filteredCryptos = allCryptos.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedCrypto && amount && entryPoint) {
      onAdd({
        name: selectedCrypto.name,
        symbol: selectedCrypto.symbol,
        amount: parseFloat(amount),
        entryPoint: parseFloat(entryPoint),
        color: color,
        walletType: walletType,
        walletName: walletName || undefined,
        iconUrl: selectedCrypto.icon
      });
      onClose();
      setSearchTerm('');
      setSelectedCrypto(null);
      setAmount('');
      setEntryPoint('');
      setColor('#06b6d4');
      setWalletType('other');
      setWalletName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000001] overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-8 sm:py-4">
        <div className="bg-[#0D0D0D] border border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-md transform transition-all" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-xl font-bold text-white">Add Position</h3>
              <p className="text-sm text-gray-400 mt-1">Track a new cryptocurrency</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-400">
              Select Asset
            </label>
            <div className="relative group">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500 group-focus-within:text-cyan-500 transition-colors" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-white transition-all placeholder:text-gray-600"
                placeholder="Search Bitcoin, Ethereum..."
              />
            </div>
          </div>

          {/* Search Results */}
          {searchTerm && (
            <div className="mb-6 max-h-48 overflow-y-auto border border-white/10 rounded-xl bg-[#1A1A1A] shadow-lg">
              {filteredCryptos.length > 0 ? (
                filteredCryptos.map((crypto, index) => (
                  <button
                    key={`${crypto.id || crypto.symbol}-${index}`}
                    onClick={() => {
                      setSelectedCrypto(crypto);
                      setSearchTerm('');
                      setEntryPoint(crypto.currentPrice.toString());
                      setColor(getBrandColor(crypto.symbol, 'crypto'));
                    }}
                    className="w-full p-3 text-left hover:bg-white/5 border-b border-white/5 last:border-b-0 flex items-center gap-3 transition-colors"
                  >
                    <CryptoIcon symbol={crypto.symbol} iconUrl={crypto.icon} />
                    <div>
                      <div className="font-semibold text-white">{crypto.name}</div>
                      <div className="text-sm text-gray-400 font-mono">
                        {crypto.symbol}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No cryptocurrencies found
                </div>
              )}
            </div>
          )}

          {/* Selected Crypto */}
          {selectedCrypto && (
            <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1A1A1A] rounded-xl shadow-sm border border-white/5">
                  <CryptoIcon symbol={selectedCrypto.symbol} iconUrl={selectedCrypto.icon} className="w-8 h-8" />
                </div>
                <div>
                  <div className="font-bold text-white">{selectedCrypto.name}</div>
                  <div className="text-sm text-cyan-400 font-medium">
                    ${selectedCrypto.currentPrice.toLocaleString()}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCrypto(null)}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors"
              >
                Change
              </button>
            </div>
          )}

          {/* Input Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-1">
              <label className="block text-sm font-medium mb-2 text-gray-400">
                Amount
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-white transition-all font-mono placeholder:text-gray-600"
                placeholder="0.00"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium mb-2 text-gray-400">
                Buy Price ($)
              </label>
              <input
                type="number"
                step="any"
                value={entryPoint}
                onChange={(e) => setEntryPoint(e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-white transition-all font-mono placeholder:text-gray-600"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-400">
              Chart Color
            </label>
            <div className="flex items-center gap-3 p-1">
              <div 
                className="w-10 h-10 rounded-xl shadow-sm border border-white/10" 
                style={{ backgroundColor: color }}
              />
              <input
                className="flex-1 cursor-pointer h-10 bg-transparent"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          {/* Wallet Selection */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-400 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gray-500" />
                Wallet Allocation
              </label>
              <button
                type="button"
                onClick={() => setShowWalletOptions(!showWalletOptions)}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {showWalletOptions ? 'Hide Options' : 'Change Wallet'}
              </button>
            </div>

            {!showWalletOptions ? (
              <div 
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl flex items-center gap-3 cursor-pointer hover:border-cyan-500/50 transition-colors"
                onClick={() => setShowWalletOptions(true)}
              >
                <WalletLogo 
                  wallet={walletType !== 'other' ? getWalletById(walletType) : undefined} 
                  size="md" 
                />
                <span className="text-white font-medium">
                  {walletType === 'other' ? 'Other Wallet' : getWalletById(walletType)?.name}
                </span>
                {walletName && <span className="text-gray-500 text-sm">({walletName})</span>}
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-white/10 rounded-xl bg-[#1A1A1A]">
                  <button
                     onClick={() => setWalletType('other')}
                     className={`p-2.5 rounded-lg text-left transition-all ${walletType === 'other'
                       ? 'bg-white/10 shadow-sm border border-white/10 ring-1 ring-cyan-500/50'
                       : 'hover:bg-white/5 border border-transparent'
                       }`}
                  >
                    <span className="text-sm font-medium text-white">Other Wallet</span>
                  </button>
                  {CRYPTO_WALLETS.filter(w => w.id !== 'other').map(wallet => {
                    const isSelected = walletType === wallet.id;
                    return (
                      <button
                        key={wallet.id}
                        type="button"
                        onClick={() => setWalletType(wallet.id)}
                        className={`p-2.5 rounded-lg text-left transition-all ${isSelected
                          ? 'bg-white/10 shadow-sm border border-white/10 ring-1 ring-cyan-500/50'
                          : 'hover:bg-white/5 border border-transparent'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <WalletLogo wallet={wallet} size="sm" />
                          <span className="text-sm font-medium text-white truncate">
                            {wallet.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="Custom label (optional)"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-white transition-all text-sm placeholder:text-gray-600"
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 text-white font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedCrypto || !amount || !entryPoint}
              className="flex-1 px-6 py-3 bg-[#0D0D0D] border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Position
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
