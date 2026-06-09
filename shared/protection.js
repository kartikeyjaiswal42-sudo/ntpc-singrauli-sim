// protection.js — realistic plant protection / interlock / cascade-trip logic.
// Real units don't just "keep running" when something fails: protections arm,
// count down, then fire a trip that CASCADES (Master Fuel Trip → boiler → turbine
// → generator → grid separation). Some failures are explosive (furnace), some are
// statutory (CEMS emission limits). Shared by the 2D and 3D views.

export const LIMITS = { so2: 200, pm: 50, vacuumAbs: 0.245 };

// Each rule: a condition that, if held for `grace` seconds, fires a cascade.
const RULES = [
  {
    id: 'air', head: 'MASTER FUEL TRIP', target: 'c-furnace', explode: true, grace: 2.5, kind: 'boiler',
    label: 'loss of combustion air — FD fan stopped (unburnt fuel hazard)',
    cond: (s) => s.running && !s.fdFanOn,
  },
  {
    id: 'draught', head: 'FURNACE PROTECTION TRIP', target: 'c-furnace', explode: true, grace: 3, kind: 'boiler',
    label: 'furnace draught lost — ID fan stopped, furnace pressure excursion',
    cond: (s) => s.running && !s.idFanOn,
  },
  {
    id: 'dnb', head: 'BOILER PROTECTION TRIP', target: 'c-furnace', explode: true, grace: 6, kind: 'boiler',
    label: 'waterwall circulation lost — BCP off at load, DNB / tube rupture',
    cond: (s, r) => s.running && !s.bcpOn && (r.inputs?.loadFrac || 0) > 0.4,
  },
  {
    id: 'vac', head: 'TURBINE LOW-VACUUM TRIP', target: 'c-cond', explode: false, grace: 5, kind: 'turbine',
    label: 'condenser vacuum collapse — CW flow / cooling lost',
    cond: (s, r) => s.running && r.grossMW > 2 && (s.cwPumpPct <= 55 || s.cwInlet >= 34 || r.vacuumKgcm2g > LIMITS.vacuumAbs),
  },
  {
    id: 'so2', head: 'CEMS ENVIRONMENTAL TRIP', target: 'c-stack', explode: false, grace: 14, kind: 'unit',
    label: 'stack SO₂ over statutory limit — FGD bypassed',
    cond: (s, r) => s.running && !s.fgdOn && r.so2OutMg > LIMITS.so2,
  },
  {
    id: 'pm', head: 'CEMS ENVIRONMENTAL TRIP', target: 'c-esp', explode: false, grace: 14, kind: 'unit',
    label: 'particulate over statutory limit — ESP de-energised',
    cond: (s, r) => s.running && !s.espOn && r.pmOutMg > LIMITS.pm,
  },
];

const CHAINS = {
  boiler: [
    [0.0, 'crit', (h, l) => `${h} — ${l}`],
    [1.6, 'crit', () => 'Master Fuel Trip — all mills tripped, furnace flame lost'],
    [3.2, 'warn', () => 'Boiler tripped — drum pressure decaying, safety valves lifting'],
    [4.8, 'warn', () => 'Turbine trip — emergency stop valves slam shut (no steam)'],
    [6.2, 'warn', () => 'Generator breaker OPEN — unit separated from 400 kV grid'],
    [7.6, 'crit', () => 'UNIT TRIPPED · 0 MW · turbine coasting to barring gear'],
  ],
  turbine: [
    [0.0, 'crit', (h, l) => `${h} — ${l}`],
    [1.6, 'crit', () => 'Turbine stop valves closed — shaft decelerating from 3000 rpm'],
    [3.2, 'warn', () => 'Boiler MFT — steam demand lost, HP/LP bypass open'],
    [4.8, 'warn', () => 'Generator breaker OPEN — grid separation'],
    [6.2, 'crit', () => 'UNIT TRIPPED · 0 MW'],
  ],
  unit: [
    [0.0, 'crit', (h, l) => `${h} — ${l}`],
    [1.6, 'warn', () => 'Pollution Control Board limit breach logged — load runback'],
    [3.2, 'warn', () => 'CEMS-interlocked unit trip initiated'],
    [4.8, 'warn', () => 'Generator breaker OPEN — grid separation'],
    [6.2, 'crit', () => 'UNIT TRIPPED · 0 MW'],
  ],
};

export function createProtection() {
  return { timers: {}, trip: null };
}

export function resetProtection(P) {
  P.timers = {};
  P.trip = null;
}

function fireTrip(rule, now) {
  const chain = CHAINS[rule.kind].map(([at, sev, fn]) => ({ at, sev, text: fn(rule.head, rule.label) }));
  return { id: rule.id, head: rule.head, label: rule.label, target: rule.target, explode: rule.explode, t0: now, chain };
}

function cascadeState(P, now) {
  const age = now - P.trip.t0;
  const lines = P.trip.chain.filter((c) => age >= c.at);
  return {
    id: P.trip.id, target: P.trip.target, explode: P.trip.explode,
    head: P.trip.head, label: P.trip.label, age,
    lines, done: age >= P.trip.chain[P.trip.chain.length - 1].at + 1,
  };
}

// dt seconds, now = seconds. Returns { armed:[{id,head,label,remain,target}], trip:{…}|null, justTripped }
export function stepProtection(P, state, r, dt, now) {
  if (P.trip) return { armed: [], trip: cascadeState(P, now), justTripped: false };
  if (!state.running || state.tripped) { P.timers = {}; return { armed: [], trip: null, justTripped: false }; }

  const armed = [];
  for (const rule of RULES) {
    if (rule.cond(state, r)) {
      P.timers[rule.id] = (P.timers[rule.id] || 0) + dt;
      const remain = Math.max(0, rule.grace - P.timers[rule.id]);
      armed.push({ id: rule.id, head: rule.head, label: rule.label, remain, target: rule.target });
      if (P.timers[rule.id] >= rule.grace) {
        P.trip = fireTrip(rule, now);
        return { armed, trip: cascadeState(P, now), justTripped: true };
      }
    } else {
      P.timers[rule.id] = 0;
    }
  }
  return { armed, trip: null, justTripped: false };
}
