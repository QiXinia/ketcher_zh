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

function fixture(selection: object | null, changeDuringCalculate = false) {
  const struct = { ket: 'first', clone: jest.fn(() => ({ ket: 'cloned' })) };
  const editor = {
    struct: () => struct,
    selection: () => selection,
    explicitSelected: () => ({ atoms: [], bonds: [] }),
    errorHandler: jest.fn(),
  };
  const server = Object.assign(Promise.resolve(), {
    calculate: jest.fn(async () => {
      if (changeDuringCalculate) struct.ket = 'changed';
      return { 'monoisotopic-mass': '22.9897690' };
    }),
  });
  const options = { getServerSettings: () => ({}) };
  const dispatch = jest.fn();
  return {
    dispatch,
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
