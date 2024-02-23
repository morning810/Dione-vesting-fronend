/** @type {import('tailwindcss').Config} */

const withMT = require("@material-tailwind/react/utils/withMT");

export default withMT({
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
    colors: {
      "week-white": "#929292",
      "panel-border-gray": "#474747",
      "pink-button-top-color": "#FF409A",
      "pink-button-bottom-color": "#FF409A",
      "explore-sidebar-top-color": "#0D408A30",
      "explore-sidebar-bottom-color": "#05031028"
    }
  },
  plugins: [],
})
