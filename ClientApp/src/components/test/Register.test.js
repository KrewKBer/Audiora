import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { Register } from '../Register';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

global.fetch = jest.fn();

describe('Register Component', () => {
    beforeEach(() => {
        localStorage.clear();
        mockNavigate.mockClear();
        fetch.mockClear();
        window.dispatchEvent = jest.fn();
    });

    test('renders register form with gender and preference', () => {
        const { container } = render(<BrowserRouter><Register /></BrowserRouter>);

        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByText('Gender')).toBeInTheDocument();
        expect(screen.getByText('Interested In')).toBeInTheDocument();
        expect(container.querySelectorAll('.custom-select')).toHaveLength(2);
    });

    test('successful registration stores user data and navigates home', async () => {
        const mockResponse = {
            userId: '789',
            username: 'newuser',
            role: 'User'
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const { container } = render(<BrowserRouter><Register /></BrowserRouter>);

        fireEvent.change(screen.getByLabelText(/username/i), {
            target: { value: 'newuser' },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'newpass123' },
        });

        const submitButton = container.querySelector('button[type="submit"]');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'newuser',
                    password: 'newpass123',
                    genres: [],
                    gender: 'PreferNotToSay',
                    preference: 'Everyone'
                }),
            });
        });

        await waitFor(() => {
            expect(localStorage.getItem('userId')).toBe('789');
            expect(localStorage.getItem('username')).toBe('newuser');
            expect(localStorage.getItem('role')).toBe('User');
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    test('failed registration displays error message', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            text: async () => 'Username already exists',
        });

        const { container } = render(<BrowserRouter><Register /></BrowserRouter>);

        fireEvent.change(screen.getByLabelText(/username/i), {
            target: { value: 'existinguser' },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'pass' },
        });

        const submitButton = container.querySelector('button[type="submit"]');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('can change gender and preference before registration', async () => {
        const mockResponse = {
            userId: '999',
            username: 'testuser',
            role: 'User'
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const { container } = render(<BrowserRouter><Register /></BrowserRouter>);

        fireEvent.change(screen.getByLabelText(/username/i), {
            target: { value: 'testuser' },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'pass123' },
        });

        const customSelects = container.querySelectorAll('.custom-select-trigger');
        const genderTrigger = customSelects[0];
        const preferenceTrigger = customSelects[1];

        fireEvent.click(genderTrigger);

        await waitFor(() => {
            expect(container.querySelector('.custom-select-options')).toBeInTheDocument();
        });

        const genderOptions = container.querySelectorAll('.custom-select-option');
        const maleOption = Array.from(genderOptions).find(opt => opt.textContent === 'Male');
        fireEvent.click(maleOption);

        fireEvent.click(preferenceTrigger);

        await waitFor(() => {
            expect(container.querySelector('.custom-select-options')).toBeInTheDocument();
        });

        const preferenceOptions = container.querySelectorAll('.custom-select-option');
        const womenOption = Array.from(preferenceOptions).find(opt => opt.textContent === 'Women');
        fireEvent.click(womenOption);

        const submitButton = container.querySelector('button[type="submit"]');
        fireEvent.click(submitButton);

        await waitFor(() => {
            const callArg = JSON.parse(fetch.mock.calls[0][1].body);
            expect(callArg.gender).toBe('Male');
            expect(callArg.preference).toBe('Women');
        });
    });

    test('dispatches storage event on successful registration', async () => {
        const mockResponse = {
            userId: '123',
            username: 'user',
            role: 'User'
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const { container } = render(<BrowserRouter><Register /></BrowserRouter>);

        fireEvent.change(screen.getByLabelText(/username/i), {
            target: { value: 'user' },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'pass123' },
        });

        const submitButton = container.querySelector('button[type="submit"]');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
        });
    });
});
