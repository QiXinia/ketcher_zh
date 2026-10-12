import { fromMoleculesInCircle } from 'application/editor/actions/layoutMoleculesInCircle';
import { Vec2 } from 'domain/entities/vec2';

function createRestruct() {
  const atomData = new Map([
    [0, { pp: new Vec2(0, 0), sgs: [] }],
    [1, { pp: new Vec2(2, 0), sgs: [] }],
    [2, { pp: new Vec2(20, 0), sgs: [] }],
    [3, { pp: new Vec2(22, 0), sgs: [] }],
  ]);
  const atoms = new Map(
    [...atomData.keys()].map((id) => [id, { visel: { translate: () => undefined } }]),
  );
  const restruct: any = {
    molecule: {
      atoms: atomData,
      bonds: new Map(),
      sgroups: { get: () => undefined },
      findConnectedComponents: () => [new Set([0, 1]), new Set([2, 3])],
    },
    atoms,
    bonds: new Map(),
    render: { options: {} },
  };
  return { restruct, atomData };
}

describe('ChemScript circular molecule layout', () => {
  it('moves disconnected components to distinct points on a circle and can undo', () => {
    const { restruct, atomData } = createRestruct();
    const inverse = fromMoleculesInCircle(restruct);

    const firstCenter = Vec2.centre(atomData.get(0)!.pp, atomData.get(1)!.pp);
    const secondCenter = Vec2.centre(atomData.get(2)!.pp, atomData.get(3)!.pp);
    expect(firstCenter.y).not.toBe(secondCenter.y);
    expect(Vec2.dist(firstCenter, secondCenter)).toBeGreaterThan(0);

    inverse.perform(restruct);
    expect(atomData.get(0)!.pp.x).toBe(0);
    expect(atomData.get(2)!.pp.x).toBe(20);
  });

  it('leaves an empty or single-component document unchanged', () => {
    const { restruct, atomData } = createRestruct();
    restruct.molecule.findConnectedComponents = () => [new Set([0, 1, 2, 3])];
    fromMoleculesInCircle(restruct);
    expect(atomData.get(0)!.pp).toEqual(new Vec2(0, 0));
    expect(atomData.get(3)!.pp).toEqual(new Vec2(22, 0));
  });
});
