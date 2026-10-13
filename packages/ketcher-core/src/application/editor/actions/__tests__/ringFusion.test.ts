/** @jest-environment node */
import { Atom } from 'domain/entities/atom';
import { Bond } from 'domain/entities/bond';
import { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import ReStruct from 'application/render/restruct/restruct';
import type { Render } from 'application/render';
import { createFusionRing, fromSelectedRingFusion, type RingFusionKind } from '../ringFusion';

function makeReStruct(struct = new Struct()) {
  if (!struct.atoms.size) {
    struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, 0) }));
    struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(1, 0) }));
    struct.bonds.add(new Bond({ begin: 0, end: 1, type: 1 }));
  }
  struct.initHalfBonds();
  struct.initNeighbors();
  struct.markFragments();
  struct.setImplicitHydrogen();
  // Only the drawing shell is replaced. Struct, ReStruct, operations and
  // inverse actions are real, including neighbors and connected components.
  const layer = { attr() { return this; }, toFront() { return this; } };
  const restruct = new ReStruct(struct, {
    paper: { rect: () => layer }, options: {},
  } as unknown as Render);
  restruct.assignConnectedComponents();
  restruct.visibleAtoms = new Map(restruct.atoms);
  return restruct;
}

const serialize = (struct: Struct) => new KetSerializer().serializeMicromolecules(struct);
const graph = (struct: Struct) => ({
  atoms: [...struct.atoms.entries()].sort(([a], [b]) => a - b).map(([id, atom]) => ({
    id, label: atom.label, isotope: atom.isotope, charge: atom.charge,
    aam: atom.aam, fragment: atom.fragment, implicitH: atom.implicitH,
    x: atom.pp.x, y: atom.pp.y,
  })),
  bonds: [...struct.bonds.entries()].sort(([a], [b]) => a - b).map(([id, bond]) => ({
    id, begin: bond.begin, end: bond.end, type: bond.type, stereo: bond.stereo,
    display: bond.display, doubleBondPosition: bond.doubleBondPosition,
  })),
});

