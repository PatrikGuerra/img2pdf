import { expect, test, vi } from 'vitest';
import {
  clearImageSelection,
  createImageItems,
  createImageItemsReport,
  deleteImageById,
  flipImageById,
  getOrientationFromDimensions,
  hasMixedImageOrientations,
  isHeicImageFile,
  isSupportedImageFile,
  moveImageByOffset,
  moveImageBefore,
  revokeImageItems,
  rotateImageById,
  selectImageById,
  setAllImageOrientations,
  setImageOrientationById,
} from './imageFiles';
import { PAGE_ORIENTATIONS } from '../constants/pdfOptions';
import type { ImageItem, PageOrientation } from '../types/pdf';

test('accepts PNG, JPEG, HEIC and HEIF files', () => {
  expect(isSupportedImageFile(new File(['png'], 'image.png', { type: 'image/png' }))).toBe(true);
  expect(isSupportedImageFile(new File(['png'], 'image.png', { type: 'image/x-png' }))).toBe(true);
  expect(isSupportedImageFile(new File(['jpg'], 'image.jpg', { type: 'image/jpeg' }))).toBe(true);
  expect(isSupportedImageFile(new File(['heic'], 'image.heic', { type: 'image/heic' }))).toBe(true);
  expect(isSupportedImageFile(new File(['heif'], 'image.heif', { type: 'image/heif' }))).toBe(true);
  expect(isSupportedImageFile(new File(['heic'], 'image.heic', { type: '' }))).toBe(true);
  expect(isSupportedImageFile(new File(['heif'], 'image.heif', { type: 'application/octet-stream' }))).toBe(true);
  expect(isHeicImageFile(new File(['heic'], 'image.heic', { type: '' }))).toBe(true);
  expect(isSupportedImageFile(new File(['txt'], 'notes.txt', { type: 'text/plain' }))).toBe(false);
});

test('creates image items only for supported files and detects orientation', async () => {
  const createObjectUrl = vi.fn((file) => `blob:${file.name}`);
  const loadDimensions = vi.fn(async () => ({ width: 300, height: 100 }));
  const image = new File(['png'], 'image.png', { type: 'image/png' });
  const document = new File(['txt'], 'notes.txt', { type: 'text/plain' });

  const items = await createImageItems(
    [image, document],
    createObjectUrl,
    PAGE_ORIENTATIONS.PORTRAIT,
    loadDimensions,
  );

  expect(items).toEqual([
    expect.objectContaining({
      file: image,
      flipHorizontal: false,
      flipVertical: false,
      naturalDimensions: { width: 300, height: 100 },
      pageOrientation: PAGE_ORIENTATIONS.LANDSCAPE,
      previewUrl: 'blob:image.png',
      rotationDegrees: 0,
      selected: false,
    }),
  ]);
  expect(createObjectUrl).toHaveBeenCalledTimes(1);
  expect(loadDimensions).toHaveBeenCalledWith('blob:image.png');
});

test('converts HEIC and HEIF files before creating preview URLs', async () => {
  const createObjectUrl = vi.fn((file: File) => `blob:${file.name}`);
  const loadDimensions = vi.fn(async () => ({ width: 100, height: 300 }));
  const converted = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' });
  const convertHeic = vi.fn(async () => converted);
  const readOrientation = vi.fn(async () => 1 as const);
  const source = new File(['heic'], 'photo.heic', { type: 'image/heic' });

  const report = await createImageItemsReport(
    [source],
    createObjectUrl,
    PAGE_ORIENTATIONS.LANDSCAPE,
    loadDimensions,
    convertHeic,
    readOrientation,
  );

  expect(report.convertedCount).toBe(1);
  expect(report.ignoredCount).toBe(0);
  expect(report.imageItems).toEqual([
    expect.objectContaining({
      convertedFrom: 'HEIC',
      file: converted,
      naturalDimensions: { width: 100, height: 300 },
      pageOrientation: PAGE_ORIENTATIONS.PORTRAIT,
      previewUrl: 'blob:photo.jpg',
      sourceFile: source,
    }),
  ]);
  expect(convertHeic).toHaveBeenCalledWith(source, 0.95);
  expect(createObjectUrl).toHaveBeenCalledWith(converted);
});

