// Run after `vite build`: lists every file in dist/ inside dist/sw.js so the app can be cached for offline use.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(dist)
  .map((p) => relative(dist, p).split('\\').join('/'))
  .filter((f) => f !== 'sw.js')
  .sort();

const urls = ['./', ...files.map((f) => './' + f)];
const hash = createHash('sha1');
for (const f of files) hash.update(f).update(readFileSync(join(dist, f)));
const swPath = join(dist, 'sw.js');
let sw = readFileSync(swPath, 'utf8');
hash.update(sw); // a change to the service worker itself also makes a new version
const version = hash.digest('hex').slice(0, 10);

sw = sw.replace(/const PRECACHE = .*;/, () => `const PRECACHE = ${JSON.stringify(urls)};`);
sw = sw.replace(/const VERSION = .*;/, () => `const VERSION = '${version}';`);
writeFileSync(swPath, sw);
console.log(`sw.js: ${urls.length} files cached, version ${version}`);
