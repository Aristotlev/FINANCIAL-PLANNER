/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Browser compatibility - target modern browsers
  swcMinify: true,
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 's3-symbol-logo.tradingview.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      {
        protocol: 'https',
        hostname: 'icons.duckduckgo.com',
      },
      {
        protocol: 'https',
        hostname: 'img.logo.dev',
      },
    ],
    // Optimize images for all devices
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  
  // Performance optimizations
  experimental: {
    // Optimize package imports - tree shake heavy packages
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      'framer-motion',
      'react-icons',
      '@xyflow/react',
      'jspdf',
      'jspdf-autotable',
    ],
  },
  
  // Webpack optimizations for better chunking
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split vendor chunks more aggressively
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000, // Keep chunks under 244kb for better caching
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separate recharts into its own chunk (heavy library)
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Separate framer-motion into its own chunk
          framer: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'framer-motion',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Separate icons into their own chunk
          icons: {
            test: /[\\/]node_modules[\\/](lucide-react|react-icons)[\\/]/,
            name: 'icons',
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
  
  // Security headers are managed in middleware.ts to avoid conflicts
  // and allow for dynamic CSP based on environment
  
  // Production-only optimizations
  ...(process.env.NODE_ENV === 'production' && {
    productionBrowserSourceMaps: false,
  }),
};

export default nextConfig;
