import { Identifiable, DeleteManyOutput, Promisable, PredicateFn, MultiEntryDb } from '../types'

export class MultiEntryMemDb<T extends Identifiable> extends MultiEntryDb<T> {
  protected entries: Map<T['id'], T> = new Map()

  async create(entry: T): Promise<T> {
    this.entries.set(entry.id, entry)
    return entry
  }

  async getById(id: T['id']): Promise<T | null> {
    return this.entries.get(id) ?? null
  }

  async getByIdOrThrow(id: T['id']): Promise<T> {
    const entry = await this.getById(id)
    if (!entry) {
      throw new Error('Entry with id ' + id + ' does not exist')
    }
    return entry
  }

  async getWhere(predicate: PredicateFn<T>, max?: number): Promise<T[]> {
    const entries = Array.from(this.entries.values()).filter(predicate)
    return max !== undefined ? entries.slice(0, max) : entries
  }

  async getAll(whereIds?: T['id'][]): Promise<T[]> {
    if (whereIds === undefined) {
      return Array.from(this.entries.values())
    }

    const entries: T[] = []
    for (const id of whereIds) {
      const entry = this.entries.get(id)
      if (entry) entries.push(entry)
    }
    return entries
  }

  async getAllIds(): Promise<T['id'][]> {
    return Array.from(this.entries.keys())
  }

  async update(id: T['id'], updater: (entry: T) => Promisable<Partial<T>>): Promise<T> {
    const entry = this.entries.get(id)
    if (!entry) {
      throw new Error('Entry with id ' + id + ' does not exist')
    }

    const updatedEntryFields = await updater(entry)
    const updatedEntry = { ...entry, ...updatedEntryFields }

    this.entries.set(updatedEntry.id, updatedEntry)

    if (updatedEntry.id !== id) {
      this.entries.delete(id)
    }

    return updatedEntry
  }

  async delete(id: T['id']): Promise<boolean> {
    return this.entries.delete(id)
  }

  async deleteByIds(ids: T['id'][]): Promise<DeleteManyOutput> {
    return this.deleteWhere((entry) => ids.includes(entry.id))
  }

  async deleteWhere(predicate: PredicateFn<T>): Promise<DeleteManyOutput> {
    const deletedIds: T['id'][] = []
    const ignoredIds: T['id'][] = []

    for (const [id, entry] of this.entries) {
      if (!predicate(entry)) continue

      const didDelete = await this.delete(id)
      if (didDelete) {
        deletedIds.push(id)
      } else {
        ignoredIds.push(id)
      }
    }

    return { deletedIds, ignoredIds }
  }

  async destroy() {
    this.entries.clear()
  }

  async exists(id: T['id']): Promise<boolean> {
    return this.entries.has(id)
  }

  async countAll(): Promise<number> {
    return this.entries.size
  }

  async countWhere(predicate: PredicateFn<T>): Promise<number> {
    return Array.from(this.entries.values()).filter(predicate).length
  }

  protected async *iterEntries() {
    for (const entry of this.entries.values()) {
      yield entry
    }
  }
}
