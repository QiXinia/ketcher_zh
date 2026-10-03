const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const root = resolve(__dirname, '../..');
const coreRequire = createRequire(resolve(root, 'packages/ketcher-core/package.json'));
const ts = coreRequire('typescript');

// Execute source directly so these checks do not require production bundles.
function loadSource(relative, mocks = {}, globals = {}) {
  const filename = resolve(root, relative);
  const nativeRequire = createRequire(filename);
  const result = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputText, {
    module,
    exports: module.exports,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : nativeRequire(name),
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ...globals,
  }, { filename });
  return module.exports;
}

class EventTargetStub {
  listeners = new Map();
  captured = new Set();
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(callback);
  }
  removeEventListener(name, callback) {
    this.listeners.get(name)?.delete(callback);
  }
  dispatch(name, payload = {}) {
    for (const callback of this.listeners.get(name) ?? []) callback(payload);
  }
  setPointerCapture(id) { this.captured.add(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
}

function gestureHarness(callbacks) {
  const element = new EventTargetStub();
  const document = new EventTargetStub();
  const window = new EventTargetStub();
  const frames = [];
  const timers = new Map();
  let timerId = 0;
  const { GestureRecognizer } = loadSource(
    'packages/ketcher-react/src/script/editor/GestureRecognizer.ts', {}, {
      document, window,
      requestAnimationFrame: (callback) => frames.push(callback),
      setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; },
      clearTimeout: (id) => timers.delete(id),
      setInterval: () => ++timerId,
      clearInterval: () => {},
    },
  );
  const recognizer = new GestureRecognizer(element, {
    onPinchZoom: () => {}, onTwoFingerPan: () => {}, onLongPress: () => {},
    ...callbacks,
  });
  const pointer = (id, x, y) => ({
    pointerId: id, pointerType: 'touch', clientX: x, clientY: y, target: element,
  });
  return { element, document, window, frames, timers, recognizer, pointer };
}

test('browser EventEmitter keeps once, unsubscribe and async payload semantics', () => {
  const { EventEmitter } = loadSource('packages/ketcher-core/src/utilities/EventEmitter.ts');
  const emitter = new EventEmitter();
  const seen = [];
  const listener = (value) => seen.push(value);
  emitter.on('zoom', listener).once('zoom', (value) => seen.push(value * 10));
  emitter.emit('zoom', 2);
  emitter.emit('zoom', 3);
  emitter.off('zoom', listener);
  assert.equal(emitter.emit('zoom', 4), false);
  assert.deepEqual(seen, [2, 20, 3]);
});

test('two touch pointers combine pinch and pan once per animation frame', () => {
  const transforms = [];
  const h = gestureHarness({ onTransform: (...args) => transforms.push(args) });
  h.element.dispatch('pointerdown', h.pointer(1, 0, 0));
  h.element.dispatch('pointerdown', h.pointer(2, 100, 0));
  h.document.dispatch('pointermove', h.pointer(1, 10, 20));
  h.document.dispatch('pointermove', h.pointer(2, 130, 20));
  assert.equal(h.frames.length, 1);
  h.frames.shift()();
  assert.deepEqual(transforms, [[1.2, 70, 20, 20, 20]]);
  assert.equal(h.recognizer.isGestureActive(), true);
  h.document.dispatch('pointercancel', h.pointer(2, 130, 20));
  assert.equal(h.element.captured.size, 0);
  const count = transforms.length;
  h.document.dispatch('pointermove', h.pointer(1, 30, 40));
  h.frames.splice(0).forEach((callback) => callback());
  assert.equal(transforms.length, count);
  h.recognizer.destroy();
  assert.equal([...h.document.listeners.values()].every((set) => set.size === 0), true);
});

test('long press is cancelled when the touch moves or the iframe loses focus', () => {
  const presses = [];
  const h = gestureHarness({ onLongPress: (...args) => presses.push(args) });
  h.element.dispatch('pointerdown', h.pointer(1, 50, 50));
  [...h.timers.values()].forEach((callback) => callback());
  assert.equal(presses.length, 1);
  h.recognizer.destroy();
  const moved = gestureHarness({ onLongPress: () => assert.fail('unexpected long press') });
  moved.element.dispatch('pointerdown', moved.pointer(2, 10, 10));
  moved.document.dispatch('pointermove', moved.pointer(2, 30, 10));
  assert.equal(moved.timers.size, 0);
  moved.element.dispatch('pointerdown', moved.pointer(3, 100, 10));
  moved.window.dispatch('blur');
  assert.equal(moved.element.captured.size, 0);
  assert.equal(moved.timers.size, 0);
  moved.recognizer.destroy();
});

