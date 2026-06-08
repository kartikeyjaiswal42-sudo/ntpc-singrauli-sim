/**
 * NTPC Singrauli — modular 3D plant simulation (Vite + GLTF)
 */
import '../styles/app.css';
import { AppState } from './core/AppState.js';
import { PlantWorld } from './scene/PlantWorld.js';
import { AutoTour } from './tour/AutoTour.js';
import { HUD } from './ui/HUD.js';

const canvas = document.getElementById('viewport');
const loading = document.getElementById('loading');
const loadingBar = document.getElementById('loading-bar');

const state = new AppState();

try {
  const world = await PlantWorld.create(canvas, state, (pct, key) => {
    const pctLabel = Math.round(pct * 100);
    loading.textContent = `Loading GLTF models… ${pctLabel}%`;
    if (loadingBar) loadingBar.style.width = `${pctLabel}%`;
    if (key) loading.dataset.model = key;
  });

  const tour = new AutoTour(state, world);
  new HUD(document.getElementById('hud-root'), state, world, tour);

  state.setZone('overview');
  state.select('boiler');
  world.flyToZone('overview', 0);

  loading.classList.add('done');
  setTimeout(() => loading.remove(), 600);

  document.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') tour.start();
    if (e.key === 'Escape' && state.tourActive) tour.stop();
    if (e.key === ' ') {
      e.preventDefault();
      state.setRunning(!state.running);
      document.getElementById('pauseBtn').textContent = state.running ? '⏸' : '▶';
    }
  });
} catch (e) {
  loading.textContent = 'Failed to load: ' + e.message;
  loading.style.color = '#f87171';
  console.error(e);
}
