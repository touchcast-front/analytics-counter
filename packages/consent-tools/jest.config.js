const { createJestTSConfig } = require('@internal/config')

module.exports = createJestTSConfig({
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.js'],
})
