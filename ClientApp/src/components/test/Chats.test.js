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

    test('renders title and subtitle', async () => {
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
            expect(screen.getByText('Chats')).toBeInTheDocument();
            expect(screen.getByText('Your matched conversations')).toBeInTheDocument();
        });
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

    test('loads and displays chat list with all fields', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    chatId: 'chat1',
                    withUsername: 'Alice',
                    withLevel: 5,
                    createdAt: '2025-01-15T10:00:00Z'
                },
                {
                    chatId: 'chat2',
                    withUsername: 'Bob',
                    withLevel: 3,
                    createdAt: '2025-01-16T15:30:00Z'
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
            expect(screen.getByText('Lvl 5')).toBeInTheDocument();
            expect(screen.getByText('Lvl 3')).toBeInTheDocument();
            expect(screen.getByText(/Matched on Jan 15/)).toBeInTheDocument();
            expect(screen.getByText(/Matched on Jan 16/)).toBeInTheDocument();
        });
    });

    test('displays chat avatar with correct initial', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    chatId: 'chat1',
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
            const avatar = screen.getByText('A');
            expect(avatar).toBeInTheDocument();
            expect(avatar.className).toBe('chat-avatar');
        });
    });

    test('displays fallback initial U when username is missing', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    chatId: 'chat1',
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
            expect(screen.getByText('U')).toBeInTheDocument();
        });
    });

    test('displays default level 1 when withLevel is missing', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    chatId: 'chat1',
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
            expect(screen.getByText('Lvl 1')).toBeInTheDocument();
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
            expect(screen.getByText('No chats yet. Go to Matchmaking and like someone!')).toBeInTheDocument();
        });
    });

    test('navigates to chat when chat item is clicked', async () => {
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
        fireEvent.click(chatItem);

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
            expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
        });
    });

    test('displays error from response text', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            text: async () => 'Server error'
        });

        render(
            <BrowserRouter>
                <Chats />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Error: Server error/)).toBeInTheDocument();
        });
    });

    test('displays fallback error message when response text is empty', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            text: async () => ''
        });

        render(
            <BrowserRouter>
                <Chats />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Error: Failed to load chats/)).toBeInTheDocument();
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
            expect(screen.getByText('No chats yet. Go to Matchmaking and like someone!')).toBeInTheDocument();
        });
    });

    test('redirects to login if no userId', async () => {
        localStorage.removeItem('userId');

        render(
            <BrowserRouter>
                <Chats />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
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

    test('handles missing createdAt gracefully', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    chatId: 'chat1',
                    withUsername: 'Alice'
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
            const chatItem = screen.getByText('Alice').closest('.chat-item');
            const dateElement = chatItem.querySelector('.chat-date');
            expect(dateElement).toHaveTextContent(/^Matched on\s*$/);
        });
    });
    

    test('renders SVG arrow icon for each chat', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    chatId: 'chat1',
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
            const svg = document.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });
    });

    test('makes correct API call with userId', async () => {
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
            expect(fetch).toHaveBeenCalledWith('/api/match/list?userId=test-user');
        });
    });
});
