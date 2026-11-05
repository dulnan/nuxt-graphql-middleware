import { promises as fs } from 'node:fs'
import { parse, type DocumentNode } from 'graphql'

export class CollectedFile {
  filePath: string
  fileContents: string
  isOnDisk: boolean
  parsed: DocumentNode

  constructor(filePath: string, fileContents: string, isOnDisk = false) {
    this.filePath = filePath
    this.fileContents = fileContents
    this.isOnDisk = isOnDisk
    this.parsed = parse(fileContents)
  }

  static async fromFilePath(filePath: string): Promise<CollectedFile | null> {
    const content = (await fs.readFile(filePath)).toString()
    if (!content) {
      return null
    }
    return new CollectedFile(filePath, content, true)
  }

  /**
   * If isOnDisk, re-read file contents from disk, then parse it (syntax only).
   *
   * Throws for syntax errors and keeps the last valid contents, so that the
   * contents always match the parsed document. Saving the same invalid
   * contents again then throws again.
   */
  async update(): Promise<'unchanged' | 'updated' | 'empty'> {
    // Files not on disk never need update.
    if (!this.isOnDisk) {
      return 'unchanged'
    }

    const newContents = (await fs.readFile(this.filePath)).toString()
    if (newContents === this.fileContents) {
      return 'unchanged'
    }

    if (!newContents.trim()) {
      return 'empty'
    }

    this.parsed = parse(newContents)
    this.fileContents = newContents
    return 'updated'
  }
}
