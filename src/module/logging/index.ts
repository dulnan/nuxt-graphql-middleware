import { type GraphQLError, printSourceLocation } from 'graphql'
import colors from 'picocolors'
import { logger } from '../../helpers'

export const SYMBOL_CROSS = 'x'
export const SYMBOL_CHECK = '✔'

type MaxLengths = {
  name: number
  path: number
  type: number
}

export type LogEntry = {
  name: string
  type: string
  path: string
  errors: readonly GraphQLError[]
}

function getMaxLengths(entries: LogEntry[]): MaxLengths {
  let name = 0
  let path = 0
  let type = 0

  for (const entry of entries) {
    if (entry.type.length > type) {
      type = entry.type.length
    }
    if (entry.name.length > name) {
      name = entry.name.length
    }
    if (entry.path.length > path) {
      path = entry.path.length
    }
  }
  return { name, path, type }
}

export function logAllEntries(entries: LogEntry[]) {
  const lengths = getMaxLengths(entries)
  let prevHadError = false
  for (const entry of entries) {
    const hasErrors = entry.errors.length > 0
    const icon = hasErrors
      ? colors.red(SYMBOL_CROSS)
      : colors.green(SYMBOL_CHECK)
    const type = entry.type.padEnd(lengths.type)
    const namePadded = colors.bold(entry.name.padEnd(lengths.name))
    const name = hasErrors ? colors.red(namePadded) : colors.green(namePadded)
    const path = colors.dim(entry.path)
    const parts: string[] = [icon, type, name, path]
    if (hasErrors && !prevHadError) {
      process.stdout.write('-'.repeat(process.stdout.columns) + '\n')
    }
    logger.log(parts.join(' | '))
    if (hasErrors) {
      const errorLines: string[] = []
      entry.errors.forEach((error) => {
        let output = colors.red(error.message)
        if (error.source && error.locations) {
          for (const location of error.locations) {
            output +=
              '\n\n' + colors.red(printSourceLocation(error.source, location))
          }
        }
        errorLines.push(output)
      })

      logger.log(
        errorLines
          .join('\n')
          .split('\n')
          .map((v) => '    ' + v)
          .join('\n'),
      )
      process.stdout.write('-'.repeat(process.stdout.columns) + '\n')
    }

    prevHadError = hasErrors
  }

  logger.restoreStd()
}
