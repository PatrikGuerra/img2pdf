import { useEffect, useState } from 'react';
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
  const [urls, setUrls] = useState('');
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length > 0) {
        event.preventDefault();
        onDropFiles(files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onDropFiles]);

  const addUrls = async (value: string) => {
    const entries = value.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
    if (!entries.length || loadingUrls) return;
    setLoadingUrls(true);
    setUrlError('');
    const results = await Promise.all(entries.map(async (entry) => {
      try {
        const url = new URL(entry);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
        const response = await fetch(url.href);
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        if (!['image/png', 'image/x-png', 'image/jpeg', 'image/heic', 'image/heif'].includes(blob.type.toLowerCase())) throw new Error();
        const name = decodeURIComponent(url.pathname.split('/').pop() || 'image');
        return new File([blob], name, { type: blob.type });
      } catch {
        return null;
      }
    }));
    const files = results.filter((file): file is File => file !== null);
    if (files.length) onDropFiles(files);
    const failed = entries.filter((_, index) => !results[index]);
    setUrls(failed.join('\n'));
    if (failed.length) setUrlError(`${failed.length} URL(s) could not be loaded. Check the link, image format, and server access (CORS).`);
    setLoadingUrls(false);
  };

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
    } else {
      const droppedUrls = event.dataTransfer.getData?.('text/uri-list') || event.dataTransfer.getData?.('text/plain');
      if (droppedUrls) void addUrls(droppedUrls);
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
            Files are processed on your device. Image URLs are downloaded from their hosts.
          </div>
        </div>
        <button type="button" onClick={onPickFiles} className="big-btn">
          Select Images
        </button>
        <div className="dropzone-text">or drop images here, or paste images with Ctrl+V</div>
        <form className="url-form" onSubmit={(event) => { event.preventDefault(); void addUrls(urls); }}>
          <label htmlFor="image-urls">Image URLs (one per line)</label>
          <textarea id="image-urls" value={urls} onChange={(event) => setUrls(event.target.value)} rows={3} placeholder="https://example.com/image.jpg" />
          <button className="button" disabled={loadingUrls || !urls.trim()} type="submit">
            {loadingUrls ? 'Loading images...' : 'Add image URLs'}
          </button>
          {urlError ? <div role="alert">{urlError}</div> : null}
        </form>
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
