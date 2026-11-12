// Scuttler Swarm — a small FPS whose real job is to test scuttler.glb in a game.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

// ---------- query flags ----------
// auto=1    bot plays (stands still, aims at nearest living enemy, fires every 0.25 s)
// god=1     player takes no damage        nofire=1  bot does not shoot
// wave=N    start at wave N               view=top|chase  debug render camera
// debug=1   show hit proxies              scale=x / speed=x  override enemy scale / speed
// nosink=1  corpses do not sink before removal (to judge the raw die clip)
// step=s    fixed sim step per rendered frame (accurate diagnostics at low FPS)
// diag=1    measure planted-foot slip on one enemy -> __game.footSlip
// pose=clip  freeze the viewmodel on idle|fire|reload|draw at t=0..1 of the clip (default 0.5), for screenshots
const Q = new URLSearchParams(location.search);
const num = (k, d) => (Q.has(k) && isFinite(parseFloat(Q.get(k))) ? parseFloat(Q.get(k)) : d);
const AUTO = Q.get('auto') === '1', GOD = Q.get('god') === '1', NOFIRE = Q.get('nofire') === '1';
const DEBUG = Q.get('debug') === '1', DIAG = Q.get('diag') === '1', VIEW = Q.get('view');
const POSE = Q.get('pose'), POSE_T = num('t', 0.5);
const STEP = num('step', 0), START_WAVE = Math.max(1, Math.min(3, num('wave', 1) | 0));

// ---------- tuning ----------
const DECK = 40, HALF = DECK / 2;
const EYE = 1.7, PLAYER_R = 0.4, PLAYER_SPEED = 5.5;
const WAVES = [6, 12, 20];
const ENEMY_SCALE = num('scale', 1);
const STRIDE_SPEED = num('stride', 0.6), PLANT_Y = num('planty', 0.03);                   // m/s the walk clip covers at timeScale 1, scale 1 (from build log)
const ENEMY_SPEED = num('speed', 1.8);       // m/s, +-15% per enemy
const ENEMY_R = 0.75 * ENEMY_SCALE;          // body collision radius (legs reach further)
const ENEMY_HP = 3, BITE_RANGE = 1.8, STOP_RANGE = 1.55, BITE_DPS = 5;
const MAG_SIZE = 30, RELOAD_TIME = 2.0, DRAW_TIME = 0.5, VM_LAYER = 1;
const FIRE_INTERVAL = 0.14, BOT_FIRE_INTERVAL = 0.25, SPAWN_INTERVAL = 0.45, CORPSE_TIME = 3;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const hud = { hp: $('h-hp'), wave: $('h-wave'), alive: $('h-alive'), kills: $('h-kills'), fps: $('h-fps'), ammo: $('h-ammo') };
const overlay = $('overlay'), oTitle = $('o-title'), oText = $('o-text'), oBtn = $('o-btn');
const banner = $('banner'), cross = $('cross'), hurt = $('hurt'), hpfill = $('hpfill');

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: VIEW === 'strip' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.info.autoReset = false;             // two passes per frame (world, then viewmodel): reset by hand
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const FOG = 0x8fa3b3;
scene.background = new THREE.Color(FOG);
scene.fog = new THREE.Fog(FOG, 18, 75);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';
scene.add(camera);
const viewCam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  for (const c of [camera, viewCam]) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
});

// lights: bright, cool key + warm fill so a near-black creature still gets readable highlights
scene.add(new THREE.HemisphereLight(0xdfeeff, 0x4a4f58, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(12, 20, 8); scene.add(sun);
const fill = new THREE.DirectionalLight(0xffc9a0, 0.9); fill.position.set(-10, 6, -14); scene.add(fill);
for (const [x, z, c] of [[-12, -12, 0x66ccff], [12, 12, 0xffaa66]]) {
  const p = new THREE.PointLight(c, 60, 30, 2); p.position.set(x, 4, z); scene.add(p);
}

// deck
function deckTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#737d87'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const x = i * 256, y = j * 256;
    g.fillStyle = (i + j) % 2 ? '#6c7680' : '#7b858f'; g.fillRect(x + 3, y + 3, 250, 250);
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.strokeRect(x + 4, y + 4, 248, 248);
    g.fillStyle = '#5b646d';
    for (const [rx, ry] of [[16, 16], [240, 16], [16, 240], [240, 240]]) { g.beginPath(); g.arc(x + rx, y + ry, 5, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(40,48,56,.25)'; g.lineWidth = 3;
    for (let k = 40; k < 240; k += 24) { g.beginPath(); g.moveTo(x + k, y + 110); g.lineTo(x + k + 12, y + 146); g.stroke(); }
  }
  g.strokeStyle = '#3d444c'; g.lineWidth = 4;
  for (const v of [0, 256, 512]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 512); g.moveTo(0, v); g.lineTo(512, v); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(DECK / 4, DECK / 4);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const deck = new THREE.Mesh(new THREE.PlaneGeometry(DECK, DECK),
  new THREE.MeshStandardMaterial({ map: deckTexture(), metalness: 0.35, roughness: 0.6 }));
deck.rotation.x = -Math.PI / 2; scene.add(deck);

// walls + cover blocks. Blocks are AABBs: {x, z, hx, hz, h}
const wallMat = new THREE.MeshStandardMaterial({ color: 0x55606b, metalness: 0.4, roughness: 0.6 });
for (const [x, z, w, d] of [[0, -HALF - 0.5, DECK + 2, 1], [0, HALF + 0.5, DECK + 2, 1], [-HALF - 0.5, 0, 1, DECK], [HALF + 0.5, 0, 1, DECK]]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), wallMat); m.position.set(x, 1.5, z); scene.add(m);
}
const blocks = [], solids = [];
const blockMat = new THREE.MeshStandardMaterial({ color: 0xb8853a, metalness: 0.3, roughness: 0.55 });
const blockMat2 = new THREE.MeshStandardMaterial({ color: 0x4d6f8a, metalness: 0.3, roughness: 0.55 });
[[7, -6, 3, 1.3, 1.2], [-8, -5, 1.2, 2.2, 4], [-6, 8, 3, 1.2, 3], [9, 7, 2, 2.5, 2], [1, -13, 5, 1.4, 1.2], [-1, 14, 1.6, 3, 1.6]]
  .forEach(([x, z, w, h, d], i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), i % 2 ? blockMat2 : blockMat);
    m.position.set(x, h / 2, z); scene.add(m); solids.push(m);
    blocks.push({ x, z, hx: w / 2, hz: d / 2, h });
  });

