/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/
/* eslint-disable @typescript-eslint/no-use-before-define */

import {
  SimpleObject,
  SimpleObjectArrow,
  SimpleObjectFill,
  SimpleObjectBracketType,
  SimpleObjectMode,
  SimpleObjectStyle,
} from 'domain/entities/simpleObject';
import { Vec2 } from 'domain/entities/vec2';

import Base from './BaseOperation';
import { OperationType } from './OperationType';
import { ReSimpleObject, type ReStruct } from '../../render';
import { Scale } from 'domain/helpers';
import { getOrThrow, toFixed } from 'utilities';

interface SimpleObjectAddData {
  id?: number;
  pos: Array<Vec2>;
  mode: SimpleObjectMode;
  toCircle: boolean;
  style: SimpleObjectStyle;
  startArrow: SimpleObjectArrow;
  endArrow: SimpleObjectArrow;
  doubled: boolean;
  closed: boolean;
  fill: SimpleObjectFill;
  faded: boolean;
  lineWidth: number;
  doubleLineSpacing: number;
  color?: string;
  bracketType: SimpleObjectBracketType;
}
export class SimpleObjectAdd extends Base<SimpleObjectAddData> {
  readonly data: SimpleObjectAddData;

  constructor(
    pos: Array<Vec2> = [],
    mode: SimpleObjectMode = SimpleObjectMode.line,
    toCircle = false,
    id?: number,
    style: SimpleObjectStyle = SimpleObjectStyle.plain,
    startArrow: SimpleObjectArrow = SimpleObjectArrow.none,
    endArrow: SimpleObjectArrow = SimpleObjectArrow.none,
    doubled = false,
    closed = false,
    fill: SimpleObjectFill = SimpleObjectFill.none,
    faded = false,
    bracketType: SimpleObjectBracketType = SimpleObjectBracketType.bracket,
    color?: string,
    lineWidth = 1,
    doubleLineSpacing = 1,
  ) {
    super(OperationType.SIMPLE_OBJECT_ADD);
    this.data = {
      pos,
      mode,
      toCircle,
      id,
      style,
      startArrow,
      endArrow,
      doubled,
      closed,
      fill,
      faded,
      lineWidth,
      doubleLineSpacing,
      color,
      bracketType,
    };
  }

  execute(restruct: ReStruct): void {
    const struct = restruct.molecule;
    const item = new SimpleObject({
      mode: this.data.mode,
      toCircle: this.data.toCircle,
      style: this.data.style,
      startArrow: this.data.startArrow,
      endArrow: this.data.endArrow,
      doubled: this.data.doubled,
      closed: this.data.closed,
      fill: this.data.fill,
      faded: this.data.faded,
      lineWidth: this.data.lineWidth,
      doubleLineSpacing: this.data.doubleLineSpacing,
      color: this.data.color,
      bracketType: this.data.bracketType,
    });

    let itemId: number;
    if (this.data.id == null) {
      itemId = struct.simpleObjects.add(item);
      this.data.id = itemId;
    } else {
      itemId = this.data.id;
      struct.simpleObjects.set(itemId, item);
    }

    restruct.simpleObjects.set(itemId, new ReSimpleObject(item));

    const positions = [...this.data.pos];
    if (this.data.toCircle) {
      positions[1] = makeCircleFromEllipse(positions[0], positions[1]);
    }
    struct.simpleObjectSetPos(
      itemId,
      positions.map((p) => new Vec2(p)),
    );

    Base.invalidateItem(restruct, 'simpleObjects', itemId, 1);
  }

  invert(): SimpleObjectDelete {
    if (this.data.id === undefined) {
      throw new Error('SimpleObjectAdd: cannot invert before execute');
    }
    return new SimpleObjectDelete(this.data.id);
  }
}

interface SimpleObjectDeleteData {
  id: number;
  pos?: Array<Vec2>;
  mode?: SimpleObjectMode;
  toCircle?: boolean;
  style?: SimpleObjectStyle;
  startArrow?: SimpleObjectArrow;
  endArrow?: SimpleObjectArrow;
  doubled?: boolean;
  closed?: boolean;
  fill?: SimpleObjectFill;
  faded?: boolean;
  lineWidth?: number;
  doubleLineSpacing?: number;
  color?: string;
  bracketType?: SimpleObjectBracketType;
}

