import type { JsonPath, JsonPrimitiveValue } from './types'
import { JsonPatcher } from './patcher'
import { JsonPatchBuilder } from './builder'
import { JsonPathJoiner } from './pathJoiner'
import fastJsonPatch from 'fast-json-patch'

export enum JsonFieldConversionPreset {
  Date = 'date',
  Int = 'int',
  Float = 'float',
  String = 'string',
  Boolean = 'boolean',
  //BigInt = 'bigInt',
}

type JsonFieldConversionFn<T> = (input: JsonPrimitiveValue) => T

type JsonFieldConversion<T> = JsonFieldConversionFn<T> | JsonFieldConversionPreset

type ParseField<T = any> = {
  path: JsonPath
  conversion: JsonFieldConversion<T>
  convertNullsByFn?: boolean
}

// NOTE: The conversion of Dates to and from strings is a little problematic. Any strings that are not ISO formatted will not have the milliseconds precision.
export class JsonParser {
  constructor(protected readonly parsedFields: ParseField[] = []) {}

  parse<T>(text: string): T {
    const raw = JSON.parse(text)
    if (!this.parsedFields.length) return raw as T

    let patchBuilder = new JsonPatchBuilder()
    for (const parseField of this.parsedFields) {
      const { path, conversion, convertNullsByFn = false } = parseField
      const joinedPath = new JsonPathJoiner().join(path)

      const value = fastJsonPatch.getValueByPointer(raw, joinedPath)
      const converted = this.convertValue(value, conversion, convertNullsByFn)
      patchBuilder = patchBuilder.replace(joinedPath, converted)
    }

    const patches = patchBuilder.patches()
    const patchResult = new JsonPatcher().safePatch<T>(raw as T, patches)

    if (!patchResult.success) {
      throw new Error(`Failed to parse JSON: ${patchResult.error}`)
    }

    return patchResult.data
  }

  protected convertValue<T>(
    value: JsonPrimitiveValue,
    conversion: JsonFieldConversion<T>,
    convertNullsByFn: boolean,
  ) {
    const isFnConversion = typeof conversion === 'function'

    if (value === undefined) return value
    if (!isFnConversion && value === null) return value
    if (isFnConversion && value === null && !convertNullsByFn) return value

    const isString = typeof value === 'string'

    if (isFnConversion) {
      return conversion(value)
    } else if (conversion === JsonFieldConversionPreset.Date && isString) {
      return new Date(value)
    } else if (conversion === JsonFieldConversionPreset.String) {
      return String(value)
    } else if (conversion === JsonFieldConversionPreset.Int && isString) {
      return parseInt(value)
    } else if (conversion === JsonFieldConversionPreset.Float && isString) {
      return parseFloat(value)
    } else if (conversion === JsonFieldConversionPreset.Boolean) {
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
