/**
 * Clears Metro / Babel caches so react-native-dotenv (@env) re-reads .env on next bundle.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, '..');

function rmDir(target) {
  if (!fs.existsSync(target)) {
    return false;
  }
  fs.rmSync(target, {recursive: true, force: true});
  return true;
}

function clearTempMetroCaches() {
  const temps = [
    os.tmpdir(),
    process.env.TEMP,
    process.env.TMP,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Temp')
      : null,
  ].filter(Boolean);

  const seen = new Set();
  let removed = 0;

  for (const tempDir of temps) {
    if (seen.has(tempDir) || !fs.existsSync(tempDir)) {
      continue;
    }
    seen.add(tempDir);

    let entries;
    try {
      entries = fs.readdirSync(tempDir, {withFileTypes: true});
    } catch {
      continue;
    }

    for (const entry of entries) {
      const name = entry.name;
      const isMetro =
        name === 'metro-cache' ||
        name.startsWith('metro-file-map-') ||
        name.startsWith('haste-map-') ||
        name === 'react-native-cli';
      if (!isMetro) {
        continue;
      }
      const full = path.join(tempDir, name);
      if (rmDir(full)) {
        console.log(`Removed ${full}`);
        removed += 1;
      }
    }
  }

  return removed;
}

const localDirs = [
  path.join(root, 'node_modules', '.cache'),
  path.join(root, '.metro'),
];

console.log('Clearing @env / Metro caches (react-native-dotenv)...');

for (const dir of localDirs) {
  if (rmDir(dir)) {
    console.log(`Removed ${path.relative(root, dir)}`);
  }
}

const tempCount = clearTempMetroCaches();

console.log('');
console.log(
  tempCount > 0
    ? `Done. Cleared ${tempCount} temp Metro cache folder(s).`
    : 'Done. No extra temp Metro caches found.',
);
console.log('Next: npm run start:reset   (or npm run env:verify)');
console.log('After changing .env, restart Metro with --reset-cache before reloading the app.');
