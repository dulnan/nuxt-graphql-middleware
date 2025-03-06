export type RpcItem = {
  id: string
  timestamp?: number
  source: string
  name: string
  identifier: 'fragment' | 'query' | 'mutation'
  filePath: string
}

// rpc-types.ts
export interface ServerFunctions {
  getModuleOptions(): any
  getDocuments(): RpcItem[]
}

export interface ClientFunctions {
  showNotification(message: string): void
  documentsUpdated(documents: RpcItem[]): void
}