// push a circle out of the cover blocks and keep it on the deck
function collide(p, r) {
  for (const b of blocks) {
    const cx = Math.max(b.x - b.hx, Math.min(b.x + b.hx, p.x)), cz = Math.max(b.z - b.hz, Math.min(b.z + b.hz, p.z));
    let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
    else { // centre is inside the box: exit through the nearest face
      const ex = b.hx - Math.abs(p.x - b.x), ez = b.hz - Math.abs(p.z - b.z);
      if (ex < ez) p.x = b.x + Math.sign(p.x - b.x || 1) * (b.hx + r); else p.z = b.z + Math.sign(p.z - b.z || 1) * (b.hz + r);
    }
  }
  const lim = HALF - r; p.x = Math.max(-lim, Math.min(lim, p.x)); p.z = Math.max(-lim, Math.min(lim, p.z));
}

// ---------- viewmodel (fp_rifle.glb), muzzle flash, tracer ----------
// The rifle + arms hang off the camera on their own layer and are drawn in a second pass over a cleared depth
// buffer, so they never poke into walls or enemies. Authored in camera space: no offset or scale needed.
const gun = new THREE.Group(); camera.add(gun);
const vm = { ready: false, mixer: null, acts: {}, cur: null, clip: null, muzzle: null, tris: 0, meshes: 0 };
let ammo = MAG_SIZE, reloading = false, reloadT = 0, drawT = 0;
function flashTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,220,130,.9)'); r.addColorStop(1, 'rgba(255,120,20,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,230,160,.8)'; g.lineWidth = 3;
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(32 - Math.cos(a) * 30, 32 - Math.sin(a) * 30); g.lineTo(32 + Math.cos(a) * 30, 32 + Math.sin(a) * 30); g.stroke(); }
  return new THREE.CanvasTexture(c);
}
// a sprite, so it faces the camera whatever the Muzzle node's orientation is
const flash = new THREE.Sprite(new THREE.SpriteMaterial({
  map: flashTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
flash.scale.setScalar(0.14); flash.layers.set(VM_LAYER);
flash.position.set(0.13, -0.115, -0.9); flash.visible = false; gun.add(flash);       // fallback spot until the Muzzle node exists
const flashLight = new THREE.PointLight(0xffc070, 0, 12, 2); flashLight.position.copy(flash.position); gun.add(flashLight);

function vmPlay(name, fade) {
  if (!vm.ready || POSE) return;
  const a = vm.acts[name], prev = vm.cur;
  a.reset(); a.setEffectiveTimeScale(1); a.setEffectiveWeight(1);
  if (prev && prev !== a) { if (fade > 0) a.crossFadeFrom(prev, fade, false); else prev.stop(); }
  a.play(); vm.cur = a; vm.clip = name;
}
function startReload() {
  if (state !== 'playing' || reloading || drawT > 0 || ammo >= MAG_SIZE) return;
  reloading = true; reloadT = RELOAD_TIME; G.reloads++; vmPlay('reload', 0.08);
}
loadModel('./fp_rifle.glb').then((gltf) => {
  const root = gltf.scene; gun.add(root);
  root.traverse((o) => {
    o.layers.set(VM_LAYER);
    if (!o.isMesh) return;
    o.frustumCulled = false; o.material.fog = false;      // skinned bounds are bind-pose only; it is always on screen anyway
    vm.meshes++; vm.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });
  vm.muzzle = root.getObjectByName('Muzzle');
  if (vm.muzzle) { vm.muzzle.add(flash, flashLight); flash.position.set(0, 0, 0); flashLight.position.set(0, 0, 0); }
  else console.error('fp_rifle.glb has no Muzzle node');
  vm.mixer = new THREE.AnimationMixer(root);
  for (const n of ['idle', 'fire', 'reload', 'draw']) {
    const c = THREE.AnimationClip.findByName(gltf.animations, n);
    if (!c) { console.error(`fp_rifle.glb is missing the ${n} clip`); continue; }
    const a = vm.acts[n] = vm.mixer.clipAction(c);
    if (n !== 'idle') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
  }
  vm.mixer.addEventListener('finished', (e) => { if (e.action === vm.cur) vmPlay('idle', 0.12); });
  vm.ready = Object.keys(vm.acts).length === 4;
  G.viewmodelTris = vm.tris; G.viewmodel = { meshes: vm.meshes, clips: gltf.animations.map((a) => `${a.name}:${a.duration.toFixed(2)}`) };
  if (POSE && vm.acts[POSE]) {                             // frozen pose for screenshots
    const a = vm.acts[POSE]; a.play(); a.paused = true; a.time = a.getClip().duration * POSE_T; vm.cur = a; vm.clip = POSE;
    if (POSE === 'fire') flash.visible = true;
  } else if (vm.ready) vmPlay('idle', 0);
  assetReady();
}).catch((e) => { console.error('failed to load fp_rifle.glb', e); assetReady(); });
const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.8, fog: false }));
tracer.frustumCulled = false; tracer.visible = false; scene.add(tracer);
const spark = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7040, fog: false }));
spark.visible = false; scene.add(spark);
let flashT = 0, hitT = 0;

