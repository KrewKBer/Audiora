import React from 'react';
import { render, cleanup } from '@testing-library/react';

// Provide a mock for ResizeObserver used by the component
beforeAll(() => {
    global.ResizeObserver = class {
        constructor(cb) { this.cb = cb; }
        observe() {}
        disconnect() {}
    };
});

// Mock the entire three module with lightweight, inspectable objects
jest.mock('three', () => {
    const __last = {};
    class Vector2 {
        constructor(x = 0, y = 0) { this.x = x; this.y = y; }
        set(x, y) { this.x = x; this.y = y; return this; }
        copy(v) { this.x = v.x; this.y = v.y; return this; }
        lerp() { return this; }
    }
    class Vector3 {
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
        copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    }
    class Scene { add() {} }
    class OrthographicCamera {}
    class PlaneGeometry {
        dispose = jest.fn(() => { __last.geometryDisposed = true; });
    }
    class Mesh {
        constructor(geometry, material) { this.geometry = geometry; this.material = material; }
    }
// javascript
    class Clock {
        constructor() {
            this._elapsedTime = 0;
            this._last = Date.now();
        }
        getDelta() {
            // deterministic small delta for tests
            return 0.016;
        }
        get elapsedTime() {
            return this._elapsedTime;
        }
        // alias used by the component
        get elapsed() {
            return this._elapsedTime;
        }
        // optional helper to advance time from tests if needed
        advance(ms = 16) {
            this._elapsedTime += ms / 1000;
        }
    }
    
    const SRGBColorSpace = 'SRGBColorSpace';

    class ShaderMaterial {
        constructor(opts = {}) {
            // copy provided uniforms or create defaults similar to real component
            this.uniforms = (opts.uniforms) ? opts.uniforms : {
                uCanvas: { value: new Vector2(1, 1) },
                uTime: { value: 0 },
                uSpeed: { value: 0.2 },
                uRot: { value: new Vector2(1, 0) },
                uColorCount: { value: 0 },
                uColors: { value: Array.from({ length: 8 }, () => new Vector3(0, 0, 0)) },
                uTransparent: { value: 1 },
                uScale: { value: 1 },
                uFrequency: { value: 1 },
                uWarpStrength: { value: 1 },
                uPointer: { value: new Vector2(0, 0) },
                uMouseInfluence: { value: 1 },
                uParallax: { value: 0.5 },
                uNoise: { value: 0.1 }
            };
            this.premultipliedAlpha = !!opts.premultipliedAlpha;
            this.transparent = !!opts.transparent;
            this.dispose = jest.fn(() => { __last.materialDisposed = true; });
            __last.material = this;
        }
    }

    class WebGLRenderer {
        constructor() {
            // use only allowed globals (global or globalThis) to access document
            const doc = (typeof global !== 'undefined' && global.document)
                ? global.document
                : (typeof globalThis !== 'undefined' && globalThis.document)
                    ? globalThis.document
                    : null;
            if (doc && typeof doc.createElement === 'function') {
                this.domElement = doc.createElement('canvas');
            } else {
                // minimal fallback element so tests don't crash if document isn't available
                this.domElement = {
                    nodeType: 1,
                    style: {},
                    dataset: {},
                    parentElement: null
                };
            }
            this.domElement.dataset.testid = this.domElement.dataset.testid || 'mock-canvas';
            this.setPixelRatio = jest.fn();
            this.setClearColor = jest.fn();
            this.setSize = jest.fn();
            this.render = jest.fn();
            this.dispose = jest.fn(() => { __last.rendererDisposed = true; });
            this.outputColorSpace = null;
            __last.renderer = this;
        }
    }

    return {
        Vector2,
        Vector3,
        Scene,
        OrthographicCamera,
        PlaneGeometry,
        Mesh,
        Clock,
        ShaderMaterial,
        WebGLRenderer,
        SRGBColorSpace,
        __last
    };
});

import three from 'three';
import ColorBends from '../ColorBends';

afterEach(() => {
    cleanup();
    jest.clearAllMocks();
});

test('attaches renderer.domElement to container and disposes on unmount', () => {
    const { container, unmount } = render(<ColorBends className="cb-test" />);

    // renderer appended to component container
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();

    // material/geometry/renderer were created (accessible via mock)
    const last = three.__last;
    expect(last.material).toBeDefined();
    expect(last.renderer).toBeDefined();

    // unmount should call dispose on material/geometry/renderer and remove domElement
    unmount();

    expect(last.material.dispose).toHaveBeenCalled();
    expect(last.renderer.dispose).toHaveBeenCalled();
    // canvas removed from DOM
    expect(container.querySelector('canvas')).toBeNull();
});

test('initializes material uniforms from props and updates on rerender', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff'];
    const { rerender } = render(<ColorBends colors={colors} speed={0.25} scale={1.2} />);

    const last = three.__last;
    expect(last.material).toBeDefined();

    // color count reflects passed colors length
    expect(last.material.uniforms.uColorCount.value).toBe(3);

    // re-render with changed values to trigger update effect
    rerender(<ColorBends colors={colors} speed={0.5} scale={2} />);

    // After rerender the component writes into existing material.uniforms
    expect(last.material.uniforms.uSpeed.value).toBe(0.5);
    expect(last.material.uniforms.uScale.value).toBe(2);
});

test('limits color count to MAX_COLORS and fills uColors array entries', () => {
    // create more than MAX (8) values
    const manyColors = new Array(12).fill(0).map((_, i) => `#${(i + 1).toString(16).padStart(6, '0')}`);
    render(<ColorBends colors={manyColors} />);

    const last = three.__last;
    expect(last.material.uniforms.uColorCount.value).toBeLessThanOrEqual(8);
    // uColors is an array of Vector3s; ensure they exist
    expect(Array.isArray(last.material.uniforms.uColors.value)).toBe(true);
    expect(last.material.uniforms.uColors.value.length).toBe(8);
});
