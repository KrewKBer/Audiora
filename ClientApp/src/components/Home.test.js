import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Home } from './Home';
import { SongQueueProvider } from './SongQueueContext';

// Mock dependencies
jest.mock('react-tinder-card', () => {
  const React = require('react');
  return React.forwardRef(({ children, onSwipe }, ref) => (
    <div data-testid="tinder-card">
      {children}
      <button onClick={() => onSwipe('left')}>Swipe Left</button>
      <button onClick={() => onSwipe('right')}>Swipe Right</button>
    </div>
  ));
});

jest.mock('./YouTubePlayer', () => ({
  YouTubePlayer: () => <div data-testid="youtube-player">YouTube Player</div>
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock window.confirm
window.confirm = jest.fn();

describe('Home Component Integration', () => {
  const mockSong = {
    id: '123',
    name: 'Test Song',
    artists: [{ name: 'Test Artist' }],
    album: { images: [{ url: 'http://test.com/image.jpg' }] },
    preview_url: 'http://test.com/preview.mp3'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('test-user-id');
    sessionStorageMock.getItem.mockReturnValue('active');
  });

  test('renders loading state initially or no songs message', () => {
    render(
      <SongQueueProvider>
        <Home />
      </SongQueueProvider>
    );
    // Since queue is empty initially
    expect(screen.getByText(/no songs in queue/i)).toBeInTheDocument();
  });

  test('fetches random songs when button clicked', async () => {
    const mockSongs = [mockSong];
    fetch.mockResolvedValueOnce({
      json: async () => ({ items: mockSongs })
    });

    render(
      <SongQueueProvider>
        <Home />
      </SongQueueProvider>
    );

    const randomButton = screen.getByText(/get 25 random songs/i);
    fireEvent.click(randomButton);

    expect(screen.getByText(/loading.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/spotify/recommendations'));
    });
  });

  test('handles swipe interaction (like)', async () => {
    // We need to mock the hook to provide data
    const mockAddSongs = jest.fn();
    const mockGetNext = jest.fn().mockReturnValue(mockSong);
    const mockClear = jest.fn();
    
    // Re-mock the module to return our custom hook values
    jest.spyOn(require('./SongQueueContext'), 'useSongQueue').mockReturnValue({
      songQueue: [mockSong],
      addSongsToQueue: mockAddSongs,
      getNextSong: mockGetNext,
      clearQueue: mockClear
    });

    render(<Home />);

    // Verify song is displayed
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();

    // Trigger swipe right (Like)
    const swipeRightBtn = screen.getByText('Swipe Right');
    fireEvent.click(swipeRightBtn);

    // Verify API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/user-songs/seen', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"liked":true')
      }));
    });
  });
});
