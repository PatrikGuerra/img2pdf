// @vitest-environment node
import { expect, test } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createPdfFromImages } from './createPdfFromImages';
import type { ImageItem } from '../types/pdf';

test('creates a readable PDF containing both images', async () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const item: ImageItem = {
    id: 'one', file: new File([], 'image.png', { type: 'image/png' }),
    flipHorizontal: false, flipVertical: false, pageOrientation: 'PORTRAIT',
    previewUrl: `data:image/png;base64,${png}`, rotationDegrees: 0, selected: false,
  };

  const bytes = await createPdfFromImages([item, { ...item, id: 'two' }]);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(2);
  expect(pdf.getPage(0).getWidth()).toBeGreaterThan(0);
});
