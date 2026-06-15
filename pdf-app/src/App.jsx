import { useEffect, useRef, useState } from 'react';
import ActionBar from './components/ActionBar';
import BusyOverlay from './components/BusyOverlay';
import ImageGrid from './components/ImageGrid';
import Landing from './components/Landing';
import OptionsPanel from './components/OptionsPanel';
import { DEFAULT_PDF_OPTIONS } from './constants/pdfOptions';
import { downloadPdf } from './download/downloadPdf';
import {
  clearImageSelection,
  createImageItems,
  deleteImageById,
  moveImageBefore,
  revokeImageItems,
  selectImageById,
} from './image/imageFiles';
import { createPdfFromImages } from './pdf/createPdfFromImages';

export default function App() {
  const [images, setImages] = useState([]);
  const [options, setOptions] = useState(DEFAULT_PDF_OPTIONS);
  const [forceShowOptions, setForceShowOptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(undefined);
  const [lastError, setLastError] = useState(undefined);
  const fileInput = useRef(null);
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

  const handleFiles = (fileList) => {
    const files = Array.from(fileList ?? []);
    const imageItems = createImageItems(files);

    if (imageItems.length > 0) {
      setImages((currentImages) => [...currentImages, ...imageItems]);
    }

    if (files.length > 0 && imageItems.length < files.length) {
      const ignoredCount = files.length - imageItems.length;
      setLastError(`${ignoredCount} file${ignoredCount === 1 ? '' : 's'} ignored. Only JPEG and PNG images are supported.`);
    } else {
      setLastError(undefined);
    }

    if (fileInput.current) {
      fileInput.current.value = '';
    }
  };

  const updateOptions = (nextOptions) => {
    setOptions((currentOptions) => ({
      ...currentOptions,
      ...nextOptions,
    }));
  };

  const clearSelection = () => {
    setImages((currentImages) => clearImageSelection(currentImages));
  };

  const selectImage = (id) => {
    setImages((currentImages) => selectImageById(currentImages, id));
  };

  const deleteImage = (id) => {
    setImages((currentImages) => {
      revokeImageItems(currentImages.filter((image) => image.id === id));
      return deleteImageById(currentImages, id);
    });
  };

  const dropImage = (droppedId, targetId) => {
    setImages((currentImages) => moveImageBefore(currentImages, droppedId, targetId));
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
      downloadPdf(pdfBytes);
    } catch (error) {
      console.error(error);
      setLastError(error?.message || 'Unable to generate PDF.');
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
      onChange={(event) => handleFiles(event.target.files)}
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
          onClearSelection={clearSelection}
          onDeleteImage={deleteImage}
          onDropImage={dropImage}
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
        onAddPage={pickFiles}
        onGeneratePdf={generatePdf}
        onShowOptions={() => setForceShowOptions(true)}
      />
      {fileInputElement}
      <BusyOverlay busy={busy} progress={progress} />
    </div>
  );
}
