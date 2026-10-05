export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdcff',
          300: '#8ec6ff',
          400: '#59a5ff',
          500: '#3384fc',
          600: '#1f64f1',
          700: '#184fde',
          800: '#1a41b4',
          900: '#1b3b8e',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.05), 0 12px 28px -20px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
};
