// javascript
// File: `ClientApp/src/components/test/Home.test.js`
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the SongQueueContext early so Home's useSongQueue is always defined in tests
jest.mock('../SongQueueContext', () => {
    const React = require('react');
    const useSongQueue = jest.fn(() => ({
        songQueue: [],
        addSongsToQueue: jest.fn(),
        getNextSong: jest.fn(),
        clearQueue: jest.fn(),
    }));
    const SongQueueProvider = ({ children }) => <>{children}</>;
    return { useSongQueue, SongQueueProvider };
});

import { Home } from '../Home';
import { SongQueueProvider } from '../SongQueueContext';

// Mock dependencies - support onSwipe, onCardLeftScreen and ensure ref.current.swipe is present
jest.mock('react-tinder-card', () => {
    const React = require('react');
    return React.forwardRef(({ children, onSwipe, onCardLeftScreen }, ref) => {
        // Provide a swipe implementation on ref so swipeWithAnimation can call it
        if (ref) {
            ref.current = {
                swipe: (dir) => {
                    // simulate swipe: call onSwipe then onCardLeftScreen
                    if (onSwipe) onSwipe(dir);
                    if (onCardLeftScreen) onCardLeftScreen();
                }
            };
        }
        return (
            <div data-testid="tinder-card">
                {children}
                <button onClick={() => onSwipe && onSwipe('left')}>Swipe Left</button>
                <button onClick={() => onSwipe && onSwipe('right')}>Swipe Right</button>
                <button onClick={() => onCardLeftScreen && onCardLeftScreen()}>Card Left</button>
            </div>
        );
    });
});

jest.mock('../YouTubePlayer', () => ({
    YouTubePlayer: () => <div data-testid="youtube-player">YouTube Player</div>
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value?.toString(); store[key] = value?.toString(); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value?.toString(); store[key] = value?.toString(); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; })
    };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock window.confirm/alert and dispatchEvent
window.confirm = jest.fn();
window.alert = jest.fn();
window.dispatchEvent = jest.fn();

