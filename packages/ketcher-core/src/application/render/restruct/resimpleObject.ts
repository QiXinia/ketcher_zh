/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

import {
  SimpleObjectArrow,
  SimpleObjectFill,
  SimpleObjectMode,
  SimpleObjectBracketType,
} from 'domain/entities/simpleObject';
import { Vec2 } from 'domain/entities/vec2';

import { LayerMap } from './generalEnumTypes';
import ReObject from './reobject';
import type ReStruct from './restruct';
import type { Render } from '../raphaelRender';
import type { RenderOptions } from '../render.types';
import { Scale } from 'domain/helpers';
import draw from '../draw';
import { getArrowHeadDimensions } from '../draw';
import { toFixed } from 'utilities';
import type { Element, RaphaelPaper, RaphaelSet } from 'raphael';

interface MinDistanceWithReferencePoint {
  minDist: number;
  refPoint: Vec2 | null;
}
interface StyledPath {
  path: Element;
  stylesApplied: boolean;
}
interface SimpleObjectItem {
  mode: SimpleObjectMode;
  pos: Array<Vec2>;
}
class ReSimpleObject extends ReObject {
  private readonly item: SimpleObjectItem;
  private selectionSet: RaphaelSet;
  private selectionPointsSet: RaphaelSet;

  constructor(simpleObject: SimpleObjectItem) {
    super('simpleObject');
    this.item = simpleObject;
  }

  static isSelectable(): boolean {
    return true;
  }

  calcDistance(p: Vec2, s: number): MinDistanceWithReferencePoint {
    const point: Vec2 = new Vec2(p.x, p.y);

    const distRef: MinDistanceWithReferencePoint =
      this.getReferencePointDistance(p);
    const item = this.item;
    const mode = item.mode;
    const pos = item.pos;
    let dist: number;

    switch (mode) {
      case SimpleObjectMode.ellipse: {
        const rad = Vec2.diff(pos[1], pos[0]);
        const rx = rad.x / 2;
        const ry = rad.y / 2;
        const center = Vec2.sum(pos[0], new Vec2(rx, ry));
        const pointToCenter = Vec2.diff(point, center);
        if (rx !== 0 && ry !== 0) {
          dist = Math.abs(
            1 -
              (pointToCenter.x * pointToCenter.x) / (rx * rx) -
              (pointToCenter.y * pointToCenter.y) / (ry * ry),
          );
        } else {
          // in case rx or ry is equal to 0 we have a line as a trivial case of ellipse
          // in such case distance need to be calculated as a distance between line and current point
          dist = point.calculateDistanceToLine([pos[0], pos[1]]);
        }
        break;
      }
      case SimpleObjectMode.rectangle: {
        const topX = Math.min(pos[0].x, pos[1].x);
        const topY = Math.min(pos[0].y, pos[1].y);
        const bottomX = Math.max(pos[0].x, pos[1].x);
        const bottomY = Math.max(pos[0].y, pos[1].y);

        const distances: Array<number> = [];

        if (point.x >= topX && point.x <= bottomX) {
          if (point.y < topY) {
            distances.push(topY - point.y);
          } else if (point.y > bottomY) {
            distances.push(point.y - bottomY);
          } else {
            distances.push(point.y - topY, bottomY - point.y);
          }
        }
        if (point.x < topX && point.y < topY) {
          distances.push(Vec2.dist(new Vec2(topX, topY), point));
        }
        if (point.x > bottomX && point.y > bottomY) {
          distances.push(Vec2.dist(new Vec2(bottomX, bottomY), point));
        }
        if (point.x < topX && point.y > bottomY) {
          distances.push(Vec2.dist(new Vec2(topX, bottomY), point));
        }
        if (point.x > bottomX && point.y < topY) {
          distances.push(Vec2.dist(new Vec2(bottomX, topY), point));
        }
        if (point.y >= topY && point.y <= bottomY) {
          if (point.x < topX) {
            distances.push(topX - point.x);
          } else if (point.x > bottomX) {
            distances.push(point.x - bottomX);
          } else {
            distances.push(point.x - topX, bottomX - point.x);
          }
        }
        dist = Math.min(...distances);
        break;
      }
      case SimpleObjectMode.line: {
        dist = point.calculateDistanceToLine([pos[0], pos[1]]);
        break;
      }
      case SimpleObjectMode.polyline: {
        dist = Math.min(...pos.slice(1).map((end, index) =>
          point.calculateDistanceToLine([pos[index], end]),
        ));
        break;
      }
      case SimpleObjectMode.bezier: {
        dist = bezierDistance(point, pos);
        break;
      }
      case SimpleObjectMode.bracket: {
        dist = bracketDistance(point, pos);
        break;
      }

      default: {
        throw new Error('Unsupported shape type');
      }
    }

    const refPoint: Vec2 | null =
      distRef.minDist <= 8 / s ? distRef.refPoint : null;
    // distance is a smallest between dist to figure and it's reference points
    dist = Math.min(distRef.minDist, dist);
    return { minDist: dist, refPoint };
  }

