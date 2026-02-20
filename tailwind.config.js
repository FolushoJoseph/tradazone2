/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3C3CEF',
          dark: '#2E2ED4',
          light: '#5A5AF5',
          bg: '#EDEDFD',
        },
        accent: {
          orange: '#F5A623',
          blue: '#3C3CEF',
        },
        page: '#F8FAFC',
        sidebar: '#FFFFFF',
        't-primary': '#1E293B',
        't-secondary': '#64748B',
        't-muted': '#94A3B8',
        't-light': '#CBD5E1',
        border: {
          DEFAULT: '#E2E8F0',
          medium: '#CBD5E1',
        },
        success: { DEFAULT: '#10B981', bg: '#D1FAE5' },
        warning: { DEFAULT: '#F59E0B', bg: '#FEF3C7' },
        error: { DEFAULT: '#EF4444', bg: '#FEE2E2' },
        info: { DEFAULT: '#3B82F6', bg: '#DBEAFE' },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      spacing: {
        'sidebar': '240px',
        'header': '64px',
      },
      borderRadius: {
        'card': '12px',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
    },
  },
  plugins: [],
}