// blob shadows: one instanced draw for every enemy
const MAX_ENEMIES = 40;
const blobs = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }), MAX_ENEMIES);
blobs.frustumCulled = false; blobs.count = 0; blobs.renderOrder = 1; scene.add(blobs);

// ---------- game state ----------
const player = { pos: new THREE.Vector3(0, EYE, 0), yaw: 0, pitch: 0, hp: 100 };
const enemies = [];
const proxyGeo = new THREE.BoxGeometry(1.7, 1.0, 1.8).translate(0, 0.52, -0.03);
const proxyMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, wireframe: true, visible: DEBUG });
let asset = null;            // { scene, walk, die, tris, feet }
let state = 'loading', wave = 0, kills = 0, toSpawn = 0, spawnT = 0, waveGap = 0, fireT = 0, botT = 0, hurtT = 0;
const keys = new Set();
let firing = false, fpsEma = 0, lastCorpse = null;
const NOSINK = Q.get('nosink') === '1';

const G = window.__game = { state, wave: 0, alive: 0, kills: 0, playerHp: 100, fps: 0, drawCalls: 0, triangles: 0,
  enemyScale: ENEMY_SCALE, walkTimeScale: 0, enemySpeed: ENEMY_SPEED, corpses: 0, shots: 0, hits: 0, peak: null, footSlip: null,
  ammo: MAG_SIZE, reloading: false, reloads: 0, viewmodelTris: 0, viewmodelDrawCalls: 0, weaponClip: null };
// every light also lights the viewmodel layer
// (except the muzzle flash light: 10 cm from the hands it blew them out to white in round 2)
scene.traverse((o) => { if (o.isLight && o !== flashLight) o.layers.enable(VM_LAYER); });
let pendingAssets = 2;
function assetReady() {
  if (--pendingAssets > 0) return;
  state = 'ready';
  if (AUTO) startGame(); else showOverlay('SCUTTLER SWARM', 'WASD move · mouse look · click or Space to fire · R to reload. Survive three waves.', 'Start');
}

function showOverlay(title, text, btn) {
  oTitle.textContent = title; oText.textContent = text; oBtn.textContent = btn || ''; oBtn.hidden = !btn;
  overlay.classList.remove('hidden');
}
function showBanner(t) { banner.textContent = t; banner.style.opacity = 1; setTimeout(() => (banner.style.opacity = 0), 1800); }

// ---------- asset ----------
function loadModel(file) { return new GLTFLoader().loadAsync(file); }
const ENEMY_FILE = new URLSearchParams(location.search).get('enemy') === 'tripo' ? './scuttler_tripo.glb' : './scuttler.glb';
loadModel(ENEMY_FILE).then((gltf) => {
  const clip = (n) => THREE.AnimationClip.findByName(gltf.animations, n);
  let tris = 0, meshes = 0; const feet = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });
  if (DIAG) feet.push(...footTips(gltf.scene));
  const box = new THREE.Box3().setFromObject(gltf.scene);
  asset = { scene: gltf.scene, walk: clip('walk'), die: clip('die'), tris, meshes, feet };
  G.asset = { meshes, triangles: tris, clips: gltf.animations.map((a) => `${a.name}:${a.duration.toFixed(2)}`),
    bindBox: [box.min.toArray().map((v) => +v.toFixed(2)), box.max.toArray().map((v) => +v.toFixed(2))] };
  if (!asset.walk || !asset.die) console.error('scuttler.glb is missing a walk or die clip');
  assetReady();
}).catch((e) => { console.error('failed to load scuttler.glb', e); showOverlay('LOAD FAILED', String(e.message || e)); });

