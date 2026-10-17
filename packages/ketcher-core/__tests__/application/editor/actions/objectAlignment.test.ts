import {
  fromAlignObjects,
  fromDistributeObjects,
} from 'application/editor/actions/objectAlignment';
import { SimpleObjectMode } from 'domain/entities/simpleObject';
import { Vec2 } from 'domain/entities/vec2';

function createRestruct(lines: Array<Array<[number, number]>>) {
  const simpleObjects = new Map<number, any>();
  lines.forEach((points, id) => {
    simpleObjects.set(id, {
      mode: SimpleObjectMode.line,
      pos: points.map(([x, y]) => new Vec2(x, y)),
    });
  });
  const struct = {
    simpleObjects: {
      get: (id: number) => simpleObjects.get(id),
    },
  };
  const restruct: any = {
    molecule: struct,
    simpleObjects: new Map(
      [...simpleObjects.keys()].map((id) => [
        id,
        { visel: { translate: () => undefined } },
      ]),
    ),
    render: { options: {} },
  };
  return { restruct, simpleObjects };
}

describe('Native object alignment and distribution', () => {
  it('expands selected fragment IDs to their complete atom groups', () => {
    const atoms = new Map<number, any>([
      [0, { pp: new Vec2(0, 0), fragment: 0, sgs: [] }],
      [1, { pp: new Vec2(2, 0), fragment: 0, sgs: [] }],
      [2, { pp: new Vec2(10, 5), fragment: 1, sgs: [] }],
      [3, { pp: new Vec2(12, 5), fragment: 1, sgs: [] }],
    ]);
    const restruct: any = {
      molecule: { atoms, bonds: new Map(), sgroups: new Map() },
      atoms: new Map(
        [...atoms.keys()].map((id) => [
          id,
          { visel: { translate: () => undefined } },
        ]),
      ),
      bonds: new Map(),
      simpleObjects: new Map(),
      render: { options: {} },
    };

    fromAlignObjects(restruct, { frags: [0, 1] }, 'left');
    expect([...atoms.values()].map((atom) => atom.pp.x)).toEqual([0, 2, 0, 2]);
  });

  it('aligns selected drawing objects and restores them through undo', () => {
    const { restruct, simpleObjects } = createRestruct([
      [
        [0, 0],
        [2, 0],
      ],
      [
        [10, 5],
        [12, 5],
      ],
    ]);

    const inverse = fromAlignObjects(
      restruct,
      { simpleObjects: [0, 1] },
      'left',
    );
    expect(simpleObjects.get(0).pos.map((point) => [point.x, point.y])).toEqual(
      [
        [0, 0],
        [2, 0],
      ],
    );
    expect(simpleObjects.get(1).pos.map((point) => [point.x, point.y])).toEqual(
      [
        [0, 5],
        [2, 5],
      ],
    );

    inverse.perform(restruct);
    expect(simpleObjects.get(1).pos[0].x).toBe(10);
  });

  it('distributes three selected drawing objects evenly on the requested axis', () => {
    const { restruct, simpleObjects } = createRestruct([
      [
        [0, 0],
        [2, 0],
      ],
      [
        [10, 5],
        [14, 5],
      ],
      [
        [30, 0],
        [35, 0],
      ],
    ]);

    fromDistributeObjects(restruct, { simpleObjects: [0, 1, 2] }, 'horizontal');
    expect(simpleObjects.get(1).pos.map((point) => [point.x, point.y])).toEqual(
      [
        [14, 5],
        [18, 5],
      ],
    );
    const firstGap =
      simpleObjects.get(1).pos[0].x - simpleObjects.get(0).pos[1].x;
    const secondGap =
      simpleObjects.get(2).pos[0].x - simpleObjects.get(1).pos[1].x;
    expect(secondGap).toBe(firstGap);
  });
});
