module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['<rootDir>/test/e2e/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
  collectCoverage: false,
  verbose: true,
};
