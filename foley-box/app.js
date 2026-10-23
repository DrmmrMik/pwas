import { SOUNDS, CATEGORIES, KEYS } from "./sounds.js";

const $ = (s) => document.querySelector(s);
const board = $("#board");
const sign = $("#sign");
const signWord = $("#signWord");
const signSub = $("#signSub");
const statusEl = $("#status");
const volumeEl = $("#volume");
const overlapEl = $("#overlap");

const store = {
  get(k, d) { try { const v = localStorage.getItem("foleybox." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("foleybox." + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const AUDIO_CACHE = "foleybox-audio-v1"; // keep in sync with sw.js
const IDLE_WORD = "Quiet please";
const IDLE_SUB = `Tap a pad · ${SOUNDS.length} real recordings`;

/* ---------- Audio engine ---------- */
const AC = window.AudioContext || window.webkitAudioContext;
const ctx = new AC({ latencyHint: "interactive" });
const master = ctx.createGain();
master.connect(ctx.destination);
try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* iOS only */ }

const buffers = new Map();   // id -> AudioBuffer
const loading = new Map();   // id -> Promise
const voices = new Map();    // id -> { src, g, t0, dur }
let lastStarted = null;
let overlap = store.get("overlap", true);
master.gain.value = store.get("volume", 1);
volumeEl.value = master.gain.value;

function decode(ab) {
  return new Promise((res, rej) => {
    const p = ctx.decodeAudioData(ab, res, rej);
    if (p && p.then) p.then(res, rej);
  });
}

function load(sound) {
  if (buffers.has(sound.id)) return Promise.resolve(buffers.get(sound.id));
  if (loading.has(sound.id)) return loading.get(sound.id);
  const pad = padFor(sound.id);
  pad?.classList.add("loading");
  pad?.classList.remove("failed");
  const p = fetch(sound.src, { mode: "cors" })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
    .then(decode)
    .then((buf) => { buffers.set(sound.id, buf); pad?.classList.remove("loading"); return buf; })
    .catch((err) => { pad?.classList.remove("loading"); pad?.classList.add("failed"); throw err; })
    .finally(() => { loading.delete(sound.id); updateStatus(); });
  loading.set(sound.id, p);
  return p;
}

async function loadAll() {
  const queue = [...SOUNDS];
  const worker = async () => { while (queue.length) { const s = queue.shift(); try { await load(s); } catch { /* shown on pad */ } } };
  await Promise.all([worker(), worker(), worker(), worker()]);
  updateStatus(true);
}

function stopVoice(id, fade = 0.06) {
  const v = voices.get(id);
  if (!v) return;
  voices.delete(id);
  const now = ctx.currentTime;
  try {
    v.g.gain.cancelScheduledValues(now);
    v.g.gain.setValueAtTime(v.g.gain.value, now);
    v.g.gain.linearRampToValueAtTime(0, now + fade);
    v.src.stop(now + fade + 0.01);
  } catch { /* already stopped */ }
  padFor(id)?.classList.remove("playing");
}

function stopAll() {
  [...voices.keys()].forEach((id) => stopVoice(id));
  renderSign();
}

async function play(sound) {
  if (ctx.state !== "running") { try { await ctx.resume(); } catch { /* resumes on next gesture */ } }
  let buf = buffers.get(sound.id);
  if (!buf) {
    try { buf = await load(sound); } catch {
      flashSign("Not loaded", "Check your connection and tap again");
      return;
    }
  }
  if (!overlap) stopAll(); else stopVoice(sound.id, 0.02);

  const start = Math.min(sound.start || 0, buf.duration);
  const end = Math.min(sound.end || buf.duration, buf.duration);
  const dur = Math.max(0.05, end - start);
  const fadeOut = Math.min(0.25, dur * 0.15);
  const now = ctx.currentTime;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(sound.gain, now);
  g.gain.setValueAtTime(sound.gain, now + dur - fadeOut);
  g.gain.linearRampToValueAtTime(0.0001, now + dur);
  src.connect(g).connect(master);
  src.start(now, start, dur);

  const voice = { src, g, t0: now, dur };
  voices.set(sound.id, voice);
  lastStarted = sound;
  src.onended = () => {
    if (voices.get(sound.id) === voice) { voices.delete(sound.id); padFor(sound.id)?.classList.remove("playing"); }
    renderSign();
  };
  const pad = padFor(sound.id);
  pad?.classList.add("playing");
  renderSign();
  tick();
}

/* ---------- UI ---------- */
const padEls = new Map();
const padFor = (id) => padEls.get(id);
const keyFor = new Map();
const soundForKey = new Map();
SOUNDS.forEach((s, i) => { if (KEYS[i]) { keyFor.set(s.id, KEYS[i]); soundForKey.set(KEYS[i], s); } });

function renderBoard() {
  const frag = document.createDocumentFragment();
  for (const cat of CATEGORIES) {
    const sounds = SOUNDS.filter((s) => s.cat === cat.id);
    const bank = document.createElement("section");
    bank.className = "bank";
    bank.dataset.cat = cat.id;
    bank.setAttribute("aria-labelledby", `bank-${cat.id}`);
    bank.innerHTML = `<div class="bank-head"><span class="swatch" aria-hidden="true"></span><h2 id="bank-${cat.id}">${cat.name}</h2></div>`;
    const grid = document.createElement("div");
    grid.className = "pads";
    for (const s of sounds) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pad loading";
      b.dataset.cat = s.cat;
      b.dataset.id = s.id;
      const len = ((s.end || 0) - (s.start || 0)).toFixed(1);
      const key = keyFor.get(s.id);
      b.setAttribute("aria-label", `${s.label}${key ? `, shortcut ${key.toUpperCase()}` : ""}`);
      b.innerHTML = `<span class="pad-label"></span><span class="pad-meta"><span>${len}s</span>${key ? `<span class="pad-key">${key}</span>` : ""}</span><span class="pad-progress" aria-hidden="true"></span>`;
      b.querySelector(".pad-label").textContent = s.label.replace(/-/g, "‑"); // keep "Ba-dum-tss" on one line
      grid.append(b);
      padEls.set(s.id, b);
    }
    bank.append(grid);
    frag.append(bank);
  }
  board.append(frag);
}

// Mouse plays instantly on press. Touch and pen play on release, and only if the finger
// stayed put: a drag is a scroll, not a tap, so scrolling the board never fires a pad.
const TAP_SLOP = 10;          // px of movement allowed before a touch counts as a scroll
let touch = null;             // { id, x, y, pad } for the finger currently on a pad
let lastPointerAt = 0;        // used to ignore the synthetic click that follows a pointer tap
function cancelTouch() { touch?.pad.classList.remove("pressing"); touch = null; }
board.addEventListener("pointerdown", (e) => {
  const pad = e.target.closest(".pad");
  if (!pad || e.button > 0) return;
  lastPointerAt = performance.now();
  if (e.pointerType === "mouse") { hit(pad); return; }
  cancelTouch();
  touch = { id: e.pointerId, x: e.clientX, y: e.clientY, pad };
  pad.classList.add("pressing");
});
board.addEventListener("pointermove", (e) => {
  if (touch && e.pointerId === touch.id && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) > TAP_SLOP) cancelTouch();
});
board.addEventListener("pointerup", (e) => {
  if (!touch || e.pointerId !== touch.id) return;
  const { pad } = touch;
  cancelTouch();
  lastPointerAt = performance.now();
  hit(pad);
});
board.addEventListener("pointercancel", cancelTouch); // the browser took over to scroll
window.addEventListener("scroll", cancelTouch, { passive: true });
board.addEventListener("click", (e) => {
  const pad = e.target.closest(".pad");
  if (!pad || performance.now() - lastPointerAt < 800) return;
  hit(pad); // keyboard activation (Enter / Space on a focused pad)
});
board.addEventListener("contextmenu", (e) => { if (e.target.closest(".pad")) e.preventDefault(); });

function hit(pad) {
  const s = SOUNDS.find((x) => x.id === pad.dataset.id);
  if (!s) return;
  play(s);
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.matches?.("input, textarea") && e.key !== "Escape") return;
  if ($("#credits").open) return;
  if (e.key === "Escape" || (e.key === " " && !e.target.closest?.("button"))) { e.preventDefault(); stopAll(); return; }
  const s = soundForKey.get(e.key.toLowerCase());
  if (s && !e.repeat) {
    e.preventDefault();
    const pad = padFor(s.id);
    pad.classList.add("hit");
    setTimeout(() => pad.classList.remove("hit"), 110);
    play(s);
  }
});

