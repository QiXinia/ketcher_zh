import type { Struct } from 'ketcher-core';
import {
  collectCheckErrorLocations,
  locationsForWarnings,
} from './checkLocations';

describe('check warning locations', () => {
  it('indexes local atom and bond warning candidates', () => {
    const atoms = new Map([
      [
        0,
        {
          badConn: true,
          radical: 1,
          pp: { x: 0, y: 0 },
          atomList: null,
          queryProperties: { customQuery: 'A', unsaturation: 0 },
          isPseudo: () => false,
          stereoParity: 1,
          stereoLabel: null,
          label: 'C',
          rglabel: null,
        },
      ],
      [
        1,
        {
          badConn: false,
          radical: 0,
          pp: { x: 2, y: 2 },
          atomList: null,
          queryProperties: { customQuery: null, unsaturation: 0 },
          isPseudo: () => true,
          stereoParity: 0,
          stereoLabel: null,
          label: 'X',
          rglabel: null,
        },
      ],
      [
        2,
        {
          badConn: false,
          radical: 0,
          pp: { x: 0, y: 2 },
          atomList: null,
          queryProperties: { customQuery: null, unsaturation: 0 },
          isPseudo: () => false,
          stereoParity: 0,
          stereoLabel: null,
          label: 'C',
          rglabel: null,
        },
      ],
      [
        3,
        {
          badConn: false,
          radical: 0,
          pp: { x: 2, y: 0 },
          atomList: null,
          queryProperties: { customQuery: null, unsaturation: 0 },
          isPseudo: () => false,
          stereoParity: 0,
          stereoLabel: null,
          label: 'C',
          rglabel: null,
        },
      ],
      [
        4,
        {
          badConn: false,
          radical: 0,
          pp: { x: 0, y: 2, z: 1 },
          atomList: null,
          queryProperties: { customQuery: null, unsaturation: 0 },
          isPseudo: () => false,
          stereoParity: 0,
          stereoLabel: null,
          label: 'C',
          rglabel: null,
        },
      ],
    ]);
    const bonds = new Map([
      [0, { begin: 0, end: 1, isQuery: () => true, stereo: 0 }],
      [1, { begin: 2, end: 3, isQuery: () => false, stereo: 0 }],
    ]);
    const struct = {
      atoms,
      bonds,
      frags: new Map([[0, { enhancedStereoFlag: 'ABS', stereoAtoms: [0] }]]),
    } as unknown as Struct;

    const locations = collectCheckErrorLocations(struct, [
      'valence',
      'radicals',
      'pseudoatoms',
      'query',
      'stereo',
      'chiral_flag',
      '3d',
      'overlapping_atoms',
      'overlapping_bonds',
    ]);

    expect(locations.valence?.atoms).toEqual([0]);
    expect(locations.radicals?.atoms).toEqual([0]);
    expect(locations.pseudoatoms?.atoms).toEqual([1]);
    expect(locations.query?.atoms).toEqual([0]);
    expect(locations.query?.bonds).toEqual([{ id: 0, begin: 0, end: 1 }]);
    expect(locations.stereo?.atoms).toEqual([0]);
    expect(locations.chiral_flag?.atoms).toEqual([0]);
    expect(locations['3d']?.atoms).toEqual([4]);
    expect(locations.overlapping_atoms?.atoms).toEqual([2, 4]);
    expect(locations.overlapping_bonds?.bonds).toEqual([
      { id: 0, begin: 0, end: 1 },
      { id: 1, begin: 2, end: 3 },
    ]);
  });

  it('keeps locations only for warning types returned by the checker', () => {
    const locations = {
      query: { atoms: [1], bonds: [] },
      radicals: { atoms: [2], bonds: [] },
    };

    expect(locationsForWarnings(locations, { query: 'Query warning' })).toEqual(
      {
        query: { atoms: [1], bonds: [] },
      },
    );
  });
});
