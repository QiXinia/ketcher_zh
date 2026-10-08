const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const root = resolve(__dirname, '../..');
const ts = createRequire(resolve(root, 'packages/ketcher-core/package.json'))('typescript');
function source(path, mocks = {}, globals = {}) {
  const filename = resolve(root, path), module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports,
    require: name => { if (!(name in mocks)) throw new Error(`Unexpected import ${name}`); return mocks[name]; },
    console, ...globals }, { filename });
  return module.exports;
}
const structPath = 'packages/ketcher-standalone/src/infrastructure/services/struct/';
const types = source(structPath + 'indigoWorker.types.ts');
function serviceHarness() {
  const sent = [], worker = { postMessage: msg => sent.push(msg), terminate() {} };
  const mime = Object.fromEntries(Object.keys(types.SupportedFormat).map(k => [k, k]));
  mime.DaylightSmiles = 'smiles'; mime.KET = 'ket'; mime.Mol = 'mol';
  const Service = source(structPath + 'standaloneStructService.ts', {
    './indigoWorker.types': types, './constants': {},
    '_indigo-worker-import-alias_': { getIndigoWorker: () => worker },
    'ketcher-core': { ChemicalMimeType: mime, provideEditorInstance: () => ({}), pickStandardServerOptions: (_, options) => options },
  }, { window: { dispatchEvent() {} }, Event: class {}, process: { env: {} } }).default;
  const service = new Service({});
  return { service, sent, worker, mime, reply: (request, payload, error) => worker.onmessage({ data: {
    requestId: request.requestId, type: request.type, inputData: request.data?.struct,
    ...(error ? { hasError: true, error } : { hasError: false, payload }),
  } }) };
}

test('same-input concurrent conversions and errors settle only their own requests', async () => {
  const h = serviceHarness();
  const first = h.service.convert({ struct: 'CC', output_format: h.mime.DaylightSmiles });
  const second = h.service.convert({ struct: 'CC', output_format: h.mime.KET });
  assert.notEqual(h.sent[0].requestId, h.sent[1].requestId);
  h.reply(h.sent[1], 'ket-result'); h.reply(h.sent[0], 'smiles-result');
  assert.equal((await first).struct, 'smiles-result'); assert.equal((await second).struct, 'ket-result');
  const bad = h.service.getInChIKey('bad'), good = h.service.getInChIKey('good');
  const rejection = assert.rejects(bad, /invalid molecule/);
  h.reply(h.sent[2], undefined, 'invalid molecule'); h.reply(h.sent[3], 'key');
  await rejection; assert.equal(await good, 'key');
});

test('malformed responses, post failures, worker failure and destroy settle pending promises', async () => {
  const h = serviceHarness();
  const malformed = h.service.calculateMacromoleculeProperties({ struct: 'CC' });
  const rejected = assert.rejects(malformed, /JSON/); h.reply(h.sent[0], '{'); await rejected;
  h.worker.postMessage = () => { throw new Error('cannot post'); };
  await assert.rejects(h.service.getInChIKey('CC'), /cannot post/);
  h.worker.postMessage = msg => h.sent.push(msg);
  const pending = h.service.getInChIKey('CC'); const failure = assert.rejects(pending, /worker crash/);
  h.worker.onerror({ message: 'worker crash' }); await failure;
  await assert.rejects(h.service.getInChIKey('CC'), /worker crash/);
  const fresh = serviceHarness(), beforeDestroy = fresh.service.getInChIKey('CC');
  const destroyed = assert.rejects(beforeDestroy, /destroyed/); fresh.service.destroy(); await destroyed;
  await assert.rejects(fresh.service.getInChIKey('CC'), /destroyed/);
});

