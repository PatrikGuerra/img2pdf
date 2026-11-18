import { DEFAULT_PDF_OPTIONS } from '../constants/pdfOptions';
import type { PdfOptions } from '../types/pdf';

const KEY = 'img2pdf-options';

export function loadPreferences(): PdfOptions {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    const numbers = saved.pageNumbering || {};
    return {
      pageSize: ['A4', 'LETTER', 'OFICIO', 'IMAGE'].includes(saved.pageSize) ? saved.pageSize : DEFAULT_PDF_OPTIONS.pageSize,
      orientation: ['PORTRAIT', 'LANDSCAPE'].includes(saved.orientation) ? saved.orientation : DEFAULT_PDF_OPTIONS.orientation,
      imageFit: ['CONTAIN', 'COVER'].includes(saved.imageFit) ? saved.imageFit : DEFAULT_PDF_OPTIONS.imageFit,
      margin: typeof saved.margin === 'number' && Number.isFinite(saved.margin) && saved.margin >= 0 ? saved.margin : DEFAULT_PDF_OPTIONS.margin,
      compressImages: typeof saved.compressImages === 'boolean' ? saved.compressImages : DEFAULT_PDF_OPTIONS.compressImages,
      imageQuality: typeof saved.imageQuality === 'number' && saved.imageQuality >= 10 && saved.imageQuality <= 100 ? saved.imageQuality : DEFAULT_PDF_OPTIONS.imageQuality,
      maxImageDimension: Number.isInteger(saved.maxImageDimension) && saved.maxImageDimension >= 0 && saved.maxImageDimension <= 10000 ? saved.maxImageDimension : 0,
      pageBackgroundColor: typeof saved.pageBackgroundColor === 'string' && /^#[0-9a-f]{6}$/i.test(saved.pageBackgroundColor) ? saved.pageBackgroundColor : null,
      pageNumbering: {
        enabled: typeof numbers.enabled === 'boolean' ? numbers.enabled : false,
        horizontalAlignment: ['LEFT', 'CENTER', 'RIGHT'].includes(numbers.horizontalAlignment) ? numbers.horizontalAlignment : DEFAULT_PDF_OPTIONS.pageNumbering.horizontalAlignment,
        verticalPosition: ['TOP', 'BOTTOM'].includes(numbers.verticalPosition) ? numbers.verticalPosition : DEFAULT_PDF_OPTIONS.pageNumbering.verticalPosition,
        placement: ['RESERVED', 'OVERLAY'].includes(numbers.placement) ? numbers.placement : DEFAULT_PDF_OPTIONS.pageNumbering.placement,
      },
    };
  } catch {
    return DEFAULT_PDF_OPTIONS;
  }
}

export function savePreferences(options: PdfOptions): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(options));
  } catch {
    // Storage can be disabled or full; editing remains available for this session.
  }
}
