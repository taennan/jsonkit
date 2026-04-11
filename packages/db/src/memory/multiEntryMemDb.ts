import { Identifiable, MultiEntryDb, JsonEntryParser, UpdaterFn } from '../common'
import { MultiEntryFileDb } from '../file/multiEntryFileDb'

export class MultiEntryMemDb<T extends Identifiable> extends MultiEntryDb<T> {
  protected entries: Map<T['id'], T> = new Map()

  async create(entry: T): Promise<T> {
    this.entries.set(entry.id, entry)
    return entry
  }

  async getById(id: T['id']): Promise<T | null> {
    return this.entries.get(id) ?? null
  }

  protected async updateEntry(entry: T, updater: UpdaterFn<T>): Promise<T> {
    const updatedEntryFields = await updater(entry)
    const updatedEntry = { ...entry, ...updatedEntryFields }

    this.entries.set(updatedEntry.id, updatedEntry)

    if (updatedEntry.id !== entry.id) {
      await this.deleteById(entry.id)
    }

    return updatedEntry
  }

  async deleteById(id: T['id']): Promise<boolean> {
    return this.entries.delete(id)
  }

  async destroy() {
    this.entries.clear()
  }

  async *iterEntries() {
    for (const entry of this.entries.values()) {
      yield entry
    }
  }

  async *iterIds() {
    for (const id of this.entries.keys()) {
      yield id
    }
  }

  async persist(dirpath: string) {
    const fileDb = new MultiEntryFileDb<T>(dirpath)
    await fileDb.destroy()

    const values = [...this.entries.values()]
    await Promise.all(values.map((entry) => fileDb.create(entry)))
  }

  async load(dirpath: string, parser?: JsonEntryParser<T>) {
    const fileDb = new MultiEntryFileDb<T>(dirpath, { parser })

    await this.destroy()
    for await (const entry of fileDb.iterEntries()) {
      await this.create(entry)
    }
  }
}
