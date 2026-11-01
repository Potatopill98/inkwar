// 三渲二水墨战场渲染：场景、镜头、描边后处理、天气、部署高亮
import * as THREE from '../lib/three.module.js';
import { createBase, createPine, createRock, createBanner, toonMaterial, ghostMaterial } from './models.js?v=1.93';

export const PADS = [
  { x: -12.0, z: -1.35 },
  { x: -9.0, z: 1.35 },
  { x: -6.0, z: -1.35 },
  { x: -3.0, z: 1.35 },
];

function makePaperTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#efe6d3';
  g.fillRect(0, 0, c.width, c.height);
  // 纸纤维
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const a = Math.random() * 0.05;
    g.strokeStyle = `rgba(60,54,44,${a})`;
    g.lineWidth = 0.5 + Math.random();
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() - 0.5) * 18, y + (Math.random() - 0.5) * 6);
    g.stroke();
  }
  // 道路：横向墨笔触
  for (let i = 0; i < 7; i++) {
    const y = c.height * 0.5 + (Math.random() - 0.5) * 46;
    g.strokeStyle = `rgba(45,40,32,${0.06 + Math.random() * 0.07})`;
    g.lineWidth = 8 + Math.random() * 18;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-20, y);
    for (let x = 0; x <= c.width + 20; x += 40) {
      g.lineTo(x, y + Math.sin(x * 0.02 + i) * 9 + (Math.random() - 0.5) * 6);
    }
    g.stroke();
  }
  // 淡墨晕染
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const r = 10 + Math.random() * 50;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(60,60,52,${0.02 + Math.random() * 0.045})`);
    grad.addColorStop(1, 'rgba(60,60,52,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // 草叶
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * c.width;
    const y = c.height * (0.18 + Math.random() * 0.64);
    if (Math.abs(y - c.height * 0.5) < 55) continue;
    g.strokeStyle = `rgba(70,80,64,${0.08 + Math.random() * 0.10})`;
    g.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.moveTo(x + k * 2, y);
      g.lineTo(x + (Math.random() - 0.5) * 8, y - 5 - Math.random() * 8);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

function makeDeployTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  g.strokeStyle = 'rgba(75,122,106,0.75)';
  g.lineWidth = 5;
  g.setLineDash([16, 12]);
  g.beginPath();
  g.roundRect(10, 10, 492, 236, 18);
  g.stroke();
  g.setLineDash([]);
  // 阵纹
  g.strokeStyle = 'rgba(75,122,106,0.20)';
  g.lineWidth = 2;
  for (let i = 1; i < 10; i++) {
    g.beginPath();
    g.moveTo(10 + i * 49, 20);
    g.lineTo(10 + i * 49, 236);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeParticleTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 1, 32, 32, 31);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMountainWashTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.22)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.72)');
  grad.addColorStop(1, 'rgba(255,255,255,0.95)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function makeInkCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 16; i++) {
    const x = 30 + Math.random() * 196;
    const y = 30 + Math.random() * 68;
    const r = 20 + Math.random() * 48;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(45,45,40,${0.06 + Math.random() * 0.05})`);
    grad.addColorStop(1, 'rgba(45,45,40,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const POST_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const POST_FRAGMENT = `
precision highp float;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform float uEdge;
uniform vec3 uInk;
uniform float uTime;
uniform float uDamage;
uniform float uNight;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  vec2 px = 1.0 / uResolution;
  float d0 = texture2D(tDepth, uv).r;
  float e = 0.0;
  e = max(e, abs(texture2D(tDepth, uv + vec2(px.x * 1.6, 0.0)).r - d0));
  e = max(e, abs(texture2D(tDepth, uv + vec2(-px.x * 1.6, 0.0)).r - d0));
  e = max(e, abs(texture2D(tDepth, uv + vec2(0.0, px.y * 1.6)).r - d0));
  e = max(e, abs(texture2D(tDepth, uv + vec2(0.0, -px.y * 1.6)).r - d0));
  e = max(e, abs(texture2D(tDepth, uv + vec2(px.x * 1.1, px.y * 1.1)).r - d0));
  e = max(e, abs(texture2D(tDepth, uv + vec2(-px.x * 1.1, -px.y * 1.1)).r - d0));
  float depthEdge = smoothstep(0.0005, 0.0028, e) * uEdge;
  depthEdge *= 1.0 - smoothstep(0.982, 0.996, d0);

  vec3 c = texture2D(tDiffuse, uv).rgb;
  vec3 cR = texture2D(tDiffuse, uv + vec2(px.x * 1.8, 0.0)).rgb;
  vec3 cL = texture2D(tDiffuse, uv - vec2(px.x * 1.8, 0.0)).rgb;
  vec3 cU = texture2D(tDiffuse, uv + vec2(0.0, px.y * 1.8)).rgb;
  vec3 cD = texture2D(tDiffuse, uv - vec2(0.0, px.y * 1.8)).rgb;
  float colorDiff = max(max(length(c - cR), length(c - cL)), max(length(c - cU), length(c - cD)));
  float colorEdge = smoothstep(0.085, 0.30, colorDiff) * 0.92;
  float edge = clamp(max(depthEdge, colorEdge), 0.0, 1.0);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, vec3(lum), 0.10);
  c = mix(c, c * vec3(1.04, 1.005, 0.96), 0.5);

  float grain = hash(uv * uResolution * 0.45 + uTime * 2.0);
  c *= (1.0 - 0.045 * grain);

  float vig = smoothstep(0.95, 0.28, length(uv - 0.5));
  c *= mix(0.72, 1.0, vig);

  float edgeDist = length(uv - 0.5);
  c = mix(c, vec3(0.70, 0.23, 0.18), uDamage * smoothstep(0.52, 0.92, edgeDist) * 0.42);
  c *= mix(1.0, 0.52, uNight);
  c = mix(c, uInk, edge * 0.94);

  gl_FragColor = vec4(c, 1.0);
}
`;

export class BattleScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.quality = 'auto';
    this.rtScale = 1.0;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xefe6d3);
    this.scene.fog = new THREE.Fog(0xefe6d3, 46, 78);

    this.camera = new THREE.PerspectiveCamera(36, 16 / 9, 1, 140);
    this.baseCameraPos = new THREE.Vector3(0, 12.4, 30.0);
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(0, 2.2, 0);
    this.lookTarget = new THREE.Vector3(0, 2.2, 0);

    this.clockTime = 0;
    this.shakeTime = 0;
    this.shakeAmount = 0;
    this.damage = 0;
    this.focusX = 0;
    this.weather = 'clear';
    this.introT = 1.6;
    this.zoom = 1; // 视角缩放（1 = 默认；>1 拉近）
    this.zoomTarget = 1;
    this.camX = 0;
    this.zoomFocus = { x: 0, z: 0 }; // 缩放锚点（世界坐标，限制在战场内）
    this.zoomFocusSmooth = { x: 0, z: 0 };
    this._pinchDist = 0;

    this.buildLights();
    this.buildTerrain();
    this.buildBases();
    this.buildDeployZone();
    this.buildTutorialMarker();
    this.buildWeather();
    this.buildPost();

    this.resize();
    window.addEventListener('resize', this.onResize);
    this.bindZoom();
  }

  // 滚轮 / 双指缩放：以指针或双指中心为锚点，镜头位移限制在战场边界内（参考死亡突围）
  bindZoom() {
    const clampZoom = () => { this.zoomTarget = Math.max(0.78, Math.min(1.55, this.zoomTarget)); };
    // 屏幕坐标 → 战场地面锚点（限制在基地与兵道范围内，防止缩放到界外空地）
    const pickFocus = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
      const v = new THREE.Vector3(nx, ny, 0.5).unproject(this.camera).sub(this.camera.position);
      if (Math.abs(v.y) < 1e-4) return;
      const t = (1.2 - this.camera.position.y) / v.y;
      if (!Number.isFinite(t) || t <= 0) return;
      const p = this.camera.position.clone().addScaledVector(v.normalize(), t);
      this.zoomFocus.x = THREE.MathUtils.clamp(p.x, -14.5, 14.5);
      this.zoomFocus.z = THREE.MathUtils.clamp(p.z, -3.2, 3.2);
    };
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      pickFocus(e.clientX, e.clientY);
      this.zoomTarget -= Math.sign(e.deltaY) * 0.07;
      clampZoom();
    }, { passive: false });
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 2) { this._pinchDist = 0; return; }
      const [a, b] = e.touches;
      this._pinchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pickFocus((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
    }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2 || !this._pinchDist) return;
      const [a, b] = e.touches;
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      this.zoomTarget += (d - this._pinchDist) * 0.004;
      this._pinchDist = d;
      pickFocus((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      clampZoom();
    }, { passive: true });
    this.canvas.addEventListener('touchend', () => { this._pinchDist = 0; }, { passive: true });
  }

  onResize = () => this.resize();

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xf5efdf, 0x7a7468, 2.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4dd, 2.2);
    this.sun.position.set(-8, 18, 14);
    this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0x9ab0b0, 0.85);
    this.fill.position.set(12, 8, -10);
    this.scene.add(this.fill);
    this.ambient = new THREE.AmbientLight(0xefe6d3, 0.55);
    this.scene.add(this.ambient);
  }

  buildTerrain() {
    // 大纸面兜底，避免地面远边缘形成一条突兀的深黑横线
    const basePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 160),
      new THREE.MeshBasicMaterial({ color: 0xefe6d3, fog: true, depthWrite: false }),
    );
    basePlane.rotation.x = -Math.PI / 2;
    basePlane.position.y = -0.03;
    basePlane.renderOrder = -20;
    this.scene.add(basePlane);

    const tex = makePaperTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(74, 30),
      new THREE.MeshBasicMaterial({ map: tex, fog: true, depthWrite: false }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.renderOrder = -19;
    this.scene.add(ground);
    this.ground = ground;

    // 远山三层
    const mountainLayers = [
      { z: -30, h: 10, color: 0x9a9a8a, opacity: 0.5, offset: 0.0 },
      { z: -40, h: 13, color: 0x7a7a70, opacity: 0.36, offset: 1.3 },
      { z: -52, h: 16, color: 0x5a5a54, opacity: 0.22, offset: 2.7 },
    ];
    const washAlpha = makeMountainWashTexture();
    for (const layer of mountainLayers) {
      const shape = new THREE.Shape();
      shape.moveTo(-30, 0);
      for (let x = -30; x <= 30; x += 3) {
        const y = layer.h * (0.35 + 0.35 * Math.sin(x * 0.22 + layer.offset) + 0.18 * Math.sin(x * 0.51 - layer.offset));
        shape.lineTo(x, Math.max(0.6, y));
      }
      shape.lineTo(30, 0);
      shape.lineTo(-30, 0);
      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({
        color: layer.color, transparent: true, opacity: layer.opacity, fog: true, depthWrite: false,
        alphaMap: washAlpha,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0, layer.z);
      this.scene.add(mesh);
    }

    // 朱砂日轮
    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 16),
      new THREE.MeshBasicMaterial({ color: 0xb23a2f, transparent: true, opacity: 0.48, fog: true, depthWrite: false }),
    );
    sun.position.set(-10, 10.6, -37);
    sun.material.opacity = 0.34;
    this.scene.add(sun);

    // 淡墨云
    const cloudTex = makeInkCloudTexture();
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.25, depthWrite: false, fog: true });
      const sp = new THREE.Sprite(mat);
      sp.position.set(-24 + i * 8, 9 + (i % 3) * 1.6, -26 - (i % 2) * 4);
      sp.scale.set(16, 4.5, 1);
      this.scene.add(sp);
    }

    // 两侧松林与石头
    const pinePos = [
      [-21, -9.2, 1.2], [-15, -8.6, 0.95], [-8, -9.0, 0.85], [1, -8.7, 1.0],
      [10, -9.1, 1.05], [19, -8.8, 1.2],
      [-19, 9.0, 0.95], [-7, 8.6, 0.85], [6, 9.1, 1.0], [17, 8.8, 1.15],
    ];
    pinePos.forEach(([x, z, s], i) => this.scene.add(createPine(x, z, s, i % 2)));
    const rockPos = [[-16, -4.8], [-9, 5.0], [4, -4.6], [12, 5.2]];
    rockPos.forEach(([x, z], i) => this.scene.add(createRock(x, z, 0.7 + (i % 3) * 0.25)));
    this.scene.add(createBanner(-15.2, -3.2, 0x4b7a6a, 1));
    this.scene.add(createBanner(15.2, 3.2, 0xb23a2f, -1));
    this.scene.add(createBanner(-13.8, 3.6, 0xc9a25e, 1));
  }

  buildBases() {
    this.playerBase = createBase('player');
    this.playerBase.position.set(-17.2, 0, 0);
    this.scene.add(this.playerBase);
    this.enemyBase = createBase('enemy');
    this.enemyBase.position.set(17.2, 0, 0);
    this.enemyBase.rotation.y = Math.PI;
    this.scene.add(this.enemyBase);
  }

  buildDeployZone() {
    const tex = makeDeployTexture();
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.9, depthWrite: false, color: 0xffffff,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 6.2), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(-8.5, 0.035, 0);
    mesh.visible = false;
    this.scene.add(mesh);
    this.deployMesh = mesh;

    this.padMeshes = PADS.map((p) => {
      const geo = new THREE.RingGeometry(0.55, 0.72, 24);
      const m = new THREE.MeshBasicMaterial({ color: 0xc9a25e, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
      const ring = new THREE.Mesh(geo, m);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x, 0.04, p.z);
      ring.visible = false;
      this.scene.add(ring);
      const inner = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 16),
        new THREE.MeshBasicMaterial({ color: 0x4b7a6a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
      );
      inner.rotation.x = -Math.PI / 2;
      inner.position.set(p.x, 0.038, p.z);
      inner.visible = false;
      this.scene.add(inner);
      return { ring, inner, pad: p };
    });
  }

  
  buildTutorialMarker() {
    const group = new THREE.Group();
    // 1. 地面动态发光光环
    const ringGeo = new THREE.RingGeometry(0.85, 1.3, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.045;
    group.add(ring);

    // 2. 内部金光圆盘
    const coreGeo = new THREE.CircleGeometry(0.8, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.x = -Math.PI / 2;
    core.position.y = 0.046;
    group.add(core);

    // 3. 向上散发的金辉光柱
    const beamGeo = new THREE.CylinderGeometry(0.8, 1.25, 2.5, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.25;
    group.add(beam);

    group.visible = false;
    this.scene.add(group);
    this.tutorialMarkerGroup = group;
    this.tutorialMarkerRing = ring;
    this.tutorialMarkerCore = core;
    this.tutorialMarkerBeam = beam;
  }

  setTutorialMarker(active, x = 0, z = 0) {
    if (!this.tutorialMarkerGroup) return;
    this.tutorialMarkerGroup.visible = !!active;
    if (active) {
      this.tutorialMarkerGroup.position.set(x, 0, z);
    }
  }

  worldToScreen(x, y = 0, z = 0) {
    if (!this.camera || !this.canvas) return null;
    const v = new THREE.Vector3(x, y, z);
    v.project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    const sx = ((v.x + 1) / 2) * rect.width + rect.left;
    const sy = ((-v.y + 1) / 2) * rect.height + rect.top;
    return { x: sx, y: sy };
  }

  showDeploy(show, forBuilding = false, forSpell = false) {
    this.deployMesh.visible = show && !forBuilding && !forSpell;
    for (const pm of this.padMeshes) {
      pm.ring.visible = show && forBuilding && !forSpell;
      pm.inner.visible = show && forBuilding && !forSpell;
    }
  }

  buildWeather() {
    // 雨
    const rainCount = 260;
    const rainPos = new Float32Array(rainCount * 2 * 3);
    for (let i = 0; i < rainCount; i++) {
      const x = (Math.random() - 0.5) * 46;
      const y = Math.random() * 16;
      const z = (Math.random() - 0.5) * 18;
      rainPos[i * 6] = x;
      rainPos[i * 6 + 1] = y;
      rainPos[i * 6 + 2] = z;
      rainPos[i * 6 + 3] = x - 0.06;
      rainPos[i * 6 + 4] = y - 0.55;
      rainPos[i * 6 + 5] = z;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    this.rain = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({ color: 0x6b746d, transparent: true, opacity: 0.32, depthWrite: false }),
    );
    this.rain.visible = false;
    this.scene.add(this.rain);
    this.rainCount = rainCount;

    // 雪
    const snowCount = 240;
    const snowPos = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      snowPos[i * 3] = (Math.random() - 0.5) * 44;
      snowPos[i * 3 + 1] = Math.random() * 14;
      snowPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    this.snow = new THREE.Points(
      snowGeo,
      new THREE.PointsMaterial({
        color: 0xf6f2e8, size: 0.14, transparent: true, opacity: 0.75,
        map: makeParticleTexture(), depthWrite: false, sizeAttenuation: true,
      }),
    );
    this.snow.visible = false;
    this.scene.add(this.snow);
  }

  setWeather(weather) {
    this.weather = weather || 'clear';
    this.rain.visible = this.weather === 'rain';
    this.snow.visible = this.weather === 'snow';
    const night = this.weather === 'night';
    const fog = this.weather === 'fog';
    this.scene.fog.near = fog ? 16 : 46;
    this.scene.fog.far = fog ? 52 : 78;
    this.scene.fog.color.setHex(0xefe6d3);
    this.scene.background.setHex(night ? 0xc9c2b2 : 0xefe6d3);
    this.hemi.intensity = night ? 1.2 : 2.0;
    this.sun.intensity = night ? 1.3 : 2.2;
    this.fill.intensity = night ? 0.5 : 0.85;
    this.ambient.intensity = night ? 0.35 : 0.55;
    this.night = night ? 1 : 0;
    this.postUniforms.uNight.value = night ? 0.45 : 0;
    this.weatherOverlay = this.weather;
  }

  buildPost() {
    this.target = null;
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postUniforms = {
      tDiffuse: { value: null },
      tDepth: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uEdge: { value: 1.0 },
      uInk: { value: new THREE.Color(0x17150f) },
      uTime: { value: 0 },
      uDamage: { value: 0 },
      uNight: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.postUniforms,
      vertexShader: POST_VERTEX,
      fragmentShader: POST_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    this.postScene.add(quad);
  }

  buildTarget(width, height) {
    if (this.target) {
      this.target.depthTexture && this.target.depthTexture.dispose();
      this.target.dispose();
    }
    const w = Math.max(2, Math.floor(width * this.rtScale));
    const h = Math.max(2, Math.floor(height * this.rtScale));
    const rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const depth = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
    depth.minFilter = THREE.NearestFilter;
    depth.magFilter = THREE.NearestFilter;
    rt.depthTexture = depth;
    this.target = rt;
    this.postUniforms.tDiffuse.value = rt.texture;
    this.postUniforms.tDepth.value = depth;
    this.postUniforms.uResolution.value.set(w, h);
  }

  setQuality(quality) {
    this.quality = quality;
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    let pr = Math.min(window.devicePixelRatio || 1, 1.5);
    let scale = 1.0;
    if (quality === 'low') {
      pr = Math.min(window.devicePixelRatio || 1, 1.0);
      scale = 0.78;
    } else if (quality === 'auto' && isMobile) {
      // 手机端保可读性：DPR cap 提到 1.5（之前硬限 1.0 导致描边全是像素锯齿），
      // rtScale 提到 0.92 保证后处理 RT 不至于太糊
      pr = Math.min(window.devicePixelRatio || 1, 1.5);
      scale = 0.92;
    }
    this.pixelRatio = pr;
    this.rtScale = scale;
    this.renderer.setPixelRatio(pr);
    this.resize();
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    const size = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(size);
    this.buildTarget(size.x, size.y);
  }

  setFocus(x) {
    this.focusX = x;
  }

  showIntro() {
    this.introT = 1.4;
    this.camera.position.set(0, 17.5, 34.5);
    this.camera.lookAt(0, 2.4, 0);
  }

  screenShake(amount = 0.18, time = 0.22) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  damagePulse() {
    this.damage = Math.min(1, this.damage + 0.65);
  }

  projectPointer(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    const hit = ray.ray.intersectPlane(plane, point);
    if (!hit) return null;
    return { x: point.x, z: point.z };
  }

  update(dt) {
    this.clockTime += dt;
    this.postUniforms.uTime.value = this.clockTime;
    this.damage = Math.max(0, this.damage - dt * 1.8);
    this.postUniforms.uDamage.value = this.damage;
    // 天气动画
    if (this.weather === 'rain') {
      const arr = this.rain.geometry.attributes.position.array;
      for (let i = 0; i < this.rainCount; i++) {
        const base = i * 6;
        const fall = 18 * dt;
        arr[base + 1] -= fall;
        arr[base + 4] -= fall;
        if (arr[base + 4] < 0) {
          const ny = 14 + Math.random() * 4;
          arr[base + 1] = ny;
          arr[base + 4] = ny - 0.55;
        }
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    } else if (this.weather === 'snow') {
      const arr = this.snow.geometry.attributes.position.array;
      for (let i = 0; i < 240; i++) {
        const base = i * 3;
        arr[base + 1] -= dt * 0.55;
        arr[base] += Math.sin(this.clockTime * 0.6 + i) * dt * 0.22;
        if (arr[base + 1] < 0) {
          arr[base + 1] = 13;
          arr[base] = (Math.random() - 0.5) * 44;
        }
      }
      this.snow.geometry.attributes.position.needsUpdate = true;
    }
    // 军阵位呼吸
    if (this.padMeshes) {
      for (const pm of this.padMeshes) {
        if (pm.ring.visible) {
          const s = 1 + Math.sin(this.clockTime * 3.0) * 0.06;
          pm.ring.scale.setScalar(s);
        }
      }
    }
    // 镜头：围绕指针/双指锚点缩放，可平移但不能越出战场边界
    const followX = this.focusX * 0.18;
    this.camX = THREE.MathUtils.lerp(this.camX, followX, 1 - Math.pow(0.001, dt));
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 8);
    const zoomK = 1 / Math.max(0.5, this.zoom);
    const baseY = this.baseCameraPos.y * zoomK;
    const baseZ = this.baseCameraPos.z * zoomK;
    let camY = baseY;
    let camZ = baseZ;
    // 缩放锚点跟随（缓动），只有拉近时才向锚点偏移，避免滚轮一动画面就漂
    const fk = Math.min(1, dt * 8);
    this.zoomFocusSmooth.x += (this.zoomFocus.x - this.zoomFocusSmooth.x) * fk;
    this.zoomFocusSmooth.z += (this.zoomFocus.z - this.zoomFocusSmooth.z) * fk;
    const zoomIn = THREE.MathUtils.clamp((this.zoom - 1) / 0.55, 0, 1);
    // 可视半宽随缩放变化：留 8% 余量，保证镜头边缘不越过战场边界
    const camDist = Math.hypot(baseY, baseZ);
    const halfViewW = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * this.camera.aspect * camDist;
    const maxPanX = Math.max(0, 15.2 - halfViewW * 0.92);
    const panX = THREE.MathUtils.clamp(this.zoomFocusSmooth.x * zoomIn * 0.9, -maxPanX, maxPanX);
    const panZ = THREE.MathUtils.clamp(this.zoomFocusSmooth.z * zoomIn * 0.35, -2.2, 2.2);
    const lookX = THREE.MathUtils.clamp(this.camX + panX, -14.5, 14.5);
    const lookZ = panZ;
    if (this.introT > 0) {
      this.introT -= dt;
      const k = Math.max(0, this.introT / 1.4);
      camY = THREE.MathUtils.lerp(baseY, 17.5, k);
      camZ = THREE.MathUtils.lerp(baseZ, 34.5, k);
    }
    let offsetX = 0;
    let offsetY = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = Math.max(0, this.shakeTime / 0.22);
      offsetX = (Math.random() - 0.5) * this.shakeAmount * k * 2;
      offsetY = (Math.random() - 0.5) * this.shakeAmount * k * 1.4;
      if (this.shakeTime <= 0) this.shakeAmount = 0;
    }
    this.lookTarget.set(lookX, 2.2, lookZ);
    this.camera.position.set(lookX + offsetX, camY + offsetY, camZ + lookZ);
    this.camera.lookAt(this.lookTarget);
  }

  render() {
    if (!this.target) return;
    this.renderer.setRenderTarget(this.target);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.postScene, this.postCamera);
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    if (this.target) {
      this.target.depthTexture && this.target.depthTexture.dispose();
      this.target.dispose();
    }
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m && m !== toonMaterial && m !== ghostMaterial) {
            m.dispose();
          }
        }
      }
    });
  }
}
