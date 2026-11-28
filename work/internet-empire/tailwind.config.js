/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        win95: ['"MS Sans Serif"', "Tahoma", "Arial", "sans-serif"],
        dotcom: ['"Trebuchet MS"', "Verdana", "sans-serif"],
        web2: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};