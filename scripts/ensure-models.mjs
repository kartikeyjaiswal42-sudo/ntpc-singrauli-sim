import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const marker = join(dirname(fileURLToPath(import.meta.url)), '../public/models/chimney.glb');
if (!existsSync(marker)) {
  console.log('GLTF models missing — running bake-models…');
  const r = spawnSync('node', ['scripts/bake-models.mjs'], { stdio: 'inherit', cwd: join(dirname(fileURLToPath(import.meta.url)), '..') });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
