import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Chats } from '../Chats';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

global.fetch = jest.fn();

describe('Chats Component', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    mockNavigate.mockClear();
    localStorage.setItem('userId', 'test-user');
  });

  test('renders loading state initially', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}));

    render(
      <BrowserRouter>
        <Chats />
      </BrowserRouter>
    );

    expect(screen.getByText('Loading chats...')).toBeInTheDocument();
  });

  test('loads and displays chat list', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          chatId: 'chat1',
          withUsername: 'Alice',
          createdAt: '2025-01-01T10:00:00Z'
        },
        {
          chatId: 'chat2',
          withUsername: 'Bob',
          createdAt: '2025-01-02T15:30:00Z'
        }
      ]
    });

    render(
      <BrowserRouter>
        <Chats />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  test('displays empty state when no chats', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <Chats />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No chats yet/)).toBeInTheDocument();
      expect(screen.getByText(/Go to Matchmaking/)).toBeInTheDocument();
    });
  });

  test('navigates to chat when Open button is clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          chatId: 'chat123',
          withUsername: 'Alice',
          createdAt: '2025-01-01T10:00:00Z'
        }
      ]
    });

    render(
      <BrowserRouter>
        <Chats />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const chatItem = screen.getByText('Alice').closest('.chat-item');
    const actionButton = chatItem.querySelector('.chat-action');
    fireEvent.click(actionButton);

    expect(mockNavigate).toHaveBeenCalledWith('/directchat/chat123');
  });

  test('displays error message on fetch failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BrowserRouter>
        <Chats />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  test('handles non-array response gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'Invalid format' })
    });

    render(
      <BrowserRouter>
        <Chats />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No chats yet/)).toBeInTheDocument();
    });
  });

  test('redirects to login if no userId', () => {
    localStorage.removeItem('userId');

    render(
      <BrowserRouter>
        <Chats />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('displays formatted timestamp', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          chatId: 'chat1',
          withUsername: 'Alice',
          createdAt: '2025-01-15T14:30:00Z'
        }
      ]
    });

    render(
      <BrowserRouter>
        <Chats />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Matched on/)).toBeInTheDocument();
    });
  });

  test('displays withUser fallback when withUsername missing', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          chatId: 'chat1',
          withUser: 'user-id-123',
          createdAt: '2025-01-01T10:00:00Z'
        }
      ]
    });

    render(
      <BrowserRouter>
        <Chats />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('user-id-123')).toBeInTheDocument();
    });
  });
});
