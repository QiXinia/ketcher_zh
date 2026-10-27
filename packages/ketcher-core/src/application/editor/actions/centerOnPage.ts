/****************************************************************************
 * Copyright 2026 EPAM Systems
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

import type { ReStruct } from 'application/render';
import { Vec2 } from 'domain/entities/vec2';
import type { EditorSelection } from '../editor.types';
import { fromMultipleMove } from './fragment';
import { structSelection } from './utils';

type ExtendedSelection = EditorSelection & { sgroupData?: number[] };

const objectMaps = [
  'rxnArrows',
  'rxnPluses',
  'simpleObjects',
  'texts',
  'images',
] as const;
type ObjectMap = (typeof objectMaps)[number];

function objectPoints(struct: ReStruct['molecule'], map: ObjectMap, id: number): Vec2[] {
  switch (map) {
    case 'rxnArrows':
      return struct.rxnArrows.get(id)?.pos ?? [];
    case 'rxnPluses': {
      const point = struct.rxnPluses.get(id)?.pp;
      return point ? [point] : [];
    }
    case 'simpleObjects':
      return struct.simpleObjects.get(id)?.pos ?? [];
    case 'texts': {
      const point = struct.texts.get(id)?.position;
      return point ? [point] : [];
    }
    case 'images': {
      const point = struct.images.get(id)?.center();
      return point ? [point] : [];
    }
  }
}

/**
 * Move the selected Ketcher objects so their model-space bounds are centered
 * on the supplied page point. The returned action is already performed, like
 * the other geometry actions used by the editor history.
 */
export function fromCenterOnPage(
  restruct: ReStruct,
  selection: EditorSelection | null,
  pageCenter: Vec2,
) {
  const struct = restruct.molecule;
  const selected = (selection ?? structSelection(struct)) as ExtendedSelection;
  const normalized: ExtendedSelection = { ...selected };
  const atoms = new Set(selected.atoms ?? []);

  selected.bonds?.forEach((bondId) => {
    const bond = struct.bonds.get(bondId);
    if (bond) {
      atoms.add(bond.begin);
      atoms.add(bond.end);
    }
  });
  selected.sgroups?.forEach((sgroupId) => {
    struct.sgroups.get(sgroupId)?.atoms.forEach((atomId) => atoms.add(atomId));
  });
  selected.frags?.forEach((fragmentId) => {
    struct.atoms.forEach((atom, atomId) => {
      if (atom.fragment === fragmentId) atoms.add(atomId);
    });
  });

  normalized.atoms = [...atoms];
  normalized.sgroupData = selected.sgroupData ?? [];
  // Center against model coordinates. Renderer bounds include label and stroke
  // padding, which would make the result depend on the active font and styles.
  let min: Vec2 | null = null;
  let max: Vec2 | null = null;
  const extend = (point: Vec2) => {
    min = min ? Vec2.min(min, point) : new Vec2(point);
    max = max ? Vec2.max(max, point) : new Vec2(point);
  };
  atoms.forEach((id) => {
    const point = struct.atoms.get(id)?.pp;
    if (point) extend(point);
  });
  objectMaps.forEach((map) => {
    const ids = selected[map] ?? [];
    ids.forEach((id) => objectPoints(struct, map, id).forEach(extend));
  });
  const center = min && max ? Vec2.centre(min, max) : new Vec2();
  const delta = pageCenter.sub(center);
  return fromMultipleMove(restruct, normalized, delta);
}
