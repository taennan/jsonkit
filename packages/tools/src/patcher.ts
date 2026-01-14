import type { PatchResult, JsonPatchOperation } from './types'
import { JsonPatchOperationType } from './types'
import * as fastJsonPatch from 'fast-json-patch'

// TODO: fast-json-patch does not handle BigInts
export class JsonPatcher {
  safePatch<T = any>(target: T, patches: JsonPatchOperation[]): PatchResult<T> {
    try {
      return {
        success: true,
        data: this.patch<T>(target, patches),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  patch<T = any>(object: T, patches: JsonPatchOperation[]): T {
    let target = structuredClone(object)

    for (const operation of patches) {
      const isStringPatch =
        operation.op === JsonPatchOperationType.Add && typeof operation.value === 'string'
      if (isStringPatch) {
        const targetValue = fastJsonPatch.getValueByPointer(target, operation.path) as unknown
        const patchValue =
          typeof targetValue === 'string'
            ? targetValue + operation.value
            : (operation.value as unknown)

        const patchResult = fastJsonPatch.applyPatch(
          target,
          [{ op: JsonPatchOperationType.Replace, path: operation.path, value: patchValue }],
          false,
          true,
        )
        target = patchResult.newDocument
        continue
      }

      const patchResult = fastJsonPatch.applyPatch(target, [operation], false, true)
      target = patchResult.newDocument
    }

    return target
  }
}
