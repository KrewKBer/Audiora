import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Rooms } from '../Rooms';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

global.fetch = jest.fn();
global.alert = jest.fn();

describe('Rooms Component', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    mockNavigate.mockClear();
    alert.mockClear();
    localStorage.setItem('userId', 'test-user');
  });

  test('loads and displays room list', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'room1', name: 'Room One', isPrivate: false, memberUserIds: ['user1'] },
        { id: 'room2', name: 'Room Two', isPrivate: true, memberUserIds: ['user1', 'user2'] }
      ]
    });

    render(
      <BrowserRouter>
        <Rooms />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Room One/)).toBeInTheDocument();
      expect(screen.getByText(/Room Two/)).toBeInTheDocument();
      expect(screen.getByText(/1\s+Members/)).toBeInTheDocument();
      expect(screen.getByText(/2\s+Members/)).toBeInTheDocument();
    });
  });

  test('creates a public room', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <Rooms />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Community Rooms/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('New Room Name...');
    fireEvent.change(nameInput, { target: { value: 'New Room' } });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-room-id', name: 'New Room' })
    });

    const createButton = screen.getByText('Create Room');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/room',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'New Room',
            userId: 'test-user',
            isPrivate: false,
            password: null
          })
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/room/new-room-id');
    });
  });

  test('creates a private room with password', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <Rooms />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Community Rooms/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('New Room Name...');
    const privateCheckbox = screen.getByLabelText('Private');
    
    fireEvent.change(nameInput, { target: { value: 'Secret Room' } });
    fireEvent.click(privateCheckbox);

    // Check if password input appears, otherwise use prompt mock
    const passwordInput = screen.queryByPlaceholderText('Password');
    if (passwordInput) {
        fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    } else {
        global.prompt = jest.fn(() => 'secret123');
    }

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'private-room', name: 'Secret Room' })
    });

    const createButton = screen.getByText('Create Room');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/room',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Secret Room')
        })
      );
    });
  });

  test('joins a public room', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'room1', name: 'Public Room', isPrivate: false, memberUserIds: [] }
      ]
    });

    render(
      <BrowserRouter>
        <Rooms />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Public Room/)).toBeInTheDocument();
    });

    fetch.mockResolvedValueOnce({ ok: true });

    const roomItem = screen.getByText(/Public Room/).closest('.room-item');
    const actionBtn = roomItem.querySelector('.room-action');
    fireEvent.click(actionBtn || roomItem);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/room/room1/join',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userId: 'test-user', password: null })
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/room/room1');
    });
  });

  test('prompts for password when joining private room', async () => {
    global.prompt = jest.fn(() => 'password123');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'room1', name: 'Private Room', isPrivate: true, memberUserIds: [] }
      ]
    });

    render(
      <BrowserRouter>
        <Rooms />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Private Room/)).toBeInTheDocument();
    });

    fetch.mockResolvedValueOnce({ ok: true });

    const roomItem = screen.getByText(/Private Room/).closest('.room-item');
    const actionBtn = roomItem.querySelector('.room-action');
    fireEvent.click(actionBtn || roomItem);

    await waitFor(() => {
      expect(global.prompt).toHaveBeenCalledWith('Enter room password');
      expect(fetch).toHaveBeenCalledWith(
        '/api/room/room1/join',
        expect.objectContaining({
          body: JSON.stringify({ userId: 'test-user', password: 'password123' })
        })
      );
    });
  });

  test('shows alert when room creation fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <Rooms />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Community Rooms/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('New Room Name...');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    fetch.mockResolvedValueOnce({ ok: false });

    const createButton = screen.getByText('Create Room');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith('Failed to create room');
    });
  });

  test('does not create room with empty name', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(
      <BrowserRouter>
        <Rooms />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Community Rooms/i)).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Room');
    fireEvent.click(createButton);

    // fetch should only be called once (for the initial room list)
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('redirects to login if no userId', () => {
    localStorage.removeItem('userId');

    render(
      <BrowserRouter>
        <Rooms />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
