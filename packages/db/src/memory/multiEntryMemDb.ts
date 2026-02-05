import { Identifiable, Promisable, MultiEntryDb } from '../common'

export class MultiEntryMemDb<T extends Identifiable> extends MultiEntryDb<T> {
  protected entries: Map<T['id'], T> = new Map()

  async create(entry: T): Promise<T> {
    this.entries.set(entry.id, entry)
    return entry
  }

  async getById(id: T['id']): Promise<T | null> {
    return this.entries.get(id) ?? null
  }

  async update(id: T['id'], updater: (entry: T) => Promisable<Partial<T>>): Promise<T> {
    const entry = await this.getByIdOrThrow(id)

    const updatedEntryFields = await updater(entry)
    const updatedEntry = { ...entry, ...updatedEntryFields }

    this.entries.set(updatedEntry.id, updatedEntry)

    if (updatedEntry.id !== id) this.entries.delete(id)

    return updatedEntry
  }

  async deleteById(id: T['id']): Promise<boolean> {
    return this.entries.delete(id)
  }

  async destroy() {
    this.entries.clear()
  }

  protected async *iterEntries() {
    for (const entry of this.entries.values()) {
      yield entry
    }
  }

  protected async *iterIds() {
    for (const id of this.entries.keys()) {
      yield id
    }
  }
}
