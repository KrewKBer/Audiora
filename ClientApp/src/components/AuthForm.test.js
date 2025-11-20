import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AuthForm } from './AuthForm';

describe('AuthForm Component', () => {
  test('renders login form correctly', () => {
    render(<AuthForm formType="Login" onSubmit={() => {}} />);
    
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    // Genres should NOT be present in Login mode
    expect(screen.queryByText(/select your favorite genres/i)).not.toBeInTheDocument();
  });

  test('renders register form correctly with genres', () => {
    render(<AuthForm formType="Register" onSubmit={() => {}} />);
    
    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByText(/select your favorite genres/i)).toBeInTheDocument();
    // Check for a few genres - use exact match for Pop to avoid matching K-Pop
    expect(screen.getByLabelText(/^pop$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rock/i)).toBeInTheDocument();
  });

  test('allows typing in inputs', async () => {
    render(<AuthForm formType="Login" onSubmit={() => {}} />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(passwordInput, 'password123');

    expect(usernameInput).toHaveValue('testuser');
    expect(passwordInput).toHaveValue('password123');
  });

  test('calls onSubmit with form data when submitted', async () => {
    const mockSubmit = jest.fn();
    render(<AuthForm formType="Login" onSubmit={mockSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/username/i), 'testuser');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123',
      genres: []
    });
  });

  test('displays error message when submission fails', async () => {
    const mockSubmit = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
    render(<AuthForm formType="Login" onSubmit={mockSubmit} />);
    
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

    // Wait for the error to appear
    const errorMessage = await screen.findByText(/invalid credentials/i);
    expect(errorMessage).toBeInTheDocument();
  });
});
