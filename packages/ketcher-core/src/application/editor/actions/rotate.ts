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
  AtomMove,
  BondAttr,
  EnhancedFlagMove,
  EnhancedFlagClear,
  RxnArrowMove,
  RxnArrowRotate,
  RxnPlusMove,
  SGroupDataMove,
  TextMove,
} from '../operations';
import { Bond } from 'domain/entities/bond';
import { Fragment } from 'domain/entities/fragment';
import { MonomerMicromolecule } from 'domain/entities/monomerMicromolecule';
import type { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import type { ReStruct } from 'application/render';
import { getRelSGroupsBySelection, structSelection } from './utils';
import { Action } from './action';
import type { EditorSelection } from '../editor.types';
import { FlipMonomerOperation } from 'application/editor/operations/monomer/FlipMonomerOperation';
import { RotateMonomerOperation } from 'application/editor/operations/monomer/RotateMonomerOperation';
import type { FlipDirection } from '../shared/utils.types';
import { flipPointByCenter, rotateDelta } from '../shared/utils';

export function fromFlip(
  reStruct: ReStruct,
  selection: EditorSelection | null,
  flipDirection: FlipDirection,
  center: Vec2,
  preserveStereo = false,
) {
  const action = new Action();
  const structToFlip = selection ?? structSelection(reStruct.molecule);

  action.mergeWith(
    fromStructureFlip(
      reStruct,
      structToFlip,
      flipDirection,
      center,
      preserveStereo,
    ),
  );

  if (structToFlip.rxnArrows) {
    action.mergeWith(
      fromRxnArrowFlip(reStruct, structToFlip.rxnArrows, flipDirection, center),
    );
  }

  if (structToFlip.rxnPluses) {
    action.mergeWith(
      fromRxnPlusFlip(reStruct, structToFlip.rxnPluses, flipDirection, center),
    );
  }

  if (structToFlip.texts) {
    action.mergeWith(
      fromTextFlip(reStruct, structToFlip.texts, flipDirection, center),
    );
  }

  if (structToFlip.enhancedFlags) {
    action.mergeWith(
      fromEnhancedFlagsFlip(
        reStruct,
        structToFlip.enhancedFlags,
        flipDirection,
        center,
      ),
    );
  }

  return action;
}

/**
 * Reflect selected objects across one canvas axis without swapping wedge
 * bond stereo. ChemDraw exposes this as Rotate 180° Horizontal/Vertical.
 */
export function fromRotate180(
  reStruct: ReStruct,
  selection: EditorSelection | null,
  direction: FlipDirection,
  center: Vec2,
) {
  return fromFlip(reStruct, selection, direction, center, true);
}

function fromRxnArrowFlip(
  reStruct: ReStruct,
  rxnArrowIds: number[],
  flipDirection: FlipDirection,
  center: Vec2,
) {
  const action = new Action();

  rxnArrowIds.forEach((arrowId) => {
    const rxnArrow = reStruct.molecule.rxnArrows.get(arrowId);
    if (!rxnArrow) {
      return;
    }

    const [start, end] = rxnArrow.pos;
    const oxAngle = end.sub(start).oxAngle();
    const oyAngle = oxAngle - Math.PI / 2;
    const rotateAngle =
      flipDirection === 'vertical' ? -2 * oxAngle : -2 * oyAngle;
    action.addOp(new RxnArrowRotate(arrowId, rotateAngle, rxnArrow.center()));

    const difference = flipPointByCenter(
      rxnArrow.center(),
      center,
      flipDirection,
    );
    action.addOp(new RxnArrowMove(arrowId, difference));
  });

  return action.perform(reStruct);
}

function fromRxnPlusFlip(
  reStruct: ReStruct,
  rxnPlusIds: number[],
  flipDirection: FlipDirection,
  center: Vec2,
) {
  const action = new Action();

  rxnPlusIds.forEach((plusId) => {
    const rxnPlus = reStruct.molecule.rxnPluses.get(plusId);
    if (!rxnPlus) {
      return;
    }

    const difference = flipPointByCenter(rxnPlus.pp, center, flipDirection);
    action.addOp(new RxnPlusMove(plusId, difference));
  });

  return action.perform(reStruct);
}

function fromTextFlip(
  reStruct: ReStruct,
  textIds: number[],
  flipDirection: FlipDirection,
  center: Vec2,
) {
  const action = new Action();

  textIds.forEach((textId) => {
    const text = reStruct.molecule.texts.get(textId);
    if (!text) {
      return;
    }

    // Note: text has two position properties
    //      `position`: the middle left point
    //      `pos`: a box (not bounding box)
    // `TextMove` is to move `position`, so we have to calculate the flipped `position`
    const textMiddleLeft = text.pos[0];
    const textMiddleRight = text.pos[2];
    const textCenter = Vec2.centre(textMiddleLeft, textMiddleRight);

    const difference = flipPointByCenter(textCenter, center, flipDirection);
    action.addOp(new TextMove(textId, difference));
  });

  return action.perform(reStruct);
}

function fromEnhancedFlagsFlip(
  reStruct: ReStruct,
  enhancedFlagIds: number[],
  _flipDirection: FlipDirection,
  _center: Vec2,
) {
  const action = new Action();

  // Clear stored flag positions so they recalculate based on new atom positions
  enhancedFlagIds.forEach((flagId) => {
    const frId = flagId;
    const frag = reStruct.molecule.frags.get(frId);
    if (!frag) {
      return;
    }

    // Clear the position - it will auto-recalculate to top-right of new bounding box
    action.addOp(new EnhancedFlagClear(flagId));
  });

  return action.perform(reStruct);
}

export const flipBonds = (
  bondIds: number[],
  struct: Struct,
  action: Action,
) => {
  bondIds.forEach((bondId) => {
    const bond = struct.bonds.get(bondId);

    if (!bond) {
      return;
    }

    if (bond.type !== Bond.PATTERN.TYPE.SINGLE) {
      return;
    }

    if (bond.stereo === Bond.PATTERN.STEREO.UP) {
      action.addOp(new BondAttr(bondId, 'stereo', Bond.PATTERN.STEREO.DOWN));
      return;
    }

    if (bond.stereo === Bond.PATTERN.STEREO.DOWN) {
      action.addOp(new BondAttr(bondId, 'stereo', Bond.PATTERN.STEREO.UP));
    }
  });
};

function fromStructureFlip(
  reStruct: ReStruct,
  selection: EditorSelection | null,
  flipDirection: FlipDirection,
  center: Vec2,
  preserveStereo = false,
) {
  const struct = reStruct.molecule;
  const action = new Action();

  selection?.atoms?.forEach((atomId) => {
    const atom = struct.atoms.get(atomId);
    if (!atom) {
      return;
    }

    const difference = flipPointByCenter(atom.pp, center, flipDirection);
    action.addOp(new AtomMove(atomId, difference));
  });

  const sGroups = getRelSGroupsBySelection(struct, selection?.atoms ?? []);
  sGroups.forEach((sGroup) => {
    if (!sGroup.pp) {
      return;
    }
    const difference = flipPointByCenter(sGroup.pp, center, flipDirection);
    action.addOp(new SGroupDataMove(sGroup.id, difference));

    if (sGroup instanceof MonomerMicromolecule) {
      action.addOp(
        preserveStereo
          ? new RotateMonomerOperation({ id: sGroup.id, value: Math.PI })
          : new FlipMonomerOperation({ id: sGroup.id, value: flipDirection }),
      );
    }
  });

  if (selection?.bonds && !preserveStereo) {
    flipBonds(selection.bonds, struct, action);
  }

  return action.perform(reStruct);
}

export function fromRotate(restruct, selection, center, angle: number) {
  // eslint-disable-line
  const struct = restruct.molecule;

  const action = new Action();

  if (!selection) {
    selection = structSelection(struct);
  }

  if (selection.atoms) {
    selection.atoms.forEach((aid) => {
      const atom = struct.atoms.get(aid);
      if (!atom) return;

      action.addOp(new AtomMove(aid, rotateDelta(atom.pp, center, angle)));
    });

    if (!selection.sgroupData) {
      const sgroups = getRelSGroupsBySelection(struct, selection.atoms);

      sgroups.forEach((sg) => {
        if (!sg.pp) {
          return;
        }

        action.addOp(
          new SGroupDataMove(sg.id, rotateDelta(sg.pp, center, angle)),
        );
      });
    }
  }

  if (selection.rxnArrows) {
    selection.rxnArrows.forEach((arrowId) => {
      action.addOp(new RxnArrowRotate(arrowId, angle, center));
    });
  }

  if (selection.rxnPluses) {
    selection.rxnPluses.forEach((pid) => {
      const plus = struct.rxnPluses.get(pid);
      action.addOp(new RxnPlusMove(pid, rotateDelta(plus.pp, center, angle)));
    });
  }

  if (selection.texts) {
    selection.texts.forEach((textId) => {
      const text = struct.texts.get(textId);
      action.addOp(
        new TextMove(textId, rotateDelta(text.position, center, angle)),
      );
    });
  }

  if (selection.sgroupData) {
    selection.sgroupData.forEach((did) => {
      const data = struct.sgroups.get(did);
      action.addOp(
        new SGroupDataMove(did, rotateDelta(data.pp, center, angle)),
      );
    });
  }

  if (selection.enhancedFlags) {
    selection.enhancedFlags.forEach((flagId) => {
      const frId = flagId;
      const frag = restruct.molecule.frags.get(frId);
      action.addOp(
        new EnhancedFlagMove(
          flagId,
          rotateDelta(
            frag.stereoFlagPosition ||
              Fragment.getDefaultStereoFlagPosition(restruct.molecule, frId),
            center,
            angle,
          ),
        ),
      );
    });
  }

  return action.perform(restruct);
}

/**
 * Scale selected objects around a fixed model-space point.
 *
 * Scaling is represented as a set of move operations so it participates in
 * the regular editor history and keeps bond geometry derived from atom
 * positions. The action intentionally follows the same selection semantics
 * as rotation: a missing selection means the complete structure.
 */
export function fromScale(
  restruct: ReStruct,
  selection: (EditorSelection & { sgroupData?: number[] }) | null,
  center: Vec2,
  factor: number,
) {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error('Scale factor must be a positive finite number');
  }

  const struct = restruct.molecule;
  const action = new Action();

  if (!selection) {
    selection = structSelection(struct);
  }

  const scaleDelta = (point: Vec2) => point.sub(center).scaled(factor - 1);

  selection.atoms?.forEach((atomId) => {
    const atom = struct.atoms.get(atomId);
    if (atom) {
      action.addOp(new AtomMove(atomId, scaleDelta(atom.pp)));
    }
  });

  if (selection.atoms && !selection.sgroupData) {
    getRelSGroupsBySelection(struct, selection.atoms).forEach((sGroup) => {
      if (sGroup.pp) {
        action.addOp(new SGroupDataMove(sGroup.id, scaleDelta(sGroup.pp)));
      }
    });
  }

  selection.rxnPluses?.forEach((plusId) => {
    const plus = struct.rxnPluses.get(plusId);
    if (plus) {
      action.addOp(new RxnPlusMove(plusId, scaleDelta(plus.pp)));
    }
  });

  selection.texts?.forEach((textId) => {
    const text = struct.texts.get(textId);
    if (text) {
      action.addOp(new TextMove(textId, scaleDelta(text.position)));
    }
  });

  selection.sgroupData?.forEach((dataId) => {
    const data = struct.sgroups.get(dataId);
    if (data?.pp) {
      action.addOp(new SGroupDataMove(dataId, scaleDelta(data.pp)));
    }
  });

  selection.enhancedFlags?.forEach((flagId) => {
    const fragment = struct.frags.get(flagId);
    if (!fragment) return;
    const position =
      fragment.stereoFlagPosition ||
      Fragment.getDefaultStereoFlagPosition(struct, flagId);
    if (position) {
      action.addOp(new EnhancedFlagMove(flagId, scaleDelta(position)));
    }
  });

  return action.perform(restruct);
}

