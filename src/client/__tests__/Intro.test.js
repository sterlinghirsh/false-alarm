import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Intro from '../intro';

// Mock QRCode library
jest.mock('qrcode', () => ({
  toDataURL: jest.fn()
}));

import QRCode from 'qrcode';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:5000/#test123'
  },
  writable: true
});

describe('Intro Component', () => {
  const defaultProps = {
    gameid: 'test123',
    joinCode: '',
    handleJoin: jest.fn(),
    handleJoinCodeChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup QRCode mock to return a data URL
    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockedQRCodeData');
  });

  test('renders without crashing', () => {
    render(<Intro {...defaultProps} />);
    expect(screen.getByText(/false alarm!/i)).toBeInTheDocument();
  });

  test('displays game code', () => {
    render(<Intro {...defaultProps} />);
    expect(screen.getByText('test123')).toBeInTheDocument();
  });

  test('displays invite link', () => {
    render(<Intro {...defaultProps} />);
    expect(screen.getByText(/invite friends with this link:/i)).toBeInTheDocument();
    expect(screen.getByText('http://localhost:5000/#test123')).toBeInTheDocument();
  });

  test('generates and displays QR code', async () => {
    render(<Intro {...defaultProps} />);
    
    // Wait for QR code to be generated
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalledWith('http://localhost:5000/#test123', {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    });

    // Check QR code image is displayed
    await waitFor(() => {
      const qrImage = screen.getByAltText('QR Code for game link');
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', 'data:image/png;base64,mockedQRCodeData');
    });

    // Check QR code description
    expect(screen.getByText(/scan to join the game/i)).toBeInTheDocument();
  });

  test('displays join form', () => {
    render(<Intro {...defaultProps} />);
    
    expect(screen.getByText(/or join another game:/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('abcd')).toBeInTheDocument();
    expect(screen.getByText('Join')).toBeInTheDocument();
  });

  test('handles QR code generation error gracefully', async () => {
    // Mock console.error to avoid error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Make QRCode.toDataURL reject
    QRCode.toDataURL.mockRejectedValue(new Error('QR generation failed'));
    
    render(<Intro {...defaultProps} />);
    
    // Wait for the QR code generation to be attempted and fail
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalled();
    });

    // Give time for the error handling to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // QR code should not be displayed when generation fails
    expect(screen.queryByAltText('QR Code for game link')).not.toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});