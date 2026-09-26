const defaultTheme = require('tailwindcss/defaultTheme');

// Dawn sets the root font size to 62.5% (1rem = 10px), while Tailwind's
// default scale assumes 1rem = 16px. Rescale rem values by 1.6 so every class
// keeps its documented size (tw-4 = 16px, tw-text-base = 16px) and still
// follows the merchant's body font scale setting like the rest of Dawn.
const toDawnRem = (value) =>
  value.replace(/(-?[\d.]+)rem/g, (_, number) => `${parseFloat((number * 1.6).toFixed(4))}rem`);

const rescale = (scale) =>
  Object.fromEntries(
    Object.entries(scale).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? [toDawnRem(value[0]), Object.fromEntries(Object.entries(value[1]).map(([k, v]) => [k, toDawnRem(v)]))]
        : toDawnRem(value),
    ])
  );

/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tw-',
  corePlugins: {
    preflight: false,
  },
  content: [
    './layout/**/*.liquid',
    './templates/**/*.liquid',
    './templates/**/*.json',
    './sections/**/*.liquid',
    './snippets/**/*.liquid',
    './blocks/**/*.liquid',
    './assets/**/*.js',
  ],
  theme: {
    spacing: rescale(defaultTheme.spacing),
    fontSize: rescale(defaultTheme.fontSize),
    lineHeight: rescale(defaultTheme.lineHeight),
    borderRadius: rescale(defaultTheme.borderRadius),
    extend: {
      fontFamily: {
        body: 'var(--font-body-family)',
        figma: ['"Balsamiq Sans"', 'sans-serif'],
      },
      // Dawn color scheme tokens (comma-separated RGB channels), plus the Figma redesign palette.
      colors: {
        foreground: 'rgba(var(--color-foreground), <alpha-value>)',
        background: 'rgba(var(--color-background), <alpha-value>)',
        figma: {
          ink: '#1E1E1E',
          muted: '#757575',
          line: '#B3B3B3',
          'line-soft': '#E6E6E6',
          panel: '#F5F5F5',
          dot: '#D9D9D9',
          stroke: '#2C2C2C',
          brand: '#5900FF',
          warn: '#E5A000',
          'warn-soft': '#FFF1C2',
        },
      },
      // Figma text styles (desktop / mobile). Values in Dawn rem (1rem = 10px).
      fontSize: {
        'figma-h5': ['3.2rem', { lineHeight: '4.2rem' }],
        'figma-h5-mobile': ['2.2rem', { lineHeight: '2.9rem' }],
        'figma-h6': ['2.4rem', { lineHeight: '3.4rem' }],
        'figma-body': ['1.6rem', { lineHeight: '2.6rem', letterSpacing: '0.01em' }],
        'figma-body-mobile': ['1.4rem', { lineHeight: '2.2rem', letterSpacing: '0.01em' }],
        'figma-small': ['1.4rem', { lineHeight: '2.2rem', letterSpacing: '0.01em' }],
        'figma-small-mobile': ['1.2rem', { lineHeight: '1.9rem', letterSpacing: '0.01em' }],
        'figma-button': ['1.6rem', { lineHeight: '2rem', letterSpacing: '0.02em' }],
        'figma-button-small': ['1.4rem', { lineHeight: '2rem', letterSpacing: '0.02em' }],
      },
      // Dawn's breakpoints (see theme analysis), so tw- responsive classes switch where Dawn does.
      screens: {
        tablet: '750px',
        desktop: '990px',
        'below-desktop': { max: '989px' },
      },
    },
  },
  plugins: [],
}
