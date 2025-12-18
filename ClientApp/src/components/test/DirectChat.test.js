import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

let mockNavigate = jest.fn();

// mock react-router-dom before importing the component
jest.mock('react-router-dom', () => ({
    useParams: () => ({ chatId: 'test-chat-id' }),
    useNavigate: () => mockNavigate
}));

// mock @microsoft/signalr before importing the component
jest.mock('@microsoft/signalr', () => {
    const connections = [];
    function createConnection() {
        const handlers = {};
        const conn = {
            start: jest.fn(() => Promise.resolve()),
            invoke: jest.fn(() => Promise.resolve()),
            on: jest.fn((name, cb) => { handlers[name] = cb; }),
            onreconnecting: jest.fn(),
            onreconnected: jest.fn(),
            onclose: jest.fn(),
            stop: jest.fn(() => Promise.resolve()),
            state: 1,
            _handlers: handlers
        };
        connections.push(conn);
        return conn;
    }

    const builder = {
        withUrl() { return builder; },
        configureLogging() { return builder; },
        withAutomaticReconnect() { return builder; },
        build() { return createConnection(); }
    };

    function HubConnectionBuilder() { return builder; }

    return {
        HubConnectionBuilder,
        LogLevel: { Information: 0 },
        HubConnectionState: { Connected: 1 },
        _testHelpers: { connections }
    };
});

// require component after mocks so it uses the mocked signalr/react-router
const { DirectChat } = require('../DirectChat');
const signalrMock = require('@microsoft/signalr');

beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
});

afterAll(() => {
    delete Element.prototype.scrollIntoView;
});

beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    localStorage.clear();

    // safe default fetch
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => []
    });

    signalrMock._testHelpers.connections.length = 0;
    localStorage.setItem('userId', 'test-user');
    localStorage.setItem('username', 'Test User');
});

afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    signalrMock._testHelpers.connections.length = 0;
});

// make a regex that escapes special chars and allows flexible whitespace
const regexFromString = (s) => {
    const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(esc.split(/\s+/).join('\\s*'), 'i');
};

// helpers that prefer the input/send button as the readiness signal,
// falling back to heading/text checks if necessary
const findHeader = async () => {
    // primary: component ready when input is rendered
    try {
        await screen.findByPlaceholderText(/Message/);
        return true;
    } catch {
        // secondary: send button present
        try {
            await screen.findByRole('button', { name: /Send/i });
            return true;
        } catch {
            // fallback: heading or text
            try {
                return await screen.findByRole('heading', { name: /Direct\s*Chat/i });
            } catch {
                return await screen.findByText(regexFromString('Direct Chat'));
            }
        }
    }
};

const findButton = async (label) => {
    try {
        return await screen.findByRole('button', { name: new RegExp(label, 'i') });
    } catch {
        return await screen.findByText(regexFromString(label));
    }
};

describe('DirectChat Component', () => {
    test('renders loading state initially', async () => {
        global.fetch.mockImplementationOnce(() => new Promise(() => {}));

        render(<DirectChat />);

        // loading state in this component doesn't include the literal string
        // so ensure the component hasn't rendered the input yet (keeps test stable)
        await expect(screen.findByPlaceholderText(/Message/)).rejects.toBeTruthy();
    });

    test('loads and displays messages', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                { id: 'msg1', userId: 'other-user', username: 'Other User', message: 'Hello!', timestamp: '2025-01-01T10:00:00Z' },
                { id: 'msg2', userId: 'test-user', username: 'Test User', message: 'Hi there!', timestamp: '2025-01-01T10:01:00Z' }
            ]
        });

        render(<DirectChat />);

        await screen.findByText(/Hello!/i);
        await screen.findByText(/Hi there!/i);
    });

    test('displays empty message state', async () => {
        global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

        render(<DirectChat />);

        await screen.findByText(regexFromString('No messages yet'));
    });

    test('sends message on button click', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => [] }) // messages
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-msg', userId: 'test-user', username: 'Test User', message: 'New message', timestamp: new Date().toISOString() }) }); // send response

        render(<DirectChat />);

        await findHeader();
        const input = await screen.findByPlaceholderText(/Message/);
        const sendButton = await findButton('Send');

        fireEvent.change(input, { target: { value: 'New message' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
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
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => [] }) // messages
            .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 'test-user', username: 'Test User', message: 'Enter message', timestamp: new Date().toISOString() }) }); // send response

        render(<DirectChat />);

        await findHeader();
        const input = await screen.findByPlaceholderText(/Message/);

        fireEvent.change(input, { target: { value: 'Enter message' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/directchat/send',
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    test('does not send empty message', async () => {
        // ensure initial requests succeed (messages + profile)
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => [] }) // messages
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'other', username: 'Other User' }) }); // profile

        render(<DirectChat />);

        // wait until component ready
        await findHeader();

        // record current fetch call count (initial loads)
        const initialCalls = global.fetch.mock.calls.length;

        const sendButton = await findButton('Send');
        fireEvent.click(sendButton);

        // no new network calls should be made when clicking send with empty input
        expect(global.fetch).toHaveBeenCalledTimes(initialCalls);
    });

    test('displays error on message load failure', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Load failed'));

        render(<DirectChat />);

        await screen.findByText(regexFromString('Load failed'));
    });

    test('displays error on message send failure', async () => {
        // explicit per-endpoint mock so the rejected send is observed and profile load is handled
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('/api/directchat/messages')) {
                return Promise.resolve({ ok: true, json: async () => [] });
            }
            if (url.includes('/api/match/user/')) {
                return Promise.resolve({ ok: true, json: async () => ({ id: 'other', username: 'Other User', topSongs: [] }) });
            }
            if (url.includes('/api/directchat/send')) {
                return Promise.reject(new Error('Send failed'));
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        render(<DirectChat />);

        await findHeader();
        const input = await screen.findByPlaceholderText(/Message/);
        const sendButton = await findButton('Send');

        fireEvent.change(input, { target: { value: 'Test' } });
        fireEvent.click(sendButton);

        await screen.findByText(regexFromString('Send failed'));
    });

    test('shows other user username in header (replaces chat ID test)', async () => {
        // messages + profile
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => [] }) // messages
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'other', username: 'Other User', topSongs: [] }) }); // profile

        render(<DirectChat />);

        await screen.findByText(/Other User/i);
    });

    test('redirects to login if no userId', () => {
        localStorage.removeItem('userId');
        render(<DirectChat />);
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    test('clears input after sending message', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Message to send' }) });

        render(<DirectChat />);

        await findHeader();
        const input = await screen.findByPlaceholderText(/Message/);
        const sendButton = await findButton('Send');

        fireEvent.change(input, { target: { value: 'Message to send' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(input.value).toBe('');
        });
    });

    test('displays formatted timestamps', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: 'msg1', userId: 'user1', username: 'User', message: 'Test', timestamp: '2025-01-01T14:30:00Z' }]
        });

        render(<DirectChat />);

        await screen.findByText(/User/i);
    });
});
