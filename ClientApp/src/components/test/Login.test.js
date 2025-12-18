import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { Login } from '../Login';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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
    
    // Check for elements specific to the login form
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('successful login stores user data and navigates to rooms', async () => {
    jest.useFakeTimers();
    const mockResponse = {
      userId: '123',
      username: 'testuser',
      role: 'User'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<BrowserRouter><Login /></BrowserRouter>);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    const buttons = screen.getAllByRole('button', { name: /login/i });
    const submitButton = buttons.find(btn => btn.type === 'submit');
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123', genres: [] }),
      });
    });

    // Wait for splash screen
    await waitFor(() => {
        expect(screen.getByText('Audiora')).toBeInTheDocument();
    });

    // Advance timer for splash screen
    act(() => {
        jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(localStorage.getItem('userId')).toBe('123');
      expect(localStorage.getItem('username')).toBe('testuser');
      expect(localStorage.getItem('role')).toBe('User');
      expect(mockNavigate).toHaveBeenCalledWith('/rooms');
    });

    jest.useRealTimers();
  });

  test('failed login displays error message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Invalid credentials',
    });

    render(<BrowserRouter><Login /></BrowserRouter>);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'wronguser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpass' },
    });

    const buttons = screen.getAllByRole('button', { name: /login/i });
    const submitButton = buttons.find(btn => btn.type === 'submit');
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    expect(localStorage.getItem('userId')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('dispatches storage event after successful login', async () => {
    const mockResponse = {
      userId: '456',
      username: 'anotheruser',
      role: 'Admin'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<BrowserRouter><Login /></BrowserRouter>);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'anotheruser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'pass' },
    });

    const buttons = screen.getAllByRole('button', { name: /login/i });
    const submitButton = buttons.find(btn => btn.type === 'submit');
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(window.dispatchEvent).toHaveBeenCalled();
    });
  });
});
