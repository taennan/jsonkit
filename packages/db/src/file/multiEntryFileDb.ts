import {
  Identifiable,
  DeleteManyOutput,
  JsonEntryParser,
  MultiEntryFileDbOptions,
  MultiEntryDb,
  InvalidIdError,
  runJsonEntryParser,
  UpdaterFn,
} from '../common'
import { Files } from './files'
import * as path from 'path'

export class MultiEntryFileDb<T extends Identifiable> extends MultiEntryDb<T> {
  protected readonly dirpath: string
  protected readonly files: Files
  protected readonly parser: JsonEntryParser<T>
  protected readonly disableLogs: boolean
  readonly noPathlikeIds: boolean

  constructor(dirpath: string, options?: MultiEntryFileDbOptions<T>) {
    super()
    this.dirpath = dirpath
    this.files = new Files()
    this.parser = options?.parser ?? JSON
    this.noPathlikeIds = options?.noPathlikeIds ?? true
    this.disableLogs = options?.disableLogs ?? false
  }

  async create(entry: T): Promise<T> {
    await this.writeEntry(entry)
    return entry
  }

  async getById(id: T['id']): Promise<T | null> {
    if (!this.isIdValid(id)) throw new InvalidIdError(id)

    try {
      const filepath = this.getFilePath(id)
      const text = await this.files.read(filepath)
      const entry = runJsonEntryParser(this.parser, text)
      return entry
    } catch (error) {
      if (!this.disableLogs) console.error('Failed to read entry', error)
      // File doesn't exist or invalid JSON
      return null
    }
  }

  protected async updateEntry(entry: T, updater: UpdaterFn<T>): Promise<T> {
    const updatedEntryFields = await updater(entry)
    const updatedEntry = { ...entry, ...updatedEntryFields }
    await this.writeEntry(updatedEntry)

    if (updatedEntry.id !== entry.id) {
      await this.deleteById(entry.id)
    }

    return updatedEntry
  }

  async deleteById(id: T['id']): Promise<boolean> {
    try {
      const filepath = this.getFilePath(id)
      await this.files.delete(filepath, { force: false })
      return true
    } catch {
      // File might not exist, ignore error
      return false
    }
  }

  async deleteByIds(ids: T['id'][]): Promise<DeleteManyOutput> {
    return this.deleteWhere((entry) => ids.includes(entry.id))
  }

  async destroy() {
    await this.files.delete(this.dirpath)
  }

  protected getFilePath(id: T['id']) {
    return path.join(this.dirpath, `${String(id)}.json`)
  }

  protected async writeEntry(entry: T) {
    if (!this.isIdValid(entry.id)) throw new InvalidIdError(entry.id)

    const filepath = this.getFilePath(entry.id)
    await this.files.write(filepath, JSON.stringify(entry, null, 2))
  }

  isIdValid(rawId: T['id']): boolean {
    if (!this.noPathlikeIds) return true

    const id = String(rawId)
    if (id.includes('/') || id.includes('\\')) return false

    return true
  }

  async *iterEntries() {
    for await (const id of this.iterIds()) {
      const entry = await this.getById(id)
      if (entry) yield entry
    }
  }

  async *iterIds(objectIdParser?: JsonEntryParser<T['id']>): AsyncGenerator<T['id']> {
    const filenames = await this.files.list(this.dirpath)
    for (const filename of filenames) {
      if (!filename.endsWith('.json')) continue

      const stringId = filename.replace(/\.json$/, '')
      const id = objectIdParser ? runJsonEntryParser(objectIdParser, stringId) : stringId
      if (this.isIdValid(id)) yield id
    }
  }
}
