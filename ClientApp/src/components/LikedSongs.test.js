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
      expect(screen.getByText(/no liked songs yet/i)).toBeInTheDocument();
    });
  });

  test('renders list of liked songs', async () => {
    localStorage.setItem('userId', '123');
    const mockSongs = [
      { songId: '1', name: 'Song 1', artist: 'Artist 1', albumImageUrl: 'url1' },
      { songId: '2', name: 'Song 2', artist: 'Artist 2', albumImageUrl: 'url2' }
    ];
    
    fetch.mockResolvedValueOnce({
      json: async () => mockSongs,
    });

    render(<LikedSongs />);

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
      expect(screen.getByText('Song 2')).toBeInTheDocument();
    });
    
    // Check for images
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', 'url1');
  });
});
