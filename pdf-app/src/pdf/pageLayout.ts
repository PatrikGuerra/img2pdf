import { PageSizes } from 'pdf-lib';
import { IMAGE_FITS, PAGE_ORIENTATIONS, PAGE_SIZES } from '../constants/pdfOptions';
import type { ImageDimensions, ImageFit, ImagePlacement, JpegOrientation, PdfOptions, PdfPageSize } from '../types/pdf';

export function mmToPdfPoints(mm: number): number {
  return Number(mm) * 72 / 25.4;
}

export function getFixedPageSize(options: Pick<PdfOptions, 'pageSize' | 'orientation'>): PdfPageSize | undefined {
  let pageSize: PdfPageSize;

  switch (options.pageSize) {
    case PAGE_SIZES.A4:
      pageSize = [...PageSizes.A4] as PdfPageSize;
      break;
    case PAGE_SIZES.LETTER:
      pageSize = [...PageSizes.Letter] as PdfPageSize;
      break;
    case PAGE_SIZES.OFICIO:
      pageSize = [mmToPdfPoints(216), mmToPdfPoints(330)];
      break;
    default:
      return undefined;
  }

  if (options.orientation === PAGE_ORIENTATIONS.LANDSCAPE) {
    return [pageSize[1], pageSize[0]];
  }

  return pageSize;
}

export function getPageSize(options: PdfOptions, imageDimensions: ImageDimensions, orientation: JpegOrientation = 1): PdfPageSize {
  if (options.pageSize === PAGE_SIZES.IMAGE) {
    return [imageDimensions.width, imageDimensions.height];
  }

  const pageSize = getFixedPageSize(options);
  if (!pageSize) {
    throw new Error(`Unsupported page size: ${options.pageSize}`);
  }

  if (orientation === 6 || orientation === 8) {
    return [pageSize[1], pageSize[0]];
  }

  return pageSize;
}

export function getAspectRatio(options: Pick<PdfOptions, 'pageSize' | 'orientation'>): number {
  const pageSize = getFixedPageSize(options);
  return pageSize ? pageSize[0] / pageSize[1] : 1;
}

export function getImagePlacement(
  pageWidth: number,
  pageHeight: number,
  imageWidth: number,
  imageHeight: number,
  margin: number,
  imageFit: ImageFit = IMAGE_FITS.CONTAIN,
): ImagePlacement {
  const safeMargin = Math.max(0, Number(margin) || 0);
  const availableWidth = Math.max(1, pageWidth - safeMargin * 2);
  const availableHeight = Math.max(1, pageHeight - safeMargin * 2);
  const scale = imageFit === IMAGE_FITS.COVER ? Math.max : Math.min;
  const scaleFactor = scale(availableWidth / imageWidth, availableHeight / imageHeight);
  const width = imageWidth * scaleFactor;
  const height = imageHeight * scaleFactor;

  return {
    x: safeMargin + availableWidth / 2 - width / 2,
    y: safeMargin + availableHeight / 2 - height / 2,
    width,
    height,
    scaleFactor,
  };
}
