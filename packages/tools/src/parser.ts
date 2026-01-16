import type { JsonPath } from './types'
import { JsonPatcher } from './patcher'
import { JsonPatchBuilder } from './builder'
import { JsonPathJoiner } from './pathJoiner'
import fastJsonPatch from 'fast-json-patch'

export enum JsonFieldConversion {
  Date = 'date',
  Int = 'int',
  Float = 'float',
  String = 'string',
  Boolean = 'boolean',
  //BigInt = 'bigInt',
}

type ParseField = {
  path: JsonPath
  conversion: JsonFieldConversion
}

// NOTE: The conversion of Dates to and from strings is a little problematic. Any strings that are not ISO formatted will not have the milliseconds precision.
export class JsonParser {
  constructor(protected readonly parsedFields: ParseField[] = []) {}

  parse<T>(text: string): T {
    const raw = JSON.parse(text)
    if (!this.parsedFields.length) return raw as T

    let patchBuilder = new JsonPatchBuilder()
    for (const parseField of this.parsedFields) {
      const { path, conversion } = parseField
      const joinedPath = new JsonPathJoiner().join(path)

      const value = fastJsonPatch.getValueByPointer(raw, joinedPath)
      const converted = this.convertValue(value, conversion)
      patchBuilder = patchBuilder.replace(joinedPath, converted)
    }

    const patches = patchBuilder.patches()
    const patchResult = new JsonPatcher().safePatch<T>(raw as T, patches)

    if (!patchResult.success) {
      throw new Error(`Failed to parse JSON: ${patchResult.error}`)
    }

    return patchResult.data
  }

  protected convertValue(value: unknown, conversion: JsonFieldConversion) {
    if (value === undefined || value === null) return value

    const isString = typeof value === 'string'

    if (conversion === JsonFieldConversion.Date && isString) {
      return new Date(value)
    } else if (conversion === JsonFieldConversion.String) {
      return String(value)
    } else if (conversion === JsonFieldConversion.Int && isString) {
      return parseInt(value)
    } else if (conversion === JsonFieldConversion.Float && isString) {
      return parseFloat(value)
    } else if (conversion === JsonFieldConversion.Boolean) {
      if (isString && value === 'false') return false
      return Boolean(value)
    }
    /*
  } else if (
    conversion === JsonFieldConversion.BigInt &&
    (isString ||
      typeof value === 'bigint' ||
      typeof value === 'number' ||
      typeof value === 'boolean')
  ) {
    return BigInt(value)
    */

    return value
  }
}
