import React from 'react';
import { render, screen } from '@testing-library/react';
import GameView from '../gameView';

describe('GameView Component', () => {
  const defaultProps = {
    playerCount: 3,
    numCorrect: 5,
    numIncorrect: 2,
    activePhrase: { Phrase: 'Test phrase!', Type: 'Test' },
    timeLeft: 7500,
    maxTime: 10000,
    buttons: [
      { Phrase: 'Button phrase 1', Type: 'Test' },
      { Phrase: 'Button phrase 2', Type: 'Test' }
    ],
    onPhraseButtonClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<GameView {...defaultProps} />);
    expect(screen.getByText(/say this:/i)).toBeInTheDocument();
  });

  test('displays player count', () => {
    render(<GameView {...defaultProps} />);
    expect(screen.getByText(/players: 3/i)).toBeInTheDocument();
  });

  test('displays correct score', () => {
    render(<GameView {...defaultProps} />);
    expect(screen.getByText(/score: 5/i)).toBeInTheDocument(); // numCorrect
    expect(screen.getByText(/incorrect: 2/i)).toBeInTheDocument(); // numIncorrect
  });

  test('displays active phrase', () => {
    render(<GameView {...defaultProps} />);
    expect(screen.getByText('Test phrase!')).toBeInTheDocument();
  });

  test('displays progress bar with correct values', () => {
    render(<GameView {...defaultProps} />);
    const progressBar = screen.getByRole('progressbar');
    
    expect(progressBar).toHaveAttribute('value', '7500');
    expect(progressBar).toHaveAttribute('max', '10000');
  });

  test('displays phrase buttons', () => {
    render(<GameView {...defaultProps} />);
    
    expect(screen.getByText('Button phrase 1')).toBeInTheDocument();
    expect(screen.getByText('Button phrase 2')).toBeInTheDocument();
  });

  test('shows "Tap if you hear it" instruction', () => {
    render(<GameView {...defaultProps} />);
    expect(screen.getByText(/tap if you hear it:/i)).toBeInTheDocument();
  });

  test('handles empty buttons array', () => {
    const propsWithNoButtons = {
      ...defaultProps,
      buttons: []
    };
    
    render(<GameView {...propsWithNoButtons} />);
    expect(screen.getByText(/tap if you hear it:/i)).toBeInTheDocument();
  });

  test('handles zero time left', () => {
    const propsWithZeroTime = {
      ...defaultProps,
      timeLeft: 0
    };
    
    render(<GameView {...propsWithZeroTime} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('value', '0');
  });
});