/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}", "./lib/**/*.js"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#022c65",
          dark: "#0a1526",
          card: "#121f33",
          gray: "#f5f7fa",
        },
        accent: {
          DEFAULT: "#fdaa02",
          hover: "#e09800",
          subtle: "rgba(253,170,2,0.12)",
        },
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(2, 44, 101, 0.2)",
        nav: "0 1px 0 rgba(255,255,255,0.05)",
        cta: "0 4px 20px rgba(253,170,2,0.4)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
}
