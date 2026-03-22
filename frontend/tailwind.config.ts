import type { Config } from 'tailwindcss'

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "border": "hsl(var(--border))",
                "input": "hsl(var(--input))",
                "ring": "hsl(var(--ring))",
                "background": "hsl(var(--background))",
                "foreground": "hsl(var(--foreground))",
                "primary": {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                "secondary": {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                "destructive": {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                "muted": {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                "accent": {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                "popover": {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                "card": {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                "ir-blue": "#003399",
                "ir-saffron": "#FF9933",
                "ir-gold": "#D4AF37",
                "ir-green": "#138808",
                "background-light": "#f6f6f8",
                "background-dark": "#0a0f1a",
                "slate-custom": "#1e293b",
            },
            fontFamily: {
                "sans": ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
                "display": ["Outfit", "sans-serif"],
                "outfit": ["Outfit", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "3xl": "1.5rem",
                "full": "9999px"
            },
            animation: {
                'shimmer': 'shimmer 2s linear infinite',
                'fade-in': 'fadeIn 0.6s ease-out forwards',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        },
    },
    plugins: [],
} satisfies Config
