/** @jest-environment node */
import { Bond } from 'domain/entities/bond';
import type { Struct } from 'domain/entities/struct';
import { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import ReStruct from 'application/render/restruct/restruct';
import { createFusionRing } from '../ringFusion';
import { fromTemplateOnAtom } from '../template';

const mockSettings = { sproutRingsInsteadOfSpiro: false };
// Hit testing and the drawing shell are replaced; the production tool,
// Struct, template attachment, operations and inverse actions remain real.
jest.mock('src/constants', () => ({ MODES: { FG: 'fg' } }), { virtual: true });
jest.mock('ketcher-core', () => ({
  ...jest.requireActual('domain/entities'),
  ...jest.requireActual('application/editor/actions'),
  ...jest.requireActual('application/editor/operations'),
  ...jest.requireActual('application/render/coordinateTransformation'),
  ...jest.requireActual('application/editor/shared/vectorUtils'),
  ketcherProvider: { getKetcher: () => ({ settingsService: { getSettings: () => mockSettings } }) },
  getItemsToFuse: () => ({ atoms: new Map(), bonds: new Map() }),
  getHoverToFuse: () => null,
}));

// Exercise the source adapter at runtime without adding React to Core's
// production TypeScript project graph.
const TemplateTool = require('../../../../../../ketcher-react/src/script/editor/tool/template').default;
const { shouldSproutRing } = require('../../../../../../ketcher-react/src/script/editor/tool/templateRingPolicy');

const serialize = (struct: Struct) => new KetSerializer().serializeMicromolecules(struct);
const graph = (struct: Struct) => ({
  atoms: [...struct.atoms.entries()].sort(([a], [b]) => a - b).map(([id, a]) => [id, a.label, a.isotope, a.charge, a.aam, a.pp.x, a.pp.y, a.implicitH]),
  bonds: [...struct.bonds.entries()].sort(([a], [b]) => a - b).map(([id, b]) => [id, b.begin, b.end, b.type, b.stereo]),
});
const event = (altKey = false, clientX = 1.05, clientY = 0) => ({ altKey, ctrlKey: false, clientX, clientY } as MouseEvent);

function fixture(preference = false, ringTool = true, mode?: string) {
  mockSettings.sproutRingsInsteadOfSpiro = preference;
  const struct = createFusionRing(6);
  struct.prepareLoopStructure();
  struct.markFragments();
  struct.setImplicitHydrogen();
  const layer = { attr() { return this; }, toFront() { return this; } };
  const render: any = {
    paper: { rect: () => layer }, options: { microModeScale: 1, zoom: 1 },
    viewBox: { minX: 0, minY: 0 }, clientArea: { getBoundingClientRect: () => ({ top: 0, left: 0 }) },
    update: jest.fn(),
  };
  const restruct = new ReStruct(struct, render);
  restruct.assignConnectedComponents();
  restruct.visibleAtoms = new Map(restruct.atoms);
  render.ctab = restruct;
  const history: any[] = [];
  const editor: any = {
    ketcherId: 'ring-test', render, struct: () => struct,
    selection: jest.fn(), hover: jest.fn(), findItem: () => ({ map: 'atoms', id: 0, dist: 0 }),
    update: (action, preview) => { if (!preview) history.push(action); },
    event: { message: { dispatch: jest.fn() } },
  };
  const ring = createFusionRing(5);
  const tool = new TemplateTool(editor, { struct: ring, ringTool, mode });
  return { struct, restruct, editor, tool, history };
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

describe('built-in ring click preference', () => {
  it.each([[false, false, 10, 11], [false, true, 11, 12], [true, false, 11, 12], [true, true, 11, 12]])(
    'preference %s / Alt %s creates the documented graph and one reversible action', async (preference, alt, atoms, bonds) => {
      const f = fixture(Boolean(preference));
      Object.assign(f.struct.atoms.get(0)!, { label: 'N', isotope: 15, charge: 1, aam: 42 });
      f.struct.setImplicitHydrogen();
      const before = serialize(f.struct);
      await f.tool.mousedown(event(Boolean(alt)));
      f.tool.mouseup(event(Boolean(alt)));
      expect(f.struct.atoms.size).toBe(atoms);
      expect(f.struct.bonds.size).toBe(bonds);
      expect(f.struct.atoms.get(0)).toMatchObject({ label: 'N', isotope: 15, charge: 1, aam: 42 });
      expect(f.struct.atomGetNeighbors(0)).toHaveLength(atoms === 11 ? 3 : 4);
      if (atoms === 11) {
        const connector = [...f.struct.bonds.values()].find(b => b.begin === 0 && b.end >= 6)!;
        expect(connector.type).toBe(Bond.PATTERN.TYPE.SINGLE);
        expect(f.struct.atomGetNeighbors(connector.end)).toHaveLength(3);
      }
      expect(f.history).toHaveLength(1);
      const grown = graph(f.struct);
      const redo = f.history[0].perform(f.restruct);
      expect(serialize(f.struct)).toBe(before);
      redo.perform(f.restruct);
      expect(graph(f.struct)).toEqual(grown);
      const reopened = new KetSerializer().deserializeMicromolecules(serialize(f.struct));
      expect(reopened.atoms.size).toBe(atoms);
      expect(reopened.bonds.size).toBe(bonds);
    },
  );

  it('refreshes a same-target preview when Alt changes and matches the committed graph', async () => {
    const f = fixture();
    const before = serialize(f.struct);
    f.tool.mousemove(event());
    jest.advanceTimersByTime(300);
    expect(f.struct.atoms.size).toBe(10);
    f.tool.mousemove(event(true));
    expect(serialize(f.struct)).toBe(before);
    jest.advanceTimersByTime(300);
    expect(f.struct.atoms.size).toBe(11);
    f.struct.atoms.forEach((a, id) => { expect(a.isPreview).toBe(id >= 6); });
    f.struct.bonds.forEach((b, id) => { expect(b.isPreview).toBe(id >= 6); });
    const preview = serialize(f.struct);
    expect(f.history).toHaveLength(0);
    await f.tool.mousedown(event(true));
    expect(serialize(f.struct)).toBe(before);
    f.tool.mouseup(event(true));
    expect(serialize(f.struct)).toEqual(preview);
    expect(f.history).toHaveLength(1);
    expect([...f.struct.atoms.values()].some(a => a.isPreview)).toBe(false);
  });

  it('cancels a pending preview and restores the entire original structure', () => {
    const f = fixture(true);
    const before = serialize(f.struct);
    f.tool.mousemove(event());
    f.tool.templatePreview!.hidePreview();
    jest.advanceTimersByTime(300);
    expect(serialize(f.struct)).toBe(before);
    f.tool.mousemove(event());
    jest.advanceTimersByTime(300);
    f.tool.templatePreview!.hidePreview();
    expect(serialize(f.struct)).toBe(before);
    expect(f.history).toHaveLength(0);
  });

  it('keeps short drags and a modifier change at release consistent with the preference', async () => {
    const f = fixture(true);
    await f.tool.mousedown(event());
    f.tool.mousemove(event(false, 1.1, 0));
    expect(f.struct.atoms.size).toBe(11);
    f.tool.mouseup(event(false, 1.1, 0));
    expect(f.history).toHaveLength(1);
    const g = fixture();
    await g.tool.mousedown(event());
    g.tool.mousemove(event(false, 1.1, 0));
    expect(g.struct.atoms.size).toBe(10);
    g.tool.mouseup(event(true, 1.1, 0));
    expect(g.struct.atoms.size).toBe(11);
    expect(g.history).toHaveLength(1);
  });

  it('does not apply the preference to user/library templates, nicknames or functional groups', () => {
    const f = fixture(true);
    expect(shouldSproutRing(f.editor, { ringTool: false }, null, event(true))).toBe(false);
    expect(shouldSproutRing(f.editor, { ringTool: true }, 'fg', event(true))).toBe(false);
    const g = fixture(true, false);
    // The old template-attachment path remains available without the flag.
    const tmpl = { molecule: createFusionRing(5), aid: 0, bid: 0, angle0: 0, ringTool: false };
    fromTemplateOnAtom(g.restruct, tmpl, 0, 0, false);
    expect(g.struct.atoms.size).toBe(10);
    expect(g.struct.bonds.size).toBe(11);
  });
});
