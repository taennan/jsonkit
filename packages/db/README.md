# @jsonkit/db

`@jsonkit/db` is a lightweight, zero-dependency database abstraction for rapid prototyping. It provides simple **file-based** and **in-memory** databases with consistent APIs, suitable for small applications, tooling, tests, and early-stage prototypes where setting up a full database would be unnecessary overhead.

The package exposes two core concepts:

* **Single-entry databases** – manage exactly one JSON-serializable object.
* **Multi-entry databases** – manage collections of identifiable records keyed by an `id`.

Both concepts are available in **file-backed** and **in-memory** variants.

---

## Installation

```bash
npm install @jsonkit/db
```

---

## Core Types

### `Identifiable`

```ts
type Identifiable = { id: string }
```

All multi-entry databases require entries to have a string `id`.

### `Promisable<T>`

A value or a promise of a value.

```ts
type Promisable<T> = T | Promise<T>
```

### `PredicateFn<T>`

Used for filtering entries.

```ts
type PredicateFn<T extends Identifiable> = (entry: T) => boolean
```

### `DeleteManyOutput`

Returned by bulk delete operations.

```ts
type DeleteManyOutput = {
  deletedIds: string[]
  ignoredIds: string[]
}
```

---

## Multi-entry Databases

Multi-entry databases manage collections of entries keyed by `id`.

### Common API (`MultiEntryDb<T>`)

All multi-entry implementations expose the same async API:

* `create(entry)`
* `getById(id)`
* `getByIdOrThrow(id)`
* `getWhere(predicate, max?)`
* `getAll(ids?)`
* `getAllIds()`
* `update(id, updater)`
* `delete(id)`
* `deleteByIds(ids)`
* `deleteWhere(predicate)`
* `exists(id)`
* `countAll()`
* `countWhere(predicate)`
* `destroy()`

Updates are **partial merges**, and changing an entry’s `id` during an update is supported.

---

### `MultiEntryFileDb<T extends Identifiable>`

A file-backed database where **each entry is stored as its own JSON file**.

```ts
import { MultiEntryFileDb } from '@jsonkit/db'

const db = new MultiEntryFileDb<User>('./data/users')
```

#### Behavior

* Each entry is stored as `<id>.json` in the provided directory.
* The directory is created implicitly as files are written.
* IDs are validated to prevent path traversal by default.

#### Constructor

```ts
new MultiEntryFileDb<T>(dirpath, options?)
```

**Options**

| Option          | Description                            | Default |
| --------------- | -------------------------------------- | ------- |
| `noPathlikeIds` | Reject IDs containing `/` or `\`       | `true`  |
| `parser`        | Custom JSON parser (`{ parse(text) }`) | `JSON`  |

#### Notes

* Failed reads (missing file or invalid JSON) return `null`.
* `destroy()` deletes the entire directory.
* Intended for development, prototyping, and small datasets.

---

### `MultiEntryMemDb<T extends Identifiable>`

An in-memory implementation backed by a `Map`.

```ts
import { MultiEntryMemDb } from '@jsonkit/db'

const db = new MultiEntryMemDb<User>()
```

#### Behavior

* Fast, ephemeral storage.
* Ideal for tests and short-lived processes.
* `destroy()` clears all entries.

---

## Single-entry Databases

Single-entry databases manage **exactly one value**, often used for configuration or application state.

### Common API (`SingleEntryDb<T>`)

* `isInited()`
* `read()`
* `write(entry | updater)`
* `delete()`

`write` supports either replacing the entry or partially updating it via an updater function.

---

### `SingleEntryFileDb<T>`

Stores a single JSON object in a file.

```ts
import { SingleEntryFileDb } from '@jsonkit/db'

const db = new SingleEntryFileDb<AppConfig>('./config.json')
```

#### Behavior

* Reads and writes a single JSON file.
* `isInited()` checks file existence.
* `read()` throws if the file does not exist.

#### Constructor

```ts
new SingleEntryFileDb<T>(filepath, parser?)
```

* `parser` defaults to `JSON`.

---

### `SingleEntryMemDb<T>`

An in-memory single-value database.

```ts
import { SingleEntryMemDb } from '@jsonkit/db'

const db = new SingleEntryMemDb<AppConfig>()
```

#### Behavior

* Optional initial value.
* `read()` throws if uninitialized.
* `delete()` resets the entry to `null`.

---

## Example

```ts
type User = { id: string; name: string }

const users = new MultiEntryFileDb<User>('./users')

await users.create({ id: 'u1', name: 'Alice' })

await users.update('u1', (u) => ({ name: 'Alice Smith' }))

const allUsers = await users.getAll()
```

---

## Use Cases

* Rapid application prototyping
* CLI tools
* Small internal services
* Tests and mocks
* Configuration and state persistence

---

## Non-goals

* Concurrency control
* High-performance querying
* Large datasets
* ACID guarantees

For these, a dedicated database is recommended.

---

## License

MIT
