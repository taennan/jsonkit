export type JsonKey = string | number
export type JsonPath = JsonKey | JsonKey[]

export enum JsonPatchOperationType {
  Add = 'add',
  Remove = 'remove',
  Replace = 'replace',
  Move = 'move',
  Copy = 'copy',
  Test = 'test',
  Get = '_get',
}

export type StreamJsonPatchFn = (patches: JsonPatchOperation[]) => void

export type PatchResult<T = any> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: Error
    }

export type JsonPatchOperation =
  | AddOperation
  | RemoveOperation
  | ReplaceOperation
  | MoveOperation
  | CopyOperation
  | TestOperation
  | GetOperation

type BaseOperation = {
  path: string
}

type AddOperation = BaseOperation & {
  op: JsonPatchOperationType.Add
  value: any
}

type RemoveOperation = BaseOperation & {
  op: JsonPatchOperationType.Remove
}

type ReplaceOperation = BaseOperation & {
  op: JsonPatchOperationType.Replace
  value: any
}

type MoveOperation = BaseOperation & {
  op: JsonPatchOperationType.Move
  from: string
}

type CopyOperation = BaseOperation & {
  op: JsonPatchOperationType.Copy
  from: string
}

type TestOperation = BaseOperation & {
  op: JsonPatchOperationType.Test
  value: any
}

type GetOperation = BaseOperation & {
  op: JsonPatchOperationType.Get
  value: any
}
