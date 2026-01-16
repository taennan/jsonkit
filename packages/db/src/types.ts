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