test('reports file preparation progress while converting HEIC files', async () => {
  const createObjectUrl = vi.fn((file: File) => `blob:${file.name}`);
  const loadDimensions = vi.fn(async () => ({ width: 100, height: 300 }));
  const converted = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' });
  const convertHeic = vi.fn(async () => converted);
  const readOrientation = vi.fn(async () => 1 as const);
  const onProgress = vi.fn();
  const source = new File(['heic'], 'photo.heic', { type: 'image/heic' });

  await createImageItemsReport(
    [source],
    createObjectUrl,
    PAGE_ORIENTATIONS.PORTRAIT,
    loadDimensions,
    convertHeic,
    readOrientation,
    onProgress,
  );

  expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
    index: 0,
    message: 'Preparing files...',
    sourceType: 'HEIC',
    status: 'queued',
  }));
  expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
    message: 'Converting HEIC/HEIF to JPEG locally...',
    status: 'converting',
  }));
  expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
    message: 'Converted to JPEG locally.',
    previewUrl: 'blob:photo.jpg',
    status: 'ready',
  }));
});

test('ignores HEIC files when local conversion fails', async () => {
  const createObjectUrl = vi.fn();
  const loadDimensions = vi.fn(async () => ({ width: 100, height: 300 }));
  const convertHeic = vi.fn(async () => {
    throw new Error('conversion failed');
  });
  const source = new File(['heic'], 'photo.heic', { type: 'image/heic' });

  const report = await createImageItemsReport(
    [source],
    createObjectUrl,
    PAGE_ORIENTATIONS.PORTRAIT,
    loadDimensions,
    convertHeic,
  );

  expect(report.convertedCount).toBe(0);
  expect(report.ignoredCount).toBe(1);
  expect(report.imageItems).toEqual([]);
  expect(createObjectUrl).not.toHaveBeenCalled();
});

test('reports ignored file progress without creating object URLs', async () => {
  const createObjectUrl = vi.fn();
  const onProgress = vi.fn();
  const text = new File(['txt'], 'notes.txt', { type: 'text/plain' });

  const report = await createImageItemsReport(
    [text],
    createObjectUrl,
    PAGE_ORIENTATIONS.PORTRAIT,
    undefined,
    undefined,
    undefined,
    onProgress,
  );

  expect(report.imageItems).toEqual([]);
  expect(report.ignoredCount).toBe(1);
  expect(createObjectUrl).not.toHaveBeenCalled();
  expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({
    message: 'Ignored: not PNG/JPEG/HEIC/HEIF.',
    sourceType: 'UNKNOWN',
    status: 'ignored',
  }));
});

test('uses JPEG EXIF orientation to detect the effective image orientation', async () => {
  const createObjectUrl = vi.fn((file: File) => `blob:${file.name}`);
  const loadDimensions = vi.fn(async () => ({ width: 100, height: 300 }));
  const readOrientation = vi.fn(async () => 6 as const);
  const image = new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' });

  const report = await createImageItemsReport(
    [image],
    createObjectUrl,
    PAGE_ORIENTATIONS.PORTRAIT,
    loadDimensions,
    undefined,
    readOrientation,
  );

  expect(report.imageItems[0]).toEqual(expect.objectContaining({
    naturalDimensions: { width: 300, height: 100 },
    pageOrientation: PAGE_ORIENTATIONS.LANDSCAPE,
  }));
});

