// this import processed by '@surma/rollup-plugin-off-main-thread' plugin
// check rollup.config.mjs to see how different build types are handled.
// This plugin can not result cjs modules.

let _indigoWorker: Worker | null = null;

let users = 0;

export function getIndigoWorker(): Worker {
  _indigoWorker ??= new Worker(
    new URL('./../indigoWorker.ts', import.meta.url),
    {
      type: 'module',
    },
  );
  users += 1;
  return _indigoWorker;
}

export function releaseIndigoWorker(worker: Worker): void {
  if (_indigoWorker !== worker || users === 0) return;
  users -= 1;
  if (users === 0) {
    _indigoWorker.terminate();
    _indigoWorker = null;
  }
}
