/** @jest-environment node */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Atom } from 'domain/entities/atom';
import { Bond } from 'domain/entities/bond';
import { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import { Highlight } from 'domain/entities/highlight';
import { RingFill } from 'domain/entities/ringFill';
import { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import ReStruct from 'application/render/restruct/restruct';
import { fromSgroupAddition } from '../sgroup';
import { captureStructureLabel, fromContractStructureLabel, fromSelectedStructureLabelState, getStructureLabelAtoms } from '../structureLabels';

const serialize = (struct: Struct) => new KetSerializer().serializeMicromolecules(struct);
const chemicalGraph = (struct: Struct) => {
  const attributes = (item: object, excluded: string[]) => JSON.parse(JSON.stringify(
    Object.fromEntries(Object.entries(item).filter(([key]) => !excluded.includes(key))),
  ));
  return {
    atoms: [...struct.atoms].sort(([a], [b]) => a - b).map(([id, atom]) => [id, attributes(atom, ['sgs'])]),
    bonds: [...struct.bonds].sort(([a], [b]) => a - b).map(([id, bond]) => [id, attributes(bond, [])]),
    highlights: [...struct.highlights], ringFills: [...struct.ringFills],
  };
};
function fixture(struct = new Struct()) {
  if (!struct.atoms.size) {
    [
      { label: 'C', pp: new Vec2(-1, 0) },
      { label: 'C', isotope: 13, aam: 7, pp: new Vec2() },
      { label: 'O', charge: -1, pp: new Vec2(1, 0) },
      { label: 'N', isotope: 15, pp: new Vec2(5, 0) },
    ].forEach(attrs => struct.atoms.add(new Atom(attrs)));
    struct.bonds.add(new Bond({ begin: 0, end: 1, type: 1, stereo: 1 }));
    struct.bonds.add(new Bond({ begin: 1, end: 2, type: 1 }));
    struct.highlights.add(new Highlight({ atoms: [1, 2], bonds: [1], color: '#ff0000', rgroupAttachmentPoints: [] }));
  }
  struct.prepareLoopStructure();
  struct.markFragments();
  struct.setImplicitHydrogen();
  const layer = { attr() { return this; }, toFront() { return this; } };
  const render: any = { paper: { rect: () => layer }, options: {}, update: jest.fn() };
  const restruct = new ReStruct(struct, render);
  restruct.assignConnectedComponents();
  render.ctab = restruct;
  return { struct, restruct, render };
}
function contract(f: ReturnType<typeof fixture>, atoms = [1, 2], name = 'My fragment') {
  return fromContractStructureLabel(f.restruct, name, captureStructureLabel(f.struct, { atoms }));
}
function visible(f: ReturnType<typeof fixture>) {
  f.restruct.recalculateVisibleAtomsAndBonds();
  return { atoms: [...f.restruct.visibleAtoms.keys()], bonds: [...f.restruct.visibleBonds.keys()] };
}
const ts = require(path.resolve(__dirname, '../../../../../../../node_modules/typescript/lib/typescript.js')) as typeof import('typescript');
const editorSource = readFileSync(path.resolve(__dirname, '../../../../../../ketcher-react/src/script/editor/Editor.ts'), 'utf8');
const methods = editorSource.slice(editorSource.indexOf('  captureContractLabel()'), editorSource.indexOf('  fuseRingOnSelectedBond'));
const editorJS = ts.transpileModule(`class LabelEditor { ${methods} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function editorFixture() {
  const f = fixture();
  const context = { captureStructureLabel, fromContractStructureLabel, fromSelectedStructureLabelState };
  const Editor = new Function(...Object.keys(context), `${editorJS}; return LabelEditor`)(...Object.values(context));
  const editor = new Editor();
  let selection: any = { atoms: [1, 2] };
  const history: any[] = [];
  Object.assign(editor, {
    struct: () => f.struct, render: f.render,
    selection: (value?: any) => { if (value !== undefined) selection = value; return selection; },
    update: (action: any) => history.push(action), rotateController: { rerender: jest.fn() },
  });
  return { ...f, editor, history };
}

describe('document structure labels', () => {
  it('captures a separate preview without modifying chemistry, selection or history', () => {
    const f = editorFixture();
    const before = serialize(f.struct);
    const draft = f.editor.captureContractLabel();
    expect(draft.atomIds).toEqual([1, 2]);
    expect(draft.label).toBe('');
    expect(new KetSerializer().deserializeMicromolecules(draft.previewKet).atoms.size).toBe(2);
    expect(serialize(f.struct)).toBe(before);
    expect(f.editor.selection()).toEqual({ atoms: [1, 2] });
    expect(f.history).toHaveLength(0);
  });

  it('creates a reversible SUP, retaining every chemical attribute, wedge bond, ID and coordinate', () => {
    const f = fixture();
    const before = serialize(f.struct);
    const graph = chemicalGraph(f.struct);
    const result = contract(f);
    const group = f.struct.sgroups.get(result.groupId)!;
    expect(group.data).toMatchObject({ name: 'My fragment', expanded: false });
    expect(group.atoms).toEqual([1, 2]);
    expect(group.getAttachmentAtomId()).toBe(1);
    expect(f.struct.functionalGroups.size).toBe(1);
    expect(chemicalGraph(f.struct)).toEqual(graph);
    expect(visible(f)).toEqual({ atoms: [0, 1, 3], bonds: [0] });
    const contracted = serialize(f.struct);
    const redo = result.inverseAction.perform(f.restruct);
    expect(serialize(f.struct)).toBe(before);
    expect(f.struct.functionalGroups.size).toBe(0);
    expect(f.struct.sGroupForest.getSGroupsBFS()).toEqual([]);
    redo.perform(f.restruct);
    expect(serialize(f.struct)).toBe(contracted);
    expect(f.struct.functionalGroups.size).toBe(1);
    expect(f.struct.sGroupForest.getSGroupsBFS()).toEqual([result.groupId]);
  });

  it('reopens a contracted label with isotope, charge, mapping and complete external chemistry', () => {
    const f = fixture();
    contract(f);
    const restored = fixture(new KetSerializer().deserializeMicromolecules(serialize(f.struct)));
    const group = [...restored.struct.sgroups.values()][0];
    expect(group.data.name).toBe('My fragment');
    expect(group.isExpanded()).toBe(false);
    // KET remaps disconnected fragments; verify chemical endpoints, not pool
    // numbering from the previous in-memory document.
    expect([...restored.struct.atoms.values()].find(a => a.isotope === 13)).toMatchObject({ aam: 7 });
    expect([...restored.struct.atoms.values()].find(a => a.label === 'O')?.charge).toBe(-1);
    const wedge = [...restored.struct.bonds.values()].find(b => b.stereo === 1)!;
    expect(restored.struct.atoms.get(wedge.end)?.isotope).toBe(13);
    expect(restored.struct.atoms.get(wedge.begin)?.label).toBe('C');
    fromSelectedStructureLabelState(restored.restruct, { sgroups: [group.id] }, true);
    expect(visible(restored).atoms).toHaveLength(4);
    expect(visible(restored).bonds).toHaveLength(2);
  });

  it('uses captured atom IDs when selection changes and records one history entry; repeats are no-ops', () => {
    const f = editorFixture();
    const draft = f.editor.captureContractLabel();
    f.editor.selection({ atoms: [3] });
    expect(f.editor.contractStructureLabel('  A local label  ', draft)).toBe(1);
    const group = [...f.struct.sgroups.values()][0];
    expect(group.data.name).toBe('A local label');
    expect(group.atoms).toEqual([1, 2]);
    expect(f.history).toHaveLength(1);
    const same = f.editor.captureContractLabel();
    expect(same.label).toBe('A local label');
    expect(f.editor.contractStructureLabel('A local label', same)).toBe(0);
    expect(f.history).toHaveLength(1);
    expect(f.editor.selection()).toEqual({ sgroups: [group.id] });
    expect(f.render.update).toHaveBeenCalledWith(true, null);
  });

  it('renames an existing expanded SUP in place and undoes both name and state', () => {
    const f = fixture();
    const first = contract(f);
    fromSelectedStructureLabelState(f.restruct, { sgroups: [first.groupId] }, true);
    const before = serialize(f.struct);
    const result = contract(f, [1, 2], 'New name');
    expect(result.groupId).toBe(first.groupId);
    expect(f.struct.sgroups.size).toBe(1);
    expect([...f.struct.functionalGroups.values()][0].name).toBe('New name');
    result.inverseAction.perform(f.restruct);
    expect(serialize(f.struct)).toBe(before);
  });

  it('expands and collapses a batch through one native history entry, preserving the graph', () => {
    const f = editorFixture();
    const first = contract(f);
    const second = contract(f, [3], 'Single N');
    const graph = chemicalGraph(f.struct);
    const before = serialize(f.struct);
    f.editor.selection({ sgroups: [first.groupId, second.groupId] });
    expect(f.editor.setSelectedStructureLabelsExpanded(true)).toBe(2);
    expect(f.history).toHaveLength(1);
    expect(visible(f)).toEqual({ atoms: [0, 1, 2, 3], bonds: [0, 1] });
    expect(chemicalGraph(f.struct)).toEqual(graph);
    expect(f.editor.setSelectedStructureLabelsExpanded(true)).toBe(0);
    expect(f.history).toHaveLength(1);
    const redo = f.history[0].perform(f.restruct);
    expect(serialize(f.struct)).toBe(before);
    redo.perform(f.restruct);
    expect(f.editor.setSelectedStructureLabelsExpanded(false)).toBe(2);
    expect(f.history).toHaveLength(2);
    expect(chemicalGraph(f.struct)).toEqual(graph);
  });

  it('resolves bonds, fragments and distinct functional-group pool IDs; stale IDs never select another group', () => {
    const f = fixture();
    expect(getStructureLabelAtoms(f.struct, { bonds: [1] })).toEqual([1, 2]);
    expect(getStructureLabelAtoms(f.struct, { frags: [f.struct.atoms.get(1)!.fragment] })).toEqual([0, 1, 2]);
    const result = contract(f);
    const fg = [...f.struct.functionalGroups.values()][0];
    f.struct.functionalGroups.delete(0);
    f.struct.functionalGroups.set(41, fg);
    expect(getStructureLabelAtoms(f.struct, { functionalGroups: [41] })).toEqual([1, 2]);
    expect(fromSelectedStructureLabelState(f.restruct, { functionalGroups: [41] }, true).groupIds).toEqual([result.groupId]);
    expect(() => getStructureLabelAtoms(f.struct, { functionalGroups: [result.groupId] })).toThrow('选区已失效');
  });

  it.each(['atoms', 'bonds', 'sgroups', 'functionalGroups', 'frags'] as const)('rejects stale %s before editing', map => {
    const f = fixture();
    const before = serialize(f.struct);
    expect(() => captureStructureLabel(f.struct, { [map]: [999] })).toThrow('选区已失效');
    expect(serialize(f.struct)).toBe(before);
  });

  it('rejects invalid labels and changed documents before adding objects or history', () => {
    const f = editorFixture();
    const draft = f.editor.captureContractLabel();
    const before = serialize(f.struct);
    for (const label of ['', '  ', 'x'.repeat(81), 'A\nB', 'A\u0000B']) {
      expect(() => f.editor.contractStructureLabel(label, draft)).toThrow('1–80');
      expect(serialize(f.struct)).toBe(before);
    }
    f.struct.atoms.get(0)!.charge = 1;
    const changed = serialize(f.struct);
    expect(() => f.editor.contractStructureLabel('Label', draft)).toThrow('文档已变化');
    expect(serialize(f.struct)).toBe(changed);
    expect(f.history).toHaveLength(0);
  });

  it('rejects disconnected, partial-group, multiple-boundary and empty selections without side effects', () => {
    const f = fixture();
    expect(() => captureStructureLabel(f.struct, null)).toThrow('先选择');
    expect(() => captureStructureLabel(f.struct, { atoms: [1, 3] })).toThrow('相连');
    contract(f);
    const before = serialize(f.struct);
    expect(() => captureStructureLabel(f.struct, { atoms: [1] })).toThrow('完整的 S-group');
    expect(serialize(f.struct)).toBe(before);
    const g = fixture();
    g.struct.bonds.add(new Bond({ begin: 2, end: 3, type: 1 }));
    expect(() => captureStructureLabel(g.struct, { atoms: [1, 2] })).toThrow('多个外接原子');
    expect(g.struct.sgroups.size).toBe(0);
  });

  it('validates every target before a batch collapse, including unnamed and multi-boundary groups', () => {
    const f = fixture();
    const first = contract(f);
    const second = contract(f, [3], 'Other');
    const selection = { sgroups: [first.groupId, second.groupId] };
    fromSelectedStructureLabelState(f.restruct, selection, true);
    f.struct.sgroups.get(second.groupId)!.data.name = '';
    const before = serialize(f.struct);
    expect(() => fromSelectedStructureLabelState(f.restruct, selection, false)).toThrow('没有名称');
    expect(serialize(f.struct)).toBe(before);
    f.struct.sgroups.get(second.groupId)!.data.name = 'Other';
    f.struct.bonds.add(new Bond({ begin: 2, end: 3, type: 1 }));
    const boundary = serialize(f.struct);
    expect(() => fromSelectedStructureLabelState(f.restruct, selection, false)).toThrow('多个外接原子');
    expect(serialize(f.struct)).toBe(boundary);
    expect(() => fromSelectedStructureLabelState(f.restruct, { atoms: [1] }, true)).toThrow('完整');
  });

  it('rejects nesting before contraction; expanding an imported nested label keeps its hierarchy and chemistry', () => {
    const f = fixture();
    fromSgroupAddition(f.restruct, 'GEN', [2], {}, 10, []);
    const before = serialize(f.struct);
    expect(() => contract(f)).toThrow('嵌套或重叠');
    expect(serialize(f.struct)).toBe(before);
    fromSgroupAddition(f.restruct, 'SUP', [1, 2], { name: 'Imported', expanded: false }, 11, []);
    const graph = chemicalGraph(f.struct);
    const state = fromSelectedStructureLabelState(f.restruct, { sgroups: [11] }, true);
    expect(f.struct.sGroupForest.parent.get(10)).toBe(11);
    expect(chemicalGraph(f.struct)).toEqual(graph);
    expect(() => fromSelectedStructureLabelState(f.restruct, { sgroups: [11] }, false)).toThrow('嵌套或重叠');
    state.inverseAction.perform(f.restruct);
    expect(f.struct.sgroups.get(11)?.isExpanded()).toBe(false);
  });

  it('retains ring fills through contraction and expansion instead of flattening the chemical graph', () => {
    const struct = new Struct();
    [[0, 0], [1, 0], [0.5, 1]].forEach(([x, y]) => struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(x, y) })));
    [[0, 1], [1, 2], [2, 0]].forEach(([begin, end]) => struct.bonds.add(new Bond({ begin, end, type: 1 })));
    struct.ringFills.add(new RingFill({ atoms: [0, 1, 2], bonds: [0, 1, 2], color: '#a5d6a7' }));
    const f = fixture(struct);
    const graph = chemicalGraph(struct);
    const result = contract(f, [0, 1, 2], 'Ring');
    fromSelectedStructureLabelState(f.restruct, { sgroups: [result.groupId] }, true);
    expect(chemicalGraph(struct)).toEqual(graph);
    expect(new KetSerializer().deserializeMicromolecules(serialize(struct)).ringFills.size).toBe(1);
  });
});