test('keeps dimension-based orientation when EXIF orientation reading fails', async () => {
  const createObjectUrl = vi.fn((file: File) => `blob:${file.name}`);
  const loadDimensions = vi.fn(async () => ({ width: 300, height: 100 }));
  const readOrientation = vi.fn(async () => {
    throw new Error('bad exif');
  });
  const image = new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' });

  const report = await createImageItemsReport(
    [image],
    createObjectUrl,
    PAGE_ORIENTATIONS.PORTRAIT,
    loadDimensions,
    undefined,
    readOrientation,
  );

  expect(report.imageItems[0]).toEqual(expect.objectContaining({
    naturalDimensions: { width: 300, height: 100 },
    pageOrientation: PAGE_ORIENTATIONS.LANDSCAPE,
  }));
});

test('handles empty file lists and files without mime type', async () => {
  const createObjectUrl = vi.fn();

  await expect(createImageItems(null, createObjectUrl)).resolves.toEqual([]);
  await expect(createImageItems([], createObjectUrl)).resolves.toEqual([]);
  await expect(createImageItems([new File(['raw'], 'unknown', { type: '' })], createObjectUrl)).resolves.toEqual([]);
  expect(createObjectUrl).not.toHaveBeenCalled();
});

test('detects portrait, landscape and square-as-portrait orientations', () => {
  expect(getOrientationFromDimensions({ width: 100, height: 300 })).toBe(PAGE_ORIENTATIONS.PORTRAIT);
  expect(getOrientationFromDimensions({ width: 300, height: 100 })).toBe(PAGE_ORIENTATIONS.LANDSCAPE);
  expect(getOrientationFromDimensions({ width: 200, height: 200 })).toBe(PAGE_ORIENTATIONS.PORTRAIT);
});

test('falls back to the global orientation when dimension detection fails', async () => {
  const createObjectUrl = vi.fn((file) => `blob:${file.name}`);
  const loadDimensions = vi.fn(async () => {
    throw new Error('bad image');
  });
  const image = new File(['png'], 'image.png', { type: 'image/png' });

  const items = await createImageItems(
    [image],
    createObjectUrl,
    PAGE_ORIENTATIONS.LANDSCAPE,
    loadDimensions,
  );

  expect(items[0].naturalDimensions).toBeUndefined();
  expect(items[0].pageOrientation).toBe(PAGE_ORIENTATIONS.LANDSCAPE);
});

test('revokes preview URLs for existing image items only', () => {
  const revokeObjectUrl = vi.fn();

  revokeImageItems([{ previewUrl: 'blob:a' }, { previewUrl: '' }, undefined, { previewUrl: 'blob:b' }], revokeObjectUrl);

  expect(revokeObjectUrl).toHaveBeenCalledTimes(2);
  expect(revokeObjectUrl).toHaveBeenNthCalledWith(1, 'blob:a');
  expect(revokeObjectUrl).toHaveBeenNthCalledWith(2, 'blob:b');
});

test('selects and clears image selection immutably', () => {
  const images = [makeImageItem('a', false), makeImageItem('b', true)];

  expect(selectImageById(images, 'a')).toEqual([makeImageItem('a', true), makeImageItem('b', false)]);
  expect(clearImageSelection(images)).toEqual([makeImageItem('a', false), makeImageItem('b', false)]);
  expect(images).toEqual([makeImageItem('a', false), makeImageItem('b', true)]);
});

test('moves a dropped image before the target image', () => {
  const images = [makeImageItem('a'), makeImageItem('b'), makeImageItem('c')];

  expect(moveImageBefore(images, 'c', 'a')).toEqual([makeImageItem('c'), makeImageItem('a'), makeImageItem('b')]);
  expect(moveImageBefore(images, 'b', 'b')).toBe(images);
  expect(moveImageBefore(images, '', 'a')).toBe(images);
  expect(moveImageBefore(images, 'missing', 'a')).toBe(images);
  expect(moveImageBefore(images, 'a', 'missing')).toBe(images);
  expect(moveImageBefore(images, 'a', '')).toBe(images);
  expect(moveImageBefore(images, 'c', 'a')).toHaveLength(3);
});

