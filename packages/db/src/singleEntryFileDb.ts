import type { JsonEntryParser, Promisable } from './types'
import { FilesService } from './files'

export class SingleEntryFileDb<T> {
  protected readonly files: FilesService = new FilesService()

  constructor(
    protected readonly filepath: string,
    protected readonly parser: JsonEntryParser<T> = JSON,
  ) {}

  path() {
    return this.filepath
  }

  async isInited() {
    const exists = await this.files.exists(this.filepath)
    return exists
  }

  async read() {
    const text = await this.files.read(this.filepath)
    const entry = this.parser.parse(text)
    return entry
  }

  async write(updaterOrEntry: T | ((entry: T) => Promisable<Partial<T>>)): Promise<T> {
    let entry: T
    if (typeof updaterOrEntry === 'function') {
      const updater = updaterOrEntry as (entry: T) => T
      const existing = await this.read()

      const updatedFields = await updater(existing)
      entry = { ...existing, ...updatedFields }
    } else {
      entry = updaterOrEntry
    }

    await this.files.write(this.filepath, JSON.stringify(entry, null, 2))

    return entry
  }

  async delete(): Promise<void> {
    await this.files.delete(this.filepath)
  }
}
