import * as THREE from 'three';
import { askStartNg, signIn, FALLBACK_GUEST } from './startng.js';
import { buildCharacter, setWaterLevel, BUCKET_TOP, BUCKET_RADIUS, BUCKET_Y } from './character.js';

const $ = (id) => document.getElementById(id);
const onStartNg = location.hostname.endsWith('.start.ng');

// ---------- Scene ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const SKY = new THREE.Color('#5b6b85');
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 14, 34);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const CAMERA_LOOK_Y = 3.6;

scene.add(new THREE.HemisphereLight('#c9d8ff', '#3a3326', 1.1));
const sun = new THREE.DirectionalLight('#ffffff', 1.4);
sun.position.set(4, 10, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -2 });
scene.add(sun);

buildRooftop();
buildSkyline();
const backgroundRain = buildBackgroundRain();
const clouds = buildClouds();

function buildRooftop() {
  const zinc = new THREE.MeshStandardMaterial({ color: '#9ba4ae', metalness: 0.55, roughness: 0.45 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 5), new THREE.MeshStandardMaterial({ color: '#7b828a' }));
  base.position.set(0, -0.15, -0.5);
  base.receiveShadow = true;
  scene.add(base);
  // corrugated ridges
  const ridge = new THREE.CylinderGeometry(0.07, 0.07, 5, 6);
  for (let x = -9; x <= 9; x += 0.3) {
    const r = new THREE.Mesh(ridge, zinc);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, 0.02, -0.5);
    r.receiveShadow = true;
    scene.add(r);
  }
  // a black water tank, like on many Lagos roofs
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.5, 24), new THREE.MeshStandardMaterial({ color: '#1f1f22', roughness: 0.6 }));
  tank.position.set(-5.6, 0.75, -2.2);
  tank.castShadow = true;
  scene.add(tank);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), tank.material);
  lid.position.set(-5.6, 1.56, -2.2);
  scene.add(lid);
  // a satellite dish
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), new THREE.MeshStandardMaterial({ color: '#d9d9d9', side: THREE.DoubleSide }));
  dish.position.set(5.8, 1.2, -2.3);
  dish.rotation.x = -0.9;
  scene.add(dish);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), dish.material);
  pole.position.set(5.8, 0.55, -2.3);
  scene.add(pole);
}

function buildSkyline() {
  const colors = ['#46536b', '#3e4a60', '#52607a', '#394357'];
  const windowMat = new THREE.MeshBasicMaterial({ color: '#ffd98a' });
  const windowGeo = new THREE.PlaneGeometry(0.35, 0.45);
  for (let i = 0; i < 26; i++) {
    const w = 1.5 + Math.random() * 2.5;
    const h = 3 + Math.random() * 9;
    const x = -24 + i * 1.9 + Math.random();
    const z = -9 - Math.random() * 10;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), new THREE.MeshStandardMaterial({ color: colors[i % colors.length] }));
    b.position.set(x, h / 2 - 1.5, z);
    scene.add(b);
    for (let wy = 0.6; wy < h - 0.6; wy += 1.1) {
      for (let wx = -w / 2 + 0.45; wx < w / 2 - 0.3; wx += 0.7) {
        if (Math.random() < 0.35) {
          const win = new THREE.Mesh(windowGeo, windowMat);
          win.position.set(x + wx, wy - 1.5, z + 1.01);
          scene.add(win);
        }
      }
    }
  }
}

function buildBackgroundRain() {
  const count = 700;
  const positions = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) resetStreak(positions, i, Math.random() * 16);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#b9d4ff', transparent: true, opacity: 0.45 }));
  scene.add(lines);
  return lines;
}

function resetStreak(positions, i, y = 16) {
  const x = (Math.random() - 0.5) * 30;
  const z = -14 + Math.random() * 17;
  positions.set([x, y, z, x - 0.04, y - 0.45, z], i * 6);
}

