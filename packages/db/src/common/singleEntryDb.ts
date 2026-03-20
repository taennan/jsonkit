import type { UpdaterFn } from './types'

export abstract class SingleEntryDb<T> {
  abstract isInited(): Promise<boolean>
  abstract read(): Promise<T>
  abstract write(updaterOrEntry: T | UpdaterFn<T>): Promise<T>
  abstract delete(): Promise<void>
}
