import React from 'react';
import { render, cleanup, fireEvent, waitFor, screen } from '@testing-library/react';

let mockNavigate = jest.fn();

// mock react-router-dom before importing the component
jest.mock('react-router-dom', () => ({
    useParams: () => ({ id: 'room1' }),
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

// import after mocks so the component uses the mocked signalr
import { Room } from '../Room';
const signalrMock = require('@microsoft/signalr');

beforeEach(() => {
    cleanup();
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    localStorage.clear();
    global.fetch = undefined;
    // clear any previously created mocked connections between tests
    signalrMock._testHelpers.connections.length = 0;
});

beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    document.body.className = '';
    localStorage.clear();
    signalrMock._testHelpers.connections.length = 0;
});

afterAll(() => {
    delete Element.prototype.scrollIntoView;
});

test('redirects to /login when no userId in localStorage', async () => {
    localStorage.removeItem('userId');
    render(<Room />);
    await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
});

test('loads room and messages and renders them', async () => {
    localStorage.setItem('userId', 'u1');
    localStorage.setItem('username', 'Alice');

    global.fetch = jest.fn().mockImplementation((url) => {
        // check messages first to avoid matching the generic room path
        if (url.includes('/messages')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    { userId: 'u2', username: 'Bob', message: 'Hello world', timestamp: new Date().toISOString() }
                ])
            });
        }
        if (url.includes('/api/room/')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ id: 'room1', name: 'Test Room', isPrivate: false })
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<Room />);

    await waitFor(() => expect(screen.getByText('Test Room')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Hello world')).toBeTruthy());
});

test('sendMessage performs optimistic update and invokes hub SendMessage', async () => {
    localStorage.setItem('userId', 'u1');
    localStorage.setItem('username', 'Alice');

    global.fetch = jest.fn().mockImplementation((url) => {
        // check messages first
        if (url.includes('/messages')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/api/room/')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'room1', name: 'Test Room', isPrivate: false }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<Room />);

    // wait for the mock builder to have created a connection
    await waitFor(() => expect(signalrMock._testHelpers.connections.length).toBeGreaterThan(0));
    const fakeConnection = signalrMock._testHelpers.connections[signalrMock._testHelpers.connections.length - 1];

    // wait for connection.start to be called by effect
    await waitFor(() => expect(fakeConnection.start).toHaveBeenCalled());

    // JoinRoom should be invoked after start
    await waitFor(() => {
        expect(fakeConnection.invoke).toHaveBeenCalledWith('JoinRoom', 'room1', 'u1', 'Alice');
    });

    const input = document.querySelector('.room-input');
    const sendBtn = document.querySelector('.room-send-btn');

    expect(input).toBeTruthy();
    expect(sendBtn).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Hi everyone' } });
    fireEvent.click(sendBtn);

    await waitFor(() => expect(screen.getByText('Hi everyone')).toBeTruthy());

    await waitFor(() => {
        expect(fakeConnection.invoke).toHaveBeenCalledWith('SendMessage', 'room1', 'u1', 'Alice', 'Hi everyone');
    });
});

test('incoming ReceiveMessage from hub is added to message list', async () => {
    localStorage.setItem('userId', 'u1');
    localStorage.setItem('username', 'Alice');

    global.fetch = jest.fn().mockImplementation((url) => {
        // check messages first
        if (url.includes('/messages')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/api/room/')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'room1', name: 'Test Room', isPrivate: false }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<Room />);

    // wait for the mock builder to have created a connection
    await waitFor(() => expect(signalrMock._testHelpers.connections.length).toBeGreaterThan(0));
    const fakeConnection = signalrMock._testHelpers.connections[signalrMock._testHelpers.connections.length - 1];

    // ensure start was called
    await waitFor(() => expect(fakeConnection.start).toHaveBeenCalled());

    // simulate incoming hub message using the stored handlers
    const ts = new Date().toISOString();
    const handlers = fakeConnection._handlers;
    if (handlers && handlers['ReceiveMessage']) {
        handlers['ReceiveMessage']('u3', 'Carol', 'New message from hub', ts);
    } else {
        throw new Error('ReceiveMessage handler not registered on fake connection');
    }

    await waitFor(() => expect(screen.getByText('New message from hub')).toBeTruthy());
});
