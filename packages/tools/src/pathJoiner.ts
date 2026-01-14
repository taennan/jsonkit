import type { JsonPath } from './types'

export class JsonPathJoiner {
  join(path: JsonPath): string {
    const extraneousBeginningDoubleSlashes = /^\/+/

    const isCompletePath = typeof path === 'string' || typeof path === 'number'
    const joinedPath = isCompletePath ? `${path}` : path.map((key) => String(key)).join('/')
    const parsedPath = `/${joinedPath}`.replace(extraneousBeginningDoubleSlashes, '/')

    return parsedPath
  }
}
