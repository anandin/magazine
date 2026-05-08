import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      colors: {
        ink: "#1a1a1a",
        paper: "#fbfaf6",
        rule: "#d8d4c5",
        accent: "#a8321e",
      },
    },
  },
  plugins: [],
};

export default config;
