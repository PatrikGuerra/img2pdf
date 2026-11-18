import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import AboutDialog from './components/AboutDialog';
import ActionBar from './components/ActionBar';
import BusyOverlay from './components/BusyOverlay';
import ConfirmationDialog from './components/ConfirmationDialog';
import ImageGrid from './components/ImageGrid';
import Landing from './components/Landing';
import OptionsPanel from './components/OptionsPanel';
import UploadQueuePanel from './components/UploadQueuePanel';
import { PAGE_ORIENTATION_LABELS } from './constants/pdfOptions';
import { downloadPdf } from './download/downloadPdf';
import { normalizePdfFileName } from './download/pdfFileName';
import {
  clearImageSelection,
  createImageItemsReport,
  deleteImageById,
  flipImageById,
  getImageSourceType,
  hasMixedImageOrientations,
  moveImageByOffset,
  moveImageBefore,
  revokeImageItems,
  rotateImageById,
  selectImageById,
  setAllImageOrientations,
  setImageOrientationById,
} from './image/imageFiles';
import { getImageSummary } from './image/imageSummary';
import { formatBytes } from './image/imageSummary';
import { createPdfFromImages } from './pdf/createPdfFromImages';
import { loadPreferences, savePreferences } from './pdf/preferences';
import type { FlipAxis, ImageItem, PageOrientation, PdfOptions, PdfProgress } from './types/pdf';
import type { ImagePreparationProgress, UploadQueueItem } from './types/upload';

