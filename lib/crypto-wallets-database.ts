/**
 * Crypto Wallets Database
 * Comprehensive list of DeFi and CeFi wallets for crypto portfolio management
 */

export interface WalletInfo {
  id: string;
  name: string;
  type: 'defi' | 'cefi';
  category: string;
  logo?: string;
  color: string;
  description: string;
  supportedNetworks?: string[];
  website?: string;
}

export const CRYPTO_WALLETS: WalletInfo[] = [
  // ==================== DeFi WALLETS ====================
  {
    id: 'metamask',
    name: 'MetaMask',
    type: 'defi',
    category: 'Browser Extension',
    logo: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
    color: '#F6851B',
    description: 'Most popular Ethereum wallet. Browser extension and mobile app.',
    supportedNetworks: ['Ethereum', 'BSC', 'Polygon', 'Avalanche', 'Arbitrum', 'Optimism'],
    website: 'metamask.io'
  },
  {
    id: 'trust_wallet',
    name: 'Trust Wallet',
    type: 'defi',
    category: 'Mobile Wallet',
    logo: 'https://avatars.githubusercontent.com/u/32179842',
    color: '#3375BB',
    description: 'Official wallet of Binance. Multi-chain support.',
    supportedNetworks: ['Ethereum', 'BSC', 'Polygon', 'Solana', 'Bitcoin', 'Tron'],
    website: 'trustwallet.com'
  },
  {
    id: 'phantom',
    name: 'Phantom',
    type: 'defi',
    category: 'Solana Wallet',
    logo: 'https://avatars.githubusercontent.com/u/78782331',
    color: '#AB9FF2',
    description: 'Leading Solana wallet with multi-chain support.',
    supportedNetworks: ['Solana', 'Ethereum', 'Polygon', 'Bitcoin'],
    website: 'phantom.app'
  },
  {
    id: 'exodus',
    name: 'Exodus',
    type: 'defi',
    category: 'Desktop Wallet',
    logo: 'https://avatars.githubusercontent.com/u/20698305',
    color: '#0B46F9',
    description: 'Beautiful desktop and mobile wallet with built-in exchange.',
    supportedNetworks: ['Bitcoin', 'Ethereum', 'Solana', 'Cardano', 'Polkadot'],
    website: 'exodus.com'
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    type: 'defi',
    category: 'Mobile Wallet',
    logo: 'https://avatars.githubusercontent.com/u/45050444',
    color: '#FF4D8A',
    description: 'User-friendly Ethereum wallet with great UX.',
    supportedNetworks: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'],
    website: 'rainbow.me'
  },
  {
    id: 'coinbase_wallet',
    name: 'Coinbase Wallet',
    type: 'defi',
    category: 'Self-Custody',
    logo: 'https://avatars.githubusercontent.com/u/1885080',
    color: '#0052FF',
    description: 'Self-custody wallet from Coinbase (separate from exchange).',
    supportedNetworks: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'],
    website: 'wallet.coinbase.com'
  },
  {
    id: 'ledger',
    name: 'Ledger',
    type: 'defi',
    category: 'Hardware Wallet',
    logo: 'https://avatars.githubusercontent.com/u/9796316',
    color: '#000000',
    description: 'Leading hardware wallet for maximum security.',
    supportedNetworks: ['All major chains'],
    website: 'ledger.com'
  },
  {
    id: 'trezor',
    name: 'Trezor',
    type: 'defi',
    category: 'Hardware Wallet',
    logo: 'https://avatars.githubusercontent.com/u/4130005',
    color: '#00A651',
    description: 'Original hardware wallet with open-source firmware.',
    supportedNetworks: ['All major chains'],
    website: 'trezor.io'
  },
  {
    id: 'argent',
    name: 'Argent',
    type: 'defi',
    category: 'Smart Wallet',
    logo: 'https://avatars.githubusercontent.com/u/35555776',
    color: '#FF875B',
    description: 'Smart contract wallet with social recovery.',
    supportedNetworks: ['Ethereum', 'zkSync', 'Starknet'],
    website: 'argent.xyz'
  },
  {
    id: 'safe',
    name: 'Safe (Gnosis)',
    type: 'defi',
    category: 'Multi-Sig',
    logo: 'https://avatars.githubusercontent.com/u/10298378',
    color: '#12FF80',
    description: 'Multi-signature wallet for teams and organizations.',
    supportedNetworks: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'BSC'],
    website: 'safe.global'
  },
  {
    id: 'zerion',
    name: 'Zerion',
    type: 'defi',
    category: 'Portfolio Tracker',
    logo: 'https://avatars.githubusercontent.com/u/45107567',
    color: '#2962EF',
    description: 'DeFi wallet with built-in portfolio tracking.',
    supportedNetworks: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'BSC'],
    website: 'zerion.io'
  },
  {
    id: 'rabby',
    name: 'Rabby',
    type: 'defi',
    category: 'Browser Extension',
    logo: 'https://avatars.githubusercontent.com/u/85284334',
    color: '#8697FF',
    description: 'Advanced wallet for multi-chain DeFi users.',
    supportedNetworks: ['All EVM chains'],
    website: 'rabby.io'
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    type: 'defi',
    category: 'Protocol',
    logo: 'https://avatars.githubusercontent.com/u/37784886',
    color: '#3B99FC',
    description: 'Connect to dApps with any wallet.',
    supportedNetworks: ['All chains'],
    website: 'walletconnect.com'
  },

  // ==================== CeFi EXCHANGES ====================
  {
    id: 'binance',
    name: 'Binance',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/23358057',
    color: '#F3BA2F',
    description: 'World\'s largest crypto exchange by volume.',
    supportedNetworks: ['Trading', 'Spot', 'Futures', 'Staking'],
    website: 'binance.com'
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/1885080',
    color: '#0052FF',
    description: 'Leading US-based crypto exchange.',
    supportedNetworks: ['Trading', 'Spot', 'Staking'],
    website: 'coinbase.com'
  },
  {
    id: 'kraken',
    name: 'Kraken',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/4988487',
    color: '#5741D9',
    description: 'Trusted exchange with advanced trading features.',
    supportedNetworks: ['Trading', 'Spot', 'Futures', 'Staking'],
    website: 'kraken.com'
  },
  {
    id: 'bybit',
    name: 'Bybit',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/42603517',
    color: '#F7A600',
    description: 'Popular derivatives trading platform.',
    supportedNetworks: ['Trading', 'Spot', 'Futures', 'Copy Trading'],
    website: 'bybit.com'
  },
  {
    id: 'okx',
    name: 'OKX',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/23249156',
    color: '#000000',
    description: 'Major exchange with Web3 wallet integration.',
    supportedNetworks: ['Trading', 'Spot', 'Futures', 'DeFi'],
    website: 'okx.com'
  },
  {
    id: 'kucoin',
    name: 'KuCoin',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/29522133',
    color: '#23AF91',
    description: 'Wide selection of altcoins and tokens.',
    supportedNetworks: ['Trading', 'Spot', 'Futures', 'Staking'],
    website: 'kucoin.com'
  },
  {
    id: 'gate_io',
    name: 'Gate.io',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/19313363',
    color: '#2354E6',
    description: 'Large selection of trading pairs.',
    supportedNetworks: ['Trading', 'Spot', 'Futures', 'Staking'],
    website: 'gate.io'
  },
  {
    id: 'huobi',
    name: 'Huobi (HTX)',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/33352617',
    color: '#2EABD7',
    description: 'Global digital asset exchange.',
    supportedNetworks: ['Trading', 'Spot', 'Futures'],
    website: 'htx.com'
  },
  {
    id: 'bitget',
    name: 'Bitget',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/42646399',
    color: '#00F0E1',
    description: 'Copy trading and derivatives platform.',
    supportedNetworks: ['Trading', 'Spot', 'Futures', 'Copy Trading'],
    website: 'bitget.com'
  },
  {
    id: 'crypto_com',
    name: 'Crypto.com',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/20268189',
    color: '#002D74',
    description: 'Exchange with strong mobile app and card.',
    supportedNetworks: ['Trading', 'Spot', 'Staking', 'DeFi'],
    website: 'crypto.com'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/10271477',
    color: '#00DCFA',
    description: 'Regulated US exchange founded by Winklevoss twins.',
    supportedNetworks: ['Trading', 'Spot', 'Custody'],
    website: 'gemini.com'
  },
  {
    id: 'bitfinex',
    name: 'Bitfinex',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/12061955',
    color: '#6EC06E',
    description: 'Advanced exchange for professional traders.',
    supportedNetworks: ['Trading', 'Spot', 'Margin', 'Futures'],
    website: 'bitfinex.com'
  },
  {
    id: 'bitstamp',
    name: 'Bitstamp',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/2550604',
    color: '#00AB66',
    description: 'Oldest European cryptocurrency exchange.',
    supportedNetworks: ['Trading', 'Spot'],
    website: 'bitstamp.net'
  },
  {
    id: 'mexc',
    name: 'MEXC',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/49745174',
    color: '#00C087',
    description: 'High-growth exchange with many listings.',
    supportedNetworks: ['Trading', 'Spot', 'Futures'],
    website: 'mexc.com'
  },
  {
    id: 'uphold',
    name: 'Uphold',
    type: 'cefi',
    category: 'Exchange',
    logo: 'https://avatars.githubusercontent.com/u/10398642',
    color: '#30C88B',
    description: 'Multi-asset platform for crypto and more.',
    supportedNetworks: ['Trading', 'Spot', 'Staking'],
    website: 'uphold.com'
  },

  // ==================== OTHER ====================
  {
    id: 'other',
    name: 'Other Wallet',
    type: 'defi',
    category: 'Custom',
    color: '#6B7280',
    description: 'Custom or unlisted wallet',
    supportedNetworks: ['Various'],
    website: ''
  }
];

// Helper functions
export const getWalletById = (id: string): WalletInfo | undefined => {
  return CRYPTO_WALLETS.find(wallet => wallet.id === id);
};

export const getDeFiWallets = (): WalletInfo[] => {
  return CRYPTO_WALLETS.filter(wallet => wallet.type === 'defi');
};

export const getCeFiWallets = (): WalletInfo[] => {
  return CRYPTO_WALLETS.filter(wallet => wallet.type === 'cefi');
};

export const getWalletsByCategory = (category: string): WalletInfo[] => {
  return CRYPTO_WALLETS.filter(wallet => wallet.category === category);
};

export const WALLET_CATEGORIES = {
  defi: ['Browser Extension', 'Mobile Wallet', 'Desktop Wallet', 'Hardware Wallet', 'Multi-Sig', 'Smart Wallet', 'Portfolio Tracker', 'Protocol', 'Custom'],
  cefi: ['Exchange']
};
