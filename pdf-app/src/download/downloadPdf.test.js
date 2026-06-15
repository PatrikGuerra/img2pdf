import { afterEach, expect, test, vi } from 'vitest';
import { downloadPdf } from './downloadPdf';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('downloads a PDF blob and revokes the temporary object URL', () => {
  vi.useFakeTimers();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  const url = downloadPdf(new Uint8Array([1, 2, 3]), 'custom.pdf');

  expect(url).toMatch(/^blob:test-/);
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalledTimes(1);
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();

  vi.runAllTimers();

  expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
});
