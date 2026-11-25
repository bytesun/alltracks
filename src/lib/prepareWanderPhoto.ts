import { validateWanderPhoto, WANDER_PHOTO_TYPES, type WanderPhotoType } from './iceStorageUpload';

const MAX_PHOTO_SIDE = 2048;
const WEBP_QUALITY = 0.8;

// Canvas would flatten animated PNG/WebP to a single frame.
function isAnimatedPhoto(bytes: ArrayBuffer, type: string): boolean {
  const view = new DataView(bytes);
  if (type === 'image/webp') {
    return view.byteLength >= 21 &&
      view.getUint32(12) === 0x56503858 && // VP8X
      Boolean(view.getUint8(20) & 0x02);
  }
  if (type === 'image/png') {
    for (let offset = 8; offset + 12 <= view.byteLength; offset += 12 + view.getUint32(offset)) {
      const chunk = view.getUint32(offset + 4);
      if (chunk === 0x6163544c) return true; // acTL
      if (chunk === 0x49444154) break; // IDAT
    }
  }
  return false;
}

export async function encodeWanderPhoto(
  source: CanvasImageSource,
  width: number,
  height: number,
  name: string,
  lastModified: number,
  fallbackType: 'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<File> {
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo processing is unavailable in this browser.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  try {
    const encode = (type: string) =>
      new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, WEBP_QUALITY));
    let blob = await encode('image/webp');
    // Browsers without WebP encoding support return PNG.
    if (blob?.type !== 'image/webp' && fallbackType === 'image/jpeg') {
      blob = await encode('image/jpeg');
    }
    if (!blob?.size) throw new Error('Could not encode photo.');
    const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type.slice('image/'.length);
    return new File([blob], `${name.replace(/\.[^.]+$/, '')}.${extension}`, {
      type: blob.type,
      lastModified,
    });
  } finally {
    canvas.width = canvas.height = 1;
  }
}

export async function prepareWanderPhoto(file: File): Promise<File> {
  if (!WANDER_PHOTO_TYPES.includes(file.type as WanderPhotoType)) {
    throw new Error('Choose a JPEG, PNG, or WebP photo.');
  }
  if (!file.size) throw new Error('This photo is empty. Choose another photo.');

  // Detach from temporary gallery handles before decoding or clearing the input.
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
    if (bytes.byteLength !== file.size) throw new Error('Incomplete photo read.');
  } catch {
    throw new Error('The browser could not read this photo. Please choose it again or take a new photo.');
  }

  const stable = new File([bytes], file.name || 'wander-photo', {
    type: file.type,
    lastModified: file.lastModified,
  });
  if (isAnimatedPhoto(bytes, stable.type)) {
    validateWanderPhoto(stable);
    return stable;
  }

  const url = URL.createObjectURL(stable);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const encoded = await encodeWanderPhoto(
      image, image.naturalWidth, image.naturalHeight, stable.name, stable.lastModified,
      stable.type === 'image/jpeg' ? 'image/jpeg' : 'image/png',
    );
    if (encoded.size < stable.size) {
      validateWanderPhoto(encoded);
      return encoded;
    }
  } catch {
    // A readable original can still be uploaded if the browser cannot encode it.
  } finally {
    URL.revokeObjectURL(url);
  }
  validateWanderPhoto(stable);
  return stable;
}