// For diagnostics: the mesh-space tip of every *_foot bone = the most distal vertex mostly weighted to it.
function footTips(root) {
  const tips = new Map(), v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const pos = o.geometry.attributes.position, si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
    o.skeleton.bones.forEach((bone, bi) => {
      if (!/_foot$/.test(bone.name)) return;
      const inv = o.skeleton.boneInverses[bi];
      let best = tips.get(bone.name) || { name: bone.name, d: -1, local: new THREE.Vector3() };
      for (let i = 0; i < pos.count; i++) for (let k = 0; k < 4; k++) {
        if (si.getComponent(i, k) !== bi || sw.getComponent(i, k) < 0.6) continue;
        v.fromBufferAttribute(pos, i).applyMatrix4(o.bindMatrix).applyMatrix4(inv);
        if (v.length() > best.d) { best.d = v.length(); best.local.copy(v); }
      }
      tips.set(bone.name, best);
    });
  });
  return [...tips.values()].filter((t) => t.d > 0);
}

// ---------- enemies ----------
function spawnEnemy() {
  const root = new THREE.Group();
  const a = Math.random() * Math.PI * 2, r = 16.5 + Math.random() * 2;
  root.position.set(Math.max(-18, Math.min(18, Math.cos(a) * r)), 0, Math.max(-18, Math.min(18, Math.sin(a) * r)));
  collide(root.position, ENEMY_R);
  const model = cloneSkinned(asset.scene); model.scale.setScalar(ENEMY_SCALE); root.add(model);
  const proxy = new THREE.Mesh(proxyGeo, proxyMat); proxy.scale.setScalar(ENEMY_SCALE); root.add(proxy);
  const mixer = new THREE.AnimationMixer(model);
  const walk = mixer.clipAction(asset.walk); walk.time = Math.random() * asset.walk.duration; walk.play();
  const die = mixer.clipAction(asset.die); die.setLoop(THREE.LoopOnce, 1); die.clampWhenFinished = true;
  const e = { root, model, proxy, mixer, walk, die, hp: ENEMY_HP, alive: true, deadT: 0, wave,
    speed: ENEMY_SPEED * (0.85 + Math.random() * 0.3), vel: new THREE.Vector3(), side: Math.random() < 0.5 ? 1 : -1,
    head: model.getObjectByName('head'), heading: 0, moved: 0, prev: root.position.clone(), biteT: Math.random() * 6,
    avoidB: null, avoidS: 1, lunge: 0, flinch: 0, knock: new THREE.Vector3(), bodyBone: model.getObjectByName('body') };
  e.heading = Math.atan2(player.pos.x - root.position.x, player.pos.z - root.position.z);
  root.rotation.y = e.heading; proxy.userData.enemy = e;
  scene.add(root); enemies.push(e);
  if (DIAG && !diag.e) diag.attach(e);
}

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function updateEnemy(e, dt, active) {
  if (!e.alive) {
    e.deadT += dt; e.mixer.update(dt);
    // the die clip only slumps ~15 cm, so game code helps it read: knock-back on the killing shot, then sink away
    e.root.position.addScaledVector(e.knock, dt); e.knock.multiplyScalar(Math.exp(-dt * 6));
    if (!NOSINK && e.deadT > CORPSE_TIME - 0.9) e.root.position.y = -(e.deadT - (CORPSE_TIME - 0.9)) * 1.1 * ENEMY_SCALE;
    return;
  }
  e.flinch *= Math.exp(-dt * 10);
  const p = e.root.position;
  let dx = player.pos.x - p.x, dz = player.pos.z - p.z; const dist = Math.hypot(dx, dz) || 1e-6; dx /= dist; dz /= dist;
  let wantX = 0, wantZ = 0, biting = false;
  if (active && dist > STOP_RANGE) {
    let sx = dx, sz = dz;
    for (const b of blocks) {                        // steer round cover instead of grinding into it
      const cx = Math.max(b.x - b.hx, Math.min(b.x + b.hx, p.x)), cz = Math.max(b.z - b.hz, Math.min(b.z + b.hz, p.z));
      let ax = p.x - cx, az = p.z - cz; const d = Math.hypot(ax, az), range = ENEMY_R + 1.4;
      if (d >= range || d < 1e-5) { if (e.avoidB === b) e.avoidB = null; continue; }
      ax /= d; az /= d;
      if (-(ax * dx + az * dz) < 0.05) continue;     // block is not between us and the player
      const w = (range - d) / range; let tx = -az, tz = ax; const along = tx * dx + tz * dz;
      // commit to one way round per block: re-choosing every frame made enemies oscillate behind wide cover (round 3)
      if (e.avoidB !== b) { e.avoidB = b; e.avoidS = Math.abs(along) > 0.15 ? Math.sign(along) : e.side; }
      const sgn = e.avoidS; tx *= sgn; tz *= sgn;
      sx += ax * w * 0.9 + tx * w * 1.6; sz += az * w * 0.9 + tz * w * 1.6;
    }
    for (const o of enemies) {                       // keep bodies apart
      if (o === e || !o.alive) continue;
      const ox = p.x - o.root.position.x, oz = p.z - o.root.position.z, d = Math.hypot(ox, oz), range = ENEMY_R * 2.3;
      if (d < range && d > 1e-5) { const w = (range - d) / range; sx += (ox / d) * w * 1.4; sz += (oz / d) * w * 1.4; }
    }
    const sl = Math.hypot(sx, sz) || 1; wantX = (sx / sl) * e.speed; wantZ = (sz / sl) * e.speed;
  } else if (active) biting = dist < BITE_RANGE;
  const k = 1 - Math.exp(-dt * 8);
  e.vel.x += (wantX - e.vel.x) * k; e.vel.z += (wantZ - e.vel.z) * k;
  p.x += e.vel.x * dt; p.z += e.vel.z * dt;
  collide(p, ENEMY_R);
  // actual ground speed this frame drives the walk cycle, so feet stay planted even when blocked or steering
  const moved = Math.hypot(p.x - e.prev.x, p.z - e.prev.z) / Math.max(dt, 1e-4); e.prev.copy(p);
  e.moved += (moved - e.moved) * (1 - Math.exp(-dt * 12));
  // face the direction of travel (or the player when stopped to bite)
  let target = e.heading;
  if (e.moved > 0.15) target = Math.atan2(e.vel.x, e.vel.z); else if (dist <= BITE_RANGE + 0.3) target = Math.atan2(dx, dz);
  let dh = ((target - e.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  e.heading += Math.max(-5 * dt, Math.min(5 * dt, dh));
  e.root.rotation.y = e.heading;
  e.walk.timeScale = e.moved / (STRIDE_SPEED * ENEMY_SCALE);
  // no attack clip in the asset: fake a bite with a small procedural lunge
  // (a slide only: pitching the whole model drove the front feet ~11 cm through the deck in round 2)
  if (biting) { e.biteT += dt * 9; e.lunge = Math.max(0, Math.sin(e.biteT)) * 0.16; if (!GOD) { player.hp -= BITE_DPS * dt; hurtT = 0.35; } }
  else e.lunge *= Math.exp(-dt * 12);
  e.model.position.z = e.lunge - e.flinch;
  e.mixer.update(dt);
  e.root.updateMatrixWorld(true);
}

function damageEnemy(e, dir) {
  if (!e.alive) return;
  if (--e.hp > 0) { e.flinch = 0.14; return; }
  e.alive = false; kills++; e.deadT = 0; lastCorpse = e;
  e.model.position.z = 0; e.knock.set(dir.x, 0, dir.z).normalize().multiplyScalar(2.2);
  e.walk.fadeOut(0.12); e.die.reset().fadeIn(0.12).play();
}
function removeEnemy(e) { scene.remove(e.root); e.mixer.stopAllAction(); e.mixer.uncacheRoot(e.model); }

// ---------- shooting ----------
const raycaster = new THREE.Raycaster(); raycaster.far = 80;
const fwd = new THREE.Vector3();
function fire() {
  if (reloading || drawT > 0 || ammo <= 0) return;
  G.shots++; ammo--; vmPlay('fire', 0);
  camera.updateMatrixWorld(true);
  camera.getWorldDirection(fwd);
  raycaster.set(camera.getWorldPosition(tmp), fwd);
  const targets = solids.slice(); for (const e of enemies) if (e.alive) targets.push(e.proxy);
  const hit = raycaster.intersectObjects(targets, false)[0];
  const end = hit ? hit.point : tmp2.copy(fwd).multiplyScalar(60).add(tmp);
  flash.getWorldPosition(tmp);                                  // tracer starts at the Muzzle node
  tracerGeo.attributes.position.setXYZ(0, tmp.x, tmp.y, tmp.z); tracerGeo.attributes.position.setXYZ(1, end.x, end.y, end.z);
  tracerGeo.attributes.position.needsUpdate = true;
  tracer.visible = flash.visible = true; flash.material.rotation = Math.random() * 6.28; flashLight.intensity = 30; flashT = 0.06;
  if (hit) {
    spark.position.copy(hit.point); spark.visible = true;
    const e = hit.object.userData.enemy;
    if (e) { G.hits++; damageEnemy(e, fwd); hitT = 0.12; cross.classList.add('hit'); }
  }
  if (ammo === 0) startReload();                                // auto-reload on empty
}

// bot: nearest living enemy with a clear line of sight (falls back to plain nearest)
function botAim() {
  let best = null, bestD = 1e9, any = null, anyD = 1e9;
  const eye = player.pos;
  for (const e of enemies) {
    if (!e.alive) continue;
    const c = tmp.set(e.root.position.x, 0.55 * ENEMY_SCALE, e.root.position.z), d = c.distanceTo(eye);
    if (d < anyD) { anyD = d; any = e; }
    if (d >= bestD) continue;
    raycaster.set(eye, tmp2.copy(c).sub(eye).normalize());
    const blocker = raycaster.intersectObjects(solids, false)[0];
    if (!blocker || blocker.distance > d) { bestD = d; best = e; }
  }
  const t = best || any; if (!t) return false;
  const tx = t.root.position.x - eye.x, ty = 0.55 * ENEMY_SCALE - eye.y, tz = t.root.position.z - eye.z;
  player.yaw = Math.atan2(-tx, -tz); player.pitch = Math.atan2(ty, Math.hypot(tx, tz));
  return true;
}

// ---------- flow ----------
function startGame() {
  for (const e of enemies) removeEnemy(e);
  enemies.length = 0; lastCorpse = null;
  player.pos.set(0, EYE, 0); player.yaw = 0; player.pitch = 0; player.hp = 100;
  kills = 0; wave = START_WAVE - 1; toSpawn = 0; waveGap = 0.8; fireT = botT = 0; G.shots = G.hits = 0; G.peak = null;
  ammo = MAG_SIZE; reloading = false; reloadT = 0; G.reloads = 0;
  state = 'playing'; overlay.classList.add('hidden');
  drawT = DRAW_TIME; vmPlay('draw', 0);
}
function nextWave() { wave++; toSpawn = WAVES[wave - 1]; spawnT = 0; showBanner(`WAVE ${wave}`); }
function endGame(won) {
  state = won ? 'won' : 'lost'; firing = false;
  if (document.pointerLockElement) document.exitPointerLock();
  showOverlay(won ? 'DECK CLEARED' : 'YOU WERE EATEN', won ? `All three waves down. ${kills} scuttlers killed.` : `Wave ${wave}, ${kills} kills.`, 'Restart');
}

function update(dt) {
  const playing = state === 'playing';
  if (vm.mixer) vm.mixer.update(dt);
  if (drawT > 0) drawT -= dt;
  if (reloading && (reloadT -= dt) <= 0) { reloading = false; ammo = MAG_SIZE; }
  if (playing) {
    // player
    if (AUTO) {
      botT -= dt;
      if (botAim() && !NOFIRE && botT <= 0) { syncCamera(); fire(); botT = BOT_FIRE_INTERVAL; }
    } else {
      const f = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0), s = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      if (f || s) {
        const l = Math.hypot(f, s), sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
        player.pos.x += ((-sin * f + cos * s) / l) * PLAYER_SPEED * dt; player.pos.z += ((-cos * f - sin * s) / l) * PLAYER_SPEED * dt;
        collide(player.pos, PLAYER_R);
      }
      fireT -= dt;
      if ((firing || keys.has('Space')) && fireT <= 0) { syncCamera(); fire(); fireT = FIRE_INTERVAL; }
    }
    // waves
    if (toSpawn > 0) { spawnT -= dt; if (spawnT <= 0) { spawnEnemy(); toSpawn--; spawnT = SPAWN_INTERVAL; } }
  }
  let alive = 0, tsSum = 0, tsN = 0, faceSum = 0, faceN = 0;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i]; updateEnemy(e, dt, playing);
    if (e.alive) {
      alive++;
      if (e.moved > 0.2) {
        tsSum += e.walk.timeScale; tsN++;
        if (e.head) { // is the head ahead of the body along the direction it is actually moving?
          e.head.getWorldPosition(tmp); const hx = tmp.x - e.root.position.x, hz = tmp.z - e.root.position.z, sp = Math.hypot(e.vel.x, e.vel.z) || 1;
          faceSum += (hx * e.vel.x + hz * e.vel.z) / (sp * (Math.hypot(hx, hz) || 1)); faceN++;
        }
      }
    }
    else if (e.deadT > CORPSE_TIME) { removeEnemy(e); enemies.splice(i, 1); }
  }
  // hard separation: bodies never overlap each other or the player, so a big wave queues up instead of stacking
  // into one blob (round 2). Legs (2.5 m span) still interpenetrate; only the ~1.5 m body disc is kept clear.
  if (playing) for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (!a.alive) continue; const ap = a.root.position;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; if (!b.alive) continue; const bp = b.root.position;
      const dx = bp.x - ap.x, dz = bp.z - ap.z, d = Math.hypot(dx, dz), min = ENEMY_R * 2;
      if (d < min && d > 1e-5) { const k = ((min - d) / d) * 0.5; ap.x -= dx * k; ap.z -= dz * k; bp.x += dx * k; bp.z += dz * k; }
    }
    const dx = ap.x - player.pos.x, dz = ap.z - player.pos.z, d = Math.hypot(dx, dz), min = STOP_RANGE - 0.15;
    if (d < min && d > 1e-5) { ap.x += (dx / d) * (min - d); ap.z += (dz / d) * (min - d); }
  }
  if (lastCorpse) G.lastCorpse = { deadT: +lastCorpse.deadT.toFixed(2), dieTime: +lastCorpse.die.time.toFixed(3), dieWeight: +lastCorpse.die.getEffectiveWeight().toFixed(2),
    walkWeight: +lastCorpse.walk.getEffectiveWeight().toFixed(2), diePaused: lastCorpse.die.paused, bodyBoneY: +lastCorpse.bodyBone.position.y.toFixed(3) };
  if (playing) {
    if (player.hp <= 0) { player.hp = 0; endGame(false); }
    else if (toSpawn === 0 && alive === 0) {
      if (wave >= WAVES.length) endGame(true);
      else { waveGap -= dt; if (waveGap <= 0) { nextWave(); waveGap = 2; } }
    }
  }
  if (DIAG) diag.sample(dt);
  // fx timers
  if (flashT > 0 && (flashT -= dt) <= 0) { flash.visible = POSE === 'fire'; tracer.visible = spark.visible = false; flashLight.intensity = 0; }
  if (hitT > 0 && (hitT -= dt) <= 0) cross.classList.remove('hit');
  hurtT = Math.max(0, hurtT - dt); hurt.style.opacity = Math.min(1, hurtT * 3);
  // blob shadows
  const m = new THREE.Matrix4(); let n = 0;
  for (const e of enemies) {
    if (n >= MAX_ENEMIES) break;
    const s = 1.0 * ENEMY_SCALE; m.makeScale(s, 1, s).setPosition(e.root.position.x, 0.012, e.root.position.z); blobs.setMatrixAt(n++, m);
  }
  blobs.count = n; blobs.instanceMatrix.needsUpdate = true;

  G.state = state; G.wave = wave; G.alive = alive; G.kills = kills; G.playerHp = Math.round(player.hp);
  G.ammo = ammo; G.reloading = reloading; G.weaponClip = vm.clip;
  if (vm.muzzle) { camera.updateMatrixWorld(true); G.muzzleCam = camera.worldToLocal(vm.muzzle.getWorldPosition(tmp)).toArray().map((v) => +v.toFixed(3)); }
  G.walkTimeScale = tsN ? +(tsSum / tsN).toFixed(3) : 0; G.corpses = enemies.length - alive;
  G.player = { x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2), yaw: +player.yaw.toFixed(3), pitch: +player.pitch.toFixed(3), locked: document.pointerLockElement === canvas };
  if (faceN) G.facingDot = +(faceSum / faceN).toFixed(3);
}

