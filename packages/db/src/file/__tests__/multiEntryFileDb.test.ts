import type { Id, Identifiable, JsonEntryParser } from '../../common/types'
import { MultiEntryFileDb } from '../multiEntryFileDb'
import * as fs from 'fs/promises'
import * as path from 'path'

type MockEntry = Identifiable & {
  title: string
  content?: string
}

class ObjectId {
  constructor(private readonly value: number) {}

  toString(): string {
    return String(this.value)
  }
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

const testOutputPath = path.join(__dirname, 'multiEntryFileDb')

const dbpath = (...segments: string[]) => path.join(testOutputPath, ...segments)

const setupDb = async <T extends Identifiable = any>(
  dirName: string,
  entries: Array<T> = [],
  parser?: JsonEntryParser<T>,
) => {
  const dirpath = dbpath(dirName)
  const db = new MultiEntryFileDb<T>(dirpath, { parser, disableLogs: true })

  // Clean and create directory
  await fs.rm(dirpath, { recursive: true, force: true })
  await fs.mkdir(dirpath, { recursive: true })

  // Add initial entries
  for (const entry of entries) {
    await db.create(entry)
  }

  return { db, dirpath, entries }
}

const fileExists = async (filepath: string): Promise<boolean> => {
  try {
    await fs.stat(filepath)
    return true
  } catch {
    return false
  }
}

describe('MultiEntryFileDb', () => {
  beforeAll(async () => {
    await fs.mkdir(testOutputPath, { recursive: true })
  })

  afterAll(async () => {
    await fs.rm(testOutputPath, { recursive: true, force: true })
  })

  describe('constructor', () => {
    it('should create a new instance of MultiEntryFileDb', () => {
      const dirpath = dbpath('constructor-test')
      const db = new MultiEntryFileDb<MockEntry>(dirpath)
      expect(db).toBeInstanceOf(MultiEntryFileDb)
    })
  })

  describe('create', () => {
    it('creates directory if it does not exist', async () => {
      const { db, dirpath } = await setupDb('creates-directory')
      const entry = mockEntry({ id: 'test-entry' })

      await db.create(entry)

      expect(await fileExists(dirpath)).toBe(true)
    })

    it('creates entry file with correct content', async () => {
      const { db, dirpath } = await setupDb('creates-entry-file')
      const entry = mockEntry({ id: 'test-entry', title: 'Test Title' })

      await db.create(entry)

      const filepath = path.join(dirpath, 'test-entry.json')
      expect(await fileExists(filepath)).toBe(true)

      const fileContent = await fs.readFile(filepath, 'utf8')
      const parsedContent = JSON.parse(fileContent) as unknown
      expect(parsedContent).toEqual(entry)
    })

    it('overwrites existing entry with same id', async () => {
      const { db } = await setupDb('overwrites-existing')
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
      const { db } = await setupDb('get-existing', [entry])
      const result = await db.getById('existing-entry')

      expect(result).toEqual(entry)
    })

    it('returns null when entry does not exist', async () => {
      const { db } = await setupDb('get-nonexistent')
      const result = await db.getById('nonexistent-id')

      expect(result).toBeNull()
    })

    it('returns null when directory does not exist', async () => {
      const db = new MultiEntryFileDb<MockEntry>('/tmp/nonexistant')
      const result = await db.getById('any-id')

      expect(result).toBeNull()
    })

    it('handles object ids', async () => {
      const entry = mockEntry({ id: new ObjectId(0) })
      const { db } = await setupDb('get-object-id', [entry])
      const result = await db.getById(entry.id)

      expect(result).toEqual(entry)
    })
  })

  describe('getWhere', () => {
    it('returns all matching entries when no pagination', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'NoMatch' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
        mockEntry({ id: 'entry4', title: 'NoMatch' }),
        mockEntry({ id: 'entry5', title: 'Match' }),
      ]
      const { db } = await setupDb('getwhere-no-pagination', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match')

      expect(results).toHaveLength(3)
      expect(results.map((r) => r.id)).toEqual(['entry1', 'entry3', 'entry5'])
    })

    it('returns empty array when no entries match', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'First' }),
        mockEntry({ id: 'entry2', title: 'Second' }),
      ]
      const { db } = await setupDb('getwhere-no-match', entries)

      const results = await db.getWhere((entry) => entry.title === 'Nonexistent')

      expect(results).toEqual([])
    })

    it('returns empty array when directory is empty', async () => {
      const { db } = await setupDb('getwhere-empty')

      const results = await db.getWhere(() => true)

      expect(results).toEqual([])
    })

    it('returns first page of matching entries', async () => {
      const entries = [
        mockEntry({ id: 'entry0', title: 'Match' }),
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
        mockEntry({ id: 'entry4', title: 'Match' }),
      ]
      const { db } = await setupDb('getwhere-page1', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', { take: 2, page: 1 })

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.id)).toEqual(['entry2', 'entry3'])
    })

    it('returns second page of matching entries', async () => {
      const entries = [
        mockEntry({ id: 'entry0', title: 'Match' }),
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
        mockEntry({ id: 'entry4', title: 'Match' }),
      ]
      const { db } = await setupDb('getwhere-page2', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', { take: 2, page: 1 })

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.id)).toEqual(['entry2', 'entry3'])
    })

    it('returns partial page when fewer entries remain', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
      ]
      const { db } = await setupDb('getwhere-partial-page', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', { take: 2, page: 1 })

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('entry3')
    })

    it('returns empty array when page is beyond available entries', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
      ]
      const { db } = await setupDb('getwhere-page-beyond', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', { take: 2, page: 5 })

      expect(results).toEqual([])
    })

    it('only counts matching entries for pagination', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'NoMatch' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
        mockEntry({ id: 'entry4', title: 'NoMatch' }),
        mockEntry({ id: 'entry5', title: 'Match' }),
        mockEntry({ id: 'entry6', title: 'Match' }),
      ]
      const { db } = await setupDb('getwhere-mixed-pagination', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', { take: 2, page: 2 })

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.id)).toEqual(['entry5', 'entry6'])
    })
  })

  describe('getAll', () => {
    it('returns empty array when no entries exist', async () => {
      const { db } = await setupDb('getall-empty')

      const results = await db.getAll()

      expect(results).toEqual([])
    })

    it('returns all entries', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'First' }),
        mockEntry({ id: 'entry2', title: 'Second' }),
        mockEntry({ id: 'entry3', title: 'Third' }),
      ]
      const { db } = await setupDb('getall-multiple', entries)

      const results = await db.getAll()

      expect(results).toHaveLength(3)
      expect(results).toEqual(expect.arrayContaining(entries))
    })

    it('skips invalid JSON files', async () => {
      const validEntry = mockEntry({ id: 'valid-entry' })
      const { db, dirpath } = await setupDb('getall-invalid-json', [validEntry])

      // Create an invalid JSON file
      await fs.writeFile(path.join(dirpath, 'invalid.json'), 'invalid json content')

      const results = await db.getAll()

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual(validEntry)
    })
  })

  describe('getAllIds', () => {
    it('returns empty array when no entries exist', async () => {
      const { db } = await setupDb('getallids-empty')

      const ids = await db.getAllIds()

      expect(ids).toEqual([])
    })

    it('returns all entry ids', async () => {
      const entries = [mockEntry({ id: 'id1' }), mockEntry({ id: 'id2' }), mockEntry({ id: 'id3' })]
      const { db } = await setupDb('getallids-multiple', entries)

      const ids = await db.getAllIds()

      expect(ids).toHaveLength(3)
      expect(ids).toEqual(expect.arrayContaining(['id1', 'id2', 'id3']))
    })

    it('only includes .json files', async () => {
      const entry = mockEntry({ id: 'valid-entry' })
      const { db, dirpath } = await setupDb('getallids-filter', [entry])

      // Create non-JSON files
      await fs.writeFile(path.join(dirpath, 'not-json.txt'), 'text file')
      await fs.writeFile(path.join(dirpath, 'readme.md'), 'markdown file')

      const ids = await db.getAllIds()

      expect(ids).toEqual(['valid-entry'])
    })
  })

  describe('update', () => {
    it('updates and returns existing entry', async () => {
      const originalEntry = mockEntry({
        id: 'update-test',
        title: 'Original',
        content: 'Original content',
      })
      const { db } = await setupDb('update-existing', [originalEntry])

      const updated = await db.updateById('update-test', (entry) => ({
        ...entry,
        title: 'Updated Title',
      }))

      expect(updated).toBeDefined()
      expect(updated?.content).toBe(originalEntry.content)
      expect(updated?.title).toBe('Updated Title')
    })

    it('throws when entry does not exist', async () => {
      const { db } = await setupDb('update-nonexistent')
      await expect(db.updateById('nonexistent', (entry) => entry)).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('deletes existing entry and returns boolean', async () => {
      const entry = mockEntry({ id: 'delete-test' })
      const { db, dirpath } = await setupDb('delete-existing', [entry])

      const amountDeleted = await db.deleteById('delete-test')
      expect(amountDeleted).toBe(true)

      const filepath = path.join(dirpath, 'delete-test.json')
      expect(await fileExists(filepath)).toBe(false)

      const retrieved = await db.getById('delete-test')
      expect(retrieved).toBeNull()
    })

    it('returns false when entry does not exist', async () => {
      const { db } = await setupDb('delete-nonexistent')

      const amountDeleted = await db.deleteById('nonexistent')
      expect(amountDeleted).toBe(false)
    })
  })

  describe('exists', () => {
    it('returns true when entry exists', async () => {
      const entry = mockEntry({ id: 'exists-test' })
      const { db } = await setupDb('exists-true', [entry])

      const exists = await db.exists('exists-test')

      expect(exists).toBe(true)
    })

    it('returns false when entry does not exist', async () => {
      const { db } = await setupDb('exists-false')

      const exists = await db.exists('nonexistent')

      expect(exists).toBe(false)
    })
  })

  describe('count', () => {
    it('returns 0 when no entries exist', async () => {
      const { db } = await setupDb('count-zero')
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
      const { db } = await setupDb('count-multiple', entries)
      const count = await db.countAll()

      expect(count).toBe(4)
    })

    it('ignores non-json files', async () => {
      const entry = mockEntry({ id: 'count-filter' })
      const { db, dirpath } = await setupDb('count-filter-test', [entry])

      // Add non-JSON files
      await fs.writeFile(path.join(dirpath, 'readme.txt'), 'text')
      await fs.writeFile(path.join(dirpath, 'config.yaml'), 'yaml')
      const count = await db.countAll()

      expect(count).toBe(1)
    })
  })

  describe('isIdValid', () => {
    it('returns false when id has forward slashes by default', () => {
      const db = new MultiEntryFileDb('')
      const input = '../otherDir/otherFile.json'
      const actual = db.isIdValid(input)
      expect(actual).toBe(false)
    })

    it('returns true when id has forward slashes when allowed via options', () => {
      const db = new MultiEntryFileDb('', { noPathlikeIds: false })
      const input = '../otherDir/otherFile.json'
      const actual = db.isIdValid(input)
      expect(actual).toBe(true)
    })

    it('returns false when id has back slashes by default', () => {
      const db = new MultiEntryFileDb('')
      const input = 'C:\\otherDir\\otherFile.json'
      const actual = db.isIdValid(input)
      expect(actual).toBe(false)
    })

    it('returns true when id has back slashes when allowed via options', () => {
      const db = new MultiEntryFileDb('', { noPathlikeIds: false })
      const input = 'C:\\otherDir\\otherFile.json'
      const actual = db.isIdValid(input)
      expect(actual).toBe(true)
    })
  })

  describe('getByIdOrThrow', () => {
    it('returns entry when it exists', async () => {
      const entry = mockEntry({ id: 'throw-existing' })
      const { db } = await setupDb('getbyidorthrow-existing', [entry])

      const result = await db.getByIdOrThrow('throw-existing')

      expect(result).toEqual(entry)
    })

    it('throws when entry does not exist', async () => {
      const { db } = await setupDb('getbyidorthrow-missing')

      await expect(db.getByIdOrThrow('nonexistent')).rejects.toThrow()
    })
  })

  describe('getFirstWhere', () => {
    it('returns the first matching entry', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
        mockEntry({ id: 'entry3', title: 'NoMatch' }),
      ]
      const { db } = await setupDb('getfirstwhere-match', entries)

      const result = await db.getFirstWhere((e) => e.title === 'Match')

      expect(result?.id).toEqual(entries[0].id)
    })

    it('returns null when no entry matches', async () => {
      const entries = [mockEntry({ id: 'entry1', title: 'NoMatch' })]
      const { db } = await setupDb('getfirstwhere-nomatch', entries)

      const result = await db.getFirstWhere((e) => e.title === 'Missing')

      expect(result).toBeNull()
    })
  })

  describe('getFirstWhereOrThrow', () => {
    it('returns the first matching entry', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
      ]
      const { db } = await setupDb('getfirstwhereorthrow-match', entries)

      const result = await db.getFirstWhereOrThrow((e) => e.title === 'Match')

      expect(result).toEqual(entries[0])
    })

    it('throws when no entry matches', async () => {
      const { db } = await setupDb('getfirstwhereorthrow-nomatch')

      await expect(db.getFirstWhereOrThrow((e) => e.title === 'Missing')).rejects.toThrow()
    })
  })

  describe('updateWhere', () => {
    it('updates all matching entries', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'NoMatch' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
      ]
      const { db } = await setupDb('updatewhere-all', entries)

      const updated = await db.updateWhere(
        (e) => e.title === 'Match',
        (e) => ({ ...e, content: 'updated' }),
      )

      expect(updated).toHaveLength(2)
      expect(updated.every((e) => e.content === 'updated')).toBe(true)

      const untouched = await db.getById('entry2')
      expect(untouched?.content).toBe('Some test content')
    })

    it('returns empty array when no entries match', async () => {
      const entries = [mockEntry({ id: 'entry1', title: 'NoMatch' })]
      const { db } = await setupDb('updatewhere-nomatch', entries)

      const updated = await db.updateWhere(
        (e) => e.title === 'Missing',
        (e) => ({ ...e, content: 'updated' }),
      )

      expect(updated).toEqual([])
    })

    it('respects pagination', async () => {
      const entries = [
        mockEntry({ id: 'entry0', title: 'Match' }),
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
      ]
      const { db } = await setupDb('updatewhere-paginated', entries)

      const updated = await db.updateWhere(
        (e) => e.title === 'Match',
        (e) => ({ ...e, content: 'updated' }),
        { take: 2, page: 0 },
      )

      expect(updated).toHaveLength(2)
      expect(updated.map((e) => e.id)).toEqual(['entry0', 'entry1'])

      const untouched = await db.getById('entry2')
      expect(untouched?.content).toBe('Some test content')
    })
  })

  describe('updateFirstWhere', () => {
    it('updates only the first matching entry', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
      ]
      const { db } = await setupDb('updatefirstwhere', entries)

      await db.updateFirstWhere(
        (e) => e.title === 'Match',
        (e) => ({ ...e, content: 'updated' }),
      )

      const first = await db.getById('entry1')
      const second = await db.getById('entry2')

      expect(first?.content).toBe('updated')
      expect(second?.content).toBe('Some test content')
    })
  })

  describe('updateById', () => {
    it('handles object ids', async  () => {
        const entry = mockEntry({ id: new ObjectId(0), title: 'entry0' })
        const { db } = await setupDb('update-object-id', [entry])
        const result = await db.updateById(entry.id, (entry) => ({
          ...entry,
          title: 'entryUpdated'
        }))

        expect(result).toEqual({
          id: entry.id,
          content: 'Some test content',
          title: 'entryUpdated'
        })
    })
  })

  describe('updateEntry id change', () => {
    it('deletes old file when id changes', async () => {
      const entry = mockEntry({ id: 'old-id', title: 'Original' })
      const { db, dirpath } = await setupDb('update-id-change', [entry])

      await db.updateById('old-id', (e) => ({ ...e, id: 'new-id' }))

      expect(await fileExists(path.join(dirpath, 'old-id.json'))).toBe(false)
      expect(await fileExists(path.join(dirpath, 'new-id.json'))).toBe(true)

      const retrieved = await db.getById('new-id')
      expect(retrieved?.title).toBe('Original')
    })
  })

  describe('deleteWhere', () => {
    it('deletes all matching entries and reports ids', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'NoMatch' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
      ]
      const { db } = await setupDb('deletewhere-match', entries)

      const result = await db.deleteWhere((e) => e.title === 'Match')

      expect(result.deletedIds).toEqual(expect.arrayContaining(['entry1', 'entry3']))
      expect(result.ignoredIds).toEqual([])

      expect(await db.getById('entry2')).not.toBeNull()
      expect(await db.getById('entry1')).toBeNull()
      expect(await db.getById('entry3')).toBeNull()
    })

    it('returns empty deletedIds when nothing matches', async () => {
      const entries = [mockEntry({ id: 'entry1', title: 'NoMatch' })]
      const { db } = await setupDb('deletewhere-nomatch', entries)

      const result = await db.deleteWhere((e) => e.title === 'Missing')

      expect(result.deletedIds).toEqual([])
      expect(result.ignoredIds).toEqual([])
    })
  })

  describe('deleteByIds', () => {
    it('deletes entries by id list', async () => {
      const entries = [
        mockEntry({ id: 'del1' }),
        mockEntry({ id: 'del2' }),
        mockEntry({ id: 'del3' }),
      ]
      const { db } = await setupDb('deletebyids', entries)

      const result = await db.deleteByIds(['del1', 'del3'])

      expect(result.deletedIds).toEqual(expect.arrayContaining(['del1', 'del3']))
      expect(result.ignoredIds).toEqual([])
      expect(await db.getById('del2')).not.toBeNull()
      expect(await db.getById('del1')).toBeNull()
    })

    it('reports nothing deleted when ids do not exist', async () => {
      const { db } = await setupDb('deletebyids-missing')

      const result = await db.deleteByIds(['ghost1', 'ghost2'])

      expect(result.deletedIds).toEqual([])
    })
  })

  describe('countWhere', () => {
    it('counts matching entries without pagination', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'NoMatch' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
      ]
      const { db } = await setupDb('countwhere-all', entries)

      const count = await db.countWhere((e) => e.title === 'Match')

      expect(count).toBe(2)
    })

    it('counts matching entries within a paginated window', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
        mockEntry({ id: 'entry4', title: 'Match' }),
      ]
      const { db } = await setupDb('countwhere-paginated', entries)

      const count = await db.countWhere((e) => e.title === 'Match', { take: 2, page: 1 })

      expect(count).toBe(2)
    })

    it('returns 0 when no entries match', async () => {
      const entries = [mockEntry({ id: 'entry1', title: 'NoMatch' })]
      const { db } = await setupDb('countwhere-nomatch', entries)

      const count = await db.countWhere((e) => e.title === 'Missing')

      expect(count).toBe(0)
    })
  })

  describe('destroy', () => {
    it('removes the entire directory', async () => {
      const entries = [mockEntry({ id: 'entry1' }), mockEntry({ id: 'entry2' })]
      const { db, dirpath } = await setupDb('destroy-test', entries)

      await db.destroy()

      expect(await fileExists(dirpath)).toBe(false)
    })
  })
})
