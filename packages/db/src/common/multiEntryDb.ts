import { NotFoundError } from './errors'
import type {
  Identifiable,
  DeleteManyOutput,
  PaginationInput,
  PredicateFn,
  UpdaterFn,
} from './types'

export abstract class MultiEntryDb<T extends Identifiable> {
  abstract create(entry: T): Promise<T>
  abstract getById(id: T['id']): Promise<T | null>
  protected abstract updateEntry(entry: T, updater: UpdaterFn<T>): Promise<T>
  abstract deleteById(id: T['id']): Promise<boolean>
  abstract destroy(): Promise<void>
  abstract iterEntries(): AsyncIterable<T>
  abstract iterIds(): AsyncIterable<T['id']>

  private async *iterWhere(
    predicate: PredicateFn<T>,
    pagination?: PaginationInput,
  ): AsyncIterable<T> {
    if (!pagination) {
      for await (const entry of this.iterEntries()) {
        const isMatch = await predicate(entry)
        if (isMatch) yield entry
      }
      return
    }

    const { take, page } = pagination
    this.validatePaginationField(take, 'take')
    this.validatePaginationField(page, 'page')

    const startIndex = page * take
    const endIndex = startIndex + take
    let totalMatched = 0

    for await (const entry of this.iterEntries()) {
      if (totalMatched >= endIndex) break

      const isMatch = await predicate(entry)
      totalMatched++
      if (isMatch && totalMatched - 1 >= startIndex) {
        yield entry
      }
    }
  }

  private validatePaginationField(field: number, fieldName: string) {
    if (isNaN(field)) throw new Error(`PaginationInput.${fieldName} must not be NaN`)
    if (field < 0)
      throw new Error(`PaginationInput.${fieldName} must not be less than 0, got ${field}`)
  }

  async getByIdOrThrow(id: T['id']): Promise<T> {
    const entry = await this.getById(id)
    if (!entry) throw new NotFoundError(`Entry with id '${id}' does not exist`)
    return entry
  }

  async getFirstWhere(predicate: PredicateFn<T>): Promise<T | null> {
    const matches = await this.getWhere(predicate, { page: 0, take: 1 })
    return matches.at(0) ?? null
  }

  async getFirstWhereOrThrow(predicate: PredicateFn<T>): Promise<T | null> {
    const match = await this.getFirstWhere(predicate)
    if (!match) throw new NotFoundError('No entry matches predicate')
    return match
  }

  async getWhere(predicate: PredicateFn<T>, pagination?: PaginationInput): Promise<T[]> {
    const entries: T[] = []
    for await (const entry of this.iterWhere(predicate, pagination)) {
      entries.push(entry)
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

  async updateById(id: T['id'], updater: UpdaterFn<T>): Promise<T> {
    const entry = await this.getByIdOrThrow(id)
    return this.updateEntry(entry, updater)
  }

  async updateFirstWhere(predicate: PredicateFn<T>, updater: UpdaterFn<T>) {
    return this.updateWhere(predicate, updater, { page: 0, take: 1 })
  }

  async updateWhere(
    predicate: PredicateFn<T>,
    updater: UpdaterFn<T>,
    pagination?: PaginationInput,
  ): Promise<T[]> {
    const result: T[] = []
    for await (const entry of this.iterWhere(predicate, pagination)) {
      result.push(await this.updateEntry(entry, updater))
    }
    return result
  }

  deleteByIds(ids: T['id'][]): Promise<DeleteManyOutput> {
    return this.deleteWhere((entry) => ids.includes(entry.id))
  }

  async deleteWhere(predicate: PredicateFn<T>): Promise<DeleteManyOutput> {
    const deletedIds: T['id'][] = []
    const ignoredIds: T['id'][] = []

    for await (const entry of this.iterWhere(predicate)) {
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
    return (await this.getById(id)) !== null
  }

  countAll(): Promise<number> {
    return this.countWhere(() => true)
  }

  async countWhere(predicate: PredicateFn<T>, pagination?: PaginationInput): Promise<number> {
    let count = 0
    for await (const _ of this.iterWhere(predicate, pagination)) count++
    return count
  }
}
