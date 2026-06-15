import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { PDFFont, PDFDocument as PdfLibDocument, PDFImage, PDFPage } from 'pdf-lib';
import { DEFAULT_PDF_OPTIONS, IMAGE_FITS, PAGE_NUMBER_PLACEMENTS, PAGE_SIZES } from '../constants/pdfOptions';
import { readJpegExifOrientationFromArrayBuffer } from '../image/exifOrientation';
import { canvasToBlob, loadImage } from '../image/imageFiles';
import { getImagePlacement, getPageNumberTextPlacement, getPageSize, PAGE_NUMBER_FONT_SIZE } from './pageLayout';
import type { FetchedImageData, ImageItem, JpegOrientation, PageNumberingOptions, PdfOptions, PdfProgress, RotationDegrees } from '../types/pdf';

interface ImageTransform {
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  rotationDegrees?: RotationDegrees;
}

export async function createPdfFromImages(
  images: ImageItem[],
  options: PdfOptions = DEFAULT_PDF_OPTIONS,
  onProgress?: (progress: PdfProgress) => void,
): Promise<Uint8Array> {
  const resolvedOptions = {
    ...DEFAULT_PDF_OPTIONS,
    ...options,
    pageNumbering: {
      ...DEFAULT_PDF_OPTIONS.pageNumbering,
      ...options.pageNumbering,
    },
  };
  const pdfDoc = await PDFDocument.create();
  const pageNumberFont = resolvedOptions.pageNumbering.enabled
    ? await pdfDoc.embedFont(StandardFonts.Helvetica)
    : undefined;
  const total = images.length;

  for (let index = 0; index < total; index += 1) {
    const imageItem = images[index];
    const manualRotation = normalizeRotation(imageItem.rotationDegrees);
    const hasManualTransform = manualRotation !== 0 || imageItem.flipHorizontal || imageItem.flipVertical;
    const imageData = await fetchImageData(
      imageItem.previewUrl,
      resolvedOptions.compressImages ? normalizeImageQuality(resolvedOptions.imageQuality) / 100 : undefined,
      {
        flipHorizontal: imageItem.flipHorizontal,
        flipVertical: imageItem.flipVertical,
        rotationDegrees: manualRotation,
      },
      imageItem.file?.type,
    );
    const mime = imageData.mime || imageItem.file?.type;
    const jpegOrientation = hasManualTransform ? 1 : readJpegExifOrientationFromArrayBuffer(imageData.arrayBuffer, mime);
    const embeddedImage = await embedImage(pdfDoc, imageData.arrayBuffer, mime);
    const imageOptions = {
      ...resolvedOptions,
      orientation: imageItem.pageOrientation || resolvedOptions.orientation,
    };
    const pageSize = getPageSize(imageOptions, embeddedImage, jpegOrientation);
    const page = pdfDoc.addPage(pageSize);
    drawPageBackground(page, resolvedOptions.pageBackgroundColor);

    if (resolvedOptions.pageSize === PAGE_SIZES.IMAGE) {
      if (usesReservedPageNumbering(resolvedOptions.pageNumbering)) {
        const placement = getImagePlacement(
          page.getWidth(),
          page.getHeight(),
          embeddedImage.width,
          embeddedImage.height,
          0,
          IMAGE_FITS.CONTAIN,
          resolvedOptions.pageNumbering,
        );

        page.drawImage(embeddedImage, placement);
      } else {
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: embeddedImage.width,
          height: embeddedImage.height,
        });
      }
    } else {
      const placement = getImagePlacement(
        page.getWidth(),
        page.getHeight(),
        embeddedImage.width,
        embeddedImage.height,
        resolvedOptions.margin,
        resolvedOptions.imageFit,
        resolvedOptions.pageNumbering,
      );

      page.drawImage(embeddedImage, placement);
    }

    drawPageNumber(page, pageNumberFont, String(index + 1), resolvedOptions.pageNumbering);
    applyJpegOrientation(page, jpegOrientation);
    onProgress?.({ current: index + 1, total, image: imageItem });
  }

  return pdfDoc.save();
}

function drawPageNumber(
  page: PDFPage,
  font: PDFFont | undefined,
  text: string,
  pageNumbering: PageNumberingOptions,
): void {
  if (!pageNumbering.enabled || !font) {
    return;
  }

  const textWidth = font.widthOfTextAtSize(text, PAGE_NUMBER_FONT_SIZE);
  const placement = getPageNumberTextPlacement(page.getWidth(), page.getHeight(), textWidth, pageNumbering);

  page.drawText(text, {
    ...placement,
    color: rgb(0, 0, 0),
    font,
    size: PAGE_NUMBER_FONT_SIZE,
  });
}

