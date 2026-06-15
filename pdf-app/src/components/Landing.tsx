import { useState } from 'react';
import type { DragEvent } from 'react';
import UploadQueuePanel from './UploadQueuePanel';
import type { UploadQueueItem } from '../types/upload';

interface LandingProps {
  isPreparingUpload: boolean;
  onPickFiles: () => void;
  onClearUpload: () => void;
  onContinueUpload: () => void;
  onDropFiles: (files: FileList | File[]) => void;
  preparedImageCount: number;
  uploadQueue: UploadQueueItem[];
}

export default function Landing({
  isPreparingUpload,
  onClearUpload,
  onContinueUpload,
  onPickFiles,
  onDropFiles,
  preparedImageCount,
  uploadQueue,
}: LandingProps) {
  const [dragActive, setDragActive] = useState(false);

  const preventDefaultDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    preventDefaultDrag(event);
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    preventDefaultDrag(event);
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    preventDefaultDrag(event);
    setDragActive(false);

    const files = getDroppedFiles(event);
    if (files.length > 0) {
      onDropFiles(files);
    }
  };

  return (
    <div
      className="landing-page"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={preventDefaultDrag}
      onDrop={handleDrop}
    >
      <div
        className={`dropzone${dragActive ? ' dropzone--active' : ''}`}
        aria-label="Drop images here"
        role="region"
      >
        <div className="landing-copy">
          <div className="landing-copy-title">
            Convert JPEG, PNG, HEIC, or HEIF images to PDF without uploading your sensitive data anywhere.
          </div>
          <div className="landing-copy-note">
            Files are processed entirely on your device and do not get uploaded to any server.
          </div>
        </div>
        <button type="button" onClick={onPickFiles} className="big-btn">
          Select Images
        </button>
        <div className="dropzone-text">or drop images here</div>
        <UploadQueuePanel
          isPreparing={isPreparingUpload}
          items={uploadQueue}
          onClear={onClearUpload}
          onContinue={onContinueUpload}
          preparedImageCount={preparedImageCount}
        />
      </div>
    </div>
  );
}

function getDroppedFiles(event: DragEvent<HTMLDivElement>): FileList | File[] {
  if (event.dataTransfer.files.length > 0) {
    return event.dataTransfer.files;
  }

  return Array.from(event.dataTransfer.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
}
