import { SECTORS, sectorArc, sectorAtAngle, newGame, spin, update } from "./game.js";
import { WheelAudio } from "./audio.js";

const $ = (id) => document.getElementById(id);
const canvas = $("wheel");
const ctx = canvas.getContext("2d");
const audio = new WheelAudio();
const BEST_KEY = "pg-prizewheel-best";
let state = newGame();
let best = 0;
let charging = false;
let chargeStart = 0;
let power = 0;
let last = performance.now();
let lastTickSector = 0;
let confetti = [];

function setStatus(message) { $("status").textContent = message; }
function sync() {
  $("tokens").textContent = state.tokens;
  $("tickets").textContent = state.tickets;
  $("power").value = power;
  $("spin").disabled = state.phase === "spinning" || state.tokens === 0;
}
function beginCharge(event) {
  if (state.phase !== "ready" || state.tokens <= 0) return;
  charging = true;
  chargeStart = performance.now();
  power = 0;
  if (event.pointerId !== undefined) $("spin").setPointerCapture(event.pointerId);
  $("spin").textContent = "放開旋轉！";
}
function releaseCharge() {
  if (!charging) return;
  charging = false;
  if (spin(state, Math.max(.08, power))) {
    audio.play("spin");
    setStatus("轉盤旋轉中…");
    lastTickSector = sectorAtAngle(-state.angle);
  }
  power = 0;
  $("spin").textContent = "按住蓄力";
  sync();
}
function handle(events) {
  for (const event of events) {
    if (event.type !== "landed") continue;
    audio.play(event.sector.jackpot ? "win" : "tick");
    setStatus(event.sector.jackpot ? `彩虹大獎！+${event.tickets} 張虛擬票券！` : `${event.sector.label}！本局共 ${event.sessionTotal} 張`);
    if (event.sector.jackpot) makeConfetti();
    if (state.tickets > best) {
      best = state.tickets;
      $("best").textContent = best;
      void saveBest();
    }
    if (state.tokens === 0) setStatus(`本局結束：共 ${state.tickets} 張虛擬票券。`);
  }
}
async function saveBest() {
  try { await fetch(`/api/kv/${BEST_KEY}`, { method: "PUT", body: String(best) }); } catch {}
}
function tick(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (charging) power = Math.min(1, ((now - chargeStart) % 1800) / 1800);
  if (state.phase === "spinning") {
    handle(update(state, dt));
    const sector = sectorAtAngle(-state.angle);
    if (sector !== lastTickSector && state.angularVelocity > 1.1) { audio.play("tick"); lastTickSector = sector; }
  }
  updateConfetti(dt);
  sync();
  draw();
  requestAnimationFrame(tick);
}
function draw() {
  const size = canvas.width;
  const center = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(state.angle - Math.PI / 2);
  SECTORS.forEach((sector, index) => {
    const { start, end } = sectorArc(index);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, center - 8, start, end); ctx.closePath();
    ctx.fillStyle = sector.color; ctx.fill(); ctx.strokeStyle = "#fff7d4"; ctx.lineWidth = 3; ctx.stroke();
    const mid = (start + end) / 2;
    ctx.save(); ctx.rotate(mid); ctx.translate(center * .56, 0); ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#351642"; ctx.lineWidth = 4; ctx.font = `800 ${sector.weight < 1 ? 12 : 15}px system-ui`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.strokeText(sector.label, 0, 0); ctx.fillText(sector.label, 0, 0); ctx.restore();
  });
  ctx.restore();
  ctx.beginPath(); ctx.arc(center, center, 42, 0, Math.PI * 2); ctx.fillStyle = "#fff2a6"; ctx.fill(); ctx.strokeStyle = "#9d4a26"; ctx.lineWidth = 7; ctx.stroke();
  ctx.fillStyle = "#8c2758"; ctx.font = "900 18px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("樂", center, center);
  for (const bit of confetti) { ctx.fillStyle = bit.color; ctx.fillRect(bit.x, bit.y, 7, 11); }
}
function makeConfetti() {
  const colors = ["#ff4d80", "#ffe242", "#51ddcc", "#8e74ff"];
  confetti = Array.from({ length: 45 }, (_, i) => ({ x: Math.random() * 420, y: -Math.random() * 180, vy: 90 + Math.random() * 160, color: colors[i % colors.length] }));
}
function updateConfetti(dt) {
  for (const bit of confetti) bit.y += bit.vy * dt;
  confetti = confetti.filter((bit) => bit.y < 430);
}

$("spin").addEventListener("pointerdown", beginCharge);
$("spin").addEventListener("pointerup", releaseCharge);
$("spin").addEventListener("pointercancel", releaseCharge);
$("spin").addEventListener("keydown", (event) => { if ((event.code === "Space" || event.code === "Enter") && !event.repeat) { event.preventDefault(); beginCharge(event); } });
$("spin").addEventListener("keyup", (event) => { if (event.code === "Space" || event.code === "Enter") releaseCharge(); });
$("restart").addEventListener("click", () => { state = newGame(); power = 0; charging = false; confetti = []; setStatus("新一局：按住旋轉鍵蓄力"); sync(); });
$("mute").addEventListener("click", () => { audio.setEnabled(!audio.enabled); $("mute").setAttribute("aria-pressed", String(!audio.enabled)); $("mute").textContent = audio.enabled ? "靜音" : "開音效"; });

(async () => {
  try { const response = await fetch(`/api/kv/${BEST_KEY}`); const value = Number(await response.text()); if (response.ok && Number.isFinite(value)) best = value; } catch {}
  $("best").textContent = best;
  requestAnimationFrame(tick);
})();