function usesReservedPageNumbering(pageNumbering: PageNumberingOptions): boolean {
  return pageNumbering.enabled && pageNumbering.placement === PAGE_NUMBER_PLACEMENTS.RESERVED;
}

function drawPageBackground(page: PDFPage, pageBackgroundColor: string | null): void {
  const normalizedColor = normalizePageBackgroundColor(pageBackgroundColor);

  if (!normalizedColor) {
    return;
  }

  const { blue, green, red } = hexToPdfRgb(normalizedColor);

  page.drawRectangle({
    color: rgb(red, green, blue),
    height: page.getHeight(),
    width: page.getWidth(),
    x: 0,
    y: 0,
  });
}

function normalizePageBackgroundColor(value: string | null | undefined): string | null {
  if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    return null;
  }

  return value.toLowerCase();
}

function hexToPdfRgb(value: string): { blue: number; green: number; red: number } {
  return {
    blue: Number.parseInt(value.slice(5, 7), 16) / 255,
    green: Number.parseInt(value.slice(3, 5), 16) / 255,
    red: Number.parseInt(value.slice(1, 3), 16) / 255,
  };
}

export async function fetchImageData(
  previewUrl: string,
  quality?: number,
  transform: ImageTransform = {},
  preferredMime?: string,
): Promise<FetchedImageData> {
  const manualRotation = normalizeRotation(transform.rotationDegrees);
  const flipHorizontal = Boolean(transform.flipHorizontal);
  const flipVertical = Boolean(transform.flipVertical);
  const hasManualTransform = manualRotation !== 0 || flipHorizontal || flipVertical;

  if (quality === undefined && !hasManualTransform) {
    const response = await fetch(previewUrl);
    return {
      arrayBuffer: await response.arrayBuffer(),
      mime: response.headers.get('content-type'),
    };
  }

  const image = await loadImage(previewUrl);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available.');
  }

  const swapsDimensions = manualRotation === 90 || manualRotation === 270;
  canvas.width = swapsDimensions ? image.height : image.width;
  canvas.height = swapsDimensions ? image.width : image.height;
  drawImageToCanvas(context, image, canvas, {
    flipHorizontal,
    flipVertical,
    rotationDegrees: manualRotation,
  });

  const outputMime = getCanvasMime(preferredMime, quality);
  const blob = outputMime === 'image/png'
    ? await canvasToBlob(canvas, undefined, outputMime)
    : await canvasToBlob(canvas, quality);
  return {
    arrayBuffer: await blob.arrayBuffer(),
    mime: outputMime,
  };
}

function normalizeImageQuality(imageQuality: number): number {
  const quality = Number(imageQuality) || DEFAULT_PDF_OPTIONS.imageQuality;
  return Math.min(100, Math.max(10, quality));
}

function normalizeRotation(rotationDegrees: RotationDegrees | undefined): RotationDegrees {
  if (rotationDegrees === 90 || rotationDegrees === 180 || rotationDegrees === 270) {
    return rotationDegrees;
  }

  return 0;
}

function getCanvasMime(preferredMime: string | undefined, quality: number | undefined): 'image/jpeg' | 'image/png' {
  if (quality !== undefined) {
    return 'image/jpeg';
  }

  return preferredMime === 'image/png' || preferredMime === 'image/x-png' ? 'image/png' : 'image/jpeg';
}

function drawImageToCanvas(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  transform: Required<ImageTransform>,
): void {
  const hasManualTransform = transform.rotationDegrees !== 0 || transform.flipHorizontal || transform.flipVertical;

  if (!hasManualTransform) {
    context.drawImage(image, 0, 0, image.width, image.height);
    return;
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(transform.rotationDegrees * Math.PI / 180);
  context.scale(transform.flipHorizontal ? -1 : 1, transform.flipVertical ? -1 : 1);
  context.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);
}

async function embedImage(pdfDoc: PdfLibDocument, arrayBuffer: ArrayBuffer, mime: string | null | undefined): Promise<PDFImage> {
  if (mime === 'image/jpeg') {
    return pdfDoc.embedJpg(arrayBuffer);
  }

  if (mime === 'image/png' || mime === 'image/x-png') {
    return pdfDoc.embedPng(arrayBuffer);
  }

  throw new Error(`Unsupported image type: ${mime || 'unknown'}`);
}

function applyJpegOrientation(page: PDFPage, jpegOrientation: JpegOrientation): void {
  switch (jpegOrientation) {
    case 6:
      page.setRotation(degrees(90));
      break;
    case 3:
      page.setRotation(degrees(180));
      break;
    case 8:
      page.setRotation(degrees(270));
      break;
    default:
      break;
  }
}
