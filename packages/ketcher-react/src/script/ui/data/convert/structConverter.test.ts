import {
  Atom,
  Bond,
  IsotopicAbundance,
  Struct,
  SupportedFormat,
} from 'ketcher-core';
import { couldBeSaved } from './structConverter';
import { fromAtom, fromBond, toAtom, toBond } from './structconv';

describe('couldBeSaved isotopic abundance warning', () => {
  it.each(['showQueryIndicator', 'showReactionIndicator'] as const)('warns only about non-KET loss of hidden %s', property => {
    const struct = new Struct();
    struct.bonds.add(new Bond({ begin: 0, end: 1, type: 1, [property]: false }));
    expect(couldBeSaved(struct, SupportedFormat.ket)).toBeNull();
    expect(couldBeSaved(struct, SupportedFormat.mol)).toContain('indicator visibility');
    struct.bonds.get(0)![property] = true;
    expect(couldBeSaved(struct, SupportedFormat.mol)).toBeNull();
  });
  it('warns when a non-KET format would drop isotopic abundance', () => {
    const struct = new Struct();
    struct.atoms.add(
      new Atom({
        label: 'C',
        isotopicAbundance: IsotopicAbundance.Enriched,
      }),
    );

    expect(couldBeSaved(struct, SupportedFormat.ket)).toBeNull();
    expect(couldBeSaved(struct, SupportedFormat.mol)).toContain(
      'does not preserve isotopic abundance query properties',
    );
  });

  it('warns when a non-KET format would drop abnormal-valence permission', () => {
    const struct = new Struct();
    // React tests load ketcher-core's package dist, which may not have been
    // rebuilt from the current Atom source yet.
    struct.atoms.set(0, {
      abnormalValence: true,
      implicitHCount: null,
      isotopicAbundance: IsotopicAbundance.Unspecified,
      queryProperties: {},
    } as Atom);

    expect(couldBeSaved(struct, SupportedFormat.ket)).toBeNull();
    expect(couldBeSaved(struct, SupportedFormat.mol)).toContain(
      'does not preserve ChemDraw abnormal-valence permissions',
    );
  });

  it('warns when a non-KET format would drop Substituents mode and count', () => {
    const struct = new Struct();
    // The React workspace resolves ketcher-core's published dist entry. Use a
    // minimal current-shape fixture so this test remains focused on the save
    // warning while the Core package itself covers Atom and KET behavior.
    struct.atoms.set(0, {
      queryProperties: { substitutionQuery: { mode: 'exactly', count: 4 } },
      isotopicAbundance: IsotopicAbundance.Unspecified,
    } as Atom);
    expect(couldBeSaved(struct, SupportedFormat.ket)).toBeNull();
    expect(couldBeSaved(struct, SupportedFormat.mol)).toContain(
      'does not preserve ChemDraw Substituents mode and count',
    );
  });

  it('warns for the KET-only atom query extensions', () => {
    const struct = new Struct();
    struct.atoms.set(0, {
      implicitHCount: 0,
      queryProperties: {
        unsaturation: 'must-be-absent',
        translation: 'narrow',
      },
      isotopicAbundance: IsotopicAbundance.Unspecified,
    } as Atom);

    expect(couldBeSaved(struct, SupportedFormat.ket)).toBeNull();
    const warning = couldBeSaved(struct, SupportedFormat.mol)!;
    expect(warning).toContain('implicit-hydrogen query constraints');
    expect(warning).toContain('Unsaturation query predicates');
    expect(warning).toContain('Translation query predicates');
  });

  it('calls out ChemDraw extension semantics in SMARTS warnings', () => {
    const struct = new Struct();
    struct.atoms.set(0, {
      queryProperties: {
        unsaturation: 'must-be-present',
        translation: 'equal',
      },
    } as Atom);

    const warning = couldBeSaved(struct, SupportedFormat.smarts)!;
    expect(warning).toContain('Unsaturation predicates');
    expect(warning).toContain('Translation predicates');
  });
});

describe('ChemDraw query form projection', () => {
  it('projects all six atom-query menu families in both directions', () => {
    const atom = {
      alias: null,
      abnormalValence: true,
      label: 'C',
      charge: null,
      isotope: null,
      pseudo: null,
      atomList: null,
      explicitValence: -1,
      radical: 0,
      hCount: 0,
      unsaturatedAtom: 0,
      substitutionCount: 0,
      stereoParity: 0,
      aromaticity: null,
      ringMembership: null,
      ringSize: null,
      connectivity: null,
      chirality: null,
      customQuery: null,
      isotopicAbundance: IsotopicAbundance.Enriched,
      implicitHCount: 0,
      ringBondCount: 4,
      exactChangeFlag: 1,
      invRet: 2,
      queryProperties: {
        substitutionQuery: { mode: 'up-to', count: 3 },
        unsaturation: 'must-be-present',
        translation: 'narrow',
      },
    } as any;

    const form = fromAtom(atom)!;
    expect(form).toMatchObject({
      abnormalValence: true,
      isotopicAbundance: IsotopicAbundance.Enriched,
      implicitHCount: 0,
      ringBondCount: 4,
      exactChangeFlag: true,
      invRet: 2,
      substitutionQueryMode: 'up-to',
      substitutionQueryCount: 3,
      unsaturation: 'must-be-present',
      translation: 'narrow',
    });

    const restored = toAtom(form);
    expect(restored).toMatchObject({
      abnormalValence: true,
      isotopicAbundance: IsotopicAbundance.Enriched,
      implicitHCount: 0,
      ringBondCount: 4,
      exactChangeFlag: 1,
      invRet: 2,
      queryProperties: {
        substitutionQuery: { mode: 'up-to', count: 3 },
        unsaturation: 'must-be-present',
        translation: 'narrow',
      },
    });
  });

  it('projects bond display and double-bond position without losing query fields', () => {
    const bond = {
      begin: 0,
      end: 1,
      type: 2,
      customQuery: null,
      display: 'hollow-wedged',
      doubleBondPosition: 'right',
      topology: 1,
      reactingCenterStatus: 2,
      showQueryIndicator: false,
      showReactionIndicator: false,
    } as any;
    const form = fromBond(bond)!;
    expect(form).toMatchObject({
      display: 'hollow-wedged',
      doubleBondPosition: 'right',
      topology: 1,
      center: 2,
      showQueryIndicator: false,
      showReactionIndicator: false,
    });
    expect(toBond(form)).toMatchObject({
      display: 'hollow-wedged',
      doubleBondPosition: 'right',
      topology: 1,
      reactingCenterStatus: 2,
      showQueryIndicator: false,
      showReactionIndicator: false,
    });
  });
});
