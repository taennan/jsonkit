export class DbError extends Error {}

export class NotFoundError extends DbError {}

export class ConflictError extends DbError {}

export class FileIoError extends DbError {}

export class InvalidIdError extends DbError {
  constructor(id: unknown) {
    super(`Invalid entry id '${id}'`)
  }
}

export class UninitError extends DbError {
  constructor() {
    super('Cannot read or update uninitialized entry. Use write(entry) to initialize first')
  }
}
