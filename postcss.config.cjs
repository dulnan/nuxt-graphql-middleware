/* eslint-disable */

/**
 * Tailwind puts preflight and the property fallbacks into cascade layers.
 * Layered styles lose against any unlayered styles of the app, so the layers
 * are removed and their contents are moved to the start.
 */
const unwrapCascadeLayers = () => ({
  postcssPlugin: 'unwrap-cascade-layers',
  OnceExit(root) {
    const nodes = []
    root.each((node) => {
      if (node.type === 'atrule' && node.name === 'layer') {
        if (node.nodes) {
          nodes.push(...node.nodes)
        }
        node.remove()
      }
    })
    root.prepend(nodes)
  },
})
unwrapCascadeLayers.postcss = true

module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    // Flatten nested rules before the selectors are prefixed. The package is
    // ESM only, so the plugin is the default export.
    require('postcss-nested').default,
    unwrapCascadeLayers,
    require('postcss-url'),
    require('postcss-replace')({
      pattern: /(--tw|\*, ::before, ::after)/g,
      data: {
        '--tw': '--ngm-tw',
        '*, ::before, ::after': ':root',
      },
    }),
    // Prefix all selectors to scope styles to .ngm-root
    require('postcss-prefix-selector')({
      prefix: '.ngm-root',
      transform: (prefix, selector) => {
        if (selector === ':root' || selector === 'html' || selector === 'body')
          return '.ngm-root'
        if (selector.startsWith('.ngm-root')) return selector
        return `${prefix} ${selector}`
      },
    }),
    // Minify
    require('cssnano')({
      preset: [
        'default',
        {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
        },
      ],
    }),
  ],
}
