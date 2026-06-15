import type { ImageFit, PageOrientation, PageSize, PdfOptions } from '../types/pdf';

export const PAGE_SIZES = Object.freeze({
  A4: 'A4',
  LETTER: 'LETTER',
  OFICIO: 'OFICIO',
  IMAGE: 'IMAGE',
} as const satisfies Record<string, PageSize>);

export const PAGE_ORIENTATIONS = Object.freeze({
  PORTRAIT: 'PORTRAIT',
  LANDSCAPE: 'LANDSCAPE',
} as const satisfies Record<string, PageOrientation>);

export const PAGE_MARGINS = Object.freeze({
  NONE: 0,
  MM_5: 5 * 72 / 25.4,
  MM_10: 10 * 72 / 25.4,
  MM_20: 20 * 72 / 25.4,
} as const);

export const IMAGE_FITS = Object.freeze({
  CONTAIN: 'CONTAIN',
  COVER: 'COVER',
} as const satisfies Record<string, ImageFit>);

export const DEFAULT_PDF_OPTIONS = Object.freeze({
  pageSize: PAGE_SIZES.A4,
  orientation: PAGE_ORIENTATIONS.PORTRAIT,
  margin: PAGE_MARGINS.NONE,
  imageFit: IMAGE_FITS.CONTAIN,
  compressImages: false,
  imageQuality: 80,
} satisfies PdfOptions);

export const PAGE_SIZE_LABELS = Object.freeze({
  [PAGE_SIZES.A4]: 'A4',
  [PAGE_SIZES.LETTER]: 'US Letter',
  [PAGE_SIZES.OFICIO]: 'Oficio',
  [PAGE_SIZES.IMAGE]: 'Same as Image',
} satisfies Record<PageSize, string>);

export const PAGE_ORIENTATION_LABELS = Object.freeze({
  [PAGE_ORIENTATIONS.PORTRAIT]: 'Portrait',
  [PAGE_ORIENTATIONS.LANDSCAPE]: 'Landscape',
} satisfies Record<PageOrientation, string>);

export const PAGE_MARGIN_LABELS = Object.freeze({
  [PAGE_MARGINS.NONE]: '0 mm',
  [PAGE_MARGINS.MM_5]: '5 mm',
  [PAGE_MARGINS.MM_10]: '10 mm',
  [PAGE_MARGINS.MM_20]: '20 mm',
} satisfies Record<number, string>);

export const IMAGE_FIT_LABELS = Object.freeze({
  [IMAGE_FITS.CONTAIN]: 'Fit',
  [IMAGE_FITS.COVER]: 'Cover',
} satisfies Record<ImageFit, string>);