export class SimpleObjectDelete extends Base {
  readonly data: SimpleObjectDeleteData;
  performed: boolean;

  constructor(id: number) {
    super(OperationType.SIMPLE_OBJECT_DELETE);
    this.data = {
      id,
      pos: [],
      mode: SimpleObjectMode.line,
      toCircle: false,
      style: SimpleObjectStyle.plain,
      startArrow: SimpleObjectArrow.none,
      endArrow: SimpleObjectArrow.none,
      doubled: false,
      closed: false,
      fill: SimpleObjectFill.none,
      faded: false,
      lineWidth: 1,
      doubleLineSpacing: 1,
      color: undefined,
      bracketType: SimpleObjectBracketType.bracket,
    };
    this.performed = false;
  }

  execute(restruct: ReStruct): void {
    const struct = restruct.molecule;
    const item = getOrThrow(
      struct.simpleObjects,
      this.data.id,
      `Simple object with id ${this.data.id} not found`,
    );
    // save to data current values. In future they could be used in invert for restoring simple object
    this.data.pos = item.pos.map((point) => new Vec2(point));
    this.data.mode = item.mode;
    this.data.toCircle = item.toCircle;
    this.data.style = item.style;
    this.data.startArrow = item.startArrow ?? SimpleObjectArrow.none;
    this.data.endArrow = item.endArrow ?? SimpleObjectArrow.none;
    this.data.doubled = item.doubled ?? false;
    this.data.closed = item.closed ?? false;
    this.data.fill = item.fill ?? SimpleObjectFill.none;
    this.data.faded = item.faded ?? false;
    this.data.lineWidth = item.lineWidth ?? 1;
    this.data.doubleLineSpacing = item.doubleLineSpacing ?? 1;
    this.data.color = item.color;
    this.data.bracketType = item.bracketType ?? SimpleObjectBracketType.bracket;
    this.performed = true;

    restruct.markItemRemoved();
    restruct.clearVisel(
      getOrThrow(
        restruct.simpleObjects,
        this.data.id,
        `ReSimpleObject with id ${this.data.id} not found`,
      ).visel,
    );
    restruct.simpleObjects.delete(this.data.id);

    struct.simpleObjects.delete(this.data.id);
  }

  invert(): Base {
    return new SimpleObjectAdd(
      this.data.pos,
      this.data.mode,
      this.data.toCircle,
      this.data.id,
      this.data.style,
      this.data.startArrow,
      this.data.endArrow,
      this.data.doubled,
      this.data.closed,
      this.data.fill,
      this.data.faded,
      this.data.bracketType,
      this.data.color,
      this.data.lineWidth,
      this.data.doubleLineSpacing,
    );
  }
}

interface SimpleObjectBracketData {
  id: number;
  bracketType: SimpleObjectBracketType;
  previousBracketType: SimpleObjectBracketType;
}

export class SimpleObjectBracketSet extends Base {
  readonly data: SimpleObjectBracketData;

  constructor(id: number, bracketType: SimpleObjectBracketType) {
    super(OperationType.SIMPLE_OBJECT_ATTR);
    this.data = {
      id,
      bracketType,
      previousBracketType: SimpleObjectBracketType.bracket,
    };
  }

  execute(restruct: any): void {
    const item = restruct.molecule.simpleObjects.get(this.data.id);
    if (!item) return;
    this.data.previousBracketType = item.bracketType ?? SimpleObjectBracketType.bracket;
    if (this.data.bracketType === this.data.previousBracketType) return;
    item.bracketType = this.data.bracketType;
    Base.invalidateItem(restruct, 'simpleObjects', this.data.id, 1);
  }

  invert(): Base {
    const inverse = new SimpleObjectBracketSet(this.data.id, this.data.previousBracketType);
    inverse.data.previousBracketType = this.data.bracketType;
    return inverse;
  }

