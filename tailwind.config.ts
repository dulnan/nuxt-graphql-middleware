import type { Config } from 'tailwindcss'
import {
  scopedPreflightStyles,
  isolateInsideOfContainer,
} from 'tailwindcss-scoped-preflight'

const config: Config = {
  content: ['./src/runtime/components/*.vue'],
  theme: {
    extend: {},
  },
  plugins: [
    scopedPreflightStyles({
      isolationStrategy: isolateInsideOfContainer('#nuxt-graphql-middleware'),
    }),
  ],
}

export default config
