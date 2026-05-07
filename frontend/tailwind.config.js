/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        night: {
          bg: '#0d0d1a',
          surface: '#16162a',
          card: '#1e1e33',
          border: '#2a2a4a',
        },
        day: {
          bg: '#fdf6e3',
          surface: '#fffbf0',
          card: '#fff8e7',
          border: '#e8d5a3',
        },
        mafia: {
          red: '#c0392b',
          darkred: '#922b21',
          glow: '#e74c3c',
        },
        town: {
          gold: '#f0a500',
          amber: '#d4821a',
          warm: '#c8860a',
        },
        detective: '#3498db',
        doctor: '#27ae60',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Cinzel Decorative"', '"Playfair Display"', 'serif'],
      },
      animation: {
        'star-twinkle': 'twinkle 3s infinite alternate',
        'float-up': 'floatUp 0.5s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'card-flip': 'cardFlip 0.6s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in',
      },
      keyframes: {
        twinkle: {
          '0%': { opacity: '0.3', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1.2)' },
        },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(192,57,43,0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(192,57,43,0.9)' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
