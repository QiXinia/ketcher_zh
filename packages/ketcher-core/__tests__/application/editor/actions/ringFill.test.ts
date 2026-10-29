import { Atom } from 'domain/entities/atom';
import { Bond } from 'domain/entities/bond';
import { Struct } from 'domain/entities/struct';
import { Pile } from 'domain/entities/pile';
import { Vec2 } from 'domain/entities/vec2';
import {
  getLoopRing,
  findRingFill,
  isRingTopology,
} from 'domain/entities/ringFill';
import { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import { moleculeToKet } from 'domain/serializers/ket/toKet/moleculeToKet';
import {
  fromSelectedRingFill,
  fromRingFillClear,
} from 'application/editor/actions/ringFill';
import ReLoop from 'application/render/restruct/reloop';
import { LayerMap } from 'application/render/restruct/generalEnumTypes';

function ringStruct(aromatic = false) {
  const struct = new Struct();
  for (let index = 0; index < 6; index++) {
    const angle = (index * Math.PI) / 3;
    struct.atoms.add(
      new Atom({ label: 'C', pp: new Vec2(Math.cos(angle), Math.sin(angle)) }),
    );
  }
  for (let index = 0; index < 6; index++) {
    struct.bonds.add(
      new Bond({ begin: index, end: (index + 1) % 6, type: aromatic ? 4 : 1 }),
    );
  }
  struct.markFragments();
  struct.prepareLoopStructure();
  return struct;
}

function restructuring(struct: Struct) {
  return { molecule: struct, markItemRemoved: jest.fn() } as any;
}

describe('ring fill topology, history and KET', () => {
  it.each([false, true])(
    'fills a complete ring and preserves chemical fields (aromatic=%s)',
    (aromatic) => {
      const struct = ringStruct(aromatic);
      const before = [...struct.bonds.values()].map((bond) => [
        bond.type,
        bond.stereo,
      ]);
      const restruct = restructuring(struct);
      const result = fromSelectedRingFill(
        restruct,
        { atoms: [...struct.atoms.keys()] },
        '#A5D6A7',
      );
      expect(result.ringCount).toBe(1);
      const undo = result.action.perform(restruct);
      expect(struct.ringFills.size).toBe(1);
      expect([...struct.ringFills.values()][0].color).toBe('#a5d6a7');
      expect(
        [...struct.bonds.values()].map((bond) => [bond.type, bond.stereo]),
      ).toEqual(before);
      const redo = undo.perform(restruct);
      expect(struct.ringFills.size).toBe(0);
      redo.perform(restruct);
      expect(struct.ringFills.size).toBe(1);
      expect(restruct.markItemRemoved).toHaveBeenCalledTimes(3);
    },
  );

  it('rejects a partial ring, open chain and invalid color', () => {
    const struct = ringStruct();
    const restruct = restructuring(struct);
    expect(() =>
      fromSelectedRingFill(restruct, { atoms: [0, 1] }, '#ff0000'),
    ).toThrow('完整选择');
    expect(() =>
      fromSelectedRingFill(restruct, { bonds: [0] }, '#ff0000'),
    ).toThrow('完整选择');
    expect(() =>
      fromSelectedRingFill(restruct, { atoms: [0, 1] }, 'red'),
    ).toThrow('六位');
    struct.bonds.delete(0);
    expect(() =>
      fromSelectedRingFill(
        restruct,
        { atoms: [...struct.atoms.keys()] },
        '#ff0000',
      ),
    ).toThrow('完整选择');
    expect(struct.ringFills.size).toBe(0);
  });

  it('updates the same ring in place, skips identical colors, and undoes selected removal', () => {
    const struct = ringStruct();
    const restruct = restructuring(struct);
    const selection = { bonds: [...struct.bonds.keys()] };
    fromSelectedRingFill(restruct, selection, '#ff0000').action.perform(
      restruct,
    );
    const recolor = fromSelectedRingFill(restruct, selection, '#0000ff');
    expect(struct.ringFills.size).toBe(1);
    const undoRecolor = recolor.action.perform(restruct);
    expect([...struct.ringFills.values()][0].color).toBe('#0000ff');
    undoRecolor.perform(restruct);
    expect([...struct.ringFills.values()][0].color).toBe('#ff0000');
    expect(
      fromSelectedRingFill(restruct, selection, '#ff0000').action.operations,
    ).toHaveLength(0);
    const removed = fromSelectedRingFill(restruct, selection);
    const undoRemoval = removed.action.perform(restruct);
    expect(struct.ringFills.size).toBe(0);
    undoRemoval.perform(restruct);
    expect([...struct.ringFills.values()][0].color).toBe('#ff0000');
    const clear = fromRingFillClear(restruct);
    const undoClear = clear.perform(restruct);
    expect(struct.ringFills.size).toBe(0);
    undoClear.perform(restruct);
    expect(struct.ringFills.size).toBe(1);
  });

  it('gives adjacent fused rings independent colors', () => {
    const struct = new Struct();
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [2, 0],
      [2, 1],
    ].forEach(([x, y]) => {
      struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(x, y) }));
    });
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [1, 4],
      [4, 5],
      [5, 2],
    ].forEach(([begin, end]) => {
      struct.bonds.add(new Bond({ begin, end, type: 1 }));
    });
    struct.prepareLoopStructure();
    expect(struct.loops.size).toBe(2);
    const restruct = restructuring(struct);
    fromSelectedRingFill(
      restruct,
      { atoms: [0, 1, 2, 3] },
      '#ff0000',
    ).action.perform(restruct);
    fromSelectedRingFill(
      restruct,
      { atoms: [1, 2, 4, 5] },
      '#0000ff',
    ).action.perform(restruct);
    const colors = [...struct.loops.values()].map((loop) => {
      const ring = getLoopRing(struct, loop)!;
      return findRingFill(struct.ringFills.values(), ring.atoms, ring.bonds)
        ?.color;
    });
    expect(colors.sort()).toEqual(['#0000ff', '#ff0000']);
  });

  it('round-trips two molecules and remaps fills in clone/merge, dropping partial rings', () => {
    const first = ringStruct();
    fromSelectedRingFill(
      restructuring(first),
      { atoms: [...first.atoms.keys()] },
      '#ff0000',
    ).action.perform(restructuring(first));
    const second = ringStruct(true);
    fromSelectedRingFill(
      restructuring(second),
      { bonds: [...second.bonds.keys()] },
      '#0000ff',
    ).action.perform(restructuring(second));
    second.atoms.forEach((atom) => {
      atom.pp = atom.pp.add(new Vec2(4, 0));
    });
    second.mergeInto(first);
    first.markFragments();
    const serializer = new KetSerializer();
    const ket = serializer.serializeMicromolecules(first);
    const reopened = serializer.deserializeMicromolecules(ket);
    expect(reopened.ringFills.size).toBe(2);
    expect(
      [...reopened.ringFills.values()].every((fill) =>
        isRingTopology(reopened, fill),
      ),
    ).toBe(true);
    expect(first.clone(new Pile([0, 1, 2])).ringFills.size).toBe(0);
    const clone = first.clone();
    expect(clone.ringFills.size).toBe(2);
    clone.ringFills.values().next().value!.atoms.pop();
    expect(first.ringFills.values().next().value!.atoms).toHaveLength(6);
  });

  it('serializes sparse IDs as molecule array indices', () => {
    const struct = ringStruct();
    fromSelectedRingFill(
      restructuring(struct),
      { atoms: [...struct.atoms.keys()] },
      '#ff0000',
    ).action.perform(restructuring(struct));
    const target = new Struct();
    for (let index = 0; index < 10; index++) {
      target.atoms.newId();
      target.bonds.newId();
    }
    struct.mergeInto(target);
    expect(moleculeToKet(target).ringFills![0].atoms.slice().sort()).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(moleculeToKet(target).ringFills![0].bonds.slice().sort()).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
  });

  it('does not render or retain a fill after deleting a ring bond; restoration matches again', () => {
    const struct = ringStruct();
    fromSelectedRingFill(
      restructuring(struct),
      { atoms: [...struct.atoms.keys()] },
      '#ff0000',
    ).action.perform(restructuring(struct));
    const loop = [...struct.loops.values()][0];
    const deleted = struct.bonds.get(0)!;
    struct.bonds.delete(0);
    expect(getLoopRing(struct, loop)).toBeNull();
    expect(struct.clone().ringFills.size).toBe(0);
    struct.bonds.set(0, deleted);
    expect(getLoopRing(struct, loop)).not.toBeNull();
  });

  it.each([false, true])(
    'renders a filled polygon under atom/bond layers (aromatic=%s)',
    (aromatic) => {
      const struct = ringStruct(aromatic);
      const loop = [...struct.loops.values()][0];
      fromSelectedRingFill(
        restructuring(struct),
        { atoms: [...struct.atoms.keys()] },
        '#ff0000',
      ).action.perform(restructuring(struct));
      const attributes: any[] = [];
      const shape = () => ({
        node: { setAttribute: jest.fn() },
        attr: (attr: any) => {
          attributes.push(attr);
          return shape();
        },
      });
      const restruct: any = {
        molecule: struct,
        atoms: new Map([...struct.atoms].map(([id, a]) => [id, { a }])),
        bonds: new Map([...struct.bonds].map(([id, b]) => [id, { b }])),
        getBondEndpoint: (id: number) => ({ a: struct.atoms.get(id) }),
        render: { paper: { path: jest.fn(shape), circle: jest.fn(shape) } },
        addReObjectPath: jest.fn(),
      };
      new ReLoop(loop).show(restruct, 0, {
        microModeScale: 40,
        bondSpace: 4,
        lineattr: { 'stroke-width': 1 },
        aromaticCircle: true,
      } as any);
      expect(attributes).toContainEqual(
        expect.objectContaining({ fill: '#ff0000', stroke: 'none' }),
      );
      expect(restruct.addReObjectPath.mock.calls[0][0]).toBe(LayerMap.ringFill);
    },
  );
});
