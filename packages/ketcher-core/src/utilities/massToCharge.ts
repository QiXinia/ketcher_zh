// CODATA 2022 electron relative atomic mass, in unified atomic mass units.
// https://physics.nist.gov/cgi-bin/cuu/Value?are
export const ELECTRON_MASS_U = 0.0005485799090441;

export type MassToChargeResult =
  | { ok: true; mz: number; charge: number; neutralAtomicMass: number }
  | {
      ok: false;
      reason: 'invalid-ket' | 'complex-structure' | 'neutral' | 'invalid-mass';
    };

const elements = new Set(
  'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(
    ' ',
  ),
);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Calculate m/z for a single, explicitly charged, concrete KET molecule.
 * Indigo's monoisotopic-mass is an atomic-mass sum and does not adjust for
 * net charge; subtract one electron mass for each positive charge. The input
 * mass must come from the same structure snapshot and Indigo calculation.
 * No adduct, protonation state or spectrum is inferred.
 */
export function massToChargeFromKet(
  ketSource: string,
  monoisotopicMass: unknown,
): MassToChargeResult {
  let ket: Record<string, unknown> | null;
  try {
    ket = record(JSON.parse(ketSource));
  } catch {
    return { ok: false, reason: 'invalid-ket' };
  }
  const root = record(ket?.root);
  if (!ket || !root || !Array.isArray(root.nodes))
    return { ok: false, reason: 'invalid-ket' };
  const molecules: Record<string, unknown>[] = [];
  for (const node of root.nodes) {
    const item = record(node);
    if (!item) return { ok: false, reason: 'complex-structure' };
    if (typeof item.$ref === 'string') {
      const target = record(ket[item.$ref]);
      if (!target || target.type !== 'molecule')
        return { ok: false, reason: 'complex-structure' };
      molecules.push(target);
    } else if (!['text', 'simpleObject', 'image'].includes(String(item.type))) {
      return { ok: false, reason: 'complex-structure' };
    }
  }
  if (molecules.length !== 1) return { ok: false, reason: 'complex-structure' };
  const molecule = molecules[0];
  if (
    !Array.isArray(molecule.atoms) ||
    !molecule.atoms.length ||
    molecule.atoms.length > 50000 ||
    (molecule.bonds !== undefined && !Array.isArray(molecule.bonds)) ||
    (molecule.sgroups !== undefined &&
      (!Array.isArray(molecule.sgroups) || molecule.sgroups.length))
  )
    return { ok: false, reason: 'complex-structure' };
  const atoms = molecule.atoms;
  const bonds = (molecule.bonds ?? []) as unknown[];
  if (bonds.length > 100000) return { ok: false, reason: 'complex-structure' };
  let charge = 0;
  for (const value of atoms) {
    const atom = record(value);
    if (
      !atom ||
      typeof atom.label !== 'string' ||
      !elements.has(atom.label) ||
      (atom.type !== undefined && atom.type !== 'atom') ||
      (atom.queryProperties &&
        (!record(atom.queryProperties) ||
          Object.keys(record(atom.queryProperties)!).length)) ||
      (atom.implicitHCount !== undefined && atom.implicitHCount !== null) ||
      [
        'ringBondCount',
        'substitutionCount',
        'unsaturatedAtom',
        'hCount',
        'alias',
        'attachmentPoints',
        'customQuery',
      ].some(
        (key) =>
          atom[key] !== undefined &&
          atom[key] !== null &&
          atom[key] !== 0 &&
          atom[key] !== false &&
          atom[key] !== '',
      )
    ) {
      return { ok: false, reason: 'complex-structure' };
    }
    const atomCharge = atom.charge ?? 0;
    if (typeof atomCharge !== 'number' || !Number.isSafeInteger(atomCharge))
      return { ok: false, reason: 'complex-structure' };
    charge += atomCharge;
  }
  const neighbors: number[][] = Array.from({ length: atoms.length }, () => []);
  for (const value of bonds) {
    const bond = record(value);
    if (
      !bond ||
      ![1, 2, 3, 4, 9].includes(Number(bond.type)) ||
      !Array.isArray(bond.atoms) ||
      bond.atoms.length !== 2 ||
      bond.customQuery ||
      bond.queryProperties ||
      (bond.topology !== undefined && bond.topology !== 0)
    )
      return { ok: false, reason: 'complex-structure' };
    const [a, b] = bond.atoms;
    if (
      typeof a !== 'number' ||
      typeof b !== 'number' ||
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      a < 0 ||
      b < 0 ||
      a >= atoms.length ||
      b >= atoms.length ||
      a === b
    )
      return { ok: false, reason: 'complex-structure' };
    neighbors[a].push(b);
    neighbors[b].push(a);
  }
  const seen = new Set<number>([0]);
  const pending = [0];
  while (pending.length) {
    const current = pending.pop()!;
    for (const neighbor of neighbors[current])
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        pending.push(neighbor);
      }
  }
  if (seen.size !== atoms.length)
    return { ok: false, reason: 'complex-structure' };
  if (!charge) return { ok: false, reason: 'neutral' };
  if (!Number.isSafeInteger(charge))
    return { ok: false, reason: 'complex-structure' };
  if (
    typeof monoisotopicMass !== 'number' &&
    typeof monoisotopicMass !== 'string'
  )
    return { ok: false, reason: 'invalid-mass' };
  if (
    typeof monoisotopicMass === 'string' &&
    !/^\s*(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/i.test(monoisotopicMass)
  )
    return { ok: false, reason: 'invalid-mass' };
  const mass = Number(monoisotopicMass);
  const ionMass = mass - charge * ELECTRON_MASS_U;
  if (!Number.isFinite(mass) || mass <= 0 || ionMass <= 0)
    return { ok: false, reason: 'invalid-mass' };
  return {
    ok: true,
    mz: ionMass / Math.abs(charge),
    charge,
    neutralAtomicMass: mass,
  };
}
