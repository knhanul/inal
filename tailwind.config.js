/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        inal: {
          bg: 'var(--inal-bg)',
          surface: 'var(--inal-surface)',
          surfaceSubtle: 'var(--inal-surface-subtle)',
          text: 'var(--inal-text)',
          textMuted: 'var(--inal-text-muted)',
          textSoft: 'var(--inal-text-soft)',
          border: 'var(--inal-border)',
          accent: 'var(--inal-accent)',
          accentSoft: 'var(--inal-accent-soft)',
          sunny: 'var(--inal-weather-sunny)',
          cloudy: 'var(--inal-weather-cloudy)',
          rain: 'var(--inal-weather-rain)',
          snow: 'var(--inal-weather-snow)',
        },
      },
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 8px 24px -6px rgba(34, 32, 29, 0.06), 0 2px 6px -1px rgba(34, 32, 29, 0.04)',
        sheet: '0 -10px 32px rgba(24, 22, 19, 0.14)',
      },
      borderRadius: {
        card: '1.25rem',
      },
    },
  },
  plugins: [],
};
