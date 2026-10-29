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

import compiledSchema from './compiledSchema';
import { validateMultitailArrows } from './multitailArrowsValidator';
import type { KetFileRootContent } from 'domain/serializers/serializers.types';

export function validate(ket: KetFileRootContent): boolean {
  const result = compiledSchema(ket);
  return result ? validateMultitailArrows(ket) && validateBezierPointCounts(ket) : result;
}

function validateBezierPointCounts(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== 'object' || seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.every((entry) => validateBezierPointCounts(entry, seen));
  }
  const object = value as Record<string, unknown>;
  if (object.type === 'simpleObject' && object.data && typeof object.data === 'object') {
    const data = object.data as Record<string, unknown>;
    const pos = data.mode === 'bezier' ? data.pos : undefined;
    if (pos !== undefined && (!Array.isArray(pos) || pos.length < 4 || (pos.length - 1) % 3 !== 0)) {
      return false;
    }
  }
  return Object.values(object).every((entry) => validateBezierPointCounts(entry, seen));
}
