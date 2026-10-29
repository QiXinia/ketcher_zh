// this import processed by 'rollup-plugin-web-worker-loader' plugin
// check rollup.config.mjs to see how different build types are handled
// This plugin can result cjs modules.

import IndigoWorker from 'web-worker:./../indigoWorker';

let _indigoWorker: InstanceType<typeof IndigoWorker> | null = null;

let users = 0;

export function getIndigoWorker(): Worker {
  _indigoWorker ??= new IndigoWorker();
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
