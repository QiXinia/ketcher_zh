import { prepareDataAttachment } from './dataAttachment';

function makeEditor(selection, groups = new Map()) {
  const atoms = new Map([
    [1, { fragment: 0 }],
    [2, { fragment: 0 }],
    [3, { fragment: 1 }],
  ]);
  const bonds = new Map([[9, { begin: 1, end: 2 }]]);
  return {
    render: { ctab: { molecule: { atoms, bonds, sgroups: groups } } },
    selection: jest.fn(() => selection),
  } as any;
}

function dataGroup(atoms, fieldName = 'Source') {
  return { type: 'DAT', atoms, data: { fieldName } } as any;
}

describe('prepareDataAttachment', () => {
  it('collects both endpoints when a bond is selected without changing selection', () => {
    const editor = makeEditor({ bonds: [9] });

    expect(prepareDataAttachment(editor, false)).toEqual({
      id: null,
      selection: { atoms: [1, 2], bonds: [9] },
    });
    expect(editor.selection).toHaveBeenCalledTimes(1);
  });

  it('resolves a directly selected DAT group and ignores Indigo CIP data', () => {
    const groups = new Map([
      [4, dataGroup([1, 2])],
      [5, dataGroup([1], 'INDIGO_CIP_DESC')],
    ]);
    const editor = makeEditor({ sgroupData: [4] }, groups);

    expect(prepareDataAttachment(editor, true)).toEqual({
      id: 4,
      selection: { atoms: [1, 2], bonds: [] },
    });
  });

  it('rejects ambiguous atom matches instead of overwriting one annotation', () => {
    const groups = new Map([
      [4, dataGroup([1, 2])],
      [5, dataGroup([2, 1], 'Other')],
    ]);
    const editor = makeEditor({ atoms: [1, 2] }, groups);

    expect(() => prepareDataAttachment(editor, true)).toThrow('多个数据标注');
  });

  it('rejects an internal-only data group as an editable target', () => {
    const groups = new Map([[5, dataGroup([1], 'INDIGO_CIP_DESC')]]);
    const editor = makeEditor({ sgroupData: [5] }, groups);

    expect(() => prepareDataAttachment(editor, true)).toThrow('没有附加数据');
  });

  it('does not reinterpret a selected non-DAT group as a DAT target', () => {
    const groups = new Map([[6, { type: 'SUP', atoms: [1], data: {} }]]);
    const editor = makeEditor({ sgroups: [6] }, groups);

    expect(() => prepareDataAttachment(editor, true)).toThrow('没有附加数据');
  });
});
