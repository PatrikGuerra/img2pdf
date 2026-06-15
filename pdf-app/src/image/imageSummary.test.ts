import { expect, test } from 'vitest';
import { PAGE_ORIENTATIONS } from '../constants/pdfOptions';
import type { ImageItem } from '../types/pdf';
import { formatBytes, getImageSummary } from './imageSummary';

test('formats bytes as bytes, KB and MB', () => {
  expect(formatBytes(512)).toBe('512 B');
  expect(formatBytes(1536)).toBe('1.5 KB');
  expect(formatBytes(12 * 1024)).toBe('12 KB');
  expect(formatBytes(8.4 * 1024 * 1024)).toBe('8.4 MB');
});

test('summarizes image count and total original file size', () => {
  const images = [
    makeImageItem('one.png', 1024),
    makeImageItem('two.png', 2 * 1024),
  ];

  expect(getImageSummary(images)).toEqual({
    count: 2,
    totalBytes: 3072,
    label: '2 images · estimated 3.0 KB',
  });
});

test('uses source file size for locally converted images', () => {
  const sourceFile = new File([new Uint8Array(4096)], 'photo.heic', { type: 'image/heic' });
  const image = {
    ...makeImageItem('photo.jpg', 512),
    convertedFrom: 'HEIC' as const,
    sourceFile,
  };

  expect(getImageSummary([image])).toEqual({
    count: 1,
    totalBytes: 4096,
    label: expect.stringMatching(/1 image .* estimated 4\.0 KB/),
  });
});

function makeImageItem(name: string, size: number): ImageItem {
  return {
    id: name,
    file: new File([new Uint8Array(size)], name, { type: 'image/png' }),
    flipHorizontal: false,
    flipVertical: false,
    pageOrientation: PAGE_ORIENTATIONS.PORTRAIT,
    previewUrl: `blob:${name}`,
    rotationDegrees: 0,
    selected: false,
  };
}
