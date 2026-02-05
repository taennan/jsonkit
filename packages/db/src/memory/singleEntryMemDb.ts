export class SingleEntryMemDb<T> {
  protected entry: T | null = null

  constructor(initialEntry: T | null = null) {
    this.entry = initialEntry
  }

  isInited() {
    return this.entry !== null
  }

  read(): T {
    if (this.entry === null) throw new Error('Entry not initialized')
    return this.entry
  }

  write(updaterOrEntry: T | ((entry: T) => Partial<T>)): T {
    let entry: T

    if (typeof updaterOrEntry === 'function') {
      const updater = updaterOrEntry as (entry: T) => Partial<T>

      if (this.entry === null) {
        throw new Error('Cannot update uninitialized entry. Use write(entry) to initialize first.')
      }

      const updatedFields = updater(this.entry)
      entry = { ...this.entry, ...updatedFields }
    } else {
      entry = updaterOrEntry
    }

    this.entry = entry
    return entry
  }

  delete() {
    this.entry = null
  }
}
