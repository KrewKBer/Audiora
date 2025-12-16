import React, { useEffect } from 'react';
import './WelcomeSplash.css';

export function WelcomeSplash({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500); // Animation duration
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="welcome-splash">
      <div className="logo-container">
        <img src="/Logo.png" alt="Audiora" className="splash-logo" />
        <h1 className="splash-text">Audiora</h1>
      </div>
    </div>
  );
}
