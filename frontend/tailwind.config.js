/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slate: {
          850: "#131d33",
          950: "#0B1220",
        },
        eld: {
          off: "#64748B",      // Slate
          sb: "#6366F1",       // Indigo
          driving: "#F5A524",  // Amber
          onduty: "#14B8A6",   // Teal
          ink: "#1d4ed8",      // Royal Blue ink for paper log
          paper: "#fcfbf7",    // Authentic paper off-white
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        handwriting: ['"Caveat"', "cursive"],
      },
      boxShadow: {
        'glow-amber': '0 0 20px -5px rgba(245, 165, 36, 0.3)',
        'glow-teal': '0 0 20px -5px rgba(20, 184, 166, 0.3)',
        'paper': '0 4px 25px -3px rgba(0, 0, 0, 0.5), 0 2px 10px -2px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
