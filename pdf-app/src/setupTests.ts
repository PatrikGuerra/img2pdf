import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

let objectUrlIndex = 0;

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
