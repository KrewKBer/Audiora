import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('successful login stores user data and navigates to rooms', async () => {
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

    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123', genres: [] }),
      });
    });

    await waitFor(() => {
      expect(localStorage.getItem('userId')).toBe('123');
      expect(localStorage.getItem('username')).toBe('testuser');
      expect(localStorage.getItem('role')).toBe('User');
      expect(mockNavigate).toHaveBeenCalledWith('/rooms');
    });
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

    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

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

    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(window.dispatchEvent).toHaveBeenCalled();
    });
  });
});
