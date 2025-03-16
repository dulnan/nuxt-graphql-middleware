import type { GeneratorOutput } from 'graphql-typescript-deluxe'

export default function (generatorOutput: GeneratorOutput) {
  const typesFile = generatorOutput.getTypes()
  let output = ''
  const enumImports = typesFile.getTypeScriptEnumDependencies()

  if (enumImports.length) {
    output += `import type { ${enumImports.join(', ')} } from './enums'\n\n`
  }

  output += typesFile.getSource()

  return output
}
