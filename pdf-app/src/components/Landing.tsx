import type { DragEvent } from 'react';

interface LandingProps {
  onPickFiles: () => void;
  onDropFiles: (files: FileList) => void;
}

export default function Landing({ onPickFiles, onDropFiles }: LandingProps) {
  return (
    <div className="landing-page">
      <div className="landing-copy">
        Convert JPEG or PNG images to PDF without uploading your sensitve data anywhere.
        <br />
        Files are processed entirely on your device and does not get uploaded to any server.
      </div>
      <button type="button" onClick={onPickFiles} className="big-btn">
        Select Images
      </button>
      <div
        className="dropzone"
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          event.stopPropagation();
          onDropFiles(event.dataTransfer.files);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => event.preventDefault()}
      >
        or drop images here
      </div>
    </div>
  );
}
