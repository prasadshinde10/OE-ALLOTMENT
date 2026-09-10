import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#E6F0F2',
          100: '#C0D8DC',
          200: '#8BB8C0',
          300: '#5A9AA6',
          400: '#347F8C',
          500: '#1A6E7E',
          600: '#0E4C5C',
          700: '#0A3B48',
          800: '#072D36',
          900: '#041E24',
        },
        accent: {
          50: '#FFF3E8',
          100: '#FDDCBB',
          200: '#F5BF8E',
          300: '#F09A5A',
          400: '#EC8944',
          500: '#E8792E',
          600: '#D06520',
          700: '#B85418',
          800: '#9A4412',
          900: '#7C350D',
        },
        neutral: {
          50: '#F5F7F8',
          100: '#E8ECEE',
          200: '#D1D7DA',
          300: '#B0BAC0',
          400: '#8A959C',
          500: '#6B7880',
          600: '#4F5C64',
          700: '#4A5568',
          800: '#2D3B44',
          900: '#1A2B31',
        },
      },
    },
  },
  plugins: [],
};

export default config;
