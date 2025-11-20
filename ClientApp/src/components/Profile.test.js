import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Profile } from './Profile';

global.fetch = jest.fn();

describe('Profile Component', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
  });

  test('renders loading state initially', () => {
    localStorage.setItem('userId', '123');
    fetch.mockImplementation(() => new Promise(() => {})); 

    render(<Profile />);
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });

  test('renders profile data after loading', async () => {
    localStorage.setItem('userId', '123');
    
    // Mock profile data response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        genres: ['Pop', 'Rock'],
        topSongs: [
          { Name: 'Song 1', Artist: 'Artist 1', AlbumImageUrl: 'url1' }
        ]
      })
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('Your Profile')).toBeInTheDocument();
    });

    // Check genres
    const popCheckbox = screen.getByLabelText('Pop');
    expect(popCheckbox).toBeChecked();
    const rockCheckbox = screen.getByLabelText('Rock');
    expect(rockCheckbox).toBeChecked();
    const jazzCheckbox = screen.getByLabelText('Jazz');
    expect(jazzCheckbox).not.toBeChecked();

    // Check top songs
    expect(screen.getByText('Song 1')).toBeInTheDocument();
    expect(screen.getByText('Artist 1')).toBeInTheDocument();
    
    // Check empty slots
    expect(screen.getByPlaceholderText('Search for song #2...')).toBeInTheDocument();
  });

  test('handles genre selection', async () => {
    localStorage.setItem('userId', '123');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ genres: [], topSongs: [] })
    });

    render(<Profile />);
    await waitFor(() => screen.getByText('Your Profile'));

    const popCheckbox = screen.getByLabelText('Pop');
    fireEvent.click(popCheckbox);
    expect(popCheckbox).toBeChecked();

    fireEvent.click(popCheckbox);
    expect(popCheckbox).not.toBeChecked();
  });

  test('saves profile data', async () => {
    localStorage.setItem('userId', '123');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ genres: ['Pop'], topSongs: [] })
    });

    render(<Profile />);
    await waitFor(() => screen.getByText('Your Profile'));

    // Mock save responses
    fetch.mockResolvedValueOnce({ ok: true }); // update-genres
    fetch.mockResolvedValueOnce({ ok: true }); // update-top-songs

    const saveBtn = screen.getByText('Save Profile');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    });
  });
});
