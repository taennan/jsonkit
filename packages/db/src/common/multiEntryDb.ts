import type {
  Identifiable,
  DeleteManyOutput,
  PaginationInput,
  PredicateFn,
  Promisable,
} from './types'

export abstract class MultiEntryDb<T extends Identifiable> {
  abstract create(entry: T): Promise<T>

  abstract getById(id: T['id']): Promise<T | null>

  abstract update(id: T['id'], updater: (entry: T) => Promisable<Partial<T>>): Promise<T>

  abstract deleteById(id: T['id']): Promise<boolean>

  abstract destroy(): Promise<void>

  protected abstract iterEntries(): AsyncIterable<T>

  protected abstract iterIds(): AsyncIterable<T['id']>

  async getByIdOrThrow(id: T['id']): Promise<T> {
    const entry = await this.getById(id)
    if (!entry) throw new Error(`Entry with id '${id}' does not exist`)
    return entry
  }

  async getWhere(predicate: PredicateFn<T>, pagination?: PaginationInput): Promise<T[]> {
    let totalMatched = 0
    const entries: T[] = []

    if (!pagination) {
      for await (const entry of this.iterEntries()) {
        const isMatch = predicate(entry)
        if (isMatch) entries.push(entry)
      }
      return entries
    }

    const { take, page } = pagination
    const skip = pagination.skip ?? 0
    const startIndex = (page - 1) * take + skip
    const endIndex = startIndex + take

    for await (const entry of this.iterEntries()) {
      const isMatch = predicate(entry)
      if (isMatch) {
        if (totalMatched >= startIndex && totalMatched < endIndex) {
          entries.push(entry)
        }
        totalMatched++

        if (totalMatched >= endIndex) break
      }
    }

    return entries
  }

  getAll(): Promise<T[]> {
    return this.getWhere(() => true)
  }

  async getAllIds(): Promise<T['id'][]> {
    const ids: T['id'][] = []
    for await (const id of this.iterIds()) {
      ids.push(id)
    }
    return ids
  }

  deleteByIds(ids: T['id'][]): Promise<DeleteManyOutput> {
    return this.deleteWhere((entry) => ids.includes(entry.id))
  }

  async deleteWhere(predicate: PredicateFn<T>): Promise<DeleteManyOutput> {
    const deletedIds: T['id'][] = []
    const ignoredIds: T['id'][] = []

    for await (const entry of this.iterEntries()) {
      if (!predicate(entry)) continue

      const didDelete = await this.deleteById(entry.id)
      if (didDelete) {
        deletedIds.push(entry.id)
      } else {
        ignoredIds.push(entry.id)
      }
    }

    return { deletedIds, ignoredIds }
  }

  async exists(id: T['id']): Promise<boolean> {
    const entry = await this.getById(id)
    return entry !== null
  }

  countAll(): Promise<number> {
    return this.countWhere(() => true)
  }

  async countWhere(predicate: PredicateFn<T>, pagination?: PaginationInput): Promise<number> {
    let totalMatched = 0
    let count = 0

    if (!pagination) {
      for await (const entry of this.iterEntries()) {
        const isMatch = predicate(entry)
        if (isMatch) count++
      }
      return count
    }

    const { take, page } = pagination
    const skip = pagination.skip ?? 0
    const startIndex = (page - 1) * take + skip
    const endIndex = startIndex + take

    for await (const entry of this.iterEntries()) {
      const isMatch = predicate(entry)
      if (isMatch) {
        if (totalMatched >= startIndex && totalMatched < endIndex) count++
        totalMatched++

        if (totalMatched >= endIndex) break
      }
    }

    return count
  }
}
