import { degrees, PDFDocument } from 'pdf-lib';
import type { PDFDocument as PdfLibDocument, PDFImage, PDFPage } from 'pdf-lib';
import EXIF from 'exif-js';
import { DEFAULT_PDF_OPTIONS, PAGE_SIZES } from '../constants/pdfOptions';
import { canvasToBlob, loadImage } from '../image/imageFiles';
import { getImagePlacement, getPageSize } from './pageLayout';
import type { FetchedImageData, ImageItem, JpegOrientation, PdfOptions, PdfProgress } from '../types/pdf';

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
    const imageData = await fetchImageData(
      imageItem.previewUrl,
      resolvedOptions.compressImages ? normalizeImageQuality(resolvedOptions.imageQuality) / 100 : undefined,
    );
    const mime = imageData.mime || imageItem.file?.type;
    const jpegOrientation = readJpegOrientation(imageData.arrayBuffer, mime);
    const embeddedImage = await embedImage(pdfDoc, imageData.arrayBuffer, mime);
    const pageSize = getPageSize(resolvedOptions, embeddedImage, jpegOrientation);
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

export async function fetchImageData(previewUrl: string, quality?: number): Promise<FetchedImageData> {
  if (!quality) {
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

  canvas.width = image.width;
  canvas.height = image.height;
  context.drawImage(image, 0, 0, image.width, image.height);

  const blob = await canvasToBlob(canvas, quality);
  return {
    arrayBuffer: await blob.arrayBuffer(),
    mime: 'image/jpeg',
  };
}

function normalizeImageQuality(imageQuality: number): number {
  const quality = Number(imageQuality) || DEFAULT_PDF_OPTIONS.imageQuality;
  return Math.min(100, Math.max(10, quality));
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
