import { StereoFlag, type Atom, type Struct } from 'ketcher-core';

export interface BondErrorLocation {
  id: number;
  begin: number;
  end: number;
}

export interface MoleculeErrorLocation {
  atoms: number[];
  bonds: BondErrorLocation[];
}

export type MoleculeErrorLocations = Record<string, MoleculeErrorLocation>;

interface Point2D {
  x: number;
  y: number;
}

function unique(values: number[]): number[] {
  return Array.from(new Set(values));
}

function hasQueryAtom(atom: Atom): boolean {
  return Boolean(
    atom.atomList ||
      Object.entries(atom.queryProperties || {}).some(([key, value]) => {
        return value != null && !(key === 'unsaturation' && value === 0);
      }),
  );
}

function segmentsOverlapInterior(
  first: [Point2D, Point2D],
  second: [Point2D, Point2D],
): boolean {
  const [a, b] = first;
  const [c, d] = second;
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const qpx = c.x - a.x;
  const qpy = c.y - a.y;
  const denominator = rx * sy - ry * sx;
  const epsilon = 1e-7;

  if (Math.abs(denominator) > epsilon) {
    const t = (qpx * sy - qpy * sx) / denominator;
    const u = (qpx * ry - qpy * rx) / denominator;
    return t > epsilon && t < 1 - epsilon && u > epsilon && u < 1 - epsilon;
  }

  if (Math.abs(qpx * ry - qpy * rx) > epsilon) return false;

  const useX = Math.abs(rx) >= Math.abs(ry);
  const firstStart = useX ? a.x : a.y;
  const firstEnd = useX ? b.x : b.y;
  const secondStart = useX ? c.x : c.y;
  const secondEnd = useX ? d.x : d.y;
  const overlap =
    Math.min(Math.max(firstStart, firstEnd), Math.max(secondStart, secondEnd)) -
    Math.max(Math.min(firstStart, firstEnd), Math.min(secondStart, secondEnd));
  return overlap > epsilon;
}

function makeLocation(atoms: number[], bonds: BondErrorLocation[]) {
  const uniqueAtoms = unique(atoms);
  const uniqueBonds = Array.from(
    new Map(bonds.map((bond) => [bond.id, bond])).values(),
  );
  return uniqueAtoms.length || uniqueBonds.length
    ? { atoms: uniqueAtoms, bonds: uniqueBonds }
    : undefined;
}

