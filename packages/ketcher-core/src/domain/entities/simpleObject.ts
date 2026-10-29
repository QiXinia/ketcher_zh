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

import { type Point, Vec2 } from './vec2';
import {
  type initiallySelectedType,
  type ObjectAnnotation,
  BaseMicromoleculeEntity,
} from 'domain/entities/BaseMicromoleculeEntity';

export enum SimpleObjectMode {
  ellipse = 'ellipse',
  rectangle = 'rectangle',
  line = 'line',
  polyline = 'polyline',
  /** Cubic Bezier curve: start, control-1, control-2, end. */
  bezier = 'bezier',
  /** Independent ChemDraw-style bracket pair. */
  bracket = 'bracket',
}

export enum SimpleObjectBracketType {
  bracket = 'bracket',
  parenthesis = 'parenthesis',
  brace = 'brace',
}

export enum SimpleObjectBracketUsage {
  unspecified = 'unspecified',
  polymer = 'polymer',
  repeatingUnit = 'repeating-unit',
  monomer = 'monomer',
  mer = 'mer',
  copolymer = 'copolymer',
  graft = 'graft',
  source = 'source',
  fragment = 'fragment',
}

export enum SimpleObjectRepeatPattern {
  unspecified = 'unspecified',
  headToTail = 'head-to-tail',
  headToHead = 'head-to-head',
  either = 'either',
}

export enum SimpleObjectFlipType {
  unspecified = 'unspecified',
  noFlip = 'no-flip',
  flip = 'flip',
}

export enum SimpleObjectStyle {
  plain = 'plain',
  dashed = 'dashed',
  bold = 'bold',
}

export enum SimpleObjectArrow {
  none = 'none',
  full = 'full',
  halfLeft = 'half-left',
  halfRight = 'half-right',
}

export enum SimpleObjectFill {
  none = 'none',
  solid = 'solid',
  shaded = 'shaded',
}

export interface SimpleObjectAttributes {
  mode: SimpleObjectMode;
  toCircle?: boolean;
  style?: SimpleObjectStyle;
  startArrow?: SimpleObjectArrow;
  endArrow?: SimpleObjectArrow;
  doubled?: boolean;
  closed?: boolean;
  fill?: SimpleObjectFill;
  faded?: boolean;
  color?: string;
  bracketType?: SimpleObjectBracketType;
  bracketUsage?: SimpleObjectBracketUsage;
  repeatPattern?: SimpleObjectRepeatPattern;
  flipType?: SimpleObjectFlipType;
  pos?: Array<Point>;
  initiallySelected?: initiallySelectedType;
  annotations?: ObjectAnnotation[];
}

export class SimpleObject extends BaseMicromoleculeEntity {
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
  color?: string;
  bracketType: SimpleObjectBracketType;
  bracketUsage: SimpleObjectBracketUsage;
  repeatPattern: SimpleObjectRepeatPattern;
  flipType: SimpleObjectFlipType;

  constructor(attributes?: SimpleObjectAttributes) {
    super(attributes?.initiallySelected, attributes?.annotations);
    this.pos = [];

    if (attributes?.pos) {
      for (let i = 0; i < attributes.pos.length; i++) {
        const currentP = attributes.pos[i];
        this.pos[i] = currentP ? new Vec2(attributes.pos[i]) : new Vec2();
      }
    }

    this.mode = attributes?.mode ?? SimpleObjectMode.line;
    this.toCircle = attributes?.toCircle ?? false;
    this.style = attributes?.style ?? SimpleObjectStyle.plain;
    this.startArrow = attributes?.startArrow ?? SimpleObjectArrow.none;
    this.endArrow = attributes?.endArrow ?? SimpleObjectArrow.none;
    this.doubled = attributes?.doubled ?? false;
    this.closed = attributes?.closed ?? false;
    this.fill = attributes?.fill ?? SimpleObjectFill.none;
    this.faded = attributes?.faded ?? false;
    this.color = attributes?.color;
    this.bracketType = attributes?.bracketType ?? SimpleObjectBracketType.bracket;
    this.bracketUsage = attributes?.bracketUsage ?? SimpleObjectBracketUsage.unspecified;
    this.repeatPattern = attributes?.repeatPattern ?? SimpleObjectRepeatPattern.unspecified;
    this.flipType = attributes?.flipType ?? SimpleObjectFlipType.unspecified;
  }

  clone(): SimpleObject {
    return new SimpleObject(this);
  }

  center(): Vec2 {
    if (
      this.mode === SimpleObjectMode.rectangle ||
      this.mode === SimpleObjectMode.bracket
    ) {
      return Vec2.centre(this.pos[0], this.pos[1]);
    }
    if (
      (this.mode === SimpleObjectMode.polyline ||
        this.mode === SimpleObjectMode.bezier) &&
      this.pos.length > 1
    ) {
      return Vec2.centre(this.pos[0], this.pos[this.pos.length - 1]);
    }
    return this.pos[0] ?? new Vec2();
  }
}
