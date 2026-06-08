import { Events } from '../core/EventBus.js';
import { ZONES } from '../config/zones.js';

export class AutoTour {
  constructor(state, world) {
    this.state = state;
    this.world = world;
    this.idx = 0;
    this.timer = null;
    this.overlay = document.getElementById('tour-overlay');
    this.title = document.getElementById('tour-title');
    this.desc = document.getElementById('tour-desc');
    this.dots = document.getElementById('tour-dots');
    this.dots.innerHTML = ZONES.map(() => '<i></i>').join('');

    document.getElementById('tour-skip').onclick = () => this.stop();
    state.bus.on(Events.TOUR, (on) => {
      if (!on) this.clearTimer();
    });
  }

  start() {
    if (this.state.tourActive) return this.stop();
    this.state.setTour(true);
    this.overlay.classList.remove('hidden');
    this.idx = 0;
    this.step();
    document.getElementById('tourBtn')?.classList.add('on');
    document.getElementById('tourBtn').textContent = '■ Stop Tour';
  }

  stop() {
    this.clearTimer();
    this.state.setTour(false);
    this.overlay.classList.add('hidden');
    document.getElementById('tourBtn')?.classList.remove('on');
    document.getElementById('tourBtn').textContent = '▶ Auto Tour';
    this.world.flyToZone('overview');
    this.state.setZone('overview');
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  step() {
    if (!this.state.tourActive) return;
    const z = ZONES[this.idx];
    this.title.textContent = z.title;
    this.desc.textContent = z.desc;
    this.dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === this.idx));
    this.state.setZone(z.id);
    this.world.flyToZone(z.id, 1.8);
    this.idx = (this.idx + 1) % ZONES.length;
    this.timer = setTimeout(() => this.step(), 6500);
  }
}
