import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        arena: {
          cyan: 'hsl(var(--arena-cyan))',
          violet: 'hsl(var(--arena-violet))',
          amber: 'hsl(var(--arena-amber))',
          rose: 'hsl(var(--arena-rose))',
          emerald: 'hsl(var(--arena-emerald))',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        glow: '0 0 20px 0 hsl(var(--arena-cyan) / 0.35)',
        'glow-sm': '0 0 10px 0 hsl(var(--arena-cyan) / 0.25)',
        'glow-violet': '0 0 24px 0 hsl(var(--arena-violet) / 0.35)',
        'glow-rose': '0 0 20px 0 hsl(var(--arena-rose) / 0.4)',
        'glow-amber': '0 0 16px 0 hsl(var(--arena-amber) / 0.35)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(calc(100% + 1rem))', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px 0 hsl(var(--arena-cyan) / 0.35)' },
          '50%': { boxShadow: '0 0 24px 2px hsl(var(--arena-cyan) / 0.55)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px)' },
          '75%': { transform: 'translateX(3px)' },
        },
        'shake-hard': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-3px, -1px)' },
          '20%': { transform: 'translate(3px, 1px)' },
          '30%': { transform: 'translate(-3px, 1px)' },
          '40%': { transform: 'translate(3px, -1px)' },
          '50%': { transform: 'translate(-2px, 1px)' },
          '60%': { transform: 'translate(2px, 0)' },
          '70%': { transform: 'translate(-3px, -1px)' },
          '80%': { transform: 'translate(3px, 1px)' },
          '90%': { transform: 'translate(-1px, 0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'pulse-danger': {
          '0%, 100%': {
            color: 'hsl(var(--arena-rose))',
            textShadow: '0 0 16px hsl(var(--arena-rose) / 0.6)',
            transform: 'scale(1)',
          },
          '50%': {
            color: 'hsl(var(--arena-amber))',
            textShadow: '0 0 32px hsl(var(--arena-rose) / 0.95)',
            transform: 'scale(1.08)',
          },
        },
        'hit-flash': {
          '0%': { opacity: '0', transform: 'scale(1.05)' },
          '15%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(1)' },
        },
        'incoming-banner': {
          '0%': { opacity: '0', transform: 'translateY(-30px) scale(0.85)' },
          '15%': { opacity: '1', transform: 'translateY(0) scale(1.04)' },
          '25%': { transform: 'translateY(0) scale(1)' },
          '85%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-12px) scale(0.97)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 200ms ease-out',
        'fade-in': 'fade-in 200ms ease-out',
        'fade-in-up': 'fade-in-up 250ms ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        shake: 'shake 0.4s ease-in-out',
        'shake-hard': 'shake-hard 0.5s ease-in-out',
        scan: 'scan 3s linear infinite',
        'pulse-danger': 'pulse-danger 1s ease-in-out infinite',
        'hit-flash': 'hit-flash 450ms ease-out forwards',
        'incoming-banner': 'incoming-banner 1500ms ease-out forwards',
      },
      backgroundImage: {
        'arena-grid':
          'linear-gradient(to right, hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.6) 1px, transparent 1px)',
        'arena-radial':
          'radial-gradient(ellipse at top, hsl(var(--arena-violet) / 0.15), transparent 60%), radial-gradient(ellipse at bottom, hsl(var(--arena-cyan) / 0.1), transparent 60%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
