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

import {
  SimpleObjectAdd,
  SimpleObjectDelete,
  SimpleObjectResize,
  SimpleObjectStyleSet,
  SimpleObjectArrowSet,
  SimpleObjectCurveSet,
  SimpleObjectBracketSet,
  SimpleObjectColorSet,
} from '../operations';
import {
  SimpleObjectArrow,
  SimpleObjectStyle,
  SimpleObjectBracketType,
} from 'domain/entities/simpleObject';
import type {
  SimpleObjectCurveProperty,
  SimpleObjectCurveValue,
} from '../operations/simpleObject';

import { Action } from './action';

export function fromSimpleObjectDeletion(restruct, id) {
  const action = new Action();
  action.addOp(new SimpleObjectDelete(id));
  return action.perform(restruct);
}

export function fromSimpleObjectAddition(restruct, pos, mode, toCircle) {
  const action = new Action();
  action.addOp(new SimpleObjectAdd(pos, mode, toCircle));
  return action.perform(restruct);
}

export function fromSimpleObjectResizing(
  restruct,
  id,
  d,
  current,
  anchor,
  toCircle,
) {
  const action = new Action();
  action.addOp(new SimpleObjectResize(id, d, current, anchor, false, toCircle));
  return action.perform(restruct);
}

export function fromSimpleObjectStyle(
  id: number,
  style: SimpleObjectStyle,
) {
  const action = new Action();
  action.addOp(new SimpleObjectStyleSet(id, style));
  return action;
}

export function fromSimpleObjectColor(id: number, color?: string) {
  const action = new Action();
  action.addOp(new SimpleObjectColorSet(id, color));
  return action;
}

export function fromSimpleObjectArrow(
  id: number,
  endpoint: 'start' | 'end',
  arrow: SimpleObjectArrow,
) {
  const action = new Action();
  action.addOp(new SimpleObjectArrowSet(id, endpoint, arrow));
  return action;
}

export function fromSimpleObjectCurve(
  id: number,
  property: SimpleObjectCurveProperty,
  value: SimpleObjectCurveValue,
) {
  if (
    (property === 'lineWidth' || property === 'doubleLineSpacing') &&
    (typeof value !== 'number' || !Number.isFinite(value) || value < 0.25 || value > 8)
  ) {
    throw new Error('曲线线宽和双线间距倍率必须在 0.25 到 8 之间');
  }
  const action = new Action();
  action.addOp(new SimpleObjectCurveSet(id, property, value));
  return action;
}

export function fromSimpleObjectBracket(id: number, bracketType: SimpleObjectBracketType) {
  const action = new Action();
  action.addOp(new SimpleObjectBracketSet(id, bracketType));
  return action;
}
