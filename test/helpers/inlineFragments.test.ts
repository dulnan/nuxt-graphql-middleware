import path from 'path'
import { describe, expect, test } from 'vitest'
import { inlineFragments } from '../../src/helpers'

describe('inlineFragments', () => {
  test('Inlines fragments', () => {
    const query = `
    #import "~/pages/user/user.fragment.graphql"

    query userById($id: ID!) {
      userById(id: $id) {
        ...user
      }
    }
    `
    const result = inlineFragments(query, () => {
      return path.resolve(
        __dirname,
        './../../playground/pages/user/user.fragment.graphql',
      )
    })

    expect(result).toMatchSnapshot()
  })
})