function buildClouds() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#3f4757', roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.6 + Math.random() * 1.4, 14, 10), mat);
    c.scale.y = 0.45;
    c.position.set(-14 + i * 3.5, 11 + Math.random() * 1.5, -6 - Math.random() * 4);
    group.add(c);
  }
  scene.add(group);
  return group;
}

// ---------- Player & character ----------
let reply = null; // last start.ng whoami reply
let player = FALLBACK_GUEST;
let character = buildCharacter(player.style);
scene.add(character);

function showPlayer() {
  $('player-name').textContent = player.name || 'Guest';
  $('player-account').textContent = reply?.user?.account ? `@${reply.user.account}` : 'Not signed in';
  if (player.face) $('player-face').src = player.face;
  $('player-sign-in').hidden = !!reply?.user;
}

function setPlayer(next) {
  const changed = JSON.stringify(next?.style) !== JSON.stringify(player.style) || next?.name !== player.name;
  player = next || FALLBACK_GUEST;
  showPlayer();
  if (!changed) return;
  const x = character.position.x;
  scene.remove(character);
  character = buildCharacter(player.style);
  character.position.x = x;
  scene.add(character);
  setWaterLevel(character, fill / FILL_FULL);
  setBigBucket(powers.bigbucket > 0);
}

let lastAsk = 0;
async function whoami() {
  if (!onStartNg || Date.now() - lastAsk < 2000) return;
  lastAsk = Date.now();
  const r = await askStartNg({ type: 'startng:whoami' }, 'startng:user');
  if (!r) return;
  reply = r;
  setPlayer(r.user ?? r.guest);
}

$('player-sign-in').onclick = signIn;
addEventListener('focus', whoami);
document.addEventListener('visibilitychange', () => { if (!document.hidden) whoami(); });
showPlayer();
whoami();

// ---------- Falling things ----------
const dropGeo = (() => {
  const g = new THREE.SphereGeometry(0.13, 14, 10);
  const tip = new THREE.ConeGeometry(0.115, 0.24, 14);
  tip.translate(0, 0.17, 0);
  return [g, tip];
})();
const blueMat = new THREE.MeshStandardMaterial({ color: '#5ab9ff', emissive: '#1d5f99', roughness: 0.2, metalness: 0.1 });
const goldMat = new THREE.MeshStandardMaterial({ color: '#ffcc33', emissive: '#a66f00', roughness: 0.25, metalness: 0.5 });
const boltMat = new THREE.MeshStandardMaterial({ color: '#fff35c', emissive: '#ffd400', emissiveIntensity: 0.9 });
const boltGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0.12, 0.55); s.lineTo(-0.2, 0.0); s.lineTo(0.0, 0.0); s.lineTo(-0.14, -0.55);
  s.lineTo(0.22, 0.08); s.lineTo(0.02, 0.08); s.lineTo(0.2, 0.55); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
  g.translate(0, 0, -0.04);
  return g;
})();

function makeDrop(material, scale) {
  const g = new THREE.Group();
  for (const geo of dropGeo) g.add(new THREE.Mesh(geo, material));
  g.scale.setScalar(scale);
  return g;
}

// Bonus pickups
const heartGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.22);
  s.bezierCurveTo(-0.05, -0.15, -0.3, 0.0, -0.22, 0.16);
  s.bezierCurveTo(-0.15, 0.28, -0.02, 0.24, 0, 0.12);
  s.bezierCurveTo(0.02, 0.24, 0.15, 0.28, 0.22, 0.16);
  s.bezierCurveTo(0.3, 0.0, 0.05, -0.15, 0, -0.22);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
  g.translate(0, 0, -0.05);
  return g;
})();
const starGeo = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.11 : 0.26;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
  g.translate(0, 0, -0.04);
  return g;
})();
const heartMat = new THREE.MeshStandardMaterial({ color: '#ff4d6d', emissive: '#99112b', roughness: 0.3 });
const starMat = new THREE.MeshStandardMaterial({ color: '#c77dff', emissive: '#6a1fb0', roughness: 0.3 });
const shieldItemMat = new THREE.MeshStandardMaterial({ color: '#4dffc3', emissive: '#0f8a63', roughness: 0.2, transparent: true, opacity: 0.9 });
const bigBucketMat = new THREE.MeshStandardMaterial({ color: '#ff9f43', emissive: '#8a4a00', roughness: 0.35 });

