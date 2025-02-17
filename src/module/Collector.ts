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
  fragments: Map<string, FragmentDefinitionNode>
  needsFragments: Set<string> = new Set()
  isOnDisk: boolean

  constructor(filePath: string, fileContents: string, isOnDisk = false) {
    this.filePath = filePath
    this.fileContents = fileContents
    this.isOnDisk = isOnDisk
    this.fragments = new Map()
    this.parse()
  }

  private parse() {
    this.fragments.clear()
    this.needsFragments.clear()
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

  static async fromFilePath(filePath: string): Promise<CollectedFile> {
    const content = (await fs.readFile(filePath)).toString()
    return new CollectedFile(filePath, content, true)
  }

  async update() {
    if (this.isOnDisk) {
      this.fileContents = (await fs.readFile(this.filePath)).toString()
      this.parse()
    }
  }

  async getDocumentInlined(): Promise<string> {}
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