  getReferencePointDistance(p: Vec2): MinDistanceWithReferencePoint {
    const dist: Array<MinDistanceWithReferencePoint> = [];
    const refPoints = this.getReferencePoints();
    refPoints.forEach((rp) => {
      dist.push({ minDist: Math.abs(Vec2.dist(p, rp)), refPoint: rp });
    });

    const minDist: MinDistanceWithReferencePoint = dist.reduce(
      (acc, current) => (acc.minDist < current.minDist ? acc : current),
    );

    return minDist;
  }

  getReferencePoints(): Array<Vec2> {
    const refPoints: Array<Vec2> = [];
    switch (this.item.mode) {
      case SimpleObjectMode.ellipse:
      case SimpleObjectMode.rectangle: {
        const p0: Vec2 = new Vec2(
          Math.min(this.item.pos[0].x, this.item.pos[1].x),
          Math.min(this.item.pos[0].y, this.item.pos[1].y),
        );
        const w = Math.abs(Vec2.diff(this.item.pos[0], this.item.pos[1]).x);
        const h = Math.abs(Vec2.diff(this.item.pos[0], this.item.pos[1]).y);

        refPoints.push(
          new Vec2(p0.x + 0.5 * w, p0.y),
          new Vec2(p0.x + w, p0.y + 0.5 * h),
          new Vec2(p0.x + 0.5 * w, p0.y + h),
          new Vec2(p0.x, p0.y + 0.5 * h),
        );
        refPoints.push(
          p0,
          new Vec2(p0.x, p0.y + h),
          new Vec2(p0.x + w, p0.y + h),
          new Vec2(p0.x + w, p0.y),
        );
        break;
      }
      case SimpleObjectMode.line: {
        this.item.pos.forEach((i) => refPoints.push(new Vec2(i.x, i.y, 0)));
        break;
      }
      case SimpleObjectMode.polyline: {
        this.item.pos.forEach((i) => refPoints.push(new Vec2(i.x, i.y, 0)));
        break;
      }
      case SimpleObjectMode.bezier: {
        this.item.pos.forEach((i) => refPoints.push(new Vec2(i.x, i.y, 0)));
        break;
      }
      case SimpleObjectMode.bracket: {
        this.item.pos.forEach((i) => refPoints.push(new Vec2(i.x, i.y, 0)));
        break;
      }

      default: {
        throw new Error('Unsupported shape type');
      }
    }
    return refPoints;
  }

