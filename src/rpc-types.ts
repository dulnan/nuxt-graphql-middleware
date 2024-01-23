import { type GraphqlMiddlewareDocument } from './types'

// rpc-types.ts
export interface ServerFunctions {
  getModuleOptions(): any
  getDocuments(): GraphqlMiddlewareDocument[]
}

export interface ClientFunctions {
  showNotification(message: string): void
  documentsUpdated(documents: GraphqlMiddlewareDocument[]): void
}