describe('Home Component Integration', () => {
    const mockSong = {
        id: '123',
        name: 'Test Song',
        artists: [{ name: 'Test Artist' }],
        album: { images: [{ url: 'http://test.com/image.jpg' }] },
        preview_url: 'http://test.com/preview.mp3'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset storage contents
        localStorage.clear();
        sessionStorage.clear();
        // Return userId only for the 'userId' key and session only for 'audioraSession'
        localStorage.getItem.mockImplementation(key => key === 'userId' ? 'test-user-id' : null);
        sessionStorage.getItem.mockImplementation(key => key === 'audioraSession' ? 'active' : null);

        // Reset the mocked useSongQueue default implementation
        const SongQueueContext = require('../SongQueueContext');
        SongQueueContext.useSongQueue.mockImplementation(() => ({
            songQueue: [],
            addSongsToQueue: jest.fn(),
            getNextSong: jest.fn(),
            clearQueue: jest.fn()
        }));
    });

    test('renders no songs message when queue is empty', () => {
        render(
            <SongQueueProvider>
                <Home />
            </SongQueueProvider>
        );
        expect(screen.getByText(/no songs in queue/i)).toBeInTheDocument();
    });

    test('fetches random songs when button clicked', async () => {
        const mockSongs = [mockSong];
        fetch.mockResolvedValueOnce({
            json: async () => ({ items: mockSongs })
        });

        render(
            <SongQueueProvider>
                <Home />
            </SongQueueProvider>
        );

        const randomButton = screen.getByText(/get 25 random songs/i);
        fireEvent.click(randomButton);

        // Button should enter loading state
        expect(screen.getByText(/loading.../i)).toBeInTheDocument();

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/spotify/recommendations'));
        });
    });

    test('handles swipe interaction (like)', async () => {
        const mockAddSongs = jest.fn();
        const mockGetNext = jest.fn().mockReturnValue(mockSong);
        const mockClear = jest.fn();

        const SongQueueContext = require('../SongQueueContext');
        SongQueueContext.useSongQueue.mockReturnValue({
            songQueue: [mockSong],
            addSongsToQueue: mockAddSongs,
            getNextSong: mockGetNext,
            clearQueue: mockClear
        });

        // Ensure fetch resolves for the POST called in handleInteraction
        fetch.mockResolvedValueOnce({ ok: true });

        render(<Home />);

        // Verify song is displayed — use findAllByText and pick the first occurrence
        const songMatches = await screen.findAllByText('Test Song');
        expect(songMatches[0]).toBeInTheDocument();

        // Use findAllByText for artist to avoid multiple-match error and pick the first
        const artistMatches = await screen.findAllByText('Test Artist');
        expect(artistMatches[0]).toBeInTheDocument();

        // Trigger swipe right (Like)
        const swipeRightBtn = screen.getByText('Swipe Right');
        fireEvent.click(swipeRightBtn);

        // Verify API call with liked:true
        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/api/user-songs/seen', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"liked":true')
            }));
        });

        // xpUpdate dispatched
        expect(window.dispatchEvent).toHaveBeenCalled();
    });

    test('handles swipe interaction (dislike)', async () => {
        const mockAddSongs = jest.fn();
        const mockGetNext = jest.fn().mockReturnValue(mockSong);
        const mockClear = jest.fn();

        const SongQueueContext = require('../SongQueueContext');
        SongQueueContext.useSongQueue.mockReturnValue({
            songQueue: [mockSong],
            addSongsToQueue: mockAddSongs,
            getNextSong: mockGetNext,
            clearQueue: mockClear
        });

        // Ensure fetch resolves for the POST called in handleInteraction
        fetch.mockResolvedValueOnce({ ok: true });

        render(<Home />);

        const swipeLeftBtn = await screen.findByText('Swipe Left');
        fireEvent.click(swipeLeftBtn);

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/api/user-songs/seen', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"liked":false')
            }));
        });
    });

    test('resetData clears seen songs, clears queue and removes currentSong', async () => {
        const mockClear = jest.fn();

        const SongQueueContext = require('../SongQueueContext');
        SongQueueContext.useSongQueue.mockReturnValue({
            songQueue: [],
            addSongsToQueue: jest.fn(),
            getNextSong: jest.fn(),
            clearQueue: mockClear
        });

        // Ensure currentSong present in localStorage so removal is observable
        localStorage.setItem('currentSong', JSON.stringify(mockSong));

        fetch.mockResolvedValueOnce({ ok: true }); // for DELETE

        render(<Home />);

        const resetBtn = await screen.findByTitle('Reset Data');
        fireEvent.click(resetBtn);

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/user-songs/seen'), expect.objectContaining({
                method: 'DELETE'
            }));
            expect(mockClear).toHaveBeenCalled();
            expect(localStorage.getItem('currentSong')).toBeNull();
        });
    });

    test('shows alert when recommendations return no songs', async () => {
        fetch.mockResolvedValueOnce({
            json: async () => ({ items: [] })
        });

        render(
            <SongQueueProvider>
                <Home />
            </SongQueueProvider>
        );

        const randomButton = screen.getByText(/get 25 random songs/i);
        fireEvent.click(randomButton);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('No songs returned'));
        });
    });
});

