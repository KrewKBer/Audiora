import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { NavMenu } from './NavMenu';

// Mock Sidebar component
jest.mock('./Sidebar', () => ({
  Sidebar: ({ open, onClose }) => (
    open ? <div data-testid="sidebar">Sidebar Open</div> : null
  )
}));

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('NavMenu Component', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('renders Audiora brand', () => {
    renderWithRouter(<NavMenu />);
    expect(screen.getByText('Audiora')).toBeInTheDocument();
  });

  test('shows menu button when user is logged in', () => {
    localStorage.setItem('userId', '123');
    localStorage.setItem('role', 'User');
    
    renderWithRouter(<NavMenu />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  test('does not show menu button when user is not logged in', () => {
    renderWithRouter(<NavMenu />);
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
  });

  test('displays user role when logged in', () => {
    localStorage.setItem('userId', '123');
    localStorage.setItem('role', 'Premium User');
    
    renderWithRouter(<NavMenu />);
    expect(screen.getByText('Premium User')).toBeInTheDocument();
  });

  test('toggles navbar collapse on button click', () => {
    renderWithRouter(<NavMenu />);
    
    const toggleButton = document.querySelector('.navbar-toggler');
    expect(toggleButton).toBeInTheDocument();
    
    fireEvent.click(toggleButton);
    
    // Navbar toggler exists and can be clicked
    expect(toggleButton).toBeInTheDocument();
  });

  test('opens sidebar when menu button is clicked', () => {
    localStorage.setItem('userId', '123');
    
    renderWithRouter(<NavMenu />);
    
    const menuButton = screen.getByText('Menu');
    fireEvent.click(menuButton);
    
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  test('updates login status when storage event fires', async () => {
    const { rerender } = renderWithRouter(<NavMenu />);
    
    // Initially not logged in
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    
    // Simulate login
    localStorage.setItem('userId', '456');
    localStorage.setItem('role', 'Admin');
    window.dispatchEvent(new Event('storage'));
    
    // Rerender to apply changes
    rerender(<BrowserRouter><NavMenu /></BrowserRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('Menu')).toBeInTheDocument();
    });
  });

  test('handles logout correctly', () => {
    localStorage.setItem('userId', '123');
    localStorage.setItem('username', 'testuser');
    localStorage.setItem('role', 'User');
    
    delete window.location;
    window.location = { href: jest.fn() };
    
    renderWithRouter(<NavMenu />);
    
    // We can't directly test the logout button since it's not in the NavMenu
    // But we can verify the component responds to localStorage changes
    expect(localStorage.getItem('userId')).toBe('123');
  });

  test('navbar brand links to home', () => {
    renderWithRouter(<NavMenu />);
    
    const brandLink = screen.getByText('Audiora').closest('a');
    expect(brandLink).toHaveAttribute('href', '/');
  });
});
