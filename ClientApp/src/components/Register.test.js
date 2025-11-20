import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { Register } from './Register';

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

  test('renders register form with genres', () => {
    render(<BrowserRouter><Register /></BrowserRouter>);
    
    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByText(/select your favorite genres/i)).toBeInTheDocument();
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

    render(<BrowserRouter><Register /></BrowserRouter>);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'newuser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'newpass123' },
    });

    fireEvent.submit(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'newuser', password: 'newpass123', genres: [] }),
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

    render(<BrowserRouter><Register /></BrowserRouter>);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'existinguser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'pass' },
    });

    fireEvent.submit(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('can select genres before registration', async () => {
    const mockResponse = {
      userId: '999',
      username: 'musiclover',
      role: 'User'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<BrowserRouter><Register /></BrowserRouter>);

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'musiclover' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'pass123' },
    });

    // Select Pop and Rock genres
    const popCheckbox = screen.getByLabelText(/^pop$/i);
    const rockCheckbox = screen.getByLabelText(/rock/i);
    
    fireEvent.click(popCheckbox);
    fireEvent.click(rockCheckbox);

    fireEvent.submit(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      const callArg = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callArg.genres).toContain('Pop');
      expect(callArg.genres).toContain('Rock');
    });
  });
});
