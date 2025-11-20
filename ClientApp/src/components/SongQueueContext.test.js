import React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SongQueueProvider, useSongQueue } from './SongQueueContext';

describe('SongQueueContext', () => {
  const mockSongs = [
    { id: '1', name: 'Song 1', artist: 'Artist 1' },
    { id: '2', name: 'Song 2', artist: 'Artist 2' },
    { id: '3', name: 'Song 3', artist: 'Artist 3' },
  ];

  test('provides initial empty queue', () => {
    const { result } = renderHook(() => useSongQueue(), {
      wrapper: SongQueueProvider,
    });

    expect(result.current.songQueue).toEqual([]);
  });

  test('addSongsToQueue adds songs to the queue', () => {
    const { result } = renderHook(() => useSongQueue(), {
      wrapper: SongQueueProvider,
    });

    act(() => {
      result.current.addSongsToQueue([mockSongs[0]]);
    });

    expect(result.current.songQueue).toHaveLength(1);
    expect(result.current.songQueue[0]).toEqual(mockSongs[0]);
  });

  test('addSongsToQueue appends multiple songs', () => {
    const { result } = renderHook(() => useSongQueue(), {
      wrapper: SongQueueProvider,
    });

    act(() => {
      result.current.addSongsToQueue([mockSongs[0]]);
    });

    act(() => {
      result.current.addSongsToQueue([mockSongs[1], mockSongs[2]]);
    });

    expect(result.current.songQueue).toHaveLength(3);
    expect(result.current.songQueue[0]).toEqual(mockSongs[0]);
    expect(result.current.songQueue[1]).toEqual(mockSongs[1]);
    expect(result.current.songQueue[2]).toEqual(mockSongs[2]);
  });

  test('getNextSong returns first song and removes it from queue', () => {
    const { result } = renderHook(() => useSongQueue(), {
      wrapper: SongQueueProvider,
    });

    act(() => {
      result.current.addSongsToQueue(mockSongs);
    });

    let nextSong;
    act(() => {
      nextSong = result.current.getNextSong();
    });

    expect(nextSong).toEqual(mockSongs[0]);
    expect(result.current.songQueue).toHaveLength(2);
    expect(result.current.songQueue[0]).toEqual(mockSongs[1]);
  });

  test('getNextSong returns null when queue is empty', () => {
    const { result } = renderHook(() => useSongQueue(), {
      wrapper: SongQueueProvider,
    });

    let nextSong;
    act(() => {
      nextSong = result.current.getNextSong();
    });

    expect(nextSong).toBeNull();
    expect(result.current.songQueue).toHaveLength(0);
  });

  test('clearQueue removes all songs from queue', () => {
    const { result } = renderHook(() => useSongQueue(), {
      wrapper: SongQueueProvider,
    });

    act(() => {
      result.current.addSongsToQueue(mockSongs);
    });

    expect(result.current.songQueue).toHaveLength(3);

    act(() => {
      result.current.clearQueue();
    });

    expect(result.current.songQueue).toHaveLength(0);
  });

  test('multiple getNextSong calls process queue in order', () => {
    const { result } = renderHook(() => useSongQueue(), {
      wrapper: SongQueueProvider,
    });

    act(() => {
      result.current.addSongsToQueue(mockSongs);
    });

    let song1, song2, song3;
    
    act(() => {
      song1 = result.current.getNextSong();
    });
    act(() => {
      song2 = result.current.getNextSong();
    });
    act(() => {
      song3 = result.current.getNextSong();
    });

    expect(song1).toEqual(mockSongs[0]);
    expect(song2).toEqual(mockSongs[1]);
    expect(song3).toEqual(mockSongs[2]);
    expect(result.current.songQueue).toHaveLength(0);
  });

  test('context provides all expected functions', () => {
    const { result } = renderHook(() => useSongQueue(), {
      wrapper: SongQueueProvider,
    });

    expect(result.current).toHaveProperty('songQueue');
    expect(result.current).toHaveProperty('addSongsToQueue');
    expect(result.current).toHaveProperty('getNextSong');
    expect(result.current).toHaveProperty('clearQueue');
    expect(typeof result.current.addSongsToQueue).toBe('function');
    expect(typeof result.current.getNextSong).toBe('function');
    expect(typeof result.current.clearQueue).toBe('function');
  });

  test('provider wraps children correctly', () => {
    render(
      <SongQueueProvider>
        <div>Test Child</div>
      </SongQueueProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });
});
