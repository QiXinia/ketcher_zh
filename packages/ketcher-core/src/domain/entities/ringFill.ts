import type { Struct } from './struct';
import type { Loop } from './loop';

/** A ring is identified by its complete topology, never by a transient loop ID. */
export class RingFill {
  atoms: number[];
  bonds: number[];
  color: string;

  constructor(attributes: { atoms: number[]; bonds: number[]; color: string }) {
    this.atoms = [...attributes.atoms];
    this.bonds = [...attributes.bonds];
    this.color = attributes.color.toLowerCase();
  }

  matches(atoms: number[], bonds: number[]): boolean {
    return sameIds(this.atoms, atoms) && sameIds(this.bonds, bonds);
  }

  clone(): RingFill {
    return new RingFill(this);
  }
}

function sameIds(first: number[], second: number[]): boolean {
  const ids = new Set(second);
  return new Set(first).size === first.length &&
    first.length === ids.size && first.every((id) => ids.has(id));
}

export function getLoopRing(struct: Struct, loop: Loop) {
  const halfBonds = loop.hbs.map((id) => struct.halfBonds.get(id));
  if (halfBonds.some((halfBond) => !halfBond)) return null;
  const ring = {
    atoms: halfBonds.map((halfBond) => halfBond!.begin),
    bonds: halfBonds.map((halfBond) => halfBond!.bid),
  };
  return isRingTopology(struct, ring) ? ring : null;
}

/** Reject dangling IDs, duplicate vertices and open chains, including after deletion. */
export function isRingTopology(
  struct: Struct,
  ring: { atoms: number[]; bonds: number[] },
): boolean {
  const atoms = new Set(ring.atoms);
  if (atoms.size < 3 || atoms.size !== ring.atoms.length ||
      atoms.size !== ring.bonds.length ||
      new Set(ring.bonds).size !== ring.bonds.length ||
      ring.atoms.some((id) => !struct.atoms.has(id))) return false;
  const neighbors = new Map(ring.atoms.map((id) => [id, [] as number[]]));
  for (const id of ring.bonds) {
    const bond = struct.bonds.get(id);
    if (!bond || bond.begin === bond.end ||
        !atoms.has(bond.begin) || !atoms.has(bond.end)) return false;
    neighbors.get(bond.begin)!.push(bond.end);
    neighbors.get(bond.end)!.push(bond.begin);
  }
  if (Array.from(neighbors.values()).some((ids) => ids.length !== 2)) return false;
  const visited = new Set<number>();
  const pending = [ring.atoms[0]];
  while (pending.length) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...neighbors.get(id)!);
  }
  return visited.size === atoms.size;
}

export function findRingFill(
  fills: Iterable<RingFill>,
  atoms: number[],
  bonds: number[],
): RingFill | undefined {
  return Array.from(fills).find((fill) => fill.matches(atoms, bonds));
}
