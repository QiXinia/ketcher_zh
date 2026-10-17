/****************************************************************************
 * Copyright 2026 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 ***************************************************************************/

import type { ReStruct } from 'application/render';
import { Vec2 } from 'domain/entities/vec2';
import type { EditorSelection } from '../editor.types';
import { Action } from './action';
import { fromMultipleMoveAction } from './fragment';

export type ObjectAlignment =
  | 'left'
  | 'horizontal-center'
  | 'right'
  | 'top'
  | 'vertical-center'
  | 'bottom';

export type ObjectDistribution = 'horizontal' | 'vertical';

type Point = { x: number; y: number };
type Bounds = { min: Point; max: Point };
type LayoutObject = {
  selection: EditorSelection;
  bounds: Bounds;
};

const objectMaps = [
  'rxnArrows',
  'rxnPluses',
  'simpleObjects',
  'texts',
  'images',
  'multitailArrows',
] as const;
type ObjectMap = typeof objectMaps[number];

function extendBounds(points: Point[]): Bounds | null {
  if (!points.length) return null;
  const min = { x: points[0].x, y: points[0].y };
  const max = { x: points[0].x, y: points[0].y };
  points.slice(1).forEach((point) => {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
  });
  return { min, max };
}

function pointsForObject(
  restruct: ReStruct,
  map: ObjectMap,
  id: number,
): Point[] {
  const struct = restruct.molecule;
  switch (map) {
    case 'rxnArrows':
      return (struct.rxnArrows.get(id)?.pos ?? []).map(({ x, y }) => ({
        x,
        y,
      }));
    case 'rxnPluses': {
      const point = struct.rxnPluses.get(id)?.pp;
      return point ? [{ x: point.x, y: point.y }] : [];
    }
    case 'simpleObjects':
      return (struct.simpleObjects.get(id)?.pos ?? []).map(({ x, y }) => ({
        x,
        y,
      }));
    case 'texts': {
      const point = struct.texts.get(id)?.position;
      return point ? [{ x: point.x, y: point.y }] : [];
    }
    case 'images':
      return (struct.images.get(id)?.getCornerPositions() ?? []).map(
        ({ x, y }) => ({ x, y }),
      );
    case 'multitailArrows':
      return (
        struct.multitailArrows.get(id)?.getReferencePositionsArray() ?? []
      ).map(({ x, y }) => ({ x, y }));
  }
}

function fragmentObjects(
  restruct: ReStruct,
  selection: EditorSelection,
): LayoutObject[] {
  const struct = restruct.molecule;
  const atomIds = new Set(selection.atoms ?? []);
  selection.sgroups?.forEach((sgroupId) => {
    struct.sgroups
      .get(sgroupId)
      ?.atoms.forEach((atomId) => atomIds.add(atomId));
  });
  selection.frags?.forEach((fragmentId) => {
    struct.atoms.forEach((atom, atomId) => {
      if (atom.fragment === fragmentId) atomIds.add(atomId);
    });
  });
  (selection.bonds ?? []).forEach((bondId) => {
    const bond = struct.bonds.get(bondId);
    if (bond) {
      atomIds.add(bond.begin);
      atomIds.add(bond.end);
    }
  });

  const groups = new Map<string, number[]>();
  atomIds.forEach((atomId) => {
    const atom = struct.atoms.get(atomId);
    if (!atom) return;
    const key =
      atom.fragment >= 0 ? `fragment:${atom.fragment}` : `atom:${atomId}`;
    const group = groups.get(key) ?? [];
    group.push(atomId);
    groups.set(key, group);
  });

  const result: LayoutObject[] = [];
  groups.forEach((ids) => {
    const bounds = extendBounds(
      ids.flatMap((id) => {
        const point = struct.atoms.get(id)?.pp;
        return point ? [{ x: point.x, y: point.y }] : [];
      }),
    );
    if (bounds) result.push({ selection: { atoms: ids }, bounds });
  });
  return result;
}

function drawingObjects(
  restruct: ReStruct,
  selection: EditorSelection,
): LayoutObject[] {
  const result: LayoutObject[] = [];
  objectMaps.forEach((map) => {
    (selection[map] ?? []).forEach((id) => {
      const bounds = extendBounds(pointsForObject(restruct, map, id));
      if (bounds) result.push({ selection: { [map]: [id] }, bounds });
    });
  });
  return result;
}