describe('selection-level ChemDraw ring fusion', () => {
  it.each([3, 4, 5, 6, 7, 8] as const)('fuses a %s-member carbon ring with one shared edge and reverses the real action', (size) => {
    const restruct = makeReStruct();
    const before = serialize(restruct.molecule);
    const [undo, added] = fromSelectedRingFusion(restruct, [0], size);
    const struct = restruct.molecule;
    expect(added.atoms).toHaveLength(size - 2);
    expect(added.bonds).toHaveLength(size - 1);
    expect(struct.atoms.size).toBe(size);
    expect(struct.bonds.size).toBe(size);
    struct.atoms.forEach((atom) => {
      expect(atom.neighbors).toHaveLength(2);
      expect(atom.fragment).toBe(struct.atoms.get(0)!.fragment);
    });
    const fused = graph(struct);
    const redo = undo.perform(restruct);
    expect(serialize(struct)).toBe(before);
    redo.perform(restruct);
    // Pool insertion order changes on redo; graph IDs and chemistry must not.
    expect(graph(struct)).toEqual(fused);
  });

  it.each(['benzene', 'cyclopentadiene'] as const)('preserves the conjugated bond pattern for %s and KET reopening', (kind) => {
    const restruct = makeReStruct();
    fromSelectedRingFusion(restruct, [0], kind);
    const restored = new KetSerializer().deserializeMicromolecules(serialize(restruct.molecule));
    expect(restored.atoms.size).toBe(kind === 'benzene' ? 6 : 5);
    expect([...restored.bonds.values()].filter(bond => bond.type === 2)).toHaveLength(kind === 'benzene' ? 3 : 2);
    expect([...restored.bonds.values()].every(bond => bond.type === 1 || bond.type === 2)).toBe(true);
  });

  it('creates distinct mirror chair projections with six carbons and no explicit H or stereo', () => {
    const projections = (['chair-left', 'chair-right'] as const).map(kind => {
      const restruct = makeReStruct();
      fromSelectedRingFusion(restruct, [0], kind);
      const struct = restruct.molecule;
      expect(struct.atoms.size).toBe(6);
      expect(struct.bonds.size).toBe(6);
      expect([...struct.atoms.values()].every(atom => atom.label === 'C')).toBe(true);
      expect([...struct.bonds.values()].every(bond => bond.type === 1 && !bond.stereo)).toBe(true);
      return [...struct.atoms.values()].map(atom => [Number(atom.pp.x.toFixed(4)), Number(atom.pp.y.toFixed(4))]);
    });
    expect(projections[0]).not.toEqual(projections[1]);
    expect(projections[0]).not.toEqual([...createFusionRing(6).atoms.values()].map(atom => [atom.pp.x, atom.pp.y]));
  });

  it('retains heteroatom, isotope, charge, numbering and shared bond display through history and KET', () => {
    const restruct = makeReStruct();
    const struct = restruct.molecule;
    const atom = struct.atoms.get(0)!;
    Object.assign(atom, { label: 'N', isotope: 15, charge: 1, aam: 42 });
    Object.assign(struct.bonds.get(0)!, { display: 'bold', doubleBondPosition: 'left' });
    const properties = () => [atom.label, atom.isotope, atom.charge, atom.aam];
    const expected = properties();
    const [undo] = fromSelectedRingFusion(restruct, [0], 'benzene');
    expect(properties()).toEqual(expected);
    expect(struct.bonds.get(0)!.display).toBe('bold');
    expect(struct.bonds.get(0)!.doubleBondPosition).toBe('left');
    const restored = new KetSerializer().deserializeMicromolecules(serialize(struct));
    expect(restored.atoms.get(0)!.label).toBe('N');
    expect(restored.atoms.get(0)!.isotope).toBe(15);
    expect(restored.atoms.get(0)!.charge).toBe(1);
    const redo = undo.perform(restruct);
    expect(properties()).toEqual(expected);
    redo.perform(restruct);
    expect(properties()).toEqual(expected);
    expect(struct.bonds.get(0)!.display).toBe('bold');
  });

  it('chooses the vacant side of an existing cycle, including atom and loop ID zero', () => {
    const restruct = makeReStruct(createFusionRing(6));
    const original = new Set(restruct.molecule.atoms.keys());
    const bond = restruct.molecule.bonds.get(0)!;
    const begin = restruct.molecule.atoms.get(bond.begin)!.pp;
    const end = restruct.molecule.atoms.get(bond.end)!.pp;
    const side = (point: Vec2) => Math.sign(Vec2.cross(Vec2.diff(end, begin), Vec2.diff(point, begin)));
    const originalSide = side(restruct.molecule.atoms.get(2)!.pp);
    fromSelectedRingFusion(restruct, [0], 6);
    expect(restruct.molecule.atoms.size).toBe(10);
    expect(restruct.molecule.bonds.size).toBe(11);
    restruct.molecule.atoms.forEach((atom, id) => {
      if (!original.has(id)) expect(side(atom.pp)).toBe(-originalSide);
    });
  });

  it('uses the actual fragment of endpoint zero when fragment zero is absent', () => {
    const struct = createFusionRing(3);
    struct.atoms.forEach(atom => { atom.fragment = 7; });
    const restruct = makeReStruct(struct);
    fromSelectedRingFusion(restruct, [0], 4);
    expect([...struct.atoms.values()].every(atom => atom.fragment === 7)).toBe(true);
  });

  it('rejects invalid targets, grouped atoms and two occupied placements without editing the document', () => {
    const restruct = makeReStruct();
    const before = serialize(restruct.molecule);
    for (const ids of [[], [99], [0, 1]]) {
      expect(() => fromSelectedRingFusion(restruct, ids, 6)).toThrow();
      expect(serialize(restruct.molecule)).toBe(before);
    }
    expect(() => fromSelectedRingFusion(restruct, [0], 'invalid' as RingFusionKind)).toThrow(/不支持/);
    restruct.molecule.bonds.get(0)!.type = 3;
    expect(() => fromSelectedRingFusion(restruct, [0], 6)).toThrow(/单键或双键/);
    restruct.molecule.bonds.get(0)!.type = 1;
    restruct.molecule.atoms.get(0)!.sgs.add(9);
    expect(() => fromSelectedRingFusion(restruct, [0], 6)).toThrow(/S-group/);
    restruct.molecule.atoms.get(0)!.sgs.clear();
    restruct.molecule.atoms.add(new Atom({ label: 'O', pp: new Vec2(0.5, Math.sqrt(3) / 2) }));
    restruct.molecule.atoms.add(new Atom({ label: 'O', pp: new Vec2(0.5, -Math.sqrt(3) / 2) }));
    const crowded = serialize(restruct.molecule);
    expect(() => fromSelectedRingFusion(restruct, [0], 3)).toThrow(/两侧/);
    expect(serialize(restruct.molecule)).toBe(crowded);
  });
});
