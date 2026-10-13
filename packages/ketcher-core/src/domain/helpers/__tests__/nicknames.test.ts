/** @jest-environment node */
import { Atom } from '../../entities/atom';
import { Bond } from '../../entities/bond';
import { Struct } from '../../entities/struct';
import { SGroup } from '../../entities/sgroup';
import { Vec2 } from '../../entities/vec2';
import { KetSerializer } from '../../serializers/ket/ketSerializer';
import {
  captureNicknameFragment,
  createNicknameDefinition,
  type NicknameDefinition,
} from '../nicknames';

// Test the React-side storage adapter against this checkout's actual core,
// without requiring prebuilt workspace packages or a DOM renderer.
jest.mock('ketcher-core', () => ({
  ...jest.requireActual('../nicknames'),
  KetSerializer: jest.requireActual('../../serializers/ket/ketSerializer')
    .KetSerializer,
}));
const { getNicknames, saveNickname, deleteNickname, getNicknameTemplate, exportNicknameLibrary, importNicknameLibrary } =
  jest.requireActual(
    '../../../../../ketcher-react/src/script/editor/nicknameLibrary',
  ) as {
    getNicknames: () => NicknameDefinition[];
    saveNickname: typeof createNicknameDefinition;
    deleteNickname: (name: string) => void;
    exportNicknameLibrary: () => string;
    importNicknameLibrary: (source: string) => number;
    getNicknameTemplate: (name: string) => {
      aid: number;
      props: { group: string };
      struct: Struct;
    };
  };

function makeStructure() {
  const struct = new Struct();
  const a = struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, 0) }));
  const b = struct.atoms.add(
    new Atom({ label: 'C', isotope: 13, pp: new Vec2(1, 0) }),
  );
  const c = struct.atoms.add(
    new Atom({ label: 'O', charge: -1, pp: new Vec2(2, 0) }),
  );
  struct.bonds.add(new Bond({ begin: a, end: b, type: 1 }));
  struct.bonds.add(new Bond({ begin: b, end: c, type: 1 }));
  return struct;
}

describe('chemical nickname fragments', () => {
  it('copies internal bonds, remaps attachment IDs and leaves the source unchanged', () => {
    const source = makeStructure();
    const serializer = new KetSerializer();
    const before = serializer.serializeMicromolecules(source);
    const draft = captureNicknameFragment(source, [2, 1]);
    const definition = createNicknameDefinition(draft.ket, 'MyCO', 1);
    const restored = serializer.deserializeMicromolecules(definition.ket);
    expect(draft.atoms).toEqual([
      { id: 0, originalId: 1, label: 'C' },
      { id: 1, originalId: 2, label: 'O' },
    ]);
    expect(draft.attachmentAtomId).toBe(0);
    expect(definition.atomCount).toBe(2);
    expect(definition.bondCount).toBe(1);
    expect(restored.atoms.get(0)!.isotope).toBe(13);
    expect(restored.atoms.get(1)!.charge).toBe(-1);
    const group = [...restored.sgroups.values()][0];
    expect(group.type).toBe('SUP');
    expect(group.data.name).toBe('MyCO');
    expect(group.isExpanded()).toBe(false);
    expect(group.getAttachmentAtomId()).toBe(1);
    expect(serializer.serializeMicromolecules(source)).toBe(before);
  });

  it('can reopen and redefine an existing nickname without duplicate SUP labels', () => {
    const draft = captureNicknameFragment(makeStructure(), [0, 1, 2]);
    const first = createNicknameDefinition(draft.ket, 'First', 0);
    const second = createNicknameDefinition(first.ket, 'Second', 2);
    const struct = new KetSerializer().deserializeMicromolecules(second.ket);
    expect(struct.sgroups.size).toBe(1);
    expect([...struct.sgroups.values()][0].getAttachmentAtomId()).toBe(2);
    expect([...struct.sgroups.values()][0].data.name).toBe('Second');
  });

  it('refuses empty/stale/disconnected selections and invalid attachment atoms', () => {
    const source = makeStructure();
    expect(() => captureNicknameFragment(source, [])).toThrow(/选择/);
    expect(() => captureNicknameFragment(source, [99])).toThrow(/失效/);
    expect(() => captureNicknameFragment(source, [0, 2])).toThrow(/相连/);
    const draft = captureNicknameFragment(source, [0, 1]);
    expect(() => createNicknameDefinition(draft.ket, 'Valid', 9)).toThrow(
      /连接原子/,
    );
    expect(() => createNicknameDefinition(draft.ket, 'bad name', 0)).toThrow(
      /空白/,
    );
  });

  it('refuses partial S-groups instead of silently dropping their attributes', () => {
    const source = makeStructure();
    const group = new SGroup('DAT');
    group.data.fieldName = 'note';
    group.data.fieldValue = 'preserve data';
    group.atoms = [1, 2];
    group.id = source.sgroups.add(group);
    source.atoms.get(1)!.sgs.add(group.id);
    source.atoms.get(2)!.sgs.add(group.id);
    source.sGroupForest.insert(group);
    expect(() => captureNicknameFragment(source, [0, 1])).toThrow(
      /完整的 S-group/,
    );
    const draft = captureNicknameFragment(source, [1, 2]);
    expect(
      [
        ...new KetSerializer()
          .deserializeMicromolecules(draft.ket)
          .sgroups.values(),
      ].map((sgroup) => sgroup.type),
    ).toEqual(['DAT']);
    const definition = createNicknameDefinition(draft.ket, 'DataCO', 0);
    const restored = new KetSerializer().deserializeMicromolecules(
      definition.ket,
    );
    const dataGroup = [...restored.sgroups.values()].find(
      (sgroup) => sgroup.type === 'DAT',
    )!;
    expect(dataGroup.data.fieldName).toBe('note');
    expect(dataGroup.data.fieldValue).toBe('preserve data');
  });
});

