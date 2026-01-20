import type { Identifiable } from '../../types'
import { MultiEntryMemDb } from '../multiEntryMemDb'

type MockEntry = Identifiable & {
  title: string
  content?: string
}

const mockEntry = (data: Partial<MockEntry> = {}): MockEntry => {
  const id = data.id || `entry-${Math.floor(Math.random() * 10000)}`
  return {
    id,
    title: `Item ${id}`,
    content: 'Some test content',
    ...data,
  }
}

const createDb = () => {
  return new MultiEntryMemDb<MockEntry>()
}

const setupDbWithEntries = async (entries: Array<MockEntry> = []) => {
  const db = createDb()

  // Add initial entries
  for (const entry of entries) {
    await db.create(entry)
  }

  return { db, entries }
}

describe('MultiEntryMemDb', () => {
  describe('constructor', () => {
    it('should create a new instance of MultiEntryMemDb', () => {
      const db = createDb()
      expect(db).toBeInstanceOf(MultiEntryMemDb)
    })

    it('should start with empty entries', async () => {
      const db = createDb()
      const count = await db.countAll()
      expect(count).toBe(0)
    })
  })

  describe('create', () => {
    it('creates and stores entry in memory', async () => {
      const db = createDb()
      const entry = mockEntry({ id: 'test-entry', title: 'Test Title' })

      const created = await db.create(entry)

      expect(created).toEqual(entry)
      const retrieved = await db.getById('test-entry')
      expect(retrieved).toEqual(entry)
    })

    it('overwrites existing entry with same id', async () => {
      const db = createDb()
      const originalEntry = mockEntry({ id: 'same-id', title: 'Original' })
      const updatedEntry = mockEntry({ id: 'same-id', title: 'Updated' })

      await db.create(originalEntry)
      await db.create(updatedEntry)

      const retrieved = await db.getById('same-id')
      expect(retrieved?.title).toBe('Updated')
    })
  })

  describe('getById', () => {
    it('returns entry when it exists', async () => {
      const entry = mockEntry({ id: 'existing-entry' })
      const { db } = await setupDbWithEntries([entry])

      const result = await db.getById('existing-entry')

      expect(result).toEqual(entry)
    })

    it('returns null when entry does not exist', async () => {
      const db = createDb()
      const result = await db.getById('nonexistent-id')

      expect(result).toBeNull()
    })
  })

  describe('getByIdOrThrow', () => {
    it('returns entry when it exists', async () => {
      const entry = mockEntry({ id: 'existing-entry' })
      const { db } = await setupDbWithEntries([entry])

      const result = await db.getByIdOrThrow('existing-entry')

      expect(result).toEqual(entry)
    })

    it('throws when entry does not exist', async () => {
      const db = createDb()
      await expect(db.getByIdOrThrow('nonexistent')).rejects.toThrow(
        'Entry with id nonexistent does not exist',
      )
    })
  })

  describe('getAll', () => {
    it('returns empty array when no entries exist', async () => {
      const db = createDb()
      const results = await db.getAll()

      expect(results).toEqual([])
    })

    it('returns all entries', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'First' }),
        mockEntry({ id: 'entry2', title: 'Second' }),
        mockEntry({ id: 'entry3', title: 'Third' }),
      ]
      const { db } = await setupDbWithEntries(entries)

      const results = await db.getAll()

      expect(results).toHaveLength(3)
      expect(results).toEqual(expect.arrayContaining(entries))
    })

    it('returns only specified entries when whereIds provided', async () => {
      const entries = [
        mockEntry({ id: 'entry1' }),
        mockEntry({ id: 'entry2' }),
        mockEntry({ id: 'entry3' }),
      ]
      const { db } = await setupDbWithEntries(entries)

      const results = await db.getAll(['entry1', 'entry3'])

      expect(results).toHaveLength(2)
      expect(results.map((e) => e.id)).toEqual(expect.arrayContaining(['entry1', 'entry3']))
    })

    it('skips non-existent ids when whereIds provided', async () => {
      const entries = [mockEntry({ id: 'entry1' })]
      const { db } = await setupDbWithEntries(entries)

      const results = await db.getAll(['entry1', 'nonexistent'])

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('entry1')
    })
  })

  describe('getAllIds', () => {
    it('returns empty array when no entries exist', async () => {
      const db = createDb()
      const ids = await db.getAllIds()

      expect(ids).toEqual([])
    })

    it('returns all entry ids', async () => {
      const entries = [mockEntry({ id: 'id1' }), mockEntry({ id: 'id2' }), mockEntry({ id: 'id3' })]
      const { db } = await setupDbWithEntries(entries)

      const ids = await db.getAllIds()

      expect(ids).toHaveLength(3)
      expect(ids).toEqual(expect.arrayContaining(['id1', 'id2', 'id3']))
    })
  })

  describe('getWhere', () => {
    it('returns entries matching predicate', async () => {
      const entries = [
        mockEntry({ id: 'match1', title: 'Match' }),
        mockEntry({ id: 'match2', title: 'Match' }),
        mockEntry({ id: 'nomatch', title: 'NoMatch' }),
      ]
      const { db } = await setupDbWithEntries(entries)

      const results = await db.getWhere((e) => e.title === 'Match')

      expect(results).toHaveLength(2)
      expect(results.every((e) => e.title === 'Match')).toBe(true)
    })

    it('respects max parameter', async () => {
      const entries = [
        mockEntry({ id: '1', title: 'Match' }),
        mockEntry({ id: '2', title: 'Match' }),
        mockEntry({ id: '3', title: 'Match' }),
      ]
      const { db } = await setupDbWithEntries(entries)

      const results = await db.getWhere((e) => e.title === 'Match', 2)

      expect(results).toHaveLength(2)
    })

    it('returns empty array when no matches', async () => {
      const entries = [mockEntry({ id: '1', title: 'NoMatch' })]
      const { db } = await setupDbWithEntries(entries)

      const results = await db.getWhere((e) => e.title === 'Match')

      expect(results).toEqual([])
    })
  })

  describe('update', () => {
    it('updates and returns existing entry', async () => {
      const originalEntry = mockEntry({
        id: 'update-test',
        title: 'Original',
        content: 'Original content',
      })
      const { db } = await setupDbWithEntries([originalEntry])

      const updated = await db.update('update-test', () => ({
        title: 'Updated Title',
      }))

      expect(updated).toBeDefined()
      expect(updated.content).toBe(originalEntry.content)
      expect(updated.title).toBe('Updated Title')
    })

    it('throws when entry does not exist', async () => {
      const db = createDb()
      await expect(db.update('nonexistent', (entry) => entry)).rejects.toThrow(
        'Entry with id nonexistent does not exist',
      )
    })

    it('handles id changes', async () => {
      const originalEntry = mockEntry({ id: 'old-id', title: 'Title' })
      const { db } = await setupDbWithEntries([originalEntry])

      const updated = await db.update('old-id', () => ({ id: 'new-id' }))

      expect(updated.id).toBe('new-id')
      expect(await db.exists('old-id')).toBe(false)
      expect(await db.exists('new-id')).toBe(true)
    })

    it('supports async updater function', async () => {
      const originalEntry = mockEntry({ id: 'async-test', title: 'Original' })
      const { db } = await setupDbWithEntries([originalEntry])

      const updated = await db.update('async-test', async (entry) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { title: 'Async Updated' }
      })

      expect(updated.title).toBe('Async Updated')
    })
  })

  describe('delete', () => {
    it('deletes existing entry and returns true', async () => {
      const entry = mockEntry({ id: 'delete-test' })
      const { db } = await setupDbWithEntries([entry])

      const deleted = await db.delete('delete-test')

      expect(deleted).toBe(true)
      expect(await db.exists('delete-test')).toBe(false)
    })

    it('returns false when entry does not exist', async () => {
      const db = createDb()
      const deleted = await db.delete('nonexistent')

      expect(deleted).toBe(false)
    })
  })

  describe('deleteByIds', () => {
    it('deletes specified entries', async () => {
      const entries = [
        mockEntry({ id: 'delete1' }),
        mockEntry({ id: 'delete2' }),
        mockEntry({ id: 'keep' }),
      ]
      const { db } = await setupDbWithEntries(entries)

      const result = await db.deleteByIds(['delete1', 'delete2'])

      expect(result.deletedIds).toHaveLength(2)
      expect(result.deletedIds).toEqual(expect.arrayContaining(['delete1', 'delete2']))
      expect(await db.exists('delete1')).toBe(false)
      expect(await db.exists('delete2')).toBe(false)
      expect(await db.exists('keep')).toBe(true)
    })

    it('handles non-existent ids gracefully', async () => {
      const entries = [mockEntry({ id: 'exists' })]
      const { db } = await setupDbWithEntries(entries)

      const result = await db.deleteByIds(['exists', 'nonexistent'])

      expect(result.deletedIds).toContain('exists')
      expect(result.deletedIds).not.toContain('nonexistent')
    })
  })

  describe('deleteWhere', () => {
    it('deletes entries matching predicate', async () => {
      const entries = [
        mockEntry({ id: 'delete1', title: 'Delete' }),
        mockEntry({ id: 'delete2', title: 'Delete' }),
        mockEntry({ id: 'keep', title: 'Keep' }),
      ]
      const { db } = await setupDbWithEntries(entries)

      const result = await db.deleteWhere((e) => e.title === 'Delete')

      expect(result.deletedIds).toHaveLength(2)
      expect(await db.countAll()).toBe(1)
      expect(await db.exists('keep')).toBe(true)
    })

    it('returns empty arrays when no matches', async () => {
      const entries = [mockEntry({ id: 'keep', title: 'Keep' })]
      const { db } = await setupDbWithEntries(entries)

      const result = await db.deleteWhere((e) => e.title === 'NoMatch')

      expect(result.deletedIds).toEqual([])
      expect(result.ignoredIds).toEqual([])
    })
  })

  describe('destroy', () => {
    it('clears all entries from memory', async () => {
      const entries = [
        mockEntry({ id: 'entry1' }),
        mockEntry({ id: 'entry2' }),
        mockEntry({ id: 'entry3' }),
      ]
      const { db } = await setupDbWithEntries(entries)

      await db.destroy()

      expect(await db.countAll()).toBe(0)
      expect(await db.getAllIds()).toEqual([])
    })
  })

  describe('exists', () => {
    it('returns true when entry exists', async () => {
      const entry = mockEntry({ id: 'exists-test' })
      const { db } = await setupDbWithEntries([entry])

      const exists = await db.exists('exists-test')

      expect(exists).toBe(true)
    })

    it('returns false when entry does not exist', async () => {
      const db = createDb()
      const exists = await db.exists('nonexistent')

      expect(exists).toBe(false)
    })
  })

  describe('countAll', () => {
    it('returns 0 when no entries exist', async () => {
      const db = createDb()
      const count = await db.countAll()

      expect(count).toBe(0)
    })

    it('returns correct count of entries', async () => {
      const entries = [
        mockEntry({ id: 'count1' }),
        mockEntry({ id: 'count2' }),
        mockEntry({ id: 'count3' }),
        mockEntry({ id: 'count4' }),
      ]
      const { db } = await setupDbWithEntries(entries)
      const count = await db.countAll()

      expect(count).toBe(4)
    })
  })

  describe('countWhere', () => {
    it('returns count of entries matching predicate', async () => {
      const entries = [
        mockEntry({ id: '1', title: 'Match' }),
        mockEntry({ id: '2', title: 'Match' }),
        mockEntry({ id: '3', title: 'NoMatch' }),
      ]
      const { db } = await setupDbWithEntries(entries)

      const count = await db.countWhere((e) => e.title === 'Match')

      expect(count).toBe(2)
    })

    it('returns 0 when no matches', async () => {
      const entries = [mockEntry({ id: '1', title: 'NoMatch' })]
      const { db } = await setupDbWithEntries(entries)

      const count = await db.countWhere((e) => e.title === 'Match')

      expect(count).toBe(0)
    })
  })

  describe('memory-specific features', () => {
    it('maintains data isolation between instances', async () => {
      const db1 = createDb()
      const db2 = createDb()

      await db1.create(mockEntry({ id: 'db1-entry' }))
      await db2.create(mockEntry({ id: 'db2-entry' }))

      expect(await db1.exists('db1-entry')).toBe(true)
      expect(await db1.exists('db2-entry')).toBe(false)
      expect(await db2.exists('db2-entry')).toBe(true)
      expect(await db2.exists('db1-entry')).toBe(false)
    })

    it('handles concurrent operations correctly', async () => {
      const db = createDb()
      const entries = Array.from({ length: 100 }, (_, i) => mockEntry({ id: `entry-${i}` }))

      await Promise.all(entries.map((e) => db.create(e)))

      expect(await db.countAll()).toBe(100)
    })

    it('provides fast lookups for large datasets', async () => {
      const db = createDb()
      const entries = Array.from({ length: 1000 }, (_, i) => mockEntry({ id: `entry-${i}` }))

      for (const entry of entries) {
        await db.create(entry)
      }

      const start = Date.now()
      await db.getById('entry-500')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(10) // Should be nearly instant
    })
  })
})
