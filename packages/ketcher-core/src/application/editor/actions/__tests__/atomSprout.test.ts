/** @jest-environment node */
import { Atom } from 'domain/entities/atom';
import { Bond } from 'domain/entities/bond';
import { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import ReStruct from 'application/render/restruct/restruct';
import type { Render } from 'application/render';
import { createFusionRing } from '../ringFusion';
import { fromSelectedAtomSprout, type AtomSproutKind } from '../atomSprout';
import reference from './fixtures/chemdraw-sprout-graphs.json';

function makeReStruct(struct = new Struct()) {
  if (!struct.atoms.size) {
    struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, 0) }));
    struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(-1, 0) }));
    struct.bonds.add(new Bond({ begin: 0, end: 1, type: 1 }));
  }
  struct.prepareLoopStructure();
  struct.markFragments();
  struct.setImplicitHydrogen();
  const layer = { attr() { return this; }, toFront() { return this; } };
  const restruct = new ReStruct(struct, { paper: { rect: () => layer }, options: {} } as unknown as Render);
  restruct.assignConnectedComponents();
  restruct.visibleAtoms = new Map(restruct.atoms);
  return restruct;
}
const graph = (struct: Struct) => ({
  atoms: [...struct.atoms.entries()].sort(([a], [b]) => a - b).map(([id, atom]) => ({
    id, label: atom.label, isotope: atom.isotope, charge: atom.charge, aam: atom.aam,
    fragment: atom.fragment, implicitH: atom.implicitH, x: atom.pp.x, y: atom.pp.y,
  })),
  bonds: [...struct.bonds.entries()].sort(([a], [b]) => a - b).map(([id, bond]) => ({
    id, begin: bond.begin, end: bond.end, type: bond.type, stereo: bond.stereo,
  })),
});
const countElement = (struct: Struct, label: string) => [...struct.atoms.values()].filter(atom => atom.label === label).length;
const connected = (struct: Struct, id: number) => (struct.atomGetNeighbors(id) ?? []).map(neighbor => ({ atom: struct.atoms.get(neighbor.aid)!, bond: struct.bonds.get(neighbor.bid)! }));

// Match complete labeled graphs, including the directed origin of stereo
// bonds, against independently extracted reference data. Atom ordering differs
// between ChemDraw and Ketcher; the source hotspot must match explicitly.
function matchesReference(struct: Struct, expected: typeof reference.cases[number]) {
  const ids = [...struct.atoms.keys()];
  const labels = ids.map(id => struct.atoms.get(id)!.label);
  if (labels.length !== expected.labels.length || struct.bonds.size !== expected.bonds.length) return false;
  const matrix = (size: number, bonds: number[][]) => {
    const edges = Array.from({ length: size }, () => Array<string>(size).fill(''));
    bonds.forEach(([begin, end, type, stereo]) => {
      edges[begin][end] = `${type}/${stereo}/${stereo ? 'begin' : ''}`;
      edges[end][begin] = `${type}/${stereo}/${stereo ? 'end' : ''}`;
    });
    return edges;
  };
  const actual = matrix(labels.length, [...struct.bonds.values()].map(bond => [ids.indexOf(bond.begin), ids.indexOf(bond.end), bond.type, bond.stereo]));
  const target = matrix(expected.labels.length, expected.bonds);
  const map = new Map([[ids.indexOf(0), expected.sourceAtom]]);
  const used = new Set([expected.sourceAtom]);
  const visit = (): boolean => {
    if (map.size === labels.length) return true;
    const id = labels.findIndex((_, index) => !map.has(index));
    for (let candidate = 0; candidate < expected.labels.length; candidate++) {
      if (used.has(candidate) || labels[id] !== expected.labels[candidate]) continue;
      if (actual[id].filter(Boolean).length !== target[candidate].filter(Boolean).length) continue;
      if ([...map].some(([oldId, oldCandidate]) => actual[id][oldId] !== target[candidate][oldCandidate])) continue;
      map.set(id, candidate);
      used.add(candidate);
      if (visit()) return true;
      map.delete(id);
      used.delete(candidate);
    }
    return false;
  };
  return labels[ids.indexOf(0)] === expected.labels[expected.sourceAtom] && visit();
}

