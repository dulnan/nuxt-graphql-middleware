/* eslint-disable */
module.exports = {
  plugins: {
    'postcss-import': {},
    'postcss-nested-import': {},
    'tailwindcss/nesting': {},
    'postcss-url': {},
    tailwindcss: {},
    // cssnano: {
    //   preset: 'default',
    // },
    'postcss-replace': {
      pattern: /(--tw|\*, ::before, ::after)/g,
      data: {
        '--tw': '--ngm-tw',
        '*, ::before, ::after': ':root',
      },
    },
    // Prefix all selectors to scope styles to .ngm-root
    'postcss-prefix-selector': {
      prefix: '.ngm-root',
      transform: (prefix, selector) => {
        if (selector === ':root' || selector === 'html' || selector === 'body')
          return '.ngm-root'
        if (selector.startsWith('.ngm-root')) return selector
        return `${prefix} ${selector}`
      },
    },
    // Minify
    cssnano: {
      preset: [
        'default',
        {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
        },
      ],
    },
  },
}