test('windowed dialogs update the foreground form and close only that window', () => {
  const reducer = loadSource('packages/ketcher-react/src/script/ui/state/modal/windows.ts', {
    './form': { formsState: { settings: { errors: {}, valid: true, result: {} } } },
  }).default;
  let state = reducer(undefined, { type: 'WINDOW_OPEN', data: { name: 'settings' } });
  const firstId = state.windows[0].id;
  state = reducer(state, { type: 'WINDOW_OPEN', data: { name: 'save' } });
  const secondId = state.windows[1].id;
  state = reducer(state, { type: 'WINDOW_BRING_TO_FRONT', id: firstId });
  state = reducer(state, { type: 'UPDATE_FORM', data: { result: { windowedMode: false } } });
  assert.equal(state.windows[0].form.result.windowedMode, false);
  assert.equal(state.windows[1].form, null);
  state = reducer(state, { type: 'MODAL_CLOSE' });
  assert.equal(state.windows.length, 1);
  assert.equal(state.windows[0].id, secondId);
});

test('iframe theme query, theme messages and listener cleanup remain usable', () => {
  const window = new EventTargetStub();
  const stored = new Map([['ketcher-theme', 'light']]);
  window.location = { search: '?theme=dark' };
  window.localStorage = {
    getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value),
  };
  const document = { documentElement: { dataset: {}, style: {} } };
  const theme = loadSource('example/src/theme.ts', {}, { window, document, URLSearchParams });
  theme.initializeKetcherTheme();
  assert.equal(theme.getCurrentKetcherTheme(), 'dark');
  const unsubscribe = theme.subscribeToKetcherThemeMessages();
  window.dispatch('message', { data: { eventType: 'theme:change', data: { theme: 'light' } } });
  assert.equal(theme.getCurrentKetcherTheme(), 'light');
  window.dispatch('message', { data: { eventType: 'theme:change', data: { theme: 'invalid' } } });
  assert.equal(theme.getCurrentKetcherTheme(), 'light');
  unsubscribe();
  assert.equal(window.listeners.get('message').size, 0);
});

test('3.18 settings and windowed mode retain defaults, validation and live Chinese titles', () => {
  const en = require('../../packages/ketcher-react/src/i18n/locales/en.json');
  const zh = require('../../packages/ketcher-react/src/i18n/locales/zh.json');
  let language = zh;
  const i18n = {
    t: (key, options) => key.split('.').reduce((value, part) => value?.[part], language) ?? options?.defaultValue ?? key,
  };
  const helpers = loadSource('packages/ketcher-react/src/script/ui/data/schema/i18n.ts', {
    '../../../../i18n': i18n,
  });
  const schema = loadSource('packages/ketcher-react/src/script/ui/data/schema/options-schema.ts', {
    './i18n': helpers,
    'ketcher-core': {
      StereoLabelStyleType: {}, StereoColoringType: {}, ShowHydrogenLabels: {}, defaultBondThickness: 1,
    },
  });
  const defaults = schema.getDefaultOptions();
  assert.equal(defaults['valence-mode'], 'default');
  assert.equal(defaults['aromatize-skip-superatoms'], true);
  assert.equal(defaults.windowedMode, true);
  assert.equal(schema.validation({ 'valence-mode': 'biovia-2017' })['valence-mode'], 'biovia-2017');
  assert.equal(Object.hasOwn(schema.validation({ 'valence-mode': 'invalid' }), 'valence-mode'), false);
  assert.equal(schema.default.properties['valence-mode'].title, '价态模式');
  assert.equal(schema.default.properties['valence-mode'].enumNames[2], '默认');
  language = en;
  assert.equal(schema.default.properties['valence-mode'].title, 'Valence mode');
  assert.equal(schema.default.properties['valence-mode'].enumNames[2], 'Default');
});
