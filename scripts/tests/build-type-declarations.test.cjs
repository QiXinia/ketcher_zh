const assert = require('node:assert/strict');
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { dirname, join, resolve } = require('node:path');
const { test } = require('node:test');

const coreDir = resolve(__dirname, '../../packages/ketcher-core');
const coreRequire = createRequire(join(coreDir, 'package.json'));
const ts = coreRequire('typescript');
const { prepareSingleFileReplaceTscAliasPaths } = coreRequire('tsc-alias');

test('built declarations keep domain and utility types distinct and narrow monomers', async (t) => {
  // Use the production aliases and emitted folder layout, including the two
  // distinct types/index modules that exposed the Windows tsc-alias regression.
  const tempRoot = resolve(process.env.CHEMWIKI_TEST_TMP_DIR ||
    (process.platform === 'win32' ? 'D:/tmp' : '/d/tmp'));
  mkdirSync(tempRoot, { recursive: true });
  const fixture = mkdtempSync(join(tempRoot, 'ketcher-declarations-'));
  t.after(() => {
    assert.equal(dirname(fixture), tempRoot);
    rmSync(fixture, { recursive: true, force: true });
  });
  const dist = join(fixture, 'dist');
  const write = (relative, contents) => {
    const file = join(dist, relative);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, contents);
    return file;
  };
  write('domain/types/index.d.ts', `
    export type MonomerItemType = { label: string; props: { id?: string } };
    export type AmbiguousMonomerType = { label: string; id: string; isAmbiguous: true };
    export type MonomerOrAmbiguousType = MonomerItemType | AmbiguousMonomerType;
  `);
  write('types/index.d.ts', 'export type DeepPartial<T> = { [K in keyof T]?: T[K] };');
  const declarationFile = write('domain/helpers/monomers.d.ts', '');
  const replace = await prepareSingleFileReplaceTscAliasPaths({
    configFile: join(coreDir, 'tsconfig.json'), outDir: dist,
  });
  const declaration = replace({ filePath: declarationFile, fileContents: `
    import type { MonomerOrAmbiguousType, AmbiguousMonomerType } from 'domain/types';
    import type { DeepPartial } from 'types';
    export declare function isAmbiguousMonomerLibraryItem(
      monomer?: MonomerOrAmbiguousType,
    ): monomer is AmbiguousMonomerType;
    export type PartialMonomer = DeepPartial<MonomerOrAmbiguousType>;
  ` });
  assert.match(declaration, /from ['"]\.\.\/types\/?['"]/);
  assert.match(declaration, /from ['"]\.\.\/\.\.\/types\/?['"]/);
  writeFileSync(declarationFile, declaration);
  const consumer = write('consumer.ts', `
    import { isAmbiguousMonomerLibraryItem } from './domain/helpers/monomers';
    import type { MonomerOrAmbiguousType } from './domain/types';
    export function getId(monomer: MonomerOrAmbiguousType) {
      if (isAmbiguousMonomerLibraryItem(monomer)) return monomer.id;
      return monomer.props.id;
    }
  `);
  const program = ts.createProgram([consumer], {
    strict: true, noEmit: true, skipLibCheck: false, types: [],
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0,
    diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')).join('\n'));
});
