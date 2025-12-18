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
global.prompt = jest.fn();

describe('Rooms Component', () => {
    beforeEach(() => {
        localStorage.clear();
        fetch.mockClear();
        mockNavigate.mockClear();
        alert.mockClear();
        prompt.mockClear();
        localStorage.setItem('userId', 'test-user');
    });

    test('renders title and subtitle', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        render(
            <BrowserRouter>
                <Rooms />
            </BrowserRouter>
        );

        expect(screen.getByText('Community Rooms')).toBeInTheDocument();
        expect(screen.getByText('Join a discussion or start your own topic')).toBeInTheDocument();
    });

    test('loads and displays room list with all fields', async () => {
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
            expect(screen.getByText('Room One')).toBeInTheDocument();
            expect(screen.getByText('Room Two')).toBeInTheDocument();
        });

        // Check for Public and Private badges specifically in room items
        const roomOne = screen.getByText('Room One').closest('.room-item');
        const roomTwo = screen.getByText('Room Two').closest('.room-item');

        expect(roomOne.querySelector('.room-badge.public')).toHaveTextContent('Public');
        expect(roomTwo.querySelector('.room-badge.private')).toHaveTextContent('Private');

        expect(screen.getByText('1 Members')).toBeInTheDocument();
        expect(screen.getByText('2 Members')).toBeInTheDocument();
        expect(screen.getAllByText('Active now')).toHaveLength(2);
    });
    
    

    test('displays room avatar with correct initial', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                { id: 'room1', name: 'Test Room', isPrivate: false, memberUserIds: [] }
            ]
        });

        render(
            <BrowserRouter>
                <Rooms />
            </BrowserRouter>
        );

        await waitFor(() => {
            const avatar = screen.getByText('T');
            expect(avatar).toBeInTheDocument();
            expect(avatar.className).toBe('room-avatar');
        });
    });

    test('displays fallback initial R when name is missing', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                { id: 'room1', isPrivate: false, memberUserIds: [] }
            ]
        });

        render(
            <BrowserRouter>
                <Rooms />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('R')).toBeInTheDocument();
        });
    });

    test('displays 0 members when memberUserIds is missing', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                { id: 'room1', name: 'Empty Room', isPrivate: false }
            ]
        });

        render(
            <BrowserRouter>
                <Rooms />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('0 Members')).toBeInTheDocument();
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
            expect(screen.getByText('Community Rooms')).toBeInTheDocument();
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
                    headers: { 'Content-Type': 'application/json' },
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
            expect(screen.getByText('Community Rooms')).toBeInTheDocument();
        });

        const nameInput = screen.getByPlaceholderText('New Room Name...');
        const privateCheckbox = screen.getByLabelText('Private');

        fireEvent.change(nameInput, { target: { value: 'Secret Room' } });
        fireEvent.click(privateCheckbox);

        const passwordInput = screen.getByPlaceholderText('Password');
        fireEvent.change(passwordInput, { target: { value: 'secret123' } });

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
                    body: JSON.stringify({
                        name: 'Secret Room',
                        userId: 'test-user',
                        isPrivate: true,
                        password: 'secret123'
                    })
                })
            );
            expect(mockNavigate).toHaveBeenCalledWith('/room/private-room');
        });
    });

    test('shows password input only when private is checked', async () => {
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
            expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();
        });

        const privateCheckbox = screen.getByLabelText('Private');
        fireEvent.click(privateCheckbox);

        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
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
            expect(screen.getByText('Public Room')).toBeInTheDocument();
        });

        fetch.mockResolvedValueOnce({ ok: true });

        const roomItem = screen.getByText('Public Room').closest('.room-item');
        fireEvent.click(roomItem);

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                '/api/room/room1/join',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: 'test-user', password: null })
                })
            );
            expect(mockNavigate).toHaveBeenCalledWith('/room/room1');
        });
    });

    test('prompts for password when joining private room', async () => {
        prompt.mockReturnValue('password123');

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
            expect(screen.getByText('Private Room')).toBeInTheDocument();
        });

        fetch.mockResolvedValueOnce({ ok: true });

        const roomItem = screen.getByText('Private Room').closest('.room-item');
        fireEvent.click(roomItem);

        await waitFor(() => {
            expect(prompt).toHaveBeenCalledWith('Enter room password');
            expect(fetch).toHaveBeenCalledWith(
                '/api/room/room1/join',
                expect.objectContaining({
                    body: JSON.stringify({ userId: 'test-user', password: 'password123' })
                })
            );
            expect(mockNavigate).toHaveBeenCalledWith('/room/room1');
        });
    });

    test('does not join private room when password prompt is cancelled', async () => {
        prompt.mockReturnValue(null);

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
            expect(screen.getByText('Private Room')).toBeInTheDocument();
        });

        const roomItem = screen.getByText('Private Room').closest('.room-item');
        fireEvent.click(roomItem);

        await waitFor(() => {
            expect(prompt).toHaveBeenCalled();
        });

        // Should not call join API or navigate
        expect(fetch).toHaveBeenCalledTimes(1); // Only the initial list call
        expect(mockNavigate).not.toHaveBeenCalled();
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
            expect(screen.getByText('Community Rooms')).toBeInTheDocument();
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

    test('shows alert when joining room fails with error text', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                { id: 'room1', name: 'Full Room', isPrivate: false, memberUserIds: [] }
            ]
        });

        render(
            <BrowserRouter>
                <Rooms />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Full Room')).toBeInTheDocument();
        });

        fetch.mockResolvedValueOnce({
            ok: false,
            text: async () => 'Room is full'
        });

        const roomItem = screen.getByText('Full Room').closest('.room-item');
        fireEvent.click(roomItem);

        await waitFor(() => {
            expect(alert).toHaveBeenCalledWith('Room is full');
        });
    });

    test('shows generic error when joining room fails without text', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                { id: 'room1', name: 'Room', isPrivate: false, memberUserIds: [] }
            ]
        });

        render(
            <BrowserRouter>
                <Rooms />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Room')).toBeInTheDocument();
        });

        fetch.mockResolvedValueOnce({
            ok: false,
            text: async () => ''
        });

        const roomItem = screen.getByText('Room').closest('.room-item');
        fireEvent.click(roomItem);

        await waitFor(() => {
            expect(alert).toHaveBeenCalledWith('Failed to join room');
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
            expect(screen.getByText('Community Rooms')).toBeInTheDocument();
        });

        const createButton = screen.getByText('Create Room');
        fireEvent.click(createButton);

        // fetch should only be called once (for the initial room list)
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('does not create room with whitespace-only name', async () => {
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
            expect(screen.getByText('Community Rooms')).toBeInTheDocument();
        });

        const nameInput = screen.getByPlaceholderText('New Room Name...');
        fireEvent.change(nameInput, { target: { value: '   ' } });

        const createButton = screen.getByText('Create Room');
        fireEvent.click(createButton);

        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('redirects to login if no userId on mount', () => {
        localStorage.removeItem('userId');

        render(
            <BrowserRouter>
                <Rooms />
            </BrowserRouter>
        );

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    test('redirects to login if no userId when creating room', async () => {
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
            expect(screen.getByText('Community Rooms')).toBeInTheDocument();
        });

        localStorage.removeItem('userId');

        const nameInput = screen.getByPlaceholderText('New Room Name...');
        fireEvent.change(nameInput, { target: { value: 'Test' } });

        const createButton = screen.getByText('Create Room');
        fireEvent.click(createButton);

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    test('redirects to login if no userId when joining room', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                { id: 'room1', name: 'Test Room', isPrivate: false, memberUserIds: [] }
            ]
        });

        render(
            <BrowserRouter>
                <Rooms />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Room')).toBeInTheDocument();
        });

        localStorage.removeItem('userId');

        const roomItem = screen.getByText('Test Room').closest('.room-item');
        fireEvent.click(roomItem);

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    test('renders SVG arrow icon for each room', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                { id: 'room1', name: 'Test Room', isPrivate: false, memberUserIds: [] }
            ]
        });

        render(
            <BrowserRouter>
                <Rooms />
            </BrowserRouter>
        );

        await waitFor(() => {
            const svg = document.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });
    });

    test('renders room list with correct API call', async () => {
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
            expect(fetch).toHaveBeenCalledWith('/api/room/list');
        });
    });
});
