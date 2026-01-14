import type { Identifiable, DeleteManyOutput, Promisable, PredicateFn } from './types'
import { FilesService } from './files'
import { JsonParser } from '@jsonkit/tools'
import * as path from 'path'

export class MultiEntryFileDb<T extends Identifiable> {
  protected readonly files: FilesService = new FilesService()

  constructor(
    protected readonly dirpath: string,
    protected readonly parser: JsonParser,
  ) {}

  async create(entry: T): Promise<T> {
    await this.writeEntry(entry)
    return entry
  }

  async getById(id: T['id']): Promise<T | null> {
    return await this.readEntry(id)
  }

  async getByIdOrThrow(id: T['id']): Promise<T> {
    const entry = await this.readEntry(id)
    if (!entry) {
      throw new Error('Entry with id ' + id + ' does not exist')
    }
    return entry
  }

  async getWhere(predicate: PredicateFn<T>, max?: number): Promise<T[]> {
    const entries = await this.getAll()
    return entries.filter(predicate).slice(0, max)
  }

  async getAll(whereIds?: T['id'][]): Promise<T[]> {
    const ids = whereIds === undefined ? await this.getAllIds() : whereIds
    const entries: T[] = []

    for (const id of ids) {
      const entry = await this.readEntry(id)
      if (entry) {
        entries.push(entry)
      }
    }

    return entries
  }

  async getAllIds(): Promise<T['id'][]> {
    try {
      const entries = await this.files.list(this.dirpath)
      return entries.filter((name) => name.endsWith('.json')).map((name) => name.slice(0, -5)) // Remove .json extension
    } catch {
      // Directory might not exist
      return []
    }
  }

  async update(id: T['id'], updater: (entry: T) => Promisable<Partial<T>>): Promise<T> {
    const entry = await this.readEntry(id)
    if (!entry) {
      throw new Error('Entry with id ' + id + ' does not exist')
    }

    const updatedEntryFields = await updater(entry)
    const updatedEntry = { ...entry, ...updatedEntryFields }
    await this.writeEntry(updatedEntry)

    if (updatedEntry.id !== id) {
      await this.delete(id)
    }

    return updatedEntry
  }

  async delete(id: T['id']): Promise<boolean> {
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

  async deleteWhere(predicate: PredicateFn<T>): Promise<DeleteManyOutput> {
    const deletedIds: T['id'][] = []
    const ignoredIds: T['id'][] = []

    for await (const entry of this.iterEntries()) {
      if (!predicate(entry)) continue

      const didDelete = await this.delete(entry.id)
      if (didDelete) {
        deletedIds.push(entry.id)
      } else {
        ignoredIds.push(entry.id)
      }
    }

    return { deletedIds, ignoredIds }
  }

  async destroy() {
    await this.files.delete(this.dirpath)
  }

  async exists(id: T['id']): Promise<boolean> {
    const entry = await this.readEntry(id)
    return entry !== null
  }

  async countAll(): Promise<number> {
    const ids = await this.getAllIds()
    return ids.length
  }

  async countWhere(predicate: PredicateFn<T>): Promise<number> {
    return (await this.getWhere(predicate)).length
  }

  protected getFilePath(id: T['id']) {
    return path.join(this.dirpath, `${id}.json`)
  }

  protected async readEntry(id: T['id']) {
    try {
      const filepath = this.getFilePath(id)
      const text = await this.files.read(filepath)
      const entry = this.parser.parse<T>(text)
      return entry
    } catch {
      // File doesn't exist or invalid JSON
      return null
    }
  }

  protected async writeEntry(entry: T) {
    const filepath = this.getFilePath(entry.id)
    await this.files.write(filepath, JSON.stringify(entry, null, 2))
  }

  protected async *iterEntries() {
    const ids = await this.getAllIds()
    for (const id of ids) {
      const entry = await this.readEntry(id)
      if (entry) yield entry
    }
  }
}
