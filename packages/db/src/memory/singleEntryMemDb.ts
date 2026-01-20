import { Promisable, SingleEntryDb } from '../types'

export class SingleEntryMemDb<T> extends SingleEntryDb<T> {
  protected entry: T | null = null

  constructor(initialEntry: T | null = null) {
    super()
    this.entry = initialEntry
  }

  async isInited() {
    return this.entry !== null
  }

  async read() {
    if (this.entry === null) throw new Error('Entry not initialized')
    return this.entry!
  }

  async write(updaterOrEntry: T | ((entry: T) => Promisable<Partial<T>>)): Promise<T> {
    let entry: T

    if (typeof updaterOrEntry === 'function') {
      const updater = updaterOrEntry as (entry: T) => Promisable<Partial<T>>

      if (this.entry === null) {
        throw new Error('Cannot update uninitialized entry. Use write(entry) to initialize first.')
      }

      const updatedFields = await updater(this.entry)
      entry = { ...this.entry, ...updatedFields }
    } else {
      entry = updaterOrEntry
    }

    this.entry = entry
    return entry
  }

  async delete(): Promise<void> {
    this.entry = null
  }
}
