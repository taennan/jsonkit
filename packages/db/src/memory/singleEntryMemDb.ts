import { JsonEntryParser, SingleEntryDb, UninitError, UpdaterFn } from '../common'
import { SingleEntryFileDb } from '../file/singleEntryFileDb'

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
    if (this.entry === null) throw new UninitError()
    return this.entry
  }

  async write(updaterOrEntry: T | UpdaterFn<T>) {
    let entry: T

    if (typeof updaterOrEntry === 'function') {
      const updater = updaterOrEntry as (entry: T) => Partial<T>

      if (this.entry === null) throw new UninitError()

      const updatedFields = updater(this.entry)
      entry = { ...this.entry, ...updatedFields }
    } else {
      entry = updaterOrEntry
    }

    this.entry = entry
    return entry
  }

  async delete() {
    this.entry = null
  }

  async persist(filepath: string) {
    const fileDb = new SingleEntryFileDb<T>(filepath)
    await fileDb.write(await this.read())
  }

  async load(filepath: string, parser?: JsonEntryParser<T>) {
    const fileDb = new SingleEntryFileDb<T>(filepath, parser)
    const persistedEntry = await fileDb.read()
    this.write(persistedEntry)
  }
}
