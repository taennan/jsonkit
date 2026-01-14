import { JsonPatchBuilder } from '../builder'
import { JsonPatchOperationType } from '../types'

describe('JsonPatchBuilder', () => {
  describe('constructor', () => {
    it('creates a new instance with static new method', () => {
      const builder = new JsonPatchBuilder()
      expect(builder).toBeInstanceOf(JsonPatchBuilder)
    })

    it('starts with empty patches array', () => {
      const builder = new JsonPatchBuilder()
      expect(builder.patches()).toEqual([])
    })
  })

  describe('path construction', () => {
    it('constructs path from string', () => {
      const builder = new JsonPatchBuilder()
      builder.add('name', 'John')
      const patches = builder.patches()
      expect(patches[0].path).toBe('/name')
    })

    it('constructs path from number', () => {
      const builder = new JsonPatchBuilder()
      builder.add(0, 'first')
      const patches = builder.patches()
      expect(patches[0].path).toBe('/0')
    })

    it('constructs path from array of strings', () => {
      const builder = new JsonPatchBuilder()
      builder.add(['user', 'name'], 'John')
      const patches = builder.patches()
      expect(patches[0].path).toBe('/user/name')
    })

    it('constructs path from array of mixed types', () => {
      const builder = new JsonPatchBuilder()
      builder.add(['users', 0, 'name'], 'John')
      const patches = builder.patches()
      expect(patches[0].path).toBe('/users/0/name')
    })

    it('handles empty string path', () => {
      const builder = new JsonPatchBuilder()
      builder.add('', 'root')
      const patches = builder.patches()
      expect(patches[0].path).toBe('/')
    })

    it('removes extraneous leading slashes', () => {
      const builder = new JsonPatchBuilder()
      builder.add('/name', 'John')
      const patches = builder.patches()
      expect(patches[0].path).toBe('/name')
    })
  })

  describe('add operation', () => {
    it('creates add operation with string path', () => {
      const builder = new JsonPatchBuilder()
      builder.add('name', 'John')
      const patches = builder.patches()

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        op: 'add',
        path: '/name',
        value: 'John',
      })
    })

    it('creates add operation with array path', () => {
      const builder = new JsonPatchBuilder()
      builder.add(['user', 'details', 'name'], 'John')
      const patches = builder.patches()

      expect(patches[0]).toEqual({
        op: 'add',
        path: '/user/details/name',
        value: 'John',
      })
    })

    it('supports method chaining', () => {
      const builder = new JsonPatchBuilder()
      const result = builder.add('name', 'John')
      expect(result).toBe(builder)
    })

    it('adds multiple operations in sequence', () => {
      const builder = new JsonPatchBuilder()
      builder.add('name', 'John').add('age', 30)
      const patches = builder.patches()

      expect(patches).toHaveLength(2)
      expect(patches[0]).toEqual({
        op: 'add',
        path: '/name',
        value: 'John',
      })
      expect(patches[1]).toEqual({
        op: 'add',
        path: '/age',
        value: 30,
      })
    })

    it('handles complex values', () => {
      const complexValue = { nested: { array: [1, 2, 3] } }
      const builder = new JsonPatchBuilder()
      builder.add('data', complexValue)
      const patches = builder.patches()

      expect(patches[0]).toEqual({
        op: 'add',
        path: '/data',
        value: complexValue,
      })
    })
  })

  describe('remove operation', () => {
    it('creates remove operation', () => {
      const builder = new JsonPatchBuilder()
      builder.remove('name')
      const patches = builder.patches()

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        op: 'remove',
        path: '/name',
      })
    })

    it('creates remove operation with array path', () => {
      const builder = new JsonPatchBuilder()
      builder.remove(['user', 'name'])
      const patches = builder.patches()

      expect(patches[0]).toEqual({
        op: 'remove',
        path: '/user/name',
      })
    })

    it('supports method chaining', () => {
      const builder = new JsonPatchBuilder()
      const result = builder.remove('name')
      expect(result).toBe(builder)
    })
  })

  describe('replace operation', () => {
    it('creates replace operation', () => {
      const builder = new JsonPatchBuilder()
      builder.replace('name', 'Jane')
      const patches = builder.patches()

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        op: 'replace',
        path: '/name',
        value: 'Jane',
      })
    })

    it('creates replace operation with array path', () => {
      const builder = new JsonPatchBuilder()
      builder.replace(['user', 'name'], 'Jane')
      const patches = builder.patches()

      expect(patches[0]).toEqual({
        op: 'replace',
        path: '/user/name',
        value: 'Jane',
      })
    })

    it('supports method chaining', () => {
      const builder = new JsonPatchBuilder()
      const result = builder.replace('name', 'Jane')
      expect(result).toBe(builder)
    })
  })

  describe('move operation', () => {
    it('creates move operation', () => {
      const builder = new JsonPatchBuilder()
      builder.move('oldName', 'newName')
      const patches = builder.patches()

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        op: 'move',
        from: '/oldName',
        path: '/newName',
      })
    })

    it('creates move operation with array paths', () => {
      const builder = new JsonPatchBuilder()
      builder.move(['user', 'oldName'], ['user', 'newName'])
      const patches = builder.patches()

      expect(patches[0]).toEqual({
        op: 'move',
        from: '/user/oldName',
        path: '/user/newName',
      })
    })

    it('supports method chaining', () => {
      const builder = new JsonPatchBuilder()
      const result = builder.move('oldName', 'newName')
      expect(result).toBe(builder)
    })
  })

  describe('copy operation', () => {
    it('creates copy operation', () => {
      const builder = new JsonPatchBuilder()
      builder.copy('source', 'destination')
      const patches = builder.patches()

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        op: 'copy',
        from: '/source',
        path: '/destination',
      })
    })

    it('creates copy operation with array paths', () => {
      const builder = new JsonPatchBuilder()
      builder.copy(['user', 'name'], ['backup', 'name'])
      const patches = builder.patches()

      expect(patches[0]).toEqual({
        op: 'copy',
        from: '/user/name',
        path: '/backup/name',
      })
    })

    it('supports method chaining', () => {
      const builder = new JsonPatchBuilder()
      const result = builder.copy('source', 'destination')
      expect(result).toBe(builder)
    })
  })

  describe('test operation', () => {
    it('creates test operation', () => {
      const builder = new JsonPatchBuilder()
      builder.test('name', 'John')
      const patches = builder.patches()

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        op: 'test',
        path: '/name',
        value: 'John',
      })
    })

    it('creates test operation with array path', () => {
      const builder = new JsonPatchBuilder()
      builder.test(['user', 'name'], 'John')
      const patches = builder.patches()

      expect(patches[0]).toEqual({
        op: 'test',
        path: '/user/name',
        value: 'John',
      })
    })

    it('supports method chaining', () => {
      const builder = new JsonPatchBuilder()
      const result = builder.test('name', 'John')
      expect(result).toBe(builder)
    })
  })

  describe('patches method', () => {
    it('returns copy of patches array', () => {
      const builder = new JsonPatchBuilder()
      builder.add('name', 'John')
      const patches1 = builder.patches()
      const patches2 = builder.patches()

      expect(patches1).toEqual(patches2)
      expect(patches1).not.toBe(patches2) // Different references
    })

    it('returns immutable patches array', () => {
      const builder = new JsonPatchBuilder()
      builder.add('name', 'John')
      const patches = builder.patches()

      patches.push({ op: JsonPatchOperationType.Add, path: '/age', value: 30 })

      const freshPatches = builder.patches()
      expect(freshPatches).toHaveLength(1)
    })
  })

  describe('clear method', () => {
    it('clears all patches', () => {
      const builder = new JsonPatchBuilder()
      builder.add('name', 'John').add('age', 30)

      expect(builder.patches()).toHaveLength(2)

      builder.clear()
      expect(builder.patches()).toHaveLength(0)
    })

    it('supports method chaining', () => {
      const builder = new JsonPatchBuilder()
      const result = builder.clear()
      expect(result).toBe(builder)
    })

    it('can be used to reset and build new patches', () => {
      const builder = new JsonPatchBuilder()
      builder.add('name', 'John').clear().add('age', 30)
      const patches = builder.patches()

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        op: 'add',
        path: '/age',
        value: 30,
      })
    })
  })

  describe('complex scenarios', () => {
    it('builds mixed operation types', () => {
      const builder = new JsonPatchBuilder()
      builder
        .add('name', 'John')
        .replace('age', 30)
        .remove('temp')
        .move('oldField', 'newField')
        .copy('source', 'backup')
        .test('status', 'active')

      const patches = builder.patches()
      expect(patches).toHaveLength(6)
      expect(patches[0].op).toBe('add')
      expect(patches[1].op).toBe('replace')
      expect(patches[2].op).toBe('remove')
      expect(patches[3].op).toBe('move')
      expect(patches[4].op).toBe('copy')
      expect(patches[5].op).toBe('test')
    })

    it('handles deep nested paths', () => {
      const builder = new JsonPatchBuilder()
      builder.add(['level1', 'level2', 'level3', 'level4'], 'deep value')
      const patches = builder.patches()

      expect(patches[0].path).toBe('/level1/level2/level3/level4')
    })

    it('handles array indices in paths', () => {
      const builder = new JsonPatchBuilder()
      builder.add(['users', 0, 'name'], 'John')
      builder.add(['users', 1, 'name'], 'Jane')
      const patches = builder.patches()

      expect(patches[0].path).toBe('/users/0/name')
      expect(patches[1].path).toBe('/users/1/name')
    })

    it('supports null and undefined values', () => {
      const builder = new JsonPatchBuilder()
      builder.add('nullValue', null)
      builder.add('undefinedValue', undefined)
      const patches = builder.patches() as any[]

      expect(patches[0].value).toBe(null)
      expect(patches[1].value).toBe(undefined)
    })
  })
})
