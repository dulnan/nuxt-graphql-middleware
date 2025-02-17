import { promises as fs } from 'node:fs'
import {
  type DocumentNode,
  type GraphQLSchema,
  type FragmentDefinitionNode,
  parse,
  visit,
} from 'graphql'
import { loadSchema } from '@graphql-tools/load'
import { resolveFiles } from '@nuxt/kit'
import type { GraphqlMiddlewareDocument } from '../types'
import { parseDocument } from '../helpers'
import { validateGraphQlDocuments } from '@graphql-tools/utils'

export type ModuleContext = {
  patterns: string[]
  srcDir: string
  schemaPath: string
}

class CollectedFile {
  filePath: string
  fileContents: string
  fileContentsInlined: string | null = null
  parsed: DocumentNode | null = null
  inlined: DocumentNode | null = null
  fragments: Map<string, FragmentDefinitionNode>
  needsFragments: Set<string> = new Set()
  isOnDisk: boolean
  validationState: 'valid' | 'invalid' | null = null

  constructor(filePath: string, fileContents: string, isOnDisk = false) {
    this.filePath = filePath
    this.fileContents = fileContents
    this.isOnDisk = isOnDisk
    this.fragments = new Map()
    this.parse()
  }

  setInlined(inlined: DocumentNode) {
    this.inlined = inlined
  }

  validate(schema: GraphQLSchema) {
    if (this.validationState === 'valid') {
    }

    if (this.parsed) {
      const errors = validateGraphQlDocuments(schema, [this.parsed])
    }

    return []
  }

  private parse() {
    this.parsed = parse(this.fileContents)
    visit(this.parsed, {
      FragmentDefinition: (node) => {
        this.fragments.set(node.name.value, node)
      },
      FragmentSpread: (node) => {
        this.needsFragments.add(node.name.value)
      },
    })
  }

  isValid() {
    return this.validationState === 'valid'
  }

  static async fromFilePath(filePath: string): Promise<CollectedFile> {
    const content = (await fs.readFile(filePath)).toString()
    return new CollectedFile(filePath, content, true)
  }

  async update() {
    this.validationState = null
    this.fragments.clear()
    this.needsFragments.clear()

    if (this.isOnDisk) {
      this.fileContents = (await fs.readFile(this.filePath)).toString()
    }

    this.parse()
  }
}

export class Collector {
  files: Map<string, CollectedFile>
  needsUpdate = false
  context: ModuleContext
  schema: GraphQLSchema | null = null
  nuxtConfigDocuments: string[]

  constructor(context: ModuleContext, documents: string[] = []) {
    this.files = new Map()
    this.context = context
    this.nuxtConfigDocuments = documents
  }

  private getImportPatternFiles(): Promise<string[]> {
    if (this.context.patterns.length) {
      // Find all required files.
      return resolveFiles(this.context.srcDir, this.context.patterns, {
        followSymbolicLinks: false,
      })
    }

    return Promise.resolve([])
  }

  async getSchema(): Promise<GraphQLSchema> {
    if (!this.schema) {
      const schemaContent = (
        await fs.readFile(this.context.schemaPath)
      ).toString()
      this.schema = await loadSchema(schemaContent, { loaders: [] })
    }

    return this.schema
  }

  async init() {
    const files = await this.getImportPatternFiles()
    for (const file of files) {
      await this.addFile(file)
    }

    this.nuxtConfigDocuments.forEach((fileContents, index) => {
      const fileName = `nuxt.config.ts[${index}]`
      this.files.set(fileName, new CollectedFile(fileName, fileContents))
    })
  }

  async addFile(filePath: string) {
    const file = await CollectedFile.fromFilePath(filePath)
    this.files.set(filePath, file)
  }

  handleAdd(filePath: string) {
    this.addFile(filePath)
  }

  async handleChange(filePath: string) {
    const file = this.files.get(filePath)
    if (file) {
      await file.update()
      this.needsUpdate = true
    }
  }

  handleUnlink(filePath: string) {
    if (this.files.has(filePath)) {
      this.files.delete(filePath)
      this.needsUpdate = true
    }
  }

  handleAddDir() {}

  handleUnlinkDir(folderPath: string) {
    const allKeys = [...this.files.keys()]
    const toRemove = allKeys.filter((filePath) => filePath.includes(folderPath))
    if (toRemove.length) {
      toRemove.forEach((key) => this.files.delete(key))
      this.needsUpdate = true
    }
  }

  validateDocuments(rootDir: string) {
    // const validated: GraphqlMiddlewareDocument[] = []
    //
    // const files = [...this.files.values()]
    //
    // for (let i = 0; i < files.length; i++) {
    //   const file = files[i]
    //   const document: GraphqlMiddlewareDocument = {
    //     filename: file.filePath,
    //     content: file.fileContents,
    //   }
    //   if (document.filename) {
    //     document.relativePath = document.filename.replace(rootDir + '/', '')
    //   }
    //
    //   try {
    //     const node = parseDocument(document, rootDir)
    //     document.content = print(node)
    //     document.errors = validateGraphQlDocuments(schema, [
    //       node,
    //     ]) as GraphQLError[]
    //
    //     const operation = node.definitions.find(
    //       (v) => v.kind === 'OperationDefinition',
    //     ) as OperationDefinitionNode | undefined
    //     if (operation) {
    //       document.name = operation.name?.value
    //       document.operation = operation.operation
    //     } else {
    //       document.name = document.relativePath
    //     }
    //
    //     document.isValid = document.errors.length === 0
    //   } catch (e) {
    //     document.errors = [e as GraphQLError]
    //     document.isValid = false
    //   }
    //
    //   document.id = [document.operation, document.name, document.filename]
    //     .filter(Boolean)
    //     .join('_')
    //
    //   validated.push(document)
    //
    //   if (!document.isValid) {
    //     break
    //   }
    // }
    //
    // return validated
  }
}
