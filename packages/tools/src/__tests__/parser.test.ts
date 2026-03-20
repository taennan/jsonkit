import { JsonParser, JsonFieldConversionPreset } from '../parser'

describe('JsonParser', () => {
  it('is defined', () => {
    expect(JsonParser).toBeDefined()
  })

  it('parses standard json', () => {
    const expected = {
      firstName: 'Robert',
      middleNames: 'James',
      lastName: 'Fischer',
    }

    const input = JSON.stringify(expected)
    const actual = new JsonParser().parse(input)

    expect(actual).toEqual(expected)
  })

  it('returns raw parsed result when no parsedFields are configured', () => {
    const expected = { a: 1, b: 'two', c: true }
    const actual = new JsonParser([]).parse(JSON.stringify(expected))
    expect(actual).toEqual(expected)
  })

  // ── null / undefined passthrough ─────────────────────────────────────────

  it('leaves null values untouched for every preset', () => {
    const presets = [
      JsonFieldConversionPreset.Date,
      JsonFieldConversionPreset.Int,
      JsonFieldConversionPreset.Float,
      JsonFieldConversionPreset.String,
      JsonFieldConversionPreset.Boolean,
    ]

    for (const conversion of presets) {
      const input = JSON.stringify({ value: null })
      const actual = new JsonParser([{ path: 'value', conversion }]).parse<{ value: null }>(input)
      expect(actual.value).toBeNull()
    }
  })

  it('ignores specified parse fields if the value is null (Date preset)', () => {
    const expected = {
      firstName: 'Robert',
      championDate: null,
    }
    const input = JSON.stringify(expected)
    const actual = new JsonParser([
      { path: 'championDate', conversion: JsonFieldConversionPreset.Date },
    ]).parse(input)

    expect(actual).toEqual(expected)
  })

  // ── custom function: null passthrough by default ──────────────────────────

  it('does not call a custom function when value is null and convertNullsByFn is not set', () => {
    const fn = vi.fn((v) => String(v))
    const input = JSON.stringify({ value: null })
    const actual = new JsonParser([{ path: 'value', conversion: fn }]).parse<{ value: null }>(input)

    expect(actual.value).toBeNull()
    expect(fn).not.toHaveBeenCalled()
  })

  it('does not call a custom function when value is null and convertNullsByFn is false', () => {
    const fn = vi.fn((v) => String(v))
    const input = JSON.stringify({ value: null })
    const actual = new JsonParser([
      { path: 'value', conversion: fn, convertNullsByFn: false },
    ]).parse<{ value: null }>(input)

    expect(actual.value).toBeNull()
    expect(fn).not.toHaveBeenCalled()
  })

  // ── custom function: opt-in null conversion ───────────────────────────────

  it('calls a custom function with null when convertNullsByFn is true', () => {
    const fn = vi.fn(() => 'was null')
    const input = JSON.stringify({ value: null })
    const actual = new JsonParser([
      { path: 'value', conversion: fn, convertNullsByFn: true },
    ]).parse<{ value: string }>(input)

    expect(fn).toHaveBeenCalledWith(null)
    expect(actual.value).toBe('was null')
  })

  it('convertNullsByFn has no effect on preset conversions — null is always passed through', () => {
    const input = JSON.stringify({ value: null })
    // Even if someone passes convertNullsByFn: true, presets still skip nulls
    const actual = new JsonParser([
      { path: 'value', conversion: JsonFieldConversionPreset.String, convertNullsByFn: true },
    ]).parse<{ value: null }>(input)

    expect(actual.value).toBeNull()
  })

  // ── undefined passthrough (all conversions) ───────────────────────────────

  it('leaves undefined values untouched regardless of conversion type', () => {
    // A field that does not exist in the JSON resolves to undefined via getValueByPointer
    const fn = vi.fn()
    const input = JSON.stringify({ other: 1 })

    const actual = new JsonParser([
      { path: 'missing', conversion: JsonFieldConversionPreset.String },
      { path: 'alsoMissing', conversion: fn },
      { path: 'alsoMissing', conversion: fn, convertNullsByFn: true },
    ]).parse<{ missing: undefined }>(input)

    expect(actual.missing).toBeUndefined()
    expect(fn).not.toHaveBeenCalled()
  })

  // ── Date preset ──────────────────────────────────────────────────────────

  it('converts a date string to a Date object', () => {
    const expected = { championDate: new Date('1972-08-01') }
    const input = JSON.stringify(expected)
    const actual = new JsonParser([
      { path: 'championDate', conversion: JsonFieldConversionPreset.Date },
    ]).parse(input)

    expect(actual).toEqual(expected)
  })

  it('returns the raw value unchanged when Date preset is applied to a non-string', () => {
    const input = JSON.stringify({ value: 12345 })
    const actual = new JsonParser([
      { path: 'value', conversion: JsonFieldConversionPreset.Date },
    ]).parse<{ value: number }>(input)

    expect(actual.value).toBe(12345)
  })

  // ── Int preset ───────────────────────────────────────────────────────────

  it('converts a numeric string to an integer with Int preset', () => {
    const input = JSON.stringify({ count: '7' })
    const actual = new JsonParser([
      { path: 'count', conversion: JsonFieldConversionPreset.Int },
    ]).parse<{ count: number }>(input)

    expect(actual.count).toBe(7)
  })

  it('returns raw value unchanged when Int preset is applied to a non-string', () => {
    const input = JSON.stringify({ count: 7 })
    const actual = new JsonParser([
      { path: 'count', conversion: JsonFieldConversionPreset.Int },
    ]).parse<{ count: number }>(input)

    expect(actual.count).toBe(7)
  })

  // ── Float preset ─────────────────────────────────────────────────────────

  it('converts a numeric string to a float with Float preset', () => {
    const input = JSON.stringify({ ratio: '3.14' })
    const actual = new JsonParser([
      { path: 'ratio', conversion: JsonFieldConversionPreset.Float },
    ]).parse<{ ratio: number }>(input)

    expect(actual.ratio).toBeCloseTo(3.14)
  })

  it('returns raw value unchanged when Float preset is applied to a non-string', () => {
    const input = JSON.stringify({ ratio: 3.14 })
    const actual = new JsonParser([
      { path: 'ratio', conversion: JsonFieldConversionPreset.Float },
    ]).parse<{ ratio: number }>(input)

    expect(actual.ratio).toBeCloseTo(3.14)
  })

  // ── String preset ────────────────────────────────────────────────────────

  it('converts a number to a string with String preset', () => {
    const input = JSON.stringify({ code: 404 })
    const actual = new JsonParser([
      { path: 'code', conversion: JsonFieldConversionPreset.String },
    ]).parse<{ code: string }>(input)

    expect(actual.code).toBe('404')
  })

  it('converts a boolean to a string with String preset', () => {
    const input = JSON.stringify({ flag: true })
    const actual = new JsonParser([
      { path: 'flag', conversion: JsonFieldConversionPreset.String },
    ]).parse<{ flag: string }>(input)

    expect(actual.flag).toBe('true')
  })

  // ── Boolean preset ───────────────────────────────────────────────────────

  it('converts the string "false" to boolean false', () => {
    const input = JSON.stringify({ active: 'false' })
    const actual = new JsonParser([
      { path: 'active', conversion: JsonFieldConversionPreset.Boolean },
    ]).parse<{ active: boolean }>(input)

    expect(actual.active).toBe(false)
  })

  it('converts a non-"false" string to boolean true', () => {
    const input = JSON.stringify({ active: 'true' })
    const actual = new JsonParser([
      { path: 'active', conversion: JsonFieldConversionPreset.Boolean },
    ]).parse<{ active: boolean }>(input)

    expect(actual.active).toBe(true)
  })

  it('converts the number 0 to boolean false', () => {
    const input = JSON.stringify({ active: 0 })
    const actual = new JsonParser([
      { path: 'active', conversion: JsonFieldConversionPreset.Boolean },
    ]).parse<{ active: boolean }>(input)

    expect(actual.active).toBe(false)
  })

  it('converts a truthy number to boolean true', () => {
    const input = JSON.stringify({ active: 1 })
    const actual = new JsonParser([
      { path: 'active', conversion: JsonFieldConversionPreset.Boolean },
    ]).parse<{ active: boolean }>(input)

    expect(actual.active).toBe(true)
  })

  // ── custom function conversion ────────────────────────────────────────────

  it('passes the raw primitive value to the custom function', () => {
    const fn = vi.fn((v) => v)
    const input = JSON.stringify({ value: 42 })
    new JsonParser([{ path: 'value', conversion: fn }]).parse(input)

    expect(fn).toHaveBeenCalledWith(42)
  })

  it('converts json fields with a custom function', () => {
    const input = JSON.stringify({ str: '3' })
    const actual = new JsonParser([
      { path: 'str', conversion: (str) => `${str}${str}${str}` },
    ]).parse(input)

    expect(actual).toEqual({ str: '333' })
  })

  // ── multiple fields & nesting ─────────────────────────────────────────────

  it('converts complex nested json fields', () => {
    const now = new Date()
    const data = {
      date: { value: now.toISOString() },
      boolean: { true: 'true', false: 'false' },
      int: { value: '42' },
      float: { pi: '3.1452', hexadecimal: '16' },
    }
    const expected = {
      date: { value: now },
      boolean: { true: true, false: false },
      int: { value: 42 },
      float: { pi: 3.1452, hexadecimal: 16 },
    }

    const actual = new JsonParser([
      { path: ['date', 'value'], conversion: JsonFieldConversionPreset.Date },
      { path: ['boolean', 'true'], conversion: JsonFieldConversionPreset.Boolean },
      { path: ['boolean', 'false'], conversion: JsonFieldConversionPreset.Boolean },
      { path: ['int', 'value'], conversion: JsonFieldConversionPreset.Int },
      { path: ['float', 'pi'], conversion: JsonFieldConversionPreset.Float },
      { path: ['float', 'hexadecimal'], conversion: JsonFieldConversionPreset.Float },
    ]).parse(JSON.stringify(data))

    expect(actual).toEqual(expected)
  })

  it('applies multiple conversions independently without cross-contamination', () => {
    const input = JSON.stringify({ a: '1', b: '2', c: '3' })
    const actual = new JsonParser([
      { path: 'a', conversion: JsonFieldConversionPreset.Int },
      { path: 'b', conversion: JsonFieldConversionPreset.Float },
      { path: 'c', conversion: JsonFieldConversionPreset.String },
    ]).parse<{ a: number; b: number; c: string }>(input)

    expect(actual.a).toBe(1)
    expect(actual.b).toBe(2)
    expect(actual.c).toBe('3')
  })

  it('mixes preset and custom function conversions on the same object', () => {
    const input = JSON.stringify({ num: 3, str: '3', flag: 0 })
    const actual = new JsonParser([
      { path: 'num', conversion: JsonFieldConversionPreset.Int },
      { path: 'str', conversion: (s) => `${s}${s}${s}` },
      { path: 'flag', conversion: JsonFieldConversionPreset.Boolean },
    ]).parse<{ num: number; str: string; flag: boolean }>(input)

    expect(actual.num).toBe(3)
    expect(actual.str).toBe('333')
    expect(actual.flag).toBe(false)
  })
})
