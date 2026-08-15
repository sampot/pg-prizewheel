export const SECTORS = [
  { label: "2 票", tickets: 2, weight: 5, color: "#39b8d4" },
  { label: "5 票", tickets: 5, weight: 5, color: "#ffba3d" },
  { label: "再接再厲", tickets: 0, weight: 4, color: "#7659d6" },
  { label: "10 票", tickets: 10, weight: 4, color: "#ee5e75" },
  { label: "3 票", tickets: 3, weight: 5, color: "#31b77c" },
  { label: "20 票", tickets: 20, weight: 2, color: "#f37b35" },
  { label: "8 票", tickets: 8, weight: 4, color: "#478ce8" },
  { label: "50 票", tickets: 50, weight: 1, color: "#ed4db1" },
  { label: "1 票", tickets: 1, weight: 5, color: "#52b7a7" },
  { label: "彩虹大獎 100", tickets: 100, weight: 0.5, color: "#ffd72e", jackpot: true },
];

export const TOTAL_WEIGHT = SECTORS.reduce((sum, sector) => sum + sector.weight, 0);
const TAU = Math.PI * 2;
const FRICTION = 1.7;
const STOP_SPEED = 0.16;

export function newGame({ tokens = 5, angle = 0 } = {}) {
  return {
    angle: normalize(angle),
    angularVelocity: 0,
    phase: "ready",
    tokens,
    tickets: 0,
    bestSpin: 0,
    lastSector: null,
    spins: 0,
  };
}

export function spin(state, power = 0.65) {
  if (state.phase !== "ready" || state.tokens <= 0) return false;
  power = clamp(power, 0, 1);
  state.tokens -= 1;
  state.angularVelocity = 5.5 + power * 12.5;
  state.phase = "spinning";
  state.lastSector = null;
  state.spins += 1;
  return true;
}

export function update(state, dt) {
  const events = [];
  if (state.phase !== "spinning") return events;
  dt = clamp(dt, 0, 0.1);
  state.angle = normalize(state.angle + state.angularVelocity * dt);
  state.angularVelocity *= Math.exp(-FRICTION * dt);
  if (state.angularVelocity <= STOP_SPEED) {
    state.angularVelocity = 0;
    const index = sectorAtAngle(normalize(-state.angle));
    const sector = SECTORS[index];
    state.lastSector = sector;
    state.tickets += sector.tickets;
    state.bestSpin = Math.max(state.bestSpin, sector.tickets);
    state.phase = "ready";
    events.push({
      type: "landed",
      index,
      sector,
      tickets: sector.tickets,
      sessionTotal: state.tickets,
    });
  }
  return events;
}

export function sectorAtAngle(angle) {
  const position = normalize(angle) / TAU * TOTAL_WEIGHT;
  let cursor = 0;
  for (let index = 0; index < SECTORS.length; index++) {
    cursor += SECTORS[index].weight;
    if (position < cursor) return index;
  }
  return 0;
}

export function sectorArc(index) {
  const before = SECTORS.slice(0, index).reduce((sum, sector) => sum + sector.weight, 0);
  return {
    start: before / TOTAL_WEIGHT * TAU,
    end: (before + SECTORS[index].weight) / TOTAL_WEIGHT * TAU,
  };
}

function normalize(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
