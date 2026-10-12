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
import { AtomMove } from '../operations';
import { BaseOperation } from '../operations/BaseOperation';
import { OperationType } from '../operations/OperationType';
import { Action } from './action';
import { getRelSGroupsBySelection, structSelection } from './utils';

const objectMaps = [
  'rxnArrows',
  'rxnPluses',
  'simpleObjects',
  'texts',
  'images',
  'sgroups',
  'frags',
] as const;
type ObjectMap = typeof objectMaps[number];

function objectPoints(restruct: ReStruct, map: ObjectMap, id: number): Vec2[] {
  const struct = restruct.molecule;
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
      // Text bounds are derived from this position by the renderer.
      return point ? [point] : [];
    }
    case 'images': {
      const point = struct.images.get(id)?.center();
      return point ? [point] : [];
    }
    case 'sgroups': {
      const point = struct.sgroups.get(id)?.pp;
      return point ? [point] : [];
    }
    case 'frags': {
      const point = struct.frags.get(id)?.stereoFlagPosition;
      return point ? [point] : [];
    }
  }
}

/** Resolve coordinates on every history step; rendering can replace bounds. */
class ObjectDepth extends BaseOperation {
  data: { map: ObjectMap; id: number; depths: number[] };

  constructor(map: ObjectMap, id: number, depths: number[]) {
    super(OperationType.FLATTEN);
    this.data = { map, id, depths };
  }

  execute(restruct: ReStruct) {
    const { map, id, depths } = this.data;
    const points = objectPoints(restruct, map, id);
    this.data.depths = points.map((point) => point.z);
    points.forEach((point, index) => {
      point.z = depths[index] ?? 0;
    });
    const renderMap =
      map === 'sgroups'
        ? 'sgroupData'
        : map === 'frags'
        ? 'enhancedFlags'
        : map;
    BaseOperation.invalidateItem(restruct, renderMap, id, 1);
  }

  invert() {
    const inverse = new ObjectDepth(
      this.data.map,
      this.data.id,
      this.data.depths,
    );
    inverse.data = this.data;
    return inverse;
  }
}

/** ChemDraw Flatten removes depth while preserving x/y and chemical fields. */
export function fromFlatten(
  restruct: ReStruct,
  selection: EditorSelection | null,
) {
  const struct = restruct.molecule;
  const selected = (selection ?? structSelection(struct)) as EditorSelection & {
    sgroupData?: number[];
  };
  const atoms = new Set(selected.atoms ?? []);
  selected.bonds?.forEach((id) => {
    const bond = struct.bonds.get(id);
    if (bond) {
      atoms.add(bond.begin);
      atoms.add(bond.end);
    }
  });
  selected.sgroups?.forEach((id) => {
    struct.sgroups.get(id)?.atoms.forEach((atomId) => atoms.add(atomId));
  });
  selected.frags?.forEach((id) => {
    struct.atoms.forEach((atom, atomId) => {
      if (atom.fragment === id) atoms.add(atomId);
    });
  });
  const action = new Action();
  atoms.forEach((id) => {
    const atom = struct.atoms.get(id);
    if (atom?.pp.z) action.addOp(new AtomMove(id, new Vec2(0, 0, -atom.pp.z)));
  });
  const relatedGroups = [...getRelSGroupsBySelection(struct, [...atoms])].map(
    (group) => group.id,
  );
  objectMaps.forEach((map) => {
    const ids = new Set(selected[map] ?? []);
    if (map === 'sgroups') {
      relatedGroups.forEach((id) => ids.add(id));
      selected.sgroupData?.forEach((id) => ids.add(id));
    }
    if (map === 'frags') selected.enhancedFlags?.forEach((id) => ids.add(id));
    ids.forEach((id) => {
      const points = objectPoints(restruct, map, id);
      if (points.some((point) => point.z !== 0)) {
        action.addOp(
          new ObjectDepth(
            map,
            id,
            points.map(() => 0),
          ),
        );
      }
    });
  });
  return action.perform(restruct);
}
