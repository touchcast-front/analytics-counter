const { getJestModuleMap } = require('./get-module-map')
const path = require('path')

/**
 * Create a project `jest` config object
 * @param {import('jest').Config} overrides - Overrides to base project `jest` config.
 * @returns {import('jest').Config}
 */
const createJestTSConfig = (overrides = {}) => {
  const moduleMap = getJestModuleMap()
  return {
    ...(global.JEST_ROOT_CONFIG
      ? {}
      : { displayName: path.basename(process.cwd()) }),
    verbose: false, // do not show disabled tests
    moduleNameMapper: moduleMap,
    preset: 'ts-jest',
    modulePathIgnorePatterns: [
      '<rootDir>/dist/',
      ...(overrides.modulePathIgnorePatterns || []),
    ],
    testEnvironment: 'node',
    testMatch: ['**/?(*.)+(test).[jt]s?(x)', ...(overrides.testMatch || [])],
    testPathIgnorePatterns: [
      '.*typedef.*',
      ...(overrides.testPathIgnorePatterns || []),
    ],
    clearMocks: true,
    globals: {
      'ts-jest': {
        isolatedModules: true,
      },
    },
    ...overrides,
  }
}

module.exports = {
  createJestTSConfig,
}
createJestTSConfig({})
