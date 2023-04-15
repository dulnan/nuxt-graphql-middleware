import { GraphqlMiddlewareDocument } from './types'

// rpc-types.ts
export interface ServerFunctions {
  getMyModuleOptions(): any
  getDocuments(): GraphqlMiddlewareDocument[]
}

export interface ClientFunctions {
  showNotification(message: string): void
  documentsUpdated(documents: GraphqlMiddlewareDocument[]): void
}
