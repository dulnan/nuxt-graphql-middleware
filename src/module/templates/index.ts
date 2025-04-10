import type { ModuleTemplate } from './defineTemplate'
import ClientOptions from './definitions/client-options'
import Documents from './definitions/documents'
import GraphqlConfig from './definitions/graphql.config'
import Helpers from './definitions/helpers'
import NitroTypes from './definitions/nitro'
import OperationTypesAll from './definitions/operation-types'
import Operations from './definitions/operations'
import Response from './definitions/response'
import ServerOptions from './definitions/server-options'
import Sources from './definitions/sources'

export const TEMPLATES: ModuleTemplate[] = [
  ClientOptions,
  Documents,
  GraphqlConfig,
  Helpers,
  NitroTypes,
  OperationTypesAll,
  Operations,
  Response,
  ServerOptions,
  Sources,
]
