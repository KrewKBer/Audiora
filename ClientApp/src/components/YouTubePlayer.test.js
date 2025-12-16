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

  test('renders load button initially', () => {
    render(<YouTubePlayer query="test song" />);
    expect(screen.getByText('Load Preview')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('fetches video ID only after clicking load', async () => {
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

    // Should not fetch yet
    expect(fetch).not.toHaveBeenCalled();

    // Click load
    fireEvent.click(screen.getByText('▶'));

    // Now it should fetch
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/youtube/search?query=test%20song')
      );
    });
  });

  test('displays error when video search fails', async () => {
    fetch.mockRejectedValueOnce(new Error('Search failed'));

    render(<YouTubePlayer query="nonexistent" />);
    fireEvent.click(screen.getByText('▶'));

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
    fireEvent.click(screen.getByText('▶'));

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
    fireEvent.click(screen.getByText('▶'));

    await waitFor(() => {
      expect(screen.getByText('Loading Audio...')).toBeInTheDocument();
    });
    
    // Wait for player to be ready (simulated by timeout in mock)
    await waitFor(() => {
        expect(screen.getByText('Paused')).toBeInTheDocument(); 
    });

    // Click play/pause
    const playButton = screen.getAllByText('▶')[0]; 
    fireEvent.click(playButton);
    
    expect(mockPlayer.playVideo).toHaveBeenCalled();
  });
});
