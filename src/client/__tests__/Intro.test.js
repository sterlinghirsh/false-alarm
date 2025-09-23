import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import Intro from '../intro';

// Mock qrcode library with synchronous return
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
}));

// Component that throws an error for testing Error Boundary
const ThrowingQRGenerator = () => {
  throw new Error('QR generation failed');
};

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:5000/#asdf'
  },
  writable: true
});

describe('Intro Component', () => {
  const defaultProps = {
    gameid: 'asdf',
    joinCode: '',
    handleJoin: jest.fn(),
    handleJoinCodeChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset QRCode mock to default behavior
    const QRCode = require('qrcode');
    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mock-qr-code');
  });

  test('renders without crashing', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    expect(screen.getByText(/false alarm!/i)).toBeInTheDocument();
    
    // Wait for any async QR code operations to complete
    await waitFor(() => {
      expect(screen.getByText(/false alarm!/i)).toBeInTheDocument();
    });
  });

  test('displays game code', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    expect(screen.getByText('asdf')).toBeInTheDocument();
    
    // Wait for async QR code generation to complete
    await waitFor(() => {
      expect(screen.getByText('asdf')).toBeInTheDocument();
    });
  });

  test('displays invite link', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    expect(screen.getByText(/invite friends with this link:/i)).toBeInTheDocument();
    expect(screen.getByText('http://localhost:5000/#asdf')).toBeInTheDocument();
    
    // Wait for async QR code generation to complete
    await waitFor(() => {
      expect(screen.getByText('http://localhost:5000/#asdf')).toBeInTheDocument();
    });
  });

  test('shows QR code when generation succeeds', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    // Wait for QR code to be generated and displayed
    await waitFor(() => {
      expect(screen.getByAltText('QR Code for game link')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/invite friends with this link:/i)).toBeInTheDocument();
  });

  test('displays join form', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    expect(screen.getByText(/or join another game:/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('abcd')).toBeInTheDocument();
    expect(screen.getByText('Join')).toBeInTheDocument();
    
    // Wait for async QR code generation to complete
    await waitFor(() => {
      expect(screen.getByText('Join')).toBeInTheDocument();
    });
  });

  test('displays error boundary fallback when QR generation fails', async () => {
    // Mock console.error to avoid error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Make qrcode.toDataURL throw an error
    const QRCode = require('qrcode');
    QRCode.toDataURL.mockRejectedValueOnce(new Error('QR generation failed'));
    
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    // Wait for error boundary to catch the error and display fallback
    await waitFor(() => {
      expect(screen.getByText('QR code unavailable')).toBeInTheDocument();
    });
    
    // Verify QR image is not displayed
    expect(screen.queryByAltText('QR Code for game link')).not.toBeInTheDocument();
    
    // Verify the rest of the UI still works
    expect(screen.getByText(/false alarm!/i)).toBeInTheDocument();
    expect(screen.getByText('asdf')).toBeInTheDocument();
    expect(screen.getByText('Join')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
  
  test('other UI elements remain unaffected when QR fails', async () => {
    // Mock console.error to prevent test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Make QR generation fail
    const QRCode = require('qrcode');
    QRCode.toDataURL.mockRejectedValueOnce(new Error('QR generation failed'));
    
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    // Wait for error handling
    await waitFor(() => {
      expect(screen.getByText('QR code unavailable')).toBeInTheDocument();
    });
    
    // All other elements should still be present and functional
    expect(screen.getByText(/false alarm!/i)).toBeInTheDocument();
    expect(screen.getByText('Game code:')).toBeInTheDocument();
    expect(screen.getByText('asdf')).toBeInTheDocument();
    expect(screen.getByText(/invite friends with this link:/i)).toBeInTheDocument();
    expect(screen.getByText('http://localhost:5000/#asdf')).toBeInTheDocument();
    expect(screen.getByText(/or join another game:/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('abcd')).toBeInTheDocument();
    expect(screen.getByText('Join')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});