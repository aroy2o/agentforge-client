/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontSize: {
                '11': ['11px', { lineHeight: '1.5' }],
                '12': ['12px', { lineHeight: '1.5' }],
                '13': ['13px', { lineHeight: '1.5' }],
                '14': ['14px', { lineHeight: '1.5' }],
                '15': ['15px', { lineHeight: '1.5' }],
                '20': ['20px', { lineHeight: '1.5' }],
            },
            colors: {
                'accent-cyan': '#00d4ff',
                'accent-purple': '#a78bfa',
                'accent-amber': '#f59e0b',
                'accent-green': '#34d399',
                'accent-pink': '#f472b6',
                'surface-base': '#080c14',
                'surface-elevated': '#111827',
                'surface-overlay': '#1a2333',
            }
        },
    },
    plugins: [],
}
