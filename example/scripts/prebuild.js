const fs = require('fs');
const path = require('path');

const mode = process.env.MODE;
if (mode !== 'standalone' && mode !== 'remote') {
  console.error(
    `[prebuild] MODE must be "standalone" or "remote", got "${mode}"`,
  );
  process.exit(1);
}

const target = path.join(__dirname, '..', 'dist', mode);
const buildDir = path.join(__dirname, '..', 'build');
fs.rmSync(target, { recursive: true, force: true });
fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(target, { recursive: true });
