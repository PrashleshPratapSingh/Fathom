/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fathom: {
          bg: '#0f1117',
          surface: '#1a1d27',
          border: '#2a2d3a',
          text: '#e2e4eb',
          muted: '#8b8fa3',
          accent: '#7c5cfc',
        },
        node: {
          llm: '#8B5CF6',
          tool: '#3B82F6',
          retrieval: '#06B6D4',
          processing: '#6B7280',
          decision: '#F59E0B',
        },
        verdict: {
          pass: '#22C55E',
          warning: '#F59E0B',
          failure: '#EF4444',
        },
      },
    },
  },
  plugins: [],
}
