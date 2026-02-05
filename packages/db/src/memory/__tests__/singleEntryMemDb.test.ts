import { SingleEntryMemDb } from '../singleEntryMemDb'

type MockEntry = {
  id: string
  title: string
  count: number
  metadata?: Record<string, unknown>
}

const mockEntry = (data: Partial<MockEntry> = {}): MockEntry => ({
  id: data.id || 'default-id',
  title: data.title || 'Default Title',
  count: data.count ?? 0,
  ...data,
})

describe('SingleEntryMemDb', () => {
  describe('constructor', () => {
    it('should create instance with null entry by default', () => {
      const db = new SingleEntryMemDb<MockEntry>()

      expect(db).toBeInstanceOf(SingleEntryMemDb)
      expect(db.isInited()).toBe(false)
    })

    it('should create instance with initial entry when provided', () => {
      const initialEntry = mockEntry({ id: 'init', title: 'Initial' })
      const db = new SingleEntryMemDb<MockEntry>(initialEntry)

      expect(db.isInited()).toBe(true)
      expect(db.read()).toEqual(initialEntry)
    })

    it('should handle null as explicit initial entry', () => {
      const db = new SingleEntryMemDb<MockEntry>(null)

      expect(db.isInited()).toBe(false)
    })
  })

  describe('isInited', () => {
    it('should return false when entry is not initialized', () => {
      const db = new SingleEntryMemDb<MockEntry>()

      expect(db.isInited()).toBe(false)
    })

    it('should return true after writing entry', () => {
      const db = new SingleEntryMemDb<MockEntry>()
      db.write(mockEntry())

      expect(db.isInited()).toBe(true)
    })

    it('should return false after deleting entry', () => {
      const db = new SingleEntryMemDb<MockEntry>(mockEntry())
      db.delete()

      expect(db.isInited()).toBe(false)
    })
  })

  describe('read', () => {
    it('should return entry when initialized', () => {
      const entry = mockEntry({ id: 'test', title: 'Test Entry' })
      const db = new SingleEntryMemDb<MockEntry>(entry)

      const result = db.read()

      expect(result).toEqual(entry)
    })

    it('should throw error when entry is not initialized', () => {
      const db = new SingleEntryMemDb<MockEntry>()

      expect(db.read()).rejects.toThrow('Entry not initialized')
    })

    it('should return same reference for multiple reads', () => {
      const entry = mockEntry()
      const db = new SingleEntryMemDb<MockEntry>(entry)

      const read1 = db.read()
      const read2 = db.read()

      expect(read1).toBe(read2)
    })
  })

  describe('write', () => {
    describe('with complete entry', () => {
      it('should write new entry when not initialized', () => {
        const db = new SingleEntryMemDb<MockEntry>()
        const entry = mockEntry({ id: 'new', title: 'New Entry' })

        const result = db.write(entry)

        expect(result).toEqual(entry)
        expect(db.read()).toEqual(entry)
      })

      it('should overwrite existing entry', () => {
        const initialEntry = mockEntry({ id: 'old', title: 'Old' })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)
        const newEntry = mockEntry({ id: 'new', title: 'New' })

        const result = db.write(newEntry)

        expect(result).toEqual(newEntry)
        expect(db.read()).toEqual(newEntry)
      })

      it('should return the written entry', () => {
        const db = new SingleEntryMemDb<MockEntry>()
        const entry = mockEntry()

        const result = db.write(entry)

        expect(result).toEqual(entry)
      })
    })

    describe('with updater function', () => {
      it('should update existing entry using updater', () => {
        const initialEntry = mockEntry({ id: 'test', title: 'Original', count: 5 })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)

        const result = db.write((entry) => ({
          title: 'Updated',
          count: entry.count + 1,
        }))

        expect(result.title).toBe('Updated')
        expect(result.count).toBe(6)
        expect(result.id).toBe('test')
      })

      it('should throw when updating uninitialized entry', () => {
        const db = new SingleEntryMemDb<MockEntry>()

        expect(db.write(() => ({ title: 'Updated' }))).rejects.toThrow(
          'Cannot update uninitialized entry',
        )
      })

      it('should merge updater result with existing entry', () => {
        const initialEntry = mockEntry({
          id: 'test',
          title: 'Original',
          count: 5,
          metadata: { key: 'value' },
        })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)

        const result = db.write(() => ({ title: 'Updated' }))

        expect(result.title).toBe('Updated')
        expect(result.count).toBe(5)
        expect(result.metadata).toEqual({ key: 'value' })
      })

      it('should handle updater that returns empty object', () => {
        const initialEntry = mockEntry({ title: 'Original' })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)

        const result = db.write(() => ({}))

        expect(result).toEqual(initialEntry)
      })

      it('should allow updater to change all fields', () => {
        const initialEntry = mockEntry({ id: 'old', title: 'Old', count: 1 })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)

        const result = db.write(() => ({
          id: 'new',
          title: 'New',
          count: 99,
        }))

        expect(result.id).toBe('new')
        expect(result.title).toBe('New')
        expect(result.count).toBe(99)
      })
    })
  })

  describe('delete', () => {
    it('should delete initialized entry', () => {
      const db = new SingleEntryMemDb<MockEntry>(mockEntry())

      db.delete()

      expect(db.isInited()).toBe(false)
      expect(db.read()).rejects.toThrow('Entry not initialized')
    })

    it('should be idempotent on uninitialized entry', () => {
      const db = new SingleEntryMemDb<MockEntry>()

      db.delete()
      db.delete()

      expect(db.isInited()).toBe(false)
    })

    it('should allow writing after deletion', () => {
      const db = new SingleEntryMemDb<MockEntry>(mockEntry())

      db.delete()
      const newEntry = mockEntry({ title: 'After Delete' })
      db.write(newEntry)

      expect(db.read()).toEqual(newEntry)
    })
  })

  describe('edge cases and complex scenarios', () => {
    it('should handle rapid writes', () => {
      const db = new SingleEntryMemDb<MockEntry>()

      db.write(mockEntry({ count: 1 }))
      db.write(mockEntry({ count: 2 }))
      db.write(mockEntry({ count: 3 }))

      const result = db.read()
      expect(result.count).toBe(3)
    })

    it('should handle write-delete-write cycle', () => {
      const db = new SingleEntryMemDb<MockEntry>()

      db.write(mockEntry({ title: 'First' }))
      db.delete()
      db.write(mockEntry({ title: 'Second' }))

      const result = db.read()
      expect(result.title).toBe('Second')
    })

    it('should maintain data integrity with complex objects', () => {
      const complexEntry = {
        id: 'complex',
        title: 'Complex Entry',
        count: 42,
        metadata: {
          nested: {
            deep: {
              value: 'test',
            },
          },
          array: [1, 2, 3],
        },
      }
      const db = new SingleEntryMemDb<MockEntry>(complexEntry)

      const result = db.read()

      expect(result).toEqual(complexEntry)
      expect(result.metadata?.nested).toEqual({ deep: { value: 'test' } })
    })

    it('should handle concurrent read operations', () => {
      const entry = mockEntry({ title: 'Concurrent' })
      const db = new SingleEntryMemDb<MockEntry>(entry)

      const results = [db.read(), db.read(), db.read()]

      results.forEach((result) => {
        expect(result).toEqual(entry)
      })
    })

    it('should handle updater that accesses current entry multiple times', () => {
      const db = new SingleEntryMemDb<MockEntry>(mockEntry({ count: 5 }))

      db.write((entry) => ({
        count: entry.count * 2 + entry.count,
        title: `Count is ${entry.count}`,
      }))

      const result = db.read()
      expect(result.count).toBe(15)
      expect(result.title).toBe('Count is 5')
    })
  })

  describe('type safety', () => {
    it('should maintain type information', () => {
      type TypedEntry = {
        id: string
        value: number
        flag: boolean
      }

      const db = new SingleEntryMemDb<TypedEntry>({
        id: 'typed',
        value: 42,
        flag: true,
      })

      const result = db.read()

      // TypeScript should enforce these types
      expect(typeof result.id).toBe('string')
      expect(typeof result.value).toBe('number')
      expect(typeof result.flag).toBe('boolean')
    })
  })
})
