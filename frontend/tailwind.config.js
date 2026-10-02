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
          driving: "#F59E0B",  // Amber
          onduty: "#10B981",   // Emerald
          ink: "#1d4ed8",      // Royal Blue ink for paper log
          paper: "#fcfbf7",    // Authentic paper off-white
        }
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        display: ['"Space Grotesk"', '"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        handwriting: ['"Caveat"', "cursive"],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'paper': '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
