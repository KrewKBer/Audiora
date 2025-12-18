// javascript
// File: `ClientApp/src/components/test/DomeGallery.test.js`
import React from 'react';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import DomeGallery from '../DomeGallery';

beforeAll(() => {
    // minimal ResizeObserver mock
    global.ResizeObserver = class {
        constructor(cb) { this.cb = cb; }
        observe() {}
        disconnect() {}
    };

    // ensure requestAnimationFrame exists
    global.requestAnimationFrame = cb => setTimeout(cb, 0);
});

afterEach(() => {
    cleanup();
    jest.resetAllMocks();
    // ensure body class removed between tests
    document.body.className = '';
    // clear any stored user info
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
        localStorage.clear();
    }
    // restore mocked prototype if left mocked
    if (Element.prototype.getBoundingClientRect && Element.prototype.getBoundingClientRect._isMock) {
        Element.prototype.getBoundingClientRect.mockRestore();
    }
});

/* Helper to open the first tile with deterministic rects.
   Returns the spy so the caller can restore if needed. */
async function openFirstTile(container) {
    const firstItem = container.querySelector('.item');
    const imgButton = firstItem.querySelector('.item__image');

    // deterministic rects for key elements
    const smallRect = { left: 10, top: 10, width: 80, height: 100, right: 90, bottom: 110 };
    const frameRect = { left: 0, top: 0, width: 200, height: 300, right: 200, bottom: 300 };
    const mainRect = { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 };

    Object.defineProperty(firstItem, 'getBoundingClientRect', { value: () => smallRect });
    const frame = container.querySelector('.frame');
    const main = container.querySelector('.sphere-main');
    if (frame) Object.defineProperty(frame, 'getBoundingClientRect', { value: () => frameRect });
    if (main) Object.defineProperty(main, 'getBoundingClientRect', { value: () => mainRect });

    // default for any dynamically created elements
    const protoRect = { left: 20, top: 20, width: 50, height: 60, right: 70, bottom: 80 };
    const spy = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
        return protoRect;
    });
    spy._isMock = true;

    // click tile to open
    fireEvent.click(imgButton);

    // wait for overlay to appear
    await waitFor(() => {
        const overlay = container.querySelector('.enlarge') || document.querySelector('.enlarge');
        if (!overlay) throw new Error('overlay not present yet');
    });

    return { spy };
}

test('renders images passed via props (shows at least one provided src)', () => {
    const images = [
        { src: '/img/one.jpg', title: 'One', artist: 'A' },
        { src: '/img/two.jpg', title: 'Two', artist: 'B' }
    ];
    const { container } = render(<DomeGallery images={images} segments={4} />);
    // at least one image element with the provided src should be present
    const found = Array.from(container.querySelectorAll('img')).some(i => i.src.includes('/img/one.jpg'));
    expect(found).toBe(true);
});

test('fetches liked songs when no images prop and updates gallery', async () => {
    // prepare localStorage userId
    localStorage.setItem('userId', 'u123');

    // mock fetch: liked songs endpoint returns a simple array
    global.fetch = jest.fn().mockImplementation(url => {
        if (url.includes('/api/user-songs/liked')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    { albumImageUrl: '/fetched/1.jpg', name: 'S1', artist: 'AA' },
                    { albumImageUrl: '/fetched/2.jpg', name: 'S2', artist: 'BB' }
                ])
            });
        }
        // fallback empty ok response
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    const { container } = render(<DomeGallery images={[]} segments={4} />);

    // wait for the component to fetch and render at least one fetched image
    await waitFor(() => {
        const imgs = Array.from(container.querySelectorAll('img'));
        expect(imgs.some(i => i.src.includes('/fetched/1.jpg') || i.src.includes('/fetched/2.jpg'))).toBe(true);
    });
    expect(global.fetch).toHaveBeenCalled();
});

test('clicking a tile opens enlarge overlay and locks scroll', async () => {
    const images = [
        { src: '/img/open.jpg', title: 'Open', artist: 'X' }
    ];

    const { container } = render(<DomeGallery images={images} segments={3} />);

    // Provide deterministic getBoundingClientRect for key elements
    const main = container.querySelector('.sphere-main');
    const frame = container.querySelector('.frame');
    const firstItem = container.querySelector('.item');
    const imgButton = firstItem.querySelector('.item__image');

    // Set bounding rects so the open logic can proceed
    const smallRect = { left: 10, top: 10, width: 80, height: 100, right: 90, bottom: 110 };
    const frameRect = { left: 0, top: 0, width: 200, height: 300, right: 200, bottom: 300 };
    const mainRect = { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 };

    // define for specific elements
    Object.defineProperty(firstItem, 'getBoundingClientRect', { value: () => smallRect });
    if (frame) Object.defineProperty(frame, 'getBoundingClientRect', { value: () => frameRect });
    if (main) Object.defineProperty(main, 'getBoundingClientRect', { value: () => mainRect });

    // ensure default prototype rect for elements created dynamically returns a valid rectangle
    const protoRect = { left: 20, top: 20, width: 50, height: 60, right: 70, bottom: 80 };
    const spy = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
        return protoRect;
    });
    spy._isMock = true;

    // click tile
    fireEvent.click(imgButton);

    // wait for overlay to appear and for body class to be applied
    await waitFor(() => {
        const overlay = container.querySelector('.enlarge') || document.querySelector('.enlarge');
        expect(overlay).toBeTruthy();
        expect(document.body.classList.contains('dg-scroll-lock')).toBe(true);
    });

    // cleanup mock on prototype
    spy.mockRestore();
});

