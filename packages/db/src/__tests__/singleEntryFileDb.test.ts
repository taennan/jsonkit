import { SingleEntryFileDb } from '../singleEntryFileDb'
import { FilesService } from '../files'
import { JsonParser } from '@jsonkit/tools'
import * as fs from 'fs/promises'
import * as path from 'path'

type MockData = {
  name: string
  version: string
  settings: {
    enabled: boolean
    maxItems: number
  }
}

const mockData = (data: Partial<MockData> = {}): MockData => {
  return {
    name: 'test-app',
    version: '1.0.0',
    settings: {
      enabled: true,
      maxItems: 100,
    },
    ...data,
  }
}

const testOutputPath = path.join(__dirname, 'singleFileDb')

const dbpath = (...segments: string[]) => path.join(testOutputPath, ...segments)

const createDb = (filename: string) => {
  const filepath = dbpath(filename)
  const filesService = new FilesService()
  const database = new SingleEntryFileDb<MockData>(filepath, new JsonParser())

  return { db: database, filepath }
}

const setupDbWithData = async (filename: string, data?: MockData) => {
  const { db, filepath } = createDb(filename)

  // Clean up any existing file
  try {
    await fs.unlink(filepath)
  } catch {
    // File might not exist, ignore error
  }

  // Ensure directory exists
  await fs.mkdir(path.dirname(filepath), { recursive: true })

  // Write initial data if provided
  if (data) {
    await db.write(data)
  }

  return { db, filepath, data }
}

const fileExists = async (filepath: string): Promise<boolean> => {
  try {
    await fs.stat(filepath)
    return true
  } catch {
    return false
  }
}

describe('SingleEntryFileDb', () => {
  beforeAll(async () => {
    await fs.mkdir(testOutputPath, { recursive: true })
  })

  afterAll(async () => {
    await fs.rm(testOutputPath, { recursive: true, force: true })
  })

  describe('constructor and configure', () => {
    it('should create a new instance of SingleEntryFileDb', () => {
      const filesService = new FilesService()
      const db = new SingleEntryFileDb<MockData>(testOutputPath, new JsonParser())
      expect(db).toBeInstanceOf(SingleEntryFileDb)
    })

    it('should configure filepath correctly', () => {
      const filepath = dbpath('config-test.json')
      const { db } = createDb('config-test.json')
      expect(db.path()).toBe(filepath)
    })
  })

  describe('path', () => {
    it('returns the configured filepath', () => {
      const filepath = dbpath('path-test.json')
      const { db } = createDb('path-test.json')
      expect(db.path()).toBe(filepath)
    })
  })

  describe('isInited', () => {
    it('returns false when file does not exist', async () => {
      const { db } = createDb('not-exists.json')
      const inited = await db.isInited()
      expect(inited).toBe(false)
    })

    it('returns true when file exists', async () => {
      const data = mockData()
      const { db } = await setupDbWithData('exists.json', data)
      const inited = await db.isInited()
      expect(inited).toBe(true)
    })
  })

  describe('read', () => {
    it('reads existing file correctly', async () => {
      const data = mockData({ name: 'read-test', version: '2.0.0' })
      const { db } = await setupDbWithData('read-existing.json', data)

      const result = await db.read()
      expect(result).toEqual(data)
    })

    it('throws error when file does not exist', async () => {
      const { db } = createDb('read-nonexistent.json')
      await expect(db.read()).rejects.toThrow()
    })

    it('throws error when file contains invalid JSON', async () => {
      const { db, filepath } = createDb('read-invalid.json')

      // Create file with invalid JSON
      await fs.mkdir(path.dirname(filepath), { recursive: true })
      await fs.writeFile(filepath, 'invalid json content')

      await expect(db.read()).rejects.toThrow()
    })
  })

  describe('write', () => {
    it('writes data directly', async () => {
      const data = mockData({ name: 'write-direct', version: '1.5.0' })
      const { db, filepath } = await setupDbWithData('write-direct.json')

      const result = await db.write(data)

      expect(result).toEqual(data)
      expect(await fileExists(filepath)).toBe(true)

      // Verify file content
      const fileContent = await fs.readFile(filepath, 'utf8')
      const parsedContent = JSON.parse(fileContent) as unknown
      expect(parsedContent).toEqual(data)
    })

    it('writes data using updater function', async () => {
      const initialData = mockData({ name: 'write-updater', version: '1.0.0' })
      const { db } = await setupDbWithData('write-updater.json', initialData)

      const result = await db.write((existing) => ({
        ...existing,
        version: '2.0.0',
        settings: {
          ...existing.settings,
          maxItems: 200,
        },
      }))

      expect(result.version).toBe('2.0.0')
      expect(result.settings.maxItems).toBe(200)
      expect(result.name).toBe('write-updater') // Should preserve other fields
    })

    it('creates parent directory if it does not exist', async () => {
      const data = mockData({ name: 'mkdir-test' })
      const filepath = dbpath('deep', 'nested', 'directory', 'mkdir-test.json')
      const filesService = new FilesService()
      const db = new SingleEntryFileDb<MockData>(filepath, new JsonParser())

      const result = await db.write(data)

      expect(result).toEqual(data)
      expect(await fileExists(filepath)).toBe(true)
    })

    it('overwrites existing file', async () => {
      const initialData = mockData({ name: 'overwrite-test', version: '1.0.0' })
      const newData = mockData({ name: 'overwrite-test', version: '3.0.0' })
      const { db, filepath } = await setupDbWithData('overwrite.json', initialData)

      await db.write(newData)

      // Verify file was overwritten
      const fileContent = await fs.readFile(filepath, 'utf8')
      const parsedContent = JSON.parse(fileContent) as unknown as MockData
      expect(parsedContent.version).toBe('3.0.0')
    })

    it('formats JSON with proper indentation', async () => {
      const data = mockData({ name: 'format-test' })
      const { db, filepath } = await setupDbWithData('format.json')

      await db.write(data)

      const fileContent = await fs.readFile(filepath, 'utf8')
      // Check that JSON is formatted (contains newlines and spaces)
      expect(fileContent).toContain('\n')
      expect(fileContent).toContain('  ') // 2-space indentation
    })

    it('throws error with updater function when file does not exist', async () => {
      const { db } = createDb('updater-nonexistent.json')

      await expect(db.write((existing) => existing)).rejects.toThrow()
    })
  })

  describe('edge cases', () => {
    it('handles empty data object', async () => {
      const emptyData = {} as MockData
      const { db } = await setupDbWithData('empty.json')

      const result = await db.write(emptyData)
      expect(result).toEqual(emptyData)

      const readResult = await db.read()
      expect(readResult).toEqual(emptyData)
    })

    it('handles complex nested objects', async () => {
      const complexData = {
        ...mockData(),
        nested: {
          deep: {
            array: [1, 2, 3],
            object: { key: 'value' },
            nullValue: null,
            booleanValue: false,
          },
        },
      }
      const { db } = await setupDbWithData('complex.json')

      const result = await db.write(complexData)
      expect(result).toEqual(complexData)

      const readResult = await db.read()
      expect(readResult).toEqual(complexData)
    })
  })
})
