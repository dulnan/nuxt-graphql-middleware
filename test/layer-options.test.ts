import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PLAYGROUND_LAYERS_DIR = join(
  process.cwd(),
  'playground-layers/.nuxt/nuxt-graphql-middleware',
)

const PLAYGROUND_DIR = join(
  process.cwd(),
  'playground/.nuxt/nuxt-graphql-middleware',
)

function readGenerated(dir: string, file: string): string {
  return readFileSync(join(dir, file), 'utf-8')
}

/**
 * @see https://github.com/dulnan/nuxt-graphql-middleware/issues/81
 */
describe('Layer options discovery', () => {
  test('playground-layers: server options are found from the layer', () => {
    const content = readGenerated(PLAYGROUND_LAYERS_DIR, 'server-options.js')
    expect(content).toContain(
      "import serverOptions from '../../layers/test-layer/server/graphqlMiddleware.serverOptions.ts'",
    )
  })

  test('playground-layers: client options are found from the layer', () => {
    const content = readGenerated(PLAYGROUND_LAYERS_DIR, 'client-options.js')
    expect(content).toContain(
      "import clientOptions from '../../layers/test-layer/app/graphqlMiddleware.clientOptions.ts'",
    )
  })

  test('playground: server options are found from the main app (no layers involved)', () => {
    const content = readGenerated(PLAYGROUND_DIR, 'server-options.js')
    expect(content).toContain(
      "import serverOptions from '../../server/graphqlMiddleware.serverOptions.ts'",
    )
  })

  test('playground: client options are found from the main app', () => {
    const content = readGenerated(PLAYGROUND_DIR, 'client-options.js')
    expect(content).toContain(
      "import clientOptions from '../../app/graphqlMiddleware.clientOptions",
    )
  })
})
