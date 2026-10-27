/** @jest-environment node */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Atom } from 'domain/entities/atom';
import { Bond } from 'domain/entities/bond';
import { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import { createNicknameDefinition } from 'domain/helpers/nicknames';
import { parseAtomSproutLabel } from 'domain/helpers/atomSproutLabel';
import { FunctionalGroupsProvider } from 'domain/helpers/functionalGroupsProvider';
import { SGroupAttachmentPoint } from 'domain/entities/sGroupAttachmentPoint';
import ReStruct from 'application/render/restruct/restruct';
import { fromSelectedAtomLabelSprout } from '../atomLabelSprout';
import { fromSelectedAtomLabelEdit } from '../atomLabelEdit';
import { validateAtomSproutTarget } from '../atomSprout';
import { atomForNewBond } from '../utils';

const serialize = (struct: Struct) => new KetSerializer().serializeMicromolecules(struct);
const graph = (struct: Struct) => ({
  atoms: [...struct.atoms.entries()].sort(([a], [b]) => a - b).map(([id, atom]) => [id, atom.label, atom.isotope, atom.charge, atom.radical, atom.aam, atom.implicitH, atom.pp.x, atom.pp.y]),
  bonds: [...struct.bonds.entries()].sort(([a], [b]) => a - b).map(([id, bond]) => [id, bond.begin, bond.end, bond.type, bond.stereo]),
  groups: [...struct.sgroups.entries()].sort(([a], [b]) => a - b).map(([id, group]) => [id, group.type, [...group.atoms].sort((a, b) => a - b), group.data.name, group.data.expanded, group.getAttachmentAtomId()]),
});
// Core's legacy Jest "types" alias also matches "typescript". The native
// absolute compiler path avoids broadening the test configuration.
const ts = require(path.resolve(__dirname, '../../../../../../../node_modules/typescript/lib/typescript.js')) as typeof import('typescript');
function fixture(struct = new Struct()) {
  if (!struct.atoms.size) {
    struct.atoms.add(new Atom({ label: 'C', isotope: 13, aam: 4, pp: new Vec2() }));
    struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(-1, 0) }));
    struct.bonds.add(new Bond({ begin: 0, end: 1, type: 1 }));
  }
  struct.prepareLoopStructure();
  struct.markFragments();
  struct.setImplicitHydrogen();
  const layer = { attr() { return this; }, toFront() { return this; } };
  const render: any = { paper: { rect: () => layer }, options: {}, update: jest.fn() };
  const restruct = new ReStruct(struct, render);
  restruct.assignConnectedComponents();
  restruct.visibleAtoms = new Map(restruct.atoms);
  render.ctab = restruct;
  return { struct, restruct, render };
}

function nickname(name = 'MyO') {
  const struct = new Struct();
  struct.atoms.add(new Atom({ label: 'C', isotope: 13, pp: new Vec2(0, 0) }));
  struct.atoms.add(new Atom({ label: 'O', charge: -1, pp: new Vec2(1, 0) }));
  struct.bonds.add(new Bond({ begin: 0, end: 1, type: 1 }));
  fixture(struct);
  const definition = createNicknameDefinition(serialize(struct), name, 0);
  return { definition, struct: new KetSerializer().deserializeMicromolecules(definition.ket), attachmentAtomId: 0 };
}

