import { massToChargeFromKet } from '../massToCharge';

const ket = (atoms: unknown[], bonds: unknown[] = [], extra: unknown[] = []) =>
  JSON.stringify({
    root: { nodes: [{ $ref: 'mol0' }, ...extra] },
    mol0: { type: 'molecule', atoms, bonds },
  });

describe('massToChargeFromKet', () => {
  it.each([
    ['Na', 1, '22.9897690', 22.9892204201],
    ['Cl', -1, '34.9688530', 34.9694015799],
    ['Ca', 2, '39.9625931', 19.9807479701],
    ['H', 1, '1.0078250', 1.0072764201],
  ])(
    'applies the electron-mass correction to %s, charge %i',
    (label, charge, mass, expected) => {
      const result = massToChargeFromKet(ket([{ label, charge }]), mass);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.charge).toBe(charge);
        expect(result.mz).toBeCloseTo(expected, 9);
      }
    },
  );

  it('accepts Ketcher single atoms without an explicit bonds array', () => {
    const source = JSON.stringify({
      root: { nodes: [{ $ref: 'mol0' }] },
      mol0: { type: 'molecule', atoms: [{ label: 'Na', charge: 1 }] },
    });
    expect(massToChargeFromKet(source, 22.989769).ok).toBe(true);
  });

  it('handles connected ions and ignores nonchemical text on the canvas', () => {
    const source = ket(
      [{ label: 'C' }, { label: 'N', charge: 1 }],
      [{ type: 1, atoms: [0, 1] }],
      [{ type: 'text', data: 'note' }],
    );
    expect(massToChargeFromKet(source, '32.0500').ok).toBe(true);
  });

  it('does not infer ions for neutral structures or combine separate components', () => {
    expect(massToChargeFromKet(ket([{ label: 'C' }]), '12')).toEqual({
      ok: false,
      reason: 'neutral',
    });
    expect(
      massToChargeFromKet(
        ket([
          { label: 'Na', charge: 1 },
          { label: 'Cl', charge: -1 },
        ]),
        '58.0',
      ),
    ).toEqual({ ok: false, reason: 'complex-structure' });
    expect(
      massToChargeFromKet(
        ket([{ label: 'Na', charge: 1 }], [], [{ type: 'arrow' }]),
        '23',
      ),
    ).toEqual({ ok: false, reason: 'complex-structure' });
  });

  it('rejects query structures, malformed graphs and nonnumeric or mixed masses', () => {
    const cases = [
      ket([{ label: 'R#', charge: 1 }]),
      ket([{ label: 'C', charge: 1, hCount: 2 }]),
      ket([{ label: 'N', charge: 1, implicitHCount: 0 }]),
      ket(
        [{ label: 'C', charge: 1 }, { label: 'O' }],
        [{ type: 5, atoms: [0, 1] }],
      ),
      ket(
        [{ label: 'C', charge: 1 }, { label: 'O' }],
        [{ type: 1, atoms: [0, 2] }],
      ),
    ];
    for (const source of cases)
      expect(massToChargeFromKet(source, '12')).toEqual({
        ok: false,
        reason: 'complex-structure',
      });
    for (const mass of ['', '23; 35', 'NaN', -1, Infinity]) {
      expect(
        massToChargeFromKet(ket([{ label: 'Na', charge: 1 }]), mass),
      ).toEqual({ ok: false, reason: 'invalid-mass' });
    }
    expect(massToChargeFromKet('{', '23')).toEqual({
      ok: false,
      reason: 'invalid-ket',
    });
  });
});
