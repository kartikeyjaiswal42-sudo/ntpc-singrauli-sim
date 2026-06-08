import * as THREE from 'three';
import { MODEL_SLOTS } from '../config/models.js';
import { createChimney } from './parts/createChimney.js';
import { createBoiler } from './parts/createBoiler.js';
import { createTurbine } from './parts/createTurbine.js';
import { createPumpHouse } from './parts/createPumpHouse.js';
import { createCoalYard } from './parts/createCoalYard.js';
import {
  createCoolingTower,
  createCondenser,
  createReservoir,
  createAuxSkids,
  createSwitchyard,
} from './parts/createAux.js';

export class PlantAssembler {
  constructor(modelLoader) {
    this.modelLoader = modelLoader;
    this.pickables = [];
    this.spinners = [];
    this.furnaceGlow = null;
  }

  build() {
    const root = new THREE.Group();
    root.name = 'plantRoot';

    const loaded = MODEL_SLOTS.some((s) => this.modelLoader.cache.get(s.key));
    if (!loaded) {
      this.#legacyBuild(root);
      root.traverse((o) => this.#registerNode(o));
      return root;
    }

    for (const slot of MODEL_SLOTS) {
      const gltf = this.modelLoader.instantiate(slot.key);
      if (!gltf) continue;

      const group = new THREE.Group();
      group.name = slot.key;
      group.userData.id = slot.pickId;
      group.position.set(...slot.position);
      if (slot.scale !== 1) group.scale.setScalar(slot.scale);

      gltf.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      group.add(gltf);
      root.add(group);
    }

    root.add(createReservoir());
    root.add(createAuxSkids());

    root.traverse((o) => this.#registerNode(o));
    return root;
  }

  #legacyBuild(root) {
    root.add(
      createChimney(),
      createCoalYard(),
      createBoiler(),
      createTurbine(),
      createCondenser(),
      createReservoir(),
      createPumpHouse(),
      createCoolingTower(),
      createAuxSkids(),
      createSwitchyard()
    );
  }

  #registerNode(o) {
    if (o.name === 'furnaceGlow' && o.isMesh) {
      this.furnaceGlow = o;
    }
    if (o.userData?.glow && o.isMesh) {
      this.furnaceGlow = o.userData.glow;
    }

    if (o.name === 'spinner' || o.userData?.spin) {
      o.userData.spin = true;
      if (!o.userData.spinAxis) {
        let p = o.parent;
        while (p) {
          if (p.name === 'turbine_hall' || p.userData?.id === 'turbine') {
            o.userData.spinAxis = 'z';
            break;
          }
          p = p.parent;
        }
      }
      this.spinners.push(o);
    }
    if (o.name === 'spinnerX') {
      o.userData.spin = true;
      o.userData.spinAxis = 'x';
      this.spinners.push(o);
    }

    const id = o.userData?.id;
    if (id) {
      const box = new THREE.Box3().setFromObject(o);
      const size = box.getSize(new THREE.Vector3());
      if (size.length() > 0.5) {
        this.pickables.push(o);
      }
    }

    if (!id && o.parent?.userData?.id && o.isMesh) {
      o.userData.id = o.parent.userData.id;
      this.pickables.push(o);
    }
  }
}
