/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f6f1e8',
        ink: '#241f1a',
        muted: '#6e655c',
        sage: {
          DEFAULT: '#3c6b54',
          deep: '#244434',
          soft: '#e7f2eb',
        },
        clay: {
          DEFAULT: '#c46a4a',
          deep: '#8d4330',
          soft: '#f8ebe6',
        },
        line: '#e6ddd0',
        card: '#fffcf7',
      },
      fontFamily: {
        sans: ['Outfit', 'Avenir Next', 'Segoe UI', 'sans-serif'],
        serif: ['Fraunces', 'Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 12px 32px rgba(36, 31, 26, 0.06)',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        marquee: 'marquee 120s linear infinite',
        rise: 'rise 0.45s ease-out',
      },
    },
  },
  plugins: [],
};
