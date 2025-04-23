module.exports = {
  content: [
    "./**/*.{html,js}",
    // Add all files that contain Tailwind classes
  ],
  important: true, // Forces Tailwind to override other styles
  theme: {
    extend: {
      transitionTimingFunction: {
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    },
  },
  plugins: [],
}