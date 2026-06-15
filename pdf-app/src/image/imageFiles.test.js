import { expect, test, vi } from 'vitest';
import {
  clearImageSelection,
  createImageItems,
  deleteImageById,
  isSupportedImageFile,
  moveImageBefore,
  revokeImageItems,
  selectImageById,
} from './imageFiles';

test('accepts only PNG and JPEG files', () => {
  expect(isSupportedImageFile(new File(['png'], 'image.png', { type: 'image/png' }))).toBe(true);
  expect(isSupportedImageFile(new File(['png'], 'image.png', { type: 'image/x-png' }))).toBe(true);
  expect(isSupportedImageFile(new File(['jpg'], 'image.jpg', { type: 'image/jpeg' }))).toBe(true);
  expect(isSupportedImageFile(new File(['txt'], 'notes.txt', { type: 'text/plain' }))).toBe(false);
});

test('creates image items only for supported files', () => {
  const createObjectUrl = vi.fn((file) => `blob:${file.name}`);
  const image = new File(['png'], 'image.png', { type: 'image/png' });
  const document = new File(['txt'], 'notes.txt', { type: 'text/plain' });

  const items = createImageItems([image, document], createObjectUrl);

  expect(items).toEqual([
    expect.objectContaining({
      file: image,
      previewUrl: 'blob:image.png',
      selected: false,
    }),
  ]);
  expect(createObjectUrl).toHaveBeenCalledTimes(1);
});

test('handles empty file lists and files without mime type', () => {
  const createObjectUrl = vi.fn();

  expect(createImageItems(null, createObjectUrl)).toEqual([]);
  expect(createImageItems([], createObjectUrl)).toEqual([]);
  expect(createImageItems([new File(['raw'], 'unknown', { type: '' })], createObjectUrl)).toEqual([]);
  expect(createObjectUrl).not.toHaveBeenCalled();
});

test('revokes preview URLs for existing image items only', () => {
  const revokeObjectUrl = vi.fn();

  revokeImageItems([{ previewUrl: 'blob:a' }, { previewUrl: '' }, undefined, { previewUrl: 'blob:b' }], revokeObjectUrl);

  expect(revokeObjectUrl).toHaveBeenCalledTimes(2);
  expect(revokeObjectUrl).toHaveBeenNthCalledWith(1, 'blob:a');
  expect(revokeObjectUrl).toHaveBeenNthCalledWith(2, 'blob:b');
});

test('selects and clears image selection immutably', () => {
  const images = [{ id: 'a', selected: false }, { id: 'b', selected: true }];

  expect(selectImageById(images, 'a')).toEqual([{ id: 'a', selected: true }, { id: 'b', selected: false }]);
  expect(clearImageSelection(images)).toEqual([{ id: 'a', selected: false }, { id: 'b', selected: false }]);
  expect(images).toEqual([{ id: 'a', selected: false }, { id: 'b', selected: true }]);
});

test('moves a dropped image before the target image', () => {
  const images = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  expect(moveImageBefore(images, 'c', 'a')).toEqual([{ id: 'c' }, { id: 'a' }, { id: 'b' }]);
  expect(moveImageBefore(images, 'b', 'b')).toBe(images);
  expect(moveImageBefore(images, '', 'a')).toBe(images);
  expect(moveImageBefore(images, 'missing', 'a')).toBe(images);
  expect(moveImageBefore(images, 'a', 'missing')).toBe(images);
  expect(moveImageBefore(images, 'a', '')).toBe(images);
  expect(moveImageBefore(images, 'c', 'a')).toHaveLength(3);
});

test('deletes the selected image by id', () => {
  const images = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  expect(deleteImageById(images, 'b')).toEqual([{ id: 'a' }, { id: 'c' }]);
});