$("#stopAll").addEventListener("click", stopAll);
$("#fabStop").addEventListener("click", stopAll);
volumeEl.addEventListener("input", () => {
  master.gain.setTargetAtTime(Number(volumeEl.value), ctx.currentTime, 0.02);
  store.set("volume", Number(volumeEl.value));
});
function renderOverlap() { overlapEl.setAttribute("aria-pressed", String(overlap)); overlapEl.textContent = overlap ? "Layering on" : "Layering off"; }
overlapEl.addEventListener("click", () => { overlap = !overlap; store.set("overlap", overlap); renderOverlap(); });
renderOverlap();

// Unlock audio on the first gesture anywhere (iOS / Chrome autoplay rules).
const unlock = () => { if (ctx.state !== "running") ctx.resume().catch(() => {}); };
["pointerdown", "keydown", "touchend"].forEach((ev) => document.addEventListener(ev, unlock, { capture: true, passive: true }));

/* ---------- Sign + progress ---------- */
let flashTimer = null;
function flashSign(word, sub) {
  clearTimeout(flashTimer);
  sign.classList.add("lit");
  signWord.textContent = word;
  signSub.textContent = sub;
  flashTimer = setTimeout(renderSign, 1800);
}
function renderSign() {
  $("#fabStop").hidden = voices.size === 0;
  if (voices.size) {
    const cur = lastStarted && voices.has(lastStarted.id) ? lastStarted : SOUNDS.find((s) => voices.has(s.id));
    sign.classList.add("lit");
    signWord.textContent = cur.label;
    signSub.textContent = voices.size > 1 ? `${voices.size} sounds playing · Esc to stop` : "On air · Esc to stop";
  } else {
    sign.classList.remove("lit");
    signWord.textContent = IDLE_WORD;
    signSub.textContent = IDLE_SUB;
  }
}

