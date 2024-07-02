export type GraphqlResponseErrorLocation = {
  line: number
  column: number
}

export type GraphqlResponseError = {
  message: string
  locations: GraphqlResponseErrorLocation[]
  path: string[]
}

// Type for the query or mutation responses.
export type GraphqlServerResponse<T> = {
  data: T
  errors: GraphqlResponseError[]
}
