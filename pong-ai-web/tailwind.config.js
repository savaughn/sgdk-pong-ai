/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'retro-green': '#00ff41',
        'retro-amber': '#ffb000',
        'retro-blue': '#0080ff',
        'genesis-purple': '#8b5cf6',
        'ai-cyan': '#06b6d4'
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Monaco', 'Courier New', 'monospace'],
        'retro': ['Press Start 2P', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        glow: {
          'from': { 'box-shadow': '0 0 5px #00ff41, 0 0 10px #00ff41, 0 0 15px #00ff41' },
          'to': { 'box-shadow': '0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41' }
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    },
  },
  plugins: [],
}
