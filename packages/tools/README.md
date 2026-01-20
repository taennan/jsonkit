# @jsonkit/tools

Type-safe utilities for building, applying, and parsing [JSON Patch](https://jsonpatch.com) operations in TypeScript.
This package provides a small, composable abstraction layer over the JSON Patch (RFC 6902) specification, with additional conveniences for parsing and post-processing JSON data.

Built on top of [`fast-json-patch`](https://www.npmjs.com/package/fast-json-patch).

---

## Installation

```bash
npm install @jsonkit/tools
```

---

## Overview

`@jsonkit/tools` exports the following core components:

* **JsonPatchBuilder** – Fluent builder for JSON Patch operations
* **JsonPatcher** – Safe and deterministic patch application
* **JsonParser** – JSON parsing with post-parse field conversion
* **JsonPathJoiner** – Utility for converting path segments into JSON Pointer strings
* **Types & Enums** – Strongly typed JSON Patch operations and helpers

---

## JsonPatchBuilder

A fluent API for constructing JSON Patch operation arrays.

```ts
import { JsonPatchBuilder } from '@jsonkit/tools'

const patches = new JsonPatchBuilder()
  .add(['user', 'name'], 'Alice')
  .replace(['user', 'age'], 30)
  .remove(['user', 'deprecatedField'])
  .patches()
```

### Methods

| Method                 | Description                                |
| ---------------------- | ------------------------------------------ |
| `add(path, value)`     | Adds a value at the given path             |
| `remove(path)`         | Removes the value at the path              |
| `replace(path, value)` | Replaces the value at the path             |
| `move(from, to)`       | Moves a value from one path to another     |
| `copy(from, to)`       | Copies a value from one path to another    |
| `test(path, value)`    | Asserts that a value matches               |
| `patches()`            | Returns a cloned array of patch operations |
| `clear()`              | Clears all accumulated patches             |

`path` may be a single key or an array of keys.

---

## JsonPatcher

Applies JSON Patch operations safely and predictably.

```ts
import { JsonPatcher, JsonPatchBuilder } from '@jsonkit/tools'

const patcher = new JsonPatcher()
const patches = new JsonPatchBuilder().add(['user', 'name'], 'Alice')

const result = patcher.safePatch(data, patches)

if (result.success) {
  console.log(result.data)
} else {
  console.error(result.error)
}
```

### Features

* Defensive cloning of the target object
* Safe error handling via `safePatch`
* Automatic string concatenation when using `add` on existing string values

### Methods

| Method                       | Description                                 |
| ---------------------------- | ------------------------------------------- |
| `patch(object, patches)`     | Applies patches and throws on failure       |
| `safePatch(object, patches)` | Applies patches and returns a `PatchResult` |

---

## JsonParser

Parses JSON text and converts specific fields using JSON Patch internally.

```ts
import { JsonParser, JsonFieldConversion } from '@jsonkit/tools'

type MyType = {
  name: string
  createdAt: Date
}

const parser = new JsonParser([
  { path: ['createdAt'], conversion: JsonFieldConversion.Date },
])

const jsonString = `{"name": "Alice", "createdAt": "2023-01-01T00:00:00Z"}`
const data = parser.parse<MyType>(jsonString)
console.log(data.createdAt instanceof Date) // true
console.log(data.name) // 'Alice'
```

### Supported Conversions

| Conversion | Behavior                   |
| ---------- | -------------------------- |
| `Date`     | ISO string → `Date`        |
| `String`   | Coerces to string          |
| `Int`      | Parses integer             |
| `Float`    | Parses float               |
| `Boolean`  | String and truthy coercion |

> Note: Date parsing relies on ISO-formatted strings. Non-ISO strings may lose millisecond precision.

---

## JsonPathJoiner

Utility for converting path segments into JSON Pointer strings.

```ts
import { JsonPathJoiner } from '@jsonkit/tools'

const joiner = new JsonPathJoiner()
const pointer = joiner.join(['users', 123, 'name'])
console.log(pointer) // '/users/123/name'
```

---

## Types and Enums

### JsonPath

```ts
type JsonKey = string | number
type JsonPath = JsonKey | JsonKey[]
```

Used throughout the API to represent JSON pointer paths.

---

### JsonPatchOperationType

```ts
enum JsonPatchOperationType {
  Add = 'add',
  Remove = 'remove',
  Replace = 'replace',
  Move = 'move',
  Copy = 'copy',
  Test = 'test',
  Get = '_get',
}
```

---

### JsonPatchOperation

A discriminated union representing all supported patch operations:

* `Add`
* `Remove`
* `Replace`
* `Move`
* `Copy`
* `Test`
* `Get` (internal / extension)

---

### PatchResult

```ts
type PatchResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }
```

Returned by `safePatch`.

---

## Design Notes

* Fully ESM and CJS compatible
* Strong emphasis on immutability and safety
* Minimal abstractions over the JSON Patch specification
* Intended for programmatic patch construction and controlled JSON mutation

---

## License

MIT
