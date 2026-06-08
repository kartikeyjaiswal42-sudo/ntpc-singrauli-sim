/**
 * Bakes procedural meshes → public/models/*.glb via headless Chrome.
 * Run: npm run bake-models
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/models');
mkdirSync(OUT, { recursive: true });

console.log('Baking GLTF models → public/models/');

const vite = await createServer({
  root: ROOT,
  server: { port: 9765, strictPort: true },
  logLevel: 'error',
});
await vite.listen();
const url = `http://localhost:9765/bake.html`;

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
} catch {
  browser = await chromium.launch({ headless: true });
}

const page = await browser.newPage();
await page.exposeFunction('__saveGlb', (name, bytes) => {
  writeFileSync(join(OUT, `${name}.glb`), Buffer.from(bytes));
  console.log(`  ✓ ${name}.glb`);
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__BAKE_DONE__ === true, { timeout: 120000 });

await browser.close();
await vite.close();
console.log('Done.');
