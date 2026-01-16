import type { Config } from 'jest'

export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  moduleNameMapper: {
    'src/(.*)': '<rootDir>/$1',
  },
  testRegex: '.*\\.(spec|test)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
} satisfies Config
