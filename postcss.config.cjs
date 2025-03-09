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
  },
}
