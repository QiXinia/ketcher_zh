import { addCrippenLogP } from './indigoCalculateExtras';
import loadIndigo from 'indigo-ketcher';

describe('Crippen cLogP calculation', () => {
  it('adds the actual Indigo estimate for a KET ethanol structure', async () => {
    const indigo = await loadIndigo();
    const options = new indigo.MapStringString();
    const selectedAtoms = new indigo.VectorInt();
    const ket = JSON.stringify({
      root: { nodes: [{ $ref: 'mol0' }] },
      mol0: {
        type: 'molecule',
        atoms: [
          { label: 'C', location: [0, 0, 0] },
          { label: 'C', location: [1, 0, 0] },
          { label: 'O', location: [2, 0, 0] },
        ],
        bonds: [
          { type: 1, atoms: [0, 1] },
          { type: 1, atoms: [1, 2] },
        ],
      },
    });
    try {
      const calculated = indigo.calculate(ket, options, selectedAtoms);
      const result = JSON.parse(
        addCrippenLogP(calculated, () => indigo.logp(ket, options)),
      );
      expect(result).toMatchObject(JSON.parse(calculated));
      expect(result['crippen-logp']).toBeCloseTo(-0.0014, 6);
    } finally {
      selectedAtoms.delete();
      options.delete();
    }
  });

  it.each(['', 'NaN', 'Infinity', '1.2; 3.4', null])(
    'does not invent a result when Indigo returns %s',
    (result) => {
      expect(addCrippenLogP('{"gross":"C"}', () => result)).toBe(
        '{"gross":"C"}',
      );
    },
  );

  it('preserves the original calculation when Indigo fails or the payload is invalid', () => {
    expect(
      addCrippenLogP('{"gross":"C"}', () => {
        throw new Error('calculation unavailable');
      }),
    ).toBe('{"gross":"C"}');
    expect(addCrippenLogP('[]', () => '1')).toBe('[]');
    expect(addCrippenLogP('{', () => '1')).toBe('{');
  });
});
