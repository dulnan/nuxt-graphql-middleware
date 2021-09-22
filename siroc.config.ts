import { defineSirocConfig } from 'siroc'
import conditionalFsEventsImport from './build-plugins/conditional-fsevents-import'

export default defineSirocConfig({
  rollup: {
    externals: ['fsevents'],
  },
  hooks: {
    'build:extendRollup': (pkg, options) => {
      options.rollupConfig[0].plugins = [
        conditionalFsEventsImport(),
        ...(options.rollupConfig[0].plugins as any),
      ]

      return { options } as any
    },
  },
})
