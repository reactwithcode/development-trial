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
      // Dawn color scheme tokens are comma-separated RGB channels.
      colors: {
        foreground: 'rgba(var(--color-foreground), <alpha-value>)',
        background: 'rgba(var(--color-background), <alpha-value>)',
      },
      fontFamily: {
        body: 'var(--font-body-family)',
      },
    },
  },
  plugins: [],
}