/**
 * Normalize the selected bond lengths to a target model-space length.
 *
 * ChemDraw applies this command to the selected structure.  Ketcher stores
 * bond geometry as atom coordinates, so the operation is represented as atom
 * moves and remains fully undoable.  A small constraint iteration keeps
 * connected chains and rings usable while a single selected bond converges to
 * the requested length exactly.
 */
export function fromFixLengths(
  restruct: ReStruct,
  selection: EditorSelection | null,
  targetLength: number,
) {
  if (!Number.isFinite(targetLength) || targetLength <= 0) {
    throw new Error('Fixed bond length must be a positive finite number');
  }

  const struct = restruct.molecule;
  const effectiveSelection = selection ?? structSelection(struct);
  const selectedAtoms = new Set<number>(effectiveSelection.atoms ?? []);
  const selectedBonds = new Set<number>(effectiveSelection.bonds ?? []);

  // A bond-only selection still defines the atoms that may move.  When atoms
  // are selected, constrain only bonds whose two ends are inside that set.
  selectedBonds.forEach((bondId) => {
    const bond = struct.bonds.get(bondId);
    if (bond) {
      selectedAtoms.add(bond.begin);
      selectedAtoms.add(bond.end);
    }
  });

  const constrainedBonds: Bond[] = [];
  struct.bonds.forEach((bond, bondId) => {
    if (selectedBonds.size > 0) {
      if (selectedBonds.has(bondId)) constrainedBonds.push(bond);
    } else if (selectedAtoms.has(bond.begin) && selectedAtoms.has(bond.end)) {
      constrainedBonds.push(bond);
    }
  });
  if (!constrainedBonds.length) {
    throw new Error('固定键长需要先选择至少一根化学键或一段结构');
  }

  const positions = new Map<number, Vec2>();
  selectedAtoms.forEach((atomId) => {
    const atom = struct.atoms.get(atomId);
    if (atom) positions.set(atomId, new Vec2(atom.pp));
  });

  const movable = (atomId: number) => positions.has(atomId);
  for (let iteration = 0; iteration < 24; iteration += 1) {
    let maxError = 0;
    constrainedBonds.forEach((bond) => {
      const begin = positions.get(bond.begin);
      const end = positions.get(bond.end);
      if (!begin || !end) return;
      const difference = end.sub(begin);
      const currentLength = difference.length();
      const direction =
        currentLength > 1e-9
          ? difference.scaled(1 / currentLength)
          : new Vec2(1, 0);
      const correction = targetLength - currentLength;
      maxError = Math.max(maxError, Math.abs(correction));
      const beginMovable = movable(bond.begin);
      const endMovable = movable(bond.end);
      if (beginMovable && endMovable) {
        positions.set(bond.begin, begin.add(direction.scaled(-correction / 2)));
        positions.set(bond.end, end.add(direction.scaled(correction / 2)));
      } else if (beginMovable) {
        positions.set(bond.begin, begin.add(direction.scaled(-correction)));
      } else if (endMovable) {
        positions.set(bond.end, end.add(direction.scaled(correction)));
      }
    });
    if (maxError < 1e-8) break;
  }

  const action = new Action();
  positions.forEach((position, atomId) => {
    const atom = struct.atoms.get(atomId);
    if (atom) action.addOp(new AtomMove(atomId, position.sub(atom.pp)));
  });
  return action.perform(restruct);
}

