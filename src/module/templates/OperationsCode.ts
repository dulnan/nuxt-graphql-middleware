import type { GeneratorOutput } from 'graphql-typescript-deluxe'

export default function (generatorOutput: GeneratorOutput) {
  const typesFile = generatorOutput.getOperations('js')
  return typesFile.getSource()
}
