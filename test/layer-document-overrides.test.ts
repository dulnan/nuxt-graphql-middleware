import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PLAYGROUND_LAYERS_NUXT_DIR = join(
  process.cwd(),
  'playground-layers/.nuxt',
)

function readGenerated(file: string): string {
  return readFileSync(join(PLAYGROUND_LAYERS_NUXT_DIR, file), 'utf-8')
}

/**
 * The app (or a higher-priority layer) can override a fragment or operation
 * defined in a lower-priority layer by defining one with the same name. The
 * definition from the highest-priority layer wins, the shadowed definitions
 * are excluded instead of failing with a duplicate-name error.
 */
describe('Layer document overrides', () => {
  test('a fragment defined in the app overrides the layer fragment with the same name', () => {
    const content = readGenerated('graphql-operations/index.d.ts')

    // The app fragment aliases the field: appOverride: text
    expect(content).toContain('appOverride?: string')

    // The layer's version of the fragment (plain "text" field) must not be
    // part of the generated fragment type.
    const fragmentType = content.match(
      /export type DataForLayerFragment = \{[^}]*\}/,
    )?.[0]
    expect(fragmentType).toBeDefined()
    expect(fragmentType).toContain('appOverride')
    expect(fragmentType).not.toContain('text?')
  })

  test('the layer operation using the overridden fragment is kept', () => {
    const content = readGenerated('nuxt-graphql-middleware/sources.js')

    // The layerData query itself is not overridden and still originates from
    // the layer, while using the app's version of the fragment.
    expect(content).toContain(
      "query_layerData: 'layers/test-layer/app/pages/query.layerData.graphql'",
    )
  })

  test('an operation defined in the app overrides the layer operation with the same name', () => {
    const content = readGenerated('nuxt-graphql-middleware/sources.js')

    expect(content).toContain(
      "query_layerOverridable: 'app/pages/query.layerOverridable.graphql'",
    )
    expect(content).not.toContain(
      "query_layerOverridable: 'layers/test-layer/app/pages/query.layerOverridable.graphql'",
    )
  })
})
