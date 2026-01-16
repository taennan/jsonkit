import { JsonParser, JsonFieldConversion } from '../parser'

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

  it('ignores specified parse fields if the value is null', () => {
    const expected = {
      firstName: 'Robert',
      middleNames: 'James',
      lastName: 'Fischer',
      championDate: null,
    }

    const input = JSON.stringify(expected)
    const actual = new JsonParser([
      {
        path: 'championDate',
        conversion: JsonFieldConversion.Date,
      },
    ]).parse(input)

    expect(actual).toEqual(expected)
  })

  it('converts complex json fields', () => {
    const expected = {
      firstName: 'Robert',
      middleNames: 'James',
      lastName: 'Fischer',
      championDate: new Date('1972-08-01'),
    }

    const input = JSON.stringify(expected)
    const actual = new JsonParser([
      {
        path: 'championDate',
        conversion: JsonFieldConversion.Date,
      },
    ]).parse(input)

    expect(actual).toEqual(expected)
  })

  it('converts complex nested json fields', () => {
    const now = new Date()
    const data = {
      date: {
        value: now.toISOString(),
      },
      boolean: {
        true: 'true',
        false: 'false',
      },
      int: {
        value: '42',
      },
      float: {
        pi: '3.1452',
        hexadecimal: '16',
      },
    }
    const expected = {
      date: {
        value: now,
      },
      boolean: {
        true: true,
        false: false,
      },
      int: {
        value: 42,
      },
      float: {
        pi: 3.1452,
        hexadecimal: 16,
      },
    }

    const input = JSON.stringify(data)
    const actual = new JsonParser([
      {
        path: ['date', 'value'],
        conversion: JsonFieldConversion.Date,
      },
      {
        path: ['boolean', 'true'],
        conversion: JsonFieldConversion.Boolean,
      },
      {
        path: ['boolean', 'false'],
        conversion: JsonFieldConversion.Boolean,
      },
      {
        path: ['int', 'value'],
        conversion: JsonFieldConversion.Int,
      },
      {
        path: ['float', 'pi'],
        conversion: JsonFieldConversion.Float,
      },
      {
        path: ['float', 'hexadecimal'],
        conversion: JsonFieldConversion.Float,
      },
    ]).parse(input)

    expect(actual).toEqual(expected)
  })
})
