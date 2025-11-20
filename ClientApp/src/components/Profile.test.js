import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Profile } from './Profile';

// Mock fetch
global.fetch = jest.fn();

describe('Profile Component', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    localStorage.setItem('userId', 'test-user-id');
  });

  test('renders loading state initially', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ genres: [], topSongs: [] })
    });
    
    render(<Profile />);
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  test('loads and displays user profile with genres', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        genres: ['Pop', 'Rock'],
        topSongs: []
      })
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    // Find checkboxes by their value attribute
    const popCheckbox = screen.getByDisplayValue('Pop');
    const rockCheckbox = screen.getByDisplayValue('Rock');
    expect(popCheckbox).toBeChecked();
    expect(rockCheckbox).toBeChecked();
  });

  test('loads and displays top 3 songs', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        genres: [],
        topSongs: [
          { Id: '1', Name: 'Song 1', Artist: 'Artist 1', AlbumImageUrl: 'url1' },
          { Id: '2', Name: 'Song 2', Artist: 'Artist 2', AlbumImageUrl: 'url2' }
        ]
      })
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
      expect(screen.getByText('Song 2')).toBeInTheDocument();
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
    });
  });

  test('allows selecting and deselecting genres', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ genres: [], topSongs: [] })
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    const jazzCheckbox = screen.getByDisplayValue('Jazz');
    expect(jazzCheckbox).not.toBeChecked();

    fireEvent.click(jazzCheckbox);
    expect(jazzCheckbox).toBeChecked();

    fireEvent.click(jazzCheckbox);
    expect(jazzCheckbox).not.toBeChecked();
  });

  test('searches for songs', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ genres: [], topSongs: [] })
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    const searchInputs = screen.getAllByPlaceholderText('Search for a song...');
    const firstInput = searchInputs[0];
    const firstSearchButton = screen.getAllByText('Search')[0];

    fireEvent.change(firstInput, { target: { value: 'Test Song' } });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'song1',
            name: 'Test Song Result',
            artists: [{ name: 'Test Artist' }],
            album: { images: [{ url: 'test-url' }] }
          }
        ]
      })
    });

    fireEvent.click(firstSearchButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/spotify/search?query=Test%20Song')
      );
    });
  });

  test('selects a song from search results', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ genres: [], topSongs: [] })
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    const searchInputs = screen.getAllByPlaceholderText('Search for a song...');
    const firstInput = searchInputs[0];
    const firstSearchButton = screen.getAllByText('Search')[0];

    fireEvent.change(firstInput, { target: { value: 'Song' } });
    fireEvent.focus(firstInput);

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'song1',
            name: 'Selected Song',
            artists: [{ name: 'Artist' }],
            album: { images: [{ url: 'url' }] }
          }
        ]
      })
    });

    fireEvent.click(firstSearchButton);

    await waitFor(() => {
      expect(screen.getByText(/Selected Song/)).toBeInTheDocument();
    });
  });

  test('removes a selected song', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        genres: [],
        topSongs: [
          { Id: '1', Name: 'Removable Song', Artist: 'Artist', AlbumImageUrl: 'url' }
        ]
      })
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('Removable Song')).toBeInTheDocument();
    });

    const removeButton = screen.getAllByTitle('Remove')[0];
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('Removable Song')).not.toBeInTheDocument();
    });
  });

  test('saves profile successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ genres: ['Pop'], topSongs: [] })
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    fetch.mockResolvedValueOnce({ ok: true });
    fetch.mockResolvedValueOnce({ ok: true });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    });
  });

  test('displays error when profile fetch fails', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  test('displays error when save fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ genres: [], topSongs: [] })
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    fetch.mockRejectedValueOnce(new Error('Save failed'));

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Save failed/)).toBeInTheDocument();
    });
  });

  test('shows page loader when searching', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ genres: [], topSongs: [] })
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    const searchInputs = screen.getAllByPlaceholderText('Search for a song...');
    fireEvent.change(searchInputs[0], { target: { value: 'Test' } });

    fetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    const firstSearchButton = screen.getAllByText('Search')[0];
    fireEvent.click(firstSearchButton);

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  test('redirects to login if no userId', async () => {
    delete window.location;
    window.location = { href: '' };
    localStorage.removeItem('userId');

    render(<Profile />);

    await waitFor(() => {
      expect(window.location.href).toBe('/login');
    });
  });
});
