// Jest setup for e2e tests
// Set a reasonable global timeout for e2e tests
jest.setTimeout(60000);

// Ensure environment is set for tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Optional: disable noisy logs in e2e
// const originalLog = console.log;
// console.log = (...args) => { /* no-op or forward */ originalLog(...args); };
