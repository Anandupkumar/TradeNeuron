module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  setupFiles: ['./tests/setup.js'],
  moduleNameMapper: {
    '^yahoo-finance2$': '<rootDir>/tests/__mocks__/yahoo-finance2.js',
  },
};
