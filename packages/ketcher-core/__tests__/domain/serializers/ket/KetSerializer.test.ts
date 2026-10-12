import * as moleculeToKet from 'domain/serializers/ket/toKet/moleculeToKet';
import * as moleculeToStruct from 'domain/serializers/ket/fromKet/moleculeToStruct';
import * as prepareStructForKet from 'domain/serializers/ket/toKet/prepare';
import * as rgroupToKet from 'domain/serializers/ket/toKet/rgroupToKet';
import * as rgroupToStruct from 'domain/serializers/ket/fromKet/rgroupToStruct';
import * as rxnToKet from 'domain/serializers/ket/toKet/rxnToKet';
import * as rxnToStruct from 'domain/serializers/ket/fromKet/rxnToStruct';
import * as simpleObjectToStruct from 'domain/serializers/ket/fromKet/simpleObjectToStruct';
import * as textToStruct from 'domain/serializers/ket/fromKet/textToStruct';
import * as validate from 'domain/serializers/ket/validate';

import {
  AttachmentPoints,
  AtomList,
  Atom,
  Bond,
  Highlight,
  RGroup,
  RGroupAttachmentPoint,
  RxnArrow,
  RxnPlus,
  SGroup,
  SimpleObject,
  Struct,
  Text,
  Vec2,
} from 'domain/entities';
import {
  contentRgroupStruct,
  moleculeContentStruct,
  moleculeSgroupStruct,
  prepareStruct,
} from './fixtures/toKet';
import {
  errorKet,
  moleculeKet,
  moleculeRgroupKet,
  moleculeSgroupKet,
  preparedKet,
  rxnKet,
  simpleObjectKet,
  textKet,
  withoutHeaderKet,
} from './fixtures/toStruct';

import { KetSerializer } from 'domain/serializers';
import compiledSchema from 'domain/serializers/ket/compiledSchema';
import {
  createPolymerEditorCanvas,
  createRenderersManager,
} from '../../../helpers/dom';
import { CoreEditor } from 'application/editor';

const ket = new KetSerializer();