function syncCamera() {
  camera.position.copy(player.pos); camera.rotation.set(player.pitch, player.yaw, 0);
}

// debug render cameras (the player camera still drives aiming)
function debugCamera() {
  if (VIEW === 'top') { viewCam.position.set(0, 46, 0.01); viewCam.lookAt(0, 0, 0); return viewCam; }
  if (VIEW === 'chase') {
    const e = enemies.find((x) => x.alive) || enemies[0];
    if (e) { // side-on, slightly above, so gait and facing are both visible
      const h = e.heading, p = e.root.position;
      viewCam.position.set(p.x + Math.cos(h) * 4.2 - Math.sin(h) * 1.2, 1.5, p.z - Math.sin(h) * 4.2 - Math.cos(h) * 1.2);
      viewCam.lookAt(p.x, 0.5, p.z);
    }
    return viewCam;
  }
  return camera;
}

// view=strip: 4x2 contact sheet indexed by animation phase (reads left-to-right, top row first).
// target=walk (default) follows a walking enemy (side=front for head-on); target=die locks a fixed camera onto the
// next enemy to die and shows its die clip in 8 steps.
const strip = { e: null, tile: -1, die: Q.get('target') === 'die' };
function renderStrip() {
  const s = strip; let e = s.e;
  if (s.die) {
    if (!e || e.deadT > 1.15 || !enemies.includes(e)) {
      e = s.e = enemies.find((x) => !x.alive && x.deadT < 0.1) || null; s.tile = -1;
      if (e) { const p = e.root.position, h = e.heading + 0.9; viewCam.position.set(p.x + Math.sin(h) * 3.6, 1.7, p.z + Math.cos(h) * 3.6); viewCam.lookAt(p.x, 0.4, p.z); }
    }
    if (!e) return;
  } else {
    if (!e || !e.alive) e = s.e = enemies.find((x) => x.alive && x.moved > x.speed * 0.9) || null;
    if (!e) return;
    const h = e.heading, p = e.root.position, side = Q.get('side') === 'front' ? 0 : Math.PI / 2;
    viewCam.position.set(p.x + Math.sin(h + side) * 3.8, side ? 0.9 : 1.6, p.z + Math.cos(h + side) * 3.8); viewCam.lookAt(p.x, 0.45, p.z);
  }
  const tile = Math.min(7, Math.floor((s.die ? e.deadT / 1.0 : e.walk.time / asset.walk.duration) * 8));
  if (tile === s.tile) return; s.tile = tile;
  const w = Math.floor(innerWidth / 4), h = Math.floor(innerHeight / 2), x = (tile % 4) * w, y = (1 - Math.floor(tile / 4)) * h;
  viewCam.aspect = w / h; viewCam.updateProjectionMatrix();
  renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.setScissorTest(true);
  renderer.render(scene, viewCam);
}

