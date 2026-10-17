import { fromBondFlipping } from 'application/editor/actions/bond';
import {
  fromFixAngles,
  fromFixLengths,
  fromRotate,
  fromRotate180,
} from 'application/editor/actions/rotate';
import { fromFlatten } from 'application/editor/actions/flatten';
import { fromCenterOnPage } from 'application/editor/actions/centerOnPage';
import * as bondStereoModule from 'application/editor/actions/bondStereo';
import { Action } from 'application/editor/actions';
import { Atom } from 'domain/entities/atom';
import { Bond } from 'domain/entities/bond';
import { Fragment } from 'domain/entities/fragment';
import { Struct } from 'domain/entities/struct';
import { Vec2 } from 'domain/entities/vec2';
import { ReAtom, ReBond } from 'application/render';
import { RxnArrow, RxnArrowMode } from 'domain/entities/rxnArrow';
import { RxnPlus } from 'domain/entities/rxnPlus';
import { SimpleObject, SimpleObjectMode } from 'domain/entities/simpleObject';
import { Text } from 'domain/entities/text';
import { Image } from 'domain/entities/image';
import { AtomMove } from 'application/editor/operations';

function buildRestruct(stereo: number, stereoLabel: string | null = null) {
  const struct = new Struct();

  const resolvedLabel = stereoLabel ?? (stereo ? 'abs' : null);

  const atomBegin = new Atom({
    label: 'C',
    pp: new Vec2(0, 0),
    implicitH: 1,
    stereoLabel: resolvedLabel,
    stereoParity: stereo ? 1 : 0,
    fragment: 0,
  });
  const atomEnd = new Atom({
    label: 'C',
    pp: new Vec2(1, 0),
    implicitH: 1,
    fragment: 0,
  });
  const atomExtra = new Atom({
    label: 'C',
    pp: new Vec2(-1, 0),
    implicitH: 1,
    fragment: 0,
  });

  const beginId = struct.atoms.add(atomBegin);
  const endId = struct.atoms.add(atomEnd);
  const extraId = struct.atoms.add(atomExtra);

  const stereoBond = new Bond({
    begin: beginId,
    end: endId,
    type: Bond.PATTERN.TYPE.SINGLE,
    stereo,
  });
  const extraBond = new Bond({
    begin: beginId,
    end: extraId,
    type: Bond.PATTERN.TYPE.SINGLE,
    stereo: Bond.PATTERN.STEREO.NONE,
  });

  const bondId = struct.bonds.add(stereoBond);
  struct.bonds.add(extraBond);

  const fragment = new Fragment(stereo ? [beginId] : []);
  struct.frags.add(fragment);

  const restruct = {
    molecule: struct,
    atoms: new Map([
      [beginId, new ReAtom(atomBegin)],
      [endId, new ReAtom(atomEnd)],
      [extraId, new ReAtom(atomExtra)],
    ]),
    bonds: new Map([[bondId, new ReBond(stereoBond)]]),
    enhancedFlags: new Map(),
    enhancedFlagsChanged: new Map(),
    atomsChanged: new Map(),
    bondsChanged: new Map(),
    render: { options: { stereoLabelStyle: 'Off' } },
    markAtom: jest.fn(),
    markBond: jest.fn(),
    markItem: jest.fn(),
    markItemRemoved: jest.fn(),
    clearVisel: jest.fn(),
    loopRemove: jest.fn(),
    connectedComponents: new Map(),
  };

  return { restruct, bondId, beginId, endId };
}

