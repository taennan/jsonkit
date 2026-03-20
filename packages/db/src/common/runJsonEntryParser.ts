import { JsonEntryParser } from './types'

export function runJsonEntryParser<T>(parser: JsonEntryParser<T>, text: string): T {
  return typeof parser === 'function' ? parser(text) : parser.parse(text)
}
