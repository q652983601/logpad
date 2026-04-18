import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#12121a',
        'surface-2': '#1a1a25',
        'surface-3': '#222233',
        border: 'rgba(255,255,255,0.06)',
        text: '#f0f0f5',
        'text-2': '#a0a0b0',
        'text-3': '#606070',
        accent: '#6366f1',
        'accent-2': '#a855f7',
        green: '#22c55e',
        orange: '#f59e0b',
      },
    },
  },
  plugins: [],
}
export default config