describe('fromBondFlipping', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('transfers stereoLabel and stereoParity from old begin to old end for a stereo bond', () => {
    const { restruct, bondId, beginId, endId } = buildRestruct(
      Bond.PATTERN.STEREO.UP,
    );

    fromBondFlipping(restruct as never, bondId);

    const struct = restruct.molecule;
    const beginAtom = struct.atoms.get(beginId);
    const endAtom = struct.atoms.get(endId);

    expect(beginAtom?.stereoLabel).toBeNull();
    expect(beginAtom?.stereoParity).toBe(0);
    expect(endAtom?.stereoLabel).toBe('abs');
    expect(endAtom?.stereoParity).toBe(1);
  });

  it('transfers non-abs stereoLabel (&1) so it is preserved after flip', () => {
    const { restruct, bondId, beginId, endId } = buildRestruct(
      Bond.PATTERN.STEREO.UP,
      '&1',
    );

    fromBondFlipping(restruct as never, bondId);

    const struct = restruct.molecule;
    const beginAtom = struct.atoms.get(beginId);
    const endAtom = struct.atoms.get(endId);

    expect(beginAtom?.stereoLabel).toBeNull();
    expect(endAtom?.stereoLabel).toBe('&1');
  });

  it('moves stereo atom membership from old begin to old end in the fragment', () => {
    const { restruct, bondId, beginId, endId } = buildRestruct(
      Bond.PATTERN.STEREO.DOWN,
    );

    fromBondFlipping(restruct as never, bondId);

    const fragment = restruct.molecule.frags.get(0);
    expect(fragment?.stereoAtoms).not.toContain(beginId);
    expect(fragment?.stereoAtoms).toContain(endId);
  });

  it('does not call fromBondStereoUpdate for a non-stereo bond', () => {
    const spy = jest
      .spyOn(bondStereoModule, 'fromBondStereoUpdate')
      .mockReturnValue(new Action());

    const { restruct, bondId } = buildRestruct(Bond.PATTERN.STEREO.NONE);

    fromBondFlipping(restruct as never, bondId);

    expect(spy).not.toHaveBeenCalled();
  });

  it('swaps bond begin and end after flip', () => {
    const { restruct, bondId, beginId, endId } = buildRestruct(
      Bond.PATTERN.STEREO.DOWN,
    );

    fromBondFlipping(restruct as never, bondId);

    const newBond = Array.from(restruct.molecule.bonds.values()).find(
      (b) => b.begin === endId && b.end === beginId,
    );
    expect(newBond).toBeDefined();
  });
});

describe('fromRotate180', () => {
  it('mirrors coordinates without changing wedge-bond stereochemistry', () => {
    const { restruct, bondId, beginId, endId } = buildRestruct(
      Bond.PATTERN.STEREO.UP,
    );
    const selection = { atoms: [beginId, endId], bonds: [bondId] };

    fromRotate180(restruct as never, selection, 'horizontal', new Vec2(0, 0));

    expect(restruct.molecule.atoms.get(beginId)?.pp.x).toBe(0);
    expect(restruct.molecule.atoms.get(endId)?.pp.x).toBe(-1);
    expect(restruct.molecule.bonds.get(bondId)?.stereo).toBe(
      Bond.PATTERN.STEREO.UP,
    );
  });
});

describe('fromRotate', () => {
  it('rotates a selected structure around the supplied center', () => {
    const { restruct, beginId, endId } = buildRestruct(Bond.PATTERN.STEREO.UP);
    fromRotate(
      restruct as never,
      { atoms: [beginId, endId] },
      new Vec2(0, 0),
      Math.PI / 2,
    );

    expect(restruct.molecule.atoms.get(beginId)?.pp).toEqual(new Vec2(0, 0));
    expect(restruct.molecule.atoms.get(endId)?.pp.x).toBeCloseTo(0);
    expect(restruct.molecule.atoms.get(endId)?.pp.y).toBeCloseTo(1);
  });
});

describe('fixed geometry actions', () => {
  it('normalizes a selected bond to the requested length', () => {
    const { restruct, bondId, beginId, endId } = buildRestruct(
      Bond.PATTERN.STEREO.NONE,
    );
    fromFixLengths(
      restruct as never,
      { atoms: [beginId, endId], bonds: [bondId] },
      2.5,
    );
    const begin = restruct.molecule.atoms.get(beginId)?.pp;
    const end = restruct.molecule.atoms.get(endId)?.pp;
    expect(begin && end ? Vec2.dist(begin, end) : 0).toBeCloseTo(2.5);
  });

  it('sets the first selected local angle while keeping the center fixed', () => {
    const { restruct, beginId, endId } = buildRestruct(
      Bond.PATTERN.STEREO.NONE,
    );
    const extraId = Array.from(restruct.molecule.atoms.keys()).find(
      (id) => id !== beginId && id !== endId,
    ) as number;
    const bonds = Array.from(restruct.molecule.bonds.keys());
    fromFixAngles(
      restruct as never,
      { atoms: [beginId, endId, extraId], bonds },
      (120 * Math.PI) / 180,
    );
    const center = restruct.molecule.atoms.get(beginId)?.pp;
    const first = restruct.molecule.atoms.get(endId)?.pp;
    const second = restruct.molecule.atoms.get(extraId)?.pp;
    expect(
      center && first && second
        ? Vec2.angle(first.sub(center), second.sub(center))
        : 0,
    ).toBeCloseTo((120 * Math.PI) / 180);
  });
});

