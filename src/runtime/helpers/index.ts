/**
 * Type check for falsy values.
 *
 * Used as the callback for array.filter, e.g.
 * items.filter(falsy)
 */
export function falsy<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

/**
 * Get the parameters for the GraphQL middleware query.
 */
export function buildRequestParams(
  variables?: Record<string, any> | undefined | null,
): Record<string, any> {
  if (!variables) {
    return {}
  }
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
