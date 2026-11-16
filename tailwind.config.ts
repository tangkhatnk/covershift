import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#ecfdf5', 100: '#d1fae5', 600: '#047857', 700: '#065f46', 800: '#064e3b' },
      },
    },
  },
  plugins: [],
} satisfies Config;
