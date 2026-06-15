import { formatBytes } from '../image/imageSummary';
import type { UploadQueueItem, UploadQueueStatus } from '../types/upload';

interface UploadQueuePanelProps {
  isPreparing: boolean;
  items: UploadQueueItem[];
  onClear: () => void;
  onContinue: () => void;
  preparedImageCount: number;
}

const STATUS_LABELS: Record<UploadQueueStatus, string> = {
  queued: 'Preparing files...',
  converting: 'Converting HEIC/HEIF to JPEG locally...',
  ready: 'Ready',
  ignored: 'Ignored: not PNG/JPEG/HEIC/HEIF.',
  error: 'Conversion failed. Try exporting this image as JPEG.',
};

export default function UploadQueuePanel({
  isPreparing,
  items,
  onClear,
  onContinue,
  preparedImageCount,
}: UploadQueuePanelProps) {
  if (items.length < 1) {
    return null;
  }

  const continueLabel = `Continue with ${preparedImageCount} image${preparedImageCount === 1 ? '' : 's'}`;

  return (
    <div className="upload-queue" aria-live="polite">
      <div className="upload-queue-heading">{isPreparing ? 'Preparing files...' : 'Selected files'}</div>
      <div className="upload-queue-summary">{getUploadQueueSummary(items)}</div>
      <ul className="upload-file-list">
        {items.map((item) => (
          <li className="upload-file-row" key={item.id}>
            <div className="upload-file-preview">
              {item.previewUrl ? (
                <img alt={`Preview of ${item.fileName}`} src={item.previewUrl} />
              ) : (
                <div className={`upload-file-placeholder upload-file-placeholder--${item.status}`}>
                  {item.sourceType}
                </div>
              )}
            </div>
            <div className="upload-file-main">
              <span className="upload-file-name">{item.fileName}</span>
              <span className="upload-file-meta">
                {item.sourceType} | {formatBytes(item.fileSize)}
              </span>
            </div>
            <span className={`upload-file-status upload-file-status--${item.status}`}>
              {item.message || STATUS_LABELS[item.status]}
            </span>
          </li>
        ))}
      </ul>
      <div className="upload-queue-actions">
        <button className="plain-upload-button" onClick={onClear} type="button">
          Clear selection
        </button>
        {!isPreparing ? (
          <button
            className="button"
            disabled={preparedImageCount < 1}
            onClick={onContinue}
            type="button"
          >
            {continueLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getUploadQueueSummary(items: UploadQueueItem[]): string {
  const readyCount = getStatusCount(items, 'ready');
  const convertingCount = getStatusCount(items, 'converting');
  const queuedCount = getStatusCount(items, 'queued');
  const ignoredCount = getStatusCount(items, 'ignored');
  const errorCount = getStatusCount(items, 'error');
  const parts = [
    `${items.length} file${items.length === 1 ? '' : 's'} selected`,
    `${readyCount} ready`,
  ];

  if (convertingCount > 0) {
    parts.push(`${convertingCount} converting`);
  }

  if (queuedCount > 0) {
    parts.push(`${queuedCount} queued`);
  }

  if (ignoredCount > 0) {
    parts.push(`${ignoredCount} ignored`);
  }

  if (errorCount > 0) {
    parts.push(`${errorCount} failed`);
  }

  return parts.join(' | ');
}

function getStatusCount(items: UploadQueueItem[], status: UploadQueueStatus): number {
  return items.filter((item) => item.status === status).length;
}