describe('deserialize (ToStruct)', () => {
  const canvas = createPolymerEditorCanvas();
  // @ts-expect-error TS6133: Instantiated for side effects (singleton registration)
  const _editor = new CoreEditor({
    canvas,
    theme: {},
    renderersContainer: createRenderersManager(),
  });
  const parsedPrepareContent = JSON.parse(preparedKet);
  const deserData = ket.deserialize(preparedKet);
  it('correct work with atoms', () => {
    const preparedAtoms = parsedPrepareContent.mol0.atoms;
    preparedAtoms.forEach((props, id) => {
      const locationWithNegativeY = props.location.map((coordinate, index) => {
        return index === 1 ? -coordinate : coordinate;
      });
      const relatedAtom = deserData.atoms.get(id);
      const label = props.type === 'rg-label' ? 'R#' : 'C';
      // const vec = new Vec2(...props.location)
      const vec = new Vec2(...locationWithNegativeY);
      expect(label).toEqual(relatedAtom!.label);
      expect(vec).toEqual(relatedAtom!.pp);
    });
  });
  it('correct work with bonds', () => {
    const preparedBonds = parsedPrepareContent.mol0.bonds;
    preparedBonds.forEach((props, id) => {
      const relatedBond = deserData.bonds.get(id);
      expect(props.type).toEqual(relatedBond!.type);
      expect(props.atoms[0]).toEqual(relatedBond!.begin);
      expect(props.atoms[1]).toEqual(relatedBond!.end);
    });
  });
  it('struct should not have name attr', () => {
    expect(ket.deserialize(withoutHeaderKet).name).toBeFalsy();
  });
  it('rxnToStruct', () => {
    const spy = jest.spyOn(rxnToStruct, 'rxnToStruct');
    ket.deserialize(rxnKet);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.results[0].value.rxnArrows).toBeDefined();
    expect(
      spy.mock.results[0].value.rxnArrows.get(0) instanceof RxnArrow,
    ).toBeTruthy();
    expect(spy.mock.results[0].value.rxnArrows.size).toEqual(1);
    expect(spy.mock.results[0].value.rxnArrows.get(0).mode).toEqual(
      'open-angle',
    );
    expect(spy.mock.results[1].value.rxnPluses).toBeDefined();
    expect(
      spy.mock.results[0].value.rxnPluses.get(0) instanceof RxnPlus,
    ).toBeTruthy();
    expect(spy.mock.results[1].value.rxnPluses.size).toEqual(2);
  });
  it('simpleObjectToStruct', () => {
    const spy = jest.spyOn(simpleObjectToStruct, 'simpleObjectToStruct');
    ket.deserialize(simpleObjectKet);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.results[0].value.simpleObjects).toBeDefined();
    expect(spy.mock.results[0].value.simpleObjects.size).toEqual(1);
    expect(spy.mock.results[0].value.simpleObjects.get(0).mode).toEqual(
      'ellipse',
    );
    expect(
      spy.mock.results[0].value.simpleObjects.get(0) instanceof SimpleObject,
    ).toBeTruthy();
  });

  it('round-trips a simple-object line style', () => {
    const source = JSON.stringify({
      ket_version: '1.0.0',
      root: {
        nodes: [
          {
            type: 'simpleObject',
            data: {
              mode: 'line',
              style: 'dashed',
              pos: [{ x: 1, y: 2 }, { x: 4, y: 2 }],
            },
          },
        ],
      },
    });
    const struct = ket.deserializeMicromolecules(source);
    expect(struct.simpleObjects.get(0)?.style).toBe('dashed');
    const serialized = JSON.parse(ket.serializeMicromolecules(struct));
    expect(serialized.root.nodes[0].data.style).toBe('dashed');
  });
  it('round-trips simple-object endpoint arrows', () => {
    const source = JSON.stringify({
      ket_version: '1.0.0',
      root: {
        nodes: [
          {
            type: 'simpleObject',
            data: {
              mode: 'line',
              startArrow: 'half-left',
              endArrow: 'full',
              pos: [{ x: 1, y: 2 }, { x: 4, y: 2 }],
            },
          },
        ],
      },
    });
    const struct = ket.deserializeMicromolecules(source);
    expect(struct.simpleObjects.get(0)?.startArrow).toBe('half-left');
    expect(struct.simpleObjects.get(0)?.endArrow).toBe('full');
    const serialized = JSON.parse(ket.serializeMicromolecules(struct));
    expect(serialized.root.nodes[0].data.startArrow).toBe('half-left');
    expect(serialized.root.nodes[0].data.endArrow).toBe('full');
  });
  it('round-trips composable simple-object curve decorations', () => {
    const source = JSON.stringify({
      ket_version: '1.0.0',
      root: {
        nodes: [
          {
            type: 'simpleObject',
            data: {
              mode: 'polyline',
              doubled: true,
              closed: true,
              fill: 'shaded',
              faded: true,
              pos: [{ x: 1, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 4 }],
            },
          },
        ],
      },
    });
    const struct = ket.deserializeMicromolecules(source);
    const item = struct.simpleObjects.get(0);
    expect(item?.doubled).toBe(true);
    expect(item?.closed).toBe(true);
    expect(item?.fill).toBe('shaded');
    expect(item?.faded).toBe(true);
    const serialized = JSON.parse(ket.serializeMicromolecules(struct));
    expect(serialized.root.nodes[0].data).toMatchObject({
      doubled: true,
      closed: true,
      fill: 'shaded',
      faded: true,
    });
  });
  it('round-trips independent bracket object geometry and shape', () => {
    const source = JSON.stringify({
      ket_version: '2.0.0',
      root: {
        nodes: [{
          type: 'simpleObject',
          data: {
            mode: 'bracket',
            bracketType: 'brace',
            pos: [{ x: 1, y: 2 }, { x: 4, y: 8 }],
          },
        }],
      },
    });
    const struct = ket.deserializeMicromolecules(source);
    expect(struct.simpleObjects.get(0)?.mode).toBe('bracket');
    expect(struct.simpleObjects.get(0)?.bracketType).toBe('brace');
    const serialized = JSON.parse(ket.serializeMicromolecules(struct));
    expect(serialized.root.nodes[0].data).toMatchObject({ mode: 'bracket', bracketType: 'brace' });
  });
  it('textToStruct', () => {
    const spy = jest.spyOn(textToStruct, 'textToStruct');
    ket.deserialize(textKet);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.results[0].value.texts).toBeDefined();
    expect(spy.mock.results[0].value.texts.get(0) instanceof Text).toBeTruthy();
  });
  it('moleculeToStruct', () => {
    const spy = jest.spyOn(moleculeToStruct, 'moleculeToStruct');
    ket.deserialize(moleculeKet);
    expect(spy).toHaveBeenCalled();
    // atoms
    expect(spy.mock.results[0].value.atoms.get(0).label).toEqual('R#');
    expect(spy.mock.results[1].value.atoms.get(2).charge).toEqual(5);
    expect(spy.mock.results[1].value.atoms.get(4).label).toEqual('L#');
    expect(
      spy.mock.results[1].value.atoms.get(4).atomList instanceof AtomList,
    ).toBeTruthy();
    expect(spy.mock.results[1].value.atoms.get(4).atomList.ids).toEqual([4, 3]);
    expect(spy.mock.results[1].value.atoms.size).toEqual(7);
    // bonds
    expect(spy.mock.results[1].value.bonds.size).toEqual(7);
    expect(spy.mock.results[1].value.bonds.get(6).stereo).toBeTruthy();
    expect(spy.mock.results[1].value.bonds.get(0).type).toEqual(1);
    expect(spy.mock.results[1].value.bonds.get(1).type).toEqual(2);
    // sgroups
    ket.deserialize(moleculeSgroupKet);
    expect(spy.mock.results[2].value.sgroups.get(0).type).toEqual('GEN');
    expect(spy.mock.results[3].value.sgroups.get(0).type).toEqual('MUL');
    expect(spy.mock.results[3].value.sgroups.get(0).data.mul).toEqual(1);
    expect(spy.mock.results[3].value.sgroups.get(0).data.bracketStyle).toEqual(
      'brackets',
    );
    expect(spy.mock.results[4].value.sgroups.get(0).type).toEqual('SRU');
    expect(spy.mock.results[4].value.sgroups.get(0).data.subscript).toEqual(
      'n',
    );
    expect(spy.mock.results[4].value.sgroups.get(0).data.connectivity).toEqual(
      'ht',
    );
    expect(spy.mock.results[5].value.sgroups.get(0).type).toEqual('MUL');
    expect(spy.mock.results[5].value.sgroups.get(0).data.mul).toEqual(3);
    expect(spy.mock.results[6].value.sgroups.get(0).type).toEqual('SUP');
    expect(spy.mock.results[6].value.sgroups.get(0).data.name).toEqual('B');
    expect(spy.mock.results[7].value.sgroups.get(0).type).toEqual('SRU');
    expect(spy.mock.results[7].value.sgroups.get(0).data.subscript).toEqual(
      'n',
    );
    expect(spy.mock.results[7].value.sgroups.get(0).data.connectivity).toEqual(
      'hh',
    );
  });
  it('rgroupToStruct', () => {
    const spy = jest.spyOn(rgroupToStruct, 'rgroupToStruct');
    ket.deserialize(moleculeRgroupKet);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.results[0].value).toBeTruthy();
    expect(spy.mock.results[0].value.atoms.size).toEqual(4);
    expect(spy.mock.results[0].value.bonds.size).toEqual(3);
    expect(spy.mock.results[0].value.rgroups.get(14)).toBeTruthy();
    expect(
      spy.mock.results[0].value.rgroups.get(14) instanceof RGroup,
    ).toBeTruthy();
  });
  it('validation function', () => {
    const spy = jest.spyOn(validate, 'validate');
    ket.deserialize(preparedKet);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.results[0].value).toBeTruthy();
    expect(() => ket.deserialize(errorKet)).toThrow(
      'Cannot deserialize input JSON.',
    );
    expect(spy.mock.results[1].value).toBeFalsy();
  });
});

