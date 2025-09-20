import '@testing-library/jest-dom';

// Mock Socket.io for tests
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));