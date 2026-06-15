import { PageSizes } from 'pdf-lib';
import { IMAGE_FITS, PAGE_ORIENTATIONS, PAGE_SIZES } from '../constants/pdfOptions';

export function mmToPdfPoints(mm) {
  return Number(mm) * 72 / 25.4;
}

export function getFixedPageSize(options) {
  let pageSize;

  switch (options.pageSize) {
    case PAGE_SIZES.A4:
      pageSize = [...PageSizes.A4];
      break;
    case PAGE_SIZES.LETTER:
      pageSize = [...PageSizes.Letter];
      break;
    case PAGE_SIZES.OFICIO:
      pageSize = [mmToPdfPoints(216), mmToPdfPoints(330)];
      break;
    default:
      return undefined;
  }

  if (options.orientation === PAGE_ORIENTATIONS.LANDSCAPE) {
    return pageSize.reverse();
  }

  return pageSize;
}

export function getPageSize(options, imageDimensions, orientation = 1) {
  if (options.pageSize === PAGE_SIZES.IMAGE) {
    return [imageDimensions.width, imageDimensions.height];
  }

  const pageSize = getFixedPageSize(options);

  if (orientation === 6 || orientation === 8) {
    return [pageSize[1], pageSize[0]];
  }

  return pageSize;
}

export function getAspectRatio(options) {
  const pageSize = getFixedPageSize(options);
  return pageSize ? pageSize[0] / pageSize[1] : 1;
}

export function getImagePlacement(pageWidth, pageHeight, imageWidth, imageHeight, margin, imageFit = IMAGE_FITS.CONTAIN) {
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
