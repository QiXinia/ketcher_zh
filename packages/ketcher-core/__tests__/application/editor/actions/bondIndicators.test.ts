import { Atom, Bond, Struct, Vec2 } from 'domain/entities';
import { ReStruct, Render } from 'application/render';
import type { RenderOptions } from 'application/render/render.types';
import { CoreEditor } from 'application/editor';
import { BondRenderer } from 'application/render/renderers/BondRenderer';
import { fromSelectedBondIndicatorVisibility } from 'application/editor/actions/bond';
import { KetSerializer } from 'domain/serializers';
import { validate } from 'domain/serializers/ket/validate';
import { select } from 'd3';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createPolymerEditorCanvas, createRenderersManager } from '../../../helpers/dom';

const ket = new KetSerializer();
// jsdom does not implement SVG geometry; the marks still use real SVG nodes.
const svgPrototype = window.SVGSVGElement.prototype as any;
svgPrototype.createSVGMatrix = () => ({
  a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
  inverse() { return this; }, multiply() { return this; }, translate() { return this; },
  scale() { return this; }, rotate() { return this; },
});
svgPrototype.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform() { return this; } });
(window.SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 10, height: 10 });
new CoreEditor({ canvas: createPolymerEditorCanvas(), theme: {}, renderersContainer: createRenderersManager() });

function makeStruct() {
  const struct = new Struct();
  for (let x = 0; x < 3; x++) struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(x, 0) }));
  struct.bonds.add(new Bond({ begin: 0, end: 1, type: 1, topology: 1, reactingCenterStatus: 12, stereo: 1 }));
  struct.bonds.add(new Bond({ begin: 1, end: 2, type: 8, customQuery: '-;!@' }));
  struct.initHalfBonds();
  struct.initNeighbors();
  struct.markFragments();
  struct.setImplicitHydrogen();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const render = new Render(container, { microModeScale: 20, width: 300, height: 200 } as RenderOptions);
  const restruct = new ReStruct(struct, render);
  render.ctab = restruct;
  return { struct, restruct, render, container };
}

