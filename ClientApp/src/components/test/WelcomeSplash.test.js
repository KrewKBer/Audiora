import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WelcomeSplash } from '../WelcomeSplash';

jest.useFakeTimers();

describe('WelcomeSplash Component', () => {
  test('renders logo and text', () => {
    render(<WelcomeSplash onComplete={() => {}} />);
    expect(screen.getByAltText('Audiora')).toBeInTheDocument();
    expect(screen.getByText('Audiora')).toBeInTheDocument();
  });

  test('calls onComplete after timeout', () => {
    const onComplete = jest.fn();
    render(<WelcomeSplash onComplete={onComplete} />);
    
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
