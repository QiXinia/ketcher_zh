import { Pool } from 'ketcher-core';
import SGroupTool from './sgroup';

describe('S-group properties for a complete group selection', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [1, 2],
    [2, 1],
  ])('edits an existing SUP group with selection %j', (...atoms) => {
    const sgroups = new Pool();
    sgroups.set(7, { type: 'SUP', atoms: [1, 2] });
    const molecule = {
      sgroups,
      functionalGroups: new Map([[7, { relatedSGroup: sgroups.get(7) }]]),
      getGroupFromAtomId: () => undefined,
      getGroupFromBondId: () => undefined,
    };
    let selection = { atoms, bonds: [1] };
    const editor = {
      render: { ctab: { molecule } },
      selection: jest.fn((next) => {
        if (next !== undefined) selection = next;
        return selection;
      }),
      rotateController: { rerender: jest.fn() },
      update: jest.fn(),
      event: { removeFG: { dispatch: jest.fn() } },
    };
    const edit = jest
      .spyOn(SGroupTool, 'sgroupDialog')
      .mockResolvedValue(undefined);

    const tool = new SGroupTool(editor);

    expect(edit).toHaveBeenCalledWith(editor, 7);
    expect(editor.event.removeFG.dispatch).not.toHaveBeenCalled();
    expect(tool.isNotActiveTool).toBe(true);
  });
});
