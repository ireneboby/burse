/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1B2541",
          light: "#2D4263",
        },
        copper: {
          DEFAULT: "#C27C4E",
          light: "#F3E4D6",
          dark: "#A36840",
        },
        background: "#FAF8F5",
        surface: "#FFFFFF",
        text: {
          DEFAULT: "#1A1A2E",
          muted: "#7C7C8A",
        },
        border: "#E8E3DD",
        success: "#16803C",
        warning: "#B45309",
        danger: "#BE2D2D",
      },
      fontFamily: {
        sans: ["DMSans_400Regular"],
        "sans-medium": ["DMSans_500Medium"],
        "sans-bold": ["DMSans_700Bold"],
      },
    },
  },
  plugins: [],
};
