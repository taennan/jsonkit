export type Identifiable = {
  id: Id
}

export type Id = string

export type Promisable<T> = T | Promise<T>

export type DeleteManyOutput = {
  deletedIds: Id[]
  ignoredIds: Id[]
}

export type PredicateFn<T extends Identifiable> = (entry: T) => boolean

export type JsonEntryParser<T> = {
  parse: (text: string) => T
}

export type MultiEntryFileDbOptions<T> = {
  noPathlikeIds?: boolean
  parser?: JsonEntryParser<T>
}

export type FileMeta = {
  path: string
  size: number
  created: Date
  modified: Date
  accessed: Date
} & (
  | {
      type: FileType.File
    }
  | {
      type: FileType.Directory
      children: FileMeta[]
    }
)

export enum FileType {
  File = 'file',
  Directory = 'directory',
  //Symlink: 'symlink'
}

export abstract class SingleEntryDb<T> {
  abstract isInited(): Promise<boolean>
  abstract read(): Promise<T>
  abstract write(updaterOrEntry: T | ((entry: T) => Promisable<Partial<T>>)): Promise<T>
  abstract delete(): Promise<void>
}

export abstract class MultiEntryDb<T extends Identifiable> {
  abstract create(entry: T): Promise<T>
  abstract getById(id: T['id']): Promise<T | null>
  abstract getByIdOrThrow(id: T['id']): Promise<T>
  abstract getWhere(predicate: PredicateFn<T>, max?: number): Promise<T[]>
  abstract getAll(whereIds?: T['id'][]): Promise<T[]>
  abstract getAllIds(): Promise<T['id'][]>
  abstract update(id: T['id'], updater: (entry: T) => Promisable<Partial<T>>): Promise<T>
  abstract delete(id: T['id']): Promise<boolean>
  abstract deleteByIds(ids: T['id'][]): Promise<DeleteManyOutput>
  abstract deleteWhere(predicate: PredicateFn<T>): Promise<DeleteManyOutput>
  abstract destroy(): Promise<void>
  abstract exists(id: T['id']): Promise<boolean>
  abstract countAll(): Promise<number>
  abstract countWhere(predicate: PredicateFn<T>): Promise<number>
}
