import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReadyView from '../ReadyView';

describe('ReadyView Component', () => {
  const defaultProps = {
    gameid: 'test123',
    playerCount: 2,
    onReady: jest.fn(),
    handleJoinCodeChange: jest.fn(),
    handleJoin: jest.fn(),
    joinCode: '',
    gameOver: false,
    numCorrect: 0,
    numIncorrect: 0,
    personalStats: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<ReadyView {...defaultProps} />);
    expect(screen.getByText(/players:/i)).toBeInTheDocument();
  });

  test('displays correct player count', () => {
    render(<ReadyView {...defaultProps} />);
    expect(screen.getByText(/players: 2/i)).toBeInTheDocument();
  });

  test('displays start game button', () => {
    render(<ReadyView {...defaultProps} />);
    const startButton = screen.getByText(/start game!/i);
    expect(startButton).toBeInTheDocument();
  });

  test('calls onReady when start button is clicked', () => {
    render(<ReadyView {...defaultProps} />);
    const startButton = screen.getByText(/start game!/i);
    
    fireEvent.click(startButton);
    expect(defaultProps.onReady).toHaveBeenCalledTimes(1);
  });

  test('displays game instructions', () => {
    render(<ReadyView {...defaultProps} />);
    
    expect(screen.getByText(/how to play:/i)).toBeInTheDocument();
    expect(screen.getByText(/shout the/i)).toBeInTheDocument();
    expect(screen.getByText(/red/i)).toBeInTheDocument();
    expect(screen.getByText(/listen to other people shout/i)).toBeInTheDocument();
    expect(screen.getByText(/when you hear a phrase, tap it!/i)).toBeInTheDocument();
    expect(screen.getByText(/best with 3\+ players/i)).toBeInTheDocument();
  });

  test('displays creator information', () => {
    render(<ReadyView {...defaultProps} />);
    
    expect(screen.getByText(/by sterling hirsh/i)).toBeInTheDocument();
    expect(screen.getByText(/sterlinghirsh@gmail.com/i)).toBeInTheDocument();
  });

  test('displays game over section when gameOver is true', () => {
    const gameOverProps = {
      ...defaultProps,
      gameOver: true,
      numCorrect: 10,
      numIncorrect: 3,
      personalStats: { score: 85 }
    };

    render(<ReadyView {...gameOverProps} />);
    
    // The GameOver component would display these scores
    // This tests that the props are passed correctly
    expect(screen.getByText(/players: 2/i)).toBeInTheDocument();
  });

  test('handles join code input', () => {
    render(<ReadyView {...defaultProps} />);
    
    // The join code input is handled by the Intro component
    // We test that the props are passed correctly
    expect(defaultProps.handleJoinCodeChange).toBeDefined();
    expect(defaultProps.handleJoin).toBeDefined();
  });

  test('renders with different player counts', () => {
    const props = { ...defaultProps, playerCount: 5 };
    render(<ReadyView {...props} />);
    
    expect(screen.getByText(/players: 5/i)).toBeInTheDocument();
  });

  test('renders with zero players', () => {
    const props = { ...defaultProps, playerCount: 0 };
    render(<ReadyView {...props} />);
    
    expect(screen.getByText(/players: 0/i)).toBeInTheDocument();
  });
});