import { DocumentAnnotationsSet } from '../DocumentAnnotationsSet';

describe('DocumentAnnotationsSet', () => {
  it('swaps annotation arrays for undo and redo', () => {
    const restruct = {
      molecule: {
        annotations: [{ keyword: 'Name', content: 'Before' }],
      },
    } as any;
    const operation = new DocumentAnnotationsSet([
      { keyword: 'Comment', content: 'After' },
    ]);

    operation.execute(restruct);
    expect(restruct.molecule.annotations).toEqual([
      { keyword: 'Comment', content: 'After' },
    ]);

    const inverse = operation.invert();
    inverse.execute(restruct);
    expect(restruct.molecule.annotations).toEqual([
      { keyword: 'Name', content: 'Before' },
    ]);
    expect(inverse.invert().data.annotations).toEqual([
      { keyword: 'Comment', content: 'After' },
    ]);
  });
});
