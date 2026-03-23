module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: false,
  moduleNameMapper: {
    '^yahoo-finance2$': '<rootDir>/tests/__mocks__/yahoo-finance2.js',
  },
};
