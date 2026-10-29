import IndigoService from './standaloneStructService';

const mockWorker = {
  postMessage: jest.fn(),
  terminate: jest.fn(),
};
const mockMassToCharge = jest.fn();
jest.mock(
  '_indigo-worker-import-alias_',
  () => ({ getIndigoWorker: () => mockWorker }),
  { virtual: true },
);
jest.mock('ketcher-core', () => ({
  massToChargeFromKet: (...args) => mockMassToCharge(...args),
  pickStandardServerOptions: () => ({}),
}));

function molecule(atoms, bonds = [], nodes = []) {
  return JSON.stringify({
    root: { nodes: [{ $ref: 'mol0' }, ...nodes] },
    mol0: { type: 'molecule', atoms, bonds },
  });
}

describe('standalone cLogP eligibility', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    [
      'neutral molecule',
      molecule([{ label: 'C' }]),
      undefined,
      'neutral',
      true,
    ],
    [
      'charged ion',
      molecule([{ label: 'Na', charge: 1 }]),
      undefined,
      'charged',
      false,
    ],
    [
      'query atom',
      molecule([{ label: 'R#' }]),
      undefined,
      'complex-structure',
      false,
    ],
    [
      'reaction',
      molecule([{ label: 'C' }], [], [{ type: 'arrow' }]),
      undefined,
      'complex-structure',
      false,
    ],
    ['selection', molecule([{ label: 'C' }]), [0], 'neutral', false],
  ])('%s', async (_label, struct, selected, reason, allowed) => {
    mockMassToCharge.mockReturnValue(
      reason === 'charged' ? { ok: true } : { ok: false, reason },
    );
    const service = new IndigoService({});
    const pending = service.calculate({
      struct,
      selected,
      properties: ['gross', 'crippen-logp'],
    });
    const request = mockWorker.postMessage.mock.calls[0][0];
    expect(request.data.calculateCrippenLogP).toBe(allowed);
    expect(mockMassToCharge.mock.calls).toEqual(selected ? [] : [[struct, 1]]);
    mockWorker.onmessage({
      data: {
        type: request.type,
        requestId: request.requestId,
        hasError: false,
        payload: '{"gross-formula":"C"}',
      },
    });
    await expect(pending).resolves.toEqual({ gross: 'C' });
    service.destroy();
  });
});
