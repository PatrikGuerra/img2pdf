import { PAGE_ORIENTATIONS } from '../constants/pdfOptions';
import type { FlipAxis, ImageDimensions, ImageItem, PageOrientation, RotationDegrees } from '../types/pdf';

const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/x-png', 'image/jpeg']);
type CreateObjectUrl = (file: File) => string;
type LoadImageDimensions = (src: string) => Promise<ImageDimensions>;
type RevokeObjectUrl = (url: string) => void;

export function isSupportedImageFile(file: File | undefined | null): file is File {
  return Boolean(file && SUPPORTED_IMAGE_TYPES.has(file.type));
}

export async function createImageItems(
  fileList: FileList | File[] | null | undefined,
  createObjectUrl: CreateObjectUrl = getCreateObjectUrl(),
  fallbackOrientation: PageOrientation = PAGE_ORIENTATIONS.PORTRAIT,
  loadDimensions: LoadImageDimensions = loadImageDimensions,
): Promise<ImageItem[]> {
  const items = Array.from(fileList ?? [])
    .filter(isSupportedImageFile)
    .map((file) => ({
      id: createImageId(),
      file,
      flipHorizontal: false,
      flipVertical: false,
      pageOrientation: fallbackOrientation,
      previewUrl: createObjectUrl(file),
      rotationDegrees: 0 as const,
      selected: false,
    }));

  return Promise.all(items.map(async (item) => {
    try {
      const naturalDimensions = await loadDimensions(item.previewUrl);
      return {
        ...item,
        naturalDimensions,
        pageOrientation: getOrientationFromDimensions(naturalDimensions, fallbackOrientation),
      };
    } catch {
      return item;
    }
  }));
}

export function revokeImageItems(items: Array<Pick<ImageItem, 'previewUrl'> | undefined> | null | undefined, revokeObjectUrl: RevokeObjectUrl | undefined = getRevokeObjectUrl()): void {
  if (!revokeObjectUrl) {
    return;
  }

  for (const item of items ?? []) {
    if (item?.previewUrl) {
      revokeObjectUrl(item.previewUrl);
    }
  }
}

export function selectImageById(images: ImageItem[], id: string): ImageItem[] {
  return images.map((image) => ({
    ...image,
    selected: image.id === id,
  }));
}

export function clearImageSelection(images: ImageItem[]): ImageItem[] {
  return images.map((image) => ({
    ...image,
    selected: false,
  }));
}

export function deleteImageById(images: ImageItem[], id: string): ImageItem[] {
  return images.filter((image) => image.id !== id);
}

export function moveImageByOffset(images: ImageItem[], id: string, offset: number): ImageItem[] {
  if (!id || !Number.isFinite(offset) || offset === 0) {
    return images;
  }

  const currentIndex = images.findIndex((image) => image.id === id);
  const targetIndex = currentIndex + offset;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= images.length) {
    return images;
  }

  const nextImages = [...images];
  const [image] = nextImages.splice(currentIndex, 1);
  nextImages.splice(targetIndex, 0, image);

  return nextImages;
}

export function moveImageBefore(images: ImageItem[], droppedId: string, targetId: string): ImageItem[] {
  if (!droppedId || !targetId || droppedId === targetId) {
    return images;
  }

  const droppedIndex = images.findIndex((image) => image.id === droppedId);
  const targetIndex = images.findIndex((image) => image.id === targetId);

  if (droppedIndex < 0 || targetIndex < 0) {
    return images;
  }

  const nextImages = [...images];
  const [droppedImage] = nextImages.splice(droppedIndex, 1);
  const nextTargetIndex = nextImages.findIndex((image) => image.id === targetId);
  nextImages.splice(nextTargetIndex, 0, droppedImage);

  return nextImages;
}

export function rotateImageById(images: ImageItem[], id: string): ImageItem[] {
  if (!id) {
    return images;
  }

  return images.map((image) => {
    if (image.id !== id) {
      return image;
    }

    return {
      ...image,
      rotationDegrees: getNextRotation(image.rotationDegrees),
    };
  });
}

export function flipImageById(images: ImageItem[], id: string, axis: FlipAxis): ImageItem[] {
  if (!id) {
    return images;
  }

  return images.map((image) => {
    if (image.id !== id) {
      return image;
    }

    if (axis === 'horizontal') {
      return {
        ...image,
        flipHorizontal: !image.flipHorizontal,
      };
    }

    return {
      ...image,
      flipVertical: !image.flipVertical,
    };
  });
}

export function setImageOrientationById(images: ImageItem[], id: string, pageOrientation: PageOrientation): ImageItem[] {
  if (!id) {
    return images;
  }

  return images.map((image) => (
    image.id === id ? { ...image, pageOrientation } : image
  ));
}

export function setAllImageOrientations(images: ImageItem[], pageOrientation: PageOrientation): ImageItem[] {
  return images.map((image) => ({
    ...image,
    pageOrientation,
  }));
}

export function hasMixedImageOrientations(images: ImageItem[]): boolean {
  return new Set(images.map((image) => image.pageOrientation)).size > 1;
}

export function getOrientationFromDimensions(
  dimensions: ImageDimensions | undefined,
  fallbackOrientation: PageOrientation = PAGE_ORIENTATIONS.PORTRAIT,
): PageOrientation {
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return fallbackOrientation;
  }

  return dimensions.width > dimensions.height ? PAGE_ORIENTATIONS.LANDSCAPE : PAGE_ORIENTATIONS.PORTRAIT;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('Image loading is not available in this environment.'));
      return;
    }

    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load image.'));
    image.src = src;
  });
}

export async function loadImageDimensions(src: string): Promise<ImageDimensions> {
  const image = await loadImage(src);

  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality?: number, mime = 'image/jpeg'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Unable to encode image.'));
        }
      }, mime, quality);
    } catch (error) {
      reject(error);
    }
  });
}

function getNextRotation(rotationDegrees: RotationDegrees | undefined): RotationDegrees {
  const currentRotation = rotationDegrees ?? 0;
  return ((currentRotation + 90) % 360) as RotationDegrees;
}

function createImageId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.random() * 16 | 0;
    const value = character === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
}

function getCreateObjectUrl(): CreateObjectUrl {
  const createObjectUrl = globalThis.URL?.createObjectURL;
  if (!createObjectUrl) {
    throw new Error('Object URLs are not available in this environment.');
  }

  return createObjectUrl.bind(globalThis.URL);
}

function getRevokeObjectUrl(): RevokeObjectUrl | undefined {
  return globalThis.URL?.revokeObjectURL?.bind(globalThis.URL);
}
