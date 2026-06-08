import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODEL_SLOTS } from '../config/models.js';

const BASE = import.meta.env.BASE_URL || './';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.progress = 0;
  }

  async loadAll(onProgress) {
    const total = MODEL_SLOTS.length;
    let done = 0;

    await Promise.all(
      MODEL_SLOTS.map(async (slot) => {
        const url = `${BASE}models/${slot.file}`;
        try {
          const gltf = await this.loader.loadAsync(url);
          this.cache.set(slot.key, gltf.scene);
        } catch (err) {
          console.warn(`GLTF missing: ${slot.file}`, err.message);
          this.cache.set(slot.key, null);
        }
        done += 1;
        this.progress = done / total;
        onProgress?.(this.progress, slot.key);
      })
    );
    return this.cache;
  }

  instantiate(key) {
    const src = this.cache.get(key);
    if (!src) return null;
    return src.clone(true);
  }
}
