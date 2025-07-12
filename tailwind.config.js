/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'aws-orange': '#FF9900',
        'aws-blue': '#232F3E',
        'aws-light-blue': '#4B9CD3',
      },
    },
  },
  plugins: [],
};