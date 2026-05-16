import type { JsonKey, JsonPath, JsonPrimitiveValue } from './types'

type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]
type JsonValue = JsonPrimitiveValue | JsonObject | JsonArray

function isObject(value: unknown): boolean {
  //value is JsonObject | JsonArray {
  return typeof value === 'object' && value !== null
}

function normalizePath(path: JsonPath): JsonKey[] {
  return typeof path === 'string' || typeof path === 'number' ? [path] : path
}

export function simpleGet<T, U>(obj: T, path: JsonPath, defaultValue?: U): U | undefined {
  const keys = normalizePath(path)
  if (!isObject(obj) || !keys.length) return defaultValue

  let current: any = obj

  for (let i = 0; i < keys.length; i++) {
    if (!isObject(current)) return defaultValue

    const key = keys[i]

    if (Array.isArray(current)) {
      if (typeof key !== 'number') return defaultValue
      current = current[key]
    } else {
      current = current[String(key)]
    }

    // Hit a dead end before the path ended
    const isDeadPath = (current === undefined || current === null) && i < keys.length - 1
    if (isDeadPath) return defaultValue
  }

  return current as U
}

export function simpleSet<T, U>(obj: T, path: JsonPath, value: U) {
  const keys = normalizePath(path)
  if (!isObject(obj) || !keys.length) return

  let current: any = obj

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const isLast = i === keys.length - 1

    if (Array.isArray(current)) {
      if (typeof key !== 'number') return // Can't index an array with a string
      if (isLast) {
        current[key] = value
      } else {
        if (!isObject(current[key])) {
          // Peek at next key to decide what to create
          current[key] = typeof keys[i + 1] === 'number' ? [] : {}
        }
        current = current[key]
      }
    } else if (isObject(current)) {
      const strKey = String(key)
      if (isLast) {
        current[strKey] = value
      } else {
        if (!isObject(current[strKey])) {
          current[strKey] = typeof keys[i + 1] === 'number' ? [] : {}
        }
        current = current[strKey]
      }
    }
  }
}
