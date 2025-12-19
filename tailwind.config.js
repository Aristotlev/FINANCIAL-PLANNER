/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',      // Small phones
        'sm': '640px',      // Large phones
        'md': '768px',      // Tablets
        'lg': '1024px',     // Small laptops
        'xl': '1280px',     // Desktops
        '2xl': '1536px',    // Large desktops
        'touch': {'raw': '(hover: none) and (pointer: coarse)'}, // Touch devices
        'mouse': {'raw': '(hover: hover) and (pointer: fine)'},  // Mouse devices
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      fontSize: {
        // Mobile-optimized font sizes
        'xs-mobile': ['0.625rem', { lineHeight: '0.875rem' }],
        'sm-mobile': ['0.75rem', { lineHeight: '1rem' }],
        'base-mobile': ['0.875rem', { lineHeight: '1.25rem' }],
        'lg-mobile': ['1rem', { lineHeight: '1.5rem' }],
        'xl-mobile': ['1.125rem', { lineHeight: '1.75rem' }],
      },
      minHeight: {
        'touch': '44px', // Minimum touch target size (Apple HIG)
        'touch-lg': '48px', // Larger touch targets
      },
      minWidth: {
        'touch': '44px',
        'touch-lg': '48px',
      },
    },
  },
  plugins: [],
}
