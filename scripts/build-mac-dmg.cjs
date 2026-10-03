// Guard for the macOS DMG target: DMG packaging requires macOS-only system
// tools (`sips` for background sizing, `hdiutil` for image creation,
// `codesign` for signing). Running `electron-builder build --mac dmg` on
// Linux/Windows always fails with:
//   Error: sips process failed ENOENT / spawn sips ENOENT
// (see dmg-builder/out/dmgUtil.js -> getImageSizeUsingSips).
// The default `mac.target: ["zip"]` in package.json is the cross-platform
// path and builds fine on Linux. Only use the DMG target on a real Mac
// (or the macos-latest CI runner, see .github/workflows/build-desktop.yml).
if (process.platform !== 'darwin') {
  console.error(
    '\nERROR: the macOS DMG target can only be built on macOS.\n' +
    'It requires Apple-only tools (sips, hdiutil, codesign) that do not\n' +
    'exist on Linux/Windows, so the build would fail with:\n' +
    '  "sips process failed ENOENT / spawn sips ENOENT".\n\n' +
    `You are on: ${process.platform}.\n` +
    'Options:\n' +
    '  - Build the portable macOS zip instead (works everywhere):\n' +
    '      npm run build:electron:mac\n' +
    '  - Build the DMG on a Mac or via CI (macos-latest runner):\n' +
    '      git tag v1.0.0 && git push origin v1.0.0\n'
  );
  process.exit(1);
}

const { execSync } = require('child_process');
// Full pipeline (same as the other build:* scripts) — only reached on macOS.
execSync(
  'npm run db:setup:sqlite && npm run build:frontend && npm run build:backend && electron-builder build --mac dmg',
  { stdio: 'inherit' }
);
