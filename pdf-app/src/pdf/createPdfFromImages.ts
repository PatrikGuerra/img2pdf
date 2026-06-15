import { degrees, PDFDocument } from 'pdf-lib';
import type { PDFDocument as PdfLibDocument, PDFImage, PDFPage } from 'pdf-lib';
import EXIF from 'exif-js';
import { DEFAULT_PDF_OPTIONS, PAGE_SIZES } from '../constants/pdfOptions';
import { canvasToBlob, loadImage } from '../image/imageFiles';
import { getImagePlacement, getPageSize } from './pageLayout';
import type { FetchedImageData, ImageItem, JpegOrientation, PdfOptions, PdfProgress, RotationDegrees } from '../types/pdf';

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
  };
  const pdfDoc = await PDFDocument.create();
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
    const jpegOrientation = hasManualTransform ? 1 : readJpegOrientation(imageData.arrayBuffer, mime);
    const embeddedImage = await embedImage(pdfDoc, imageData.arrayBuffer, mime);
    const imageOptions = {
      ...resolvedOptions,
      orientation: imageItem.pageOrientation || resolvedOptions.orientation,
    };
    const pageSize = getPageSize(imageOptions, embeddedImage, jpegOrientation);
    const page = pdfDoc.addPage(pageSize);

    if (resolvedOptions.pageSize === PAGE_SIZES.IMAGE) {
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: embeddedImage.width,
        height: embeddedImage.height,
      });
    } else {
      const placement = getImagePlacement(
        page.getWidth(),
        page.getHeight(),
        embeddedImage.width,
        embeddedImage.height,
        resolvedOptions.margin,
        resolvedOptions.imageFit,
      );

      page.drawImage(embeddedImage, placement);
    }

    applyJpegOrientation(page, jpegOrientation);
    onProgress?.({ current: index + 1, total, image: imageItem });
  }

  return pdfDoc.save();
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

function readJpegOrientation(arrayBuffer: ArrayBuffer, mime: string | null | undefined): JpegOrientation {
  if (mime !== 'image/jpeg') {
    return 1;
  }

  try {
    const exif = EXIF.readFromBinaryFile(arrayBuffer);
    return Number(exif?.Orientation) || 1;
  } catch (error) {
    console.error(error);
    return 1;
  }
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