type AppProgress = PdfProgress | { current: number; total: number };

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [preparedImageItems, setPreparedImageItems] = useState<ImageItem[]>([]);
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);
  const [options, setOptions] = useState<PdfOptions>(loadPreferences);
  const [undoImages, setUndoImages] = useState<ImageItem[] | null>(null);
  const [pdfSize, setPdfSize] = useState<number | undefined>();
  const [pdfFileName, setPdfFileName] = useState('file.pdf');
  const [forceShowOptions, setForceShowOptions] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; pageNumber: number } | undefined>(undefined);
  const [orientationConfirmation, setOrientationConfirmation] = useState<PageOrientation | undefined>(undefined);
  const [progress, setProgress] = useState<AppProgress | undefined>(undefined);
  const [lastError, setLastError] = useState<string | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  const undoImagesRef = useRef<ImageItem[] | null>(null);
  const undoOrientationRef = useRef<PageOrientation | undefined>();
  const preparedImageItemsRef = useRef(preparedImageItems);
  const uploadQueueRef = useRef(uploadQueue);
  const activeUploadRunsRef = useRef(0);
  const uploadRunIdRef = useRef(0);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => { savePreferences(options); }, [options]);

  useEffect(() => {
    preparedImageItemsRef.current = preparedImageItems;
  }, [preparedImageItems]);

  useEffect(() => {
    uploadQueueRef.current = uploadQueue;
  }, [uploadQueue]);

  useEffect(() => () => {
    const allImages = [...imagesRef.current, ...(undoImagesRef.current ?? [])];
    revokeImageItems([...new Map(allImages.map((image) => [image.previewUrl, image])).values()]);
    revokeImageItems(preparedImageItemsRef.current);
  }, []);

  const pickFiles = () => {
    fileInput.current?.click();
  };

  const resetFileInput = () => {
    if (fileInput.current) {
      fileInput.current.value = '';
    }
  };

  const handleFiles = async (fileList: FileList | File[] | null | undefined) => {
    const files = Array.from(fileList ?? []);
    if (files.length < 1) {
      resetFileInput();
      return;
    }

    const uploadRunId = uploadRunIdRef.current;
    const startIndex = uploadQueueRef.current.length;
    const nextQueueItems = createInitialUploadQueue(files, startIndex);

    setUploadQueue((currentItems) => {
      const nextItems = [...currentItems, ...nextQueueItems];
      uploadQueueRef.current = nextItems;
      return nextItems;
    });
    activeUploadRunsRef.current += 1;
    setIsPreparingUpload(true);
    setLastError(undefined);
    resetFileInput();

    try {
      const report = await createImageItemsReport(
        files,
        undefined,
        options.orientation,
        undefined,
        undefined,
        undefined,
        (progress) => {
          if (uploadRunIdRef.current !== uploadRunId) {
            return;
          }

          setUploadQueue((currentItems) => {
            const nextItems = updateUploadQueueItem(currentItems, {
              ...progress,
              index: startIndex + progress.index,
            });
            uploadQueueRef.current = nextItems;
            return nextItems;
          });
        },
      );

      if (uploadRunIdRef.current !== uploadRunId) {
        revokeImageItems(report.imageItems);
        return;
      }

      setPreparedImageItems((currentItems) => [...currentItems, ...report.imageItems]);
      setLastError(getFileFeedbackMessage(report.convertedCount, report.ignoredCount));
    } finally {
      if (uploadRunIdRef.current === uploadRunId) {
        activeUploadRunsRef.current = Math.max(0, activeUploadRunsRef.current - 1);
        setIsPreparingUpload(activeUploadRunsRef.current > 0);
      }
    }
  };

  const continuePreparedUpload = () => {
    if (isPreparingUpload || preparedImageItems.length < 1) {
      return;
    }

    discardUndo();
    const nextImages = appendImageItemsWithSelection(imagesRef.current, preparedImageItems);
    imagesRef.current = nextImages;
    setImages(nextImages);
    setPdfSize(undefined);
    setPreparedImageItems([]);
    setUploadQueue([]);
    uploadQueueRef.current = [];
    setLastError(undefined);
  };

  const clearPreparedUpload = () => {
    uploadRunIdRef.current += 1;
    activeUploadRunsRef.current = 0;
    setIsPreparingUpload(false);
    setUploadQueue([]);
    uploadQueueRef.current = [];
    setLastError(undefined);
    setPreparedImageItems((currentItems) => {
      revokeImageItems(currentItems);
      return [];
    });
    resetFileInput();
  };

  const updateOptions = (nextOptions: Partial<PdfOptions>) => {
    setOptions((currentOptions) => ({
      ...currentOptions,
      ...nextOptions,
    }));
  };

  const applyAllOrientations = (orientation: PageOrientation) => {
    setOptions((currentOptions) => ({
      ...currentOptions,
      orientation,
    }));
    editImages((currentImages) => setAllImageOrientations(currentImages, orientation), options.orientation);
  };

  const changeGlobalOrientation = (orientation: PageOrientation) => {
    if (images.length > 0 && hasMixedImageOrientations(images)) {
      setOrientationConfirmation(orientation);
      return;
    }

    applyAllOrientations(orientation);
  };

  const clearSelection = () => {
    setImages((currentImages) => clearImageSelection(currentImages));
  };

  const selectImage = (id: string) => {
    setImages((currentImages) => selectImageById(currentImages, id));
  };

  const deleteImage = (id: string) => {
    editImages((currentImages) => deleteImageAndSelectFallback(currentImages, id));
  };

  const discardUndo = () => {
    const currentUrls = new Set(imagesRef.current.map((image) => image.previewUrl));
    revokeImageItems((undoImagesRef.current ?? []).filter((image) => !currentUrls.has(image.previewUrl)));
    undoImagesRef.current = null;
    undoOrientationRef.current = undefined;
    setUndoImages(null);
  };

  const editImages = (edit: (current: ImageItem[]) => ImageItem[], previousOrientation?: PageOrientation) => {
    const current = imagesRef.current;
    const next = edit(current);
    discardUndo();
    undoImagesRef.current = current;
    undoOrientationRef.current = previousOrientation;
    setUndoImages(current);
    imagesRef.current = next;
    setImages(next);
    setPdfSize(undefined);
  };

  const undo = () => {
    if (!undoImagesRef.current) return;
    const previous = undoImagesRef.current;
    const previousUrls = new Set(previous.map((image) => image.previewUrl));
    revokeImageItems(imagesRef.current.filter((image) => !previousUrls.has(image.previewUrl)));
    imagesRef.current = previous;
    setImages(previous);
    if (undoOrientationRef.current) {
      setOptions((current) => ({ ...current, orientation: undoOrientationRef.current! }));
    }
    undoOrientationRef.current = undefined;
    undoImagesRef.current = null;
    setUndoImages(null);
    setPdfSize(undefined);
  };

  const requestDeleteImage = (id: string, pageNumber: number) => {
    setDeleteConfirmation({ id, pageNumber });
  };

  const confirmDeleteImage = () => {
    if (deleteConfirmation) {
      deleteImage(deleteConfirmation.id);
      setDeleteConfirmation(undefined);
    }
  };

  const dropImage = (droppedId: string, targetId: string) => {
    if (droppedId !== targetId) editImages((currentImages) => moveImageBefore(currentImages, droppedId, targetId));
  };

  const moveImage = (id: string, offset: number) => {
    editImages((currentImages) => moveImageByOffset(currentImages, id, offset));
  };

  const rotateImage = (id: string) => {
    editImages((currentImages) => rotateImageById(currentImages, id));
  };

  const flipImage = (id: string, axis: FlipAxis) => {
    editImages((currentImages) => flipImageById(currentImages, id, axis));
  };

  const changeImageOrientation = (id: string, pageOrientation: PageOrientation) => {
    editImages((currentImages) => setImageOrientationById(currentImages, id, pageOrientation));
  };

  const generatePdf = async () => {
    if (images.length < 1 || busy) {
      return;
    }

    try {
      setBusy(true);
      setLastError(undefined);
      setPdfSize(undefined);
      setProgress({ current: 0, total: images.length });

      const pdfBytes = await createPdfFromImages(images, options, setProgress);
      downloadPdf(pdfBytes, normalizePdfFileName(pdfFileName));
      setPdfSize(pdfBytes.byteLength);
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
      accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
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
      <a
        aria-label="Open PatrikGuerra/img2pdf on GitHub"
        className="header-repo-link"
        href="https://github.com/PatrikGuerra/img2pdf"
        rel="noreferrer"
        target="_blank"
        title="Open GitHub repository"
      >
        <i aria-hidden="true" className="fa fa-github" />
        <span>GitHub</span>
      </a>
    </div>
  );

  if (images.length < 1) {
    return (
      <div className="app-shell">
        {pageHeader}
        {lastError ? <div className="status-message" role="alert">{lastError}</div> : null}
        {undoImages ? <button type="button" onClick={undo}>Undo last page edit</button> : null}
        {fileInputElement}
        <Landing
          isPreparingUpload={isPreparingUpload}
          onClearUpload={clearPreparedUpload}
          onContinueUpload={continuePreparedUpload}
          onPickFiles={pickFiles}
          onDropFiles={handleFiles}
          preparedImageCount={preparedImageItems.length}
          uploadQueue={uploadQueue}
        />
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
          onChangeImageOrientation={changeImageOrientation}
          onClearSelection={clearSelection}
          onDropImage={dropImage}
          onFlipImage={flipImage}
          onMoveImage={moveImage}
          onRequestDeleteImage={requestDeleteImage}
          onRotateImage={rotateImage}
          onSelectImage={selectImage}
          options={options}
        />
        <OptionsPanel
          forceShowOptions={forceShowOptions}
          onChangeOptions={updateOptions}
          onChangeOrientation={changeGlobalOrientation}
          onClose={() => setForceShowOptions(false)}
          options={options}
        />
      </div>
      <ActionBar
        busy={busy}
        fileName={pdfFileName}
        imageSummary={getImageSummary(images).label}
        pdfSize={pdfSize === undefined ? undefined : formatBytes(pdfSize)}
        canUndo={undoImages !== null}
        onUndo={undo}
        onAddPage={pickFiles}
        onChangeFileName={setPdfFileName}
        onGeneratePdf={generatePdf}
        onShowAbout={() => setShowAboutDialog(true)}
        onShowOptions={() => setForceShowOptions(true)}
      />
      {fileInputElement}
      <BusyOverlay busy={busy} progress={progress} />
      {uploadQueue.length > 0 ? (
        <div className="upload-preparation-backdrop" role="presentation">
          <div aria-label="Prepare selected files" aria-modal="true" className="upload-preparation-dialog" role="dialog">
            <UploadQueuePanel
              isPreparing={isPreparingUpload}
              items={uploadQueue}
              onClear={clearPreparedUpload}
              onContinue={continuePreparedUpload}
              preparedImageCount={preparedImageItems.length}
            />
          </div>
        </div>
      ) : null}
      {deleteConfirmation ? (
        <ConfirmationDialog
          body={`Page ${deleteConfirmation.pageNumber} will be removed from the PDF.`}
          confirmLabel="Remove"
          onCancel={() => setDeleteConfirmation(undefined)}
          onConfirm={confirmDeleteImage}
          title="Remove page?"
        />
      ) : null}
      {orientationConfirmation ? (
        <ConfirmationDialog
          body={`Your pages currently use both Portrait and Landscape. This will set every page to ${PAGE_ORIENTATION_LABELS[orientationConfirmation]}.`}
          confirmLabel="Change all"
          onCancel={() => setOrientationConfirmation(undefined)}
          onConfirm={() => {
            applyAllOrientations(orientationConfirmation);
            setOrientationConfirmation(undefined);
          }}
          title="Change all page orientations?"
        />
      ) : null}
      {showAboutDialog ? <AboutDialog onClose={() => setShowAboutDialog(false)} /> : null}
    </div>
  );
}

function appendImageItemsWithSelection(currentImages: ImageItem[], imageItems: ImageItem[]): ImageItem[] {
  if (currentImages.some((image) => image.selected) || imageItems.length < 1) {
    return [...currentImages, ...imageItems];
  }

  return [
    ...currentImages,
    {
      ...imageItems[0],
      selected: true,
    },
    ...imageItems.slice(1),
  ];
}

function deleteImageAndSelectFallback(currentImages: ImageItem[], id: string): ImageItem[] {
  const removedIndex = currentImages.findIndex((image) => image.id === id);
  if (removedIndex < 0) {
    return currentImages;
  }

  const removedWasSelected = currentImages[removedIndex].selected;
  const nextImages = deleteImageById(currentImages, id);

  if (nextImages.length < 1 || (!removedWasSelected && nextImages.some((image) => image.selected))) {
    return nextImages;
  }

  const fallbackIndex = Math.min(removedIndex, nextImages.length - 1);
  return nextImages.map((image, index) => ({
    ...image,
    selected: index === fallbackIndex,
  }));
}

function createInitialUploadQueue(files: File[], startIndex = 0): UploadQueueItem[] {
  return files.map((file, index) => ({
    id: createUploadQueueId(startIndex + index),
    fileName: file.name || `File ${index + 1}`,
    fileSize: file.size,
    message: 'Preparing files...',
    sourceType: getImageSourceType(file),
    status: 'queued',
  }));
}

function updateUploadQueueItem(
  currentItems: UploadQueueItem[],
  progress: ImagePreparationProgress,
): UploadQueueItem[] {
  return currentItems.map((item, index) => (
    index === progress.index
      ? {
        ...item,
        message: progress.message,
        previewUrl: progress.previewUrl,
        sourceType: progress.sourceType,
        status: progress.status,
      }
      : item
  ));
}

function createUploadQueueId(index: number): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `upload-${Date.now()}-${index}`;
}

function getFileFeedbackMessage(convertedCount: number, ignoredCount: number): string | undefined {
  const messages: string[] = [];

  if (convertedCount > 0) {
    messages.push(`${convertedCount} HEIC/HEIF file${convertedCount === 1 ? ' was' : 's were'} converted to JPEG locally.`);
  }

  if (ignoredCount > 0) {
    messages.push(`${ignoredCount} file${ignoredCount === 1 ? ' was' : 's were'} not PNG/JPEG/WebP/HEIC/HEIF.`);
  }

  return messages.length > 0 ? messages.join(' ') : undefined;
}
