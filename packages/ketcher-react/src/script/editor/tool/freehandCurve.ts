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
      const action = fromSimpleObjectAddition(
        this.editor.render.ctab,
        this.points.map((point) => new Vec2(point)),
        SimpleObjectMode.polyline,
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
    const points = this.points.map((point) =>
      Scale.modelToCanvas(point, render.options),
    );
    const path: Array<string | number> = ['M', points[0].x, points[0].y];
    points.slice(1).forEach((point) => path.push('L', point.x, point.y));
    this.preview = render.paper.path(path).attr(render.options.lineattr);
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
