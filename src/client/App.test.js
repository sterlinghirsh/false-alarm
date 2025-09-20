import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock the API module
jest.mock('./api', () => ({
  __esModule: true,
  default: {
    setup: jest.fn((callback) => callback(null, { connected: true })),
    subscribeToGame: jest.fn(),
    createGame: jest.fn((callback) => callback('test123')),
    ready: jest.fn(),
    handleClickPhrase: jest.fn()
  }
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hash: '',
    hostname: 'localhost',
    protocol: 'http:'
  },
  writable: true
});

it('renders without crashing', () => {
  render(<App />);
});
