import { ObjectAnnotationsSet } from '../ObjectAnnotationsSet';

describe('ObjectAnnotationsSet', () => {
  it('restores each selected object independently on undo and redo', () => {
    const atom = { annotations: [{ keyword: 'Name', content: 'Atom' }] };
    const bond = { annotations: [{ keyword: 'Name', content: 'Bond' }] };
    const restruct = {
      molecule: { atoms: new Map([[1, atom]]), bonds: new Map([[2, bond]]) },
      atoms: new Map(),
      bonds: new Map(),
      markItem: jest.fn(),
      markAtom: jest.fn(),
    } as any;
    const operation = new ObjectAnnotationsSet(
      [
        { mapName: 'atoms', id: 1 },
        { mapName: 'bonds', id: 2 },
      ],
      [{ keyword: 'Comment', content: 'Shared' }],
    );

    operation.execute(restruct);
    expect(atom.annotations).toEqual([{ keyword: 'Comment', content: 'Shared' }]);
    expect(bond.annotations).toEqual([{ keyword: 'Comment', content: 'Shared' }]);

    const inverse = operation.invert();
    inverse.execute(restruct);
    expect(atom.annotations).toEqual([{ keyword: 'Name', content: 'Atom' }]);
    expect(bond.annotations).toEqual([{ keyword: 'Name', content: 'Bond' }]);

    const redo = inverse.invert();
    redo.execute(restruct);
    expect(atom.annotations).toEqual([{ keyword: 'Comment', content: 'Shared' }]);
    expect(bond.annotations).toEqual([{ keyword: 'Comment', content: 'Shared' }]);
  });

  it('checks per-target values when an inverse carries mixed annotations', () => {
    const atom = { annotations: [{ keyword: 'Atom', content: 'old' }] };
    const bond = { annotations: [{ keyword: 'Bond', content: 'old' }] };
    const restruct = {
      molecule: { atoms: new Map([[1, atom]]), bonds: new Map([[2, bond]]) },
      atoms: new Map(),
      bonds: new Map(),
      markItem: jest.fn(),
      markAtom: jest.fn(),
    } as any;
    const operation = new ObjectAnnotationsSet(
      [
        { mapName: 'atoms', id: 1 },
        { mapName: 'bonds', id: 2 },
      ],
      [],
    );
    operation.data.annotationsByTarget = [
      [{ keyword: 'Atom', content: 'new' }],
      [{ keyword: 'Bond', content: 'new' }],
    ];
    atom.annotations = [{ keyword: 'Atom', content: 'new' }];
    bond.annotations = [{ keyword: 'Bond', content: 'new' }];
    expect(operation.isDummy(restruct)).toBe(true);
    bond.annotations = [{ keyword: 'Atom', content: 'new' }];
    expect(operation.isDummy(restruct)).toBe(false);
  });
});
