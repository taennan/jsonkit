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
    it('should create instance with null entry by default', async () => {
      const db = new SingleEntryMemDb<MockEntry>()

      expect(db).toBeInstanceOf(SingleEntryMemDb)
      expect(await db.isInited()).toBe(false)
    })

    it('should create instance with initial entry when provided', async () => {
      const initialEntry = mockEntry({ id: 'init', title: 'Initial' })
      const db = new SingleEntryMemDb<MockEntry>(initialEntry)

      expect(await db.isInited()).toBe(true)
      expect(await db.read()).toEqual(initialEntry)
    })

    it('should handle null as explicit initial entry', async () => {
      const db = new SingleEntryMemDb<MockEntry>(null)

      expect(await db.isInited()).toBe(false)
    })
  })

  describe('isInited', () => {
    it('should return false when entry is not initialized', async () => {
      const db = new SingleEntryMemDb<MockEntry>()

      expect(await db.isInited()).toBe(false)
    })

    it('should return true after writing entry', async () => {
      const db = new SingleEntryMemDb<MockEntry>()
      await db.write(mockEntry())

      expect(await db.isInited()).toBe(true)
    })

    it('should return false after deleting entry', async () => {
      const db = new SingleEntryMemDb<MockEntry>(mockEntry())
      await db.delete()

      expect(await db.isInited()).toBe(false)
    })
  })

  describe('read', () => {
    it('should return entry when initialized', async () => {
      const entry = mockEntry({ id: 'test', title: 'Test Entry' })
      const db = new SingleEntryMemDb<MockEntry>(entry)

      const result = await db.read()

      expect(result).toEqual(entry)
    })

    it('should throw error when entry is not initialized', async () => {
      const db = new SingleEntryMemDb<MockEntry>()

      await expect(db.read()).rejects.toThrow('Entry not initialized')
    })

    it('should return same reference for multiple reads', async () => {
      const entry = mockEntry()
      const db = new SingleEntryMemDb<MockEntry>(entry)

      const read1 = await db.read()
      const read2 = await db.read()

      expect(read1).toBe(read2)
    })
  })

  describe('write', () => {
    describe('with complete entry', () => {
      it('should write new entry when not initialized', async () => {
        const db = new SingleEntryMemDb<MockEntry>()
        const entry = mockEntry({ id: 'new', title: 'New Entry' })

        const result = await db.write(entry)

        expect(result).toEqual(entry)
        expect(await db.read()).toEqual(entry)
      })

      it('should overwrite existing entry', async () => {
        const initialEntry = mockEntry({ id: 'old', title: 'Old' })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)
        const newEntry = mockEntry({ id: 'new', title: 'New' })

        const result = await db.write(newEntry)

        expect(result).toEqual(newEntry)
        expect(await db.read()).toEqual(newEntry)
      })

      it('should return the written entry', async () => {
        const db = new SingleEntryMemDb<MockEntry>()
        const entry = mockEntry()

        const result = await db.write(entry)

        expect(result).toEqual(entry)
      })
    })

    describe('with updater function', () => {
      it('should update existing entry using updater', async () => {
        const initialEntry = mockEntry({ id: 'test', title: 'Original', count: 5 })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)

        const result = await db.write((entry) => ({
          title: 'Updated',
          count: entry.count + 1,
        }))

        expect(result.title).toBe('Updated')
        expect(result.count).toBe(6)
        expect(result.id).toBe('test')
      })

      it('should throw when updating uninitialized entry', async () => {
        const db = new SingleEntryMemDb<MockEntry>()

        await expect(db.write(() => ({ title: 'Updated' }))).rejects.toThrow(
          'Cannot update uninitialized entry',
        )
      })

      it('should merge updater result with existing entry', async () => {
        const initialEntry = mockEntry({
          id: 'test',
          title: 'Original',
          count: 5,
          metadata: { key: 'value' },
        })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)

        const result = await db.write(() => ({ title: 'Updated' }))

        expect(result.title).toBe('Updated')
        expect(result.count).toBe(5)
        expect(result.metadata).toEqual({ key: 'value' })
      })

      it('should support async updater functions', async () => {
        const initialEntry = mockEntry({ count: 0 })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)

        const result = await db.write(async (entry) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return { count: entry.count + 1 }
        })

        expect(result.count).toBe(1)
      })

      it('should handle updater that returns empty object', async () => {
        const initialEntry = mockEntry({ title: 'Original' })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)

        const result = await db.write(() => ({}))

        expect(result).toEqual(initialEntry)
      })

      it('should allow updater to change all fields', async () => {
        const initialEntry = mockEntry({ id: 'old', title: 'Old', count: 1 })
        const db = new SingleEntryMemDb<MockEntry>(initialEntry)

        const result = await db.write(() => ({
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
    it('should delete initialized entry', async () => {
      const db = new SingleEntryMemDb<MockEntry>(mockEntry())

      await db.delete()

      expect(await db.isInited()).toBe(false)
      await expect(db.read()).rejects.toThrow('Entry not initialized')
    })

    it('should be idempotent on uninitialized entry', async () => {
      const db = new SingleEntryMemDb<MockEntry>()

      await db.delete()
      await db.delete()

      expect(await db.isInited()).toBe(false)
    })

    it('should allow writing after deletion', async () => {
      const db = new SingleEntryMemDb<MockEntry>(mockEntry())

      await db.delete()
      const newEntry = mockEntry({ title: 'After Delete' })
      await db.write(newEntry)

      expect(await db.read()).toEqual(newEntry)
    })
  })

  describe('edge cases and complex scenarios', () => {
    it('should handle rapid writes', async () => {
      const db = new SingleEntryMemDb<MockEntry>()

      await db.write(mockEntry({ count: 1 }))
      await db.write(mockEntry({ count: 2 }))
      await db.write(mockEntry({ count: 3 }))

      const result = await db.read()
      expect(result.count).toBe(3)
    })

    it('should handle write-delete-write cycle', async () => {
      const db = new SingleEntryMemDb<MockEntry>()

      await db.write(mockEntry({ title: 'First' }))
      await db.delete()
      await db.write(mockEntry({ title: 'Second' }))

      const result = await db.read()
      expect(result.title).toBe('Second')
    })

    it('should maintain data integrity with complex objects', async () => {
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

      const result = await db.read()

      expect(result).toEqual(complexEntry)
      expect(result.metadata?.nested).toEqual({ deep: { value: 'test' } })
    })

    it('should handle concurrent read operations', async () => {
      const entry = mockEntry({ title: 'Concurrent' })
      const db = new SingleEntryMemDb<MockEntry>(entry)

      const results = await Promise.all([db.read(), db.read(), db.read()])

      results.forEach((result) => {
        expect(result).toEqual(entry)
      })
    })

    it('should handle updater that accesses current entry multiple times', async () => {
      const db = new SingleEntryMemDb<MockEntry>(mockEntry({ count: 5 }))

      await db.write((entry) => ({
        count: entry.count * 2 + entry.count,
        title: `Count is ${entry.count}`,
      }))

      const result = await db.read()
      expect(result.count).toBe(15)
      expect(result.title).toBe('Count is 5')
    })
  })

  describe('type safety', () => {
    it('should maintain type information', async () => {
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

      const result = await db.read()

      // TypeScript should enforce these types
      expect(typeof result.id).toBe('string')
      expect(typeof result.value).toBe('number')
      expect(typeof result.flag).toBe('boolean')
    })
  })
})
