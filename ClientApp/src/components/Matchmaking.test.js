import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Matchmaking } from './Matchmaking';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock react-tinder-card
jest.mock('react-tinder-card', () => {
  return function TinderCard({ children, onSwipe }) {
    return (
      <div data-testid="tinder-card" data-onswipe={onSwipe ? 'true' : 'false'}>
        {children}
      </div>
    );
  };
});

global.fetch = jest.fn();

describe('Matchmaking Component', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    mockNavigate.mockClear();
    localStorage.setItem('userId', 'test-user');
    localStorage.setItem('username', 'Test User');
  });

  test('renders loading state initially', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}));
    
    render(
      <BrowserRouter>
        <Matchmaking />
      </BrowserRouter>
    );

    expect(screen.getByText('Loading candidates...')).toBeInTheDocument();
  });

  test('loads and displays candidates', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'user1',
          username: 'Alice',
          topSongs: [{ name: 'Song 1', artist: 'Artist 1' }]
        },
        {
          id: 'user2',
          username: 'Bob',
          topSongs: []
        }
      ]
    });

    render(
      <BrowserRouter>
        <Matchmaking />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });
  });

  test('displays empty state when no candidates', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <Matchmaking />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No more candidates')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  test('skip button removes candidate', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'user1', username: 'Alice', topSongs: [] }
      ]
    });

    render(
      <BrowserRouter>
        <Matchmaking />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const skipButton = screen.getByText('Skip');
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
  });

  test('like button sends like request', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'user1', username: 'Alice', topSongs: [] }
      ]
    });

    render(
      <BrowserRouter>
        <Matchmaking />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'liked' })
    });

    const likeButton = screen.getByText('Like');
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/match/like',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userId: 'test-user', targetUserId: 'user1' })
        })
      );
    });
  });

  test('navigates to chat on successful match', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'user1', username: 'Alice', topSongs: [] }
      ]
    });

    render(
      <BrowserRouter>
        <Matchmaking />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'matched', chatId: 'chat123' })
    });

    const likeButton = screen.getByText('Like');
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/directchat/chat123');
    });
  });

  test('displays error message on fetch failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BrowserRouter>
        <Matchmaking />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  test('displays "No songs available" when user has no top songs', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'user1', username: 'NoSongs', topSongs: [] }
      ]
    });

    render(
      <BrowserRouter>
        <Matchmaking />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No songs available')).toBeInTheDocument();
    });
  });

  test('redirects to login if no userId', () => {
    localStorage.removeItem('userId');

    render(
      <BrowserRouter>
        <Matchmaking />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('displays like button disabled state while processing', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'user1', username: 'Alice', topSongs: [] }
      ]
    });

    render(
      <BrowserRouter>
        <Matchmaking />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    fetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    const likeButton = screen.getByText('Like');
    fireEvent.click(likeButton);

    expect(likeButton).toBeDisabled();
  });
});