describe('contextual ChemDraw atom SPROUT', () => {
  it.each(reference.cases)('matches the independent Cheat Sheet chemical graph: $kind', expected => {
    const restruct = makeReStruct();
    fromSelectedAtomSprout(restruct, [0], expected.kind as AtomSproutKind);
    expect(matchesReference(restruct.molecule, expected)).toBe(true);
  });
  // ChemDraw's shipped Hotkeys Cheat Sheet.cdxml starts from ethane. Its
  // actual atom/bond graphs disambiguate the terse hotkeys.xml descriptions.
  it.each([
    ['methyl-linear', 1, 1], ['methyl-cyclic', 1, 1], ['carbonyl', 2, 2],
    ['phenyl', 5, 6], ['wedge-up', 2, 2], ['wedge-down', 2, 2],
    ['cyclohexane', 5, 6], ['cyclopentane', 4, 5], ['methylidene', 1, 1],
    ['dimethyl', 2, 2], ['alkyne', 1, 1], ['cyclopropane', 2, 3],
    ['cyclobutane', 3, 4], ['tert-butyl', 3, 3], ['sulfonyl', 3, 3],
  ] as const)('%s generates the documented primary-carbon graph and a reversible native action', (kind, atoms, bonds) => {
    const restruct = makeReStruct();
    const before = graph(restruct.molecule);
    const result = fromSelectedAtomSprout(restruct, [0], kind);
    expect(result.atoms).toHaveLength(atoms);
    expect(result.bonds).toHaveLength(bonds);
    const struct = restruct.molecule;
    expect(struct.atoms.size).toBe(2 + atoms);
    expect(struct.bonds.size).toBe(1 + bonds);
    expect([...struct.atoms.values()].every(atom => atom.fragment === struct.atoms.get(0)!.fragment)).toBe(true);
    const fused = graph(struct);
    const redo = result.inverseAction.perform(restruct);
    expect(graph(struct)).toEqual(before);
    redo.perform(restruct);
    expect(graph(struct)).toEqual(fused);
    const restored = new KetSerializer().deserializeMicromolecules(new KetSerializer().serializeMicromolecules(struct));
    expect(restored.atoms.size).toBe(struct.atoms.size);
    expect(restored.bonds.size).toBe(struct.bonds.size);
    expect(countElement(restored, 'O')).toBe(countElement(struct, 'O'));
    expect(countElement(restored, 'S')).toBe(countElement(struct, 'S'));
  });

  it('adds acetyl at primary carbon, direct carbonyl at secondary carbon and a spacer at tertiary carbon', () => {
    const primary = makeReStruct();
    fromSelectedAtomSprout(primary, [0], 'carbonyl');
    expect(connected(primary.molecule, 0).map(({ atom, bond }) => [atom.label, bond.type]).sort()).toEqual([['C', 1], ['C', 1], ['O', 2]]);

    const secondary = makeReStruct(createFusionRing(6));
    const result = fromSelectedAtomSprout(secondary, [0], 'carbonyl');
    expect(result.atoms).toHaveLength(1);
    expect(countElement(secondary.molecule, 'O')).toBe(1);
    expect(connected(secondary.molecule, 0).find(({ atom }) => atom.label === 'O')!.bond.type).toBe(2);

    const tertiary = makeReStruct();
    fromSelectedAtomSprout(tertiary, [0], 'dimethyl');
    const added = fromSelectedAtomSprout(tertiary, [0], 'carbonyl');
    expect(added.atoms).toHaveLength(3);
    expect(connected(tertiary.molecule, 0).every(({ atom }) => atom.label === 'C')).toBe(true);
    expect(connected(tertiary.molecule, added.targetAtomId).filter(({ atom, bond }) => atom.label === 'O' && bond.type === 2)).toHaveLength(1);
  });

  it.each(['cyclohexane', 'cyclopentane', 'cyclobutane', 'cyclopropane'] as const)('forms a true spiro %s at saturated secondary carbon', kind => {
    const restruct = makeReStruct(createFusionRing(6));
    const result = fromSelectedAtomSprout(restruct, [0], kind);
    const newIds = new Set(result.atoms);
    expect(restruct.molecule.atomGetNeighbors(0)).toHaveLength(4);
    expect(newIds.has(0)).toBe(false);
    expect(result.bonds.map(id => restruct.molecule.bonds.get(id)!).filter(bond => bond.begin === 0 || bond.end === 0)).toHaveLength(2);
    const neighborsOfNew = result.atoms.flatMap(id => (restruct.molecule.atomGetNeighbors(id) ?? []).map(n => n.aid));
    expect(neighborsOfNew.filter(id => !newIds.has(id))).toEqual([0, 0]);
  });

  it.each([false, true])('adds an external phenyl at aromatic carbon (aromatized=%s), preserving the existing ring', aromatized => {
    const ring = createFusionRing('benzene');
    if (aromatized) ring.bonds.forEach((bond, id) => {
      ring.bonds.set(id, new Bond({ ...bond, type: Bond.PATTERN.TYPE.AROMATIC }));
    });
    const restruct = makeReStruct(ring);
    const oldBonds = [...ring.bonds.values()].map(bond => [bond.begin, bond.end, bond.type]);
    const result = fromSelectedAtomSprout(restruct, [0], 'phenyl');
    expect(result.atoms).toHaveLength(6);
    expect(result.bonds).toHaveLength(7);
    expect([...ring.bonds.values()].slice(0, 6).map(bond => [bond.begin, bond.end, bond.type])).toEqual(oldBonds);
    expect(result.targetAtomId).not.toBe(0);
    expect(connected(ring, 0).filter(({ bond }) => result.bonds.includes(ring.bonds.keyOf(bond)!))).toHaveLength(1);
  });

  it.each(['wedge-up', 'wedge-down'] as const)('creates MDL %s stereo and keeps the wedge anchored at the source', kind => {
    const restruct = makeReStruct();
    const result = fromSelectedAtomSprout(restruct, [0], kind);
    const wedge = result.bonds.map(id => restruct.molecule.bonds.get(id)!).find(bond => bond.stereo)!;
    expect(wedge.begin).toBe(0);
    expect(wedge.stereo).toBe(kind === 'wedge-up' ? 1 : 6);
    expect(connected(restruct.molecule, 0)).toHaveLength(3);
  });

  it('adds a spacer and two branches for aromatic wedge growth', () => {
    const restruct = makeReStruct(createFusionRing('benzene'));
    const result = fromSelectedAtomSprout(restruct, [0], 'wedge-up');
    expect(result.atoms).toHaveLength(3);
    const wedge = result.bonds.map(id => restruct.molecule.bonds.get(id)!).find(bond => bond.stereo)!;
    expect(wedge.begin).toBe(result.targetAtomId);
    expect(wedge.begin).not.toBe(0);
    expect(restruct.molecule.atomGetNeighbors(wedge.begin)).toHaveLength(3);
  });

  it.each(['N', 'O', 'S'])('recognizes a five-membered Kekule %s heteroaromatic ring for wedge growth', label => {
    const ring = createFusionRing('cyclopentadiene');
    ring.atoms.get(0)!.label = label;
    const restruct = makeReStruct(ring);
    const before = graph(ring);
    const result = fromSelectedAtomSprout(restruct, [1], 'wedge-up');
    expect(result.atoms).toHaveLength(3);
    const wedge = result.bonds.map(id => ring.bonds.get(id)!).find(bond => bond.stereo)!;
    expect(wedge.begin).toBe(result.targetAtomId);
    expect(wedge.begin).not.toBe(1);
    expect(ring.atoms.get(1)!.implicitH).toBe(0);
    result.inverseAction.perform(restruct);
    expect(graph(ring)).toEqual(before);
  });

  it('keeps the saturated carbon of cyclopentadiene available for direct wedge growth', () => {
    const restruct = makeReStruct(createFusionRing('cyclopentadiene'));
    const result = fromSelectedAtomSprout(restruct, [0], 'wedge-down');
    expect(result.atoms).toHaveLength(1);
    expect(result.targetAtomId).toBe(0);
    expect(restruct.molecule.bonds.get(result.bonds[0])!.begin).toBe(0);
  });

  it('does not infer aromaticity from three nonalternating double bonds', () => {
    const ring = createFusionRing(6);
    ring.bonds.forEach((bond, id) => {
      ring.bonds.set(id, new Bond({ ...bond, type: [1, 2, 3].includes(id) ? 2 : 1 }));
    });
    const restruct = makeReStruct(ring);
    const result = fromSelectedAtomSprout(restruct, [0], 'wedge-up');
    expect(result.atoms).toHaveLength(1);
    expect(result.targetAtomId).toBe(0);
  });

  it('uses 90-degree tert-butyl branches and an exactly collinear alkyne', () => {
    const tertiary = makeReStruct();
    const group = fromSelectedAtomSprout(tertiary, [0], 'tert-butyl');
    const vectors = group.atoms.map(id => tertiary.molecule.atoms.get(id)!.pp);
    expect(Math.abs(Vec2.dot(vectors[0], vectors[1]))).toBeLessThan(1e-8);
    expect(Math.abs(Vec2.dot(vectors[1], vectors[2]))).toBeLessThan(1e-8);
    const alkyne = makeReStruct();
    const result = fromSelectedAtomSprout(alkyne, [0], 'alkyne');
    const first = alkyne.molecule.atoms.get(1)!.pp;
    const last = alkyne.molecule.atoms.get(result.targetAtomId)!.pp;
    expect(Math.abs(Vec2.cross(first, last))).toBeLessThan(1e-8);
    expect(Vec2.dot(first, last)).toBeLessThan(0);
    expect(alkyne.molecule.bonds.get(result.bonds[0])!.type).toBe(3);
  });

  it('applies secondary and tertiary dimethyl and methylidene rules without erasing substituents', () => {
    const secondary = makeReStruct(createFusionRing(6));
    const gem = fromSelectedAtomSprout(secondary, [0], 'dimethyl');
    expect(gem.atoms).toHaveLength(2);
    expect(secondary.molecule.atomGetNeighbors(0)).toHaveLength(4);
    const tertiary = makeReStruct();
    fromSelectedAtomSprout(tertiary, [0], 'dimethyl');
    const isopropyl = fromSelectedAtomSprout(tertiary, [0], 'dimethyl');
    expect(isopropyl.atoms).toHaveLength(3);
    expect(tertiary.molecule.atomGetNeighbors(0)).toHaveLength(4);
    expect(tertiary.molecule.atomGetNeighbors(isopropyl.targetAtomId)).toHaveLength(3);
    const alkene = makeReStruct(createFusionRing('benzene'));
    const vinyl = fromSelectedAtomSprout(alkene, [0], 'methylidene');
    expect(vinyl.atoms).toHaveLength(2);
    expect(alkene.molecule.bonds.get(vinyl.bonds[0])!.type).toBe(1);
    expect(alkene.molecule.bonds.get(vinyl.bonds[1])!.type).toBe(2);
    expect(alkene.molecule.bonds.get(vinyl.bonds[1])!.begin).not.toBe(0);
  });

  it('builds a true sulfone with two double oxygens and restores the original carbon on undo', () => {
    const restruct = makeReStruct();
    const before = graph(restruct.molecule);
    const result = fromSelectedAtomSprout(restruct, [0], 'sulfonyl');
    const struct = restruct.molecule;
    expect(struct.atoms.get(0)!.label).toBe('S');
    expect(countElement(struct, 'O')).toBe(2);
    expect(connected(struct, 0).filter(({ atom, bond }) => atom.label === 'O' && bond.type === 2)).toHaveLength(2);
    expect(connected(struct, 0).filter(({ atom, bond }) => atom.label === 'C' && bond.type === 1)).toHaveLength(2);
    result.inverseAction.perform(restruct);
    expect(graph(struct)).toEqual(before);
  });

  it('keeps successive linear methyl bonds zigzagged and adds atom/bond data in the actual fragment', () => {
    const restruct = makeReStruct();
    restruct.molecule.atoms.forEach(atom => { atom.fragment = 7; });
    const first = fromSelectedAtomSprout(restruct, [0], 'methyl-linear');
    const second = fromSelectedAtomSprout(restruct, [first.targetAtomId], 'methyl-linear');
    const a = restruct.molecule.atoms.get(0)!.pp;
    const b = restruct.molecule.atoms.get(first.targetAtomId)!.pp;
    const c = restruct.molecule.atoms.get(second.targetAtomId)!.pp;
    const incoming = Vec2.diff(b, a);
    const outgoing = Vec2.diff(c, b);
    expect(Math.abs(Vec2.cross(incoming, outgoing))).toBeGreaterThan(0.8);
    expect(Math.abs(Vec2.angle(incoming, outgoing))).toBeCloseTo(Math.PI / 3);
    expect(restruct.molecule.atoms.get(first.targetAtomId)!.fragment).toBe(7);
    expect(restruct.molecule.atoms.get(second.targetAtomId)!.fragment).toBe(7);
  });

  it('retains heteroatoms, isotope, charge and mapping, including sulfur appendage at an isotopic carbon', () => {
    for (const [label, isotope, kind] of [['N', 15, 'phenyl'], ['C', 13, 'sulfonyl'], ['N', 15, 'carbonyl']] as const) {
      const restruct = makeReStruct();
      const source = restruct.molecule.atoms.get(0)!;
      Object.assign(source, { label, isotope, charge: 1, aam: 42 });
      const result = fromSelectedAtomSprout(restruct, [0], kind);
      expect([source.label, source.isotope, source.charge, source.aam]).toEqual([label, isotope, 1, 42]);
      const restored = new KetSerializer().deserializeMicromolecules(new KetSerializer().serializeMicromolecules(restruct.molecule));
      const atom = [...restored.atoms.values()].find(atom => atom.isotope === isotope)!;
      expect([atom.label, atom.charge, atom.aam]).toEqual([label, 1, 42]);
      result.inverseAction.perform(restruct);
      expect([source.label, source.isotope, source.charge, source.aam]).toEqual([label, isotope, 1, 42]);
    }
  });

  it('grows cyclic methyl bonds into a six-member ring without duplicate atoms and undoes ring closure', () => {
    const struct = new Struct();
    struct.atoms.add(new Atom({ label: 'C', pp: new Vec2() }));
    const restruct = makeReStruct(struct);
    let target = 0;
    for (let step = 0; step < 5; step++) {
      const result = fromSelectedAtomSprout(restruct, [target], 'methyl-cyclic');
      target = result.targetAtomId;
    }
    const before = graph(struct);
    const closure = fromSelectedAtomSprout(restruct, [target], 'methyl-cyclic');
    expect(closure.atoms).toHaveLength(0);
    expect(closure.targetAtomId).toBe(0);
    expect(struct.atoms.size).toBe(6);
    expect(struct.bonds.size).toBe(6);
    expect([...struct.atoms.values()].every(atom => atom.neighbors.length === 2)).toBe(true);
    closure.inverseAction.perform(restruct);
    expect(graph(struct)).toEqual(before);
  });

  it('distinguishes cyclic and linear methyl growth and elongates cyclic growth at a secondary center', () => {
    const positions = (['methyl-linear', 'methyl-cyclic'] as const).map(kind => {
      const restruct = makeReStruct();
      const result = fromSelectedAtomSprout(restruct, [0], kind);
      return restruct.molecule.atoms.get(result.targetAtomId)!.pp;
    });
    expect(positions[0].y * positions[1].y).toBeLessThan(0);
    const secondary = makeReStruct(createFusionRing(6));
    const result = fromSelectedAtomSprout(secondary, [0], 'methyl-cyclic');
    expect(Vec2.dist(secondary.molecule.atoms.get(0)!.pp, secondary.molecule.atoms.get(result.targetAtomId)!.pp)).toBeCloseTo(1.5);
  });

  it('preflights invalid, grouped and query targets and blocked positions without chemical mutation', () => {
    const restruct = makeReStruct();
    const before = graph(restruct.molecule);
    for (const ids of [[], [99], [0, 1]]) {
      expect(() => fromSelectedAtomSprout(restruct, ids, 'phenyl')).toThrow();
      expect(graph(restruct.molecule)).toEqual(before);
    }
    expect(() => fromSelectedAtomSprout(restruct, [0], 'invalid' as AtomSproutKind)).toThrow(/不支持/);
    const atom = restruct.molecule.atoms.get(0)!;
    atom.sgs.add(8);
    expect(() => fromSelectedAtomSprout(restruct, [0], 'phenyl')).toThrow(/S-group/);
    atom.sgs.clear();
    atom.queryProperties.customQuery = '[#6]';
    expect(() => fromSelectedAtomSprout(restruct, [0], 'phenyl')).toThrow(/查询/);
    atom.queryProperties.customQuery = null;
    for (let i = 0; i < 36; i++) restruct.molecule.atoms.add(new Atom({ label: 'O', pp: new Vec2(Math.cos(i * Math.PI / 18), Math.sin(i * Math.PI / 18)) }));
    const crowded = graph(restruct.molecule);
    expect(() => fromSelectedAtomSprout(restruct, [0], 'methyl-linear')).toThrow(/重叠/);
    expect(graph(restruct.molecule)).toEqual(crowded);
  });
});
