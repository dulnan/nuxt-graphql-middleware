import { defineGeneratorTemplate } from './../defineTemplate'

/**
 * Contains the JS (enums).
 */
export default defineGeneratorTemplate(
  { path: 'graphql-operations/index' },
  (output) => {
    const typesFile = output.getOperations('js')
    return typesFile.getSource()
  },
  (output) => {
    const typesFile = output.getOperations('d.ts')
    return typesFile.getSource()
  },
)