function makePickup(kind) {
  if (kind === 'heart') return new THREE.Mesh(heartGeo, heartMat);
  if (kind === 'double') return new THREE.Mesh(starGeo, starMat);
  if (kind === 'shield') {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), shieldItemMat));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 6, 20), shieldItemMat);
    ring.rotation.x = Math.PI / 2.4;
    g.add(ring);
    return g;
  }
  // big bucket: a little orange bucket
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.28, 14), bigBucketMat));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 16), bigBucketMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.14;
  g.add(rim);
  return g;
}

const PICKUPS = ['heart', 'shield', 'bigbucket', 'double'];
const items = [];
const splashes = [];
const splashGeo = new THREE.SphereGeometry(0.05, 6, 4);

function spawn() {
  const roll = Math.random();
  const boltChance = Math.min(0.36, 0.12 + elapsed * 0.006);
  let kind = 'drop';
  if (roll < boltChance) kind = 'bolt';
  else if (roll < boltChance + 0.08) kind = 'gold';
  else if (elapsed > 8 && roll < boltChance + 0.08 + 0.06) {
    // a bonus pickup; hearts only when a life is missing
    const choices = lives < 3 ? PICKUPS : PICKUPS.filter((p) => p !== 'heart');
    kind = choices[Math.floor(Math.random() * choices.length)];
  }
  let mesh;
  if (kind === 'bolt') { mesh = new THREE.Mesh(boltGeo, boltMat); mesh.scale.setScalar(1.2); }
  else if (kind === 'drop' || kind === 'gold') mesh = makeDrop(kind === 'gold' ? goldMat : blueMat, kind === 'gold' ? 1.35 : 1);
  else mesh = makePickup(kind);
  mesh.position.set((Math.random() * 2 - 1) * playHalf, 10, 0);
  scene.add(mesh);
  const speed = Math.min(9.5, 3.2 + elapsed * 0.07) * (0.85 + Math.random() * 0.3) * (kind === 'bolt' ? 1.1 : 1) * (PICKUPS.includes(kind) ? 0.8 : 1);
  items.push({ mesh, kind, speed });
}

// Floating "+5" style messages above the action
const popLayer = document.createElement('div');
popLayer.className = 'pop-layer';
document.body.append(popLayer);
const projected = new THREE.Vector3();
function popup(text, x, y, color = '#fffefa', big = false) {
  projected.set(x, y, 0).project(camera);
  const el = document.createElement('div');
  el.className = big ? 'pop big' : 'pop';
  el.textContent = text;
  el.style.color = color;
  el.style.left = `${(projected.x + 1) / 2 * innerWidth}px`;
  el.style.top = `${(1 - projected.y) / 2 * innerHeight}px`;
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 2000); // in case the animation never runs (hidden tab)
  popLayer.append(el);
}

// Shield bubble around the character
const shieldBubble = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 24, 16),
  new THREE.MeshStandardMaterial({ color: '#4dffc3', emissive: '#0f8a63', transparent: true, opacity: 0.22, depthWrite: false }),
);
shieldBubble.visible = false;
scene.add(shieldBubble);

function splash(x, y, color, count = 10) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true });
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(splashGeo, m);
    p.position.set(x, y, 0);
    scene.add(p);
    const a = Math.random() * Math.PI * 2;
    splashes.push({ mesh: p, vx: Math.cos(a) * (1 + Math.random() * 1.5), vy: 2 + Math.random() * 2.5, vz: Math.sin(a) * 1.2, life: 0.5 });
  }
}

