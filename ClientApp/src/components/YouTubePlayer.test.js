import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { YouTubePlayer } from './YouTubePlayer';

global.fetch = jest.fn();

// Mock YouTube API
window.YT = {
  Player: jest.fn(),
  PlayerState: {
    PLAYING: 1,
    PAUSED: 2,
    ENDED: 0
  }
};

describe('YouTubePlayer Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    window.YT.Player.mockClear();
  });

  test('renders searching state initially', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}));

    render(<YouTubePlayer query="test song" />);

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  test('fetches video ID and displays player', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ videoId: 'abc123' })
    });

    const mockPlayer = {
      playVideo: jest.fn(),
      pauseVideo: jest.fn(),
      destroy: jest.fn()
    };
    window.YT.Player.mockImplementation(() => mockPlayer);

    render(<YouTubePlayer query="test song" autoplay={false} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/youtube/search?query=test%20song')
      );
    });
  });

  test('displays error when video search fails', async () => {
    fetch.mockRejectedValueOnce(new Error('Search failed'));

    render(<YouTubePlayer query="nonexistent" />);

    await waitFor(() => {
      expect(screen.getByText('Search error')).toBeInTheDocument();
    });
  });

  test('displays error when no video found', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    render(<YouTubePlayer query="test" />);

    await waitFor(() => {
      expect(screen.getByText('No video found')).toBeInTheDocument();
    });
  });

  test('toggles play/pause when button clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ videoId: 'abc123' })
    });

    const mockPlayer = {
      playVideo: jest.fn(),
      pauseVideo: jest.fn(),
      destroy: jest.fn()
    };

    window.YT.Player.mockImplementation((element, config) => {
      // Simulate ready state
      setTimeout(() => config.events.onReady({ target: mockPlayer }), 0);
      return mockPlayer;
    });

    render(<YouTubePlayer query="test song" autoplay={false} />);

    await waitFor(() => {
      expect(screen.getByText('Loading Audio...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Paused')).toBeInTheDocument();
    });

    const playButton = screen.getByRole('button');
    fireEvent.click(playButton);

    expect(mockPlayer.playVideo).toHaveBeenCalled();
  });

  test('autoplays when autoplay prop is true', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ videoId: 'abc123' })
    });

    const mockPlayer = {
      playVideo: jest.fn(),
      pauseVideo: jest.fn(),
      destroy: jest.fn()
    };

    window.YT.Player.mockImplementation((element, config) => {
      expect(config.playerVars.autoplay).toBe(1);
      setTimeout(() => config.events.onReady({ target: mockPlayer }), 0);
      return mockPlayer;
    });

    render(<YouTubePlayer query="test song" autoplay={true} />);

    await waitFor(() => {
      expect(window.YT.Player).toHaveBeenCalled();
    });
  });

  test('sets muted when muted prop is true', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ videoId: 'abc123' })
    });

    window.YT.Player.mockImplementation((element, config) => {
      expect(config.playerVars.mute).toBe(1);
      return { destroy: jest.fn() };
    });

    render(<YouTubePlayer query="test song" muted={true} />);

    await waitFor(() => {
      expect(window.YT.Player).toHaveBeenCalled();
    });
  });

  test('updates player state on state change events', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ videoId: 'abc123' })
    });

    const mockPlayer = {
      playVideo: jest.fn(),
      pauseVideo: jest.fn(),
      destroy: jest.fn()
    };

    let onStateChange;
    window.YT.Player.mockImplementation((element, config) => {
      onStateChange = config.events.onStateChange;
      setTimeout(() => {
        config.events.onReady({ target: mockPlayer });
        onStateChange({ data: window.YT.PlayerState.PLAYING });
      }, 0);
      return mockPlayer;
    });

    render(<YouTubePlayer query="test song" />);

    await waitFor(() => {
      expect(screen.getByText('Playing')).toBeInTheDocument();
    });
  });

  test('cleans up player on unmount', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ videoId: 'abc123' })
    });

    const mockPlayer = {
      playVideo: jest.fn(),
      pauseVideo: jest.fn(),
      destroy: jest.fn()
    };

    window.YT.Player.mockImplementation(() => mockPlayer);

    const { unmount } = render(<YouTubePlayer query="test song" />);

    await waitFor(() => {
      expect(window.YT.Player).toHaveBeenCalled();
    });

    unmount();

    expect(mockPlayer.destroy).toHaveBeenCalled();
  });

  test('does not crash when YouTube API not ready', async () => {
    const originalYT = window.YT;
    delete window.YT;
    
    // Mock document.getElementsByTagName to return a valid array
    const mockScriptTag = { parentNode: { insertBefore: jest.fn() } };
    document.getElementsByTagName = jest.fn(() => [mockScriptTag]);
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ videoId: 'abc123' })
    });

    render(<YouTubePlayer query="test song" />);

    await waitFor(() => {
      expect(screen.queryByText('Searching...')).toBeInTheDocument();
    });
    
    window.YT = originalYT;
  });
});
