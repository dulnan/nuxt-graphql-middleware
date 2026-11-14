import { describe, expect, test } from 'vitest'
import { buildSchema, parse, type OperationDefinitionNode } from 'graphql'
import { getUploadMutations } from '../../src/build/helpers'

const schema = buildSchema(`
  scalar Upload
  scalar File

  input DocumentInput {
    name: String
    file: Upload!
  }

  input FormInput {
    firstName: String
    documents: [DocumentInput]
  }

  input TreeInput {
    name: String
    children: [TreeInput!]
    parent: TreeInput
  }

  input TreeWithFileInput {
    children: [TreeWithFileInput!]
    file: Upload
  }

  input OtherFileInput {
    file: File
  }

  type Query {
    text: String
  }

  type Mutation {
    upload(file: Upload): Boolean
    uploadMany(files: [Upload!]!): Boolean
    submitForm(input: FormInput!): Boolean
    tree(input: TreeInput): Boolean
    treeWithFile(input: TreeWithFileInput): Boolean
    otherFile(input: OtherFileInput): Boolean
    text(text: String): Boolean
  }
`)

function operations(source: string) {
  return parse(source).definitions.map((node) => {
    const operation = node as OperationDefinitionNode
    return { graphqlName: operation.name!.value, node: operation }
  })
}

const OPERATIONS = operations(`
  mutation upload($file: Upload) { upload(file: $file) }
  mutation uploadMany($files: [Upload!]!) { uploadMany(files: $files) }
  mutation submitForm($input: FormInput!) { submitForm(input: $input) }
  mutation tree($input: TreeInput) { tree(input: $input) }
  mutation treeWithFile($input: TreeWithFileInput) { treeWithFile(input: $input) }
  mutation otherFile($input: OtherFileInput) { otherFile(input: $input) }
  mutation text($text: String) { text(text: $text) }
  mutation noVariables { text }
  query uploadQuery($file: Upload) { text }
`)

describe('getUploadMutations', () => {
  test('finds mutations with the scalar, directly or in input types', () => {
    expect(getUploadMutations(schema, OPERATIONS, 'Upload')).toEqual([
      'submitForm',
      'treeWithFile',
      'upload',
      'uploadMany',
    ])
  })

  test('uses the given scalar name', () => {
    expect(getUploadMutations(schema, OPERATIONS, 'File')).toEqual([
      'otherFile',
    ])
  })

  test('finds mutations with any of several scalars', () => {
    expect(getUploadMutations(schema, OPERATIONS, ['Upload', 'File'])).toEqual([
      'otherFile',
      'submitForm',
      'treeWithFile',
      'upload',
      'uploadMany',
    ])
  })

  test('ignores scalars that do not exist', () => {
    expect(getUploadMutations(schema, OPERATIONS, ['Missing', 'File'])).toEqual(
      ['otherFile'],
    )
  })

  test('returns no mutations if the scalar does not exist', () => {
    expect(getUploadMutations(schema, OPERATIONS, 'Missing')).toEqual([])
  })

  test('does not depend on the order of the operations', () => {
    expect(
      getUploadMutations(schema, [...OPERATIONS].reverse(), 'Upload'),
    ).toEqual(['submitForm', 'treeWithFile', 'upload', 'uploadMany'])
  })

  test('finds the scalar through input types that reference each other', () => {
    const cyclicSchema = buildSchema(`
      scalar Upload

      input OuterInput {
        inner: InnerInput
        file: Upload
      }

      input InnerInput {
        outer: OuterInput
      }

      type Query {
        text: String
      }

      type Mutation {
        outer(input: OuterInput): Boolean
        inner(input: InnerInput): Boolean
      }
    `)
    const cyclicOperations = operations(`
      mutation outer($input: OuterInput) { outer(input: $input) }
      mutation inner($input: InnerInput) { inner(input: $input) }
    `)
    expect(
      getUploadMutations(cyclicSchema, cyclicOperations, 'Upload'),
    ).toEqual(['inner', 'outer'])
  })
})
