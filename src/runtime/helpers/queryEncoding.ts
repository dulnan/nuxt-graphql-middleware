import { experimentalQueryParamEncoding } from '#nuxt-graphql-middleware/config'
import { CLIENT_CONTEXT_PREFIX, OPERATION_HASH_PREFIX } from '../settings'

export function encodeVariables(
  variables?: Record<string, any> | null,
): Record<string, any> {
  if (typeof variables !== 'object' || !variables) {
    return {}
  }

  // Default behaviour.
  if (!experimentalQueryParamEncoding) {
    // Determine if each variable can safely be passed as query parameter.
    // This is only the case for strings.
    for (const key in variables) {
      if (typeof variables[key] !== 'string') {
        return {
          __variables: JSON.stringify(variables),
        }
      }
    }

    return variables
  }

  // Experimental behaviour.
  const result: Record<string, string> = {}
  let needsFallback = false

  // Check each variable to determine if it can be passed as a query parameter.
  for (const key in variables) {
    const value = variables[key]
    const type = typeof value

    if (type === 'string') {
      result[key] = value
    } else if (type === 'number') {
      result[`n:${key}`] = String(value)
    } else if (type === 'boolean') {
      result[`b:${key}`] = String(value)
    } else {
      // For complex types (objects, arrays, null, undefined), use the fallback
      needsFallback = true
      break
    }
  }

  if (needsFallback) {
    return {
      __variables: JSON.stringify(variables),
    }
  }

  return result
}

function filterValidKeys(
  validKeys: string[],
  obj: Record<string, any>,
): Record<string, any> {
  return validKeys.reduce<Record<string, any>>((acc, key) => {
    const value = obj[key]
    if (value !== undefined && value !== null) {
      acc[key] = value
    }
    return acc
  }, {})
}

/**
 * Get the variables from query parameters.
 *
 * For simple cases with type prefixes:
 * ?name=Jon&n:age=20&b:isUser=false
 *
 * In complex cases, the entire variables are sent as a JSON encoded string:
 * ?__variables=%7B%22foobar%22:%7B%22path%22:%22%22%7D%7D
 */
export function decodeVariables(
  query: Record<string, any>,
  validKeys?: string[],
): Record<string, any> {
  try {
    if (query.__variables && typeof query.__variables === 'string') {
      return sortQueryParams(JSON.parse(query.__variables))
    }
  } catch {
    // Noop.
  }

  if (!experimentalQueryParamEncoding) {
    if (validKeys) {
      return filterValidKeys(validKeys, query)
    }
    return query
  }

  // We can safely return an empty object if the operation does not use any
  // variables.
  if (validKeys && validKeys.length === 0) {
    return {}
  }

  const result: Record<string, any> = {}

  // Process each query parameter
  for (const key in query) {
    if (
      key.startsWith(CLIENT_CONTEXT_PREFIX) ||
      key.startsWith(OPERATION_HASH_PREFIX)
    ) {
      // Skip client context and operation hash.
      continue
    } else if (key.startsWith('n:')) {
      // Handle number type
      const actualKey = key.substring(2)
      if (validKeys && !validKeys.includes(actualKey)) {
        continue
      }
      result[actualKey] = Number(query[key])
    } else if (key.startsWith('b:')) {
      // Handle boolean type
      const actualKey = key.substring(2)
      if (validKeys && !validKeys.includes(actualKey)) {
        continue
      }
      result[actualKey] = query[key] === 'true'
    } else if (key !== '__variables') {
      if (validKeys && !validKeys.includes(key)) {
        continue
      }
      // Regular string values
      result[key] = query[key]
    }
  }

  return sortQueryParams(result)
}

/**
 * Sort an object defining query params alphabetically.
 */
export function sortQueryParams(
  obj: Record<string, string>,
): Record<string, string> {
  const sortedKeys = Object.keys(obj).sort()
  const sortedObj: Record<string, string> = {}

  for (const key of sortedKeys) {
    sortedObj[key] = obj[key]!
  }

  return sortedObj
}