  isDummy(): boolean {
    return this.data.bracketType === this.data.previousBracketType;
  }
}

interface SimpleObjectStyleData {
  id: number;
  style: SimpleObjectStyle;
  previousStyle: SimpleObjectStyle;
}

export class SimpleObjectStyleSet extends Base {
  readonly data: SimpleObjectStyleData;

  constructor(id: number, style: SimpleObjectStyle) {
    super(OperationType.SIMPLE_OBJECT_ATTR);
    this.data = {
      id,
      style,
      previousStyle: SimpleObjectStyle.plain,
    };
  }

  execute(restruct: any): void {
    const item = restruct.molecule.simpleObjects.get(this.data.id);
    if (!item) return;
    this.data.previousStyle = item.style ?? SimpleObjectStyle.plain;
    if (this.data.style === this.data.previousStyle) return;
    item.style = this.data.style;
    Base.invalidateItem(restruct, 'simpleObjects', this.data.id, 1);
  }

  invert(): Base {
    const inverse = new SimpleObjectStyleSet(
      this.data.id,
      this.data.previousStyle,
    );
    // The inverse must remember the style produced by this operation so that
    // Editor.update() can distinguish a real change from a no-op and redo can
    // reconstruct the same pair of styles.
    inverse.data.previousStyle = this.data.style;
    return inverse;
  }

  isDummy(): boolean {
    return this.data.style === this.data.previousStyle;
  }
}

interface SimpleObjectColorData {
  id: number;
  color?: string;
  previousColor?: string;
}

export class SimpleObjectColorSet extends Base {
  readonly data: SimpleObjectColorData;

  constructor(id: number, color?: string) {
    super(OperationType.SIMPLE_OBJECT_ATTR);
    this.data = { id, color };
  }

  execute(restruct: any): void {
    const item = restruct.molecule.simpleObjects.get(this.data.id);
    if (!item) return;
    this.data.previousColor = item.color;
    if (this.data.color === this.data.previousColor) return;
    item.color = this.data.color;
    Base.invalidateItem(restruct, 'simpleObjects', this.data.id, 1);
  }

  invert(): Base {
    const inverse = new SimpleObjectColorSet(this.data.id, this.data.previousColor);
    inverse.data.previousColor = this.data.color;
    return inverse;
  }

  isDummy(): boolean {
    return this.data.color === this.data.previousColor;
  }
}

type SimpleObjectArrowEndpoint = 'start' | 'end';

interface SimpleObjectArrowData {
  id: number;
  endpoint: SimpleObjectArrowEndpoint;
  arrow: SimpleObjectArrow;
  previousArrow: SimpleObjectArrow;
}

export class SimpleObjectArrowSet extends Base {
  readonly data: SimpleObjectArrowData;

  constructor(
    id: number,
    endpoint: SimpleObjectArrowEndpoint,
    arrow: SimpleObjectArrow,
  ) {
    super(OperationType.SIMPLE_OBJECT_ATTR);
    this.data = {
      id,
      endpoint,
      arrow,
      previousArrow: SimpleObjectArrow.none,
    };
  }

  execute(restruct: any): void {
    const item = restruct.molecule.simpleObjects.get(this.data.id);
    if (!item) return;
    const property = this.data.endpoint === 'start' ? 'startArrow' : 'endArrow';
    this.data.previousArrow = item[property] ?? SimpleObjectArrow.none;
    if (this.data.arrow === this.data.previousArrow) return;
    item[property] = this.data.arrow;
    Base.invalidateItem(restruct, 'simpleObjects', this.data.id, 1);
  }

  invert(): Base {
    const inverse = new SimpleObjectArrowSet(
      this.data.id,
      this.data.endpoint,
      this.data.previousArrow,
    );
    inverse.data.previousArrow = this.data.arrow;
    return inverse;
  }

  isDummy(): boolean {
    return this.data.arrow === this.data.previousArrow;
  }
}

export type SimpleObjectCurveProperty =
  | 'doubled'
  | 'closed'
  | 'fill'
  | 'faded'
  | 'lineWidth'
  | 'doubleLineSpacing';
