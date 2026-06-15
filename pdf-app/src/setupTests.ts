import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

let objectUrlIndex = 0;

beforeEach(() => {
  objectUrlIndex = 0;
});

Object.defineProperty(globalThis.URL, 'createObjectURL', {
  configurable: true,
  value: vi.fn(() => {
    objectUrlIndex += 1;
    return `blob:test-${objectUrlIndex}`;
  }),
});

Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
  configurable: true,
  value: vi.fn(),
});

class TestImage {
  height = 200;
  naturalHeight = 200;
  naturalWidth = 100;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  width = 100;

  set src(value: string) {
    const match = value.match(/blob:test-(\d+)/);
    const index = match ? Number(match[1]) : 1;

    if (index % 2 === 0) {
      this.width = 300;
      this.naturalWidth = 300;
      this.height = 100;
      this.naturalHeight = 100;
    } else {
      this.width = 100;
      this.naturalWidth = 100;
      this.height = 300;
      this.naturalHeight = 300;
    }

    this.onload?.();
  }
}

Object.defineProperty(globalThis, 'Image', {
  configurable: true,
  value: TestImage,
});
