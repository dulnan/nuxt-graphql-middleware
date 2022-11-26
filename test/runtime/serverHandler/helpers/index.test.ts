import { describe, expect, test } from 'vitest'
import { GraphqlMiddlewareOperation } from './../../../../src/types'
import {
  queryParamToVariables,
  getEndpoint,
  validateRequest,
} from './../../../../src/runtime/serverHandler/helpers'

describe('queryParamToVariables', () => {
  test('returns the JSON stringified variables if they exist', () => {
    expect(
      queryParamToVariables({
        __variables: JSON.stringify({ one: 'one', two: 'two' }),
      }),
    ).toEqual({ one: 'one', two: 'two' })
  })

  test('returns the variables from the params', () => {
    expect(queryParamToVariables({ one: 'one', two: 'two' })).toEqual({
      one: 'one',
      two: 'two',
    })
  })
})

describe('getEndpoint', () => {
  test('returns the string endpoint from the module config', () => {
    expect(
      getEndpoint(
        {
          graphqlEndpoint: 'http://example.com/graphql',
        },
        null as any,
        GraphqlMiddlewareOperation.Query,
        'test',
      ),
    ).toEqual('http://example.com/graphql')
  })

  test('returns the endpoint from the callback in module config', () => {
    expect(
      getEndpoint(
        {
          graphqlEndpoint: function () {
            return 'http://foobar.com/graphql'
          },
        },
        null as any,
        GraphqlMiddlewareOperation.Query,
        'test',
      ),
    ).toEqual('http://foobar.com/graphql')
  })

  test('throws an error if the callback did not return an endpoint', () => {
    expect(() =>
      getEndpoint(
        {
          graphqlEndpoint: function () {
            return null as any
          },
        },
        null as any,
        GraphqlMiddlewareOperation.Query,
        'test',
      ),
    ).toThrowError('Failed to determine endpoint for GraphQL server.')
  })

  test('throws an error if the callback did not return a string', () => {
    expect(() =>
      getEndpoint(
        {
          graphqlEndpoint: function () {
            return true as any
          },
        },
        null as any,
        GraphqlMiddlewareOperation.Query,
        'test',
      ),
    ).toThrowError('Failed to determine endpoint for GraphQL server.')
  })
})

describe('validateRequest', () => {
  const documents = {
    query: {
      one: 'query one { }',
    },
    mutation: {
      two: 'mutation two { }',
    },
  }

  test('validates HTTP methods', () => {
    expect(
      validateRequest(
        'GET',
        GraphqlMiddlewareOperation.Query,
        'one',
        documents,
      ),
    ).toBeUndefined()

    expect(() =>
      validateRequest(
        'OPTIONS',
        GraphqlMiddlewareOperation.Mutation,
        'two',
        documents,
      ),
    ).toThrowError('Method not allowed')
  })

  test('validates valid operations', () => {
    expect(() =>
      validateRequest('GET', 'invalid' as any, 'one', documents),
    ).toThrowError('Unknown operation')
    expect(() =>
      validateRequest('GET', '' as any, 'two', documents),
    ).toThrowError('Unknown operation')
  })

  test('validates valid operation and method combinations', () => {
    expect(() =>
      validateRequest(
        'POST',
        GraphqlMiddlewareOperation.Query,
        'one',
        documents,
      ),
    ).toThrowError('Queries must be a GET request')

    expect(() =>
      validateRequest(
        'GET',
        GraphqlMiddlewareOperation.Mutation,
        'one',
        documents,
      ),
    ).toThrowError('Mutations must be a POST request')

    expect(
      validateRequest(
        'POST',
        GraphqlMiddlewareOperation.Mutation,
        'two',
        documents,
      ),
    ).toBeUndefined()

    expect(
      validateRequest(
        'GET',
        GraphqlMiddlewareOperation.Query,
        'one',
        documents,
      ),
    ).toBeUndefined()
  })

  test('documents are provided', () => {
    expect(() =>
      validateRequest('GET', GraphqlMiddlewareOperation.Query, 'one'),
    ).toThrowError('Failed to load GraphQL documents')
  })

  test('a valid name is provided', () => {
    expect(() =>
      validateRequest('GET', GraphqlMiddlewareOperation.Query),
    ).toThrowError('Missing name for operation')

    expect(() =>
      validateRequest(
        'GET',
        GraphqlMiddlewareOperation.Query,
        'foobar',
        documents,
      ),
    ).toThrowError('Operation "query" with name "foobar" not found.')
  })
})
