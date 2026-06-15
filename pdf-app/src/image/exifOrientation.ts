import EXIF from 'exif-js';
import type { ImageDimensions, JpegOrientation } from '../types/pdf';

export function readJpegExifOrientationFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  mime: string | null | undefined,
  logErrors = true,
): JpegOrientation {
  if (mime !== 'image/jpeg') {
    return 1;
  }

  try {
    const exif = EXIF.readFromBinaryFile(arrayBuffer);
    return Number(exif?.Orientation) || 1;
  } catch (error) {
    if (logErrors) {
      console.error(error);
    }
    return 1;
  }
}

export async function readJpegExifOrientation(file: File): Promise<JpegOrientation> {
  if (file.type !== 'image/jpeg') {
    return 1;
  }

  return readJpegExifOrientationFromArrayBuffer(await file.arrayBuffer(), file.type, false);
}

export function getOrientedDimensions(
  dimensions: ImageDimensions,
  orientation: JpegOrientation,
): ImageDimensions {
  if (orientation === 6 || orientation === 8) {
    return {
      width: dimensions.height,
      height: dimensions.width,
    };
  }

  return dimensions;
}
