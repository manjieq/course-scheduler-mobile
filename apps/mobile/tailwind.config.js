/** @type {import('tailwindcss').Config} */
module.exports = {
  // `./src` never existed in this app (leftover from an early scaffold
  // guess) — `./components` and `./lib` are where Phase 3 actually put
  // NativeWind-styled code outside of `app/`.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './lib/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  // Light/dark theming (must-preserve from the rebuild brief) uses NativeWind's
  // `dark:` variant, driven by the OS color scheme by default.
  darkMode: 'media',
  plugins: [],
};
