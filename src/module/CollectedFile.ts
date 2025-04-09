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
   */
  async update(): Promise<boolean> {
    if (this.isOnDisk) {
      const newContents = (await fs.readFile(this.filePath)).toString()

      // If contents are identical, return.
      if (newContents === this.fileContents) {
        return false
      }

      this.fileContents = newContents
      this.parsed = parse(newContents)
      return true
    }

    // Files not on disk never need update.
    return false
  }
}
