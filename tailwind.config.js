/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a'
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626'
        }
      },
      width: {
        'popup': '380px'
      },
      height: {
        'popup': '600px'
      }
    },
  },
  plugins: [],
  darkMode: 'class'
};
