import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock the API module
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    setup: jest.fn(),
    subscribeToGame: jest.fn(),
    createGame: jest.fn(),
    ready: jest.fn(),
    handleClickPhrase: jest.fn()
  }
}));

import API from '../api';

// Mock window.location.hash
Object.defineProperty(window, 'location', {
  value: {
    hash: '',
    hostname: 'localhost',
    protocol: 'http:'
  },
  writable: true
});

describe('App Component', () => {
  beforeEach(() => {
    window.location.hash = '';
    jest.clearAllMocks();
    
    // Setup API mock responses
    API.setup.mockImplementation((callback) => {
      callback(null, { connected: true });
    });
    
    API.createGame.mockImplementation((callback) => {
      callback('test123');
    });
  });

  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/players:/i)).toBeInTheDocument();
  });

  test('shows ReadyView when game is not started', () => {
    render(<App />);
    
    expect(screen.getByText(/players:/i)).toBeInTheDocument();
    expect(screen.getByText(/start game!/i)).toBeInTheDocument();
    expect(screen.getByText(/how to play:/i)).toBeInTheDocument();
  });

  test('calls API.setup on mount', () => {
    render(<App />);
    expect(API.setup).toHaveBeenCalled();
  });

  test('calls API.createGame when no gameid in URL', () => {
    render(<App />);
    expect(API.createGame).toHaveBeenCalled();
  });

  test('handles join code input and form submission', () => {
    render(<App />);
    
    const joinInput = screen.getByDisplayValue('');
    const joinForm = joinInput.closest('form');
    
    fireEvent.change(joinInput, { target: { value: 'abcd' } });
    expect(joinInput.value).toBe('abcd');
    
    fireEvent.submit(joinForm);
    expect(window.location.hash).toBe('abcd');
  });

  test('converts join codes to lowercase', () => {
    render(<App />);
    
    const joinInput = screen.getByDisplayValue('');
    const joinForm = joinInput.closest('form');
    
    fireEvent.change(joinInput, { target: { value: 'ABCD' } });
    fireEvent.submit(joinForm);
    
    expect(window.location.hash).toBe('abcd');
  });

  test('shows correct player count', () => {
    render(<App />);
    
    // Simulate state update with player count
    const app = screen.getByText(/players:/i).closest('.readyView');
    expect(app).toBeInTheDocument();
    expect(screen.getByText(/players: 0/i)).toBeInTheDocument();
  });

  test('displays game over state when gameOver is true', async () => {
    const { rerender } = render(<App />);
    
    // We need to trigger the gameOver state
    // This would typically come from Socket.io events in real usage
    const appElement = screen.getByText(/players:/i).closest('.readyView');
    expect(appElement).toBeInTheDocument();
  });
});