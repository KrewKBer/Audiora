import React, { createContext, useState, useContext } from 'react';

const SongQueueContext = createContext();

export const useSongQueue = () => useContext(SongQueueContext);

export const SongQueueProvider = ({ children }) => {
  const [songQueue, setSongQueue] = useState([]);

  const addSongsToQueue = (songs) => {
    setSongQueue(prevQueue => [...prevQueue, ...songs]);
  };

  const getNextSong = () => {
    if (songQueue.length === 0) return null;
    const nextSong = songQueue[0];
    setSongQueue(prevQueue => prevQueue.slice(1));
    return nextSong;
  };

  const clearQueue = () => {
    setSongQueue([]);
  };

  return (
    <SongQueueContext.Provider value={{ songQueue, addSongsToQueue, getNextSong, clearQueue }}>
      {children}
    </SongQueueContext.Provider>
  );
};
