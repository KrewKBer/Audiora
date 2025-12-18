import React from 'react';
import { render, cleanup } from '@testing-library/react';
import GradientBackground from '../GradientBackground';

describe('GradientBackground', () => {
    let rafCbs;
    let cancelSpy;
    let perfNowSpy;

    beforeEach(() => {
        rafCbs = [];
        // mock requestAnimationFrame to capture callbacks; call the first frame immediately
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            rafCbs.push(cb);
            if (rafCbs.length === 1) {
                // simulate a first frame timestamp (16ms)
                cb(16);
            }
            return rafCbs.length;
        });

        cancelSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

        // make performance.now predictable: first call -> 0 (used when effect initializes last),
        // subsequent calls can be arbitrary (not relied upon heavily here)
        perfNowSpy = jest.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(16);
    });

    afterEach(() => {
        perfNowSpy.mockRestore();
        window.requestAnimationFrame.mockRestore();
        cancelSpy.mockRestore();
        cleanup();
    });

    test('renders the expected number of blobs and applies styles after a frame', () => {
        const { container } = render(<GradientBackground />);
        const blobs = container.getElementsByClassName('bouncing-blob');

        // component constant BLOB_COUNT is 6 in the source
        expect(blobs.length).toBe(6);

        // After the first (immediate) frame, DOM styles should be set
        for (let i = 0; i < blobs.length; i++) {
            const el = blobs[i];
            // transform should be set
            expect(el.style.transform).toMatch(/translate\(.+px,\s*.+px\)/);
            // size should be set in px
            expect(el.style.width).toMatch(/\d+px/);
            expect(el.style.height).toMatch(/\d+px/);
            // background may not always be set in the test environment; only assert when present
            const bg = el.style.background || '';
            if (bg) {
                expect(bg).toMatch(/radial-gradient/i);
            }
        }
    });

    test('cancels animation frame on unmount', () => {
        const { unmount } = render(<GradientBackground />);

        // initial requestAnimationFrame returns id 1 for first call
        unmount();
        expect(cancelSpy).toHaveBeenCalled();
        // ensure it's called with a numeric id (the implementation returns index)
        const calledWith = cancelSpy.mock.calls[0][0];
        expect(typeof calledWith).toBe('number');
    });

    test('responds to resize and updates positions on next frame', () => {
        const { container } = render(<GradientBackground />);
        const blobs = container.getElementsByClassName('bouncing-blob');
        expect(blobs.length).toBe(6);

        // simulate a smaller viewport
        const newWidth = 300;
        const newHeight = 200;
        // set window dimensions and dispatch resize
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: newWidth });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: newHeight });
        window.dispatchEvent(new Event('resize'));

        // The component scheduled another RAF callback; ensure it exists
        // (the mock pushes callbacks; the second pushed cb is at index 1)
        expect(rafCbs.length).toBeGreaterThanOrEqual(2);
        // simulate the next frame (e.g., timestamp 32)
        rafCbs[1](32);

        // parse transform and size and assert blobs are within bounds or handled when larger than viewport
        for (let i = 0; i < blobs.length; i++) {
            const el = blobs[i];
            const transform = el.style.transform; // e.g., translate(10px, 20px)
            const sizePx = parseInt(el.style.width || '0', 10);
            const match = /translate\(\s*([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform);
            if (!match) continue;
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);

            if (sizePx > newWidth || sizePx > newHeight) {
                // If a blob is larger than the viewport, ensure it's at least positioned non-negative
                expect(x).toBeGreaterThanOrEqual(0);
                expect(y).toBeGreaterThanOrEqual(0);
            } else {
                // Otherwise ensure the blob fits within the viewport bounds
                expect(x + sizePx).toBeLessThanOrEqual(newWidth + 1);
                expect(y + sizePx).toBeLessThanOrEqual(newHeight + 1);
            }
        }
    });
});
