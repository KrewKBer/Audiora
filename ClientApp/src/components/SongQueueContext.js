import React, { createContext, useState, useContext } from 'react';

const SongQueueContext = createContext();

export const useSongQueue = () => useContext(SongQueueContext);

export const SongQueueProvider = ({ children }) => {
  const [songQueue, setSongQueue] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);

  const addSongsToQueue = (songs) => {
    setSongQueue(prevQueue => [...prevQueue, ...songs]);
  };

  const getNextSong = () => {
    // If there's already a current song, return it (don't consume from queue)
    if (currentSong) {
      return currentSong;
    }
    
    if (songQueue.length === 0) return null;
    const nextSong = songQueue[0];
    setSongQueue(prevQueue => prevQueue.slice(1));
    setCurrentSong(nextSong);
    return nextSong;
  };

  const consumeCurrentSong = () => {
    // This is called after a swipe to clear the current song
    setCurrentSong(null);
  };

  const clearQueue = () => {
    setSongQueue([]);
    setCurrentSong(null);
  };

  return (
    <SongQueueContext.Provider value={{ songQueue, currentSong, addSongsToQueue, getNextSong, consumeCurrentSong, clearQueue }}>
      {children}
    </SongQueueContext.Provider>
  );
};
