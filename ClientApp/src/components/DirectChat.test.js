import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { DirectChat } from './DirectChat';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ chatId: 'test-chat-id' })
}));

// Mock SignalR
const mockConnection = {
  on: jest.fn(),
  start: jest.fn().mockResolvedValue(),
  stop: jest.fn(),
  invoke: jest.fn()
};

jest.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: jest.fn().mockImplementation(() => ({
    withUrl: jest.fn().mockReturnThis(),
    withAutomaticReconnect: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue(mockConnection)
  }))
}));

global.fetch = jest.fn();

describe('DirectChat Component', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    mockNavigate.mockClear();
    mockConnection.on.mockClear();
    mockConnection.start.mockClear();
    mockConnection.stop.mockClear();
    mockConnection.invoke.mockClear();
    localStorage.setItem('userId', 'test-user');
    localStorage.setItem('username', 'Test User');
  });

  test('renders loading state initially', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}));

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    expect(screen.getByText('Loading chat...')).toBeInTheDocument();
  });

  test('loads and displays messages', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'msg1',
          userId: 'other-user',
          username: 'Other User',
          message: 'Hello!',
          timestamp: '2025-01-01T10:00:00Z'
        },
        {
          id: 'msg2',
          userId: 'test-user',
          username: 'Test User',
          message: 'Hi there!',
          timestamp: '2025-01-01T10:01:00Z'
        }
      ]
    });

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
  });

  test('displays empty message state', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No messages yet/)).toBeInTheDocument();
    });
  });

  test('sends message on button click', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Direct Chat')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Message as/);
    fireEvent.change(input, { target: { value: 'New message' } });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'new-msg',
        userId: 'test-user',
        username: 'Test User',
        message: 'New message',
        timestamp: new Date().toISOString()
      })
    });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/directchat/send',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            chatId: 'test-chat-id',
            userId: 'test-user',
            username: 'Test User',
            message: 'New message'
          })
        })
      );
    });
  });

  test('sends message on Enter key press', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Direct Chat')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Message as/);
    fireEvent.change(input, { target: { value: 'Enter message' } });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: 'test-user',
        username: 'Test User',
        message: 'Enter message',
        timestamp: new Date().toISOString()
      })
    });

    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/directchat/send',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  test('does not send empty message', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Direct Chat')).toBeInTheDocument();
    });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    // Should only have the initial fetch for loading messages
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('displays error on message load failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Load failed'));

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Load failed/)).toBeInTheDocument();
    });
  });

  test('displays error on message send failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Direct Chat')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Message as/);
    fireEvent.change(input, { target: { value: 'Test' } });

    fetch.mockRejectedValueOnce(new Error('Send failed'));

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Send failed/)).toBeInTheDocument();
    });
  });

  test('displays chat ID', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Chat ID: test-chat-id/)).toBeInTheDocument();
    });
  });

  test('redirects to login if no userId', () => {
    localStorage.removeItem('userId');

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('clears input after sending message', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Direct Chat')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Message as/);
    fireEvent.change(input, { target: { value: 'Message to send' } });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Message to send' })
    });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  test('displays formatted timestamps', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'msg1',
          userId: 'user1',
          username: 'User',
          message: 'Test',
          timestamp: '2025-01-01T14:30:00Z'
        }
      ]
    });

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/User/)).toBeInTheDocument();
    });
  });
});
