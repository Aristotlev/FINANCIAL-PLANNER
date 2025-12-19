// Only initialize OpenNext Cloudflare in non-Docker environments
// The DOCKER_BUILD env var is set in cloudbuild.yaml/Dockerfile
if (process.env.NODE_ENV === 'development' && !process.env.DOCKER_BUILD) {
  try {
    const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
    initOpenNextCloudflareForDev();
  } catch (e) {
    // Silently ignore if the package is not available
    console.log('OpenNext Cloudflare not available, skipping initialization');
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for Docker/Cloud Run deployment
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  
  // Empty turbopack config to silence the warning (Next.js 16 uses Turbopack by default)
  turbopack: {},
  
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
  
  // Security headers are managed in middleware.ts to avoid conflicts
  // and allow for dynamic CSP based on environment
  
  // Production-only optimizations
  ...(process.env.NODE_ENV === 'production' && {
    productionBrowserSourceMaps: false,
  }),
};

export default nextConfig;