export function collectCheckErrorLocations(
  struct: Struct,
  checkTypes: string[],
): MoleculeErrorLocations {
  const requested = new Set(checkTypes);
  const atoms = Array.from(struct.atoms.entries());
  const bonds = Array.from(struct.bonds.entries());
  const locations: MoleculeErrorLocations = {};

  if (requested.has('valence')) {
    const location = makeLocation(
      atoms.filter(([, atom]) => atom.badConn).map(([id]) => id),
      [],
    );
    if (location) locations.valence = location;
  }

  if (requested.has('radicals')) {
    const location = makeLocation(
      atoms.filter(([, atom]) => atom.radical !== 0).map(([id]) => id),
      [],
    );
    if (location) locations.radicals = location;
  }

  if (requested.has('pseudoatoms')) {
    const location = makeLocation(
      atoms.filter(([, atom]) => atom.isPseudo()).map(([id]) => id),
      [],
    );
    if (location) locations.pseudoatoms = location;
  }

  if (requested.has('3d')) {
    const location = makeLocation(
      atoms.filter(([, atom]) => (atom.pp.z ?? 0) !== 0).map(([id]) => id),
      [],
    );
    if (location) locations['3d'] = location;
  }

  if (requested.has('query')) {
    const location = makeLocation(
      atoms.filter(([, atom]) => hasQueryAtom(atom)).map(([id]) => id),
      bonds
        .filter(([, bond]) => bond.isQuery())
        .map(([id, bond]) => ({ id, begin: bond.begin, end: bond.end })),
    );
    if (location) locations.query = location;
  }

  if (requested.has('rgroups')) {
    const location = makeLocation(
      atoms
        .filter(([, atom]) => atom.label === 'R#' || atom.rglabel != null)
        .map(([id]) => id),
      [],
    );
    if (location) locations.rgroups = location;
  }

  if (requested.has('stereo') || requested.has('chiral')) {
    const stereoAtoms = atoms
      .filter(([, atom]) => atom.stereoParity !== 0 || atom.stereoLabel)
      .map(([id]) => id);
    const stereoBonds = bonds
      .filter(([, bond]) => bond.stereo !== 0)
      .map(([id, bond]) => ({ id, begin: bond.begin, end: bond.end }));
    const location = makeLocation(stereoAtoms, stereoBonds);
    if (location) {
      if (requested.has('stereo')) locations.stereo = location;
      if (requested.has('chiral')) locations.chiral = location;
    }
  }

  if (requested.has('chiral_flag')) {
    const absStereoAtoms = Array.from(struct.frags.values()).flatMap(
      (fragment) =>
        fragment?.enhancedStereoFlag === StereoFlag.Abs
          ? fragment.stereoAtoms
          : [],
    );
    const location = makeLocation(absStereoAtoms, []);
    if (location) locations.chiral_flag = location;
  }

  if (requested.has('overlapping_atoms')) {
    const overlappingAtoms = new Set<number>();
    for (let first = 0; first < atoms.length; first += 1) {
      const [firstId, firstAtom] = atoms[first];
      for (let second = first + 1; second < atoms.length; second += 1) {
        const [secondId, secondAtom] = atoms[second];
        if (
          Math.abs(firstAtom.pp.x - secondAtom.pp.x) <= 1e-7 &&
          Math.abs(firstAtom.pp.y - secondAtom.pp.y) <= 1e-7
        ) {
          overlappingAtoms.add(firstId);
          overlappingAtoms.add(secondId);
        }
      }
    }
    const location = makeLocation(Array.from(overlappingAtoms), []);
    if (location) locations.overlapping_atoms = location;
  }

  if (requested.has('overlapping_bonds')) {
    const overlappingBonds = new Map<number, BondErrorLocation>();
    for (let first = 0; first < bonds.length; first += 1) {
      const [firstId, firstBond] = bonds[first];
      const firstBegin = struct.atoms.get(firstBond.begin)?.pp;
      const firstEnd = struct.atoms.get(firstBond.end)?.pp;
      if (!firstBegin || !firstEnd) continue;

      for (let second = first + 1; second < bonds.length; second += 1) {
        const [secondId, secondBond] = bonds[second];
        if (
          firstBond.begin === secondBond.begin ||
          firstBond.begin === secondBond.end ||
          firstBond.end === secondBond.begin ||
          firstBond.end === secondBond.end
        ) {
          continue;
        }
        const secondBegin = struct.atoms.get(secondBond.begin)?.pp;
        const secondEnd = struct.atoms.get(secondBond.end)?.pp;
        if (
          secondBegin &&
          secondEnd &&
          segmentsOverlapInterior(
            [firstBegin, firstEnd],
            [secondBegin, secondEnd],
          )
        ) {
          overlappingBonds.set(firstId, {
            id: firstId,
            begin: firstBond.begin,
            end: firstBond.end,
          });
          overlappingBonds.set(secondId, {
            id: secondId,
            begin: secondBond.begin,
            end: secondBond.end,
          });
        }
      }
    }
    const location = makeLocation(
      Array.from(overlappingBonds.values()).flatMap(({ begin, end }) => [
        begin,
        end,
      ]),
      Array.from(overlappingBonds.values()),
    );
    if (location) locations.overlapping_bonds = location;
  }

  return locations;
}

export function locationsForWarnings(
  locations: MoleculeErrorLocations,
  warnings: Record<string, unknown>,
): MoleculeErrorLocations {
  return Object.fromEntries(
    Object.entries(locations).filter(([type]) => type in warnings),
  );
}