describe('Home additional coverage', () => {
    const mockSong = {
        id: 'abc',
        name: 'Fallback Song',
        artists: [{ name: 'Some Artist' }],
        album: { images: [{ url: 'http://example.com/art.jpg' }] },
        preview_url: 'http://example.com/preview.mp3'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        // default: valid user present and active session
        localStorage.getItem.mockImplementation(key => key === 'userId' ? 'test-user' : null);
        sessionStorage.getItem.mockImplementation(key => key === 'audioraSession' ? 'active' : null);
        // reset useSongQueue default impl
        const SongQueueContext = require('../SongQueueContext');
        SongQueueContext.useSongQueue.mockImplementation(() => ({
            songQueue: [],
            addSongsToQueue: jest.fn(),
            getNextSong: jest.fn(),
            clearQueue: jest.fn()
        }));
    });

    test('redirects to /login when no userId', () => {
        // remove user
        localStorage.getItem.mockImplementation(() => null);

        // make location writable
        // eslint-disable-next-line no-dynamic-delete
        delete window.location;
        window.location = { href: '' };

        render(<Home />);

        expect(window.location.href).toBe('/login');
    });

    test('componentDidMount handles invalid saved currentSong JSON by removing and loading next', async () => {
        // user present and session active
        localStorage.getItem.mockImplementation(key => {
            if (key === 'userId') return 'u-json';
            if (key === 'currentSong') return 'not-a-json';
            return null;
        });
        sessionStorage.getItem.mockImplementation(() => 'active');

        const SongQueueContext = require('../SongQueueContext');
        const mockGetNext = jest.fn().mockReturnValue(mockSong);
        SongQueueContext.useSongQueue.mockImplementation(() => ({
            songQueue: [],
            addSongsToQueue: jest.fn(),
            getNextSong: mockGetNext,
            clearQueue: jest.fn()
        }));

        render(<Home />);

        // parse error should remove stale currentSong and then load next (setItem called)
        await waitFor(() => {
            expect(localStorage.removeItem).toHaveBeenCalledWith('currentSong');
            expect(localStorage.setItem).toHaveBeenCalledWith('currentSong', JSON.stringify(mockSong));
        });
    });

    test('initSpotifyEmbed uses existing window.IFrameAPI and initializes controller, togglePlay wired', async () => {
        jest.useFakeTimers();
        // prepare a fake IFrameAPI and embed controller
        const fakeEmbedController = {
            addListener: jest.fn((ev, cb) => {
                // simulate playback update to flip isPlaying
                if (ev === 'playback_update') {
                    // call the callback once with paused=false
                    cb({ data: { isPaused: false } });
                }
            }),
            loadUri: jest.fn(),
            play: jest.fn(),
            togglePlay: jest.fn()
        };
        window.IFrameAPI = {
            createController: jest.fn((element, options, callback) => {
                callback(fakeEmbedController);
            })
        };
        // ensure currentSong is present so createSpotifyController triggers auto load/play
        localStorage.getItem.mockImplementation(key => {
            if (key === 'userId') return 'u-spotify';
            if (key === 'currentSong') return JSON.stringify(mockSong);
            return null;
        });
        sessionStorage.getItem.mockImplementation(() => 'active');

        render(<Home />);

        // initSpotifyEmbed runs via setTimeout in componentDidMount
        jest.advanceTimersByTime(200);

        await waitFor(() => {
            expect(window.IFrameAPI.createController).toHaveBeenCalled();
            expect(fakeEmbedController.loadUri).toHaveBeenCalledWith(`spotify:track:${mockSong.id}`);
            expect(fakeEmbedController.play).toHaveBeenCalled();
        });

        // Click the play/pause button which should call togglePlay (embedController exists)
        const playBtn = await screen.findByRole('button', { name: '' }); // the play button has no accessible name; fallback to first button
        fireEvent.click(playBtn);

        expect(fakeEmbedController.togglePlay).toHaveBeenCalled();

        jest.useRealTimers();
        // cleanup
        delete window.IFrameAPI;
    });

    test('swipeWithAnimation invoked via side action button triggers swipe and onCardLeftScreen cleanup', async () => {
        const SongQueueContext = require('../SongQueueContext');
        const mockGetNext = jest.fn().mockReturnValue(mockSong);
        const mockClear = jest.fn();
        SongQueueContext.useSongQueue.mockImplementation(() => ({
            songQueue: [mockSong],
            addSongsToQueue: jest.fn(),
            getNextSong: mockGetNext,
            clearQueue: mockClear
        }));

        // ensure POST resolves
        fetch.mockResolvedValueOnce({ ok: true });

        render(<Home />);

        // Scope to the tinder-card wrapper so we pick the foreground/active card
        const tinder = await screen.findByTestId('tinder-card');
        const songTitleEl = within(tinder).getByText(mockSong.name);

        // Walk up to the nearest homepage-content container and find the Like button inside it
        const cardContainer = songTitleEl.closest('.homepage-content') || tinder;
        const sideRight = cardContainer.querySelector('button[title="Like"]');

        expect(sideRight).toBeTruthy(); // sanity
        fireEvent.click(sideRight);

        // API call should be triggered by handleLike -> handleInteraction
        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/api/user-songs/seen', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"liked":true')
            }));
        });

        // onCardLeftScreen handler removes currentSong from localStorage; ensure it was called
        await waitFor(() => {
            expect(localStorage.removeItem).toHaveBeenCalledWith('currentSong');
        });
    });

    test('loadNextSong with no next song removes currentSong and sets null', async () => {
        localStorage.getItem.mockImplementation(key => key === 'userId' ? 'u2' : null);

        const SongQueueContext = require('../SongQueueContext');
        SongQueueContext.useSongQueue.mockImplementation(() => ({
            songQueue: [],
            addSongsToQueue: jest.fn(),
            getNextSong: jest.fn().mockReturnValue(null),
            clearQueue: jest.fn()
        }));

        // place a currentSong first to observe removal
        localStorage.setItem('currentSong', JSON.stringify(mockSong));

        render(<Home />);

        await waitFor(() => {
            expect(localStorage.getItem('currentSong')).toBeNull();
        });
    });

    test('render song fallback for missing album images and missing artists', async () => {
        localStorage.getItem.mockImplementation(key => key === 'userId' ? 'u3' : null);

        const songNoMeta = {
            id: 'no-meta',
            name: 'No Meta Song'
        };

        const SongQueueContext = require('../SongQueueContext');
        SongQueueContext.useSongQueue.mockImplementation(() => ({
            songQueue: [],
            addSongsToQueue: jest.fn(),
            getNextSong: jest.fn().mockReturnValue(songNoMeta),
            clearQueue: jest.fn()
        }));

        render(<Home />);

        const img = await screen.findByAltText('No Meta Song');
        expect(img).toHaveAttribute('src', 'https://via.placeholder.com/200');

        expect(await screen.findByText('Unknown Artist')).toBeInTheDocument();
    });

    test('handleGetRandomSongs network failure shows alert', async () => {
        localStorage.getItem.mockImplementation(key => key === 'userId' ? 'u4' : null);

        fetch.mockRejectedValueOnce(new Error('network down'));

        render(
            <SongQueueProvider>
                <Home />
            </SongQueueProvider>
        );

        const btn = await screen.findByText(/get 25 random songs/i);
        fireEvent.click(btn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch random songs'));
        });
    });

    test('resetData network failure shows alert', async () => {
        localStorage.getItem.mockImplementation(key => key === 'userId' ? 'u5' : null);

        fetch.mockRejectedValueOnce(new Error('delete failed'));

        render(<Home />);

        const resetBtn = await screen.findByTitle('Reset Data');
        fireEvent.click(resetBtn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to reset data'));
        });
    });

    test('initSpotifyEmbed injects script when not loaded', async () => {
        jest.useFakeTimers();
        // ensure neither global flags nor script exist
        delete window.SpotifyIframeApiLoaded;
        const existing = document.querySelector('script[src="https://open.spotify.com/embed-podcast/iframe-api/v1"]');
        if (existing) existing.remove();

        // user present so component continues
        localStorage.getItem.mockImplementation(key => key === 'userId' ? 'u6' : null);

        render(<Home />);

        // advance timers so setTimeout in componentDidMount runs
        jest.advanceTimersByTime(200);

        await waitFor(() => {
            expect(window.SpotifyIframeApiLoaded).toBe(true);
            const script = document.querySelector('script[src="https://open.spotify.com/embed-podcast/iframe-api/v1"]');
            expect(script).toBeTruthy();
        });

        jest.useRealTimers();
    });
});
