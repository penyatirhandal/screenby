import type { CropState } from '../types';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export const DEFAULT_CROP: CropState = { fx: 0.5, fy: 0.5, zoom: 1 };

export interface CropLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalises a crop coming from storage or gestures. The focal point lives in the
 * 0..1 range and the zoom multiplier never drops below a cover fit.
 */
export function sanitizeCrop(crop?: Partial<CropState> | null): CropState {
  return {
    fx: clamp(crop?.fx ?? DEFAULT_CROP.fx, 0, 1),
    fy: clamp(crop?.fy ?? DEFAULT_CROP.fy, 0, 1),
    zoom: clamp(crop?.zoom ?? DEFAULT_CROP.zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

/**
 * Smart Crop: scale the image so it always covers the viewport (cover fit) and place
 * it according to the focal point. No distortion: width/height keep the image ratio.
 */
export function computeCoverLayout(
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
  crop?: Partial<CropState> | null,
): CropLayout {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    viewWidth <= 0 ||
    viewHeight <= 0
  ) {
    return {
      left: 0,
      top: 0,
      width: Math.max(viewWidth, 0),
      height: Math.max(viewHeight, 0),
    };
  }

  const safeCrop = sanitizeCrop(crop);
  const coverScale = Math.max(viewWidth / imageWidth, viewHeight / imageHeight);
  const scale = coverScale * safeCrop.zoom;

  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const left = (viewWidth - width) * safeCrop.fx;
  const top = (viewHeight - height) * safeCrop.fy;

  return { left, top, width, height };
}

/**
 * Converts a drag delta (in view pixels) into a new focal point. Dragging the image
 * to the right moves the focal point to the left, so the image follows the finger.
 */
export function panCrop(
  crop: CropState,
  dx: number,
  dy: number,
  layout: CropLayout,
  viewWidth: number,
  viewHeight: number,
): CropState {
  const overflowX = layout.width - viewWidth;
  const overflowY = layout.height - viewHeight;

  return sanitizeCrop({
    ...crop,
    fx: overflowX > 0 ? crop.fx - dx / overflowX : crop.fx,
    fy: overflowY > 0 ? crop.fy - dy / overflowY : crop.fy,
  });
}

/** Rounds the zoom so the label and stored state stay predictable. */
export function stepZoom(crop: CropState, delta: number): CropState {
  const zoom = Math.round((crop.zoom + delta) * 100) / 100;
  return sanitizeCrop({ ...crop, zoom });
}