// ---------- diagnostics: do planted feet slide? ----------
const diag = {
  e: null, feet: [], n: 0, slip: 0, along: 0, minY: 1e9, maxY: -1e9,
  attach(e) {
    this.e = e; this.feet = [];
    for (const t of asset.feet) { const bone = e.model.getObjectByName(t.name); if (bone) this.feet.push({ bone, local: t.local, prev: null, w: new THREE.Vector3() }); }
  },
  sample(dt) {
    const e = this.e; if (!e) return;
    if (!e.alive) { this.e = null; const nx = enemies.find((x) => x.alive); if (nx) this.attach(nx); return; }
    const hx = Math.sin(e.heading), hz = Math.cos(e.heading), steady = e.moved > e.speed * 0.9;
    for (const f of this.feet) {
      f.w.copy(f.local).applyMatrix4(f.bone.matrixWorld);
      if (steady) { this.minY = Math.min(this.minY, f.w.y); this.maxY = Math.max(this.maxY, f.w.y); }
      if (f.prev && steady && f.w.y < PLANT_Y * ENEMY_SCALE && f.prev.y < PLANT_Y * ENEMY_SCALE) {
        const vx = (f.w.x - f.prev.x) / dt, vz = (f.w.z - f.prev.z) / dt;
        this.slip += Math.hypot(vx, vz); this.along += vx * hx + vz * hz; this.n++;
      }
      (f.prev || (f.prev = new THREE.Vector3())).copy(f.w);
    }
    G.footSlip = { feet: this.feet.length, plantedSamples: this.n, meanPlantedSpeed: this.n ? +(this.slip / this.n).toFixed(3) : null,
      meanAlongHeading: this.n ? +(this.along / this.n).toFixed(3) : null, bodySpeed: +e.moved.toFixed(3),
      tipMinY: +this.minY.toFixed(3), tipMaxY: +this.maxY.toFixed(3) };
  },
};