describe('persistent nickname library', () => {
  let storage: Map<string, string>;
  let failWrites: boolean;
  let writes: number;
  const originalStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );

  beforeEach(() => {
    storage = new Map();
    failWrites = false;
    writes = 0;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          if (failWrites) throw new Error('storage quota');
          writes++;
          storage.set(key, value);
        },
      },
    });
  });

  afterAll(() => {
    if (originalStorage)
      Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('restores real template chemistry and persists deletion', () => {
    const draft = captureNicknameFragment(makeStructure(), [1, 2]);
    saveNickname(draft.ket, 'MyCO', 1);
    const template = getNicknameTemplate('MyCO');
    expect(template.aid).toBe(1);
    expect(template.props.group).toBe('Functional Groups');
    expect(template.struct.atoms.get(0)!.isotope).toBe(13);
    expect(template.struct.atoms.get(1)!.charge).toBe(-1);
    expect(template.struct.bonds.size).toBe(1);
    expect(getNicknames().map((item) => item.name)).toEqual(['MyCO']);
    deleteNickname('MyCO');
    expect(getNicknames()).toEqual([]);
    expect(() => getNicknameTemplate('MyCO')).toThrow(/不存在/);
  });

  it('rejects duplicate, corrupt and failed writes without replacing stored entries', () => {
    const draft = captureNicknameFragment(makeStructure(), [1, 2]);
    saveNickname(draft.ket, 'MyCO', 0);
    const saved = storage.get('ketcher-nicknames:v1');
    expect(() => saveNickname(draft.ket, 'myco', 0)).toThrow(/已存在/);
    expect(storage.get('ketcher-nicknames:v1')).toBe(saved);
    failWrites = true;
    expect(() => saveNickname(draft.ket, 'Other', 0)).toThrow(/quota/);
    expect(storage.get('ketcher-nicknames:v1')).toBe(saved);
    failWrites = false;
    storage.set('ketcher-nicknames:v1', '{broken');
    expect(() => saveNickname(draft.ket, 'Other', 0)).toThrow();
    expect(storage.get('ketcher-nicknames:v1')).toBe('{broken');
    expect(() => deleteNickname('MyCO')).toThrow();
    expect(storage.get('ketcher-nicknames:v1')).toBe('{broken');
  });

  it('validates stored attachment IDs instead of inserting damaged chemistry', () => {
    const draft = captureNicknameFragment(makeStructure(), [1, 2]);
    storage.set(
      'ketcher-nicknames:v1',
      JSON.stringify({
        version: 1,
        items: [{ name: 'Broken', ket: draft.ket, attachmentAtomId: 99 }],
      }),
    );
    expect(() => getNicknames()).toThrow(/连接原子/);
    expect(() => getNicknameTemplate('Broken')).toThrow(/连接原子/);
  });

  const exchange = (items: unknown[], version = 1) => JSON.stringify({ format: 'chemwiki-nicknames/v1', version, items });
  const entry = (name: string) => {
    const draft = captureNicknameFragment(makeStructure(), [1, 2]);
    return { name, ket: draft.ket, attachmentAtomId: 1 };
  };

  it('exports canonical chemistry and restores it alongside an existing nickname in one write', () => {
    const first = entry('MyCO');
    saveNickname(first.ket, first.name, first.attachmentAtomId);
    const backup = exportNicknameLibrary();
    const data = JSON.parse(backup);
    expect(data.format).toBe('chemwiki-nicknames/v1');
    expect(data.version).toBe(1);
    expect(data.items[0].attachmentAtomId).toBe(1);
    storage.clear();
    const other = entry('Other');
    saveNickname(other.ket, other.name, other.attachmentAtomId);
    const beforeWrites = writes;
    expect(importNicknameLibrary('\uFEFF' + backup)).toBe(1);
    expect(writes).toBe(beforeWrites + 1);
    expect(getNicknames().map(item => item.name)).toEqual(['MyCO', 'Other']);
    const template = getNicknameTemplate('MyCO');
    expect(template.aid).toBe(1);
    expect(template.struct.atoms.get(0)!.isotope).toBe(13);
    expect(template.struct.atoms.get(1)!.charge).toBe(-1);
    expect(template.struct.bonds.size).toBe(1);
    expect(template.struct.sgroups.get(0)!.data.name).toBe('MyCO');
  });

  it('refuses duplicate names within a file or against existing names without partial imports', () => {
    const existing = entry('Existing');
    saveNickname(existing.ket, existing.name, 1);
    const before = storage.get('ketcher-nicknames:v1');
    for (const items of [[entry('New'), entry('existing')], [entry('New'), entry('new')]]) {
      expect(() => importNicknameLibrary(exchange(items))).toThrow(/重复|已存在/);
      expect(storage.get('ketcher-nicknames:v1')).toBe(before);
    }
  });

  it('validates all fragments before any write and recomputes untrusted entry counts', () => {
    const before = storage.get('ketcher-nicknames:v1');
    expect(() => importNicknameLibrary(exchange([entry('Good'), { ...entry('Bad'), attachmentAtomId: 99 }]))).toThrow(/连接原子/);
    expect(storage.get('ketcher-nicknames:v1')).toBe(before);
    expect(writes).toBe(0);
    expect(importNicknameLibrary(exchange([{ ...entry('Good'), atomCount: 999, bondCount: 999 }]))).toBe(1);
    expect(getNicknames()[0]).toMatchObject({ atomCount: 2, bondCount: 1 });
  });

  it('rejects unsupported formats, malformed entries, versions and oversized UTF-8 files', () => {
    for (const source of ['{broken', '{}', 'null', exchange([], 2), exchange([null]),
      exchange(Array.from({ length: 201 }, (_, index) => entry('N' + index)))]) {
      expect(() => importNicknameLibrary(source)).toThrow();
      expect(writes).toBe(0);
    }
    expect(() => importNicknameLibrary(' '.repeat(10 * 1024 * 1024 + 1))).toThrow(/10 MiB/);
    expect(() => importNicknameLibrary('❤'.repeat(Math.floor(10 * 1024 * 1024 / 3) + 1))).toThrow(/10 MiB/);
    expect(writes).toBe(0);
  });

  it('preserves the library after quota or existing-data errors and treats an empty import as a no-op', () => {
    const existing = entry('Existing');
    saveNickname(existing.ket, existing.name, 1);
    const before = storage.get('ketcher-nicknames:v1');
    const beforeWrites = writes;
    expect(importNicknameLibrary(exchange([]))).toBe(0);
    expect(writes).toBe(beforeWrites);
    failWrites = true;
    expect(() => importNicknameLibrary(exchange([entry('New')]))).toThrow(/quota/);
    expect(storage.get('ketcher-nicknames:v1')).toBe(before);
    failWrites = false;
    storage.set('ketcher-nicknames:v1', '{broken');
    expect(() => importNicknameLibrary(exchange([entry('New')]))).toThrow();
    expect(() => exportNicknameLibrary()).toThrow();
    expect(storage.get('ketcher-nicknames:v1')).toBe('{broken');
  });
});
