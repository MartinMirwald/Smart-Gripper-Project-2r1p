/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6', // blue-500
          dark: '#1E40AF',    // blue-800
          light: '#BFDBFE',   // blue-200
        },
        secondary: {
          DEFAULT: '#10B981', // emerald-500
          dark: '#065F46',    // emerald-800
          light: '#A7F3D0',   // emerald-200
        },
        background: '#F9FAFB', // gray-50
        card: '#FFFFFF',
        text: {
          primary: '#111827',  // gray-900
          secondary: '#6B7280' // gray-500
        }
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      },
      borderRadius: {
        'card': '0.5rem'
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}
