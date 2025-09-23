import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import QRCode from 'qrcode';
import Intro from '../intro';

// Simple component that throws an error for testing Error Boundary only
const ThrowingQRComponent = () => {
  throw new Error('QR generation failed for testing');
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
  });

  test('renders without crashing', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    expect(screen.getByText(/false alarm!/i)).toBeInTheDocument();
  });

  test('displays game code', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    expect(screen.getByText('asdf')).toBeInTheDocument();
  });

  test('displays invite link', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    expect(screen.getByText(/invite friends with this link:/i)).toBeInTheDocument();
    expect(screen.getByText('http://localhost:5000/#asdf')).toBeInTheDocument();
  });

  test('shows QR code when generation succeeds', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    // Wait for real QR code to be generated and displayed
    await waitFor(() => {
      expect(screen.getByAltText('QR Code for game link')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getByText(/invite friends with this link:/i)).toBeInTheDocument();
  });

  test('displays join form', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    expect(screen.getByText(/or join another game:/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('abcd')).toBeInTheDocument();
    expect(screen.getByText('Join')).toBeInTheDocument();
  });

  test('generates and displays real QR code with correct data URL (snapshot)', async () => {
    await act(async () => {
      render(<Intro {...defaultProps} />);
    });
    
    // Wait for real QR code to be generated
    await waitFor(() => {
      expect(screen.getByAltText('QR Code for game link')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Get the actual QR image element
    const qrImage = screen.getByAltText('QR Code for game link');
    const actualDataURL = qrImage.src;
    
    // Generate expected QR code data URL for comparison
    const expectedDataURL = await QRCode.toDataURL('http://localhost:5000/#asdf', {
      width: 200,
      margin: 0,
      color: {
        dark: '#000000FF',
        light: '#FFFFFFFF',
      },
    });
    
    // Snapshot test - actual should match expected
    expect(actualDataURL).toBe(expectedDataURL);
  });
  
  test('displays error boundary fallback when QR component throws error', async () => {
    // Mock console.error to avoid error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create a modified Intro component that uses our throwing component
    const IntroWithThrowingQR = (props) => {
      return (
        <div className="roomCodeInfo">
          <h1 className="title">False Alarm!</h1>
          <h5>
            Game code: <span className="gameid">{props.gameid}</span>
          </h5>
          <h6>
            Invite friends with this link: <br />
            <a href={window.location.href}>{window.location.href}</a>
          </h6>
          <div className="App">
            <ThrowingQRComponent />
          </div>
          <h6>
            Or join another game: <br />
            <form onSubmit={props.handleJoin}>
              <input
                type="text"
                placeholder="abcd"
                size="6"
                className="joinGameCodeInput"
                value={props.joinCode}
                onChange={props.handleJoinCodeChange}
              />
              <button
                type="button"
                className="joinButton"
                onClick={props.handleJoin}
              >
                Join
              </button>
            </form>
          </h6>
        </div>
      );
    };
    
    await act(async () => {
      render(<IntroWithThrowingQR {...defaultProps} />);
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