// ---------- input ----------
const canvas = renderer.domElement;
let dragging = false;
function look(dx, dy) {
  player.yaw -= dx * 0.0023; player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch - dy * 0.0023));
}
function requestLock() {
  if (document.pointerLockElement === canvas || !canvas.requestPointerLock || Q.get('nolock') === '1') return; // nolock=1 simulates a refusal
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* refused: drag-to-look still works */ }
}
canvas.addEventListener('mousedown', (ev) => {
  if (ev.button !== 0 || state !== 'playing' || AUTO) return;
  requestLock(); firing = true; dragging = true;
});
addEventListener('mouseup', (ev) => { if (ev.button === 0) { firing = false; dragging = false; } });
addEventListener('mousemove', (ev) => {
  if (state !== 'playing' || AUTO) return;
  if (document.pointerLockElement === canvas || dragging) look(ev.movementX, ev.movementY);
});
addEventListener('keydown', (ev) => { keys.add(ev.code); if (ev.code === 'Space' || ev.code.startsWith('Arrow')) ev.preventDefault(); if (ev.code === 'KeyR') startReload(); });
addEventListener('keyup', (ev) => keys.delete(ev.code));
addEventListener('blur', () => { keys.clear(); firing = false; dragging = false; });
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
oBtn.addEventListener('click', () => { if (state === 'ready' || state === 'won' || state === 'lost') { startGame(); requestLock(); } });

