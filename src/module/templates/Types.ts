export default function () {
  return `declare module '#nuxt-graphql-middleware/sources' {
  export const operationSources: Record<string, string>
}`
}
