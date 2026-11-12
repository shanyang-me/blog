import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODELS = {
  'blender-video': { label: 'Blender, from video', file: '../game/scuttler.glb' },
  'blender-text': { label: 'Blender, text only', file: './scuttler_text.glb' },
  'tripo-rigged': { label: 'Tripo + agent rig', file: '../game/scuttler_tripo.glb' },
  'tripo-text': { label: 'Tripo, text (no rig)', file: './tripo_text.glb' },
};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc9ced3);
// The agent's albedos are very dark; an environment map keeps them readable.
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9096, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(3, 5, 4);
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.MeshStandardMaterial({ color: 0xb4bac0, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ui = document.getElementById('ui');
const info = document.getElementById('info');
const loader = new GLTFLoader();
const clock = new THREE.Clock();
let current = null;
let mixer = null;
let token = 0;

function button(label, pressed, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.setAttribute('aria-pressed', String(pressed));
  b.addEventListener('click', onClick);
  return b;
}

function renderUi(key, clips, activeClip) {
  ui.replaceChildren();
  for (const [k, m] of Object.entries(MODELS)) ui.appendChild(button(m.label, k === key, () => load(k)));
  if (!clips.length) return;
  const sep = document.createElement('div');
  sep.className = 'sep';
  ui.appendChild(sep);
  for (const c of clips) ui.appendChild(button(c.name, c.name === activeClip, () => play(key, clips, c.name)));
}

function play(key, clips, name) {
  mixer.stopAllAction();
  const action = mixer.clipAction(THREE.AnimationClip.findByName(clips, name));
  action.setLoop(name === 'walk' ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  action.clampWhenFinished = true;
  action.reset().play();
  renderUi(key, clips, name);
}

async function load(key) {
  const my = ++token;
  info.textContent = `Loading ${MODELS[key].label}…`;
  const gltf = await loader.loadAsync(MODELS[key].file);
  if (my !== token) return;
  if (current) scene.remove(current);
  current = gltf.scene;
  // Tripo meshes come at arbitrary scale; normalise everything to ~1.4 m long for side-by-side viewing.
  const box = new THREE.Box3().setFromObject(current);
  const size = box.getSize(new THREE.Vector3());
  const s = 1.4 / Math.max(size.x, size.z);
  current.scale.setScalar(s);
  box.setFromObject(current);
  current.position.y -= box.min.y;
  current.position.x -= (box.min.x + box.max.x) / 2;
  current.position.z -= (box.min.z + box.max.z) / 2;
  scene.add(current);
  const h = box.max.y - box.min.y;
  controls.target.set(0, h / 2, 0);
  camera.position.set(1.9, 1.2, 2.3);
  controls.update();
  let tris = 0;
  current.traverse((o) => {
    if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });
  mixer = new THREE.AnimationMixer(current);
  const clips = gltf.animations;
  info.textContent = `${MODELS[key].label} · ${Math.round(tris).toLocaleString('en-US')} triangles · ${clips.length ? clips.map((c) => c.name).join(', ') : 'no animation'}`;
  if (clips.find((c) => c.name === 'walk')) play(key, clips, 'walk');
  else renderUi(key, clips, null);
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);
  controls.update();
  renderer.render(scene, camera);
});

const start = new URLSearchParams(location.search).get('model');
load(MODELS[start] ? start : 'blender-video').catch((e) => {
  console.error('failed to load model', e);
  info.textContent = `Failed to load: ${e.message || e}`;
});
