/**
 * Android clean: remove native CMake / build outputs, then run gradlew clean.
 * Deleting .cxx first avoids CMake regenerating against stale Gradle prefab paths.
 */
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'android');

function rmDir(rel) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) {
    return;
  }
  fs.rmSync(dir, {recursive: true, force: true});
  console.log(`Removed ${rel}`);
}

const dirs = [
  'android/app/.cxx',
  'android/app/build',
  'android/build',
  'android/.gradle',
];

for (const rel of dirs) {
  rmDir(rel);
}

// Native modules keep their own .cxx caches tied to the same prefab paths.
const nodeModules = path.join(root, 'node_modules');
if (fs.existsSync(nodeModules)) {
  for (const name of fs.readdirSync(nodeModules)) {
    const cxx = path.join(nodeModules, name, 'android', '.cxx');
    if (fs.existsSync(cxx)) {
      fs.rmSync(cxx, {recursive: true, force: true});
      console.log(`Removed node_modules/${name}/android/.cxx`);
    }
  }
  for (const name of fs.readdirSync(nodeModules)) {
    if (!name.startsWith('@')) {
      continue;
    }
    const scopeDir = path.join(nodeModules, name);
    for (const pkg of fs.readdirSync(scopeDir)) {
      const cxx = path.join(scopeDir, pkg, 'android', '.cxx');
      if (fs.existsSync(cxx)) {
        fs.rmSync(cxx, {recursive: true, force: true});
        console.log(`Removed node_modules/${name}/${pkg}/android/.cxx`);
      }
    }
  }
}

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
console.log('Running gradlew clean...');
execSync(`${gradlew} clean`, {cwd: androidDir, stdio: 'inherit'});
