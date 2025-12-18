import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Search } from '../Search';
import { SongQueueProvider } from '../SongQueueContext';

global.fetch = jest.fn();

const renderSearch = () => {
    return render(
        <SongQueueProvider>
            <Search />
        </SongQueueProvider>
    );
};

describe('Search Component', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    test('renders title and search input', () => {
        renderSearch();
        expect(screen.getByText('Song Search')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search for a song...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });

    test('updates search query on input change', () => {
        renderSearch();
        const input = screen.getByPlaceholderText('Search for a song...');
        fireEvent.change(input, { target: { value: 'Bohemian Rhapsody' } });
        expect(input.value).toBe('Bohemian Rhapsody');
    });

    test('does not search when query is empty', async () => {
        renderSearch();
        const searchButton = screen.getByRole('button', { name: 'Search' });
        fireEvent.click(searchButton);
        expect(fetch).not.toHaveBeenCalled();
    });

    test('searches and displays results', async () => {
        const mockTracks = [
            {
                id: '1',
                name: 'Test Song',
                album: { images: [{ url: 'http://example.com/image.jpg' }] },
                artists: [{ name: 'Test Artist' }],
                preview_url: 'http://example.com/preview.mp3'
            }
        ];

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockTracks
        });

        renderSearch();
        const input = screen.getByPlaceholderText('Search for a song...');
        fireEvent.change(input, { target: { value: 'test' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(screen.getByText('Test Song')).toBeInTheDocument();
            expect(screen.getByText('Test Artist')).toBeInTheDocument();
        });
    });

    test('displays multiple artists joined by comma', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                id: '1',
                name: 'Collab Song',
                album: { images: [{ url: 'http://example.com/image.jpg' }] },
                artists: [{ name: 'Artist One' }, { name: 'Artist Two' }],
                preview_url: null
            }]
        });

        renderSearch();
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(screen.getByText('Artist One, Artist Two')).toBeInTheDocument();
        });
    });

    test('displays audio player when preview_url exists', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                id: '1',
                name: 'Song with Preview',
                album: { images: [{ url: 'http://example.com/image.jpg' }] },
                artists: [{ name: 'Artist' }],
                preview_url: 'http://example.com/preview.mp3'
            }]
        });

        renderSearch();
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            const audio = document.querySelector('audio');
            expect(audio).toBeInTheDocument();
            expect(audio.src).toBe('http://example.com/preview.mp3');
        });
    });

    test('does not display audio player when preview_url is missing', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                id: '1',
                name: 'Song without Preview',
                album: { images: [{ url: 'http://example.com/image.jpg' }] },
                artists: [{ name: 'Artist' }],
                preview_url: null
            }]
        });

        renderSearch();
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(screen.getByText('Song without Preview')).toBeInTheDocument();
        });
        expect(document.querySelector('audio')).not.toBeInTheDocument();
    });

    test('renders Add to Queue button for each track', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                id: '1',
                name: 'Test Song',
                album: { images: [{ url: 'http://example.com/image.jpg' }] },
                artists: [{ name: 'Artist' }],
                preview_url: null
            }]
        });

        renderSearch();
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Add to Queue' })).toBeInTheDocument();
        });
    });

    test('displays error message on fetch failure', async () => {
        fetch.mockRejectedValueOnce(new Error('Network error'));

        renderSearch();
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });
    });

    test('displays error from API response', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'API rate limit exceeded' })
        });

        renderSearch();
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
        });
    });

    test('displays generic error when response parsing fails', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => { throw new Error(); }
        });

        renderSearch();
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(screen.getByText('Request failed')).toBeInTheDocument();
        });
    });

    test('handles response with items property', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                items: [{
                    id: '1',
                    name: 'Nested Song',
                    album: { images: [{ url: 'http://example.com/image.jpg' }] },
                    artists: [{ name: 'Artist' }],
                    preview_url: null
                }]
            })
        });

        renderSearch();
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(screen.getByText('Nested Song')).toBeInTheDocument();
        });
    });

    test('disables search button while searching', async () => {
        fetch.mockImplementationOnce(() => new Promise(() => {}));

        renderSearch();
        const searchButton = screen.getByRole('button', { name: 'Search' });
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test' } });
        fireEvent.submit(searchButton);

        expect(searchButton).toBeDisabled();
    });

    test('makes correct API call with encoded query', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        renderSearch();
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test & special' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/spotify/search?query=test%20%26%20special');
        });
    });

    test('renders track image', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                id: '1',
                name: 'Test Song',
                album: { images: [{ url: 'http://example.com/image.jpg' }] },
                artists: [{ name: 'Artist' }],
                preview_url: null
            }]
        });

        renderSearch();
        fireEvent.change(screen.getByPlaceholderText('Search for a song...'), { target: { value: 'test' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            const img = screen.getByAltText('Test Song');
            expect(img).toBeInTheDocument();
            expect(img.src).toBe('http://example.com/image.jpg');
        });
    });
});
