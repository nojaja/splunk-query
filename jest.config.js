export default {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['<rootDir>/test/unit/**/*.test.js'],
  verbose: false,
  silent: false,
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.cjs' }]
  },
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js']
};
