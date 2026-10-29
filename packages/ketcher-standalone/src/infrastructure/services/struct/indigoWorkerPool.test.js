const mockInstances = [];
jest.mock('web-worker:./../indigoWorker', () => ({
  __esModule: true,
  default: class {
    constructor() { this.terminate = jest.fn(); mockInstances.push(this); }
  },
}), { virtual: true });

import { getIndigoWorker, releaseIndigoWorker } from './indigoWorkerImports/useWasmLoader';

it('shares the worker until the last service releases it and creates a new one afterwards', () => {
  const a = getIndigoWorker();
  const b = getIndigoWorker();
  expect(a).toBe(b);
  releaseIndigoWorker(a);
  expect(a.terminate).not.toHaveBeenCalled();
  releaseIndigoWorker(b);
  expect(a.terminate).toHaveBeenCalledTimes(1);
  releaseIndigoWorker(b);
  expect(a.terminate).toHaveBeenCalledTimes(1);
  const c = getIndigoWorker();
  expect(c).not.toBe(a);
  releaseIndigoWorker(c);
  expect(c.terminate).toHaveBeenCalledTimes(1);
});
