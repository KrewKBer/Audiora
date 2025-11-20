import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LikedSongs } from './LikedSongs';

global.fetch = jest.fn();

describe('LikedSongs Component', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
  });

  test('renders component heading', () => {
    localStorage.setItem('userId', '123');
    fetch.mockResolvedValueOnce({
      json: async () => ([]),
    });

    render(<LikedSongs />);
    expect(screen.getByText('Your Liked Songs')).toBeInTheDocument();
    expect(screen.getByText("Here are the songs you've liked.")).toBeInTheDocument();
  });

  test('shows loading state initially', () => {
    localStorage.setItem('userId', '123');
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LikedSongs />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('redirects to login when user is not authenticated', () => {
    delete window.location;
    window.location = { href: '' };

    render(<LikedSongs />);
    
    expect(window.location.href).toBe('/login');
  });

  test('displays message when no liked songs', async () => {
    localStorage.setItem('userId', '123');
    fetch.mockResolvedValueOnce({
      json: async () => ([]),
    });

    render(<LikedSongs />);

    await waitFor(() => {
      expect(screen.getByText('No liked songs yet. Start swiping!')).toBeInTheDocument();
    });
  });

  test('displays liked songs in table', async () => {
    const mockSongs = [
      {
        songId: '1',
        name: 'Test Song 1',
        artist: 'Artist 1',
        albumImageUrl: 'http://test.com/image1.jpg'
      },
      {
        songId: '2',
        name: 'Test Song 2',
        artist: 'Artist 2',
        albumImageUrl: 'http://test.com/image2.jpg'
      }
    ];

    localStorage.setItem('userId', '123');
    fetch.mockResolvedValueOnce({
      json: async () => mockSongs,
    });

    render(<LikedSongs />);

    await waitFor(() => {
      expect(screen.getByText('Test Song 1')).toBeInTheDocument();
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
      expect(screen.getByText('Test Song 2')).toBeInTheDocument();
      expect(screen.getByText('Artist 2')).toBeInTheDocument();
    });
  });

  test('handles songs with alternative property names', async () => {
    const mockSongs = [
      {
        SongId: '3',
        Name: 'Capitalized Song',
        Artist: 'Capitalized Artist',
        AlbumImageUrl: 'http://test.com/image3.jpg'
      }
    ];

    localStorage.setItem('userId', '456');
    fetch.mockResolvedValueOnce({
      json: async () => mockSongs,
    });

    render(<LikedSongs />);

    await waitFor(() => {
      expect(screen.getByText('Capitalized Song')).toBeInTheDocument();
      expect(screen.getByText('Capitalized Artist')).toBeInTheDocument();
    });
  });

  test('handles fetch error gracefully', async () => {
    localStorage.setItem('userId', '123');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<LikedSongs />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  test('renders album images when available', async () => {
    const mockSongs = [
      {
        songId: '1',
        name: 'Song With Art',
        artist: 'Artist',
        albumImageUrl: 'http://test.com/album.jpg'
      }
    ];

    localStorage.setItem('userId', '123');
    fetch.mockResolvedValueOnce({
      json: async () => mockSongs,
    });

    render(<LikedSongs />);

    await waitFor(() => {
      const img = screen.getByRole('img', { name: 'Song With Art' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'http://test.com/album.jpg');
    });
  });

  test('skips songs without name and artist', async () => {
    const mockSongs = [
      {
        songId: '1',
        name: 'Valid Song',
        artist: 'Valid Artist'
      },
      {
        songId: '2',
        // Missing name and artist
      }
    ];

    localStorage.setItem('userId', '123');
    fetch.mockResolvedValueOnce({
      json: async () => mockSongs,
    });

    render(<LikedSongs />);

    await waitFor(() => {
      expect(screen.getByText('Valid Song')).toBeInTheDocument();
      // Song without name/artist should not be rendered
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(2); // header + 1 valid song
    });
  });
});
