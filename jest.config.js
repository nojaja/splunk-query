export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testMatch: ['<rootDir>/test/unit/**/*.test.ts'],
  verbose: false,
  silent: false,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  coverageThreshold: {
    global: {//変更禁止
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    }
  },
  testTimeout: 10000
};
