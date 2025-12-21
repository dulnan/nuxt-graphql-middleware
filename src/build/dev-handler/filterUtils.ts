/**
 * Creates a filter function that matches names against a pattern.
 * The pattern is treated as a regex - if invalid regex, falls back to substring matching.
 *
 * @param pattern - A regex pattern string to match against names
 * @returns A function that returns true if the name matches the pattern
 */
export function createNameFilter(pattern: string): (name: string) => boolean {
  try {
    const regex = new RegExp(pattern)
    return (name: string) => regex.test(name)
  } catch {
    // If invalid regex, treat as plain substring match
    return (name: string) => name.includes(pattern)
  }
}
