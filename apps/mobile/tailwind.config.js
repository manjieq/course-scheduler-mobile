/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  // Light/dark theming (must-preserve from the rebuild brief) uses NativeWind's
  // `dark:` variant, driven by the OS color scheme by default.
  darkMode: 'media',
  plugins: [],
};
