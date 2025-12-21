import { defineGeneratorTemplate } from './../defineTemplate'

/**
 * Contains the JS (enums).
 */
export default defineGeneratorTemplate(
  { path: 'graphql-operations/index', context: 'both' },
  (output) => {
    const typesFile = output.getOperations('js')
    return typesFile.getSource()
  },
  (output) => {
    const typesFile = output.getOperations('d.ts')
    return typesFile.getSource()
  },
)
