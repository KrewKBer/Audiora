import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import GradientBackground from '../GradientBackground';

describe('GradientBackground Component', () => {
  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 0));
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders correct number of blobs', () => {
    const { container } = render(<GradientBackground />);
    const blobs = container.querySelectorAll('.bouncing-blob');
    expect(blobs.length).toBe(6);
  });
  
  test('renders root container', () => {
      const { container } = render(<GradientBackground />);
      expect(container.querySelector('.gradient-bg-root')).toBeInTheDocument();
  });
});