  getReferencePointsOnObject(): Array<Vec2> {
    const refPoints: Array<Vec2> = [];
    switch (this.item.mode) {
      case SimpleObjectMode.ellipse:
      case SimpleObjectMode.rectangle: {
        const p0: Vec2 = new Vec2(
          Math.min(this.item.pos[0].x, this.item.pos[1].x),
          Math.min(this.item.pos[0].y, this.item.pos[1].y),
        );
        const w = Math.abs(Vec2.diff(this.item.pos[0], this.item.pos[1]).x);
        const h = Math.abs(Vec2.diff(this.item.pos[0], this.item.pos[1]).y);

        refPoints.push(
          new Vec2(p0.x + 0.5 * w, p0.y),
          new Vec2(p0.x + w, p0.y + 0.5 * h),
          new Vec2(p0.x + 0.5 * w, p0.y + h),
          new Vec2(p0.x, p0.y + 0.5 * h),
        );
        if (this.item.mode === SimpleObjectMode.rectangle) {
          refPoints.push(
            p0,
            new Vec2(p0.x, p0.y + h),
            new Vec2(p0.x + w, p0.y + h),
            new Vec2(p0.x + w, p0.y),
          );
        }
        break;
      }
      case SimpleObjectMode.line: {
        this.item.pos.forEach((i) => refPoints.push(new Vec2(i.x, i.y, 0)));
        break;
      }
      case SimpleObjectMode.polyline: {
        this.item.pos.forEach((i) => refPoints.push(new Vec2(i.x, i.y, 0)));
        break;
      }
      case SimpleObjectMode.bezier: {
        this.item.pos.forEach((i) => refPoints.push(new Vec2(i.x, i.y, 0)));
        break;
      }
      case SimpleObjectMode.bracket: {
        this.item.pos.forEach((i) => refPoints.push(new Vec2(i.x, i.y, 0)));
        break;
      }

      default: {
        throw new Error('Unsupported shape type');
      }
    }
    return refPoints;
  }

  getBorderHoverPath(path: Element, render: Render) {
    return path.attr({ ...render.options.hoverStyle, fill: 'none' });
  }

  getFillHoverPath(path: Element, render: Render) {
    return path.attr(render.options.innerHoverStyle);
  }

