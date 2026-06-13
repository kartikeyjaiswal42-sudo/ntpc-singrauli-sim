// NTPC Singrauli Stage-II (500 MW) — individual equipment descriptions

function fmt(x, d = 0) {
  if (!isFinite(x)) return '—';
  return Number(x).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const shared = {
  coal: (r) => [['Coal firing', `${fmt(r.coalTh, 0)} t/h`], ['GCV', `${fmt(r.inputs.gcv, 0)} kcal/kg`]],
  steam: (r) => [['Main steam', `${fmt(r.steamTh, 0)} t/h`], ['MS temp', `${fmt(r.msT, 0)} °C`]],
  power: (r) => [['Gross', `${fmt(r.grossMW, 0)} MW`], ['Net to grid', `${fmt(r.netMW, 0)} MW`]],
  cw: (r) => [['CW flow', `${fmt(r.cwM3h, 0)} m³/h`], ['Vacuum', `${fmt(r.vacuumKgcm2g, 3)} kg/cm²(g)`]],
  emiss: (r) => [['SO₂ stack', `${fmt(r.so2OutMg, 0)} mg/Nm³`], ['PM stack', `${fmt(r.pmOutMg, 1)} mg/Nm³`]],
};

export const EQUIPMENT = {
  'c-mgr': {
    zone: 'z-fuel', name: 'MGR railway from NCL mines', tag: 'Coal transport',
    body: 'The Merry-Go-Round railway brings coal from Northern Coalfields mines serving Singrauli, including Jayant and Bina. Bottom-discharge wagons unload into the track hopper for continuous conveyor handling.',
    specs: ['Coal source: Jayant / Bina mines', 'Track: dedicated MGR loop'],
    metrics: shared.coal,
  },
  'c-hopper': {
    zone: 'z-fuel', name: 'Track hopper & tippler', tag: 'CHP inlet',
    body: 'Continuous bottom-discharge into the track hopper. Vibrating feeders meter coal onto the trunk conveyors. Dust suppression and belt fire-detection protect the CHP.',
    specs: ['Hopper length: 220 m', 'Feed rate: up to 2400 MTPH'],
    metrics: (r) => [['Coal to mills', `${fmt(r.coalTh, 0)} t/h`], ['Mills active', `${r.inputs.millsInService}/3`]],
  },
  'c-chp': {
    zone: 'z-fuel', name: 'Coal Handling Plant (CHP)', tag: '2400 MTPH',
    body: 'Double-stream belt conveyors, magnetic separators, metal detectors, and tripper conveyors feed coal bunkers above the boiler house. Crusher house handles oversize.',
    specs: ['Design: 2400 MTPH', 'Belt fire detection + water spray'],
    metrics: shared.coal,
  },
  'c-bunker': {
    zone: 'z-fuel', name: 'Coal bunkers', tag: 'Live storage',
    body: 'Gravity-fed bunkers hold ~8–12 hours of pulverised-fuel reserve. Level switches and gravimetric feeders control coal flow to each XRP mill.',
    specs: ['Typical hold-up: several hundred tonnes', 'Feeders: gravimetric'],
    metrics: (r) => [['Coal firing', `${fmt(r.coalTh, 0)} t/h`], ['Load', `${fmt(r.inputs.loadFrac * 100, 0)}%`]],
  },
  'c-mill': {
    zone: 'z-fuel', name: 'XRP 1003 bowl mills (×3)', tag: 'Pulverising',
    body: 'Three BHEL XRP 1003 bowl-and-roller mills grind coal to 70% through 200 mesh. Hot primary air dries coal and carries pulverised fuel to corner burners.',
    specs: ['Type: XRP 1003', 'PA tempering from APH'],
    metrics: (r) => [['Mills in service', `${r.inputs.millsInService}/3`], ['Coal', `${fmt(r.coalTh, 0)} t/h`]],
  },
  'c-forebay': {
    zone: 'z-dm', name: 'Raw water forebay', tag: 'Rihand intake',
    body: 'Canal forebay from Rihand reservoir stores raw makeup water. Screens remove debris before pumps lift water to clarifiers. Forebay level is critical during summer drawdown.',
    specs: ['Source: Rihand canal', 'Screens + trash racks'],
    metrics: (r) => [['Make-up need', `${fmt(r.cwM3h * 0.02, 0)} m³/h (≈ blowdown)`], ['CW inlet', `${fmt(r.cwInlet, 0)} °C`]],
  },
  'c-dm': {
    zone: 'z-dm', name: 'DM water treatment plant', tag: 'Feedwater purity',
    body: 'Clarifier → PSF → ACF → SAC → degasser → SBA → mixed-bed polisher. Produces demineralised water for boiler feed (<5 µS/cm, silica <0.02 ppm).',
    specs: ['Mixed bed outlet: <5 µS/cm', 'Silica: <0.02 ppm'],
    metrics: (r) => [['Feedwater ≈ steam', `${fmt(r.steamTh, 0)} t/h`], ['Boiler P', `${fmt(r.msP, 0)} kg/cm²`]],
  },
  'c-deaerator': {
    zone: 'z-dm', name: 'Deaerator (DA) tank', tag: 'O₂ removal',
    body: 'Spray-tray deaerator strips dissolved oxygen using LP steam. Oxygen >7 ppb causes pitting in feedwater lines and economiser. DA also acts as feedwater storage.',
    specs: ['Target O₂: <7 ppb', 'Heating: LP extraction steam'],
    metrics: (r) => [['Feed flow', `${fmt(r.steamTh, 0)} t/h`], ['Boiler eff', `${fmt(r.boilerEff * 100, 1)}%`]],
  },
  'c-chlorine': {
    zone: 'z-cw', name: 'Chlorination / ClO₂ plant', tag: 'CW biocide',
    body: 'Chlorine or chlorine dioxide dosing prevents biofouling in the once-through CW intake and condenser tubes. Without biocide, slime layers reduce heat transfer, destroy vacuum, and raise heat rate.',
    specs: ['Dosing: ClO₂ continuous', 'Monitoring: residual chlorine'],
    metrics: (r) => [['ClO₂ active', r.inputs.clO2On ? 'ON' : 'OFF'], ['CW ΔT', `${fmt(r.cwOutlet - r.cwInlet, 1)} °C`]],
  },
  'c-drum': {
    zone: 'z-boiler', name: 'Steam drum', tag: 'CC+ separator',
    body: 'Large horizontal drum at boiler top separates steam from water. Internals (cyclone separators, chevrons) ensure dry steam to superheater. Maintains circulation inventory for CC+.',
    specs: ['Design P: 170 kg/cm²', 'Level control: 3-element'],
    metrics: shared.steam,
  },
  'c-eco': {
    zone: 'z-boiler', name: 'Economizer', tag: 'Feedwater heating',
    body: 'Finned tubes heat feedwater using flue gas before it enters the steam drum — recovering ~3% boiler efficiency. Outlet feedwater approaches saturation at drum pressure.',
    specs: ['Location: flue gas path', 'Material: carbon steel'],
    metrics: shared.steam,
  },
  'c-sh': {
    zone: 'z-boiler', name: 'Superheater', tag: '537 °C MS',
    body: 'Radiant and convective superheater sections raise steam to 537 °C at 170 kg/cm². Attemperation (spray) provides fine temperature control at part load.',
    specs: ['Final MS: 537 °C', 'Attemperator: spray type'],
    metrics: (r) => [['MS temp', `${fmt(r.msT, 0)} °C`], ['MS pressure', `${fmt(r.msP, 0)} kg/cm²`]],
  },
  'c-rh': {
    zone: 'z-boiler', name: 'Reheater', tag: '537 °C reheat',
    body: 'Cold reheat steam from the HP turbine exhaust returns to boiler reheater tubes, then hot reheat steam enters the IP turbine at about 537 °C. Burner tilt primarily controls reheat temperature.',
    specs: ['Reheat out: 537 °C', 'Tilt range: ±30°'],
    metrics: (r) => [['Burner tilt', `${r.inputs.burnerTilt > 0 ? '+' : ''}${r.inputs.burnerTilt}°`], ['MS temp', `${fmt(r.msT, 0)} °C`]],
  },
  'c-tubes': {
    zone: 'z-boiler', name: 'Waterwalls & rifled tubes', tag: 'CC+ circulation',
    body: 'Vertical rifled waterwall tubes line the furnace. Three BCPs force water upward (CC+) preventing DNB at 170 kg/cm². Downcomers and headers complete the circulation loop.',
    specs: ['BCP: 3×100%', 'Material: SA-210 rifled'],
    metrics: (r) => [['BCP status', r.inputs.bcpOn ? 'Running' : 'OFF'], ['Boiler eff', `${fmt(r.boilerEff * 100, 1)}%`]],
  },
  'c-furnace': {
    zone: 'z-boiler', name: 'Furnace & fireball', tag: 'Combustion chamber',
    body: 'Tilting tangential corner firing creates a rotating fireball in the water-cooled furnace. Heat flux peaks near the burner zone; slagging is managed by operating practice.',
    specs: ['Firing: tangential corner', 'Heat release: high-intensity'],
    metrics: (r) => [['Coal burn', `${fmt(r.coalTh, 0)} t/h`], ['Excess air', `${Math.round((r.inputs.excessAir - 1) * 100)}%`]],
  },
  'c-burner': {
    zone: 'z-boiler', name: 'Tilting tangential burners', tag: 'Corner firing',
    body: 'Four corner burner levels with tilting nozzles (±30°). Tilt adjusts flame path length to control reheat steam temperature without attemperation at base load.',
    specs: ['Levels: 4 corners', 'Tilt: ±30°'],
    metrics: (r) => [['Tilt set', `${r.inputs.burnerTilt > 0 ? '+' : ''}${r.inputs.burnerTilt}°`], ['MS temp', `${fmt(r.msT, 0)} °C`]],
  },
  'c-bcp': {
    zone: 'z-boiler', name: 'Boiler circulating pumps (BCP ×3)', tag: 'CC+ forced circulation',
    body: 'Three 100% capacity BCPs maintain forced circulation through waterwalls at supercritical pressures in a sub-critical drum boiler — the CC+ design feature.',
    specs: ['Capacity: 3×100%', 'Motor: high-head'],
    metrics: (r) => [['BCP', r.inputs.bcpOn ? 'ON' : 'OFF'], ['Load', `${fmt(r.inputs.loadFrac * 100, 0)}%`]],
  },
  'c-bah': {
    zone: 'z-ash', name: 'Bottom ash hopper', tag: 'Wet bottom ash',
    body: 'Water-impounded hopper beneath furnace collects clinker and ash. Clinker grinders reduce size; jet pumps send slurry to ash dyke.',
    specs: ['Type: water impounded', 'Grinders: clinker crushers'],
    metrics: (r) => [['Total ash', `${fmt(r.ashTh, 0)} t/h`], ['Bottom ash ≈', `${fmt(r.ashTh * 0.2, 0)} t/h`]],
  },
  'c-fd': {
    zone: 'z-boiler', name: 'FD fan (forced draft)', tag: 'Combustion air supply',
    body: 'Forced draft fan supplies combustion air through APH to mills and furnace. FD fan trip = immediate flame loss. Largest motor in boiler island.',
    specs: ['Type: axial/centrifugal', 'Variable inlet vanes'],
    metrics: (r) => [['FD fan', r.inputs.fdFanOn ? 'RUNNING' : 'TRIPPED'], ['Combustion air', `${fmt(r.airKgh / 1000, 0)} t/h`]],
  },
  'c-idf': {
    zone: 'z-env', name: 'ID fan (induced draft)', tag: 'Flue gas draft',
    body: 'The induced draft fan sits downstream of the ESP and pulls flue gas through the boiler rear pass and air preheater. It maintains negative furnace pressure and pushes gas toward the FGD retrofit and stack.',
    specs: ['Order: APH → ESP → ID fan', 'Controls furnace draft'],
    metrics: (r) => [['ID fan', r.inputs.idFanOn ? 'RUNNING' : 'OFF'], ['Flue gas', `${fmt(r.flueNm3h / 1000, 0)}k Nm³/h`]],
  },
  'c-paf': {
    zone: 'z-boiler', name: 'PA fan (primary air)', tag: 'Mill drying & transport',
    body: 'Primary air fan supplies hot air from APH to coal mills for drying and PF transport to burners. PA flow split between operating mills.',
    specs: ['Heated via APH', 'Per-mill PA ducts'],
    metrics: (r) => [['Mills', `${r.inputs.millsInService}/3`], ['Air total', `${fmt(r.airKgh / 1000, 0)} t/h`]],
  },
  'c-aph': {
    zone: 'z-boiler', name: 'Air preheater (Ljungström APH)', tag: 'Heat recovery',
    body: 'Rotating regenerative APH preheats combustion air using flue gas heat — critical for boiler efficiency (~2.5% HR impact). Leakage affects draft balance.',
    specs: ['Type: regenerative', 'Flue gas ↔ combustion air'],
    metrics: (r) => [['Boiler eff', `${fmt(r.boilerEff * 100, 1)}%`], ['Gross HR', `${fmt(r.grossHR, 0)} kcal/kWh`]],
  },
  'c-hp': {
    zone: 'z-turbine', name: 'HP turbine (single flow)', tag: 'High pressure stage',
    body: 'Single-flow HP cylinder accepts 170 kg/cm² / 537 °C steam. Exhaust goes to cold reheat line at ~41.8 kg/cm². Throttle governing controls load.',
    specs: ['Inlet: 170 kg/cm², 537 °C', 'Stages: HP reaction blading'],
    metrics: shared.power,
  },
  'c-ip': {
    zone: 'z-turbine', name: 'IP turbine (double flow)', tag: 'Intermediate pressure',
    body: 'Double-flow IP accepts hot reheat steam at 537 °C. Symmetric flow minimises axial thrust. Exhaust feeds crossover to LP cylinders.',
    specs: ['Reheat in: 537 °C', 'Double-flow design'],
    metrics: (r) => [['Shaft speed', `${fmt(r.rpm, 0)} rpm`], ['Cycle eff', `${fmt(r.cycleEff * 100, 1)}%`]],
  },
  'c-lp': {
    zone: 'z-turbine', name: 'LP turbine (double flow ×2)', tag: 'Low pressure exhaust',
    body: 'Two double-flow LP modules (2×6 stages) with 1050 mm last-stage blades exhaust wet steam to surface condenser at ~0.1 bar abs.',
    specs: ['Last blade: 1050 mm', 'Exhaust: to condenser'],
    metrics: (r) => [['Vacuum', `${fmt(r.vacuumKgcm2g, 3)} kg/cm²(g)`], ['Condenser duty', `${fmt(r.grossMW * 2.2, 0)} MWth (≈)`]],
  },
  'c-gen': {
    zone: 'z-turbine', name: 'Generator (THDF 500 MW)', tag: '21 kV · H₂ cooled',
    body: 'BHEL THDF two-pole generator at 3000 rpm. Hydrogen-cooled rotor reduces windage; stator cooled by demin water in hollow conductors. Seal-oil system prevents H₂ escape.',
    specs: ['Rating: 500 MW', 'Voltage: 21 kV', 'Cooling: H₂ + stator water'],
    metrics: (r) => [['Output', `${fmt(r.grossMW, 0)} MW`], ['Frequency', `${fmt(r.freq || 50, 1)} Hz`]],
  },
  'c-cond': {
    zone: 'z-turbine', name: 'Surface condenser', tag: 'CW inlet / outlet',
    body: 'LP exhaust steam condenses outside titanium/stainless tubes while Rihand cooling water flows inside. The warmed once-through water leaves through the discharge channel. Vacuum determines cycle efficiency.',
    specs: ['Design vacuum: ~0.1 bar abs', 'Tube material: Ti/SS'],
    metrics: (r) => [
      ['CW inlet (cold)', `${fmt(r.cwInlet, 0)} °C`],
      ['CW outlet (hot)', `${fmt(r.cwOutlet, 1)} °C`],
      ['Vacuum', `${fmt(r.vacuumKgcm2g, 3)} kg/cm²(g)`],
    ],
  },
  'c-cep': {
    zone: 'z-turbine', name: 'Condensate extraction pump', tag: 'Hotwell → LP heaters',
    body: 'The CEP removes condensate from the condenser hotwell and sends it through the low-pressure regenerative heaters toward the deaerator.',
    specs: ['Suction: condenser hotwell', 'Discharge: LP heater train'],
    metrics: (r) => [['Condensate flow', `${fmt(r.steamTh, 0)} t/h`], ['Condenser vacuum', `${fmt(r.vacuumKgcm2g, 3)} kg/cm²(g)`]],
  },
  'c-lph': {
    zone: 'z-turbine', name: 'Low-pressure heaters', tag: 'Regenerative feed heating',
    body: 'LP turbine extraction steam heats condensate before the deaerator, reducing the boiler heat input required for each kilogram of steam.',
    specs: ['Heating source: LP extractions', 'Location: condensate line'],
    metrics: (r) => [['Condensate flow', `${fmt(r.steamTh, 0)} t/h`], ['Cycle efficiency', `${fmt(r.cycleEff * 100, 1)}%`]],
  },
  'c-hph': {
    zone: 'z-turbine', name: 'High-pressure heaters', tag: 'Final feed heating',
    body: 'After the boiler feed pump, HP turbine extraction steam raises feedwater temperature before it enters the economizer.',
    specs: ['Heating source: HP/IP extractions', 'Location: BFP → economizer'],
    metrics: (r) => [['Feedwater flow', `${fmt(r.steamTh, 0)} t/h`], ['Main steam pressure', `${fmt(r.msP, 0)} kg/cm²`]],
  },
  'c-tdbfp': {
    zone: 'z-turbine', name: 'TDBFP (steam-driven feed pump)', tag: 'Main feed pump',
    body: 'Turbine-driven boiler feed pump uses auxiliary steam extraction. More efficient than motor drive at full load — reduces auxiliary power consumption.',
    specs: ['Drive: auxiliary steam', 'Standby: MDBFP'],
    metrics: (r) => [['TDBFP', r.inputs.useTdbfp ? 'IN SERVICE' : 'Standby'], ['Feed ≈ steam', `${fmt(r.steamTh, 0)} t/h`]],
  },
  'c-mdbfp': {
    zone: 'z-turbine', name: 'MDBFP (motor-driven feed pump)', tag: 'Start-up / standby',
    body: 'Motor-driven BFP for start-up, low load, and TDBFP standby. Higher auxiliary load when in service vs TDBFP.',
    specs: ['Motor: multi-MW', 'Used: start-up'],
    metrics: (r) => [['MDBFP mode', !r.inputs.useTdbfp ? 'IN SERVICE' : 'Standby'], ['Aux load', `${fmt(r.auxMW, 1)} MW`]],
  },
  'c-bfp-boost': {
    zone: 'z-turbine', name: 'Booster feed pump', tag: 'Suction pressure',
    body: 'Booster pump on deaerator outlet raises NPSH available to main BFP, preventing cavitation at high feedwater temperatures.',
    specs: ['Location: DA outlet', 'Low-head high-flow'],
    metrics: (r) => [['Feed flow', `${fmt(r.steamTh, 0)} t/h`], ['MS pressure', `${fmt(r.msP, 0)} kg/cm²`]],
  },
  'c-cwp': {
    zone: 'z-cw', name: 'Circulating water pumps', tag: 'Rihand intake → condenser',
    body: 'Vertical CW pumps draw screened water from the Rihand intake and push it through condenser tubes. Because Stage-I/II use once-through cooling, the warmed water leaves through the discharge channel instead of returning to cooling towers.',
    specs: ['Type: vertical turbine', 'System: open / once-through', 'Design ΔT: 9.5 °C'],
    metrics: (r) => [
      ['Pump speed', `${r.inputs.cwPumpPct}%`],
      ['CW flow', `${fmt(r.cwM3h, 0)} m³/h`],
    ],
  },
  'c-outfall': {
    zone: 'z-cw', name: 'Hot-water discharge channel', tag: 'Once-through CW return',
    body: 'Singrauli Stage-I and Stage-II use once-through cooling. Water drawn from the Rihand Reservoir passes through the condenser once, then leaves through the hot-water discharge channel.',
    specs: ['Cooling system: open / once-through', 'Source and receiving body: Rihand Reservoir'],
    metrics: (r) => [
      ['Discharge water', `${fmt(r.cwOutlet, 1)} °C`],
      ['Temperature rise', `${fmt(r.cwDeltaT, 1)} °C`],
    ],
  },
  'c-esp': {
    zone: 'z-env', name: 'Electrostatic precipitator (ESP)', tag: 'Fly ash collection',
    body: 'Multi-field ESP with collecting plates and discharge electrodes. Rapping dislodges ash to hoppers. >99.9% PM collection when energised. Fields can be isolated for maintenance.',
    specs: ['Efficiency: >99.9%', 'Fields: multi-compartment'],
    metrics: (r) => [
      ['ESP', r.inputs.espOn ? 'ENERGISED' : 'OFF'],
      ['PM stack', `${fmt(r.pmOutMg, 1)} mg/Nm³`],
    ],
  },
  'c-fgd': {
    zone: 'z-env', name: 'Wet FGD retrofit / bypass', tag: 'SO₂ scrubbing',
    body: 'The retrofit path routes flue gas through a wet-limestone absorber when in service. Limestone slurry captures SO₂ and oxidation produces gypsum; the simulation toggle also demonstrates bypass operation.',
    specs: ['Retrofit equipment', 'Sorbent: limestone slurry', 'By-product: gypsum'],
    metrics: (r) => [
      ['FGD', r.inputs.fgdOn ? 'RUNNING' : 'BYPASS'],
      ['SO₂ stack', `${fmt(r.so2OutMg, 0)} mg/Nm³`],
      ['Gypsum', `${fmt(r.gypsumTh, 1)} t/h`],
    ],
  },
  'c-stack': {
    zone: 'z-env', name: 'Chimney stack (500 MW)', tag: 'Flue gas exit',
    body: 'Multi-flue reinforced concrete stack discharges cleaned flue gas. Height ensures dispersion; CEMS monitors SO₂, NOx, PM at outlet.',
    specs: ['Flues: unit-specific', 'CEMS: continuous monitoring'],
    metrics: shared.emiss,
  },
  'c-flue': {
    zone: 'z-env', name: 'Flue gas ducting', tag: 'Boiler → stack path',
    body: 'Large insulated ducts carry flue gas in the correct order: furnace and rear-pass heating surfaces → APH → ESP → ID fan → FGD retrofit or bypass → stack.',
    specs: ['Path: APH → ESP → ID fan → FGD/bypass → stack', 'Insulated steel duct'],
    metrics: (r) => [['Flue flow', `${fmt(r.flueNm3h / 1000, 0)}k Nm³/h`], ['CO₂', `${fmt(r.co2Th, 0)} t/h`]],
  },
  'c-flyash': {
    zone: 'z-ash', name: 'Fly ash handling (AHP)', tag: 'ESP hoppers → silo',
    body: 'ESP hoppers discharge to pneumatic conveyors. Dense-phase transport to fly ash silos. Ash sold for PPC cement and fly-ash bricks — NTPC targets 100% utilisation.',
    specs: ['Transport: pneumatic', 'Storage: silos'],
    metrics: (r) => [['Fly ash ≈', `${fmt(r.ashTh * 0.8, 0)} t/h`], ['ESP PM out', `${fmt(r.pmOutMg, 1)} mg/Nm³`]],
  },
  'c-bottom-ash': {
    zone: 'z-ash', name: 'Bottom ash slurry system', tag: 'Hopper → dyke',
    body: 'Bottom ash + water slurry pumped through pipeline to ash dyke ponds. Crushers handle clinker; jet pumps provide transport energy.',
    specs: ['Transport: slurry pipeline', 'Crushers: clinker grinders'],
    metrics: (r) => [['Bottom ash ≈', `${fmt(r.ashTh * 0.2, 0)} t/h`], ['Total ash', `${fmt(r.ashTh, 0)} t/h`]],
  },
  'c-dyke': {
    zone: 'z-ash', name: 'Offsite ash dyke', tag: 'Slurry disposal',
    body: 'Bottom-ash slurry is pumped to the offsite ash dyke, where solids settle and decanted water is returned through the ash-water recirculation system.',
    specs: ['Approx. 12 km from station', 'Decant water recycle'],
    metrics: (r) => [['Ash total', `${fmt(r.ashTh, 0)} t/h`], ['Fly/bottom split', '80/20']],
  },
  'c-h2': {
    zone: 'z-h2', name: 'Hydrogen generation plant', tag: 'Generator cooling gas',
    body: 'Electrolysers produce H₂ on site (~2×15 m³/h). Driers remove moisture; purity >98%. H₂ manifold feeds generator casing for rotor cooling.',
    specs: ['Electrolysers: 2×15 m³/h', 'Purity: >98%'],
    metrics: (r) => [['Gen load', `${fmt(r.grossMW, 0)} MW`], ['Efficiency', `${fmt(r.effNet * 100, 1)}%`]],
  },
  'c-ipb': {
    zone: 'z-grid', name: 'Isolated phase busduct (IPB)', tag: '21 kV connection',
    body: 'Enclosed aluminium busduct connects generator terminals to GT and UAT. Phase-isolated design contains fault arc and prevents inter-phase faults.',
    specs: ['Voltage: 21 kV', 'Cooling: natural/forced air'],
    metrics: (r) => [['Gross', `${fmt(r.grossMW, 0)} MW`], ['Current', `${fmt(r.grossMW / (Math.sqrt(3) * 21 * 0.95), 0)} kA (≈)`]],
  },
  'c-gt': {
    zone: 'z-grid', name: 'Generator transformer (GT)', tag: '21 → 400 kV',
    body: 'Main step-up transformer raises generator voltage from 21 kV to 400 kV for transmission. ON-load tap changer may regulate voltage.',
    specs: ['Ratio: 21/400 kV', 'Rating: 500 MVA class'],
    metrics: (r) => [['Net export', `${fmt(r.netMW, 0)} MW`], ['Auxiliary', `${fmt(r.auxMW, 1)} MW`]],
  },
  'c-uat': {
    zone: 'z-grid', name: 'Unit auxiliary transformer (UAT)', tag: '6.6 / 11 kV aux',
    body: 'Steps down from generator bus to 6.6/11 kV for plant auxiliaries — CW pumps, mills, fans, DM plant, coal handling.',
    specs: ['Aux bus: 6.6/11 kV', 'Fed from GT secondary'],
    metrics: (r) => [['Aux load', `${fmt(r.auxMW, 1)} MW`], ['Aux fraction', `${fmt(r.auxMW / Math.max(r.grossMW, 1) * 100, 1)}%`]],
  },
  'c-yard': {
    zone: 'z-grid', name: '400 kV switchyard', tag: 'Power evacuation',
    body: 'Outdoor GIS/AIS yard with SF₆ circuit breakers, isolators, CTs, PTs, and lightning arresters. Feeds regional grid via 400 kV transmission lines.',
    specs: ['Voltage: 400 kV', 'Breakers: SF₆'],
    metrics: (r) => [['Net to grid', `${fmt(r.netMW, 0)} MW`], ['Net HR', `${fmt(r.netHR, 0)} kcal/kWh`]],
  },
  'c-compressor': {
    zone: 'z-aux', name: 'Instrument air compressors', tag: 'Plant pneumatics',
    body: 'Oil-free screw compressors supply instrument air (~6 kg/cm²) for control valves, damper drives, and ESP rapping. Air dryers maintain low dew point.',
    specs: ['Pressure: ~6 kg/cm²', 'Dryers: desiccant type'],
    metrics: (r) => [['Plant load', `${fmt(r.inputs.loadFrac * 100, 0)}%`], ['Flue gas', `${fmt(r.flueNm3h / 1000, 0)}k Nm³/h`]],
  },
};

/** Sidebar groups — coal → grid flow */
export const EQUIPMENT_GROUPS = [
  { name: 'Coal & CHP', ids: ['c-mgr', 'c-hopper', 'c-chp', 'c-bunker', 'c-mill'] },
  { name: 'Water treatment', ids: ['c-forebay', 'c-dm', 'c-deaerator', 'c-chlorine'] },
  { name: 'Boiler island', ids: ['c-drum', 'c-eco', 'c-sh', 'c-rh', 'c-tubes', 'c-furnace', 'c-burner', 'c-bcp', 'c-fd', 'c-idf', 'c-paf', 'c-aph'] },
  { name: 'Turbine & feedwater', ids: ['c-hp', 'c-ip', 'c-lp', 'c-gen', 'c-cond', 'c-cep', 'c-lph', 'c-deaerator', 'c-tdbfp', 'c-mdbfp', 'c-bfp-boost', 'c-hph'] },
  { name: 'Once-through cooling water', ids: ['c-cwp', 'c-outfall'] },
  { name: 'Flue gas & emissions', ids: ['c-flue', 'c-esp', 'c-fgd', 'c-stack'] },
  { name: 'Ash handling', ids: ['c-bah', 'c-flyash', 'c-bottom-ash', 'c-dyke'] },
  { name: 'Hydrogen & grid', ids: ['c-h2', 'c-ipb', 'c-gt', 'c-uat', 'c-yard', 'c-compressor'] },
];

/** Legacy zone-level summaries (fallback) */
export const COMPONENTS = Object.fromEntries(
  Object.entries({
    'z-fuel': 'c-mill', 'z-boiler': 'c-furnace', 'z-turbine': 'c-gen',
    'z-dm': 'c-dm', 'z-cw': 'c-outfall', 'z-env': 'c-esp', 'z-ash': 'c-dyke',
    'z-h2': 'c-h2', 'z-grid': 'c-yard', 'z-aux': 'c-compressor',
  }).map(([z, c]) => [z, EQUIPMENT[c]]),
);
