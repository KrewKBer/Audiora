import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AuthForm } from './AuthForm';
import { BrowserRouter } from 'react-router-dom';

const renderWithRouter = (ui) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('AuthForm Component', () => {
  test('renders login form correctly', () => {
    renderWithRouter(<AuthForm formType="Login" onSubmit={() => {}} />);
    
    // Check tabs
    const tabs = screen.getAllByRole('button');
    const loginTab = tabs.find(t => t.textContent === 'Login' && t.classList.contains('auth-tab'));
    expect(loginTab).toHaveClass('active');

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    
    // Check submit button - use a more specific query or check class
    // Since we have multiple buttons with "Login", we need to be careful.
    // The submit button has class 'btn-primary'
    const buttons = screen.getAllByText('Login');
    const submitBtn = buttons.find(b => b.classList.contains('btn-primary'));
    expect(submitBtn).toBeInTheDocument();

    // Genres should NOT be present in Login mode
    expect(screen.queryByText(/select your favorite genres/i)).not.toBeInTheDocument();
  });

  test('renders register form correctly with genres', () => {
    renderWithRouter(<AuthForm formType="Register" onSubmit={() => {}} />);
    
    // Check tabs
    const tabs = screen.getAllByRole('button');
    const registerTab = tabs.find(t => t.textContent === 'Register' && t.classList.contains('auth-tab'));
    expect(registerTab).toHaveClass('active');

    expect(screen.getByText(/select your favorite genres/i)).toBeInTheDocument();
    
    expect(screen.getByLabelText(/^pop$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rock/i)).toBeInTheDocument();
  });

  test('allows typing in inputs', async () => {
    renderWithRouter(<AuthForm formType="Login" onSubmit={() => {}} />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(passwordInput, 'password123');

    expect(usernameInput).toHaveValue('testuser');
    expect(passwordInput).toHaveValue('password123');
  });

  test('calls onSubmit with form data when submitted', async () => {
    const mockSubmit = jest.fn();
    renderWithRouter(<AuthForm formType="Login" onSubmit={mockSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/username/i), 'testuser');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    
    const buttons = screen.getAllByText('Login');
    const submitBtn = buttons.find(b => b.classList.contains('btn-primary'));
    
    fireEvent.submit(submitBtn.closest('form'));

    expect(mockSubmit).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123',
      genres: []
    });
  });
});
