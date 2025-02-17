import { promises as fs } from 'node:fs'
import { type GraphQLSchema } from 'graphql'
import { loadSchema } from '@graphql-tools/load'
import { resolveFiles } from '@nuxt/kit'
import { hash } from 'ohash'

export type ModuleContext = {
  patterns: string[]
  srcDir: string
  schemaPath: string
}

class CollectedFile {
  filePath: string
  fileContents: string | null
  readonly isFromDisk: boolean

  constructor(filePath: string, fileContents?: string) {
    this.filePath = filePath
    this.fileContents = fileContents || null

    // If the file contents are provided directly we don't need to load
    // anything from disk anymore afterwards.
    this.isFromDisk = !fileContents
  }

  update() {
    // @todo
  }

  async getFileContents(): Promise<string> {
    if (!this.isFromDisk) {
      if (this.fileContents === null) {
        throw new Error('Missing fileContents for ' + this.filePath)
      }
      return this.fileContents
    }

    if (!this.fileContents) {
      this.fileContents = (await fs.readFile(this.filePath)).toString()
    }

    return this.fileContents
  }
}

export class Collector {
  files: Map<string, CollectedFile>
  needsUpdate = false
  context: ModuleContext
  schema: GraphQLSchema | null = null

  constructor(context: ModuleContext, documents: string[] = []) {
    this.files = new Map()
    this.context = context

    documents.forEach((fileContents, index) => {
      const fileName = `nuxt.config.ts[${index}]`
      this.files.set(fileName, new CollectedFile(fileName, fileContents))
    })
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
    files.forEach((file) => this.addFile(file))
  }

  addFile(filePath: string) {
    this.files.set(filePath, new CollectedFile(filePath))
  }

  handleAdd(filePath: string) {
    this.addFile(filePath)
  }

  handleChange(filePath: string) {
    const file = this.files.get(filePath)
    if (file) {
      file.update()
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
}