export type SimpleObjectCurveValue = boolean | SimpleObjectFill | number;

interface SimpleObjectCurveData {
  id: number;
  property: SimpleObjectCurveProperty;
  value: SimpleObjectCurveValue;
  previousValue: SimpleObjectCurveValue;
}

export class SimpleObjectCurveSet extends Base {
  readonly data: SimpleObjectCurveData;

  constructor(
    id: number,
    property: SimpleObjectCurveProperty,
    value: SimpleObjectCurveValue,
  ) {
    super(OperationType.SIMPLE_OBJECT_ATTR);
    this.data = {
      id,
      property,
      value,
      previousValue:
        property === 'fill'
          ? SimpleObjectFill.none
          : property === 'lineWidth' || property === 'doubleLineSpacing'
            ? 1
            : false,
    };
  }

  execute(restruct: any): void {
    const item = restruct.molecule.simpleObjects.get(this.data.id);
    if (!item) return;
    this.data.previousValue = item[this.data.property] ?? this.data.previousValue;
    if (this.data.value === this.data.previousValue) return;
    item[this.data.property] = this.data.value;
    Base.invalidateItem(restruct, 'simpleObjects', this.data.id, 1);
  }

  invert(): Base {
    const inverse = new SimpleObjectCurveSet(
      this.data.id,
      this.data.property,
      this.data.previousValue,
    );
    inverse.data.previousValue = this.data.value;
    return inverse;
  }

  isDummy(): boolean {
    return this.data.value === this.data.previousValue;
  }
}

interface SimpleObjectMoveData {
  id: number;
  d: Vec2;
  noinvalidate: boolean;
}

export class SimpleObjectMove extends Base {
  data: SimpleObjectMoveData;

  constructor(id: number, d: Vec2, noinvalidate: boolean) {
    super(OperationType.SIMPLE_OBJECT_MOVE);
    this.data = { id, d, noinvalidate };
  }

  execute(restruct: ReStruct): void {
    const struct = restruct.molecule;
    const id = this.data.id;
    const d = this.data.d;
    const item = getOrThrow(
      struct.simpleObjects,
      id,
      `Simple object with id ${id} not found`,
    );
    item.pos.forEach((p) => p.add_(d));
    getOrThrow(
      restruct.simpleObjects,
      id,
      `ReSimpleObject with id ${id} not found`,
    ).visel.translate(Scale.modelToCanvas(d, restruct.render.options));
    this.data.d = d.negated();
    if (!this.data.noinvalidate) {
      Base.invalidateItem(restruct, 'simpleObjects', id, 1);
    }
  }

  invert(): Base {
    const move = new SimpleObjectMove(
      this.data.id,
      this.data.d,
      this.data.noinvalidate,
    );
    // todo Need further investigation on why this is needed?
    move.data = this.data;
    return move;
  }

  isDummy() {
    const { d } = this.data;
    return d.x === 0 && d.y === 0;
  }
}

interface SimpleObjectResizeData {
  id: number;
  d: Vec2;
  current: Vec2;
  anchor: Vec2;
  noinvalidate: boolean;
  toCircle: boolean;
}

function handleRectangleChangeWithAnchor(
  item: SimpleObject,
  anchor: Vec2,
  current: Vec2,
) {
  const previousPos0 = item.pos[0].get_xy0();
  const previousPos1 = item.pos[1].get_xy0();

  if (toFixed(anchor.x) === toFixed(item.pos[1].x)) {
    item.pos[1].x = anchor.x = current.x;
    current.x = previousPos1.x;
  }
  if (toFixed(anchor.y) === toFixed(item.pos[1].y)) {
    item.pos[1].y = anchor.y = current.y;
    current.y = previousPos1.y;
  }
  if (toFixed(anchor.x) === toFixed(item.pos[0].x)) {
    item.pos[0].x = anchor.x = current.x;
    current.x = previousPos0.x;
  }
  if (toFixed(anchor.y) === toFixed(item.pos[0].y)) {
    item.pos[0].y = anchor.y = current.y;
    current.y = previousPos0.y;
  }
}

