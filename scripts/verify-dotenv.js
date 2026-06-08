/**
 * Verifies react-native-dotenv inlines API_BASE_URL from .env (same Babel config as Metro).
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const envRaw = fs.readFileSync(envPath, 'utf8');
const expectedMatch = envRaw.match(/^API_BASE_URL=(.+)$/m);
const expected = expectedMatch ? expectedMatch[1].trim() : null;

const code = "import { API_BASE_URL } from '@env';\nexport const BASE = API_BASE_URL;\n";

const result = babel.transformSync(code, {
  filename: path.join(root, 'src', 'services', 'baseApi.ts'),
  cwd: root,
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {moduleName: '@env', path: '.env'},
    ],
  ],
});

const inlined = result.code;
const urlMatch = inlined.match(/BASE\s*=\s*["']([^"']+)["']/);
const actual = urlMatch ? urlMatch[1] : null;

console.log('Expected API_BASE_URL from .env:', expected);
console.log('Inlined API_BASE_URL from Babel:', actual);
if (expected && actual && expected === actual) {
  console.log('OK: @env matches .env');
  process.exit(0);
}
console.error('FAIL: @env does not match .env');
process.exit(1);
