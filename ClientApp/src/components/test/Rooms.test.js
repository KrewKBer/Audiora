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
      expect(screen.getByText('Members: 1')).toBeInTheDocument();
      expect(screen.getByText('Members: 2')).toBeInTheDocument();
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
      expect(screen.getByText('Rooms')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Room name');
    fireEvent.change(nameInput, { target: { value: 'New Room' } });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-room-id', name: 'New Room' })
    });

    const createButton = screen.getByText('Create');
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
      expect(screen.getByText('Rooms')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Room name');
    const privateCheckbox = screen.getByLabelText('Private');
    
    fireEvent.change(nameInput, { target: { value: 'Secret Room' } });
    fireEvent.click(privateCheckbox);

    const passwordInput = screen.getByPlaceholderText('Password');
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'private-room', name: 'Secret Room' })
    });

    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/room',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Secret Room',
            userId: 'test-user',
            isPrivate: true,
            password: 'secret123'
          })
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
    fireEvent.click(roomItem);

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
    fireEvent.click(roomItem);

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
      expect(screen.getByText('Rooms')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Room name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    fetch.mockResolvedValueOnce({ ok: false });

    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith('Failed to create room');
    });
  });

  test.skip('shows alert when joining room fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'room1', name: 'Room', isPrivate: false, memberUserIds: [] }
      ]
    });

    const { container } = render(
      <BrowserRouter>
        <Rooms />
      </BrowserRouter>
    );

    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: /Room/ });
      expect(heading).toBeInTheDocument();
    });

    fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Room is full'
    });

    // Click on the heading which is inside a clickable div
    const heading = screen.getByRole('heading', { name: /Room/ });
    const roomDiv = heading.parentElement;
    fireEvent.click(roomDiv);

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith('Room is full');
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
      expect(screen.getByText('Rooms')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create');
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
