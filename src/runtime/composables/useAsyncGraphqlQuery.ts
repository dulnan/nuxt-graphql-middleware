import {
  type GraphqlMiddlewareQueryName,
  type GraphqlResponse,
  type GraphqlResponseError,
  type KeysOf,
  type PickFrom,
} from './shared'
import type { FetchOptions } from 'ofetch'
import { type Ref, isRef, unref } from 'vue'
import { buildRequestParams } from './../helpers'
import { performRequest } from './nuxtApp'
import type { GraphqlMiddlewareQuery } from '#build/nuxt-graphql-middleware'
import type { AsyncData, AsyncDataOptions } from 'nuxt/app'
import { useAsyncData } from '#imports'
import { hash } from 'ohash'

/**
 * Wrapper for useAsyncData to perform a single GraphQL query.
 */
export function useAsyncGraphqlQuery<
  Name extends GraphqlMiddlewareQueryName,
  VarType extends GraphqlMiddlewareQuery[Name][0],
  VarsOptional extends GraphqlMiddlewareQuery[Name][1],
  ResponseType extends GraphqlResponse<GraphqlMiddlewareQuery[Name][2]>,
  F extends FetchOptions<'json'>,
  DefaultT = ResponseType,
  Keys extends KeysOf<DefaultT> = KeysOf<DefaultT>,
>(
  name: Name,
  ...args: VarsOptional extends true
    ? [
        (undefined | null | {} | VarType | Ref<VarType>)?,
        AsyncDataOptions<ResponseType, DefaultT, Keys>?,
        F?,
      ]
    : [
        VarType | Ref<VarType>,
        (undefined | null | AsyncDataOptions<ResponseType, DefaultT, Keys>)?,
        F?,
      ]
): AsyncData<PickFrom<DefaultT, Keys>, GraphqlResponseError[] | null> {
  const variables = args[0]
  const asyncDataOptions = args[1] || {}
  const fetchOptions = args[2] || {}
  const key = `graphql:${name}:${hash(unref(variables))}`

  // If the variables are reactive, watch them.
  if (variables && isRef(variables)) {
    if (!asyncDataOptions.watch) {
      asyncDataOptions.watch = []
    }

    asyncDataOptions.watch.push(variables)
  }

  return useAsyncData(
    key,
    () =>
      performRequest('query', name, 'get', {
        params: buildRequestParams(unref(variables)),
        ...fetchOptions,
      }) as any,
    asyncDataOptions,
  ) as any
}
