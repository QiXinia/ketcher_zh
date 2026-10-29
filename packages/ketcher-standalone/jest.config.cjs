// The monorepo installs ts-jest for ketcher-core; use the same transformer for
// the standalone TypeScript service tests in the workspace installation.
module.exports = {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true, diagnostics: false }],
    '^.+\\.jsx?$': 'babel-jest',
  },
};