/**
 * Set the first selected local bond angle to a target angle in radians.
 * The first adjacent bond is kept fixed and the other connected branch is
 * rotated around the shared atom, matching ChemDraw's local Fixed Angles
 * behavior for chains.  Ring constraints intentionally use the same bounded
 * branch traversal instead of moving the reference bond.
 */
export function fromFixAngles(
  restruct: ReStruct,
  selection: EditorSelection | null,
  targetAngle: number,
) {
  if (
    !Number.isFinite(targetAngle) ||
    targetAngle <= 0 ||
    targetAngle >= Math.PI
  ) {
    throw new Error('Fixed bond angle must be between 0 and 180 degrees');
  }

  const struct = restruct.molecule;
  const effectiveSelection = selection ?? structSelection(struct);
  const selectedAtoms = new Set<number>(effectiveSelection.atoms ?? []);
  const selectedBonds = new Set<number>(effectiveSelection.bonds ?? []);
  selectedBonds.forEach((bondId) => {
    const bond = struct.bonds.get(bondId);
    if (bond) {
      selectedAtoms.add(bond.begin);
      selectedAtoms.add(bond.end);
    }
  });

  const candidateBonds: Array<[number, Bond]> = [];
  struct.bonds.forEach((bond, bondId) => {
    if (selectedBonds.size > 0) {
      if (selectedBonds.has(bondId)) candidateBonds.push([bondId, bond]);
    } else if (selectedAtoms.has(bond.begin) && selectedAtoms.has(bond.end)) {
      candidateBonds.push([bondId, bond]);
    }
  });
  const bondsByAtom = new Map<number, Array<[number, Bond]>>();
  candidateBonds.forEach(([bondId, bond]) => {
    const begin = bondsByAtom.get(bond.begin) ?? [];
    begin.push([bondId, bond]);
    bondsByAtom.set(bond.begin, begin);
    const end = bondsByAtom.get(bond.end) ?? [];
    end.push([bondId, bond]);
    bondsByAtom.set(bond.end, end);
  });

  let centerId: number | undefined;
  let referenceBond: Bond | undefined;
  let rotatingBond: Bond | undefined;
  for (const [atomId, bonds] of bondsByAtom) {
    if (bonds.length >= 2) {
      centerId = atomId;
      referenceBond = bonds[0][1];
      rotatingBond = bonds[1][1];
      break;
    }
  }
  if (centerId === undefined || !referenceBond || !rotatingBond) {
    throw new Error('固定键角需要先选择包含相邻两根化学键的结构');
  }

  const center = struct.atoms.get(centerId)?.pp;
  if (!center) throw new Error('找不到固定键角的中心原子');
  const otherAtom = (bond: Bond) =>
    bond.begin === centerId ? bond.end : bond.begin;
  const referenceAtomId = otherAtom(referenceBond);
  const rotatingAtomId = otherAtom(rotatingBond);
  const referenceAtom = struct.atoms.get(referenceAtomId)?.pp;
  const rotatingAtom = struct.atoms.get(rotatingAtomId)?.pp;
  if (!referenceAtom || !rotatingAtom)
    throw new Error('找不到固定键角的端点原子');

  const referenceVector = referenceAtom.sub(center);
  const rotatingVector = rotatingAtom.sub(center);
  const currentSignedAngle = Vec2.angle(referenceVector, rotatingVector);
  const sign = currentSignedAngle < 0 ? -1 : 1;
  let delta = sign * targetAngle - currentSignedAngle;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;

  const branch = new Set<number>();
  const queue = [rotatingAtomId];
  while (queue.length) {
    const atomId = queue.shift()!;
    if (branch.has(atomId) || atomId === centerId || atomId === referenceAtomId)
      continue;
    if (selectedAtoms.size > 0 && !selectedAtoms.has(atomId)) continue;
    branch.add(atomId);
    struct.bonds.forEach((bond) => {
      if (bond.begin !== atomId && bond.end !== atomId) return;
      const next = bond.begin === atomId ? bond.end : bond.begin;
      if (next !== centerId && next !== referenceAtomId && !branch.has(next))
        queue.push(next);
    });
  }
  if (!branch.size) throw new Error('固定键角没有可调整的结构分支');

  const action = new Action();
  branch.forEach((atomId) => {
    const atom = struct.atoms.get(atomId);
    if (atom)
      action.addOp(
        new AtomMove(
          atomId,
          atom.pp.sub(center).rotate(delta).sub(atom.pp.sub(center)),
        ),
      );
  });
  return action.perform(restruct);
}
