import type { ModuleTemplate } from './defineTemplate'
import ClientOptions from './definitions/client-options'
import Config from './definitions/config'
import Documents from './definitions/documents'
import GraphqlConfig from './definitions/graphql.config'
import Helpers from './definitions/helpers'
import HookDocuments from './definitions/hookDocuments'
import HookFiles from './definitions/hook-files'
import NitroTypes from './definitions/nitro'
import OperationHashes from './definitions/operation-hashes'
import OperationTypesAll from './definitions/operation-types'
import Operations from './definitions/operations'
import OperationVariables from './definitions/operation-variables'
import Response from './definitions/response'
import ServerOptions from './definitions/server-options'
import Sources from './definitions/sources'
import Nuxt from './definitions/nuxt'

export const TEMPLATES: ModuleTemplate[] = [
  ClientOptions,
  Config,
  Documents,
  GraphqlConfig,
  Helpers,
  HookDocuments,
  HookFiles,
  NitroTypes,
  OperationHashes,
  OperationTypesAll,
  Operations,
  OperationVariables,
  Response,
  ServerOptions,
  Sources,
  Nuxt,
]