describe('fromFlatten', () => {
  it('removes depth only from the selected atoms and preserves planar coordinates', () => {
    const { restruct, beginId, endId } = buildRestruct(
      Bond.PATTERN.STEREO.NONE,
    );
    const begin = restruct.molecule.atoms.get(beginId)!;
    const end = restruct.molecule.atoms.get(endId)!;
    begin.pp.z = 3.5;
    end.pp.z = -2;
    fromFlatten(restruct as never, { atoms: [beginId], bonds: [] });
    expect(begin.pp.x).toBe(0);
    expect(begin.pp.y).toBe(0);
    expect(begin.pp.z).toBe(0);
    expect(end.pp.x).toBe(1);
    expect(end.pp.y).toBe(0);
    expect(end.pp.z).toBe(-2);
  });

  it('flattens bond endpoints with undo/redo while retaining isotope and stereo', () => {
    const { restruct, bondId, beginId, endId } = buildRestruct(Bond.PATTERN.STEREO.UP);
    const begin = restruct.molecule.atoms.get(beginId)!;
    const end = restruct.molecule.atoms.get(endId)!;
    begin.pp.z = 3;
    begin.isotope = 13;
    end.pp.z = -2;
    const undo = fromFlatten(restruct as never, { bonds: [bondId] });
    expect(undo.isDummy(restruct as never)).toBe(false);
    expect([begin.pp.z, end.pp.z]).toEqual([0, 0]);
    expect(begin.isotope).toBe(13);
    expect(restruct.molecule.bonds.get(bondId)!.stereo).toBe(Bond.PATTERN.STEREO.UP);
    const redo = undo.perform(restruct as never);
    expect([begin.pp.z, end.pp.z]).toEqual([3, -2]);
    redo.perform(restruct as never);
    expect([begin.pp.z, end.pp.z]).toEqual([0, 0]);
  });

  it('supports native graphic objects and restores each endpoint depth in one history step', () => {
    const { restruct } = buildRestruct(Bond.PATTERN.STEREO.NONE);
    const struct = restruct.molecule;
    const arrow = new RxnArrow({ mode: RxnArrowMode.OpenAngle, pos: [new Vec2(2, 3, 4), new Vec2(5, 6, -1)] });
    const plus = new RxnPlus({ pp: new Vec2(7, 8, 9) });
    const line = new SimpleObject({ mode: SimpleObjectMode.line, pos: [new Vec2(1, 2, 3), new Vec2(4, 5, 6)] });
    const text = new Text({ content: '', position: new Vec2(3, 2, -4), pos: [] });
    const image = new Image('', new Vec2(4, 8, 5), new Vec2(1, 1));
    const selection = {
      rxnArrows: [struct.rxnArrows.add(arrow)], rxnPluses: [struct.rxnPluses.add(plus)],
      simpleObjects: [struct.simpleObjects.add(line)], texts: [struct.texts.add(text)],
      images: [struct.images.add(image)],
    };
    const points = [...arrow.pos, plus.pp, ...line.pos, text.position, image.center()];
    const before = points.map(point => new Vec2(point));
    const undo = fromFlatten(restruct as never, selection);
    expect(points.map(point => point.z)).toEqual(points.map(() => 0));
    expect(points.map(point => [point.x, point.y])).toEqual(before.map(point => [point.x, point.y]));
    const redo = undo.perform(restruct as never);
    expect(points).toEqual(before);
    redo.perform(restruct as never);
    expect(points.map(point => point.z)).toEqual(points.map(() => 0));
  });

  it('does not create history for objects already in the plane', () => {
    const { restruct } = buildRestruct(Bond.PATTERN.STEREO.NONE);
    expect(fromFlatten(restruct as never, null).operations).toHaveLength(0);
    expect(new AtomMove(0, new Vec2(0, 0, 1)).isDummy()).toBe(false);
    expect(new AtomMove(0, new Vec2()).isDummy()).toBe(true);
  });
});

describe('fromCenterOnPage', () => {
  it('moves a selected bond endpoint group to the requested page center', () => {
    const { restruct, beginId, endId } = buildRestruct(
      Bond.PATTERN.STEREO.NONE,
    );
    restruct.bonds = new Map();
    fromCenterOnPage(restruct as never, { atoms: [beginId, endId] }, new Vec2(4, 3));
    expect(restruct.molecule.atoms.get(beginId)?.pp).toEqual(new Vec2(3.5, 3));
    expect(restruct.molecule.atoms.get(endId)?.pp).toEqual(new Vec2(4.5, 3));
  });
});
