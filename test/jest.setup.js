// Jest setup for e2e tests
// Increase default timeout for slow e2e operations (Docker start, external services)
jest.setTimeout(300000);

// Optionally set environment variables used by e2e tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Any global helpers for e2e tests can be attached here
// Example: globalThis.debug = (...args) => console.log('[E2E]', ...args);
