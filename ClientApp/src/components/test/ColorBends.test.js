import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ColorBends from '../ColorBends';
import * as THREE from 'three';

// Mock THREE
jest.mock('three', () => {
  return {
    __esModule: true,
    WebGLRenderer: class {
      constructor() {
        this.domElement = global.document.createElement('canvas');
        this.setSize = jest.fn();
        this.setPixelRatio = jest.fn();
        this.setClearColor = jest.fn();
        this.render = jest.fn();
        this.dispose = jest.fn();
      }
    },
    Scene: class {
      constructor() {
        this.add = jest.fn();
        this.clear = jest.fn();
      }
    },
    OrthographicCamera: class {
      constructor() {
        this.position = { z: 0 };
      }
    },
    PlaneGeometry: class {
      dispose = jest.fn();
    },
    ShaderMaterial: class {
      constructor(params) {
        this.uniforms = params && params.uniforms ? params.uniforms : {
          uTime: { value: 0 },
          uCanvas: { value: { set: jest.fn() } },
          uColors: { value: [] },
          uColorCount: { value: 0 },
          uSpeed: { value: 0 },
          uRot: { value: { set: jest.fn() } },
          uTransparent: { value: 0 },
          uScale: { value: 0 },
          uFrequency: { value: 0 },
          uWarpStrength: { value: 0 },
          uPointer: { value: { set: jest.fn() } },
          uMouseInfluence: { value: 0 },
          uParallax: { value: 0 },
          uNoise: { value: 0 }
        };
        this.dispose = jest.fn();
      }
    },
    Mesh: class {},
    Vector2: class {
      constructor(x, y) { this.x = x; this.y = y; }
      set(x, y) { this.x = x; this.y = y; return this; }
    },
    Vector3: class {
      constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
      set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    },
    Color: class {
      constructor(r, g, b) { this.r = r; this.g = g; this.b = b; }
      set(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
    },
    Clock: class {
      getElapsedTime = jest.fn(() => 0);
    }
  };
});

describe('ColorBends Component', () => {
  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 0));
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders canvas', () => {
    const { container } = render(<ColorBends />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
