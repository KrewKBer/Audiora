import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Notifications } from '../Notifications';
import * as signalR from '@microsoft/signalr';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock signalR
jest.mock('@microsoft/signalr', () => {
  const mockConnection = {
    on: jest.fn(),
    invoke: jest.fn(),
    start: jest.fn().mockResolvedValue(),
    stop: jest.fn()
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

const { __mockConnection } = require('@microsoft/signalr');
const mockOn = __mockConnection.on;
const mockInvoke = __mockConnection.invoke;
const mockStart = __mockConnection.start;
const mockStop = __mockConnection.stop;

describe('Notifications Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStart.mockResolvedValue();
    localStorage.setItem('userId', 'test-user-id');
    localStorage.setItem('username', 'test-user');
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders ping button', () => {
    render(<Notifications />);
    expect(screen.getByText(/Ping/)).toBeInTheDocument();
  });

  test('opens notifications panel on click', () => {
    render(<Notifications />);
    fireEvent.click(screen.getByText(/Ping/));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  test('handles incoming like notification', () => {
    render(<Notifications />);
    
    // Simulate incoming 'LikeReceived'
    const likeHandler = mockOn.mock.calls.find(call => call[0] === 'LikeReceived')[1];
    
    act(() => {
      likeHandler({ fromUserId: 'user2', fromUsername: 'User 2' });
    });

    fireEvent.click(screen.getByText(/Ping/));
    expect(screen.getByText('User 2')).toBeInTheDocument();
    expect(screen.getByText(/liked your profile/)).toBeInTheDocument();
  });
});