test('worker echoes request IDs on chemistry, option and initialization failures', async () => {
  for (const kind of ['success', 'chemistry', 'options', 'initialization']) {
    const messages = [], self = { postMessage: message => messages.push(message) };
    const indigo = { MapStringString: class { set() { if (kind === 'options') throw new Error('options'); } delete() {} },
      convert: (input, format) => { if (kind === 'chemistry') throw new Error('chemistry'); return `${input}:${format}`; } };
    source(structPath + 'indigoWorker.ts', { './indigoWorker.types': types,
      '_indigo-ketcher-import-alias_': { default: () => kind === 'initialization' ? Promise.reject(new Error(kind)) : Promise.resolve(indigo), __esModule: true },
    }, { self });
    self.onmessage({ data: { requestId: 42, type: types.Command.Convert,
      data: { struct: 'CC', format: 'smiles', options: { test: 'value' } } } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(messages.length, 1); assert.equal(messages[0].requestId, 42);
    assert.equal(messages[0].hasError, kind !== 'success');
    if (kind !== 'success') assert.equal(messages[0].error, kind);
  }
});

const sdfPath = 'packages/ketcher-core/src/domain/serializers/sdf/';
test('SDF round trips blank titles, multiline strings, leading zeroes and an unterminated final record', () => {
  const records = source(sdfPath + 'sdfRecords.ts');
  const Serializer = source(sdfPath + 'sdfSerializer.ts', {
    './sdfRecords': records, '../mol/molSerializer': { MolSerializer: class {
      deserialize(mol) { return { mol }; } serialize(struct) { return struct.mol; }
    } },
  }).SdfSerializer;
  const serializer = new Serializer();
  const mol = '\nprogram\n\n  0  0  0  0  0  0            999 V2000\nM  END\n';
  const input = mol + '> <External ID>\n00123\n\n> <Notes>\nfirst line\n second line \n\n$$$$\r\n' + mol + '> <empty>\n\n';
  const parsed = serializer.deserialize(input);
  assert.equal(parsed.length, 2); assert.equal(parsed[0].struct.mol, mol);
  assert.equal(parsed[0].props['External ID'], '00123');
  assert.equal(parsed[0].props.Notes, 'first line\n second line ');
  assert.equal(parsed[1].props.empty, '');
  assert.deepEqual(serializer.deserialize(serializer.serialize(parsed)), parsed);
  assert.throws(() => serializer.deserialize(mol + '> <x>\na\n\n> <x>\nb'), /duplicate field/);
  assert.throws(() => serializer.deserialize('invalid'), /missing M  END/);
});

test('macromolecule replacement parses before deletion and joins the replacement into one undo step', async () => {
  const changes = [], calls = [], editor = { drawingEntitiesManager: {}, renderersContainer: { update: c => calls.push(c) } };
  const history = { update: (c, merge) => changes.push([c, merge]) };
  const utilities = source('packages/ketcher-core/src/application/utils.ts', {
    'application/editor/editorSingleton': { provideEditorInstance: () => editor },
    './formatters': { SupportedFormat: { ket: 'ket' }, identifyStructFormat: () => 'ket' },
    'domain/services/struct/structService.types': {},
    './editor/internal': { EditorHistory: { getInstance: () => history } },
    'domain/serializers': { KetSerializer: class { deserializeToDrawingEntities(input) {
      if (input === 'bad') throw new Error('bad ket');
      return { drawingEntitiesManager: { mergeInto: () => ({ command: 'add' }) } };
    } } }, assert: require('assert'),
  });
  editor.drawingEntitiesManager.deleteAllEntities = () => { calls.push('delete'); return 'remove'; };
  await assert.rejects(utilities.parseAndAddMacromoleculesOnCanvas('bad', {}, false, true), /bad ket/);
  assert.equal(changes.length, 0); assert.equal(calls.length, 0);
  await utilities.parseAndAddMacromoleculesOnCanvas('valid', {}, false, true);
  assert.deepEqual(changes, [['remove', undefined], ['add', true]]);
});

test('public async actions report FAILURE and reject while legacy UI actions retain event handling', async () => {
  const { runAsyncAction } = source('packages/ketcher-core/src/utilities/runAsyncAction.ts', { './KetcherLogger': { KetcherLogger: { error() {} } } });
  const events = [], bus = { emit: event => events.push(event) };
  await assert.rejects(runAsyncAction(async () => { throw new Error('bad input'); }, bus, true), /bad input/);
  assert.deepEqual(events, ['LOADING', 'FAILURE']);
  assert.equal(await runAsyncAction(async () => { throw new Error('bad input'); }, bus), undefined);
});
