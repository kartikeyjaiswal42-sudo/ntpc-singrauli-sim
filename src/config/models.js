/**
 * GLTF asset manifest — positions tuned to match Singrauli plant layout.
 * Drop custom .glb files into public/models/ to override baked assets.
 */
export const MODEL_SLOTS = [
  { key: 'chimney', file: 'chimney.glb', pickId: 'stack', position: [-48, 0, 0], scale: 1 },
  { key: 'esp', file: 'esp.glb', pickId: 'esp', position: [-38, 0, 0], scale: 1 },
  { key: 'fgd', file: 'fgd.glb', pickId: 'fgd', position: [-32, 0, 0], scale: 1 },
  { key: 'coal_yard', file: 'coal_yard.glb', pickId: 'coal', position: [-28, 0, 8], scale: 1 },
  { key: 'boiler', file: 'boiler.glb', pickId: 'boiler', position: [-5, 0, 0], scale: 1 },
  { key: 'turbine_hall', file: 'turbine_hall.glb', pickId: 'turbine', position: [12, 10, 0], scale: 1 },
  { key: 'condenser', file: 'condenser.glb', pickId: 'condenser', position: [22, 0, 6], scale: 1 },
  { key: 'pump_house', file: 'pump_house.glb', pickId: 'pumphouse', position: [38, 0, 12], scale: 1 },
  { key: 'cooling_tower', file: 'cooling_tower.glb', pickId: 'cooltower', position: [55, 0, 8], scale: 1 },
  { key: 'switchyard', file: 'switchyard.glb', pickId: 'switchyard', position: [30, 0, -18], scale: 1 },
];
