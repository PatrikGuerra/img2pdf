import type { ImageItem } from '../types/pdf';

export interface ImageSummary {
  count: number;
  totalBytes: number;
  label: string;
}

export function getImageSummary(images: ImageItem[]): ImageSummary {
  const count = images.length;
  const totalBytes = images.reduce((sum, image) => sum + image.file.size, 0);
  const imageLabel = count === 1 ? 'image' : 'images';

  return {
    count,
    totalBytes,
    label: `${count} ${imageLabel} · estimated ${formatBytes(totalBytes)}`,
  };
}

export function formatBytes(bytes: number): string {
  const safeBytes = Math.max(0, Number(bytes) || 0);

  if (safeBytes < 1024) {
    return `${safeBytes} B`;
  }

  if (safeBytes < 1024 * 1024) {
    return `${formatUnit(safeBytes / 1024)} KB`;
  }

  return `${formatUnit(safeBytes / (1024 * 1024))} MB`;
}

function formatUnit(value: number): string {
  return value >= 10 ? Math.round(value).toString() : value.toFixed(1);
}
