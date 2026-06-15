import { PAGE_ORIENTATIONS } from '../constants/pdfOptions';
import { getOrientedDimensions, readJpegExifOrientation } from './exifOrientation';
import type { FlipAxis, ImageDimensions, ImageItem, JpegOrientation, PageOrientation, RotationDegrees } from '../types/pdf';
import type { ImagePreparationProgress, UploadSourceType } from '../types/upload';

const SUPPORTED_RASTER_IMAGE_TYPES = new Set(['image/png', 'image/x-png', 'image/jpeg']);
const HEIC_IMAGE_TYPES = new Set(['image/heic', 'image/heif']);
const HEIC_EXTENSIONS = new Set(['heic', 'heif']);
const HEIC_CONVERSION_QUALITY = 0.95;
type CreateObjectUrl = (file: File) => string;
type LoadImageDimensions = (src: string) => Promise<ImageDimensions>;
type ConvertHeicToJpeg = (file: File, quality?: number) => Promise<File>;
type ReadJpegOrientation = (file: File) => Promise<JpegOrientation>;
type RevokeObjectUrl = (url: string) => void;
type OnImagePreparationProgress = (progress: ImagePreparationProgress) => void;

export interface CreateImageItemsReport {
  convertedCount: number;
  ignoredCount: number;
  imageItems: ImageItem[];
}

export function isSupportedImageFile(file: File | undefined | null): file is File {
  return Boolean(file && (SUPPORTED_RASTER_IMAGE_TYPES.has(file.type) || isHeicImageFile(file)));
}

export function isHeicImageFile(file: File | undefined | null): file is File {
  if (!file) {
    return false;
  }

  if (HEIC_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return true;
  }

  const extension = getFileExtension(file.name);
  return Boolean(extension && HEIC_EXTENSIONS.has(extension));
}

export function getImageSourceType(file: File | undefined | null): UploadSourceType {
  if (!file) {
    return 'UNKNOWN';
  }

  const heicKind = getHeicImageKind(file);
  if (heicKind) {
    return heicKind;
  }

  const type = file.type.toLowerCase();
  if (type === 'image/png' || type === 'image/x-png') {
    return 'PNG';
  }

  if (type === 'image/jpeg') {
    return 'JPEG';
  }

  return 'UNKNOWN';
}

export async function createImageItems(
  fileList: FileList | File[] | null | undefined,
  createObjectUrl: CreateObjectUrl = getCreateObjectUrl(),
  fallbackOrientation: PageOrientation = PAGE_ORIENTATIONS.PORTRAIT,
  loadDimensions: LoadImageDimensions = loadImageDimensions,
): Promise<ImageItem[]> {
  const report = await createImageItemsReport(fileList, createObjectUrl, fallbackOrientation, loadDimensions);
  return report.imageItems;
}

export async function createImageItemsReport(
  fileList: FileList | File[] | null | undefined,
  createObjectUrl: CreateObjectUrl = getCreateObjectUrl(),
  fallbackOrientation: PageOrientation = PAGE_ORIENTATIONS.PORTRAIT,
  loadDimensions: LoadImageDimensions = loadImageDimensions,
  convertHeic: ConvertHeicToJpeg = convertHeicToJpeg,
  readOrientation: ReadJpegOrientation = readJpegExifOrientation,
  onProgress?: OnImagePreparationProgress,
): Promise<CreateImageItemsReport> {
  const files = Array.from(fileList ?? []);
  let convertedCount = 0;
  let ignoredCount = 0;
  const imageItems: ImageItem[] = [];

  for (const [index, originalFile] of files.entries()) {
    const sourceType = getImageSourceType(originalFile);
    onProgress?.({
      file: originalFile,
      index,
      message: 'Preparing files...',
      sourceType,
      status: 'queued',
    });

    if (!isSupportedImageFile(originalFile)) {
      ignoredCount += 1;
      onProgress?.({
        file: originalFile,
        index,
        message: 'Ignored: not PNG/JPEG/HEIC/HEIF.',
        sourceType,
        status: 'ignored',
      });
      continue;
    }

    const convertedFrom = getHeicImageKind(originalFile);
    let file = originalFile;
    let sourceFile: File | undefined;

    if (convertedFrom) {
      onProgress?.({
        file: originalFile,
        index,
        message: 'Converting HEIC/HEIF to JPEG locally...',
        sourceType,
        status: 'converting',
      });

      try {
        file = await convertHeic(originalFile, HEIC_CONVERSION_QUALITY);
        sourceFile = originalFile;
        convertedCount += 1;
      } catch {
        ignoredCount += 1;
        onProgress?.({
          file: originalFile,
          index,
          message: 'Conversion failed. Try exporting this image as JPEG.',
          sourceType,
          status: 'error',
        });
        continue;
      }
    }

    const previewUrl = createObjectUrl(file);
    const item: ImageItem = {
      convertedFrom,
      file,
      flipHorizontal: false,
      flipVertical: false,
      id: createImageId(),
      pageOrientation: fallbackOrientation,
      previewUrl,
      rotationDegrees: 0,
      selected: false,
      sourceFile,
    };

    try {
      const naturalDimensions = await loadDimensions(previewUrl);
      const exifOrientation = await readOrientation(file).catch(() => 1 as JpegOrientation);
      const orientedDimensions = getOrientedDimensions(naturalDimensions, exifOrientation);
      imageItems.push({
        ...item,
        naturalDimensions: orientedDimensions,
        pageOrientation: getOrientationFromDimensions(orientedDimensions, fallbackOrientation),
      });
    } catch {
      imageItems.push(item);
    }

    onProgress?.({
      file: originalFile,
      index,
      message: convertedFrom ? 'Converted to JPEG locally.' : 'Ready',
      previewUrl,
      sourceType,
      status: 'ready',
    });
  }

  return {
    convertedCount,
    ignoredCount,
    imageItems,
  };
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

export async function convertHeicToJpeg(file: File, quality = HEIC_CONVERSION_QUALITY): Promise<File> {
  const { default: heic2any } = await import('heic2any');
  const result = await heic2any({
    blob: file,
    quality,
    toType: 'image/jpeg',
  });
  const blob = Array.isArray(result) ? result[0] : result;

  if (!blob) {
    throw new Error('Unable to convert HEIC/HEIF image.');
  }

  return new File([blob], getConvertedJpegFileName(file.name), {
    lastModified: file.lastModified,
    type: 'image/jpeg',
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

function getHeicImageKind(file: File): 'HEIC' | 'HEIF' | undefined {
  const type = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  if (type === 'image/heif' || extension === 'heif') {
    return 'HEIF';
  }

  if (type === 'image/heic' || extension === 'heic') {
    return 'HEIC';
  }

  return undefined;
}

function getFileExtension(fileName: string): string | undefined {
  const extension = fileName.toLowerCase().split('.').pop();
  return extension && extension !== fileName.toLowerCase() ? extension : undefined;
}

function getConvertedJpegFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.(heic|heif)$/i, '');
  return `${withoutExtension || 'image'}.jpg`;
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