// Execute the actual Editor methods without constructing its DOM renderer.
// Core actions, chemistry, nickname structures and snapshot checks remain real.
const editorSource = readFileSync(path.resolve(__dirname, '../../../../../../ketcher-react/src/script/editor/Editor.ts'), 'utf8');
const methods = editorSource.slice(editorSource.indexOf('  captureAtomLabelSprout()'), editorSource.indexOf('  private isChemicalHotspotVisible'));
const editorJS = ts.transpileModule(`class LabelEditor { ${methods} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function editorFixture() {
  const f = fixture();
  const custom = nickname();
  const context = { validateAtomSproutTarget, KetSerializer, parseAtomSproutLabel, FunctionalGroupsProvider, SGroup: require('domain/entities/sgroup').SGroup,
    fromSelectedAtomLabelSprout, fromSelectedAtomLabelEdit, getNicknames: () => [custom.definition],
    getNicknameTemplate: () => ({ struct: custom.struct, aid: 0 }), SelectTool: class {} };
  const Editor = new Function(...Object.keys(context), `${editorJS}; return LabelEditor`)(...Object.values(context));
  const editor = new Editor();
  const history: any[] = [];
  let selection: any = { atoms: [0] };
  Object.assign(editor, {
    render: f.render, struct: () => f.struct,
    selection: (value?: any) => { if (value !== undefined) selection = value; return selection; },
    update: (action: any) => history.push(action), rotateController: { rerender: jest.fn() },
  });
  return { ...f, editor, history };
}

afterEach(() => { FunctionalGroupsProvider.getInstance().setFunctionalGroupsList([]); });

describe('custom atom label sprouting', () => {
  it.each([
    ['O', 'O', null, null, 0], ['15N+', 'N', 15, 1, 0], ['13C-', 'C', 13, -1, 0],
    ['O:', 'O', null, null, 1], ['Tag42', 'Tag42', null, null, 0],
  ])('adds %s through native operations, preserving the source and a complete history round trip', (label, element, isotope, charge, radical) => {
    const f = fixture();
    const before = serialize(f.struct);
    const result = fromSelectedAtomLabelSprout(f.restruct, [0], String(label));
    expect(result.atoms).toHaveLength(1);
    expect(result.bonds).toHaveLength(1);
    expect(f.struct.atoms.get(result.targetAtomId)).toMatchObject({ label: element, isotope, charge, radical });
    expect(f.struct.atoms.get(0)).toMatchObject({ label: 'C', isotope: 13, aam: 4 });
    expect(f.struct.bonds.get(result.bonds[0])?.type).toBe(1);
    const grown = serialize(f.struct);
    const restored = new KetSerializer().deserializeMicromolecules(grown);
    expect(restored.atoms.get(2)?.label).toBe(element);
    const redo = result.inverseAction.perform(f.restruct);
    expect(serialize(f.struct)).toBe(before);
    redo.perform(f.restruct);
    expect(serialize(f.struct)).toBe(grown);
  });

  it('attaches the actual nickname through a single bond, retaining contracted SUP and isotope/charge data', () => {
    const f = fixture();
    const fragment = nickname();
    const source = serialize(f.struct);
    const library = serialize(fragment.struct);
    const result = fromSelectedAtomLabelSprout(f.restruct, [0], 'MyO', fragment);
    expect(result.atoms).toHaveLength(2);
    expect(result.bonds).toHaveLength(2);
    expect(f.struct.atoms.size).toBe(4);
    expect(f.struct.sgroups.size).toBe(1);
    expect([...f.struct.sgroups.values()][0].data).toMatchObject({ name: 'MyO', expanded: false });
    expect(f.struct.atoms.get(result.targetAtomId)).toMatchObject({ label: 'C', isotope: 13 });
    expect([...f.struct.atoms.values()].find(a => a.label === 'O')?.charge).toBe(-1);
    expect(serialize(fragment.struct)).toBe(library);
    const grown = serialize(f.struct);
    const expected = graph(f.struct);
    const redo = result.inverseAction.perform(f.restruct);
    expect(serialize(f.struct)).toBe(source);
    redo.perform(f.restruct);
    expect(graph(f.struct)).toEqual(expected);
    expect(new KetSerializer().deserializeMicromolecules(grown).sgroups.size).toBe(1);
  });

  it('attaches a single-atom nickname with one connector and a reversible SUP', () => {
    const f = fixture();
    const single = new Struct();
    single.atoms.add(new Atom({ label: 'O', charge: -1, pp: new Vec2() }));
    fixture(single);
    const entry = createNicknameDefinition(serialize(single), 'SingleO', 0);
    const source = serialize(f.struct);
    const result = fromSelectedAtomLabelSprout(f.restruct, [0], 'SingleO', {
      struct: new KetSerializer().deserializeMicromolecules(entry.ket), attachmentAtomId: 0,
    });
    expect(result.atoms).toHaveLength(1);
    expect(result.bonds).toHaveLength(1);
    expect(f.struct.atoms.get(result.targetAtomId)).toMatchObject({ label: 'O', charge: -1 });
    const expected = graph(f.struct);
    const redo = result.inverseAction.perform(f.restruct);
    expect(serialize(f.struct)).toBe(source);
    redo.perform(f.restruct);
    expect(graph(f.struct)).toEqual(expected);
  });

  it('rejects invalid labels, targets and nickname attachments before changing the graph', () => {
    const f = fixture();
    const before = serialize(f.struct);
    for (const label of ['', 'has space', 'x\ny', 'a'.repeat(41)]) {
      expect(() => fromSelectedAtomLabelSprout(f.restruct, [0], label)).toThrow();
      expect(serialize(f.struct)).toBe(before);
    }
    expect(() => fromSelectedAtomLabelSprout(f.restruct, [0, 1], 'O')).toThrow();
    expect(() => fromSelectedAtomLabelSprout(f.restruct, [99], 'O')).toThrow();
    expect(() => fromSelectedAtomLabelSprout(f.restruct, [0], 'MyO', { ...nickname(), attachmentAtomId: 99 })).toThrow();
    expect(serialize(f.struct)).toBe(before);
    expect(parseAtomSproutLabel('Unknown')).toMatchObject({ label: 'Unknown', pseudo: true });
  });

  it('rejects a nickname whose every candidate overlaps an existing atom without adding a bond', () => {
    const f = fixture();
    const direction = atomForNewBond(f.restruct, 0, { type: 1 }).pos;
    const base = Math.atan2(direction.y, direction.x);
    for (const offset of [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      f.struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(Math.cos(base + offset), Math.sin(base + offset)) }));
    }
    const blocked = fixture(f.struct);
    const fragment = new Struct();
    fragment.atoms.add(new Atom({ label: 'O', pp: new Vec2() }));
    const before = serialize(blocked.struct);
    expect(() => fromSelectedAtomLabelSprout(blocked.restruct, [0], 'SingleO', { struct: fragment, attachmentAtomId: 0 })).toThrow(/重叠/);
    expect(serialize(blocked.struct)).toBe(before);
  });

  it('uses the captured atom despite selection changes and rejects a changed chemical document', () => {
    const f = editorFixture();
    const draft = f.editor.captureAtomLabelSprout();
    expect(f.history).toHaveLength(0);
    f.editor.selection({ atoms: [1] });
    f.editor.sproutAtomLabel('15N+', draft);
    expect(f.struct.findBondId(0, 2)).not.toBeNull();
    expect(f.struct.findBondId(1, 2)).toBeNull();
    expect(f.history).toHaveLength(1);
    const grown = serialize(f.struct);
    expect(() => f.editor.sproutAtomLabel('O', draft)).toThrow(/文档已变化/);
    expect(serialize(f.struct)).toBe(grown);
    expect(f.history).toHaveLength(1);
  });

  it('resolves custom and native nickname names to real structures, while literal text remains a pseudoatom', () => {
    for (const label of ['myo', 'NativeO', 'LiteralTag']) {
      const f = editorFixture();
      const native = nickname('NativeO');
      native.struct.name = 'NativeO';
      FunctionalGroupsProvider.getInstance().setFunctionalGroupsList([native.struct]);
      f.editor.sproutAtomLabel(label, f.editor.captureAtomLabelSprout());
      if (label === 'LiteralTag') expect(f.struct.atoms.get(2)?.label).toBe('LiteralTag');
      else {
        expect(f.struct.atoms.size).toBe(4);
        expect([...f.struct.atoms.values()].some(atom => atom.label === 'O' && atom.charge === -1)).toBe(true);
      }
      expect(f.history).toHaveLength(1);
    }
  });
});

describe('atom label editing and nickname replacement', () => {
  it.each(['15N+', 'LiteralTag'])('replaces %s at the captured atom without sprouting, with complete undo/redo', label => {
    const f = editorFixture();
    const before = serialize(f.struct);
    const draft = f.editor.captureAtomLabelEdit();
    expect(draft.label).toBe('13C');
    expect(f.history).toHaveLength(0);
    f.editor.selection({ atoms: [1] });
    f.editor.editAtomLabel(label, draft);
    expect(f.struct.atoms.size).toBe(2);
    expect(f.struct.bonds.size).toBe(1);
    expect(f.struct.atoms.get(0)).toMatchObject(label === '15N+'
      ? { label: 'N', isotope: 15, charge: 1, aam: 4 }
      : { label, isotope: null, charge: null, aam: 4 });
    expect(f.struct.atoms.get(1)?.label).toBe('C');
    expect(f.history).toHaveLength(1);
    const expected = graph(f.struct);
    const redo = f.history[0].perform(f.restruct);
    expect(serialize(f.struct)).toBe(before);
    redo.perform(f.restruct);
    expect(graph(f.struct)).toEqual(expected);
  });

  it.each([1, 6])('replaces a nickname on either wedge orientation (%s), preserving anchor, mapping, bonds and the library', stereo => {
    const f = fixture();
    f.struct.atoms.get(0)!.isotope = null;
    f.struct.bonds.get(0)!.stereo = stereo;
    const before = serialize(f.struct);
    const fragment = nickname();
    const library = serialize(fragment.struct);
    const external = { ...f.struct.bonds.get(0)! };
    const anchor = new Vec2(f.struct.atoms.get(0)!.pp);
    const result = fromSelectedAtomLabelEdit(f.restruct, [0], 'MyO', fragment);
    expect(f.struct.atoms.size).toBe(3);
    expect(f.struct.bonds.size).toBe(2);
    expect(f.struct.atoms.get(0)).toMatchObject({ isotope: 13, aam: 4, pp: anchor });
    expect(f.struct.bonds.get(0)).toMatchObject(external);
    expect([...f.struct.sgroups.values()][0].getAttachmentAtomId()).toBe(0);
    expect([...f.struct.sgroups.values()][0].data).toMatchObject({ name: 'MyO', expanded: false });
    expect(serialize(fragment.struct)).toBe(library);
    const expected = graph(f.struct);
    const reopened = new KetSerializer().deserializeMicromolecules(serialize(f.struct));
    expect(reopened.atoms.size).toBe(3);
    expect([...reopened.atoms.values()].find(a => a.aam === 4)?.isotope).toBe(13);
    expect([...reopened.bonds.values()].filter(b => b.stereo === stereo)).toHaveLength(1);
    const redo = result.inverseAction.perform(f.restruct);
    expect(serialize(f.struct)).toBe(before);
    redo.perform(f.restruct);
    expect(graph(f.struct)).toEqual(expected);
  });

  it('replaces isolated and single-atom nicknames without adding a connecting bond', () => {
    const isolated = new Struct();
    isolated.atoms.add(new Atom({ label: 'C', pp: new Vec2() }));
    const f = fixture(isolated);
    const single = new Struct();
    single.atoms.add(new Atom({ label: 'O', charge: -1, pp: new Vec2() }));
    fixture(single);
    const definition = createNicknameDefinition(serialize(single), 'SingleO', 0);
    const before = serialize(f.struct);
    const result = fromSelectedAtomLabelEdit(f.restruct, [0], 'SingleO', {
      struct: new KetSerializer().deserializeMicromolecules(definition.ket), attachmentAtomId: 0,
    });
    expect(f.struct.atoms.size).toBe(1);
    expect(f.struct.bonds.size).toBe(0);
    expect(f.struct.atoms.get(0)).toMatchObject({ label: 'O', charge: -1 });
    const redo = result.inverseAction.perform(f.restruct);
    expect(serialize(f.struct)).toBe(before);
    redo.perform(f.restruct);
    expect(f.struct.sgroups.size).toBe(1);
  });

  it('resolves saved/native labels and elements while rejecting stale capture with no new history', () => {
    for (const label of ['myo', 'NativeO', 'O']) {
      const f = editorFixture();
      f.struct.atoms.get(0)!.isotope = null;
      const native = nickname('NativeO');
      native.struct.name = 'NativeO';
      FunctionalGroupsProvider.getInstance().setFunctionalGroupsList([native.struct]);
      f.editor.editAtomLabel(label, f.editor.captureAtomLabelEdit());
      expect(f.struct.atoms.size).toBe(label === 'O' ? 2 : 3);
      expect(f.struct.sgroups.size).toBe(label === 'O' ? 0 : 1);
      const before = serialize(f.struct);
      expect(() => f.editor.editAtomLabel('N', { atomId: 0, sourceKet: 'stale' })).toThrow(/文档已变化/);
      expect(serialize(f.struct)).toBe(before);
      expect(f.history).toHaveLength(1);
    }
  });

  it('rejects isotope loss, multiple bonds, mapping conflicts and invalid attachment points before mutation', () => {
    const scenarios = [
      (f: ReturnType<typeof fixture>) => { f.struct.atoms.get(0)!.isotope = 13; },
      (f: ReturnType<typeof fixture>) => {
        f.struct.bonds.set(0, new Bond({ ...f.struct.bonds.get(0)!, type: 2 }));
      },
      (f: ReturnType<typeof fixture>) => { f.struct.atoms.get(0)!.charge = 1; },
      (f: ReturnType<typeof fixture>) => { f.struct.atoms.get(0)!.abnormalValence = true; },
      (f: ReturnType<typeof fixture>) => { f.struct.atoms.get(1)!.aam = 4; },
      (f: ReturnType<typeof fixture>) => {
        const id = f.struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, 1) }));
        f.struct.bonds.add(new Bond({ begin: 0, end: id, type: 1 }));
      },
    ];
    for (const configure of scenarios) {
      const f = fixture();
      f.struct.atoms.get(0)!.isotope = null;
      configure(f);
      const configured = fixture(f.struct);
      const before = serialize(f.struct);
      expect(() => fromSelectedAtomLabelEdit(configured.restruct, [0], 'MyO', nickname())).toThrow();
      expect(serialize(f.struct)).toBe(before);
    }
    const f = fixture();
    f.struct.atoms.get(0)!.isotope = null;
    const before = serialize(f.struct);
    expect(() => fromSelectedAtomLabelEdit(f.restruct, [0], 'MyO', { ...nickname(), attachmentAtomId: 99 })).toThrow();
    expect(serialize(f.struct)).toBe(before);
  });

  it('rejects multiple attachment points and blocked placement without modifying the source or stored fragment', () => {
    const f = fixture();
    f.struct.atoms.get(0)!.isotope = null;
    const multiple = nickname();
    [...multiple.struct.sgroups.values()][0].addAttachmentPoint(new SGroupAttachmentPoint(1, undefined, '2'));
    const before = serialize(f.struct);
    const stored = serialize(multiple.struct);
    expect(() => fromSelectedAtomLabelEdit(f.restruct, [0], 'MyO', multiple)).toThrow(/单一连接点/);
    expect(serialize(f.struct)).toBe(before);
    expect(serialize(multiple.struct)).toBe(stored);
    const direction = atomForNewBond(f.restruct, 0, { type: 1 }).pos;
    const base = Math.atan2(direction.y, direction.x);
    for (const offset of [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      f.struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(Math.cos(base + offset), Math.sin(base + offset)) }));
    }
    const blocked = fixture(f.struct);
    const blockedBefore = serialize(f.struct);
    expect(() => fromSelectedAtomLabelEdit(blocked.restruct, [0], 'MyO', nickname())).toThrow(/重叠/);
    expect(serialize(f.struct)).toBe(blockedBefore);
  });
});