  hoverPath(render: Render): Array<StyledPath> {
    const point: Array<Vec2> = [];

    this.item.pos.forEach((p, index) => {
      point[index] = Scale.modelToCanvas(p, render.options);
    });
    const scaleFactor = render.options.microModeScale;

    const paths: Array<StyledPath> = [];

    // TODO: It seems that inheritance will be the better approach here
    const lineOffset = scaleFactor / 8;
    switch (this.item.mode) {
      case SimpleObjectMode.ellipse: {
        const rad = Vec2.diff(point[1], point[0]);
        const rx = rad.x / 2;
        const ry = rad.y / 2;
        const centerX = toFixed(point[0].x + rx);
        const centerY = toFixed(point[0].y + ry);
        const outerBorderEllipse = render.paper.ellipse(
          centerX,
          centerY,
          toFixed(Math.abs(rx) + lineOffset),
          toFixed(Math.abs(ry) + lineOffset),
        );
        paths.push({
          path: this.getBorderHoverPath(outerBorderEllipse, render),
          stylesApplied: true,
        });

        const fillEllipse = render.paper.ellipse(
          centerX,
          centerY,
          toFixed(Math.abs(rx)),
          toFixed(Math.abs(ry)),
        );
        paths.push({
          path: this.getFillHoverPath(fillEllipse, render),
          stylesApplied: true,
        });
        if (
          Math.abs(rx) - scaleFactor / 8 > 0 &&
          Math.abs(ry) - scaleFactor / 8 > 0
        ) {
          const innerBorderEllipse = render.paper.ellipse(
            centerX,
            centerY,
            toFixed(Math.abs(rx) - lineOffset),
            toFixed(Math.abs(ry) - lineOffset),
          );
          paths.push({
            path: this.getBorderHoverPath(innerBorderEllipse, render),
            stylesApplied: true,
          });
        }
        break;
      }

      case SimpleObjectMode.rectangle: {
        const leftX = Math.min(point[0].x, point[1].x);
        const topY = Math.min(point[0].y, point[1].y);
        const rightX = Math.max(point[0].x, point[1].x) - leftX;
        const bottomY = Math.max(point[0].y, point[1].y) - topY;

        const outerBorderRect = render.paper.rect(
          toFixed(leftX - lineOffset),
          toFixed(topY - lineOffset),
          toFixed(rightX + 2 * lineOffset),
          toFixed(bottomY + 2 * lineOffset),
        );
        paths.push({
          path: this.getBorderHoverPath(outerBorderRect, render),
          stylesApplied: true,
        });
        const fillRect = render.paper.rect(
          toFixed(leftX),
          toFixed(topY),
          toFixed(rightX),
          toFixed(bottomY),
        );
        paths.push({
          path: this.getFillHoverPath(fillRect, render),
          stylesApplied: true,
        });
        if (rightX - 2 * lineOffset > 0 && bottomY - 2 * lineOffset > 0) {
          const innerRect = render.paper.rect(
            toFixed(leftX + lineOffset),
            toFixed(topY + lineOffset),
            toFixed(rightX - 2 * lineOffset),
            toFixed(bottomY - 2 * lineOffset),
          );
          paths.push({
            path: this.getBorderHoverPath(innerRect, render),
            stylesApplied: true,
          });
        }

        break;
      }
      case SimpleObjectMode.line: {
        // TODO: reuse this code for polyline
        const poly: Array<string | number> = [];

        const angle = Math.atan(
          (point[1].y - point[0].y) / (point[1].x - point[0].x),
        );

        const p0 = { x: 0, y: 0 };
        const p1 = { x: 0, y: 0 };

        const k = point[0].x > point[1].x ? -1 : 1;

        p0.x = point[0].x - k * ((scaleFactor / 8) * Math.cos(angle));
        p0.y = point[0].y - k * ((scaleFactor / 8) * Math.sin(angle));
        p1.x = point[1].x + k * ((scaleFactor / 8) * Math.cos(angle));
        p1.y = point[1].y + k * ((scaleFactor / 8) * Math.sin(angle));

        poly.push(
          'M',
          p0.x + ((k * scaleFactor) / 8) * Math.sin(angle),
          p0.y - ((k * scaleFactor) / 8) * Math.cos(angle),
        );
        poly.push(
          'L',
          p1.x + ((k * scaleFactor) / 8) * Math.sin(angle),
          p1.y - ((k * scaleFactor) / 8) * Math.cos(angle),
        );
        poly.push(
          'L',
          p1.x - ((k * scaleFactor) / 8) * Math.sin(angle),
          p1.y + ((k * scaleFactor) / 8) * Math.cos(angle),
        );
        poly.push(
          'L',
          p0.x - ((k * scaleFactor) / 8) * Math.sin(angle),
          p0.y + ((k * scaleFactor) / 8) * Math.cos(angle),
        );
        poly.push(
          'L',
          p0.x + ((k * scaleFactor) / 8) * Math.sin(angle),
          p0.y - ((k * scaleFactor) / 8) * Math.cos(angle),
        );
        paths.push({
          path: render.paper.path(poly).attr(render.options.hoverStyle),
          stylesApplied: true,
        });
        break;
      }
      case SimpleObjectMode.polyline: {
        paths.push({
          path: draw.polyline(render.paper, point).attr(render.options.hoverStyle),
          stylesApplied: true,
        });
        break;
      }
      case SimpleObjectMode.bezier: {
        paths.push({
          path: generatePath(this.item.mode, render.paper, point, this.item.closed)
            .attr(render.options.hoverStyle),
          stylesApplied: true,
        });
        break;
      }
      case SimpleObjectMode.bracket: {
        paths.push({
          path: generatePath(this.item.mode, render.paper, point, false, this.item.bracketType)
            .attr(render.options.hoverStyle),
          stylesApplied: true,
        });
        break;
      }
      default: {
        throw new Error('Unsupported shape type');
      }
    }

    return paths;
  }

  drawHover(render: Render): Array<Element> {
    const paths: Array<Element> = this.hoverPath(render).map((enhPath) => {
      if (!enhPath.stylesApplied) {
        return enhPath.path.attr(render.options.hoverStyle);
      }
      return enhPath.path;
    });

    render.ctab.addReObjectPath(LayerMap.hovering, this.visel, paths);
    return paths;
  }

