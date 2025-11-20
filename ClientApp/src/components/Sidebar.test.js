import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { Sidebar } from './Sidebar';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Sidebar Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnClose.mockClear();
    localStorage.clear();
  });

  test('renders sidebar when open is true', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    expect(screen.getByText('Audiora')).toBeInTheDocument();
    expect(screen.getByText('your social jukebox')).toBeInTheDocument();
  });

  test('does not render sidebar content when open is false', () => {
    render(
      <BrowserRouter>
        <Sidebar open={false} onClose={mockOnClose} />
      </BrowserRouter>
    );

    // Sidebar overlay should not have 'open' class
    const overlay = document.querySelector('.sidebar-overlay');
    expect(overlay).not.toHaveClass('open');
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('navigates to home when Listen Now button is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const listenNowBtn = screen.getByText('Listen Now');
    fireEvent.click(listenNowBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('navigates to search when Browse button is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const browseBtn = screen.getByText('Browse');
    fireEvent.click(browseBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/search');
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('navigates to rooms when Forums button is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const forumsBtn = screen.getByText('Forums');
    fireEvent.click(forumsBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/rooms');
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('navigates to profile when Made for You button is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const madeForYouBtn = screen.getByText('Made for You');
    fireEvent.click(madeForYouBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('navigates to matchmaking when Matchmaking button is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const matchmakingBtn = screen.getByText('Matchmaking');
    fireEvent.click(matchmakingBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/matchmaking');
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('navigates to chats when Chats button is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const chatsBtn = screen.getByText('Chats');
    fireEvent.click(chatsBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/chats');
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('navigates to liked songs when Liked Songs button is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const likedSongsBtn = screen.getByText('Liked Songs');
    fireEvent.click(likedSongsBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/liked-songs');
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('navigates to profile when Profile footer button is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const profileButtons = screen.getAllByText('Profile');
    // Footer button is the second one
    fireEvent.click(profileButtons[profileButtons.length - 1]);

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  test('clears localStorage and redirects on logout', () => {
    localStorage.setItem('userId', '123');
    localStorage.setItem('username', 'testuser');
    
    delete window.location;
    window.location = { href: '' };

    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    const logoutBtn = screen.getByText('Logout');
    fireEvent.click(logoutBtn);

    expect(localStorage.getItem('userId')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  test('renders all discover section buttons', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('Listen Now')).toBeInTheDocument();
    expect(screen.getByText('Browse')).toBeInTheDocument();
    expect(screen.getByText('Forums')).toBeInTheDocument();
  });

  test('renders all library section buttons', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} onClose={mockOnClose} />
      </BrowserRouter>
    );

    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Songs')).toBeInTheDocument();
    expect(screen.getByText('Made for You')).toBeInTheDocument();
    expect(screen.getByText('Matchmaking')).toBeInTheDocument();
    expect(screen.getByText('Chats')).toBeInTheDocument();
    expect(screen.getByText('Liked Songs')).toBeInTheDocument();
  });
});
