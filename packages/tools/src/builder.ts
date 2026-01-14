import type { JsonPath, JsonPatchOperation } from './types'
import { JsonPatchOperationType } from './types'
import { JsonPathJoiner } from './pathJoiner'

// See https://jsonpatch.com for more information
export class JsonPatchBuilder {
  constructor(protected _patches: JsonPatchOperation[] = []) {}

  add(path: JsonPath, value: unknown): JsonPatchBuilder {
    this._patches.push({
      op: JsonPatchOperationType.Add,
      path: this.joinPath(path),
      value,
    })
    return this
  }

  remove(path: JsonPath): JsonPatchBuilder {
    this._patches.push({
      op: JsonPatchOperationType.Remove,
      path: this.joinPath(path),
    })
    return this
  }

  replace(path: JsonPath, value: unknown): JsonPatchBuilder {
    this._patches.push({
      op: JsonPatchOperationType.Replace,
      path: this.joinPath(path),
      value,
    })
    return this
  }

  move(from: JsonPath, to: JsonPath): JsonPatchBuilder {
    this._patches.push({
      op: JsonPatchOperationType.Move,
      from: this.joinPath(from),
      path: this.joinPath(to),
    })
    return this
  }

  copy(from: JsonPath, to: JsonPath): JsonPatchBuilder {
    this._patches.push({
      op: JsonPatchOperationType.Copy,
      from: this.joinPath(from),
      path: this.joinPath(to),
    })
    return this
  }

  test(path: JsonPath, value: unknown): JsonPatchBuilder {
    this._patches.push({
      op: JsonPatchOperationType.Test,
      path: this.joinPath(path),
      value,
    })
    return this
  }

  patches(): JsonPatchOperation[] {
    return structuredClone(this._patches)
  }

  clear(): JsonPatchBuilder {
    this._patches = []
    return this
  }

  protected joinPath(path: JsonPath): string {
    return new JsonPathJoiner().join(path)
  }
}
