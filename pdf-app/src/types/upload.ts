export type UploadSourceType = 'PNG' | 'JPEG' | 'WEBP' | 'HEIC' | 'HEIF' | 'UNKNOWN';
export type UploadQueueStatus = 'queued' | 'converting' | 'ready' | 'ignored' | 'error';

export interface UploadQueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  message?: string;
  previewUrl?: string;
  sourceType: UploadSourceType;
  status: UploadQueueStatus;
}

export interface ImagePreparationProgress {
  file: File;
  index: number;
  message?: string;
  previewUrl?: string;
  sourceType: UploadSourceType;
  status: UploadQueueStatus;
}