  makeSelectionPlate(
    restruct: ReStruct,
    paper: RaphaelPaper,
    styles: RenderOptions,
  ): RaphaelSet {
    const pos = this.item.pos.map((p) => {
      return Scale.modelToCanvas(p, restruct.render.options) || new Vec2();
    });

    const refPoints = this.getReferencePoints();
    const scaleFactor = restruct.render.options.microModeScale;
    this.selectionSet = restruct.render.paper.set();
    this.selectionPointsSet = restruct.render.paper.set();
    this.selectionSet.push(
      generatePath(this.item.mode, paper, pos, false, this.item.bracketType).attr(
        styles.selectionStyleSimpleObject,
      ),
    );
    refPoints.forEach((rp) => {
      const scaledRP = Scale.modelToCanvas(rp, restruct.render.options);
      this.selectionPointsSet.push(
        restruct.render.paper
          .circle(scaledRP.x, scaledRP.y, scaleFactor / 8)
          .attr({ fill: 'black' }),
      );
    });
    restruct.addReObjectPath(
      LayerMap.selectionPoints,
      this.visel,
      this.selectionPointsSet,
    );
    return this.selectionSet;
  }

  showPoints() {
    this.selectionPointsSet?.show();
  }

  hidePoints() {
    this.selectionPointsSet?.hide();
  }

  show(restruct: ReStruct, options: RenderOptions): void {
    const render = restruct.render;
    const pos = this.item.pos.map((p) => {
      return Scale.modelToCanvas(p, options) || new Vec2();
    });

    const paths = [
      ...generateCurvePaths(this.item, render.paper, pos, options),
      ...generateArrowPaths(
        this.item.mode,
        render.paper,
        pos,
        options,
        this.item.startArrow,
        this.item.endArrow,
      ),
    ];

    paths.forEach((path, index) => {
      applySimpleObjectStyle(path, this.item.style);
      if (this.item.color) path.attr({ stroke: this.item.color });
      if (index < (this.item.doubled ? 2 : 1)) {
        applySimpleObjectDecoration(path, this.item, options, index > 0);
      }
      if (this.item.faded) {
        path.attr({ 'stroke-opacity': 0.35, 'fill-opacity': 0.35 });
      }

      const offset = options.offset;
      if (offset != null) path.translateAbs(offset.x, offset.y);

      restruct.addReObjectPath(LayerMap.data, this.visel, path, null, true);
    });
  }
}

function generateCurvePaths(item: any, paper: any, pos: Vec2[], options: any): any[] {
  const mainPath = generatePath(
    item.mode,
    paper,
    pos,
    item.closed,
  );
  const paths = [mainPath];
  if (
    item.doubled &&
    (item.mode === SimpleObjectMode.line ||
      item.mode === SimpleObjectMode.polyline ||
      item.mode === SimpleObjectMode.bezier) &&
    pos.length > 1
  ) {
    const direction = directionFrom(pos[0], pos[1]);
    if (direction) {
      const gap = Math.max(2, options.microModeScale / 7);
      const normal = new Vec2(-direction.y * gap, direction.x * gap);
      paths.push(
        generatePath(
          item.mode,
          paper,
          pos.map((point) => new Vec2(point.x + normal.x, point.y + normal.y)),
          item.closed,
        ),
      );
    }
  }
  return paths;
}

function generateArrowPaths(
  mode: SimpleObjectMode,
  paper: any,
  pos: Vec2[],
  options: any,
  startArrow?: SimpleObjectArrow,
  endArrow?: SimpleObjectArrow,
): any[] {
  if (
    (mode !== SimpleObjectMode.line &&
      mode !== SimpleObjectMode.polyline &&
      mode !== SimpleObjectMode.bezier) ||
    pos.length < 2
  ) {
    return [];
  }

  const paths: any[] = [];
  const start = createArrowPath(
    paper,
    pos[0],
    directionFrom(pos[1], pos[0]),
    startArrow,
    options,
  );
  const end = createArrowPath(
    paper,
    pos[pos.length - 1],
    directionFrom(pos[pos.length - 2], pos[pos.length - 1]),
    endArrow,
    options,
  );
  if (start) paths.push(start);
  if (end) paths.push(end);
  return paths;
}