describe('serialize (ToKet)', () => {
  const canvas = createPolymerEditorCanvas();
  // @ts-expect-error TS6133: Instantiated for side effects (singleton registration)
  const _editor = new CoreEditor({
    canvas,
    theme: {},
    renderersContainer: createRenderersManager(),
  });
  const parsedNewPrepareStruct = JSON.parse(ket.serialize(prepareStruct));
  const parsedPrepareContent = JSON.parse(preparedKet);
  it('correct work with atoms', () => {
    parsedNewPrepareStruct.mol0.atoms.forEach((atom, id) => {
      const relatedAtom = parsedPrepareContent.mol0.atoms[id];
      relatedAtom.location[1] = -relatedAtom.location[1];
      expect(atom).toEqual(relatedAtom);
    });
  });
  it('correct work with bonds', () => {
    parsedNewPrepareStruct.mol0.bonds.forEach((bond, id) => {
      const relatedBond = parsedPrepareContent.mol0.bonds[id];
      expect(bond).toEqual(relatedBond);
    });
  });
  it('correct work with simple object', () => {
    const structSimpleObject = parsedNewPrepareStruct.root.nodes[3];
    const simpleObjectKet = parsedPrepareContent.root.nodes[0];
    expect(structSimpleObject).toEqual(simpleObjectKet);
  });
  it('correct work with text', () => {
    const structText = parsedNewPrepareStruct.root.nodes[4];
    const textKet = parsedPrepareContent.root.nodes[4];
    expect(structText).toEqual(textKet);
  });
  it('correct work with rxnArrow', () => {
    const structArrow = parsedNewPrepareStruct.root.nodes[1];
    const arrowKet = parsedPrepareContent.root.nodes[2];
    expect(structArrow).toEqual(arrowKet);
  });
  it('correct work with rxnPlus', () => {
    const structPlus = parsedNewPrepareStruct.root.nodes[2];
    const plusKet = parsedPrepareContent.root.nodes[3];
    expect(structPlus).toEqual(plusKet);
  });
  it('moleculeToKet', () => {
    const spy = jest.spyOn(moleculeToKet, 'moleculeToKet');
    ket.serialize(moleculeContentStruct);
    // atoms
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.results[0].value.atoms[0].type).toEqual('rg-label');
    expect(spy.mock.results[1].value.atoms[2].charge).toEqual(5);
    expect(
      spy.mock.results[1].value.atoms.filter(
        (item) => item.type === 'atom-list',
      ),
    ).toBeTruthy();
    expect(spy.mock.results[1].value.atoms[4].elements).toEqual(['Be', 'Li']);
    expect(spy.mock.results[1].value.atoms.length).toEqual(7);
    // bonds
    expect(spy.mock.results[1].value.bonds.length).toEqual(7);
    expect(
      spy.mock.results[1].value.bonds.filter((bond) => bond.stereo).length,
    ).toEqual(1);
    expect(
      spy.mock.results[1].value.bonds.filter((bond) => bond.type === 1).length,
    ).toEqual(4);
    expect(
      spy.mock.results[1].value.bonds.filter((bond) => bond.type === 2).length,
    ).toEqual(3);
    // sgroups
    ket.serialize(moleculeSgroupStruct);
    expect(spy.mock.results[2].value.sgroups[0].type).toEqual('GEN');
    expect(spy.mock.results[2].value.sgroups[1].type).toEqual('MUL');
    expect(spy.mock.results[2].value.sgroups[1].mul).toEqual(1);
    expect(spy.mock.results[2].value.sgroups[2].type).toEqual('SRU');
    expect(spy.mock.results[2].value.sgroups[2].subscript).toEqual('n');
    expect(spy.mock.results[2].value.sgroups[2].connectivity).toEqual('HT');
    expect(spy.mock.results[2].value.sgroups[3].type).toEqual('MUL');
    expect(spy.mock.results[2].value.sgroups[3].mul).toEqual(1);
    expect(spy.mock.results[2].value.sgroups[4].type).toEqual('SUP');
    expect(spy.mock.results[2].value.sgroups[5].subscript).toEqual('n');
    expect(spy.mock.results[2].value.sgroups[5].connectivity).toEqual('HT');
  });
  it('round-trips ChemDraw bond display attributes', () => {
    const bond = moleculeContentStruct.bonds.get(0)!;
    const originalDisplay = bond.display;
    const originalPosition = bond.doubleBondPosition;
    bond.display = 'hollow-wedged';
    bond.doubleBondPosition = 'right';
    const serialized = ket.serialize(moleculeContentStruct);
    const parsed = JSON.parse(serialized);
    const moleculeData = Object.values(parsed).find((item: any) => item?.type === 'molecule' && Array.isArray(item.bonds)) as any;
    expect(moleculeData.bonds.some((item) => item.display === 'hollow-wedged')).toBe(true);
    expect(moleculeData.bonds.some((item) => item.doubleBondPosition === 'right')).toBe(true);
    const restored = ket.deserialize(serialized);
    expect(Array.from(restored.bonds.values()).some((item) => item.display === 'hollow-wedged')).toBe(true);
    expect(Array.from(restored.bonds.values()).some((item) => item.doubleBondPosition === 'right')).toBe(true);
    bond.display = originalDisplay;
    bond.doubleBondPosition = originalPosition;
  });
  it('round-trips alternate S-group bracket styles and defaults older KET data', () => {
    const struct = new Struct();
    struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, 0) }));
    const sgroup = new SGroup('MUL');
    sgroup.atoms = [0];
    sgroup.data.mul = 3;
    sgroup.data.bracketStyle = 'braces';
    struct.sgroups.add(sgroup);

    const molecule = moleculeToKet.moleculeToKet(struct);
    const parsed = { root: { nodes: [{ $ref: 'mol0' }] }, mol0: molecule };
    expect(compiledSchema(parsed)).toBe(true);
    expect(molecule.sgroups[0].bracketStyle).toBe('braces');

    const restored = moleculeToStruct.moleculeToStruct(molecule);
    expect(restored.sgroups.get(0)?.data.bracketStyle).toBe('braces');

    const legacyMolecule = { ...molecule, sgroups: molecule.sgroups.map((group: any) => {
      const { bracketStyle: _bracketStyle, ...legacyGroup } = group;
      return legacyGroup;
    }) };
    const legacyRestored = moleculeToStruct.moleculeToStruct(legacyMolecule);
    expect(legacyRestored.sgroups.get(0)?.data.bracketStyle).toBe('brackets');
  });
  it('round-trips colored highlights across split molecule fragments', () => {
    const struct = new Struct();
    struct.atoms.add(
      new Atom({
        label: 'C',
        pp: new Vec2(0, 0),
        attachmentPoints: AttachmentPoints.FirstSideOnly,
      }),
    );
    struct.atoms.add(new Atom({ label: 'C', pp: new Vec2(1, 0) }));
    struct.atoms.add(new Atom({ label: 'O', pp: new Vec2(4, 0) }));
    struct.bonds.add(
      new Bond({
        begin: 0,
        end: 1,
        type: Bond.PATTERN.TYPE.SINGLE,
      }),
    );
    const attachmentPointId = struct.rgroupAttachmentPoints.add(
      new RGroupAttachmentPoint(0, 'primary'),
    );
    struct.highlights.add(
      new Highlight({
        atoms: [0, 2],
        bonds: [0],
        rgroupAttachmentPoints: [attachmentPointId],
        color: '#fff59d',
      }),
    );
    struct.markFragments();

    const serialized = ket.serializeMicromolecules(struct);
    const parsed = JSON.parse(serialized);
    expect(compiledSchema(parsed)).toBe(true);
    expect(Object.values(parsed).filter((item: any) => item?.coloredHighlights)).toHaveLength(2);

    const restored = ket.deserializeMicromolecules(serialized);
    const highlights = Array.from(restored.highlights.values()).map((highlight) => ({
      atoms: highlight.atoms,
      bonds: highlight.bonds,
      rgroupAttachmentPoints: highlight.rgroupAttachmentPoints,
      color: highlight.color,
    }));
    expect(highlights).toEqual([
      {
        atoms: [0],
        bonds: [0],
        rgroupAttachmentPoints: [0],
        color: '#fff59d',
      },
      {
        atoms: [2],
        bonds: [],
        rgroupAttachmentPoints: [],
        color: '#fff59d',
      },
    ]);
  });
  it('round-trips isotopic abundance independently from isotope mass', () => {
    const struct = new Struct();
    struct.atoms.add(
      new Atom({ label: 'C', pp: new Vec2(0, 0), isotope: 13, isotopicAbundance: 3 }),
    );

    const serialized = ket.serialize(struct);
    const parsed = JSON.parse(serialized);
    const molecule = Object.values(parsed).find(
      (item: any) => item?.type === 'molecule' && Array.isArray(item.atoms),
    ) as any;
    expect(compiledSchema(parsed)).toBe(true);
    expect(molecule.atoms[0]).toMatchObject({ isotope: 13, isotopicAbundance: 3 });

    const restored = ket.deserialize(serialized);
    expect(restored.atoms.get(0)?.isotope).toBe(13);
    expect(restored.atoms.get(0)?.isotopicAbundance).toBe(3);
    expect(
      compiledSchema({
        root: { nodes: [{ $ref: 'mol0' }] },
        mol0: { type: 'molecule', atoms: [{ label: 'C', location: [0, 0], isotopicAbundance: 6 }], bonds: [], sgroups: [] },
      }),
    ).toBe(false);
  });
  it('round-trips the atom-level abnormal-valence permission', () => {
    const struct = new Struct();
    struct.atoms.add(
      new Atom({
        label: 'C',
        pp: new Vec2(0, 0),
        abnormalValence: true,
      }),
    );

    const serialized = ket.serialize(struct);
    const parsed = JSON.parse(serialized);
    const molecule = Object.values(parsed).find(
      (item: any) => item?.type === 'molecule' && Array.isArray(item.atoms),
    ) as any;
    expect(compiledSchema(parsed)).toBe(true);
    expect(molecule.atoms[0].abnormalValence).toBe(true);
    expect(ket.deserialize(serialized).atoms.get(0)?.abnormalValence).toBe(true);
    expect(
      compiledSchema({
        root: { nodes: [{ $ref: 'mol0' }] },
        mol0: {
          type: 'molecule',
          atoms: [{ label: 'C', location: [0, 0], abnormalValence: 'allowed' }],
          bonds: [],
          sgroups: [],
        },
      }),
    ).toBe(false);
  });
  it('round-trips all ChemDraw Substituents query combinations', () => {
    const choices = [
      null,
      ...(['free-sites', 'up-to', 'exactly'] as const).flatMap((mode) =>
        ([0, 1, 2, 3, 4] as const).map((count) => ({ mode, count })),
      ),
    ];
    const struct = new Struct();
    choices.forEach((substitutionQuery, index) => {
      struct.atoms.add(
        new Atom({
          label: 'C',
          pp: new Vec2(index, 0),
          queryProperties: { substitutionQuery },
        }),
      );
    });

    const serialized = ket.serialize(struct);
    const parsed = JSON.parse(serialized);
    expect(compiledSchema(parsed)).toBe(true);
    const restored = ket.deserialize(serialized);
    expect(
      Array.from(restored.atoms.values()).map(
        (atom) => atom.queryProperties.substitutionQuery,
      ),
    ).toEqual(choices);
  });
  it('clones Substituents query data and treats it as an atom query', () => {
    const atom = new Atom({
      label: 'C',
      queryProperties: {
        substitutionQuery: { mode: 'up-to', count: 3 },
      },
    });
    const clone = atom.clone();
    expect(clone.isQuery()).toBe(true);
    expect(clone.isPlainCarbon()).toBe(false);
    expect(clone.queryProperties.substitutionQuery).toEqual({ mode: 'up-to', count: 3 });
    expect(clone.queryProperties.substitutionQuery).not.toBe(atom.queryProperties.substitutionQuery);
  });
  it('round-trips ChemDraw atom query menu fields', () => {
    const struct = new Struct();
    const fields = [
      {
        implicitHCount: 0,
      },
      {
        ringBondCount: 4,
      },
      {
        queryProperties: { unsaturation: 'must-be-present' },
      },
      {
        exactChangeFlag: 1,
      },
      {
        invRet: 2,
      },
      {
        queryProperties: { translation: 'narrow' },
      },
    ] as const;
    fields.forEach((attrs, index) => {
      struct.atoms.add(
        new Atom({ label: 'C', pp: new Vec2(index, 0), ...attrs }),
      );
    });

    const serialized = ket.serialize(struct);
    const parsed = JSON.parse(serialized);
    expect(compiledSchema(parsed)).toBe(true);
    const restored = ket.deserialize(serialized);
    const atoms = Array.from(restored.atoms.values());
    expect(atoms[0].implicitHCount).toBe(0);
    expect(atoms[0].isQuery()).toBe(true);
    expect(atoms[1].ringBondCount).toBe(4);
    expect(atoms[2].queryProperties.unsaturation).toBe('must-be-present');
    expect(atoms[3].exactChangeFlag).toBe(1);
    expect(atoms[4].invRet).toBe(2);
    expect(atoms[5].queryProperties.translation).toBe('narrow');
  });
  it('rgroupToKet', () => {
    const spy = jest.spyOn(rgroupToKet, 'rgroupToKet');
    const result = JSON.parse(ket.serialize(contentRgroupStruct)).rg14;
    expect(spy).toHaveBeenCalled();
    expect(result).toBeTruthy();
    expect(result.atoms.length).toEqual(4);
    expect(result.bonds.length).toEqual(3);
    expect(result.rlogic.number).toEqual(14);
  });
  it('rxnToKet', () => {
    const spyArrow = jest.spyOn(rxnToKet, 'arrowToKet');
    const spyPlus = jest.spyOn(rxnToKet, 'plusToKet');
    const result = JSON.parse(ket.serialize(prepareStruct));
    const plus = result.root.nodes.filter((item) => item.type === 'plus');
    const arrow = result.root.nodes.filter((item) => item.type === 'arrow');
    expect(spyArrow).toHaveBeenCalled();
    expect(spyPlus).toHaveBeenCalled();
    expect(plus.length).toEqual(1);
    expect(arrow.length).toEqual(1);
    expect(arrow[0].data.mode).toEqual('open-angle');
  });
  it('prepareStructForKet', () => {
    const spy = jest.spyOn(prepareStructForKet, 'prepareStructForKet');
    ket.serialize(prepareStruct);
    expect(spy).toHaveBeenCalled();
    expect(
      spy.mock.results[0].value.filter((item) => item.type === 'molecule')
        .length,
    ).toEqual(1);
    expect(
      spy.mock.results[0].value.filter((item) => item.type === 'molecule')[0]
        .fragment.atoms.size,
    ).toEqual(6);
    expect(
      spy.mock.results[0].value.filter((item) => item.type === 'molecule')[0]
        .fragment.bonds.size,
    ).toEqual(6);
    expect(
      spy.mock.results[0].value.filter((item) => item.type === 'arrow').length,
    ).toBeTruthy();
    expect(
      spy.mock.results[0].value.filter((item) => item.type === 'arrow')[0].data
        .mode,
    ).toEqual('open-angle');
    expect(
      spy.mock.results[0].value.filter((item) => item.type === 'plus').length,
    ).toBeTruthy();
    expect(
      spy.mock.results[0].value.filter((item) => item.type === 'simpleObject')
        .length,
    ).toBeTruthy();
    expect(
      spy.mock.results[0].value.filter(
        (item) => item.type === 'simpleObject',
      )[0].data.mode,
    ).toEqual('rectangle');
    expect(
      spy.mock.results[0].value.filter((item) => item.type === 'text').length,
    ).toBeTruthy();
  });
});