// ---------- loop ----------
let last = performance.now(), hudT = 0;
renderer.setAnimationLoop((now) => {
  const real = Math.min(0.5, (now - last) / 1000); last = now;
  const dt = STEP > 0 ? STEP : Math.min(0.1, real);
  if (state !== 'loading') update(dt);
  syncCamera();
  renderer.info.reset();
  if (VIEW === 'strip') renderStrip();
  else {
    const cam = debugCamera();
    renderer.render(scene, cam);                                  // world (layer 0)
    if (cam === camera) {                                         // viewmodel on top, depth cleared
      const calls = renderer.info.render.calls;
      // a Color background forces a full clear even with autoClear off (it wiped the world in round 2), so drop it for this pass
      const bg = scene.background; scene.background = null;
      camera.layers.set(VM_LAYER); renderer.autoClear = false; renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.autoClear = true; camera.layers.set(0); scene.background = bg;
      G.viewmodelDrawCalls = renderer.info.render.calls - calls - (flash.visible ? 1 : 0);
    }
  }
  if (real > 0) fpsEma = fpsEma ? fpsEma + (1 / real - fpsEma) * 0.1 : 1 / real;
  G.fps = +fpsEma.toFixed(1); G.drawCalls = renderer.info.render.calls; G.triangles = renderer.info.render.triangles;
  if (state === 'playing' && (!G.peak || G.wave > G.peak.wave || (G.wave === G.peak.wave && G.alive >= G.peak.alive))) {
    G.peak = { wave: G.wave, alive: G.alive, corpses: G.corpses, drawCalls: G.drawCalls, triangles: G.triangles, fps: G.fps, walkTimeScale: G.walkTimeScale };
  }
  if ((hudT -= real) <= 0) {
    hudT = 0.1;
    hud.hp.textContent = Math.ceil(player.hp); hud.wave.textContent = wave ? `${wave}/${WAVES.length}` : '-';
    hud.alive.textContent = G.alive; hud.kills.textContent = kills; hud.fps.textContent = Math.round(fpsEma);
    hud.ammo.textContent = reloading ? 'RELOADING' : `${ammo}/${MAG_SIZE}`;
    hpfill.style.width = `${Math.max(0, player.hp)}%`; hpfill.style.background = player.hp > 35 ? '#5fd38a' : '#ff5a4a';
  }
});