function directionFrom(from: Vec2, to: Vec2): Vec2 | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return length === 0 ? null : new Vec2(dx / length, dy / length);
}

function createArrowPath(
  paper: any,
  tip: Vec2,
  direction: Vec2 | null,
  arrow: SimpleObjectArrow | undefined,
  options: any,
): any | null {
  if (!direction || !arrow || arrow === SimpleObjectArrow.none) return null;

  const { arrowHeadLength, arrowHeadWidth } = getArrowHeadDimensions(options);
  const normal = new Vec2(-direction.y, direction.x);
  const base = new Vec2(
    tip.x - direction.x * arrowHeadLength,
    tip.y - direction.y * arrowHeadLength,
  );
  const side = arrow === SimpleObjectArrow.halfRight ? -1 : 1;
  const sidePoint = new Vec2(
    base.x + normal.x * arrowHeadWidth * side,
    base.y + normal.y * arrowHeadWidth * side,
  );

  if (arrow === SimpleObjectArrow.full) {
    const otherPoint = new Vec2(
      base.x - normal.x * arrowHeadWidth,
      base.y - normal.y * arrowHeadWidth,
    );
    return paper
      .path(
        `M${toFixed(tip.x)},${toFixed(tip.y)}` +
          `L${toFixed(sidePoint.x)},${toFixed(sidePoint.y)}` +
          `L${toFixed(otherPoint.x)},${toFixed(otherPoint.y)}Z`,
      )
      .attr({
        ...options.lineattr,
        fill: options.lineattr.stroke,
        stroke: options.lineattr.stroke,
        'stroke-width': 0,
      });
  }

  return paper
    .path(
      `M${toFixed(tip.x)},${toFixed(tip.y)}L${toFixed(
        sidePoint.x,
      )},${toFixed(sidePoint.y)}`,
    )
    .attr({ ...options.lineattr, fill: 'none' });
}

function generatePath(
  mode: SimpleObjectMode,
  paper: RaphaelPaper,
  pos: Vec2[],
  closed = false,
  bracketType?: SimpleObjectBracketType,
): Element {
  let path: Element;
  switch (mode) {
    case SimpleObjectMode.ellipse: {
      path = draw.ellipse(paper, pos as [Vec2, Vec2]);
      break;
    }
    case SimpleObjectMode.rectangle: {
      path = draw.rectangle(paper, pos as [Vec2, Vec2]);
      break;
    }
    case SimpleObjectMode.line: {
      if (closed) {
        path = paper.path([
          'M',
          pos[0].x,
          pos[0].y,
          'L',
          pos[1].x,
          pos[1].y,
          'Z',
        ]);
      } else {
        path = draw.line(paper, pos as [Vec2, Vec2]);
      }
      break;
    }
    case SimpleObjectMode.polyline: {
      if (closed) {
        const commands: Array<string | number> = ['M', pos[0].x, pos[0].y];
        pos.slice(1).forEach((point) => commands.push('L', point.x, point.y));
        commands.push('Z');
        path = paper.path(commands);
      } else {
        path = draw.polyline(paper, pos);
      }
      break;
    }
    case SimpleObjectMode.bezier: {
      const start = pos[0];
      const control1 = pos[1] || start;
      const control2 = pos[2] || pos[3] || start;
      const end = pos[3] || pos[2] || start;
      path = paper.path([
        'M', start.x, start.y,
        'C', control1.x, control1.y, control2.x, control2.y, end.x, end.y,
        ...(closed ? ['Z'] : []),
      ]);
      break;
    }
    case SimpleObjectMode.bracket: {
      path = generateBracketPath(paper, pos, bracketType ?? SimpleObjectBracketType.bracket);
      break;
    }
    default: {
      throw new Error('Unsupported shape type');
    }
  }

  return path;
}