function selectedObjects(
  restruct: ReStruct,
  selection: EditorSelection | null,
): LayoutObject[] {
  if (!selection) return [];
  return [
    ...fragmentObjects(restruct, selection),
    ...drawingObjects(restruct, selection),
  ];
}

function moveObjects(
  restruct: ReStruct,
  objects: LayoutObject[],
  deltas: Vec2[],
): Action {
  const action = new Action();
  objects.forEach((object, index) => {
    const delta = deltas[index];
    if (!delta || (delta.x === 0 && delta.y === 0)) return;
    action.mergeWith(fromMultipleMoveAction(restruct, object.selection, delta));
  });
  return action;
}

function boundsForAll(objects: LayoutObject[]): Bounds | null {
  return extendBounds(
    objects.flatMap(({ bounds }) => [bounds.min, bounds.max]),
  );
}

export function fromAlignObjects(
  restruct: ReStruct,
  selection: EditorSelection | null,
  alignment: ObjectAlignment,
) {
  const objects = selectedObjects(restruct, selection);
  if (objects.length < 2) throw new Error('对齐至少需要选择两个对象');
  const all = boundsForAll(objects)!;
  const target =
    alignment === 'left'
      ? all.min.x
      : alignment === 'right'
      ? all.max.x
      : alignment === 'horizontal-center'
      ? (all.min.x + all.max.x) / 2
      : alignment === 'top'
      ? all.min.y
      : alignment === 'bottom'
      ? all.max.y
      : (all.min.y + all.max.y) / 2;

  const deltas = objects.map(({ bounds }) => {
    if (alignment === 'left') return new Vec2(target - bounds.min.x, 0);
    if (alignment === 'right') return new Vec2(target - bounds.max.x, 0);
    if (alignment === 'horizontal-center') {
      return new Vec2(target - (bounds.min.x + bounds.max.x) / 2, 0);
    }
    if (alignment === 'top') return new Vec2(0, target - bounds.min.y);
    if (alignment === 'bottom') return new Vec2(0, target - bounds.max.y);
    return new Vec2(0, target - (bounds.min.y + bounds.max.y) / 2);
  });
  return moveObjects(restruct, objects, deltas).perform(restruct);
}

export function fromDistributeObjects(
  restruct: ReStruct,
  selection: EditorSelection | null,
  direction: ObjectDistribution,
) {
  const objects = selectedObjects(restruct, selection);
  if (objects.length < 3) throw new Error('分布至少需要选择三个对象');
  const sorted = objects
    .map((object, index) => ({ object, index }))
    .sort((a, b) => {
      const aStart =
        direction === 'horizontal'
          ? a.object.bounds.min.x
          : a.object.bounds.min.y;
      const bStart =
        direction === 'horizontal'
          ? b.object.bounds.min.x
          : b.object.bounds.min.y;
      return aStart - bStart;
    });
  const coordinate = (bounds: Bounds) =>
    direction === 'horizontal'
      ? [bounds.min.x, bounds.max.x]
      : [bounds.min.y, bounds.max.y];
  const firstBounds = sorted[0].object.bounds;
  const lastBounds = sorted.at(-1)!.object.bounds;
  const [firstStart] = coordinate(firstBounds);
  const [, lastEnd] = coordinate(lastBounds);
  const occupiedLength = sorted.reduce((total, { object }) => {
    const [start, end] = coordinate(object.bounds);
    return total + end - start;
  }, 0);
  // Distribute the space between model bounds, preserving the outer objects.
  // Different object widths must not turn equal spacing into equal centers.
  const gap = (lastEnd - firstStart - occupiedLength) / (sorted.length - 1);
  const deltas = objects.map(() => new Vec2());
  let nextStart = firstStart;
  sorted.forEach(({ object, index }, order) => {
    const [start, end] = coordinate(object.bounds);
    const delta =
      order === 0 || order === sorted.length - 1 ? 0 : nextStart - start;
    deltas[index] =
      direction === 'horizontal' ? new Vec2(delta, 0) : new Vec2(0, delta);
    nextStart = end + delta + gap;
  });
  return moveObjects(restruct, objects, deltas).perform(restruct);
}
