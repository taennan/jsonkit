import type { Identifiable } from '../../common/types'
import { MultiEntryFileDb } from '../multiEntryFileDb'
import * as fs from 'fs/promises'
import * as path from 'path'

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

const testOutputPath = path.join(__dirname, 'multiEntryFileDb')

const dbpath = (...segments: string[]) => path.join(testOutputPath, ...segments)

const createDb = (
  dirName: string,
  options: {
    initialEntries?: MockEntry[]
  } = {},
) => {
  const { initialEntries } = options
  const dirpath = dbpath(dirName)
  const database = new MultiEntryFileDb<MockEntry>(dirpath)

  return { db: database, dirpath, initialEntries }
}

const setupDbWithEntries = async (dirName: string, entries: Array<MockEntry> = []) => {
  const { db, dirpath } = createDb(dirName)

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
      const { db, dirpath } = await setupDbWithEntries('creates-directory')
      const entry = mockEntry({ id: 'test-entry' })

      await db.create(entry)

      expect(await fileExists(dirpath)).toBe(true)
    })

    it('creates entry file with correct content', async () => {
      const { db, dirpath } = await setupDbWithEntries('creates-entry-file')
      const entry = mockEntry({ id: 'test-entry', title: 'Test Title' })

      await db.create(entry)

      const filepath = path.join(dirpath, 'test-entry.json')
      expect(await fileExists(filepath)).toBe(true)

      const fileContent = await fs.readFile(filepath, 'utf8')
      const parsedContent = JSON.parse(fileContent) as unknown
      expect(parsedContent).toEqual(entry)
    })

    it('overwrites existing entry with same id', async () => {
      const { db } = await setupDbWithEntries('overwrites-existing')
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
      const { db } = await setupDbWithEntries('get-existing', [entry])
      const result = await db.getById('existing-entry')

      expect(result).toEqual(entry)
    })

    it('returns null when entry does not exist', async () => {
      const { db } = await setupDbWithEntries('get-nonexistent')
      const result = await db.getById('nonexistent-id')

      expect(result).toBeNull()
    })

    it('returns null when directory does not exist', async () => {
      const db = new MultiEntryFileDb<MockEntry>('/tmp/nonexistant')
      const result = await db.getById('any-id')

      expect(result).toBeNull()
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
      const { db } = await setupDbWithEntries('getwhere-no-pagination', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match')

      expect(results).toHaveLength(3)
      expect(results.map((r) => r.id)).toEqual(['entry1', 'entry3', 'entry5'])
    })

    it('returns empty array when no entries match', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'First' }),
        mockEntry({ id: 'entry2', title: 'Second' }),
      ]
      const { db } = await setupDbWithEntries('getwhere-no-match', entries)

      const results = await db.getWhere((entry) => entry.title === 'Nonexistent')

      expect(results).toEqual([])
    })

    it('returns empty array when directory is empty', async () => {
      const { db } = await setupDbWithEntries('getwhere-empty')

      const results = await db.getWhere(() => true)

      expect(results).toEqual([])
    })

    it('returns first page of matching entries', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
        mockEntry({ id: 'entry4', title: 'Match' }),
        mockEntry({ id: 'entry5', title: 'Match' }),
      ]
      const { db } = await setupDbWithEntries('getwhere-page1', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', { take: 2, page: 1 })

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.id)).toEqual(['entry1', 'entry2'])
    })

    it('returns second page of matching entries', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
        mockEntry({ id: 'entry4', title: 'Match' }),
        mockEntry({ id: 'entry5', title: 'Match' }),
      ]
      const { db } = await setupDbWithEntries('getwhere-page2', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', { take: 2, page: 2 })

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.id)).toEqual(['entry3', 'entry4'])
    })

    it('returns partial page when fewer entries remain', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
      ]
      const { db } = await setupDbWithEntries('getwhere-partial-page', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', { take: 2, page: 2 })

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('entry3')
    })

    it('returns empty array when page is beyond available entries', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
      ]
      const { db } = await setupDbWithEntries('getwhere-page-beyond', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', { take: 2, page: 5 })

      expect(results).toEqual([])
    })

    it('applies skip offset correctly', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
        mockEntry({ id: 'entry4', title: 'Match' }),
        mockEntry({ id: 'entry5', title: 'Match' }),
      ]
      const { db } = await setupDbWithEntries('getwhere-skip', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', {
        take: 2,
        page: 1,
        skip: 1,
      })

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.id)).toEqual(['entry2', 'entry3'])
    })

    it('combines page and skip correctly', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'Match' }),
        mockEntry({ id: 'entry2', title: 'Match' }),
        mockEntry({ id: 'entry3', title: 'Match' }),
        mockEntry({ id: 'entry4', title: 'Match' }),
        mockEntry({ id: 'entry5', title: 'Match' }),
        mockEntry({ id: 'entry6', title: 'Match' }),
      ]
      const { db } = await setupDbWithEntries('getwhere-page-skip', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', {
        take: 2,
        page: 2,
        skip: 1,
      })

      // page 2 with take 2 starts at index 2 (0-indexed)
      // skip 1 adds 1, so we start at index 3
      // we take 2 entries: entry4 and entry5
      expect(results).toHaveLength(2)
      expect(results.map((r) => r.id)).toEqual(['entry4', 'entry5'])
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
      const { db } = await setupDbWithEntries('getwhere-mixed-pagination', entries)

      const results = await db.getWhere((entry) => entry.title === 'Match', { take: 2, page: 2 })

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.id)).toEqual(['entry5', 'entry6'])
    })
  })

  describe('getAll', () => {
    it('returns empty array when no entries exist', async () => {
      const { db } = await setupDbWithEntries('getall-empty')

      const results = await db.getAll()

      expect(results).toEqual([])
    })

    it('returns all entries', async () => {
      const entries = [
        mockEntry({ id: 'entry1', title: 'First' }),
        mockEntry({ id: 'entry2', title: 'Second' }),
        mockEntry({ id: 'entry3', title: 'Third' }),
      ]
      const { db } = await setupDbWithEntries('getall-multiple', entries)

      const results = await db.getAll()

      expect(results).toHaveLength(3)
      expect(results).toEqual(expect.arrayContaining(entries))
    })

    it('skips invalid JSON files', async () => {
      const validEntry = mockEntry({ id: 'valid-entry' })
      const { db, dirpath } = await setupDbWithEntries('getall-invalid-json', [validEntry])

      // Create an invalid JSON file
      await fs.writeFile(path.join(dirpath, 'invalid.json'), 'invalid json content')

      const results = await db.getAll()

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual(validEntry)
    })
  })

  describe('getAllIds', () => {
    it('returns empty array when no entries exist', async () => {
      const { db } = await setupDbWithEntries('getallids-empty')

      const ids = await db.getAllIds()

      expect(ids).toEqual([])
    })

    it('returns all entry ids', async () => {
      const entries = [mockEntry({ id: 'id1' }), mockEntry({ id: 'id2' }), mockEntry({ id: 'id3' })]
      const { db } = await setupDbWithEntries('getallids-multiple', entries)

      const ids = await db.getAllIds()

      expect(ids).toHaveLength(3)
      expect(ids).toEqual(expect.arrayContaining(['id1', 'id2', 'id3']))
    })

    it('only includes .json files', async () => {
      const entry = mockEntry({ id: 'valid-entry' })
      const { db, dirpath } = await setupDbWithEntries('getallids-filter', [entry])

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
      const { db } = await setupDbWithEntries('update-existing', [originalEntry])

      const updated = await db.update('update-test', (entry) => ({
        ...entry,
        title: 'Updated Title',
      }))

      expect(updated).toBeDefined()
      expect(updated?.content).toBe(originalEntry.content)
      expect(updated?.title).toBe('Updated Title')
    })

    it('throws when entry does not exist', async () => {
      const { db } = await setupDbWithEntries('update-nonexistent')
      await expect(db.update('nonexistent', (entry) => entry)).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('deletes existing entry and returns boolean', async () => {
      const entry = mockEntry({ id: 'delete-test' })
      const { db, dirpath } = await setupDbWithEntries('delete-existing', [entry])

      const amountDeleted = await db.deleteById('delete-test')
      expect(amountDeleted).toBe(true)

      const filepath = path.join(dirpath, 'delete-test.json')
      expect(await fileExists(filepath)).toBe(false)

      const retrieved = await db.getById('delete-test')
      expect(retrieved).toBeNull()
    })

    it('returns false when entry does not exist', async () => {
      const { db } = await setupDbWithEntries('delete-nonexistent')

      const amountDeleted = await db.deleteById('nonexistent')
      expect(amountDeleted).toBe(false)
    })
  })

  describe('exists', () => {
    it('returns true when entry exists', async () => {
      const entry = mockEntry({ id: 'exists-test' })
      const { db } = await setupDbWithEntries('exists-true', [entry])

      const exists = await db.exists('exists-test')

      expect(exists).toBe(true)
    })

    it('returns false when entry does not exist', async () => {
      const { db } = await setupDbWithEntries('exists-false')

      const exists = await db.exists('nonexistent')

      expect(exists).toBe(false)
    })
  })

  describe('count', () => {
    it('returns 0 when no entries exist', async () => {
      const { db } = await setupDbWithEntries('count-zero')
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
      const { db } = await setupDbWithEntries('count-multiple', entries)
      const count = await db.countAll()

      expect(count).toBe(4)
    })

    it('ignores non-json files', async () => {
      const entry = mockEntry({ id: 'count-filter' })
      const { db, dirpath } = await setupDbWithEntries('count-filter-test', [entry])

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
})
