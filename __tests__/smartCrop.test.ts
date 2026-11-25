import {
  computeCoverLayout,
  DEFAULT_CROP,
  panCrop,
  sanitizeCrop,
  stepZoom,
} from '../src/utils/smartCrop';

describe('smart crop', () => {
  it('covers the viewport without distorting the image ratio', () => {
    const layout = computeCoverLayout(4000, 3000, 800, 360);

    expect(layout.width / layout.height).toBeCloseTo(4000 / 3000, 5);
    expect(layout.width).toBeGreaterThanOrEqual(800);
    expect(layout.height).toBeGreaterThanOrEqual(360);
  });

  it('centres the image with the default focal point', () => {
    const layout = computeCoverLayout(4000, 3000, 800, 360, DEFAULT_CROP);

    expect(layout.left).toBeCloseTo((800 - layout.width) / 2, 5);
    expect(layout.top).toBeCloseTo((360 - layout.height) / 2, 5);
  });

  it('moves the focal point towards an edge', () => {
    const layout = computeCoverLayout(4000, 3000, 800, 360, {
      ...DEFAULT_CROP,
      fx: 0,
      fy: 0,
    });

    expect(layout.left).toBeCloseTo(0, 5);
    expect(layout.top).toBeCloseTo(0, 5);
  });

  it('zooms around the same focal point', () => {
    const cropped = computeCoverLayout(4000, 3000, 800, 360, {
      ...DEFAULT_CROP,
      zoom: 2,
    });
    const cover = computeCoverLayout(4000, 3000, 800, 360, DEFAULT_CROP);

    expect(cropped.width).toBeCloseTo(cover.width * 2, 5);
    expect(cropped.height).toBeCloseTo(cover.height * 2, 5);
    expect(cropped.width / cropped.height).toBeCloseTo(4 / 3, 5);
  });

  it('clamps invalid crop values', () => {
    const crop = sanitizeCrop({ fx: -4, fy: 8, zoom: 99 });

    expect(crop).toEqual({ fx: 0, fy: 1, zoom: 3 });
  });

  it('follows the finger while panning', () => {
    const crop = { ...DEFAULT_CROP, zoom: 2 };
    const layout = computeCoverLayout(4000, 3000, 800, 360, crop);

    // Dragging the image to the right decreases the focal point on the x axis.
    const next = panCrop(crop, 40, 0, layout, 800, 360);

    expect(next.fx).toBeLessThan(crop.fx);
    expect(next.fy).toBeCloseTo(crop.fy, 5);
  });

  it('steps the zoom within the supported range', () => {
    expect(stepZoom(DEFAULT_CROP, -1).zoom).toBe(1);
    expect(stepZoom(DEFAULT_CROP, 0.1).zoom).toBe(1.1);
    expect(stepZoom({ ...DEFAULT_CROP, zoom: 2.98 }, 0.1).zoom).toBe(3);
  });

  it('falls back safely when the image size is unknown', () => {
    const layout = computeCoverLayout(0, 0, 800, 360);

    expect(layout).toEqual({ left: 0, top: 0, width: 800, height: 360 });
  });
});
