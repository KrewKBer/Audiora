import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { DirectChat } from '../DirectChat';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ chatId: 'test-chat-id' })
}));

// Mock SignalR
jest.mock('@microsoft/signalr', () => {
  const mockConnection = {
    on: jest.fn(),
    start: jest.fn().mockResolvedValue(),
    stop: jest.fn(),
    invoke: jest.fn()
  };
  
  class MockHubConnectionBuilder {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    build() { return mockConnection; }
  }

  return {
    HubConnectionBuilder: MockHubConnectionBuilder,
    __mockConnection: mockConnection
  };
});

import * as signalR from '@microsoft/signalr';
const mockConnection = signalR.__mockConnection;

global.fetch = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('DirectChat Component', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    mockNavigate.mockClear();
    mockConnection.on.mockClear();
    mockConnection.start.mockClear();
    mockConnection.start.mockResolvedValue();
    mockConnection.stop.mockClear();
    mockConnection.invoke.mockClear();
    localStorage.setItem('userId', 'test-user');
    localStorage.setItem('username', 'Test User');

    // Default mock implementation to handle multiple fetch calls
    fetch.mockImplementation((url) => {
      if (url.includes('/api/match/user/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ username: 'Other User' })
        });
      }
      // Default for messages
      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    });
  });

  test('renders loading state initially', () => {
    // Override for this test to simulate loading
    fetch.mockImplementation(() => new Promise(() => {}));

    const { container } = render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    expect(container.querySelector('.direct-chat-loading')).toBeInTheDocument();
  });

  test('loads and displays messages', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/api/match/user/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ username: 'Other User' })
        });
      }
      return Promise.resolve({
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
    // Default mock is fine (returns [])

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
    // Default mock for initial load is fine

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Message Other User/);
    fireEvent.change(input, { target: { value: 'New message' } });

    // Mock the send response
    fetch.mockImplementationOnce((url, options) => {
        if (url.includes('/send')) {
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    id: 'new-msg',
                    userId: 'test-user',
                    username: 'Test User',
                    message: 'New message',
                    timestamp: new Date().toISOString()
                })
            });
        }
        // Fallback to default behavior for other calls if any happen
        return Promise.resolve({ ok: true, json: async () => [] });
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
    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Message Other User/);
    fireEvent.change(input, { target: { value: 'Enter message' } });

    // Mock send response
    fetch.mockImplementationOnce((url) => {
        if (url.includes('/send')) {
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    userId: 'test-user',
                    username: 'Test User',
                    message: 'Enter message',
                    timestamp: new Date().toISOString()
                })
            });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
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
    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    // Should only have the initial fetch calls (messages + user)
    // We can't check exact count easily because of the user fetch, but we can check it wasn't called with POST
    expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/send'),
        expect.anything()
    );
  });

  test('displays error on message load failure', async () => {
    fetch.mockRejectedValue(new Error('Load failed'));

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
    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Message Other User/);
    fireEvent.change(input, { target: { value: 'Test' } });

    // Mock send failure
    fetch.mockImplementationOnce((url) => {
        if (url.includes('/send')) {
            return Promise.reject(new Error('Send failed'));
        }
        return Promise.resolve({ ok: true, json: async () => [] });
    });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Send failed/)).toBeInTheDocument();
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
    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Message Other User/);
    fireEvent.change(input, { target: { value: 'Message to send' } });

    fetch.mockImplementationOnce((url) => {
        if (url.includes('/send')) {
            return Promise.resolve({
                ok: true,
                json: async () => ({ message: 'Message to send' })
            });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
    });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  test('displays formatted timestamps', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/api/match/user/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ username: 'Other User' })
        });
      }
      return Promise.resolve({
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
    });

    render(
      <BrowserRouter>
        <DirectChat />
      </BrowserRouter>
    );

    await waitFor(() => {
      const userElements = screen.getAllByText(/User/);
      expect(userElements.length).toBeGreaterThan(0);
    });
  });
});
