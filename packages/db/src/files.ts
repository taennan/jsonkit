import type { FileMeta } from './types'
import { FileType } from './types'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as fsSync from 'fs'
import * as readline from 'readline'

type ListOptions = {
  depth?: number
  stripBasepath?: string
}

type DeleteOptions = {
  force?: boolean
  recursive?: boolean
}

type WriteOptions = {
  encoding?: BufferEncoding
}

type ReadOptions = {
  encoding?: BufferEncoding
  lines?: number
}

type CopyOptions = {
  recursive?: boolean
  overwrite?: boolean
}

const DEFUALT_ENCODING: BufferEncoding = 'utf-8'

export class FilesService {
  async move(oldPath: string, newPath: string) {
    await fs.rename(oldPath, newPath)
  }

  async copy(sourcePath: string, destinationPath: string, options?: CopyOptions) {
    const { recursive = false, overwrite = true } = options ?? {}

    // Check if destination exists and handle overwrite
    if (!overwrite && (await this.exists(destinationPath))) {
      throw new Error(`Destination '${destinationPath}' already exists`)
    }

    const sourceStats = await fs.stat(sourcePath)

    if (sourceStats.isFile()) {
      const destinationDir = path.dirname(destinationPath)
      await this.mkdirUnsafe(destinationDir)
      await fs.copyFile(sourcePath, destinationPath)
      return
    }

    if (sourceStats.isDirectory()) {
      if (!recursive) {
        throw new Error(`'${sourcePath}' is a directory (use recursive option)`)
      }
      await this.copyRecursive(sourcePath, destinationPath)
    }
  }

  async copyRecursive(sourcePath: string, destinationPath: string) {
    const sourceStats = await fs.stat(sourcePath)

    if (sourceStats.isFile()) {
      const destinationDir = path.dirname(destinationPath)
      await this.mkdirUnsafe(destinationDir)
      await fs.copyFile(sourcePath, destinationPath)
      return
    }

    if (sourceStats.isDirectory()) {
      await this.mkdirUnsafe(destinationPath)
      const entries = await fs.readdir(sourcePath)

      for (const entry of entries) {
        const sourceEntryPath = path.join(sourcePath, entry)
        const destEntryPath = path.join(destinationPath, entry)
        await this.copyRecursive(sourceEntryPath, destEntryPath)
      }
    }
  }

  async mkdir(filepath: string) {
    await this.mkdirUnsafe(filepath)
  }

  protected async mkdirUnsafe(filepath: string) {
    await fs.mkdir(filepath, { recursive: true })
  }

  async write(filepath: string, content: string, options?: WriteOptions) {
    const { encoding = DEFUALT_ENCODING } = options ?? {}

    const parentDirs = path.dirname(filepath)
    await this.mkdirUnsafe(parentDirs)

    await fs.writeFile(filepath, content, encoding)
  }

  async touch(filepath: string) {
    const exists = await this.exists(filepath)
    if (!exists) await this.write(filepath, '')
  }

  async read(filepath: string, options?: ReadOptions) {
    const { encoding = DEFUALT_ENCODING, lines } = options ?? {}

    if (lines === undefined) {
      return await fs.readFile(filepath, encoding)
    }

    const stream = fsSync.createReadStream(filepath, { encoding })
    const reader = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    })

    let result = ''
    let linesRead = 0
    for await (const line of reader) {
      if (linesRead >= lines) break
      result += line + '\n'
      linesRead++
    }

    return result
  }

  async delete(filepath: string, options?: DeleteOptions) {
    const { force = true, recursive = true } = options ?? {}
    await fs.rm(filepath, { force, recursive })
  }

  async exists(filepath: string) {
    try {
      await fs.access(filepath)
      return true
    } catch {
      return false
    }
  }

  async isDir(filepath: string) {
    try {
      const stats = await fs.stat(filepath)
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  async isFile(filepath: string) {
    try {
      const stats = await fs.stat(filepath)
      return stats.isFile()
    } catch {
      return false
    }
  }

  async isSymlink(filepath: string) {
    try {
      const stats = await fs.stat(filepath)
      return stats.isSymbolicLink()
    } catch {
      return false
    }
  }

  async getMeta(filepath: string, options?: ListOptions): Promise<FileMeta> {
    const { depth = 0, stripBasepath } = options ?? {}
    const stats = await fs.stat(filepath)
    const isDir = stats.isDirectory()
    const isFile = stats.isFile()

    const { size, ctime, mtime, atime } = stats
    const commonMeta = {
      path: this.stripBasepath(filepath, stripBasepath),
      size,
      created: ctime,
      modified: mtime,
      accessed: atime,
    }

    if (isDir) {
      const children: FileMeta[] = []

      if (depth > 0) {
        const childNames = await this.list(filepath)

        for (const child of childNames) {
          const childDepth = Math.max(0, depth - 1)
          const childMeta = await this.getMeta(path.join(filepath, child), {
            depth: childDepth,
            stripBasepath,
          })
          children.push(childMeta)
        }
      }

      return {
        ...commonMeta,
        type: FileType.Directory,
        children,
      }
    }
    if (isFile)
      return {
        ...commonMeta,
        type: FileType.File,
      }

    throw new Error(`File at ${filepath} is not normal file or directory`)
  }

  async list(dirpath: string, options?: ListOptions) {
    const { depth = 0, stripBasepath } = options ?? {}
    if (depth > 0) {
      return await this.listRecursive(dirpath, depth, 0, stripBasepath)
    }
    return await fs.readdir(dirpath)
  }

  async *listRead(dirpath: string, options?: ListOptions) {
    const { depth = 0 } = options ?? {}

    const files = await this.list(dirpath, { depth })

    for (const filepath of files) {
      const isFile = await this.isFile(filepath)
      if (!isFile) continue

      try {
        const content = await this.read(filepath)
        yield {
          filepath,
          content,
        }
      } catch {
        // Skip files that can't be read
        continue
      }
    }
  }

  protected async listRecursive(
    dirpath: string,
    maxDepth: number,
    currentDepth: number,
    stripBasepath: string | undefined,
  ): Promise<string[]> {
    const results: string[] = []
    const entries = await fs.readdir(dirpath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirpath, entry.name)
      const strippedPath = this.stripBasepath(fullPath, stripBasepath)
      results.push(strippedPath)

      if (entry.isDirectory() && currentDepth < maxDepth) {
        const subResults = await this.listRecursive(
          fullPath,
          maxDepth,
          currentDepth + 1,
          stripBasepath,
        )
        results.push(...subResults)
      }
    }

    return results
  }

  protected stripBasepath(original: string, pathToStrip: string | undefined): string {
    if (!pathToStrip) return original
    const base = pathToStrip.replace(/^\/+/, '/').replace(/\/+$/, '/')
    const stripped = original.replace(base, '')
    return `/${stripped}`
  }
}
