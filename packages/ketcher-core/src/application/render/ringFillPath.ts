import type { Vec2 } from 'domain/entities/vec2';
import { toFixed } from 'utilities';

/** The polygon sits below bond/atom visuals and never changes chemical topology. */
export function ringFillPath(points: Vec2[]): string {
  if (points.length < 3 || points.some((point) =>
    !Number.isFinite(point.x) || !Number.isFinite(point.y))) return '';
  return points.map((point, index) =>
    `${index ? 'L' : 'M'}${toFixed(point.x)},${toFixed(point.y)}`,
  ).join('') + 'Z';
}
