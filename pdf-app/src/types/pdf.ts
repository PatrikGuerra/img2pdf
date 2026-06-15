export type PageSize = 'A4' | 'LETTER' | 'OFICIO' | 'IMAGE';
export type PageOrientation = 'PORTRAIT' | 'LANDSCAPE';
export type ImageFit = 'CONTAIN' | 'COVER';
export type RotationDegrees = 0 | 90 | 180 | 270;
export type FlipAxis = 'horizontal' | 'vertical';
export type PdfPageSize = [number, number];
export type PageNumberVerticalPosition = 'TOP' | 'BOTTOM';
export type PageNumberHorizontalAlignment = 'LEFT' | 'CENTER' | 'RIGHT';
export type PageNumberPlacement = 'RESERVED' | 'OVERLAY';

export interface PageNumberingOptions {
  enabled: boolean;
  horizontalAlignment: PageNumberHorizontalAlignment;
  placement: PageNumberPlacement;
  verticalPosition: PageNumberVerticalPosition;
}

export interface PdfOptions {
  pageSize: PageSize;
  orientation: PageOrientation;
  margin: number;
  imageFit: ImageFit;
  compressImages: boolean;
  imageQuality: number;
  pageBackgroundColor: string | null;
  pageNumbering: PageNumberingOptions;
}

export interface ImageItem {
  convertedFrom?: 'HEIC' | 'HEIF';
  id: string;
  file: File;
  flipHorizontal: boolean;
  flipVertical: boolean;
  naturalDimensions?: ImageDimensions;
  pageOrientation: PageOrientation;
  previewUrl: string;
  rotationDegrees: RotationDegrees;
  selected: boolean;
  sourceFile?: File;
}

export interface PdfProgress {
  current: number;
  total: number;
  image: ImageItem;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImagePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
}

export interface FetchedImageData {
  arrayBuffer: ArrayBuffer;
  mime: string | null;
}

export type JpegOrientation = number;
