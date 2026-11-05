import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17191C',
        muted: '#596069',
        line: '#DCDED9',
        paper: '#F3F4F1',
        brand: {
          DEFAULT: '#2149B0',
          dark: '#16337E',
          soft: '#E6ECFA',
        },
      },
    },
  },
  plugins: [],
};

export default config;
