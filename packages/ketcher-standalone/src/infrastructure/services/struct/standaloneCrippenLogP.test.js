import IndigoService from './standaloneStructService';

const mockListeners = new Map();
const mockWorker = {
  postMessage: jest.fn(),
  terminate: jest.fn(),
  addEventListener: jest.fn((type, fn) => {
    if (!mockListeners.has(type)) mockListeners.set(type, new Set());
    mockListeners.get(type).add(fn);
  }),
  removeEventListener: jest.fn((type, fn) => mockListeners.get(type)?.delete(fn)),
};
const emitWorker = (type, event) => {
  for (const listener of mockListeners.get(type) || []) listener(event);
};
const mockMassToCharge = jest.fn();
jest.mock(
  '_indigo-worker-import-alias_',
  () => ({ getIndigoWorker: () => mockWorker, releaseIndigoWorker: jest.fn() }),
  { virtual: true },
);
jest.mock('ketcher-core', () => ({
  massToChargeFromKet: (...args) => mockMassToCharge(...args),
  pickStandardServerOptions: () => ({}),
}), { virtual: true });

function molecule(atoms, bonds = [], nodes = []) {
  return JSON.stringify({
    root: { nodes: [{ $ref: 'mol0' }, ...nodes] },
    mol0: { type: 'molecule', atoms, bonds },
  });
}

describe('standalone cLogP eligibility', () => {
  beforeEach(() => { jest.clearAllMocks(); mockListeners.clear(); globalThis.dispatchEvent = jest.fn(); });

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
    emitWorker('message', {
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
  it('correlates concurrent requests across services and survives one being destroyed', async () => {
    const first = new IndigoService({});
    const second = new IndigoService({});
    const one = first.info();
    const two = second.info();
    const [firstRequest, secondRequest] = mockWorker.postMessage.mock.calls.map(([msg]) => msg);
    expect(firstRequest.requestId).not.toBe(secondRequest.requestId);
    emitWorker('message', { data: { type: secondRequest.type, requestId: secondRequest.requestId, hasError: false, payload: 'second' } });
    await expect(two).resolves.toMatchObject({ indigoVersion: 'second' });
    first.destroy();
    await expect(one).rejects.toThrow('Indigo service was destroyed');
    first.destroy();
    const another = second.info();
    const third = mockWorker.postMessage.mock.calls[2][0];
    emitWorker('message', { data: { type: third.type, requestId: third.requestId, hasError: false, payload: 'third' } });
    await expect(another).resolves.toMatchObject({ indigoVersion: 'third' });
    second.destroy();
  });

  it('rejects pending requests in every service on worker error', async () => {
    const first = new IndigoService({});
    const second = new IndigoService({});
    const one = first.info();
    const two = second.info();
    emitWorker('error', { message: 'worker failed' });
    await expect(one).rejects.toThrow('worker failed');
    await expect(two).rejects.toThrow('worker failed');
    first.destroy(); second.destroy();
  });

});
