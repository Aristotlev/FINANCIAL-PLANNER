module.exports = {
  plugins: {
    tailwindcss: {},
    // Autoprefixer automatically adds vendor prefixes based on .browserslistrc
    autoprefixer: {
      // Enable flexbox prefixes
      flexbox: 'no-2009',
      // Enable grid prefixes
      grid: 'autoplace',
      // Override browserslist if needed (uses .browserslistrc by default)
      // overrideBrowserslist: ['> 0.5%', 'last 2 versions', 'not dead']
    },
  },
}