test('moves images by offset for page controls', () => {
  const images = [makeImageItem('a'), makeImageItem('b'), makeImageItem('c')];

  expect(moveImageByOffset(images, 'b', -1)).toEqual([makeImageItem('b'), makeImageItem('a'), makeImageItem('c')]);
  expect(moveImageByOffset(images, 'b', 1)).toEqual([makeImageItem('a'), makeImageItem('c'), makeImageItem('b')]);
  expect(moveImageByOffset(images, 'a', -1)).toBe(images);
  expect(moveImageByOffset(images, 'c', 1)).toBe(images);
  expect(moveImageByOffset(images, 'missing', 1)).toBe(images);
  expect(moveImageByOffset(images, 'b', 0)).toBe(images);
});

test('rotates an image clockwise in 90 degree steps', () => {
  const images = [makeImageItem('a')];

  const rotated90 = rotateImageById(images, 'a');
  const rotated180 = rotateImageById(rotated90, 'a');
  const rotated270 = rotateImageById(rotated180, 'a');
  const rotated0 = rotateImageById(rotated270, 'a');

  expect(rotated90[0].rotationDegrees).toBe(90);
  expect(rotated180[0].rotationDegrees).toBe(180);
  expect(rotated270[0].rotationDegrees).toBe(270);
  expect(rotated0[0].rotationDegrees).toBe(0);
  expect(rotateImageById(images, 'missing')).toEqual(images);
});

test('toggles horizontal and vertical flips independently', () => {
  const images = [makeImageItem('a')];

  const flippedHorizontal = flipImageById(images, 'a', 'horizontal');
  const flippedVertical = flipImageById(flippedHorizontal, 'a', 'vertical');
  const unflippedHorizontal = flipImageById(flippedVertical, 'a', 'horizontal');

  expect(flippedHorizontal[0]).toEqual(expect.objectContaining({
    flipHorizontal: true,
    flipVertical: false,
  }));
  expect(flippedVertical[0]).toEqual(expect.objectContaining({
    flipHorizontal: true,
    flipVertical: true,
  }));
  expect(unflippedHorizontal[0]).toEqual(expect.objectContaining({
    flipHorizontal: false,
    flipVertical: true,
  }));
});

test('updates page orientation by page or across all pages', () => {
  const images = [
    makeImageItem('a', false, PAGE_ORIENTATIONS.PORTRAIT),
    makeImageItem('b', false, PAGE_ORIENTATIONS.PORTRAIT),
  ];

  const mixed = setImageOrientationById(images, 'b', PAGE_ORIENTATIONS.LANDSCAPE);

  expect(mixed).toEqual([
    makeImageItem('a', false, PAGE_ORIENTATIONS.PORTRAIT),
    makeImageItem('b', false, PAGE_ORIENTATIONS.LANDSCAPE),
  ]);
  expect(hasMixedImageOrientations(mixed)).toBe(true);
  expect(setAllImageOrientations(mixed, PAGE_ORIENTATIONS.LANDSCAPE)).toEqual([
    makeImageItem('a', false, PAGE_ORIENTATIONS.LANDSCAPE),
    makeImageItem('b', false, PAGE_ORIENTATIONS.LANDSCAPE),
  ]);
});

test('deletes the selected image by id', () => {
  const images = [makeImageItem('a'), makeImageItem('b'), makeImageItem('c')];

  expect(deleteImageById(images, 'b')).toEqual([makeImageItem('a'), makeImageItem('c')]);
});

function makeImageItem(
  id: string,
  selected = false,
  pageOrientation: PageOrientation = PAGE_ORIENTATIONS.PORTRAIT,
): ImageItem {
  return {
    id,
    file: new File([id], `${id}.png`, { type: 'image/png' }),
    flipHorizontal: false,
    flipVertical: false,
    pageOrientation,
    previewUrl: `blob:${id}`,
    rotationDegrees: 0,
    selected,
  };
}