export class SimpleObjectResize extends Base {
  readonly data: SimpleObjectResizeData;

  constructor(
    id: number,
    d: Vec2,
    current: Vec2,
    anchor: Vec2,
    noinvalidate: boolean,
    toCircle: boolean,
  ) {
    super(OperationType.SIMPLE_OBJECT_RESIZE);
    this.data = { id, d, current, anchor, noinvalidate, toCircle };
  }

  execute(restruct: ReStruct): void {
    const struct = restruct.molecule;
    const id = this.data.id;
    const d = this.data.d;
    const current = this.data.current;
    const item = getOrThrow(
      struct.simpleObjects,
      id,
      `Simple object with id ${id} not found`,
    );
    const anchor = this.data.anchor;
    if (item.mode === SimpleObjectMode.ellipse) {
      if (anchor) {
        handleRectangleChangeWithAnchor(item, anchor, current);
      } else if (this.data.toCircle) {
        const previousPos1 = item.pos[1].get_xy0();
        const circlePoint = makeCircleFromEllipse(item.pos[0], current);
        item.pos[1].x = circlePoint.x;
        item.pos[1].y = circlePoint.y;
        this.data.current = previousPos1;
      } else {
        const previousPos1 = item.pos[1].get_xy0();
        item.pos[1].x = current.x;
        item.pos[1].y = current.y;
        this.data.current = previousPos1;
      }
    } else if (
      (item.mode === SimpleObjectMode.line ||
        item.mode === SimpleObjectMode.polyline ||
        item.mode === SimpleObjectMode.bezier) &&
      anchor
    ) {
      const pointIndex = item.pos.findIndex(
        (point) =>
          toFixed(anchor.x) === toFixed(point.x) &&
          toFixed(anchor.y) === toFixed(point.y),
      );
      if (pointIndex >= 0) {
        const previousPoint = item.pos[pointIndex].get_xy0();
        item.pos[pointIndex].x = anchor.x = current.x;
        item.pos[pointIndex].y = anchor.y = current.y;
        this.data.current = previousPoint;
      }
    } else if (
      (item.mode === SimpleObjectMode.rectangle || item.mode === SimpleObjectMode.bracket) &&
      anchor
    ) {
      handleRectangleChangeWithAnchor(item, anchor, current);
    } else if (item.mode === SimpleObjectMode.bezier) {
      // During tool preview the endpoint follows the pointer and the control
      // handles track the chord. Selection drags use the anchor branch above
      // and can move any of the four points independently.
      const start = item.pos[0];
      const previous = item.pos.map((point) => new Vec2(point));
      item.pos[3] = new Vec2(current);
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      item.pos[1] = new Vec2(start.x + dx / 3, start.y + dy / 3);
      item.pos[2] = new Vec2(start.x + (dx * 2) / 3, start.y + (dy * 2) / 3);
      this.data.current = previous[3];
    } else item.pos[1].add_(d);

    if (item.mode !== SimpleObjectMode.bezier) {
      getOrThrow(
      restruct.simpleObjects,
      id,
      `ReSimpleObject with id ${id} not found`,
      ).visel.translate(Scale.modelToCanvas(d, restruct.render.options));
    }
    this.data.d = d.negated();
    if (!this.data.noinvalidate) {
      Base.invalidateItem(restruct, 'simpleObjects', id, 1);
    }
  }

  invert(): Base {
    return new SimpleObjectResize(
      this.data.id,
      this.data.d,
      this.data.current,
      this.data.anchor,
      this.data.noinvalidate,
      this.data.toCircle,
    );
  }

  isDummy() {
    const { d } = this.data;
    return d.x === 0 && d.y === 0;
  }
}

export function makeCircleFromEllipse(position0: Vec2, position1: Vec2): Vec2 {
  const diff = Vec2.diff(position1, position0);
  const min = Math.abs(diff.x) < Math.abs(diff.y) ? diff.x : diff.y;
  return new Vec2(
    position0.x + (diff.x > 0 ? 1 : -1) * Math.abs(min),
    position0.y + (diff.y > 0 ? 1 : -1) * Math.abs(min),
    0,
  );
}
