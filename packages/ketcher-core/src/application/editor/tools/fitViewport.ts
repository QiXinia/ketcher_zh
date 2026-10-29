export interface FitViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FitViewportTransform {
  scale: number;
  x: number;
  y: number;
  clipped: boolean;
}

/** Calculate a screen-space fit without moving any drawing objects. */
export function fitViewport(
  bounds: FitViewportBounds,
  viewport: { width: number; height: number },
  minScale = 0.2,
  maxScale = 4,
  padding = 24,
): FitViewportTransform | null {
  const values = [
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    viewport.width,
    viewport.height,
    minScale,
    maxScale,
    padding,
  ];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    bounds.width < 0 ||
    bounds.height < 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    minScale <= 0 ||
    maxScale < minScale ||
    padding < 0
  )
    return null;
  const horizontalPadding = Math.min(padding, viewport.width / 4);
  const verticalPadding = Math.min(padding, viewport.height / 4);
  const availableWidth = viewport.width - horizontalPadding * 2;
  const availableHeight = viewport.height - verticalPadding * 2;
  const fitScale = Math.min(
    bounds.width ? availableWidth / bounds.width : Infinity,
    bounds.height ? availableHeight / bounds.height : Infinity,
    maxScale,
  );
  const scale = Math.min(maxScale, Math.max(minScale, fitScale));
  return {
    scale,
    x: viewport.width / 2 - (bounds.x + bounds.width / 2) * scale,
    y: viewport.height / 2 - (bounds.y + bounds.height / 2) * scale,
    clipped: fitScale < minScale,
  };
}
