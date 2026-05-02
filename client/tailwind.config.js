/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6ff',
          100: '#d9eaff',
          200: '#bcd9ff',
          300: '#8ec0ff',
          400: '#5a9cff',
          500: '#3478f6',
          600: '#225aeb',
          700: '#1c47c4',
          800: '#1c3d9c',
          900: '#1d397c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(34, 90, 235, 0.25)',
      },
    },
  },
  plugins: [],
};