let raf = 0;
function tick() {
  cancelAnimationFrame(raf);
  const now = ctx.currentTime;
  for (const [id, pad] of padEls) {
    const bar = pad.querySelector(".pad-progress");
    const v = voices.get(id);
    bar.style.transform = v ? `scaleX(${Math.min(1, (now - v.t0) / v.dur)})` : "scaleX(0)";
  }
  if (voices.size) raf = requestAnimationFrame(tick);
}

/* ---------- Status, credits, offline ---------- */
async function updateStatus(final = false) {
  const ready = buffers.size;
  const total = SOUNDS.length;
  if (ready < total && !final) { statusEl.textContent = `Loading sounds… ${ready}/${total}`; return; }
  if (ready < total) { statusEl.textContent = `${ready}/${total} sounds ready · grey pads will retry when tapped`; return; }
  let offline = false;
  try {
    if ("caches" in window && "serviceWorker" in navigator) {
      // Make sure every clip is in the offline cache, even if it was fetched before the
      // service worker took control on the very first visit.
      const cache = await caches.open(AUDIO_CACHE);
      const hits = await Promise.all(SOUNDS.map(async (s) => (await cache.match(s.src)) || cache.add(new Request(s.src, { mode: "cors" })).then(() => true, () => false)));
      const sw = await navigator.serviceWorker.getRegistration().catch(() => null);
      offline = hits.every(Boolean) && Boolean(sw?.active);
    }
  } catch { /* cache API unavailable */ }
  statusEl.textContent = offline ? `All ${total} sounds ready · works offline` : `All ${total} sounds ready`;
}

function renderCredits() {
  const list = $("#creditList");
  for (const s of SOUNDS) {
    const li = document.createElement("li");
    const t = document.createElement("b"); t.textContent = s.label;
    const line = document.createElement("div");
    line.append(t, document.createTextNode(` · “${s.title}” by ${s.author} · `));
    const lic = document.createElement("a"); lic.href = s.lic.url; lic.target = "_blank"; lic.rel = "noopener"; lic.textContent = s.lic.name;
    line.append(lic);
    const src = document.createElement("div"); src.className = "src";
    const a = document.createElement("a"); a.href = s.page; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Source on Wikimedia Commons";
    src.append(a, document.createTextNode(s.start || s.end ? ` · trimmed to ${(s.start || 0).toFixed(1)}–${s.end.toFixed(1)}s` : ""));
    li.append(line, src);
    list.append(li);
  }
}
const dlg = $("#credits");
$("#openCredits").addEventListener("click", () => dlg.showModal());
$("#closeCredits").addEventListener("click", () => dlg.close());
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").then(() => navigator.serviceWorker.ready).then(() => updateStatus(buffers.size === SOUNDS.length)).catch(() => {});
}

renderBoard();
renderCredits();
renderSign();
loadAll();
window.addEventListener("online", () => SOUNDS.forEach((s) => { if (!buffers.has(s.id)) load(s).catch(() => {}); }));
