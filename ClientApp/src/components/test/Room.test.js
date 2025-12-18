import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Room } from '../Room';
import * as signalR from '@microsoft/signalr';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'room-1' }),
  useNavigate: () => mockNavigate
}));

// Mock signalR
jest.mock('@microsoft/signalr', () => {
  const mockConnection = {
    on: jest.fn(),
    invoke: jest.fn().mockResolvedValue(),
    start: jest.fn().mockResolvedValue(),
    stop: jest.fn().mockResolvedValue(),
    onreconnecting: jest.fn(),
    onreconnected: jest.fn(),
    onclose: jest.fn(),
    state: 'Connected'
  };

  class MockHubConnectionBuilder {
    withUrl() { return this; }
    configureLogging() { return this; }
    withAutomaticReconnect() { return this; }
    build() { return mockConnection; }
  }

  return {
    HubConnectionBuilder: MockHubConnectionBuilder,
    LogLevel: { Information: 1 },
    HubConnectionState: { Connected: 'Connected' },
    __mockConnection: mockConnection
  };
});

const mockConnection = signalR.__mockConnection;
const mockOn = mockConnection.on;
const mockInvoke = mockConnection.invoke;
const mockStart = mockConnection.start;
const mockStop = mockConnection.stop;

// Mock fetch
global.fetch = jest.fn();

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('Room Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStart.mockResolvedValue();
    mockInvoke.mockResolvedValue();
    mockStop.mockResolvedValue();
    localStorage.setItem('userId', 'user1');
    localStorage.setItem('username', 'User 1');
    
    // Mock fetch responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/room/room-1/messages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { userId: 'user2', username: 'User 2', message: 'Hello', timestamp: new Date().toISOString() }
          ])
        });
      }
      if (url.includes('/api/room/room-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'room-1', name: 'Test Room', isPrivate: false })
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders room name and messages', async () => {
    await act(async () => {
      render(<Room />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  test('sends a message', async () => {
    await act(async () => {
      render(<Room />);
    });

    await waitFor(() => screen.getByText('Test Room'));

    const input = screen.getByPlaceholderText('Message #Test Room...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'My new message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('SendMessage', 'room-1', 'user1', 'User 1', 'My new message');
    });
  });
});
