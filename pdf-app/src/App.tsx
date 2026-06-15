import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import ActionBar from './components/ActionBar';
import BusyOverlay from './components/BusyOverlay';
import ImageGrid from './components/ImageGrid';
import Landing from './components/Landing';
import OptionsPanel from './components/OptionsPanel';
import { DEFAULT_PDF_OPTIONS } from './constants/pdfOptions';
import { downloadPdf } from './download/downloadPdf';
import { normalizePdfFileName } from './download/pdfFileName';
import {
  clearImageSelection,
  createImageItems,
  deleteImageById,
  moveImageByOffset,
  moveImageBefore,
  revokeImageItems,
  rotateImageById,
  selectImageById,
} from './image/imageFiles';
import { getImageSummary } from './image/imageSummary';
import { createPdfFromImages } from './pdf/createPdfFromImages';
import type { ImageItem, PdfOptions, PdfProgress } from './types/pdf';

type AppProgress = PdfProgress | { current: number; total: number };

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [options, setOptions] = useState<PdfOptions>(DEFAULT_PDF_OPTIONS);
  const [pdfFileName, setPdfFileName] = useState('file.pdf');
  const [forceShowOptions, setForceShowOptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<AppProgress | undefined>(undefined);
  const [lastError, setLastError] = useState<string | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => () => {
    revokeImageItems(imagesRef.current);
  }, []);

  const pickFiles = () => {
    fileInput.current?.click();
  };

  const handleFiles = (fileList: FileList | File[] | null | undefined) => {
    const files = Array.from(fileList ?? []);
    const imageItems = createImageItems(files);

    if (imageItems.length > 0) {
      setImages((currentImages) => [...currentImages, ...imageItems]);
    }

    if (files.length > 0 && imageItems.length < files.length) {
      const ignoredCount = files.length - imageItems.length;
      setLastError(`${ignoredCount} file${ignoredCount === 1 ? ' was' : 's were'} not PNG/JPEG.`);
    } else {
      setLastError(undefined);
    }

    if (fileInput.current) {
      fileInput.current.value = '';
    }
  };

  const updateOptions = (nextOptions: Partial<PdfOptions>) => {
    setOptions((currentOptions) => ({
      ...currentOptions,
      ...nextOptions,
    }));
  };

  const clearSelection = () => {
    setImages((currentImages) => clearImageSelection(currentImages));
  };

  const selectImage = (id: string) => {
    setImages((currentImages) => selectImageById(currentImages, id));
  };

  const deleteImage = (id: string) => {
    setImages((currentImages) => {
      revokeImageItems(currentImages.filter((image) => image.id === id));
      return deleteImageById(currentImages, id);
    });
  };

  const dropImage = (droppedId: string, targetId: string) => {
    setImages((currentImages) => moveImageBefore(currentImages, droppedId, targetId));
  };

  const moveImage = (id: string, offset: number) => {
    setImages((currentImages) => moveImageByOffset(currentImages, id, offset));
  };

  const rotateImage = (id: string) => {
    setImages((currentImages) => rotateImageById(currentImages, id));
  };

  const generatePdf = async () => {
    if (images.length < 1 || busy) {
      return;
    }

    try {
      setBusy(true);
      setLastError(undefined);
      setProgress({ current: 0, total: images.length });

      const pdfBytes = await createPdfFromImages(images, options, setProgress);
      downloadPdf(pdfBytes, normalizePdfFileName(pdfFileName));
    } catch (error) {
      console.error(error);
      setLastError(error instanceof Error ? error.message : 'Unable to generate PDF.');
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  const fileInputElement = (
    <input
      accept="image/png,image/jpeg"
      data-testid="file-input"
      multiple
      onChange={(event: ChangeEvent<HTMLInputElement>) => handleFiles(event.target.files)}
      ref={fileInput}
      style={{ display: 'none' }}
      type="file"
    />
  );

  const pageHeader = (
    <div className="page-header">
      <span>CONVERT IMAGE TO PDF</span>
    </div>
  );

  if (images.length < 1) {
    return (
      <div className="app-shell">
        {pageHeader}
        {lastError ? <div className="status-message" role="alert">{lastError}</div> : null}
        {fileInputElement}
        <Landing onPickFiles={pickFiles} onDropFiles={handleFiles} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {pageHeader}
      {lastError ? <div className="status-message" role="alert">{lastError}</div> : null}
      <div className="content">
        <ImageGrid
          images={images}
          onMoveImage={moveImage}
          onClearSelection={clearSelection}
          onDeleteImage={deleteImage}
          onDropImage={dropImage}
          onRotateImage={rotateImage}
          onSelectImage={selectImage}
          options={options}
        />
        <OptionsPanel
          forceShowOptions={forceShowOptions}
          onChangeOptions={updateOptions}
          onClose={() => setForceShowOptions(false)}
          options={options}
        />
      </div>
      <ActionBar
        busy={busy}
        fileName={pdfFileName}
        imageSummary={getImageSummary(images).label}
        onAddPage={pickFiles}
        onChangeFileName={setPdfFileName}
        onGeneratePdf={generatePdf}
        onShowOptions={() => setForceShowOptions(true)}
      />
      {fileInputElement}
      <BusyOverlay busy={busy} progress={progress} />
    </div>
  );
}