test('opens overlay then closes when scrim clicked (after initial delay) and unlocks scroll', async () => {
    const images = [{ src: '/img/open.jpg', title: 'Open', artist: 'X' }];
    const { container } = render(<DomeGallery images={images} segments={3} />);

    const { spy } = await openFirstTile(container);

    // wait >250ms so scrim close handler will run
    await new Promise(r => setTimeout(r, 350));

    // scrim might be inside container or document
    const scrim = container.querySelector('.scrim') || document.querySelector('.scrim');
    fireEvent.click(scrim);

    // find overlay (may be in document) or the closing anim element
    const overlay = container.querySelector('.enlarge') || document.querySelector('.enlarge');
    const closing = document.querySelector('.enlarge-closing');
    const endTarget = overlay || closing;

    // trigger end of close animation/transition so component removes body lock
    if (endTarget) {
        endTarget.dispatchEvent(new Event('transitionend'));
        endTarget.dispatchEvent(new Event('animationend'));
    }

    await waitFor(() => {
        const still = container.querySelector('.enlarge') || document.querySelector('.enlarge') || document.querySelector('.enlarge-closing');
        if (still) throw new Error('overlay still present');
        if (document.body.classList.contains('dg-scroll-lock')) throw new Error('body still locked');
    });

    spy.mockRestore();
});

test('opens overlay then closes on Escape key and unlocks scroll', async () => {
    const images = [{ src: '/img/open.jpg', title: 'Open', artist: 'X' }];
    const { container } = render(<DomeGallery images={images} segments={3} />);

    const { spy } = await openFirstTile(container);

    // allow initial open window to pass
    await new Promise(r => setTimeout(r, 350));

    fireEvent.keyDown(window, { key: 'Escape' });

    // find overlay (may be in document) or the closing anim element
    const overlay = container.querySelector('.enlarge') || document.querySelector('.enlarge');
    const closing = document.querySelector('.enlarge-closing');
    const endTarget = overlay || closing;

    // trigger end of close animation/transition so component removes body lock
    if (endTarget) {
        endTarget.dispatchEvent(new Event('transitionend'));
        endTarget.dispatchEvent(new Event('animationend'));
    }

    await waitFor(() => {
        const still = container.querySelector('.enlarge') || document.querySelector('.enlarge') || document.querySelector('.enlarge-closing');
        if (still) throw new Error('overlay still present after Escape');
        if (document.body.classList.contains('dg-scroll-lock')) throw new Error('body still locked after Escape');
    });

    spy.mockRestore();
});

test('side panel toggle opens and shows correct song count', () => {
    const images = [
        { src: '/a.jpg', title: 'A', artist: 'X' },
        { src: '/b.jpg', title: 'B', artist: 'Y' },
        { src: '/c.jpg', title: 'C', artist: 'Z' }
    ];
    const { container } = render(<DomeGallery images={images} segments={4} />);

    const toggle = container.querySelector('.dg-list-toggle');
    const panel = container.querySelector('.dg-side-panel');
    const count = container.querySelector('.dg-song-count');

    expect(toggle).toBeTruthy();
    expect(panel.classList.contains('open')).toBe(false);
    expect(count.textContent).toContain(String(images.length));

    // click to open
    fireEvent.click(toggle);
    expect(panel.classList.contains('open')).toBe(true);

    // click to close
    fireEvent.click(toggle);
    expect(panel.classList.contains('open')).toBe(false);
});

test('renders expected number of .item elements for a small segment count', () => {
    const segments = 3;
    const images = ['/a.jpg'];
    const { container } = render(<DomeGallery images={images} segments={segments} />);

    // compute expected number of coords used by buildItems (even columns 11, odd 10)
    const expected = Array.from({ length: segments }, (_, i) => (i % 2 === 0 ? 11 : 10)).reduce((a, b) => a + b, 0);
    const items = container.querySelectorAll('.item');
    expect(items.length).toBe(expected);
});

test('unmount removes existing dg-scroll-lock class', () => {
    const images = [{ src: '/img.jpg', title: 'T', artist: 'A' }];
    const { unmount } = render(<DomeGallery images={images} segments={4} />);
    document.body.classList.add('dg-scroll-lock');
    unmount();
    expect(document.body.classList.contains('dg-scroll-lock')).toBe(false);
});
