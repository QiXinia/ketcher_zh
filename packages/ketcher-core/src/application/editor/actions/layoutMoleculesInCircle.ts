/****************************************************************************
 * Copyright 2026 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 **************************************************************************/

import type { ReStruct } from 'application/render';
import { Vec2 } from 'domain/entities/vec2';
import { Action } from './action';
import { fromMultipleMoveAction } from './fragment';

type LayoutGroup = {
  atoms: number[];
  center: Vec2;
  min: Vec2;
  max: Vec2;
};

function groupBounds(restruct: ReStruct, atomIds: number[]): LayoutGroup | null {
  const points = atomIds.flatMap((atomId) => {
    const point = restruct.molecule.atoms.get(atomId)?.pp;
    return point ? [new Vec2(point)] : [];
  });
  if (!points.length) return null;

  const min = points.reduce((current, point) => Vec2.min(current, point));
  const max = points.reduce((current, point) => Vec2.max(current, point));
  return {
    atoms: atomIds,
    center: Vec2.centre(min, max),
    min,
    max,
  };
}

/**
 * Arrange disconnected small-molecule components around a circle.
 *
 * ChemDraw exposes this as a ChemScript.  Keeping the coordinate changes in a
 * Core action makes the host command undoable and preserves KET round-trips.
 */
export function fromMoleculesInCircle(restruct: ReStruct) {
  const components = restruct.molecule
    .findConnectedComponents?.()
    ?.map((component) => groupBounds(restruct, Array.from(component)))
    .filter((group): group is LayoutGroup => Boolean(group))
    .sort((left, right) => left.center.x - right.center.x || left.center.y - right.center.y) ?? [];

  if (components.length < 2) return new Action().perform(restruct);

  const allMin = components.reduce((current, group) => Vec2.min(current, group.min), components[0].min);
  const allMax = components.reduce((current, group) => Vec2.max(current, group.max), components[0].max);
  const center = Vec2.centre(allMin, allMax);
  const span = Math.max(allMax.x - allMin.x, allMax.y - allMin.y, 1);
  const radius = Math.max(4, span * 0.75);
  const action = new Action();

  components.forEach((group, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / components.length;
    const target = new Vec2(
      center.x + radius * Math.cos(angle),
      center.y + radius * Math.sin(angle),
    );
    action.mergeWith(
      fromMultipleMoveAction(restruct, { atoms: group.atoms }, target.sub(group.center)),
    );
  });

  return action.perform(restruct);
}