function clearItems() {
  for (const it of items) scene.remove(it.mesh);
  items.length = 0;
}

// ---------- Sound ----------
let audio;
function beep(freq, duration = 0.08, type = 'sine', volume = 0.15) {
  if (!audio) return;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(volume, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  o.connect(g).connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + duration);
}

// ---------- Controls ----------
const keys = { left: false, right: false };
let pointerX = null;
let pointerDown = false;

addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; pointerX = null; }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; pointerX = null; }
  if ((e.key === 'Enter' || e.key === ' ') && state !== 'playing') { e.preventDefault(); startGame(); }
});
addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

function pointerToWorld(e) {
  const ndc = (e.clientX / innerWidth) * 2 - 1;
  return ndc * visibleHalfWidth;
}
canvas.addEventListener('pointerdown', (e) => { pointerDown = true; pointerX = pointerToWorld(e); });
addEventListener('pointerup', () => { pointerDown = false; });
canvas.addEventListener('pointermove', (e) => {
  if (pointerDown || e.pointerType === 'mouse') pointerX = pointerToWorld(e);
});

// ---------- Layout ----------
let visibleHalfWidth = 7;
let playHalf = 4.6;

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distance = Math.max(9.5, 3.6 / (tanHalf * camera.aspect));
  camera.position.set(0, 3.4, distance);
  camera.lookAt(0, CAMERA_LOOK_Y, 0);
  camera.updateProjectionMatrix();
  visibleHalfWidth = distance * tanHalf * camera.aspect;
  playHalf = Math.min(4.6, visibleHalfWidth - 0.6);
}
addEventListener('resize', resize);
resize();

// ---------- Game state ----------
let state = 'menu';
let points = 0;
let lives = 3;
let elapsed = 0;
let spawnTimer = 0;
let invulnerable = 0;
let shake = 0;
let combo = 0; // drops caught in a row
let comboTimer = 0; // the combo breaks if nothing is caught before this runs out
const COMBO_WINDOW = 3;
let fill = 0; // drops in the bucket, empties for a bonus when full
const FILL_FULL = 40;
const BUCKET_FULL_BONUS = 25;
const powers = { shield: 0, bigbucket: 0, double: 0 }; // seconds left on each power-up
const POWER_TIME = { shield: 7, bigbucket: 8, double: 8 };
const POWER_LABEL = { shield: '🛡 Shield', bigbucket: '🪣 Big bucket', double: '⭐ ×2 points' };

const comboMultiplier = () => (combo >= 50 ? 4 : combo >= 25 ? 3 : combo >= 10 ? 2 : 1);

const BEST_KEY = 'rain-bucket-best-points';
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const writeBest = (n) => { try { localStorage.setItem(BEST_KEY, String(n)); } catch {} };
function showMenuBest() {
  const best = readBest();
  $('menu-best').textContent = best ? `Your best on this device: ${best} points` : '';
}
showMenuBest();

const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function updateHud() {
  $('hud-points').textContent = points;
  $('hud-time').textContent = formatTime(elapsed);
  $('hud-lives').textContent = '❤'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives));
  const m = comboMultiplier();
  $('hud-combo').textContent = m > 1 ? `×${m}` : combo ? `${combo}` : '–';
  $('hud-combo-stat').classList.toggle('hot', m > 1);
}

function updatePowersHud() {
  const active = Object.keys(powers).filter((k) => powers[k] > 0);
  $('powers').replaceChildren(...active.map((k) => {
    const el = document.createElement('div');
    el.className = `power ${k}`;
    el.textContent = `${POWER_LABEL[k]} ${Math.ceil(powers[k])}s`;
    return el;
  }));
}

function setBigBucket(on) {
  const { bucket } = character.userData;
  bucket.scale.set(on ? 1.7 : 1, 1, on ? 1.7 : 1);
}

