import type { GeneratorOutput } from 'graphql-typescript-deluxe'
import { defineGeneratorTemplate } from './../defineTemplate'
import { getUploadMutations } from './../../helpers'
import type { ModuleHelper } from '../../ModuleHelper'
import type { Collector } from '../../Collector'

function getNames(
  output: GeneratorOutput,
  helper: ModuleHelper,
  collector: Collector,
): string[] {
  if (!helper.options.enableFileUploads) {
    return []
  }

  return getUploadMutations(
    collector.getSchema(),
    output.getCollectedOperations(),
    helper.options.fileUploadScalar,
  )
}

/**
 * The names of the mutations that can be performed via the upload endpoint.
 */
export default defineGeneratorTemplate(
  { path: 'nuxt-graphql-middleware/upload-mutations', context: 'both' },
  (output, helper, collector) => {
    const names = getNames(output, helper, collector)
    return `export const uploadMutations = ${JSON.stringify(names, null, 2)}`
  },
  (output, helper, collector) => {
    const names = getNames(output, helper, collector)
    const union = names.map((name) => JSON.stringify(name)).join(' | ')
    return `import type { Mutation } from './operation-types'

export declare const uploadMutations: string[]

/**
 * The names of the mutations with file variables.
 */
export type UploadMutationName = Extract<keyof Mutation, ${union || 'never'}>
`
  },
)
