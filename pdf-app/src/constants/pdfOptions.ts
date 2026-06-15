import type {
  ImageFit,
  PageNumberHorizontalAlignment,
  PageNumberPlacement,
  PageNumberVerticalPosition,
  PageOrientation,
  PageSize,
  PdfOptions,
} from '../types/pdf';

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

export const PAGE_NUMBER_VERTICAL_POSITIONS = Object.freeze({
  TOP: 'TOP',
  BOTTOM: 'BOTTOM',
} as const satisfies Record<string, PageNumberVerticalPosition>);

export const PAGE_NUMBER_HORIZONTAL_ALIGNMENTS = Object.freeze({
  LEFT: 'LEFT',
  CENTER: 'CENTER',
  RIGHT: 'RIGHT',
} as const satisfies Record<string, PageNumberHorizontalAlignment>);

export const PAGE_NUMBER_PLACEMENTS = Object.freeze({
  RESERVED: 'RESERVED',
  OVERLAY: 'OVERLAY',
} as const satisfies Record<string, PageNumberPlacement>);

export const DEFAULT_PDF_OPTIONS = Object.freeze({
  pageSize: PAGE_SIZES.A4,
  orientation: PAGE_ORIENTATIONS.PORTRAIT,
  margin: PAGE_MARGINS.NONE,
  imageFit: IMAGE_FITS.CONTAIN,
  compressImages: false,
  imageQuality: 80,
  pageBackgroundColor: null,
  pageNumbering: {
    enabled: false,
    horizontalAlignment: PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.CENTER,
    placement: PAGE_NUMBER_PLACEMENTS.RESERVED,
    verticalPosition: PAGE_NUMBER_VERTICAL_POSITIONS.BOTTOM,
  },
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

export const PAGE_NUMBER_VERTICAL_POSITION_LABELS = Object.freeze({
  [PAGE_NUMBER_VERTICAL_POSITIONS.TOP]: 'Top',
  [PAGE_NUMBER_VERTICAL_POSITIONS.BOTTOM]: 'Bottom',
} satisfies Record<PageNumberVerticalPosition, string>);

export const PAGE_NUMBER_HORIZONTAL_ALIGNMENT_LABELS = Object.freeze({
  [PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.LEFT]: 'Left',
  [PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.CENTER]: 'Center',
  [PAGE_NUMBER_HORIZONTAL_ALIGNMENTS.RIGHT]: 'Right',
} satisfies Record<PageNumberHorizontalAlignment, string>);

export const PAGE_NUMBER_PLACEMENT_LABELS = Object.freeze({
  [PAGE_NUMBER_PLACEMENTS.RESERVED]: 'Header/Footer',
  [PAGE_NUMBER_PLACEMENTS.OVERLAY]: 'Overlay',
} satisfies Record<PageNumberPlacement, string>);
