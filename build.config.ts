import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  // declaration: true,
  emitCJS: false,
  cjsBridge: true,
  entries: ['src/module', 'src/templates/plugin'],
  externals: [
    '@types/express-serve-static-core',
    '@nuxt/kit-edge',
    '@nuxt/types',
  ],
})
