/** @jest-environment node */
import { Atom } from 'domain/entities/atom';
import { Bond } from 'domain/entities/bond';
import { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import { nextChemicalHotspot, validateChemicalHotspot, type ChemicalHotspot, type HotspotDirection } from '../hotspot';

function molecule(points: number[][], edges: number[][]) {
  const struct = new Struct();
  points.forEach(([x, y]) => struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(x, y) })));
  edges.forEach(([begin, end]) => struct.bonds.add(new Bond({ begin, end, type: 1 })));
  struct.prepareLoopStructure();
  struct.markFragments();
  struct.setImplicitHydrogen();
  return struct;
}
const atom = (id: number): ChemicalHotspot => ({ map: 'atoms', id });
const bond = (id: number): ChemicalHotspot => ({ map: 'bonds', id });

describe('ChemDraw chemical hotspot navigation', () => {
  it('walks atom to bond to atom, reverses, and leaves all KET data intact', () => {
    const struct = molecule([[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 2]]);
    Object.assign(struct.atoms.get(0)!, { label: 'N', isotope: 15, charge: 1, aam: 7 });
    const serializer = new KetSerializer();
    const before = serializer.serializeMicromolecules(struct);
    let current: ChemicalHotspot | null = atom(0);
    for (const expected of [bond(0), atom(1), bond(1), atom(2), atom(2)]) {
      current = nextChemicalHotspot(struct, current, 'right');
      expect(current).toEqual(expected);
    }
    for (const expected of [bond(1), atom(1), bond(0), atom(0), atom(0)]) {
      current = nextChemicalHotspot(struct, current, 'left');
      expect(current).toEqual(expected);
    }
    expect(serializer.serializeMicromolecules(struct)).toBe(before);
  });

  it.each([
    ['right', 0], ['left', 1], ['up', 2], ['down', 3],
  ] as const)('picks the incident bond in the %s direction with screen-aligned coordinates', (direction, id) => {
    const struct = molecule([[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1]], [[0, 1], [0, 2], [0, 3], [0, 4]]);
    expect(nextChemicalHotspot(struct, atom(0), direction)).toEqual(bond(id));
  });

  it('chooses angle before distance and uses stable IDs to break symmetric ties', () => {
    const struct = molecule([[0, 0], [4, 0], [0.2, 0.2], [4, 0]], [[0, 1], [0, 2], [0, 3]]);
    expect(nextChemicalHotspot(struct, atom(0), 'right')).toEqual(bond(0));
  });

  it('does not jump to a disconnected fragment or change an isolated atom', () => {
    const struct = molecule([[0, 0], [1, 0], [2, 0]], [[0, 1]]);
    expect(nextChemicalHotspot(struct, atom(1), 'right')).toEqual(atom(1));
    expect(nextChemicalHotspot(struct, atom(2), 'left')).toEqual(atom(2));
  });

  it('initializes from a stable visible atom and skips hidden collapsed-group geometry', () => {
    const struct = molecule([[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 2]]);
    const visible = (spot: ChemicalHotspot) => spot.id !== 0;
    expect(nextChemicalHotspot(struct, null, 'right', visible)).toEqual(atom(1));
    expect(nextChemicalHotspot(struct, atom(1), 'left', visible)).toEqual(atom(1));
    expect(nextChemicalHotspot(struct, atom(1), 'right', visible)).toEqual(bond(1));
    expect(nextChemicalHotspot(struct, null, 'right', () => false)).toBeNull();
  });

  it('handles empty structures, deleted targets and zero-length geometry without NaN or stale IDs', () => {
    expect(nextChemicalHotspot(new Struct(), null, 'right')).toBeNull();
    const struct = molecule([[0, 0], [0, 0]], [[0, 1]]);
    expect(nextChemicalHotspot(struct, atom(0), 'right')).toEqual(atom(0));
    expect(nextChemicalHotspot(struct, atom(9), 'right')).toEqual(atom(0));
    expect(() => nextChemicalHotspot(struct, null, 'invalid' as HotspotDirection)).toThrow(/方向/);
  });

  it.each([null, {}, { map: 'texts', id: 0 }, { map: 'atoms', id: 99 }, { map: 'atoms', id: 0.5 }, { map: 'bonds', id: '0' }])('rejects invalid or nonchemical hover targets: %p', target => {
    expect(validateChemicalHotspot(molecule([[0, 0], [1, 0]], [[0, 1]]), target)).toBeNull();
  });

  it('accepts ID zero, returns a detached target, and rejects dangling bonds', () => {
    const struct = molecule([[0, 0], [1, 0]], [[0, 1]]);
    const source = atom(0);
    expect(validateChemicalHotspot(struct, source)).toEqual(source);
    expect(validateChemicalHotspot(struct, source)).not.toBe(source);
    expect(validateChemicalHotspot(struct, bond(0))).toEqual(bond(0));
    struct.atoms.delete(1);
    expect(validateChemicalHotspot(struct, bond(0))).toBeNull();
  });
});
