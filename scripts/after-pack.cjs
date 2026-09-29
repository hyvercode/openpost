// electron-builder afterPack hook: copy node_modules/.prisma into the
// packaged app's node_modules.
//
// Background: electron-builder's `files` filter silently drops dot-dirs
// like node_modules/.prisma (generated Prisma Client runtime), and
// `extraFiles` lands in the output root instead of resources/app. Without
// this copy, the packaged backend crashes with:
//   Error: Cannot find module '.prisma/client/default'
// while the dev tree works fine.
const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(s, d);
    } else if (entry.isSymbolicLink()) {
      try {
        if (fs.existsSync(d)) fs.unlinkSync(d);
        fs.symlinkSync(fs.readlinkSync(s), d);
      } catch {
        fs.copyFileSync(s, d);
      }
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const projectDir = process.cwd();
  const src = path.join(projectDir, 'node_modules', '.prisma');

  // asar:false layout: <out>/<resources>/app ; asar layout: app.asar next to it.
  // Handle both by targeting every plausible app dir.
  const candidates = [
    path.join(appOutDir, 'resources', 'app', 'node_modules', '.prisma'),
  ];
  if (!fs.existsSync(src)) {
    console.log(`[afterPack] skip: ${src} not found`);
    return;
  }
  for (const dest of candidates) {
    copyDirSync(src, dest);
    console.log(`[afterPack] copied .prisma -> ${dest}`);
  }
};
