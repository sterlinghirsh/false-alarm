import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Intro from '../intro';

// Mock qrcode-generator library
const mockQRCode = {
  addData: jest.fn(),
  make: jest.fn(),
  createDataURL: jest.fn()
};

jest.mock('qrcode-generator', () => {
  return jest.fn(() => mockQRCode);
});

import qrcode from 'qrcode-generator';

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
    
    // Setup qrcode-generator mock to return a data URL
    mockQRCode.createDataURL.mockReturnValue('data:image/png;base64,mockedQRCodeData');
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
      expect(qrcode).toHaveBeenCalledWith(0, 'M');
      expect(mockQRCode.addData).toHaveBeenCalledWith('http://localhost:5000/#test123');
      expect(mockQRCode.make).toHaveBeenCalled();
      expect(mockQRCode.createDataURL).toHaveBeenCalledWith(4, 0);
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
    
    // Make qrcode constructor throw an error
    qrcode.mockImplementation(() => {
      throw new Error('QR generation failed');
    });
    
    render(<Intro {...defaultProps} />);
    
    // Give time for the error handling to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // QR code should not be displayed when generation fails
    expect(screen.queryByAltText('QR Code for game link')).not.toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});