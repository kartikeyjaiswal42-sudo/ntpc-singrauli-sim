import { EventBus, Events } from './EventBus.js';
import { computePlant } from './ProcessModel.js';

export class AppState {
  constructor(bus = new EventBus()) {
    this.bus = bus;
    this.load = 100;
    this.sul = 40;
    this.running = true;
    this.tripped = false;
    this.zone = 'overview';
    this.selection = 'boiler';
    this.tourActive = false;
    this.plant = computePlant(this.load, this.sul);
  }

  get snapshot() {
    return {
      load: this.load,
      sul: this.sul,
      running: this.running,
      tripped: this.tripped,
      zone: this.zone,
      selection: this.selection,
      tourActive: this.tourActive,
      plant: this.plant,
    };
  }

  setLoad(v) {
    this.load = Math.max(0, Math.min(100, v));
    if (this.load > 0 && this.tripped) this.tripped = false;
    this.#sync();
  }

  setSul(v) {
    this.sul = v;
    this.#sync();
  }

  setRunning(v) {
    this.running = v;
    this.#sync();
  }

  trip() {
    this.tripped = true;
    this.#sync();
  }

  setZone(z) {
    this.zone = z;
    this.bus.emit(Events.ZONE, z);
    this.#sync();
  }

  select(id) {
    if (this.selection === id) return;
    this.selection = id;
    this.bus.emit(Events.SELECT, id);
    this.#sync();
  }

  setTour(active) {
    this.tourActive = active;
    this.bus.emit(Events.TOUR, active);
    document.body.classList.toggle('tour', active);
    this.#sync();
  }

  #sync() {
    this.plant = computePlant(this.load, this.sul);
    this.bus.emit(Events.STATE, this.snapshot);
  }
}
