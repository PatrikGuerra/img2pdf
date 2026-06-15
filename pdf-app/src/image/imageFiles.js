const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/x-png', 'image/jpeg']);

export function isSupportedImageFile(file) {
  return Boolean(file && SUPPORTED_IMAGE_TYPES.has(file.type));
}

export function createImageItems(fileList, createObjectUrl = getCreateObjectUrl()) {
  return Array.from(fileList ?? [])
    .filter(isSupportedImageFile)
    .map((file) => ({
      id: createImageId(),
      file,
      previewUrl: createObjectUrl(file),
      selected: false,
    }));
}

export function revokeImageItems(items, revokeObjectUrl = getRevokeObjectUrl()) {
  if (!revokeObjectUrl) {
    return;
  }

  for (const item of items ?? []) {
    if (item?.previewUrl) {
      revokeObjectUrl(item.previewUrl);
    }
  }
}

export function selectImageById(images, id) {
  return images.map((image) => ({
    ...image,
    selected: image.id === id,
  }));
}

export function clearImageSelection(images) {
  return images.map((image) => ({
    ...image,
    selected: false,
  }));
}

export function deleteImageById(images, id) {
  return images.filter((image) => image.id !== id);
}

export function moveImageBefore(images, droppedId, targetId) {
  if (!droppedId || !targetId || droppedId === targetId) {
    return images;
  }

  const droppedIndex = images.findIndex((image) => image.id === droppedId);
  const targetIndex = images.findIndex((image) => image.id === targetId);

  if (droppedIndex < 0 || targetIndex < 0) {
    return images;
  }

  const nextImages = [...images];
  const [droppedImage] = nextImages.splice(droppedIndex, 1);
  const nextTargetIndex = nextImages.findIndex((image) => image.id === targetId);
  nextImages.splice(nextTargetIndex, 0, droppedImage);

  return nextImages;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('Image loading is not available in this environment.'));
      return;
    }

    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load image.'));
    image.src = src;
  });
}

export function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Unable to encode image.'));
        }
      }, 'image/jpeg', quality);
    } catch (error) {
      reject(error);
    }
  });
}

function createImageId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.random() * 16 | 0;
    const value = character === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
}

function getCreateObjectUrl() {
  const createObjectUrl = globalThis.URL?.createObjectURL;
  if (!createObjectUrl) {
    throw new Error('Object URLs are not available in this environment.');
  }

  return createObjectUrl.bind(globalThis.URL);
}

function getRevokeObjectUrl() {
  return globalThis.URL?.revokeObjectURL?.bind(globalThis.URL);
}
