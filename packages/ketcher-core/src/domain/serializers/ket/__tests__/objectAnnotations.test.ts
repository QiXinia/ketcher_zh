import { KetSerializer } from '../ketSerializer';

describe('object annotations in KET', () => {
  it('round-trips molecule and drawing object annotations', () => {
    const serializer = new KetSerializer();
    const source = {
      ket_version: '2.0.0',
      root: {
        nodes: [
          { $ref: 'mol0' },
          {
            type: 'simpleObject',
            data: {
              mode: 'line',
              pos: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              annotations: [{ keyword: 'Source', content: 'curve' }],
            },
          },
        ],
      },
      mol0: {
        type: 'molecule',
        atoms: [
          { label: 'C', location: [0, 0], annotations: [{ keyword: 'Name', content: 'carbon' }] },
          { label: 'O', location: [1, 0] },
        ],
        bonds: [
          { atoms: [0, 1], type: 1, annotations: [{ keyword: 'Comment', content: 'single bond' }] },
        ],
      },
    };

    const struct = serializer.deserializeMicromolecules(JSON.stringify(source));
    expect(struct.atoms.get(0)?.annotations).toEqual([{ keyword: 'Name', content: 'carbon' }]);
    expect(struct.bonds.get(0)?.annotations).toEqual([{ keyword: 'Comment', content: 'single bond' }]);
    expect(struct.simpleObjects.get(0)?.annotations).toEqual([{ keyword: 'Source', content: 'curve' }]);

    const roundTrip = JSON.parse(serializer.serializeMicromolecules(struct));
    expect(roundTrip.mol0.atoms[0].annotations).toEqual(source.mol0.atoms[0].annotations);
    expect(roundTrip.mol0.bonds[0].annotations).toEqual(source.mol0.bonds[0].annotations);
    expect(roundTrip.root.nodes[1]!.data!.annotations).toEqual(source.root.nodes[1]!.data!.annotations);
  });
});