function catchDrop(kind, x) {
  combo += 1;
  comboTimer = COMBO_WINDOW;
  const base = kind === 'gold' ? 5 : 1;
  const mult = comboMultiplier() * (powers.double > 0 ? 2 : 1);
  const gained = base * mult;
  points += gained;
  splash(x, BUCKET_TOP, kind === 'gold' ? '#ffcc33' : '#7fd0ff', kind === 'gold' ? 14 : 6);
  beep(kind === 'gold' ? 1046 : 520 + Math.min(combo, 60) * 6, 0.07, 'triangle', 0.12);
  popup(`+${gained}`, x, BUCKET_TOP + 0.4, kind === 'gold' ? '#ffcc33' : mult > 1 ? '#d8fd71' : '#bfe6ff');
  if ([10, 25, 50].includes(combo)) {
    popup(`Combo ×${comboMultiplier()}!`, 0, 6.5, '#d8fd71', true);
    beep(1320, 0.18, 'triangle', 0.14);
  }
  fill += kind === 'gold' ? 3 : 1;
  if (fill >= FILL_FULL) {
    fill = 0;
    points += BUCKET_FULL_BONUS;
    popup(`Bucket full! +${BUCKET_FULL_BONUS}`, 0, 6, '#7fd0ff', true);
    splash(x, BUCKET_TOP + 0.2, '#7fd0ff', 30);
    [784, 988, 1175].forEach((f, i) => setTimeout(() => beep(f, 0.12, 'triangle', 0.13), i * 90));
  }
  setWaterLevel(character, fill / FILL_FULL);
  updateHud();
}

function catchPickup(kind, x) {
  splash(x, BUCKET_TOP, '#ffffff', 16);
  [660, 880, 1100].forEach((f, i) => setTimeout(() => beep(f, 0.09, 'sine', 0.13), i * 70));
  if (kind === 'heart') {
    if (lives < 3) { lives += 1; popup('+1 life ❤', x, BUCKET_TOP + 0.5, '#ff6b81', true); }
    else { points += 10; popup('+10', x, BUCKET_TOP + 0.5, '#ff6b81'); }
  } else {
    powers[kind] = POWER_TIME[kind];
    popup(POWER_LABEL[kind] + '!', x, BUCKET_TOP + 0.5, '#d8fd71', true);
    if (kind === 'bigbucket') setBigBucket(true);
  }
  updateHud();
  updatePowersHud();
}

function breakCombo() {
  if (combo >= 10) popup('Combo lost', character.position.x, 1, '#ff9f9f');
  combo = 0;
  updateHud();
}