describe('object-level bond indicator visibility', () => {
  it.each(['query', 'reaction'] as const)('changes only %s display flags, with inverse history and no-op protection', indicator => {
    const { struct, restruct } = makeStruct();
    const original = ket.serializeMicromolecules(struct);
    const inverse = fromSelectedBondIndicatorVisibility(restruct, [0, 1, 0], indicator, false);
    expect(inverse.operations).toHaveLength(2);
    const property = indicator === 'query' ? 'showQueryIndicator' : 'showReactionIndicator';
    const other = indicator === 'query' ? 'showReactionIndicator' : 'showQueryIndicator';
    for (const bond of struct.bonds.values()) {
      expect(bond[property]).toBe(false);
      expect(bond[other]).toBe(true);
    }
    expect(struct.bonds.get(0)).toMatchObject({ type: 1, topology: 1, reactingCenterStatus: 12, stereo: 1 });
    expect(struct.bonds.get(1)!.customQuery).toBe('-;!@');
    const changed = ket.serializeMicromolecules(struct);
    expect(fromSelectedBondIndicatorVisibility(restruct, [0, 1], indicator, false).operations).toHaveLength(0);
    const redo = inverse.perform(restruct);
    expect(ket.serializeMicromolecules(struct)).toBe(original);
    redo.perform(restruct);
    expect(ket.serializeMicromolecules(struct)).toBe(changed);
    // Cloning and attribute hashes feed copy/paste and deletion restoration.
    expect(struct.clone().bonds.get(0)![property]).toBe(false);
    expect(Bond.getAttrHash(struct.bonds.get(0))![property]).toBe(false);
  });

  it('preflights the complete selection and input before changing any bond', () => {
    const { struct, restruct } = makeStruct();
    const original = ket.serializeMicromolecules(struct);
    for (const ids of [[], [0, 99], [0, -1], [0, 0.5]]) {
      expect(() => fromSelectedBondIndicatorVisibility(restruct, ids, 'query', false)).toThrow();
      expect(ket.serializeMicromolecules(struct)).toBe(original);
    }
    expect(() => fromSelectedBondIndicatorVisibility(restruct, [0], 'bad' as any, false)).toThrow();
    expect(() => fromSelectedBondIndicatorVisibility(restruct, [0], 'query', 'false' as any)).toThrow();
    expect(ket.serializeMicromolecules(struct)).toBe(original);
  });

  it('round-trips regular and custom-query flags in KET; legacy defaults stay omitted', () => {
    const { struct, restruct } = makeStruct();
    const original = JSON.parse(ket.serializeMicromolecules(struct));
    const reference = original.root.nodes.find(node => node.$ref).$ref;
    expect(original[reference].atoms).toHaveLength(3);
    expect(original[reference].bonds).toHaveLength(2);
    expect(original[reference].bonds.every(bond => !('showQueryIndicator' in bond) && !('showReactionIndicator' in bond))).toBe(true);
    fromSelectedBondIndicatorVisibility(restruct, [0, 1], 'query', false);
    fromSelectedBondIndicatorVisibility(restruct, [0, 1], 'reaction', false);
    const saved = ket.serializeMicromolecules(struct);
    const reopened = ket.deserializeMicromolecules(saved);
    for (const bond of reopened.bonds.values()) expect(bond).toMatchObject({ showQueryIndicator: false, showReactionIndicator: false });
    expect(reopened.bonds.get(0)).toMatchObject({ topology: 1, reactingCenterStatus: 12, stereo: 1 });
    expect(reopened.bonds.get(1)!.customQuery).toBe('-;!@');
    for (const bond of ket.deserializeMicromolecules(JSON.stringify(original)).bonds.values()) {
      expect(bond).toMatchObject({ showQueryIndicator: true, showReactionIndicator: true });
    }
    for (const property of ['showQueryIndicator', 'showReactionIndicator']) {
      const invalid = JSON.parse(saved);
      invalid[reference].bonds[1][property] = 'false';
      expect(validate(invalid)).toBe(false);
      expect(() => ket.deserializeMicromolecules(JSON.stringify(invalid))).toThrow();
    }
  });

  it('Editor API groups selected changes into one history entry and does not redraw a no-op', () => {
    // Execute the production method with the real action pipeline; only the
    // React editor shell and redraw callbacks are replaced for this core test.
    const editorSource = readFileSync(resolve(__dirname, '../../../../../ketcher-react/src/script/editor/Editor.ts'), 'utf8');
    const start = editorSource.indexOf('  setSelectedBondIndicatorVisibility(');
    const end = editorSource.indexOf('  setSelectedSimpleObjectStyle(', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const method = editorSource.slice(start, end);
    const body = method.slice(method.indexOf('{') + 1, method.lastIndexOf('}'));
    const apply = new Function('fromSelectedBondIndicatorVisibility', `return function(indicator, visible) { ${body} };`)(fromSelectedBondIndicatorVisibility);
    const { struct, restruct } = makeStruct();
    const history: any[] = [];
    const context = { selection: () => ({ bonds: [0, 1] }), render: { ctab: restruct, update: jest.fn() },
      rotateController: { rerender: jest.fn() }, update: action => history.push(action) };
    expect(apply.call(context, 'reaction', false)).toBe(2);
    expect(history).toHaveLength(1);
    expect(context.render.update).toHaveBeenCalledTimes(1);
    expect(apply.call(context, 'reaction', false)).toBe(0);
    expect(history).toHaveLength(1);
    expect(context.render.update).toHaveBeenCalledTimes(1);
    const redo = history[0].perform(restruct);
    for (const bond of struct.bonds.values()) expect(bond.showReactionIndicator).toBe(true);
    redo.perform(restruct);
    for (const bond of struct.bonds.values()) expect(bond.showReactionIndicator).toBe(false);
  });

  it('legacy SVG hides each mark independently while retaining the bond skeleton', () => {
    const { restruct, container } = makeStruct();
    restruct.update(true);
    const texts = () => [...container.querySelectorAll('text')].map(element => element.textContent);
    expect(texts()).toContain('rng');
    expect(texts()).toContain('-;!@');
    const paths = () => container.querySelectorAll('path').length;
    const originalCount = paths();
    const restoreQuery = fromSelectedBondIndicatorVisibility(restruct, [0, 1], 'query', false);
    restruct.update(true);
    expect(texts()).not.toContain('rng');
    expect(texts()).not.toContain('-;!@');
    expect(container.querySelectorAll('[data-testid="bond"]')).toHaveLength(2);
    fromSelectedBondIndicatorVisibility(restruct, [0], 'reaction', false);
    restruct.update(true);
    expect(paths()).toBeLessThan(originalCount);
    restoreQuery.perform(restruct);
    restruct.update(true);
    expect(texts()).toContain('rng');
    expect(texts()).toContain('-;!@');
  });

  it('core SVG removes previous indicator nodes on a visibility change', () => {
    const bond = new Bond({ begin: 0, end: 1, type: 1, topology: 1, reactingCenterStatus: 4 });
    const renderer: any = Object.create(BondRenderer.prototype);
    const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    renderer.rootElement = select(root);
    renderer.bond = { id: 7 };
    Object.defineProperty(renderer, 'halfEdges', { value: [{}, {}] });
    Object.defineProperty(renderer, 'bondVectors', { value: { startPosition: new Vec2(0, 0), endPosition: new Vec2(40, 0) } });
    renderer.getDoubleBondShift = () => 0;
    const settings = { showQueryIndicators: true };
    Object.defineProperty(renderer, 'editorSettings', { value: settings });
    renderer.appendTopologyMark(bond);
    renderer.appendReactingCenterMark(bond);
    expect(root.querySelector('#topology-bond-7')!.textContent).toBe('rng');
    expect(root.querySelector('#reacting-center-bond-7')).not.toBeNull();
    settings.showQueryIndicators = false;
    renderer.appendTopologyMark(bond);
    expect(root.querySelector('#topology-bond-7')).toBeNull();
    settings.showQueryIndicators = true;
    renderer.appendTopologyMark(bond);
    renderer.appendTopologyMark(bond);
    expect(root.querySelectorAll('#topology-bond-7')).toHaveLength(1);
    bond.showQueryIndicator = false;
    renderer.appendTopologyMark(bond);
    expect(root.querySelector('#topology-bond-7')).toBeNull();
    expect(root.querySelector('#reacting-center-bond-7')).not.toBeNull();
    bond.showReactionIndicator = false;
    renderer.appendReactingCenterMark(bond);
    expect(root.querySelector('#reacting-center-bond-7')).toBeNull();
    bond.showQueryIndicator = true;
    bond.showReactionIndicator = true;
    renderer.appendTopologyMark(bond);
    renderer.appendReactingCenterMark(bond);
    expect(root.querySelector('#topology-bond-7')).not.toBeNull();
    expect(root.querySelector('#reacting-center-bond-7')).not.toBeNull();
  });
});
