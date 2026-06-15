import { useState } from 'react';
import type { DragEvent } from 'react';

interface LandingProps {
  onPickFiles: () => void;
  onDropFiles: (files: FileList | File[]) => void;
}

export default function Landing({ onPickFiles, onDropFiles }: LandingProps) {
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
            Convert JPEG or PNG images to PDF without uploading your sensitive data anywhere.
          </div>
          <div className="landing-copy-note">
            Files are processed entirely on your device and do not get uploaded to any server.
          </div>
        </div>
        <button type="button" onClick={onPickFiles} className="big-btn">
          Select Images
        </button>
        <div className="dropzone-text">or drop images here</div>
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
