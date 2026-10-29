/****************************************************************************
 * Copyright 2026 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 ***************************************************************************/

import {
  CoordinateTransformation,
  Scale,
  SimpleObjectMode,
  Vec2,
  fromSimpleObjectAddition,
} from 'ketcher-core';
import type Editor from '../Editor';
import type { Selection } from '../Editor';
import type { Tool } from './Tool';

const MIN_SAMPLE_DISTANCE_PX = 3;
const MAX_BEZIER_SEGMENTS = 24;

/** Convert sampled freehand points to a continuous cubic Bézier chain. */
export function fitFreehandBezier(points: Vec2[]): Vec2[] {
  if (points.length < 2) return points.map((point) => new Vec2(point));

  const anchors = downsampleAnchors(points, MAX_BEZIER_SEGMENTS);
  if (anchors.length === 2) {
    const start = anchors[0];
    const end = anchors[1];
    const delta = end.sub(start);
    return [
      new Vec2(start),
      new Vec2(start.x + delta.x / 3, start.y + delta.y / 3),
      new Vec2(start.x + (delta.x * 2) / 3, start.y + (delta.y * 2) / 3),
      new Vec2(end),
    ];
  }

  const result: Vec2[] = [new Vec2(anchors[0])];
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const current = anchors[index];
    const next = anchors[index + 1];
    const previous = index === 0 ? current : anchors[index - 1];
    const afterNext = index + 2 >= anchors.length ? next : anchors[index + 2];
    const control1 = new Vec2(
      current.x + (next.x - previous.x) / 6,
      current.y + (next.y - previous.y) / 6,
    );
    const control2 = new Vec2(
      next.x - (afterNext.x - current.x) / 6,
      next.y - (afterNext.y - current.y) / 6,
    );
    result.push(control1, control2, new Vec2(next));
  }
  return result;
}

function downsampleAnchors(points: Vec2[], maxSegments: number): Vec2[] {
  const segmentCount = Math.min(maxSegments, points.length - 1);
  const anchors: Vec2[] = [];
  for (let index = 0; index <= segmentCount; index += 1) {
    const sourceIndex = Math.round(
      (index * (points.length - 1)) / segmentCount,
    );
    const point = points[sourceIndex];
    if (!point) continue;
    if (!anchors.length || Vec2.dist(anchors[anchors.length - 1], point) > 0) {
      anchors.push(new Vec2(point));
    }
  }
  return anchors;
}

function bezierPathCommands(points: Vec2[]): Array<string | number> {
  const commands: Array<string | number> = ['M', points[0].x, points[0].y];
  for (let index = 1; index + 2 < points.length; index += 3) {
    commands.push(
      'C',
      points[index].x,
      points[index].y,
      points[index + 1].x,
      points[index + 1].y,
      points[index + 2].x,
      points[index + 2].y,
    );
  }
  return commands;
}

class FreehandCurveTool implements Tool {
  private readonly editor: Editor;
  private points: Vec2[] = [];
  private preview: any;

  constructor(editor: Editor) {
    this.editor = editor;
    this.editor.selection(null);
  }

  mousedown(event) {
    this.removePreview();
    this.points = [
      CoordinateTransformation.pageToModel(event, this.editor.render),
    ];
    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;
    this.editor.selection(null);
  }

  mousemove(event) {
    if (!this.points.length) return;

    const lastPointer = this.points.at(-1)!;
    const lastClientX = this.lastClientX ?? event.clientX;
    const lastClientY = this.lastClientY ?? event.clientY;
    const pointerDistance = Math.hypot(
      event.clientX - lastClientX,
      event.clientY - lastClientY,
    );
    if (pointerDistance < MIN_SAMPLE_DISTANCE_PX) return;

    const point = CoordinateTransformation.pageToModel(
      event,
      this.editor.render,
    );
    if (point.x === lastPointer.x && point.y === lastPointer.y) return;

    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;
    this.points.push(point);
    this.renderPreview();
  }

  mouseup(event) {
    if (!this.points.length) return;

    const end = CoordinateTransformation.pageToModel(event, this.editor.render);
    const last = this.points.at(-1)!;
    if (end.x !== last.x || end.y !== last.y) this.points.push(end);

    this.removePreview();
    if (this.points.length > 1) {
      const bezierPoints = fitFreehandBezier(this.points);
      const action = fromSimpleObjectAddition(
        this.editor.render.ctab,
        bezierPoints,
        SimpleObjectMode.bezier,
        false,
      );
      this.editor.update(action);
      const id = (action.operations[0]?.data as { id?: unknown } | undefined)?.id;
      this.editor.selection(
        Number.isInteger(id) ? ({ simpleObjects: [id] } as Selection) : null,
      );
    }

    this.reset();
  }

  mouseleave() {
    this.cancel();
  }

  cancel() {
    this.removePreview();
    this.reset();
  }

  private renderPreview() {
    this.removePreview();
    if (this.points.length < 2) return;

    const render = this.editor.render;
    const points = fitFreehandBezier(this.points).map((point) =>
      Scale.modelToCanvas(point, render.options),
    );
    this.preview = render.paper
      .path(bezierPathCommands(points))
      .attr(render.options.lineattr);
  }

  private removePreview() {
    this.preview?.remove();
    this.preview = null;
  }

  private reset() {
    this.points = [];
    this.lastClientX = undefined;
    this.lastClientY = undefined;
  }

  private lastClientX?: number;
  private lastClientY?: number;
}

export default FreehandCurveTool;
