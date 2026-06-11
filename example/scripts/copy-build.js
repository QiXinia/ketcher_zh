const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const mode = process.env.MODE;
if (mode !== 'standalone' && mode !== 'remote') {
  console.error(
    `[copy-build] MODE must be "standalone" or "remote", got "${mode}"`,
  );
  process.exit(1);
}

const src = path.join(__dirname, '..', 'build');
const dest = path.join(__dirname, '..', 'dist', mode);

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

if (process.platform === 'win32') {
  execSync(`xcopy "${src}" "${dest}" /E /I /Y /Q`, { stdio: 'inherit' });
} else {
  execSync(`cp -r "${src}/." "${dest}"`, { stdio: 'inherit' });
}
