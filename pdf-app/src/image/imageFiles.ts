import type { ImageItem, RotationDegrees } from '../types/pdf';

const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/x-png', 'image/jpeg']);
type CreateObjectUrl = (file: File) => string;
type RevokeObjectUrl = (url: string) => void;

export function isSupportedImageFile(file: File | undefined | null): file is File {
  return Boolean(file && SUPPORTED_IMAGE_TYPES.has(file.type));
}

export function createImageItems(fileList: FileList | File[] | null | undefined, createObjectUrl: CreateObjectUrl = getCreateObjectUrl()): ImageItem[] {
  return Array.from(fileList ?? [])
    .filter(isSupportedImageFile)
    .map((file) => ({
      id: createImageId(),
      file,
      previewUrl: createObjectUrl(file),
      rotationDegrees: 0,
      selected: false,
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