function bracketDistance(point: Vec2, pos: Vec2[]): number {
  if (pos.length < 2) return Infinity;
  const left = new Vec2(pos[0].x, pos[1].y);
  const right = new Vec2(pos[1].x, pos[0].y);
  return Math.min(
    point.calculateDistanceToLine([pos[0], new Vec2(pos[0].x, pos[1].y)]),
    point.calculateDistanceToLine([pos[1], new Vec2(pos[1].x, pos[0].y)]),
    point.calculateDistanceToLine([pos[0], right]),
    point.calculateDistanceToLine([left, pos[1]]),
  );
}

function generateBracketPath(paper: any, pos: Vec2[], type: SimpleObjectBracketType): any {
  const left = Math.min(pos[0].x, pos[1].x);
  const right = Math.max(pos[0].x, pos[1].x);
  const top = Math.min(pos[0].y, pos[1].y);
  const bottom = Math.max(pos[0].y, pos[1].y);
  const width = Math.max(4, (right - left) * 0.08);
  const mid = (top + bottom) / 2;
  const brace = type === SimpleObjectBracketType.brace;
  const parenthesis = type === SimpleObjectBracketType.parenthesis;
  const leftPath = brace
    ? `M${left + width},${top} C${left},${top} ${left + width},${mid - width} ${left},${mid} C${left + width},${mid + width} ${left},${bottom} ${left + width},${bottom}`
    : parenthesis
      ? `M${left + width},${top} Q${left - width},${mid} ${left + width},${bottom}`
      : `M${left + width},${top} L${left},${top} L${left},${bottom} L${left + width},${bottom}`;
  const rightPath = brace
    ? `M${right - width},${top} C${right},${top} ${right - width},${mid - width} ${right},${mid} C${right - width},${mid + width} ${right},${bottom} ${right - width},${bottom}`
    : parenthesis
      ? `M${right - width},${top} Q${right + width},${mid} ${right - width},${bottom}`
      : `M${right - width},${top} L${right},${top} L${right},${bottom} L${right - width},${bottom}`;
  return paper.path(`${leftPath}${rightPath}`);
}

function applySimpleObjectDecoration(
  path: any,
  item: any,
  options: any,
  isDoubledPath: boolean,
): void {
  if (isDoubledPath) {
    path.attr({ fill: 'none' });
  } else if (
    item.closed &&
    item.fill &&
    item.fill !== SimpleObjectFill.none &&
    (item.mode === SimpleObjectMode.line ||
      item.mode === SimpleObjectMode.polyline ||
      item.mode === SimpleObjectMode.bezier)
  ) {
    const stroke = item.color || options.lineattr.stroke || '#000';
    path.attr({
      fill: item.fill === SimpleObjectFill.shaded ? `90-${stroke}-#ffffff` : stroke,
      'fill-opacity': item.faded ? 0.35 : 0.22,
    });
  } else {
    path.attr({ fill: 'none' });
  }
  if (item.faded) {
    path.attr({ 'stroke-opacity': 0.35 });
  }
}

function bezierPoint(points: Vec2[], t: number): Vec2 {
  const [p0, p1, p2, p3] = points;
  const mt = 1 - t;
  return new Vec2(
    mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  );
}

function bezierDistance(point: Vec2, points: Vec2[]): number {
  if (points.length < 4) return Infinity;
  let min = Infinity;
  let previous = points[0];
  for (let index = 1; index <= 32; index += 1) {
    const current = bezierPoint(points, index / 32);
    min = Math.min(min, point.calculateDistanceToLine([previous, current]));
    previous = current;
  }
  return min;
}

function applySimpleObjectStyle(path: any, style?: string): void {
  if (!path || !style || style === 'plain') return;
  if (style === 'dashed') {
    path.attr({ 'stroke-dasharray': '-' });
  } else if (style === 'bold') {
    path.attr({ 'stroke-width': 2 });
  }
}

export default ReSimpleObject;
