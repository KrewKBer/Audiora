// javascript
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

// Mock WelcomeSplash to immediately invoke onComplete so tests don't need timers
jest.mock('../WelcomeSplash', () => ({
    WelcomeSplash: ({ onComplete }) => {
        if (typeof onComplete === 'function') onComplete();
        return null;
    }
}));

import { Login } from '../Login';

global.fetch = jest.fn();

describe('Login Component', () => {
    beforeEach(() => {
        localStorage.clear();
        mockNavigate.mockClear();
        fetch.mockClear();
        window.dispatchEvent = jest.fn();
    });

    test('renders login form', () => {
        render(<BrowserRouter><Login /></BrowserRouter>);
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    test('successful login stores user data and navigates to rooms', async () => {
        const mockResponse = { userId: '123', username: 'testuser', role: 'User' };
        fetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

        const { container } = render(<BrowserRouter><Login /></BrowserRouter>);

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

        const submitButton = container.querySelector('button[type="submit"]');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }));
        });

        await waitFor(() => {
            expect(localStorage.getItem('userId')).toBe('123');
            expect(localStorage.getItem('username')).toBe('testuser');
            expect(localStorage.getItem('role')).toBe('User');
            expect(mockNavigate).toHaveBeenCalledWith('/rooms');
        });
    });

    test('failed login displays error message in the form', async () => {
        fetch.mockResolvedValueOnce({ ok: false, text: async () => 'Invalid credentials' });

        const { container } = render(<BrowserRouter><Login /></BrowserRouter>);

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wronguser' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });

        const submitButton = container.querySelector('button[type="submit"]');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(fetch).toHaveBeenCalled();
        });

        // AuthForm catches thrown error and renders it
        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(localStorage.getItem('userId')).toBeNull();
    });

    test('clicking Register tab navigates to /register', () => {
        render(<BrowserRouter><Login /></BrowserRouter>);
        const registerTab = screen.getByRole('button', { name: /register/i });
        fireEvent.click(registerTab);
        expect(mockNavigate).toHaveBeenCalledWith('/register');
    });

    test('server requests 2FA and shows the 2FA form', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: '2fa_required', userId: 'temp-2' }),
        });

        const { container } = render(<BrowserRouter><Login /></BrowserRouter>);

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user2fa' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });

        const submitButton = container.querySelector('button[type="submit"]');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/000000/i)).toBeInTheDocument();
        });
    });

    test('successful 2FA verification stores user data and navigates', async () => {
        // First call: login returns 2fa_required
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: '2fa_required', userId: 'temp-3' }),
        });
        // Second call: verify returns user data
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ userId: '222', username: 'twofactuser', role: 'User' }),
        });

        const { container } = render(<BrowserRouter><Login /></BrowserRouter>);

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'twofact' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });

        const submitButton = container.querySelector('button[type="submit"]');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
        });

        // Enter 2FA code and submit verify form
        const codeInput = screen.getByPlaceholderText(/000000/i) || screen.getByLabelText(/code/i);
        fireEvent.change(codeInput, { target: { value: '123456' } });
        const verifyButton = screen.getByRole('button', { name: /verify/i });
        fireEvent.click(verifyButton);

        await waitFor(() => {
            expect(localStorage.getItem('userId')).toBe('222');
            expect(localStorage.getItem('username')).toBe('twofactuser');
            expect(localStorage.getItem('role')).toBe('User');
            expect(mockNavigate).toHaveBeenCalledWith('/rooms');
        });
    });

    test('dispatches storage event after successful login', async () => {
        const mockResponse = { userId: '456', username: 'anotheruser', role: 'Admin' };
        fetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

        const { container } = render(<BrowserRouter><Login /></BrowserRouter>);

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'anotheruser' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });

        const submitButton = container.querySelector('button[type="submit"]');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(window.dispatchEvent).toHaveBeenCalled();
        });
    });
});
