import type { GraphqlMiddlewareDocument } from '../types'
import colors from 'picocolors'
import { useLogger } from '@nuxt/kit'


function getMaxLengths(documents: GraphqlMiddlewareDocument[]) {
  let longestOperation = 0
  let longestName = 0
  let longestPath = 0

  for (const { operation, name, relativePath } of documents) {
    if (operation && operation.length > longestOperation) {
      longestOperation = operation.length
    }
    if (name && name.length > longestName) {
      longestName = name.length
    }
    if (relativePath && relativePath.length > longestPath) {
      longestPath = relativePath.length
    }
  }
  return { longestOperation, longestName, longestPath }
}

export function logDocuments(logger: ReturnType<typeof useLogger>, documents: GraphqlMiddlewareDocument[], logEverything: boolean) {
  const { longestOperation, longestName, longestPath } = getMaxLengths(documents)

  logger.log(colors.green('GraphQL Document Validation'))

  for (const { operation, name, relativePath, isValid, errors } of documents) {
    if (logEverything || !isValid) {
      let log = ''
      log += (operation || '').padEnd(longestOperation + 2)
      log += colors.cyan((name || '').padEnd(longestName + 2))
      log += colors.dim((relativePath || '').padEnd(longestPath + 2))
      log += isValid ? colors.green('✓') : colors.red('x')
      if (!isValid && errors) {
        log += '\n' + errors.map((error) => colors.red(error as any)).join('\n')
      }
      logger.log(log)
    }
  }

  process.stdout.write('\n')
  logger.restoreStd()

  if (documents.some((v) => !v.isValid)) {
    logger.error('GraphQL document validation failed with errors.')
  } else {
    logger.success('GraphQL document validation completed successfully.')
  }
}

