import { analyse } from './index';
import { massToChargeFromKet } from 'ketcher-core';

jest.mock('ketcher-core', () => ({
  ChemicalMimeType: { KET: 'chemical/x-indigo-ket' },
  KetcherLogger: { error: jest.fn() },
  KetSerializer: class {
    serialize(struct: { ket: string }) {
      return struct.ket;
    }
  },
  massToChargeFromKet: jest.fn(() => ({ ok: true, mz: 22.9892204201 })),
}));
jest.mock('../options/actions', () => ({ appUpdate: jest.fn() }));
jest.mock('../options', () => ({ setStruct: jest.fn() }));
jest.mock('../modal/form', () => ({ checkErrors: jest.fn() }));
jest.mock('../request', () => ({ indigoVerification: jest.fn() }));
jest.mock('../shared', () => ({ load: jest.fn() }));
jest.mock('../../../../i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

function fixture(
  selection: object | null,
  changeDuringCalculate = false,
  supportsCrippenLogP = false,
) {
  const struct = { ket: 'first', clone: jest.fn(() => ({ ket: 'cloned' })) };
  const editor = {
    struct: () => struct,
    selection: () => selection,
    explicitSelected: () => ({ atoms: [], bonds: [] }),
    errorHandler: jest.fn(),
  };
  const server = Object.assign(Promise.resolve(), {
    supportsCrippenLogP,
    calculate: jest.fn(async ({ properties }: { properties: string[] }) => {
      if (changeDuringCalculate) struct.ket = 'changed';
      return {
        'monoisotopic-mass': '22.9897690',
        ...(properties.includes('crippen-logp')
          ? { 'crippen-logp': 1.23 }
          : {}),
      };
    }),
  });
  const options = { getServerSettings: () => ({}) };
  const dispatch = jest.fn();
  return {
    dispatch,
    server,
    run: () => analyse()(dispatch, () => ({ editor, server, options })),
  };
}

describe('analyse m/z safety', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the calculation mass only when the complete canvas is unchanged', async () => {
    const { dispatch, run } = fixture(null);
    await run();
    expect(massToChargeFromKet).toHaveBeenCalledWith('first', '22.9897690');
    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'CHANGE_ANALYSE',
      data: {
        values: {
          'monoisotopic-mass': '22.9897690',
          'mass-to-charge': 22.9892204201,
        },
      },
    });
  });

  it.each([
    [{ atoms: [0] }, false],
    [null, true],
  ])(
    'does not report m/z for a selection or a changed canvas',
    async (selection, changed) => {
      const { dispatch, run } = fixture(
        selection as object | null,
        changed as boolean,
      );
      await run();
      expect(massToChargeFromKet).not.toHaveBeenCalled();
      expect(dispatch).toHaveBeenLastCalledWith({
        type: 'CHANGE_ANALYSE',
        data: { values: { 'monoisotopic-mass': '22.9897690' } },
      });
    },
  );
});

describe('analyse Crippen cLogP', () => {
  it('requests the local estimate only when the service supports it', async () => {
    const { dispatch, server, run } = fixture(null, false, true);
    await run();
    expect(server.calculate.mock.calls[0][0].properties).toContain(
      'crippen-logp',
    );
    expect(dispatch.mock.calls.at(-1)?.[0].data.values['crippen-logp']).toBe(
      1.23,
    );

    const remote = fixture(null);
    await remote.run();
    expect(remote.server.calculate.mock.calls[0][0].properties).not.toContain(
      'crippen-logp',
    );
  });

  it('does not calculate a selection or keep a result after the canvas changes', async () => {
    const selected = fixture({ atoms: [0] }, false, true);
    await selected.run();
    expect(selected.server.calculate.mock.calls[0][0].properties).not.toContain(
      'crippen-logp',
    );

    const changed = fixture(null, true, true);
    await changed.run();
    expect(
      changed.dispatch.mock.calls.at(-1)?.[0].data.values['crippen-logp'],
    ).toBeUndefined();
  });
});