function startGame() {
  if (!audio) {
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  audio?.resume?.();
  clearItems();
  points = 0;
  lives = 3;
  elapsed = 0;
  spawnTimer = 0.4;
  invulnerable = 0;
  combo = 0;
  comboTimer = 0;
  fill = 0;
  for (const k in powers) powers[k] = 0;
  setBigBucket(false);
  updatePowersHud();
  character.position.x = 0;
  setWaterLevel(character, 0);
  state = 'playing';
  $('menu').hidden = true;
  $('over').hidden = true;
  $('hud').hidden = false;
  updateHud();
}

async function gameOver() {
  state = 'over';
  beep(140, 0.5, 'sawtooth', 0.12);
  $('hud').hidden = true;
  $('over').hidden = false;
  $('over-points').textContent = points;
  $('over-time').textContent = formatTime(elapsed);
  for (const k in powers) powers[k] = 0;
  shieldBubble.visible = false;
  setBigBucket(false);
  updatePowersHud();
  if (points > readBest()) writeBest(points);

  const seconds = Math.floor(elapsed);
  const saved = $('over-saved');
  if (!onStartNg) {
    saved.textContent = 'Play on rain-bucket.start.ng to save your score.';
  } else if (!reply?.user) {
    saved.innerHTML = '';
    const b = document.createElement('button');
    b.className = 'primary';
    b.style.fontSize = '14px';
    b.style.padding = '8px 18px';
    b.textContent = 'Sign in to save your score';
    b.onclick = signIn;
    saved.append(b);
  } else {
    saved.textContent = 'Saving…';
    const res = await askStartNg({ type: 'startng:score', stats: { points, seconds } }, 'startng:scoreSaved');
    if (res?.ok) saved.textContent = res.result.improved ? `New best! You're #${res.result.rank}` : `Not your best this time (you're #${res.result.rank})`;
    else saved.textContent = res?.error || 'Could not save your score.';
  }
  loadBoard();
}

async function loadBoard() {
  const board = $('board');
  const row = (text, cls) => { const li = document.createElement('li'); li.className = cls || ''; li.textContent = text; return li; };
  if (!onStartNg) {
    board.replaceChildren(row('The leaderboard lives on rain-bucket.start.ng', 'muted'));
    return;
  }
  const res = await askStartNg({ type: 'startng:leaderboard', limit: 10 }, 'startng:leaderboardData');
  if (!res?.ok || !res.entries?.length) {
    board.replaceChildren(row(res?.ok ? 'No scores yet. Be the first!' : 'Could not load the leaderboard.', 'muted'));
    return;
  }
  board.replaceChildren(...res.entries.map((e) => {
    const li = document.createElement('li');
    if (reply?.user && e.player_id === reply.user.id) li.className = 'me';
    const name = document.createElement('span');
    name.textContent = `#${e.rank} ${e.name}`;
    const score = document.createElement('span');
    score.textContent = `${e.stats?.points ?? e.score} pts · ${formatTime(e.stats?.seconds ?? 0)}`;
    li.append(name, score);
    return li;
  }));
}

$('start-btn').onclick = startGame;
$('again-btn').onclick = startGame;

function loseLife(x) {
  lives -= 1;
  breakCombo();
  invulnerable = 1.2;
  shake = 0.35;
  splash(x, BUCKET_Y, '#fff35c', 14);
  beep(90, 0.35, 'square', 0.18);
  const flash = $('flash');
  flash.classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => flash.classList.remove('on')));
  updateHud();
  if (lives <= 0) gameOver();
}

// ---------- Main loop ----------
const clock = new THREE.Clock();
let walkPhase = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // background rain
  const pos = backgroundRain.geometry.attributes.position;
  for (let i = 0; i < pos.count / 2; i++) {
    const y = pos.array[i * 6 + 1] - dt * 14;
    if (y < -1) resetStreak(pos.array, i);
    else { pos.array[i * 6 + 1] = y; pos.array[i * 6 + 4] = y - 0.45; }
  }
  pos.needsUpdate = true;
  clouds.position.x = Math.sin(t * 0.05) * 2;

  const { legs, bucket } = character.userData;
  let moving = 0;

  if (state === 'playing') {
    elapsed += dt;

    // move the character
    const speed = 8.5;
    let dx = 0;
    if (keys.left) dx -= speed * dt;
    if (keys.right) dx += speed * dt;
    if (!dx && pointerX !== null) {
      const diff = pointerX - character.position.x;
      dx = Math.sign(diff) * Math.min(Math.abs(diff), speed * 1.3 * dt);
    }
    character.position.x = THREE.MathUtils.clamp(character.position.x + dx, -playHalf, playHalf);
    moving = Math.abs(dx) > 0.001 ? Math.sign(dx) : 0;

    // spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawn();
      spawnTimer = Math.max(0.26, 0.85 - elapsed * 0.012) * (0.7 + Math.random() * 0.6);
    }

    // falling things
    if (combo > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) breakCombo();
    }

    // power-up timers
    for (const k in powers) {
      if (powers[k] <= 0) continue;
      powers[k] = Math.max(0, powers[k] - dt);
      if (powers[k] === 0 && k === 'bigbucket') setBigBucket(false);
      if (Math.ceil(powers[k]) !== Math.ceil(powers[k] + dt)) updatePowersHud();
    }
    shieldBubble.visible = powers.shield > 0 && (powers.shield > 1.5 || Math.floor(t * 8) % 2 === 0);
    shieldBubble.position.set(character.position.x, 1.75, 0);
    shieldBubble.scale.setScalar(1 + Math.sin(t * 6) * 0.03);

    const cx = character.position.x;
    const catchRadius = (powers.bigbucket > 0 ? BUCKET_RADIUS * 1.7 : BUCKET_RADIUS) + 0.08;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.mesh.position.y -= it.speed * dt;
      if (it.kind === 'gold' || PICKUPS.includes(it.kind)) it.mesh.rotation.y += dt * 4;
      if (it.kind === 'bolt') it.mesh.rotation.y = Math.sin(t * 20) * 0.3;
      const { x, y } = it.mesh.position;
      const dxItem = Math.abs(x - cx);
      let remove = false;

      if (it.kind === 'bolt') {
        if (powers.shield > 0 && y < BUCKET_TOP + 0.6 && y > 0.3 && dxItem < 1.5) {
          remove = true;
          points += 3;
          popup('Blocked! +3', x, 3.2, '#4dffc3');
          splash(x, 2.9, '#4dffc3', 12);
          beep(1500, 0.06, 'square', 0.08);
          updateHud();
        } else if (invulnerable <= 0 && y < BUCKET_TOP + 0.2 && y > 0.3 && dxItem < 0.45) {
          remove = true;
          loseLife(x);
        }
      } else if (y < BUCKET_TOP + 0.1 && y > BUCKET_TOP - 0.35 && dxItem < catchRadius) {
        remove = true;
        if (it.kind === 'drop' || it.kind === 'gold') catchDrop(it.kind, x);
        else catchPickup(it.kind, x);
      }
      if (!remove && y < 0.05) {
        remove = true;
        if (it.kind === 'drop' || it.kind === 'gold') splash(x, 0.05, '#9cc9ff', 4);
      }
      if (remove) {
        scene.remove(it.mesh);
        items.splice(i, 1);
      }
      if (state !== 'playing') break;
    }

    if (invulnerable > 0) {
      invulnerable -= dt;
      character.visible = invulnerable <= 0 || Math.floor(invulnerable * 12) % 2 === 0;
    } else {
      character.visible = true;
    }
    if (Math.floor(elapsed) !== Math.floor(elapsed - dt)) updateHud();
  } else {
    character.visible = true;
  }

  // walking / idle animation
  walkPhase += dt * (moving ? 14 : 0);
  legs[0].rotation.x = moving ? Math.sin(walkPhase) * 0.5 : 0;
  legs[1].rotation.x = moving ? -Math.sin(walkPhase) * 0.5 : 0;
  character.rotation.z = THREE.MathUtils.lerp(character.rotation.z, -moving * 0.08, 0.2);
  character.rotation.y = state === 'playing' ? 0 : Math.sin(t * 0.6) * 0.35;
  bucket.position.y = BUCKET_Y + Math.sin(t * 3) * 0.02;

  // splashes
  for (let i = splashes.length - 1; i >= 0; i--) {
    const s = splashes[i];
    s.life -= dt;
    s.vy -= 12 * dt;
    s.mesh.position.x += s.vx * dt;
    s.mesh.position.y += s.vy * dt;
    s.mesh.position.z += s.vz * dt;
    s.mesh.material.opacity = Math.max(0, s.life * 2);
    if (s.life <= 0) { scene.remove(s.mesh); splashes.splice(i, 1); }
  }

  // camera shake when hit by lightning
  if (shake > 0) {
    shake -= dt;
    camera.position.x = (Math.random() - 0.5) * shake * 0.6;
  } else {
    camera.position.x = 0;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Handy for testing: ?style=<json> previews any start.ng look outside start.ng.
try {
  const preview = new URLSearchParams(location.search).get('style');
  if (preview) setPlayer({ name: 'Preview', style: JSON.parse(preview), face: null });
} catch {}
