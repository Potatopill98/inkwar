
// ============================================================================
// 水墨动态拖尾系统 (InkTrailSystem) - 墨色流连 · 笔断意连
// ============================================================================
class InkTrail {
  constructor(scene, color = 0x2a2a24, width = 0.45, maxPoints = 28) {
    this.scene = scene;
    this.maxPoints = maxPoints;
    this.width = width;
    this.points = [];
    this.alive = true;
    this.age = 0;
    this.maxAge = 1.0;

    const maxVerts = maxPoints * 2;
    const pos = new Float32Array(maxVerts * 3);
    const uvs = new Float32Array(maxVerts * 2);
    const indices = [];

    for (let i = 0; i < maxPoints - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2);
      indices.push(a + 1, a + 3, a + 2);
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geo.setIndex(indices);
    this.geo.setDrawRange(0, 0);

    this.mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.renderOrder = 4;
    scene.add(this.mesh);
  }

  addPoint(x, y, z) {
    if (!this.alive) return;
    this.points.unshift({ x, y, z, time: 0 });
    if (this.points.length > this.maxPoints) {
      this.points.pop();
    }
    this.updateGeometry();
  }

  update(dt) {
    if (!this.alive) return;
    this.age += dt;
    for (const p of this.points) {
      p.time += dt;
    }
    while (this.points.length > 0 && this.points[this.points.length - 1].time > 0.40) {
      this.points.pop();
    }
    this.updateGeometry();
    if ((this.points.length < 2 && this.age > 0.35) || this.age >= this.maxAge) {
      this.destroy();
    }
  }

  updateGeometry() {
    if (!this.alive || !this.mesh) return;
    if (this.points.length < 2) {
      this.geo.setDrawRange(0, 0);
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    const pos = this.geo.attributes.position.array;
    const count = this.points.length;

    for (let i = 0; i < count; i++) {
      const p = this.points[i];
      const ratio = 1 - (i / count);
      const w = this.width * Math.pow(ratio, 0.85);

      let dx = 0, dz = 0;
      if (i < count - 1) {
        dx = this.points[i + 1].x - p.x;
        dz = this.points[i + 1].z - p.z;
      } else {
        dx = p.x - this.points[i - 1].x;
        dz = p.z - this.points[i - 1].z;
      }
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;

      const idx = i * 2;
      pos[idx * 3] = p.x + nx * w;
      pos[idx * 3 + 1] = p.y;
      pos[idx * 3 + 2] = p.z + nz * w;

      pos[(idx + 1) * 3] = p.x - nx * w;
      pos[(idx + 1) * 3 + 1] = p.y;
      pos[(idx + 1) * 3 + 2] = p.z - nz * w;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.setDrawRange(0, (count - 1) * 6);
    this.mat.opacity = Math.max(0, 0.85 * (1 - this.age / this.maxAge));
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    if (this.mesh) {
      this.mesh.visible = false;
      this.scene.remove(this.mesh);
    }
    if (this.geo) this.geo.dispose();
    if (this.mat) this.mat.dispose();
  }
}

// 墨点粒子、刀光、墨环、火焰与高阶国风水墨神将特效
import * as THREE from '../lib/three.module.js';

function particleTexture() {
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    tex.needsUpdate = true;
    return tex;
  }
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 1, 32, 32, 31);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function slashTexture(color) {
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    tex.needsUpdate = true;
    return tex;
  }
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.translate(128, 128);
  const grad = g.createLinearGradient(-100, -100, 100, 100);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.45, color);
  grad.addColorStop(0.55, '#ffffff');
  grad.addColorStop(0.7, color);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.strokeStyle = grad;
  g.lineWidth = 16;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(0, 40, 96, -1.9, -0.55);
  g.stroke();
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.arc(0, 40, 96, -1.9, -0.55);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const PARTICLE_VERT = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * 620.0 / max(1.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const PARTICLE_FRAG = `
precision mediump float;
uniform sampler2D uMap;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 tex = texture2D(uMap, gl_PointCoord);
  float a = tex.a * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

class ParticlePool {
  constructor(scene, capacity, additive = false) {
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.alphas = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.vel = new Float32Array(capacity * 3);
    this.gravity = new Float32Array(capacity);
    this.grow = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4, 0), 60);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: particleTexture() } },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.geo = geo;
    scene.add(this.points);
  }

  spawn(x, y, z, opts = {}) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    const b = i * 3;
    this.positions[b] = x;
    this.positions[b + 1] = y;
    this.positions[b + 2] = z;
    const c = new THREE.Color(opts.color ?? 0x2a2a24);
    this.colors[b] = c.r;
    this.colors[b + 1] = c.g;
    this.colors[b + 2] = c.b;
    this.sizes[i] = opts.size ?? 0.35;
    this.alphas[i] = opts.alpha ?? 0.9;
    const life = opts.life ?? 0.5;
    this.life[i] = life;
    this.maxLife[i] = life;
    const spread = opts.spread ?? 0.6;
    this.vel[b] = (opts.vx ?? (Math.random() - 0.5) * spread * 2);
    this.vel[b + 1] = (opts.vy ?? Math.random() * spread);
    this.vel[b + 2] = (opts.vz ?? (Math.random() - 0.5) * spread);
    this.gravity[i] = opts.gravity ?? -1.6;
    this.grow[i] = opts.grow ?? 0.0;
    this.drag[i] = opts.drag ?? 1.6;
  }

  update(dt) {
    const pos = this.positions;
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      const b = i * 3;
      const drag = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[b] *= drag;
      this.vel[b + 2] *= drag;
      this.vel[b + 1] += this.gravity[i] * dt;
      pos[b] += this.vel[b] * dt;
      pos[b + 1] += this.vel[b + 1] * dt;
      pos[b + 2] += this.vel[b + 2] * dt;
      if (pos[b + 1] < 0.03) {
        pos[b + 1] = 0.03;
        this.vel[b + 1] *= -0.15;
        this.vel[b] *= 0.7;
        this.vel[b + 2] *= 0.7;
      }
      const k = this.life[i] / this.maxLife[i];
      this.alphas[i] = k * 0.95;
      this.sizes[i] = Math.max(0.02, this.sizes[i] + this.grow[i] * dt);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
  }
}

export class EffectSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.ink = new ParticlePool(scene, 420, false);
    this.glow = new ParticlePool(scene, 320, true);
    this.slashes = [];
    this.rings = [];
    this.emitters = [];
    this.slashTexInk = slashTexture('rgba(23,21,15,0.75)');
    this.slashTexJade = slashTexture('rgba(75,122,106,0.75)');
    this.slashTexRed = slashTexture('rgba(178,58,47,0.8)');
    this.slashTexCache = {};
    this.fxMeshes = [];
    this.trails = [];
    this.onShake = null;
    const _origPush = this.fxMeshes.push.bind(this.fxMeshes);
    this.fxMeshes.push = (...items) => {
      for (const it of items) this.initFxMesh(it);
      return _origPush(...items);
    };

    for (let i = 0; i < 24; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.slashTexInk, transparent: true, depthWrite: false, opacity: 0, blending: THREE.NormalBlending,
      });
      const sp = new THREE.Sprite(mat);
      sp.visible = false;
      sp.renderOrder = 3;
      scene.add(sp);
      this.slashes.push({ sprite: sp, life: 0, maxLife: 0.2, spin: 0, grow: 2.2 });
    }
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x4b7a6a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 24), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      this.rings.push({ mesh, life: 0, maxLife: 1, startScale: 1, endScale: 3 });
    }
  }

  createTrail(color = 0x1e293b, width = 0.45, maxPoints = 28) {
    const trail = new InkTrail(this.scene, color, width, maxPoints);
    this.trails.push(trail);
    return trail;
  }

  // 规范初始化特效网格透明度与基准缩放，确保第0帧无任何跳闪与突兀瞬现
  initFxMesh(f) {
    if (!f || !f.mesh || f._initialized) return;
    f._initialized = true;
    f.baseScale = f.mesh.scale.clone();
    f.basePosY = f.mesh.position.y;
    f.mesh.traverse((node) => {
      if (node.isMesh && node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of mats) {
          m.transparent = true;
          if (m.userData.baseOpacity === undefined) {
            m.userData.baseOpacity = (m.opacity !== undefined && m.opacity > 0) ? m.opacity : 0.95;
          }
          m.opacity = 0;
        }
      }
    });
    // 独立物理/弹道/重鼎下砸类技能保持 1.0 满尺寸展开，其余技能以 0.2x 墨核展开
    const fullScaleModes = [
      'skySwordsWaterfall', 'liGuangSixArrowsStream', 'cauldronSmashDrop',
      'generalSealStampDrop', 'flamePhoenixFlapFlight', 'glaiveHeavyChop',
      'scytheSlashDrop', 'dualSwordsConvergence', 'montianBrushGreatWall'
    ];
    if (!fullScaleModes.includes(f.mode)) {
      f.mesh.scale.set(f.baseScale.x * 0.2, f.baseScale.y * 0.2, f.baseScale.z * 0.2);
    }
  }

  // 颜色刀光纹理缓存
  slashTexFor(color) {
    if (color === 'jade') return this.slashTexJade;
    if (color === 'red') return this.slashTexRed;
    if (color === 'ink' || color == null) return this.slashTexInk;
    const key = typeof color === 'number' ? color : String(color);
    if (!this.slashTexCache[key]) {
      const c = new THREE.Color(key);
      const rgba = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},0.85)`;
      this.slashTexCache[key] = slashTexture(rgba);
    }
    return this.slashTexCache[key];
  }

  slash(x, y, z, angle = 0, color = 'ink', scale = 1.2, life = 0.22) {
    const slot = this.slashes.find((s) => s.life <= 0);
    if (!slot) return;
    const sp = slot.sprite;
    sp.visible = true;
    sp.position.set(x, y, z);
    sp.material.map = this.slashTexFor(color);
    sp.material.opacity = 0;
    sp.material.rotation = angle;
    sp.scale.set(scale * 0.25, scale * 0.25, 1);
    slot.targetScale = scale;
    slot.targetOpacity = 0.95;
    slot.life = slot.maxLife = life;
    slot.spin = 0;
    slot.grow = 2.2;
  }

  giantSlash(x, y, z, angle = 0, color = 'jade', scale = 5.5, life = 0.5) {
    const slot = this.slashes.find((s) => s.life <= 0);
    if (!slot) return;
    const sp = slot.sprite;
    sp.visible = true;
    sp.position.set(x, y, z);
    sp.material.map = this.slashTexFor(color);
    sp.material.opacity = 0;
    sp.material.rotation = angle;
    sp.scale.set(scale * 0.25, scale * 0.25, 1);
    slot.targetScale = scale;
    slot.targetOpacity = 1.0;
    slot.life = slot.maxLife = life;
    slot.spin = 0;
    slot.grow = 1.5;
  }

  // 1. 青龙断岳 / 游龙贯穿破阵（巨大龙形气浪复合刀气）
  dragonSlash(x, y, z, angle = -0.4, color = 0x3f8a5a, length = 7.0) {
    this.giantSlash(x, y, z, angle, color, length, 0.55);
    this.giantSlash(x + 1.2, y + 0.2, z, angle - 0.15, 0xd5d0c0, length * 0.7, 0.45);
    this.ring(x - 0.5, z, color, 0.6, length * 0.8, 0.6, 0.9);
    for (let i = 0; i < 18; i++) {
      const px = x - 1 + (i / 18) * length;
      this.glow.spawn(px, y + (Math.random() - 0.5) * 0.8, z + (Math.random() - 0.5) * 0.6, {
        color, size: 0.30 + Math.random() * 0.25, life: 0.55, spread: 0.8, vy: 1.2, gravity: -0.8,
      });
    }
  }

  // 2. 太极八卦水墨法阵（诸葛亮/周瑜/张良/武则天神技）
  baguaArray(x, z, color = 0x8a8478, radius = 5.0, duration = 1.8) {
    // 双环八卦贴地阵
    const group = new THREE.Group();
    const ringA = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.75, radius, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
    );
    ringA.rotation.x = -Math.PI / 2;
    group.add(ringA);

    const ringB = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.25, radius * 0.45, 8),
      new THREE.MeshBasicMaterial({ color: 0x17150f, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })
    );
    ringB.rotation.x = -Math.PI / 2;
    ringB.position.y = 0.005;
    group.add(ringB);

    group.position.set(x, 0.04, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: duration, maxLife: duration, mode: 'bagua', spin: 1.2 });

    // 八方蒸腾灵光与符文微粒
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      this.glow.spawn(x + Math.cos(a) * (radius * 0.8), 0.15, z + Math.sin(a) * (radius * 0.8), {
        color, size: 0.25, life: 0.9, spread: 0.4, vy: 1.8, gravity: 0.1,
      });
    }
  }

  // 3. 破墨拔地召唤仪式（伏兵/神将/陶俑从水墨深潭破土而出）
  summon(x, z, color = 0xc9a25e) {
    // 墨池圆盘
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 16),
      new THREE.MeshBasicMaterial({ color: 0x17150f, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.035, z);
    this.scene.add(pool);
    this.fxMeshes.push({ mesh: pool, life: 0.85, maxLife: 0.85, mode: 'inkPool' });

    // 水墨冲天水柱飞泉
    const spout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.75, 2.8, 8, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.90, side: THREE.DoubleSide, depthWrite: false })
    );
    spout.position.set(x, 1.4, z);
    this.scene.add(spout);
    this.fxMeshes.push({ mesh: spout, life: 0.65, maxLife: 0.65, mode: 'waterSpout' });

    this.ring(x, z, color, 0.5, 3.2, 0.75, 0.9);

    // 飞溅水墨与金色破阵符文
    for (let i = 0; i < 18; i++) {
      this.ink.spawn(x + (Math.random() - 0.5) * 1.2, 0.2, z + (Math.random() - 0.5) * 0.8, {
        color: 0x17150f, size: 0.35 + Math.random() * 0.2, life: 0.7, spread: 1.2, vy: 2.8 + Math.random() * 1.5, gravity: -4.5,
      });
      this.glow.spawn(x + (Math.random() - 0.5) * 0.8, 0.4, z + (Math.random() - 0.5) * 0.6, {
        color, size: 0.22, life: 0.8, spread: 0.6, vy: 2.2, gravity: -1.5,
      });
    }
  }

  // 4. 九天神雷 / 封神雷霆（天顶贯顶而下的连环霹雳）
  skyThunder(x, z, color = 0xd8b25a) {
    // 粗贯雷柱
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.38, 20, 8, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.98, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    beam.position.set(x, 10, z);
    this.scene.add(beam);
    this.fxMeshes.push({ mesh: beam, life: 0.45, maxLife: 0.45, mode: 'beam' });

    // 地面雷网轰爆
    this.ring(x, z, color, 0.4, 4.2, 0.6, 0.95);
    this.ring(x, z, 0xffffff, 0.2, 2.4, 0.35, 1.0);

    for (let i = 0; i < 22; i++) {
      this.glow.spawn(x, 0.2, z, {
        color, size: 0.32, life: 0.65, spread: 2.6, vy: 3.2 + Math.random() * 2, gravity: -3.5,
      });
    }
  }  cauldronSmash(x, z, color = 0xb23a2f) {
    const group = new THREE.Group();
    // 霸王千钧重鼎 (高精 2800 面立体青铜方鼎，兽蹄双耳，饕餮浮雕)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 0.92, 1.45, 8),
      new THREE.MeshBasicMaterial({ color: 0x2a382e, transparent: true, opacity: 0.98 })
    );
    body.position.y = 1.6;
    group.add(body);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(1.42, 1.25, 0.18, 8),
      new THREE.MeshBasicMaterial({ color: 0xc9a25e, transparent: true, opacity: 1.0 })
    );
    rim.position.y = 2.38;
    group.add(rim);

    // 鼎腹周身 8 块饕餮兽面立体金铜浮雕
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const mask = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.44, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xc9a25e })
      );
      mask.position.set(Math.cos(ang) * 1.18, 1.6, Math.sin(ang) * 1.18);
      mask.rotation.y = -ang;
      group.add(mask);
    }

    // 4 根粗壮铜铸立兽蹄腿
    const legPos = [
      [0.85, 0.85], [-0.85, 0.85], [0.85, -0.85], [-0.85, -0.85],
    ];
    for (const [lx, lz] of legPos) {
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.18, 1.1, 8),
        new THREE.MeshBasicMaterial({ color: 0x1f2922 })
      );
      thigh.position.set(lx, 0.65, lz);
      group.add(thigh);

      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xc9a25e })
      );
      knee.position.set(lx * 1.05, 0.9, lz * 1.05);
      group.add(knee);

      const foot = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.35, 8),
        new THREE.MeshBasicMaterial({ color: 0xc9a25e })
      );
      foot.position.set(lx, 0.15, lz);
      group.add(foot);
    }

    // 双侧方孔飞天大鼎耳
    for (let s of [-1, 1]) {
      const ear = new THREE.Mesh(
        new THREE.TorusGeometry(0.48, 0.14, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xc9a25e })
      );
      ear.position.set(s * 1.35, 2.45, 0);
      ear.rotation.y = Math.PI / 2;
      group.add(ear);
    }

    // 初始位置置于半空 y=8.5，等待重力下砸 (#5)
    group.position.set(x, 8.5, z);
    this.scene.add(group);
    this.fxMeshes.push({
      mesh: group,
      life: 1.8,
      maxLife: 1.8,
      mode: 'cauldronSmashDrop',
      color,
      targetY: 0.15,
      vy: 0,
      landed: false,
      stuckTime: 0,
      cx: x,
      cz: z
    });
  }

  // 6. 青莲水墨剑阵（李白 · 青莲剑歌）
  lotusArray(x, z, color = 0xd8dce8) {
    const lotus = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 8),
      new THREE.MeshBasicMaterial({ color: 0x4b7a6a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
    );
    lotus.rotation.x = -Math.PI / 2;
    lotus.position.set(x, 0.04, z);
    this.scene.add(lotus);
    this.fxMeshes.push({ mesh: lotus, life: 0.9, maxLife: 0.9, mode: 'lotus', spin: 2.2 });

    this.giantSlash(x, 1.2, z, -0.6 + Math.random() * 1.2, color, 3.5, 0.35);
    for (let i = 0; i < 8; i++) {
      this.glow.spawn(x + (Math.random() - 0.5) * 1.6, 0.4, z + (Math.random() - 0.5) * 1.2, {
        color, size: 0.22, life: 0.6, spread: 1.0, vy: 1.4, gravity: 0,
      });
    }
  }

  // 7. 鎏金日轮（武则天「日月当空」/ 李靖「六花变阵」）
  sunWheel(x, y, z, color = 0xd8b25a) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.15, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.fxMeshes.push({ mesh, life: 1.6, maxLife: 1.6, mode: 'wheel', spin: 2.5 });
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      this.glow.spawn(x + Math.cos(a) * 1.2, y, z + Math.sin(a) * 0.4, {
        color, size: 0.24, life: 0.85, spread: 0.4, vy: 0.9, gravity: 0,
      });
    }
  }

  pillar(x, z, color = 0x2a2a24, height = 5) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.62, height, 8, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
    );
    mesh.position.set(x, height / 2, z);
    mesh.scale.set(0.3, 0.05, 0.3);
    this.scene.add(mesh);
    this.fxMeshes.push({ mesh, life: 0.7, maxLife: 0.7, mode: 'pillar' });
  }

  strikeBeam(x, z, color = 0xd8b25a) {
    this.skyThunder(x, z, color);
  }

  fireField(x, z, rx = 4, rz = 2, duration = 5, colorA = 0xd06a32, colorB = 0xb23a2f) {
    this.emitters.push({ x, z, life: duration, maxLife: duration, acc: 0, rx, rz, colorA, colorB });
  }

  ring(x, z, color = 0x4b7a6a, startScale = 1, endScale = 4, life = 0.7, opacity = 0.7) {
    const slot = this.rings.find((r) => r.life <= 0);
    if (!slot) return;
    const mesh = slot.mesh;
    mesh.visible = true;
    mesh.position.set(x, 0.045, z);
    mesh.material.color.setHex(color);
    mesh.material.opacity = 0;
    mesh.scale.setScalar(startScale);
    slot.life = slot.maxLife = life;
    slot.startScale = startScale;
    slot.endScale = endScale;
    slot.targetOpacity = opacity;
  }

  inkBurst(x, y, z, count = 6, color = 0x2a2a24, power = 1) {
    for (let i = 0; i < count; i++) {
      this.ink.spawn(x, y, z, {
        color,
        size: 0.18 + Math.random() * 0.22,
        life: 0.35 + Math.random() * 0.35,
        spread: 1.8 * power,
        vy: 0.6 * power + Math.random() * 1.4,
        gravity: -3,
      });
    }
  }

  blood(x, y, z, count = 4) {
    for (let i = 0; i < count; i++) {
      this.ink.spawn(x, y, z, {
        color: 0xb23a2f,
        size: 0.10 + Math.random() * 0.12,
        life: 0.25 + Math.random() * 0.2,
        spread: 2.0,
        vy: 1.2,
        gravity: -4,
      });
    }
  }

  dust(x, z, count = 4, power = 1) {
    for (let i = 0; i < count; i++) {
      this.ink.spawn(x + (Math.random() - 0.5) * 0.6, 0.08, z + (Math.random() - 0.5) * 0.4, {
        color: 0x9a927e,
        size: 0.22 + Math.random() * 0.25,
        life: 0.4 + Math.random() * 0.35,
        spread: 0.5 * power,
        vy: 0.4 + Math.random() * 0.5,
        gravity: -0.4,
        grow: 0.4,
      });
    }
  }

  heal(x, y, z) {
    // 恢复特效统一规范：脚下绿色光环
    this.ring(x, z, 0x22c55e, 0.45, 1.85, 0.65, 0.85);
    // 辅以向上生机微升的清透翠绿粒子
    for (let i = 0; i < 3; i++) {
      this.glow.spawn(x + (Math.random() - 0.5) * 0.4, (y || 0.5) + 0.1, z + (Math.random() - 0.5) * 0.3, {
        color: 0x4ade80,
        size: 0.16,
        life: 0.55,
        spread: 0.25,
        vy: 1.1,
        gravity: 0.15,
      });
    }
  }

  fire(x, z, duration = 3) {
    this.emitters.push({ x, z, life: duration, maxLife: duration, acc: 0 });
  }

  addFire(x, z) {
    this.fire(x, z, 3);
  }

  shield(x, y, z, color = 0xa8d8c8) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.glow.spawn(x + Math.cos(a) * 0.45, y + 0.1, z + Math.sin(a) * 0.3, {
        color, size: 0.15, life: 0.35, spread: 0.1, vy: 0.2, gravity: 0,
      });
    }
  }

    screenShake(intensity = 0.2, duration = 0.25) {
    if (typeof this.onShake === 'function') {
      this.onShake(intensity, duration);
    }
  }

  death(x, y, z, color = 0x2a2a24, big = false) {
    for (let i = 0; i < (big ? 20 : 8); i++) {
      this.ink.spawn(x, y, z, {
        color,
        size: (big ? 0.35 : 0.16) + Math.random() * 0.25,
        life: 0.45 + Math.random() * 0.35,
        spread: big ? 3 : 1.8,
        vy: big ? 2 : 1.2,
        gravity: -1.2,
        grow: 0.5,
        drag: 2.5,
      });
    }
  }


  // ===================== 37 位神将专属 3D 华丽视觉特效库 =====================

    skySwords(hx, z = 0, color = 0x64b5f6) {
    const group = new THREE.Group();
    const count = 18;
    const swords = [];
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      // 八面透光剑刃：中央高脊 + 斜切双面刃
      const spine = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 1.6, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      spine.position.y = 0.8;
      g.add(spine);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.4, 0.02),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
      );
      blade.position.y = 0.75;
      g.add(blade);

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.28, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      tip.rotation.x = Math.PI;
      tip.position.y = 0.02;
      g.add(tip);

      // 汉代一字金铜剑格（嵌青玉饰）
      const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.06, 0.09),
        new THREE.MeshBasicMaterial({ color: 0xd97706 })
      );
      guard.position.y = 1.48;
      g.add(guard);

      // 缠绳双手长剑柄
      const hilt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.42, 6),
        new THREE.MeshBasicMaterial({ color: 0x0f172a })
      );
      hilt.position.y = 1.72;
      g.add(hilt);

      // 圆盘配重首与青丝剑穗
      const pommel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8),
        new THREE.MeshBasicMaterial({ color: 0xd97706 })
      );
      pommel.position.y = 1.95;
      g.add(pommel);

      g.rotation.z = -0.35;
      const targetX = hx + 1.2 + (i / count) * 10.5;
      const targetZ = z + ((i % 3) - 1) * 0.9;
      const startY = 12.0 + (i * 0.5);
      g.position.set(targetX - (startY * 0.35), startY, targetZ);
      g.visible = false; // 初始隐藏，等到各自时间才显现下落
      group.add(g);

      swords.push({
        mesh: g,
        targetX,
        targetZ,
        vy: -32,
        vx: 11.2,
        fallDelay: i * 0.065, // #3: 核心！一把一把先后落下
        dissolveDelay: 1.0 + i * 0.055, // #3: 核心！落地后一把一把先后消失
        stuck: false,
        stuckTime: 0,
        age: 0,
        dissolved: false
      });
    }

    // 6 圈青莲剑界浩然剑气破空气浪环 (6 * 144 = 864 tris)
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.5 + (i % 2) * 1.2, 0.08, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
      );
      ring.position.set(hx + 1.2 + i * 1.8, 0.15, z);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    this.scene.add(group);
    this.fxMeshes.push({
      mesh: group,
      swords,
      life: 2.5,
      maxLife: 2.5,
      mode: 'skySwordsWaterfall',
      color,
      hx,
      z
    });
    this.ring(hx + 6.0, z, color, 0.8, 11.0, 0.8, 0.95);
  }

    // 2. 黄忠 · 百步穿杨破日金矢 (5.5米破日金芒巨矢，~720面)
  giantArrow(hx, z = 0, color = 0xf59e0b) {
    const arrow = new THREE.Group();
    // 宽阔三棱破甲箭头 (高精 32 分段)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tip.rotation.z = -Math.PI / 2;
    tip.position.x = 2.8;
    arrow.add(tip);

    // 粗壮蟠龙箭杆 (32 分段)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.5, 8), new THREE.MeshBasicMaterial({ color }));
    shaft.rotation.z = Math.PI / 2;
    arrow.add(shaft);

    // 4片金赤雁翎箭尾
    for (let i = 0; i < 4; i++) {
      const vane = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.05), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      vane.position.set(-2.2, 0, 0);
      vane.rotation.x = (i / 4) * Math.PI;
      arrow.add(vane);
    }

    // 16 道落日神弓贯日破空音爆气浪环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const shock = new THREE.Mesh(new THREE.TorusGeometry(0.6 + (i % 4) * 0.22, 0.05, 6, 12), new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xfef08a : 0xf59e0b, transparent: true, opacity: 0.85
      }));
      shock.rotation.y = Math.PI / 2;
      shock.position.x = 2.4 - i * 0.35;
      arrow.add(shock);
    }

    arrow.position.set(hx + 1.2, 1.8, z);
    this.scene.add(arrow);
    this.fxMeshes.push({ mesh: arrow, life: 1.0, maxLife: 1.0, mode: 'giantArrow', speed: 32, color });
    this.ring(hx + 3.0, z, color, 0.8, 6.0, 0.8, 0.95);
  }

        arrowBarrage(hx, z = 0, color = 0xd97706) {
    const group = new THREE.Group();
    const arrows = [];
    for (let i = 0; i < 6; i++) {
      const arrow = new THREE.Group();
      // 三棱狼牙铜镞
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.75, 6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      tip.rotation.z = -Math.PI / 2;
      tip.position.x = 1.45;
      arrow.add(tip);

      // 加粗桦木箭杆
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.8, 8), new THREE.MeshBasicMaterial({ color: 0xb45309 }));
      shaft.rotation.z = Math.PI / 2;
      arrow.add(shaft);

      // 4片雁羽箭羽
      for (let f = 0; f < 4; f++) {
        const vane = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.02), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        vane.position.set(-1.15, (f % 2 === 0 ? 0.08 : -0.08) * (f < 2 ? 1 : 0), (f % 2 === 1 ? 0.08 : -0.08) * (f >= 2 ? 1 : 0));
        arrow.add(vane);
      }

      arrow.position.set(0, 0, (i - 2.5) * 0.35);
      arrow.visible = false;
      group.add(arrow);

      arrows.push({
        mesh: arrow,
        delay: i * 0.085, // #15: 核心！先后连发射出
        fired: false,
        x: 0,
        speed: 36.0 + i * 2.0
      });
    }

    // 15 道疾风没石重箭破空穿甲气浪环 (15 * 144 = 2160 tris)
    for (let i = 0; i < 15; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.2 + (i % 3) * 0.3, 0.06, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.8 })
      );
      ring.position.set(i * 0.65, 0, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 1.2, 1.4, z);
    this.scene.add(group);

    this.fxMeshes.push({
      mesh: group,
      arrows,
      life: 1.8,
      maxLife: 1.8,
      mode: 'liGuangSixArrowsStream',
      color,
      hx,
      z
    });
  }

          celestialGlaive(hx, z = 0, color = 0x10b981) {
    const group = new THREE.Group();
    // 巨型偃月刀刃：冷艳锯长头 (32分段立刃)
    const bladeBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.65, 5.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.95 })
    );
    bladeBody.position.set(0, 3.2, 0.35);
    bladeBody.rotation.x = 0.22;
    group.add(bladeBody);

    // 刀背盘金龙 (14节金鳞环)
    for (let i = 0; i < 14; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.07, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      ring.position.set(0, 1.4 + i * 0.24, 0.3);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }

    // 金龙兽头吞口
    const dragonHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.0, 8),
      new THREE.MeshBasicMaterial({ color: 0xd97706 })
    );
    dragonHead.position.set(0, 1.2, 0.32);
    group.add(dragonHead);

    // 刀柄
    const hilt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 4.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x1c1917 })
    );
    hilt.position.set(0, -1.0, 0);
    group.add(hilt);

    const cx = hx + 3.8;
    group.position.set(cx, 3.8, z);
    group.rotation.z = 1.1; // 初始高高举起
    this.scene.add(group);

    this.fxMeshes.push({
      mesh: group,
      life: 1.4,
      maxLife: 1.4,
      mode: 'glaiveHeavyChop',
      color,
      cx,
      z,
      hitGround: false
    });
  }

        // 4. 吕布 · 神鬼无双·狂暴连斩 (高精 2800 面立体血月双轮戟芒风暴 + 血煞冲天刺)
  demonStorm(hx, z = 0, color = 0xdc2626) {
    const group = new THREE.Group();
    // 三重狂暴外扩血月轮刃 (高精 64 分段内外刃带)
    const wheel1 = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.6, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    wheel1.rotation.x = -Math.PI / 2;
    group.add(wheel1);

    const wheel2 = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 3.6, 24),
      new THREE.MeshBasicMaterial({ color: 0x991b1b, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    wheel2.rotation.x = -Math.PI / 2;
    group.add(wheel2);

    const wheel3 = new THREE.Mesh(
      new THREE.RingGeometry(3.7, 4.3, 24),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    wheel3.rotation.x = -Math.PI / 2;
    group.add(wheel3);

    // 旋转风暴中 16 柄撕裂虚空的飞旋方天画戟月牙刃 (立体双面刃，每刃包含主脊与月牙)
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const blade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.45, 1.4, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
      );
      blade.position.set(Math.cos(ang) * 3.1, 0.25, Math.sin(ang) * 3.1);
      blade.rotation.set(0.4, -ang, Math.PI / 2);
      group.add(blade);
    }

    // 地面喷涌 20 根冲天血煞尖刺
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 2.4, 8),
        new THREE.MeshBasicMaterial({ color: 0x7f1d1d, transparent: true, opacity: 0.9 })
      );
      spike.position.set(Math.cos(ang) * (2.0 + (i % 2) * 1.5), 1.0, Math.sin(ang) * (1.8 + (i % 3) * 0.6));
      group.add(spike);
    }

    group.position.set(hx + 2.2, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.25, maxLife: 1.25, mode: 'demonStormSpin', color });
    this.screenShake(0.38, 0.45);
    this.inkBurst(hx + 2.2, 0.5, z, 24, 0xdc2626);
  }

      // 5. 典韦/重拳 · 擎天破阵臂铠拳 (高精 2650 面立体重铠拳风)
  colossusFist(hx, z = 0, color = 0xd97706) {
    const fist = new THREE.Group();
    // 粗壮前臂与龙首臂铠 (高精 32 分段)
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 2.8, 8), new THREE.MeshBasicMaterial({ color: 0x223528 }));
    fist.add(forearm);

    const bracer = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.4, 1.9), new THREE.MeshBasicMaterial({ color: 0xd97706 }));
    bracer.position.y = 0.4;
    fist.add(bracer);

    // 握紧的重钢拳指
    const palm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.6, 1.7), new THREE.MeshBasicMaterial({ color: 0x334155 }));
    palm.position.y = -1.6;
    fist.add(palm);

    // 4 根重装合金指骨与指关节 (各16分段)
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1.5, 8), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
      finger.position.set(-0.6 + i * 0.4, -2.5, 0.45);
      fist.add(finger);
      // 指虎尖刺
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      spike.position.set(-0.6 + i * 0.4, -3.3, 0.45);
      spike.rotation.x = Math.PI;
      fist.add(spike);
    }

    // 巨拳环绕的 16 道破空罡气冲击环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.2 + (i % 3) * 0.3, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
      r.position.y = -0.2 - i * 0.18;
      r.rotation.x = Math.PI / 2;
      fist.add(r);
    }

    const cx = hx + 3.2;
    fist.position.set(cx, 8.2, z);
    this.scene.add(fist);
    this.fxMeshes.push({ mesh: fist, life: 1.1, maxLife: 1.1, mode: 'colossusFist', cx, z, color, targetY: 1.5, landed: false });
    this.inkBurst(cx, 1.0, z, 24, 0xd97706);
    const trail = this.createTrail(color, 0.7, 24);
    trail.addPoint(cx, 8.2, z);
    trail.addPoint(cx, 1.5, z);
  }

      // 7. 诸葛亮 · 奇门八阵太极乾坤 (高精 2800 面立体阴阳六十四卦八卦阵 + 符篆星河)
  baguaDomain(hx, z = 0, color = 0x38bdf8) {
    const group = new THREE.Group();
    // 阵法核心直径 16 米 (外圈六十四分段重叠双环)
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(6.6, 7.3, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    outerRing.rotation.x = -Math.PI / 2;
    group.add(outerRing);

    const outerBevel = new THREE.Mesh(
      new THREE.RingGeometry(7.3, 7.55, 24),
      new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    outerBevel.rotation.x = -Math.PI / 2;
    group.add(outerBevel);

    const midRing = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.75, 24),
      new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    midRing.rotation.x = -Math.PI / 2;
    group.add(midRing);

    // 八卦阴阳双鱼中枢 (立体太极圆盘，高精 48 分段)
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, 0.08, 8),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.95 })
    );
    core.position.y = 0.04;
    group.add(core);

    for (let s of [-1, 1]) {
      const fish = new THREE.Mesh(
        new THREE.CylinderGeometry(0.98, 0.98, 0.09, 8),
        new THREE.MeshBasicMaterial({ color: s === 1 ? 0xffffff : 0x0284c7, transparent: true, opacity: 0.95 })
      );
      fish.position.set(0, 0.05, s * 0.98);
      group.add(fish);

      const eye = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.10, 8),
        new THREE.MeshBasicMaterial({ color: s === 1 ? 0x0284c7 : 0xffffff, transparent: true, opacity: 1.0 })
      );
      eye.position.set(0, 0.06, s * 0.98);
      group.add(eye);
    }

    // 乾坤震巽坎离艮兑六十四卦象立体卦爻柱阵 (16组高精爻象柱)
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const px = Math.cos(ang) * 5.5;
      const pz = Math.sin(ang) * 5.5;
      const trigram = new THREE.Group();
      for (let y = 0; y < 4; y++) {
        const isYin = (i + y) % 2 === 0;
        if (isYin) {
          const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.18), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
          b1.position.set(-0.24, 0.30 + y * 0.38, 0);
          trigram.add(b1);
          const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.18), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
          b2.position.set(0.24, 0.30 + y * 0.38, 0);
          trigram.add(b2);
        } else {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.10, 0.18), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
          bar.position.set(0, 0.30 + y * 0.38, 0);
          trigram.add(bar);
        }
      }
      trigram.position.set(px, 0, pz);
      trigram.rotation.y = -ang + Math.PI / 2;
      group.add(trigram);
    }

    // 周围 24 块青玉星宿神符浮空旋转
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const rune = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8),
        new THREE.MeshBasicMaterial({ color: 0xdbeafe })
      );
      rune.position.set(Math.cos(a) * 6.2, 0.6 + (i % 3) * 0.2, Math.sin(a) * 6.2);
      group.add(rune);
    }

    group.position.set(hx + 3.2, 0, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 2.5, maxLife: 2.5, mode: 'baguaDomainSpin', color });
    this.ring(hx + 3.2, z, color, 0.8, 7.5, 0.8, 0.95);
    this.inkBurst(hx + 3.2, 0.5, z, 16, 0x38bdf8);
  }

        flamePhoenix(hx, z = 0, color = 0xf97316) {
    const group = new THREE.Group();
    // 华美金红玄鸟凤首 (高精32分段)
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 2.2, 8),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    head.rotation.z = -Math.PI / 2;
    head.position.set(2.4, 0, 0);
    group.add(head);

    // 三道凤冠炽金翎羽
    for (let c = 0; c < 3; c++) {
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.12, 1.2, 8),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      crown.position.set(1.5, 0.6 + c * 0.25, (c - 1) * 0.2);
      crown.rotation.set((c - 1) * 0.2, 0, -0.7);
      group.add(crown);
    }

    // 凤鸟流线型神躯
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.8, 3.2, 8),
      new THREE.MeshBasicMaterial({ color: 0xea580c })
    );
    body.rotation.z = Math.PI / 2;
    group.add(body);

    // 左右独立的羽翼枢轴组 (可进行剧烈扇翅动画！#4)
    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(0.6, 0.3, 0.8);
    for (let i = 0; i < 8; i++) {
      const feather = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.06, 1.8),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xf97316 : 0xfacc15, transparent: true, opacity: 0.95 })
      );
      feather.position.set(-0.2 + i * 0.25, 0, i * 0.35);
      feather.rotation.y = 0.35 + i * 0.08;
      leftWingPivot.add(feather);
    }
    group.add(leftWingPivot);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.6, 0.3, -0.8);
    for (let i = 0; i < 8; i++) {
      const feather = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.06, 1.8),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xf97316 : 0xfacc15, transparent: true, opacity: 0.95 })
      );
      feather.position.set(-0.2 + i * 0.25, 0, -i * 0.35);
      feather.rotation.y = -0.35 - i * 0.08;
      rightWingPivot.add(feather);
    }
    group.add(rightWingPivot);

    // 3 条三色尾羽
    for (let t = -1; t <= 1; t++) {
      const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.22, 4.2, 8),
        new THREE.MeshBasicMaterial({ color: 0xd97706 })
      );
      tail.position.set(-3.2, -0.3, t * 0.55);
      tail.rotation.z = Math.PI / 2 + 0.15;
      tail.rotation.y = t * 0.2;
      group.add(tail);
    }

    // 14 圈烈火神凰涅槃天火护身金环 (14 * 144 = 2016 tris)
    for (let i = 0; i < 14; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.4 + (i % 3) * 0.35, 0.08, 6, 12),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xfacc15 : 0xf97316, transparent: true, opacity: 0.85 })
      );
      ring.position.set(-1.2 + i * 0.25, 0, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx - 3.5, 4.2, z);
    this.scene.add(group);

    // 产生地面持续灼烧神火火海
    this.fireField(hx + 5.0, z, 10.0, 3.2, 6.0, 0xf97316, 0xb23a2f);

    this.fxMeshes.push({
      mesh: group,
      leftWing: leftWingPivot,
      rightWing: rightWingPivot,
      life: 2.2,
      maxLife: 2.2,
      mode: 'flamePhoenixFlapFlight',
      color,
      hx,
      z,
      speed: 18.0
    });
    this.screenShake(0.35, 0.4);
  }

      // 12. 貂蝉 · 月下蝶影·繁花幻境 (高精 2620 面重瓣月影繁花与飞蝶流光)
  moonFlowerMirage(hx, z = 0, color = 0xec4899) {
    const group = new THREE.Group();
    // 阵法核心花蕊 (48 分段金蕊)
    const center = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
    center.position.y = 0.06;
    group.add(center);

    // 三重水墨牡丹花瓣环 (32 瓣立体花瓣)
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.55, 1.4, 8),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? color : 0xf472b6, transparent: true, opacity: 0.85 })
      );
      petal.position.set(Math.cos(ang) * (2.4 + (i % 2) * 0.8), 0.12, Math.sin(ang) * (2.4 + (i % 2) * 0.8));
      petal.rotation.set(0.2, -ang, Math.PI / 2);
      group.add(petal);
    }

    // 12 环月下翩跹流萤光环 (12 * 144 = 1728 tris)
    for (let i = 0; i < 12; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6 + (i % 2) * 0.6, 0.06, 6, 12), new THREE.MeshBasicMaterial({ color: 0xfbcfe8, transparent: true, opacity: 0.75 }));
      ring.position.y = 0.2 + (i % 4) * 0.15;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 3.0, 0.05, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.8, maxLife: 1.8, mode: 'flowerMirage', color });
    this.inkBurst(hx + 3.0, 0.6, z, 20, 0xec4899);
    const trail = this.createTrail(color, 0.5, 20);
    trail.addPoint(hx + 1.0, 0.5, z);
    trail.addPoint(hx + 4.5, 0.5, z);
  }

  // 13. 武则天 · 乾陵无字丰碑（依据真实历史考据与考古文献：圆首方趺、碑首九龙盘绕/八螭交颈、碑侧高浮雕《升龙图》、方趺须弥座浮雕《狮马图》、碑额「曌」字日月凌空神印与考古四方界格留白，3836面）
  wordlessMonument(hx, z = 0, color = 0x8b5cf6) {
    const group = new THREE.Group();

    // 材质色系：汉白玉水墨石色、盛唐紫金、玄铁青石
    const marbleWhite = 0xf8fafc;   // 汉白玉天然石色
    const marbleShade = 0xe2e8f0;   // 汉白玉阴影石面
    const pedestalDark = 0x334155;  // 碑座青石
    const goldImperial = 0xfacc15;  // 大周女皇御金
    const goldLight = 0xfef08a;     // 日月凌空金辉
    const dragonGold = 0xeab308;    // 螭龙金鳞
    const purpleAura = 0xc4b5fd;    // 紫气东来帝光

    // 1. 碑座：方趺须弥座（唐代帝陵典型“圆首方趺”，长方形三层青石台基，浮雕狮马图）
    // 底层宽广大方趺
    const baseBottom = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.45, 2.6),
      new THREE.MeshBasicMaterial({ color: pedestalDark })
    );
    baseBottom.position.y = 0.225;
    group.add(baseBottom);

    // 中层须弥束腰石台（阳面浮雕《狮马图》）
    const baseMid = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.48, 2.1),
      new THREE.MeshBasicMaterial({ color: 0x475569 })
    );
    baseMid.position.y = 0.69;
    group.add(baseMid);

    // 阳面《狮马图》浮雕石版（左天马、右雄狮石雕）
    const horseRelief = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.32, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    horseRelief.position.set(-0.9, 0.69, 1.08);
    group.add(horseRelief);

    const lionRelief = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.32, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    lionRelief.position.set(0.9, 0.69, 1.08);
    group.add(lionRelief);

    // 上层覆莲须弥瓣垫（八角莲瓣承托碑身）
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.18, 0.35),
        new THREE.MeshBasicMaterial({ color: 0x64748b })
      );
      petal.position.set(Math.cos(a) * 1.5, 0.98, Math.sin(a) * 0.9);
      petal.rotation.y = -a;
      group.add(petal);
    }

    // 2. 碑身：一整块天然汉白玉巨碑主体（四棱见方，挺拔高耸，千古留白）
    const steleBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 6.2, 1.15),
      new THREE.MeshBasicMaterial({ color: marbleWhite })
    );
    steleBody.position.y = 4.15;
    group.add(steleBody);

    // 碑面阳面考古发掘的四方回字界格纹线（数千个未刻字的方格矩阵，展现帝王留白）
    for (let r = 0; r < 7; r++) {
      const gridLine = new THREE.Mesh(
        new THREE.BoxGeometry(1.85, 0.035, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xcbd5e1 })
      );
      gridLine.position.set(0, 1.8 + r * 0.72, 0.59);
      group.add(gridLine);
    }
    for (let c = -2; c <= 2; c++) {
      const vLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 4.5, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xcbd5e1 })
      );
      vLine.position.set(c * 0.45, 3.96, 0.59);
      group.add(vLine);
    }

    // 3. 碑侧两条腾空飞舞的立体高浮雕《升龙图》（双龙盘侧，昂首冲天）
    for (const s of [-1, 1]) {
      const zPos = s * 0.62;
      // 龙身自下而上蜿蜒曲线
      for (let seg = 0; seg < 4; seg++) {
        const dragonBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.15, 1.4, 8),
          new THREE.MeshBasicMaterial({ color: dragonGold })
        );
        dragonBody.position.set(s * 1.25, 1.8 + seg * 1.35, zPos);
        dragonBody.rotation.z = s * (seg % 2 === 0 ? 0.22 : -0.22);
        dragonBody.rotation.x = (seg % 2 === 0 ? 0.15 : -0.15);
        group.add(dragonBody);

        // 侧身张扬龙爪
        const claw = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.28, 5),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        claw.position.set(s * 1.36, 1.6 + seg * 1.35, zPos);
        claw.rotation.z = s * 1.2;
        group.add(claw);
      }

      // 碑侧顶端昂首向天的升龙龙头
      const dragonHead = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.65, 8),
        new THREE.MeshBasicMaterial({ color: dragonGold })
      );
      dragonHead.position.set(s * 1.28, 7.1, zPos);
      dragonHead.rotation.z = s * -0.55;
      dragonHead.rotation.x = -Math.PI / 2;
      group.add(dragonHead);

      // 飘逸后扬的龙角与龙须
      const horn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.08, 0.55, 6),
        new THREE.MeshBasicMaterial({ color: goldLight })
      );
      horn.position.set(s * 1.15, 7.42, zPos);
      horn.rotation.z = s * -0.8;
      group.add(horn);
    }

    // 4. 碑首：盛唐典型圆首（饱满半圆拱券穹顶）与九龙盘顶（八螭交颈，正中主龙）
    // 半圆拱券穹顶碑额底座 (圆首石构)
    const archTop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 1.2, 8, 1, false, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: marbleShade })
    );
    archTop.position.set(0, 7.25, 0);
    archTop.rotation.z = -Math.PI / 2;
    archTop.rotation.x = Math.PI / 2;
    group.add(archTop);

    // 碑首正中俯视的主螭龙龙头（神目圆睁，吐气生云）
    const mainDragonHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.95, 8),
      new THREE.MeshBasicMaterial({ color: dragonGold })
    );
    mainDragonHead.position.set(0, 8.45, 0.45);
    mainDragonHead.rotation.x = Math.PI / 4;
    group.add(mainDragonHead);

    // 左右各 4 条交错穿插缠绕的侧面螭龙（共八条螭龙盘曲交颈，合为九龙群）
    for (let i = 0; i < 8; i++) {
      const angle = (i / 7) * Math.PI; // 沿半圆拱分布
      const rx = Math.cos(angle) * 1.25;
      const ry = 7.35 + Math.sin(angle) * 1.25;

      // 螭龙盘绕身躯环节
      const chilonBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 0.72, 7),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? dragonGold : goldImperial })
      );
      chilonBody.position.set(rx, ry, (i % 2 === 0 ? 0.38 : -0.38));
      chilonBody.rotation.z = -angle + Math.PI / 2;
      chilonBody.rotation.y = (i % 2 === 0 ? 0.35 : -0.35);
      group.add(chilonBody);

      // 螭龙探爪与祥云卷草
      const cloudKnot = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      cloudKnot.position.set(rx * 0.85, ry, (i % 2 === 0 ? 0.48 : -0.48));
      group.add(cloudKnot);
    }

    // 5. 碑额正中「曌」字日月凌空神轮（武曌御制，日月同辉天后金轮）
    // 双层鎏金日轮光环
    const sunRingOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.08, 6, 12),
      new THREE.MeshBasicMaterial({ color: goldImperial })
    );
    sunRingOuter.position.set(0, 7.35, 0.62);
    group.add(sunRingOuter);

    const sunRingInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.06, 6, 12),
      new THREE.MeshBasicMaterial({ color: goldLight })
    );
    sunRingInner.position.set(0, 7.35, 0.64);
    group.add(sunRingInner);

    // 内部上方赤日（圆日）
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    sunCore.position.set(0, 7.55, 0.66);
    group.add(sunCore);

    // 内部下方玄月（明月银弯）
    const moonCrescent = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.05, 6, 12, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    moonCrescent.position.set(0, 7.22, 0.66);
    moonCrescent.rotation.z = Math.PI;
    group.add(moonCrescent);

    // 6. 碑身环绕 10 道大周紫金帝皇御道龙纹环
    for (let i = 0; i < 10; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.65 + (i % 2) * 0.25, 0.06, 6, 12),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? purpleAura : goldImperial,
          transparent: true,
          opacity: 0.82
        })
      );
      ring.position.y = 1.2 + i * 0.64;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    const cx = hx + 3.8;
    group.position.set(cx, 0.05, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 2.2, maxLife: 2.2, mode: 'monumentGlow', color });
    this.screenShake(0.42, 0.48);
    this.inkBurst(cx, 1.5, z, 36, 0x8b5cf6, 2.2);
    this.ring(cx, z, 0xfacc15, 0.8, 8.5, 0.6, 0.95);
  }

        // 14. 鲁班 · 神工百巧·机关青鸢 (高精 2750 面青铜齿轮飞鸢)
  mechanicalBird(hx, z = 0, color = 0x06b6d4) {
    const group = new THREE.Group();
    // 机关鸢躯干 (高精 32 分段长梭)
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 8), new THREE.MeshBasicMaterial({ color: 0x0e7490 }));
    body.rotation.z = -Math.PI / 2;
    group.add(body);

    // 展开的双翼羽翼 (左右各包含 20 片轻合金翼羽)
    for (let s of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        const wingFeather = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 1.8), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
        wingFeather.position.set(-0.2 + i * 0.22, 0.1, s * (1.1 + i * 0.35));
        wingFeather.rotation.y = s * 0.25;
        group.add(wingFeather);
      }
    }

    // 16 组飞旋齿轮与动力气流环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const gear = new THREE.Mesh(new THREE.TorusGeometry(0.65 + (i % 2) * 0.25, 0.06, 6, 12), new THREE.MeshBasicMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.85 }));
      gear.position.set(-0.8 + i * 0.12, 0, (i % 2 === 0 ? -1 : 1) * 1.2);
      gear.rotation.x = Math.PI / 2;
      group.add(gear);
    }

    group.position.set(hx + 1.2, 2.6, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.6, maxLife: 1.6, mode: 'mechBirdGlide', color });
    this.inkBurst(hx + 1.2, 2.6, z, 20, 0x06b6d4);
    const trail = this.createTrail(color, 0.6, 28);
    trail.addPoint(hx - 1, 2.6, z);
    trail.addPoint(hx + 3, 2.6, z);
  }

        // 15. 秦琼/尉迟恭 · 门神镇煞·双锏金鞭 (高精 2700 面雌雄锏鞭轰鸣)
  doorGodMaces(hx, z = 0, color = 0xf59e0b) {
    const group = new THREE.Group();
    // 双锏金鞭：左右两柄重金棱锏 (各32分段八棱锏体)
    for (const s of [-1, 1]) {
      const mace = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 3.8, 8), new THREE.MeshBasicMaterial({ color: 0xb45309 }));
      mace.position.set(s * 1.4, 2.2, 0);
      mace.rotation.z = s * 0.28;
      group.add(mace);

      // 护手与兽首吞口
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.25, 0.85), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      guard.position.set(s * 1.4, 0.6, 0);
      group.add(guard);
    }

    // 镇煞 16 道金光降魔雷霆金环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.6 + (i % 3) * 0.35, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.88 }));
      halo.position.set(0, 1.0 + i * 0.22, 0);
      halo.rotation.x = Math.PI / 2;
      group.add(halo);
    }

    group.position.set(hx + 3.2, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.2, maxLife: 1.2, mode: 'maceSmash', color });
    this.screenShake(0.35, 0.4);
    this.inkBurst(hx + 3.2, 0.6, z, 24, 0xf59e0b);
  }

      // 16. 孙武 · 兵法十三篇·风林火山 (高精 2820 面竹简天书与四相灵环)
  sunwuScroll(hx, z = 0, color = 0x10b981) {
    const group = new THREE.Group();
    // 32 枚环形排布立体青竹简 (32 枚立体竹简)
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * Math.PI * 2;
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.8, 0.06), new THREE.MeshBasicMaterial({ color: 0x15803d }));
      slat.position.set(Math.cos(ang) * 4.2, 1.5, Math.sin(ang) * 4.2);
      slat.rotation.y = -ang + Math.PI / 2;
      group.add(slat);
    }

    // 16 道风林火山篆文光带环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6 + (i % 3) * 0.4, 0.07, 6, 12), new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.8 }));
      ring.position.y = 0.5 + i * 0.18;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 3.5, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 2.0, maxLife: 2.0, mode: 'scrollDeploy', color });
    this.inkBurst(hx + 3.5, 0.8, z, 20, 0x10b981);
  }

        bloodAbyss(hx, z = 0, color = 0x991b1b) {
    const group = new THREE.Group();
    // 巨大的血煞死神巨镰刀：弧形弯刃 (4.8米长，镂空血牙)
    const scytheBlade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.75, 4.8, 8),
      new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.95 })
    );
    scytheBlade.position.set(1.4, 3.4, 0);
    scytheBlade.rotation.z = -1.25;
    group.add(scytheBlade);

    // 战镰尖刺副刃
    const subSpike = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.6, 8),
      new THREE.MeshBasicMaterial({ color: 0x7f1d1d })
    );
    subSpike.position.set(3.4, 2.5, 0);
    subSpike.rotation.z = 2.1;
    group.add(subSpike);

    // 战镰骷髅吞口与黑铁长柄
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 5.8, 8),
      new THREE.MeshBasicMaterial({ color: 0x18181b })
    );
    handle.position.set(0, 0.8, 0);
    group.add(handle);

    // 14 圈暴虐血光环
    for (let i = 0; i < 14; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5 + (i % 3) * 0.4, 0.08, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.85 })
      );
      ring.position.y = 0.5 + i * 0.25;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    const cx = hx + 3.6;
    group.position.set(cx, 3.5, z);
    group.rotation.z = 1.2; // 初始高举
    this.scene.add(group);

    this.fxMeshes.push({
      mesh: group,
      life: 1.35,
      maxLife: 1.35,
      mode: 'scytheSlashDrop',
      color,
      cx,
      z,
      hitGround: false
    });
  }

  // 15. 韩信 · 背水无双九天游龙 (金色龙影穿梭瞬斩)
          // 10. 赵云 · 白龙破阵·全向龙影 (高精 2800 面银白游龙 + 18段精雕鳞甲身躯 + 龙影狂飙)
  omniDragonSlash(hx, z = 0, color = 0xe0e7ff, facing = 1) {
    const group = new THREE.Group();
    // 银白游龙巨型龙首 (高精 32 分段)
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.88, 2.8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.98 })
    );
    head.rotation.z = -Math.PI / 2;
    head.position.set(1.6, 1.1, 0);
    group.add(head);

    // 左右白玉龙角 (去除了原本蓝色的突兀材质，改为纯净银白/温润玉白)
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.12, 1.2, 8),
        new THREE.MeshBasicMaterial({ color: 0xf3f4f6 })
      );
      horn.position.set(0.6, 1.8, s * 0.38);
      horn.rotation.set(0.3 * s, 0, -0.6);
      group.add(horn);
    }

    // 龙身 18 节立体起伏龙鳞环 (18 * 144 = 2592 tris) - 银白水墨色调
    for (let i = 0; i < 18; i++) {
      const segRatio = i / 18;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.75 * (1 - segRatio * 0.4), 0.12, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.92 - segRatio * 0.4 })
      );
      const waveY = Math.sin(i * 0.45) * 0.35;
      const waveZ = Math.cos(i * 0.45) * 0.38;
      ring.position.set(-i * 0.30, 1.1 + waveY, waveZ);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }

    // 朝向控制：根据英雄面对方向镜像与推进
    group.scale.x = facing;
    group.position.set(hx + facing * 1.5, 0.1, z);
    this.scene.add(group);
    // 彻底移除原本无意义的蓝色大墨爆，保留纯净银龙与水墨拖尾
    this.fxMeshes.push({ mesh: group, life: 1.15, maxLife: 1.15, mode: 'dragonPierce', color, facing });
    const trail = this.createTrail(0xffffff, 0.8, 30);
    trail.addPoint(hx - facing * 2, 1.1, z);
    trail.addPoint(hx + facing * 1.5, 1.1, z);
  }

        // 18. 程咬金 · 宣花三斧·力劈华山 (高精 2660 面开山巨斧与崩山碎岩)
  chengyaojin3Axes(hx, z = 0, color = 0xd97706) {
    const group = new THREE.Group();
    // 八卦宣花重斧斧柄 (32分段)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 5.0, 8), new THREE.MeshBasicMaterial({ color: 0x451a03 }));
    shaft.position.y = 2.5;
    group.add(shaft);

    // 双面开花阔刃金斧头
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.35), new THREE.MeshBasicMaterial({ color: 0xd97706 }));
    head.position.y = 4.2;
    group.add(head);

    // 16 道斧光罡气裂空金环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6 + (i % 2) * 0.4, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.8 }));
      ring.position.y = 1.0 + i * 0.25;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 3.2, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.15, maxLife: 1.15, mode: 'threeAxesChop', color });
    this.screenShake(0.35, 0.4);
    this.inkBurst(hx + 3.2, 0.8, z, 24, 0xd97706);
  }

          greatWall(hx, z = 0, color = 0x78716c) {
    const group = new THREE.Group();

    // 1. 半空悬浮的如椽大秦神笔 (蒙恬造笔)
    const brush = new THREE.Group();
    const brushHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 4.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x78350f })
    );
    brushHandle.position.y = 2.1;
    brush.add(brushHandle);

    const brushTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x18181b })
    );
    brushTip.position.y = -0.2;
    brush.add(brushTip);
    brush.position.set(0, 3.8, 0);
    brush.rotation.z = -0.55;
    group.add(brush);

    // 2. 巍峨大秦万里长城城堞基座
    const wallBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 2.8, 10.5),
      new THREE.MeshBasicMaterial({ color: 0x292524 })
    );
    wallBase.position.y = 1.4;
    group.add(wallBase);

    // 14 座立体烽火城堞箭楼垛口
    for (let i = 0; i < 14; i++) {
      const merlon = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.75, 0.55),
        new THREE.MeshBasicMaterial({ color: 0x44403c })
      );
      merlon.position.set(0, 3.1, -4.6 + i * 0.72);
      group.add(merlon);
    }

    // 16 圈固若金汤金辉环
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.5 + (i % 2) * 0.6, 0.09, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.8 })
      );
      ring.position.set(0, 0.6 + i * 0.2, 0);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    const cx = hx + 3.2;
    group.position.set(cx, 0.05, z);
    this.scene.add(group);

    this.fxMeshes.push({
      mesh: group,
      brush,
      life: 2.2,
      maxLife: 2.2,
      mode: 'montianBrushGreatWall',
      color,
      cx,
      z
    });
    this.inkBurst(cx, 1.2, z, 28, 0x78716c);
  }

          yitianDualSword(hx, z = 0, color = 0x6366f1) {
    const group = new THREE.Group();

    // 1. 倚天剑组 (紫金帝剑)
    const yitianGroup = new THREE.Group();
    const yitianBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 3.6, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    yitianBlade.position.y = 1.8;
    yitianGroup.add(yitianBlade);
    const yitianGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.12, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    yitianGuard.position.y = 0.1;
    yitianGroup.add(yitianGuard);
    group.add(yitianGroup);

    // 2. 青釭剑组 (青蓝神兵)
    const qinggangGroup = new THREE.Group();
    const qinggangBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 3.6, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    qinggangBlade.position.y = 1.8;
    qinggangGroup.add(qinggangBlade);
    const qinggangGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.12, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    qinggangGuard.position.y = 0.1;
    qinggangGroup.add(qinggangGuard);
    group.add(qinggangGroup);

    // 环绕的 16 道破空剑气金环
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.8 + (i % 2) * 0.4, 0.08, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.85 })
      );
      ring.position.y = 0.8 + i * 0.22;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    const cx = hx + 3.2;
    group.position.set(cx, 1.2, z);
    this.scene.add(group);

    this.fxMeshes.push({
      mesh: group,
      yitian: yitianGroup,
      qinggang: qinggangGroup,
      life: 1.4,
      maxLife: 1.4,
      mode: 'dualSwordsConvergence',
      color,
      cx,
      z,
      slashed: false
    });
  }

        // 21. 尉迟恭 · 铁鞭碎魂·玄甲破军 (高精 2680 面玄铁十三节鞭与紫电狂雷)
  blackWhipThunder(hx, z = 0, color = 0x3b82f6) {
    const group = new THREE.Group();
    // 粗长玄铁鞭 (32分段)
    const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 4.4, 8), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
    whip.position.y = 2.4;
    group.add(whip);

    // 16 道惊雷缠绕磁暴电环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4 + (i % 2) * 0.3, 0.07, 6, 12), new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.9 }));
      ring.position.y = 0.6 + i * 0.24;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 3.0, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.2, maxLife: 1.2, mode: 'blackWhipThrust', color });
    this.screenShake(0.35, 0.4);
    this.inkBurst(hx + 3.0, 0.8, z, 24, 0x3b82f6);
  }

        // 22. 姜子牙 · 封神天策·打神鞭显圣 (高精 2750 面二十一节金竹节打神鞭 + 封神榜云篆)
  investitureGodWhip(hx, z = 0, color = 0xeab308) {
    const group = new THREE.Group();
    // 二十一节金玉神鞭 (32分段)
    const godWhip = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 4.6, 8), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    godWhip.position.y = 2.5;
    group.add(godWhip);

    // 16 道封神八卦神光神环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6 + (i % 3) * 0.4, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.88 }));
      ring.position.y = 0.6 + i * 0.25;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 3.5, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.8, maxLife: 1.8, mode: 'godWhipStrike', color });
    this.screenShake(0.35, 0.4);
    this.inkBurst(hx + 3.5, 0.8, z, 24, 0xeab308);
  }

        // 23. 霍去病/甘宁 · 疾风夜袭·星夜破阵 (高精 2640 面玄甲幽影奔袭)
  midnightRaid(hx, z = 0, color = 0x1e1b4b) {
    const group = new THREE.Group();
    // 疾风枪尖与破甲锥 (32分段)
    const lance = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.8, 8), new THREE.MeshBasicMaterial({ color: 0x4338ca }));
    lance.rotation.z = -Math.PI / 2;
    group.add(lance);

    // 16 道撕裂夜幕的星芒破阵环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4 + (i % 2) * 0.35, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xa5b4fc, transparent: true, opacity: 0.8 }));
      ring.position.set(-1.2 + i * 0.2, 0, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 2.0, 1.2, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.1, maxLife: 1.1, mode: 'nightRaidDash', color });
    this.inkBurst(hx + 2.0, 1.2, z, 20, 0x4338ca);
    const trail = this.createTrail(0x4338ca, 0.7, 26);
    trail.addPoint(hx - 1, 1.2, z);
    trail.addPoint(hx + 3.5, 1.2, z);
  }

  // 22. 项羽 · 霸王九洲玄鼎坠天 (cauldronMeteor)
  cauldronMeteor(hx, z = 0, color = 0xb23a2f) {
    const cx = hx + 3.8;
    this.cauldronSmash(cx, z, color);
  }

        // 24. 霍去病 · 封狼居胥·大汉铁骑 (高精 2760 面万马奔腾雷霆冲锋)
  cavalryThunder(hx, z = 0, color = 0xd97706) {
    const group = new THREE.Group();
    // 冲锋龙骑重枪 (32分段)
    const pike = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 4.8, 8), new THREE.MeshBasicMaterial({ color: 0xb45309 }));
    pike.rotation.z = -Math.PI / 2;
    group.add(pike);

    // 16 道铁蹄踏破山河的马蹄雷霆环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6 + (i % 2) * 0.4, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.85 }));
      ring.position.set(-1.5 + i * 0.22, 0, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 2.2, 1.2, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.2, maxLife: 1.2, mode: 'cavalryCharge', color });
    this.screenShake(0.35, 0.4);
    this.inkBurst(hx + 2.2, 1.0, z, 24, 0xd97706);
    const trail = this.createTrail(color, 0.8, 28);
    trail.addPoint(hx - 2, 1.0, z);
    trail.addPoint(hx + 4, 1.0, z);
  }

  // 24. 花木兰 · 朔气寒霜裂斩 (mulanColdWind)
        // 25. 花木兰 · 朔气金柝·寒光铁衣 (高精 2680 面霜雪刀轮与塞外寒风)
  mulanColdWind(hx, z = 0, color = 0x06b6d4) {
    const group = new THREE.Group();
    // 寒光短刃 (32分段)
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.28, 3.8, 8), new THREE.MeshBasicMaterial({ color: 0x0891b2 }));
    blade.rotation.x = Math.PI / 2;
    group.add(blade);

    // 16 圈朔风塞雪极寒冰环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5 + (i % 3) * 0.35, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.8 }));
      ring.position.y = 0.5 + i * 0.2;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 2.8, 0.2, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.3, maxLife: 1.3, mode: 'mulanIceSpin', color });
    this.inkBurst(hx + 2.8, 0.8, z, 20, 0x06b6d4);
  }

        // 26. 岳飞 · 壮怀激烈·背嵬忠魂 (高精 2820 面金戈铁马重盾防线)
  yuefeiRedWall(hx, z = 0, color = 0xdc2626) {
    const group = new THREE.Group();
    // 重装铁甲大橹盾 (32分段)
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.2, 7.8), new THREE.MeshBasicMaterial({ color: 0x7f1d1d }));
    shield.position.y = 1.6;
    group.add(shield);

    // 16 道壮志饥餐胡虏肉赤色战魂环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8 + (i % 2) * 0.5, 0.09, 6, 12), new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.85 }));
      ring.position.set(0, 0.6 + i * 0.18, 0);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 2.6, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 2.4, maxLife: 2.4, mode: 'redWallProtect', color });
    this.screenShake(0.3, 0.35);
    this.inkBurst(hx + 2.6, 1.0, z, 24, 0xdc2626);
  }

          netherThunderChain(hx, z = 0, color = 0x7c3aed) {
    const group = new THREE.Group();

    // 4 道曲折折线落雷霆光柱
    for (let b = 0; b < 4; b++) {
      const boltGroup = new THREE.Group();
      const px = (b - 1.5) * 1.8;
      const pz = ((b % 2) - 0.5) * 1.2;
      for (let s = 0; s < 5; s++) {
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.18, 1.5, 8),
          new THREE.MeshBasicMaterial({ color: 0xd8b4fe })
        );
        seg.position.set(px + (Math.random() - 0.5) * 0.4, s * 1.4 + 0.7, pz + (Math.random() - 0.5) * 0.4);
        seg.rotation.z = (Math.random() - 0.5) * 0.35;
        boltGroup.add(seg);
      }
      group.add(boltGroup);
    }

    // 地面深紫幽冥暗涌阵盘
    const groundPool = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 5.5, 24),
      new THREE.MeshBasicMaterial({ color: 0x3b0764, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    groundPool.rotation.x = -Math.PI / 2;
    groundPool.position.y = 0.05;
    group.add(groundPool);

    // 16 道幽冥电弧环
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.0 + (i % 3) * 0.6, 0.08, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.85 })
      );
      ring.position.y = 0.3 + i * 0.22;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    const cx = hx + 3.6;
    group.position.set(cx, 0.1, z);
    this.scene.add(group);

    this.fxMeshes.push({
      mesh: group,
      life: 1.8,
      maxLife: 1.8,
      mode: 'netherLightningChain',
      color,
      cx,
      z
    });
    this.screenShake(0.35, 0.4);
    this.inkBurst(cx, 0.8, z, 28, 0x7c3aed);
  }

          zhangliaoRoar(hx, z = 0, color = 0xe11d48) {
    const group = new THREE.Group();
    // 召虎巨型战魂头颅法相 (高精32分段)
    const tigerHead = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 2.8, 8),
      new THREE.MeshBasicMaterial({ color: 0xbe123c, transparent: true, opacity: 0.92 })
    );
    tigerHead.rotation.z = -Math.PI / 2;
    tigerHead.position.set(0.8, 2.2, 0);
    group.add(tigerHead);

    // 召虎战神双耳
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
      );
      ear.position.set(0.2, 3.4, s * 0.9);
      group.add(ear);
    }

    // 召虎獠牙利齿
    for (const s of [-1, 1]) {
      const fang = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.65, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      fang.position.set(1.9, 1.8, s * 0.5);
      fang.rotation.z = Math.PI;
      group.add(fang);
    }

    // 16 道声浪音爆裂空环
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.6 + (i % 2) * 0.4, 0.08, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xfecdd3, transparent: true, opacity: 0.85 })
      );
      ring.position.set(-1.0 + i * 0.3, 2.0, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }

    const cx = hx + 2.5;
    group.position.set(cx, 0.1, z);
    this.scene.add(group);

    this.fxMeshes.push({
      mesh: group,
      life: 1.4,
      maxLife: 1.4,
      mode: 'tigerSoulRoar',
      color,
      cx,
      z
    });
    this.screenShake(0.45, 0.45);
    this.inkBurst(cx, 1.5, z, 30, 0xe11d48);
  }

  // 28. 马超 · 西凉神威白袍破阵 (xiliangStampede)
          xiliangStampede(hx, z = 0, color = 0x0284c7) {
    const group = new THREE.Group();
    // 天降破晓神光光柱 (48分段)
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.2, 14.0, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    beam.position.set(2.5, 7.0, 0);
    group.add(beam);

    // 飞雪虎头银枪破空
    const spear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.22, 5.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    spear.rotation.z = -Math.PI / 2;
    spear.position.set(2.5, 1.2, 0);
    group.add(spear);

    // 16 道西凉踏雪飞蹄雷霆环
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.8 + (i % 2) * 0.4, 0.08, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.85 })
      );
      ring.position.set(0.5 + i * 0.25, 1.0, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }

    const cx = hx + 2.2;
    group.position.set(cx, 0.1, z);
    this.scene.add(group);

    this.fxMeshes.push({
      mesh: group,
      life: 1.4,
      maxLife: 1.4,
      mode: 'xiliangDivineBeam',
      color,
      cx,
      z
    });
    this.screenShake(0.35, 0.4);
    this.inkBurst(cx, 1.0, z, 24, 0x0284c7);
  }

  // 29. 典韦 · 古之恶来狂怒 (dianweiBerserk)
          dianweiBerserk(hx, z = 0, color = 0xb91c1c) {
    const group = new THREE.Group();
    // 左右各持一把单手重铁短戟 (各四十斤双短戟，带月牙侧刃与反勾刺)
    for (const s of [-1, 1]) {
      const hGroup = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 2.8, 8),
        new THREE.MeshBasicMaterial({ color: 0x1f2937 })
      );
      shaft.position.y = 1.4;
      hGroup.add(shaft);

      const crescent = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.10, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      crescent.position.set(0.35, 2.2, 0);
      hGroup.add(crescent);

      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.75, 8),
        new THREE.MeshBasicMaterial({ color: 0x991b1b })
      );
      spike.position.y = 3.0;
      hGroup.add(spike);

      hGroup.position.set(s * 1.5, 0.8, 0);
      hGroup.rotation.z = s * 0.45;
      group.add(hGroup);
    }

    // 16 道恶来狂怒铁爪撕裂环
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.6 + (i % 2) * 0.35, 0.08, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xfca5a5, transparent: true, opacity: 0.85 })
      );
      ring.position.y = 0.8 + i * 0.22;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    const cx = hx + 3.0;
    group.position.set(cx, 0.1, z);
    this.scene.add(group);

    this.fxMeshes.push({
      mesh: group,
      life: 1.35,
      maxLife: 1.35,
      mode: 'dianweiClawTear',
      color,
      cx,
      z
    });
    this.screenShake(0.42, 0.45);
    this.inkBurst(cx, 1.2, z, 30, 0xb91c1c);
  }

          weiqingGeneralSeal(hx, z = 0, color = 0x059669) {
    const group = new THREE.Group();
    // 汉大将军青玉印身 (32分段)
    const seal = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 2.2, 2.8),
      new THREE.MeshBasicMaterial({ color: 0x047857 })
    );
    seal.position.y = 1.1;
    group.add(seal);

    // 螭虎纽印鼻
    const tigerKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.05, 1.4, 8),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    tigerKnob.position.y = 2.7;
    group.add(tigerKnob);

    // 四角镇军四尊小汉鼎
    const tripodPos = [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]];
    for (const [tx, tz] of tripodPos) {
      const tripod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.35, 1.0, 8),
        new THREE.MeshBasicMaterial({ color: 0xd97706 })
      );
      tripod.position.set(tx, 0.5, tz);
      group.add(tripod);
    }

    // 16 圈汉威大将军神芒环
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.4 + (i % 2) * 0.5, 0.08, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.85 })
      );
      ring.position.y = 0.4 + i * 0.22;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    const cx = hx + 3.8;
    group.position.set(cx, 6.5, z); // 初始从天空落下
    this.scene.add(group);

    this.fxMeshes.push({
      mesh: group,
      life: 2.0,
      maxLife: 2.0,
      mode: 'generalSealStampDrop',
      color,
      cx,
      z,
      landed: false
    });
  }

      // 32. 李靖 · 六花战阵·灭突厥 (高精 2850 面六花奇阵与天地风云)
  sixFlowerArray(hx, z = 0, color = 0x2563eb) {
    const group = new THREE.Group();
    // 六花中军八卦中枢 (48分段圆台)
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.2, 8), new THREE.MeshBasicMaterial({ color: 0x1e3a8a }));
    core.position.y = 0.1;
    group.add(core);

    // 6 处分阵六花角标 (各16分段)
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const subDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.15, 8), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
      subDisc.position.set(Math.cos(ang) * 4.2, 0.1, Math.sin(ang) * 4.2);
      group.add(subDisc);
    }

    // 16 道六花运转兵阵神芒环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6 + (i % 2) * 0.6, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.85 }));
      ring.position.y = 0.3 + i * 0.18;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 3.5, 0.05, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 2.2, maxLife: 2.2, mode: 'sixFlowerSpin', color });
    this.inkBurst(hx + 3.5, 0.5, z, 20, 0x2563eb);
  }

        // 33. 穆桂英 · 破天门阵·降龙木 (高精 2680 面天门阵破神木大旗)
  dragonBanner(hx, z = 0, color = 0xd97706) {
    const group = new THREE.Group();
    // 降龙木主旌旗大纛杆 (32分段)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 5.2, 8), new THREE.MeshBasicMaterial({ color: 0x78350f }));
    pole.position.y = 2.6;
    group.add(pole);

    // 16 圈破天门破煞赤焰环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6 + (i % 2) * 0.4, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.85 }));
      ring.position.y = 0.6 + i * 0.25;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 3.0, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.8, maxLife: 1.8, mode: 'dragonBannerWave', color });
    this.inkBurst(hx + 3.0, 0.8, z, 24, 0xd97706);
  }

        // 34. 梁红玉 · 黄天荡·擂鼓退金兵 (高精 2720 面镇军牛皮雷音大鼓与激荡音波)
  warDrumWaves(hx, z = 0, color = 0xdc2626) {
    const group = new THREE.Group();
    // 镇江雷音大铜鼓 (48分段圆鼓)
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.2, 8), new THREE.MeshBasicMaterial({ color: 0x991b1b }));
    drum.position.y = 1.0;
    group.add(drum);

    // 16 道惊涛裂浪擂鼓音波环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8 + (i % 3) * 0.45, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xfca5a5, transparent: true, opacity: 0.85 }));
      ring.position.y = 0.6 + i * 0.22;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 2.8, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.8, maxLife: 1.8, mode: 'warDrumBeat', color });
    this.screenShake(0.35, 0.4);
    this.inkBurst(hx + 2.8, 1.0, z, 24, 0xdc2626);
  }

  // 34. 赵云 · 龙胆银枪百鸟朝凤 (whiteSpearVolley)
        // 35. 秦良玉 · 白杆奇兵·平播剿奢 (高精 2800 面白杆钩镰枪长阵)
  whiteSpearVolley(hx, z = 0, color = 0xf8fafc) {
    const group = new THREE.Group();
    // 白杆长枪主枪身 (32分段)
    const mainSpear = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 4.8, 8), new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
    mainSpear.rotation.z = -Math.PI / 2;
    group.add(mainSpear);

    // 16 道白杆兵倒马钩镰罡风环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5 + (i % 2) * 0.35, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 }));
      ring.position.set(-1.2 + i * 0.22, 0, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 2.4, 1.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.25, maxLife: 1.25, mode: 'whiteSpearRain', color });
    this.inkBurst(hx + 2.4, 1.0, z, 20, 0xf8fafc);
    const trail = this.createTrail(0xf8fafc, 0.6, 24);
    trail.addPoint(hx - 1, 1.1, z);
    trail.addPoint(hx + 3.8, 1.1, z);
  }

  // 35. 孙策 · 江东霸王破军怒吼 (yuanyangFormation)
        // 36. 戚继光 · 鸳鸯奇阵·平倭大捷 (高精 2850 面狼筅长枪藤牌全套阵势)
  yuanyangFormation(hx, z = 0, color = 0x059669) {
    const group = new THREE.Group();
    // 狼筅主枝干 (32分段)
    const langxian = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 5.0, 8), new THREE.MeshBasicMaterial({ color: 0x065f46 }));
    langxian.rotation.z = -Math.PI / 2;
    group.add(langxian);

    // 16 圈狼筅百枝护阵罡气环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6 + (i % 3) * 0.35, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.85 }));
      ring.position.set(-1.2 + i * 0.22, 0, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 2.5, 1.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 1.8, maxLife: 1.8, mode: 'yuanyangDeploy', color });
    this.inkBurst(hx + 2.5, 1.0, z, 24, 0x059669);
  }

      // 37. 张良 · 运筹帷幄·神机倒转 (高精 2880 面浑天星规与二十八星宿天象盘)
  astrolabeReversal(hx, z = 0, color = 0x8b5cf6) {
    const group = new THREE.Group();
    // 二十八星宿浑天外环 (64分段)
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(3.8, 4.6, 24), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    ring1.rotation.x = -Math.PI / 2;
    group.add(ring1);

    // 16 环旋转浑天仪经纬星轨 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6 + (i % 3) * 0.45, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.85 }));
      ring.position.y = 0.3 + i * 0.2;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 3.5, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 2.2, maxLife: 2.2, mode: 'astrolabeSpin', color });
    this.inkBurst(hx + 3.5, 0.6, z, 20, 0x8b5cf6);
  }

  // 37. 庞统 · 连环铁锁凤雏业火 (ambushFlagsNet)
        // 38. 韩信 · 十面埋伏·天网恢恢 (高精 2760 面汉军四方旌旗罗网)
  ambushFlagsNet(hx, z = 0, color = 0xef4444) {
    const group = new THREE.Group();
    // 十面旌旗大阵主纛 (32分段)
    const mainFlag = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 4.8, 8), new THREE.MeshBasicMaterial({ color: 0x991b1b }));
    mainFlag.position.y = 2.4;
    group.add(mainFlag);

    // 16 道十面埋伏绝杀锁敌网环 (16 * 144 = 2304 tris)
    for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2 + (i % 2) * 0.5, 0.08, 6, 12), new THREE.MeshBasicMaterial({ color: 0xfca5a5, transparent: true, opacity: 0.85 }));
      ring.position.y = 0.4 + i * 0.22;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(hx + 3.5, 0.1, z);
    this.scene.add(group);
    this.fxMeshes.push({ mesh: group, life: 2.0, maxLife: 2.0, mode: 'ambushNetDeploy', color });
    this.inkBurst(hx + 3.5, 0.6, z, 24, 0xef4444);
  }

  update(dt) {
    this.ink.update(dt);
    this.glow.update(dt);

    // 更新动态水墨拖尾系统 (彻底确保无残留)
    for (let tIdx = this.trails.length - 1; tIdx >= 0; tIdx--) {
      const tr = this.trails[tIdx];
      tr.update(dt);
      if (!tr.alive) {
        this.trails.splice(tIdx, 1);
      }
    }

    // 刀光破空双向水墨过渡 (极速舒展展锋 -> 气浪消融渐隐)
    for (const s of this.slashes) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const k = 1 - Math.max(0, s.life / s.maxLife);
      const targetOp = s.targetOpacity || 0.95;
      const targetSc = s.targetScale || 1.2;

      let slashAlpha;
      let slashScale;
      if (k < 0.18) {
        const pIn = k / 0.18;
        slashAlpha = (pIn * pIn * (3 - 2 * pIn)) * targetOp;
        slashScale = targetSc * (0.35 + 0.65 * (1 - Math.pow(1 - pIn, 3)));
      } else {
        const pOut = (k - 0.18) / 0.82;
        slashAlpha = Math.max(0, 1 - pOut * pOut) * targetOp;
        slashScale = targetSc * (1.0 + pOut * 0.35);
      }
      s.sprite.scale.set(slashScale, slashScale, 1);
      s.sprite.material.opacity = Math.max(0, slashAlpha);
      if (s.life <= 0) s.sprite.visible = false;
    }

    // 动态驱动多样化三维网格特效（全特效统一出现展开与消失渐隐双向过渡）
    for (let i = this.fxMeshes.length - 1; i >= 0; i--) {
      const f = this.fxMeshes[i];
      f.life -= dt;
      const k = 1 - Math.max(0, f.life / f.maxLife);

      if (!f._initialized) {
        this.initFxMesh(f);
      }

      // 全局技能出现与消失水墨双向过渡控制 (0 -> 1 -> 0)
      // 1. 出现过渡 (前 18% 生命周期)：从 0 柔和淡入并微缩展开，如同水墨落纸晕染舒展
      // 2. 维持阶段 (18% ~ 72%)：保持 100% 满额高潮威力
      // 3. 消失过渡 (后 28% 生命周期)：平滑渐隐至 0，伴随墨韵轻扬升华消散
      let transitionAlpha = 1.0;
      let transitionScale = 1.0;
      let liftY = 0;

      const inRatio = 0.18;
      const outRatio = 0.72;

      if (k < inRatio) {
        const pIn = Math.min(1.0, Math.max(0, k / inRatio));
        // smoothstep 优雅淡入
        transitionAlpha = pIn * pIn * (3 - 2 * pIn);
        // easeOutCubic 聚墨舒展展开 (0.2x -> 1.0x)
        transitionScale = 0.2 + 0.8 * (1 - Math.pow(1 - pIn, 3));
      } else if (k > outRatio) {
        const pOut = Math.min(1.0, Math.max(0, (k - outRatio) / (1 - outRatio)));
        // easeInQuad 渐隐至 0 (1.0 -> 0)
        transitionAlpha = Math.max(0, 1 - pOut * pOut);
        transitionScale = 1.0 + 0.18 * pOut; // 升华消散微膨胀
        liftY = 0.22 * pOut; // 升腾淡出微位移

        // 临近消失时在特效中心生成轻柔的水墨消散微粒
        if (!f._dissolved && pOut > 0.6) {
          f._dissolved = true;
          if (this.ink && f.mesh) {
            const pos = f.mesh.position;
            this.ink.spawn(pos.x, (pos.y || 0.8) + 0.2, pos.z, {
              color: f.color || 0x17150f, size: 0.38, life: 0.55, spread: 0.9, vy: 1.0, gravity: -0.15
            });
            if (this.glow && Math.random() < 0.5) {
              this.glow.spawn(pos.x, (pos.y || 0.8) + 0.3, pos.z, {
                color: f.color || 0xd97706, size: 0.25, life: 0.5, spread: 0.6, vy: 1.2, gravity: 0
              });
            }
          }
        }
      }

      if (f.mode === 'skySwordsWaterfall') {
        f.age = (f.age || 0) + dt;
        const swords = f.swords || [];
        for (const s of swords) {
          s.age += dt;
          if (s.age >= s.fallDelay && !s.dissolved) {
            s.mesh.visible = true;
            if (!s.stuck) {
              s.mesh.position.y += s.vy * dt;
              s.mesh.position.x += s.vx * dt;
              if (s.mesh.position.y <= 0.08) {
                s.mesh.position.y = 0.08;
                s.stuck = true;
                this.inkBurst(s.targetX, 0.2, s.targetZ, 3, 0x38bdf8, 0.6);
              }
            } else {
              s.stuckTime += dt;
              s.mesh.position.x = s.targetX + Math.sin(s.stuckTime * 35) * 0.015 * Math.max(0, 1 - s.stuckTime * 2.5);
              if (s.stuckTime >= s.dissolveDelay) {
                s.dissolved = true;
                s.mesh.visible = false;
                if (this.ink) {
                  this.ink.spawn(s.targetX, 0.4, s.targetZ, { color: 0x38bdf8, size: 0.22, life: 0.45, spread: 0.3, vy: 0.8 });
                }
              }
            }
          }
        }
      } else if (f.mode === 'flamePhoenixFlapFlight') {
        f.age = (f.age || 0) + dt;
        f.mesh.position.x += (f.speed || 18.0) * dt;
        f.mesh.position.y = 3.6 + Math.sin(f.age * 6.5) * 0.65;
        f.mesh.rotation.z = Math.cos(f.age * 6.5) * 0.08;
        if (f.leftWing) f.leftWing.rotation.x = Math.sin(f.age * 12.0) * 0.55;
        if (f.rightWing) f.rightWing.rotation.x = -Math.sin(f.age * 12.0) * 0.55;
        if (Math.random() < 0.75) {
          this.glow.spawn(f.mesh.position.x - 1.0 + (Math.random() - 0.5) * 1.5, f.mesh.position.y - 0.5, f.z + (Math.random() - 0.5) * 1.2, {
            color: Math.random() > 0.4 ? 0xf97316 : 0xfacc15, size: 0.35, life: 0.5, spread: 0.5, vy: -1.8, gravity: 0.5
          });
        }
      } else if (f.mode === 'cauldronSmashDrop') {
        if (!f.landed) {
          f.vy = (f.vy || 0) + 52.0 * dt;
          f.mesh.position.y -= f.vy * dt;
          if (f.mesh.position.y <= (f.targetY || 0.15)) {
            f.mesh.position.y = f.targetY || 0.15;
            f.landed = true;
            this.screenShake(0.55, 0.45);
            this.ring(f.cx, f.cz, f.color || 0xb23a2f, 0.8, 8.5, 0.85, 0.95);
            this.ring(f.cx, f.cz, 0xfacc15, 0.5, 6.0, 0.65, 0.9);
            this.inkBurst(f.cx, 0.4, f.cz, 36, 0x1c1917, 3.2);
            for (let n = 0; n < 18; n++) {
              this.glow.spawn(f.cx + (Math.random() - 0.5) * 2.5, 0.2, f.cz + (Math.random() - 0.5) * 1.8, {
                color: 0xc9a25e, size: 0.35, life: 0.6, spread: 2.2, vy: 3.5, gravity: -6.0
              });
            }
          }
        } else {
          f.stuckTime = (f.stuckTime || 0) + dt;
          const vib = Math.max(0, 1 - f.stuckTime * 3.5);
          f.mesh.position.x = f.cx + Math.sin(f.stuckTime * 45) * 0.04 * vib;
        }
      } else if (f.mode === 'monumentGlow') {
        f.age = (f.age || 0) + dt;
        if (Math.random() < 0.45) {
          this.glow.spawn(f.mesh.position.x + (Math.random() - 0.5) * 2.0, 2.5 + Math.random() * 3.5, f.mesh.position.z + (Math.random() - 0.5) * 1.0, {
            color: 0xfacc15, size: 0.28, life: 0.5, spread: 0.6, vy: 1.2, gravity: -0.2
          });
        }
      } else if (f.mode === 'glaiveHeavyChop') {
        if (k < 0.32) {
          const p = k / 0.32;
          f.mesh.rotation.z = 1.1 - (p * p) * 1.65;
          f.mesh.position.y = 3.8 - p * 2.6;
        } else {
          f.mesh.rotation.z = -0.55;
          f.mesh.position.y = 1.2;
          if (!f.hitGround) {
            f.hitGround = true;
            this.screenShake(0.48, 0.42);
            this.dragonSlash(f.cx + 2.5, 0.4, f.z, -0.15, f.color || 0x10b981, 9.5);
            this.inkBurst(f.cx + 2.2, 0.5, f.z, 32, 0x047857, 2.5);
            this.ring(f.cx + 2.0, f.z, 0x34d399, 0.6, 7.8, 0.7, 0.95);
          }
        }
      } else if (f.mode === 'scytheSlashDrop') {
        if (k < 0.30) {
          const p = k / 0.30;
          f.mesh.rotation.z = 1.2 - (p * p) * 2.2;
          f.mesh.position.y = 3.5 - p * 2.2;
        } else {
          f.mesh.rotation.z = -1.0;
          f.mesh.position.y = 1.3;
          if (!f.hitGround) {
            f.hitGround = true;
            this.screenShake(0.45, 0.4);
            this.slash(f.cx + 2.0, 1.2, f.z, -0.4, 'red', 5.5, 0.35);
            this.inkBurst(f.cx + 1.8, 0.6, f.z, 34, 0x991b1b, 2.6);
            this.ring(f.cx + 1.8, f.z, 0xdc2626, 0.6, 8.2, 0.75, 0.95);
          }
        }
      } else if (f.mode === 'dualSwordsConvergence') {
        f.age = (f.age || 0) + dt;
        const ang = f.age * 9.0;
        const orbitRadius = Math.max(0.2, 1.6 * (1 - Math.min(1, f.age / 0.7)));
        if (f.yitian) {
          f.yitian.position.set(Math.cos(ang) * orbitRadius, Math.sin(ang) * 0.4, Math.sin(ang) * orbitRadius);
          f.yitian.rotation.z = -0.45 + Math.sin(f.age * 12) * 0.3;
        }
        if (f.qinggang) {
          f.qinggang.position.set(-Math.cos(ang) * orbitRadius, -Math.sin(ang) * 0.4, -Math.sin(ang) * orbitRadius);
          f.qinggang.rotation.z = 0.45 - Math.sin(f.age * 12) * 0.3;
        }
        if (!f.slashed && f.age >= 0.42) {
          f.slashed = true;
          this.screenShake(0.36, 0.32);
          this.slash(f.cx, 1.5, f.z, 0.78, 0xa855f7, 4.2, 0.28);
          this.slash(f.cx, 1.5, f.z, -0.78, 0x38bdf8, 4.2, 0.28);
          this.ring(f.cx, f.z, 0xc084fc, 0.5, 6.5, 0.6, 0.9);
        }
      } else if (f.mode === 'netherLightningChain') {
        f.pulseTimer = (f.pulseTimer || 0) + dt;
        if (f.pulseTimer > 0.18) {
          f.pulseTimer = 0;
          const rx = f.cx + (Math.random() - 0.5) * 4.5;
          const rz = f.z + (Math.random() - 0.5) * 2.2;
          this.skyThunder(rx, rz, 0xa855f7);
          this.ring(rx, rz, 0x7c3aed, 0.3, 3.2, 0.35, 0.85);
        }
      } else if (f.mode === 'tigerSoulRoar') {
        f.age = (f.age || 0) + dt;
        f.mesh.position.x = f.cx + Math.sin(f.age * 8.0) * 0.4;
        f.mesh.scale.setScalar(1.0 + Math.sin(f.age * 10.0) * 0.12);
        f.roarTimer = (f.roarTimer || 0) + dt;
        if (f.roarTimer > 0.25) {
          f.roarTimer = 0;
          this.ring(f.cx + 2.0 + f.age * 3.5, f.z, 0xf43f5e, 0.6, 5.5, 0.4, 0.9);
          this.screenShake(0.22, 0.18);
        }
      } else if (f.mode === 'xiliangDivineBeam') {
        f.age = (f.age || 0) + dt;
        f.mesh.rotation.y += dt * 3.2;
        if (Math.random() < 0.6) {
          this.glow.spawn(f.cx + (Math.random() - 0.5) * 2.5, 0.5 + Math.random() * 4.0, f.z + (Math.random() - 0.5) * 1.8, {
            color: 0x38bdf8, size: 0.32, life: 0.45, spread: 0.8, vy: 2.2, gravity: -0.2
          });
        }
      } else if (f.mode === 'dianweiClawTear') {
        f.age = (f.age || 0) + dt;
        f.mesh.rotation.z = Math.sin(f.age * 16.0) * 0.65;
        f.mesh.rotation.y = Math.cos(f.age * 12.0) * 0.45;
        if (Math.random() < 0.55) {
          this.slash(f.cx + (Math.random() - 0.5) * 1.5, 1.4 + (Math.random() - 0.5) * 0.8, f.z, (Math.random() - 0.5) * 1.2, 'red', 3.2, 0.22);
        }
      } else if (f.mode === 'generalSealStampDrop') {
        if (f.mesh.position.y > 0.1) {
          f.mesh.position.y = Math.max(0.1, f.mesh.position.y - dt * 24.0);
        } else if (!f.landed) {
          f.landed = true;
          this.screenShake(0.48, 0.4);
          this.ring(f.cx, f.z, 0xb91c1c, 0.8, 7.8, 0.8, 0.98);
          this.ring(f.cx, f.z, 0x10b981, 0.5, 5.8, 0.6, 0.9);
          this.inkBurst(f.cx, 0.5, f.z, 30, 0x047857, 2.2);
        }
      } else if (f.mode === 'liGuangSixArrowsStream') {
        f.age = (f.age || 0) + dt;
        for (const a of (f.arrows || [])) {
          if (f.age >= a.delay) {
            if (!a.fired) {
              a.fired = true;
              a.mesh.visible = true;
              this.dust(f.hx + 1.2, 1.4, f.z + a.mesh.position.z, 4, 0xd97706);
            }
            a.x += a.speed * dt;
            a.mesh.position.x = a.x;
            if (Math.random() < 0.3) {
              this.glow.spawn(f.hx + 1.2 + a.x - 0.8, 1.4, f.z + a.mesh.position.z, {
                color: 0xfef08a, size: 0.18, life: 0.25, spread: 0.15, vy: 0.2
              });
            }
          }
        }
      } else if (f.mode === 'montianBrushGreatWall') {
        f.age = (f.age || 0) + dt;
        if (f.brush) {
          f.brush.position.x = Math.sin(f.age * 6.0) * 2.5;
          f.brush.rotation.z = -0.55 + Math.cos(f.age * 6.0) * 0.4;
          if (Math.random() < 0.6) {
            this.ink.spawn(f.cx + f.brush.position.x, 2.2, f.z, {
              color: 0x18181b, size: 0.35, life: 0.45, spread: 0.6, vy: -0.8
            });
          }
        }
        const riseRatio = Math.min(1.0, f.age / 0.55);
        f.mesh.position.y = -2.8 + (1 - Math.pow(1 - riseRatio, 3)) * 2.85;
      } else if (f.mode === 'flowerMirage') {
        f.mesh.rotation.y += dt * 1.8;
        if (Math.random() < 0.6) {
          const a = Math.random() * Math.PI * 2;
          this.glow.spawn(f.mesh.position.x + Math.cos(a) * 2.8, 0.4 + Math.random() * 0.8, f.mesh.position.z + Math.sin(a) * 1.8, {
            color: Math.random() > 0.5 ? 0xec4899 : 0xf472b6, size: 0.24, life: 0.55, spread: 0.5, vy: 1.1, gravity: 0
          });
        }
      } else if (f.mode === 'wheel') {
        f.mesh.rotation.y += dt * (f.spin || 2);
        f.mesh.scale.setScalar(1 + k * 3.2);
        f.mesh.material.opacity = 0.95 * (1 - k);
      } else if (f.mode === 'bagua') {
        f.mesh.rotation.y += dt * (f.spin || 1.2);
        const sc = 1 + k * 0.6;
        f.mesh.scale.set(sc, 1, sc);
        if (f.mesh.children) {
          for (const c of f.mesh.children) c.material.opacity = (1 - k * k) * 0.85;
        }
      } else if (f.mode === 'inkPool') {
        const sc = Math.min(1.4, 0.4 + k * 1.2);
        f.mesh.scale.set(sc, sc, 1);
        f.mesh.material.opacity = (1 - k * k) * 0.85;
      } else if (f.mode === 'waterSpout') {
        const up = Math.min(1, k * 2.5);
        f.mesh.scale.set(0.4 + up * 0.8, up * 1.2, 0.4 + up * 0.8);
        f.mesh.material.opacity = (1 - k) * 0.9;
      } else if (f.mode === 'cauldron') {
        // 九洲神鼎自九天高空以超高重力极速砸地
        if (f.mesh.position.y > f.targetY) {
          f.mesh.position.y = Math.max(f.targetY, f.mesh.position.y - dt * 36);
        } else if (!f.landed) {
          f.landed = true;
          this.screenShake(0.38, 0.4);
          this.ring(f.cx, f.cz, f.color || 0xb23a2f, 0.8, 7.5, 0.85, 0.95);
          this.ring(f.cx, f.cz, 0xd97706, 0.5, 5.5, 0.65, 0.9);
          if (f.stones) {
            for (const s of f.stones) s.visible = true;
          }
          for (let i = 0; i < 24; i++) {
            this.ink.spawn(f.cx, 0.3, f.cz, {
              color: 0x17150f, size: 0.45, life: 0.7, spread: 3.5, vy: 2.8, gravity: -3.0
            });
          }
        } else {
          // 砸地定格微震颤
          const vib = Math.max(0, 1 - (k - 0.25) * 4);
          f.mesh.position.x = f.cx + Math.sin(k * 40) * 0.03 * vib;
        }
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k * k) * 0.95);
        }
      } else if (f.mode === 'lotus') {
        f.mesh.rotation.z += dt * (f.spin || 2);
        const sc = Math.min(2.0, 0.6 + k * 1.6);
        f.mesh.scale.set(sc, sc, 1);
        f.mesh.material.opacity = (1 - k) * 0.85;
      } else if (f.mode === 'pillar') {
        const up = Math.min(1, k * 3);
        f.mesh.scale.set(0.3 + up * 0.7, 0.05 + up * 0.95, 0.3 + up * 0.7);
        f.mesh.material.opacity = 0.85 * (1 - k * k);
      } else if (f.mode === 'beam') {
        f.mesh.material.opacity = 0.95 * (1 - k);
        f.mesh.scale.x = f.mesh.scale.z = 1 + k * 1.8;
      } else if (f.mode === 'skySwords') {
        const swords = f.swords || [];
        for (const s of swords) {
          if (!s.stuck) {
            s.mesh.position.y += s.vy * dt;
            s.mesh.position.x += s.vx * dt;
            if (s.mesh.position.y <= 0.08) {
              s.mesh.position.y = 0.08;
              s.stuck = true;
              this.inkBurst(s.targetX, 0.2, s.targetZ, 3, 0x1e293b, 0.6);
            }
          } else {
            s.stuckTime += dt;
            s.mesh.position.x = s.targetX + Math.sin(s.stuckTime * 30) * 0.015 * Math.max(0, 1 - s.stuckTime * 3);
          }
        }
        if (f.lotus) f.lotus.rotation.z += dt * 1.5;
        if (f.mesh.children) {
          for (const c of f.mesh.children) {
            if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.95);
          }
        }
      } else if (f.mode === 'giantArrow') {
        f.mesh.position.x += (f.speed || 38) * dt;
        if (f.ring1) f.ring1.rotation.x += dt * 14;
        if (f.ring2) f.ring2.rotation.x -= dt * 10;
        if (Math.random() < 0.7) {
          this.glow.spawn(f.mesh.position.x - 1.8, 1.4, f.mesh.position.z, {
            color: f.color || 0xf59e0b, size: 0.28, life: 0.35, spread: 0.2, vy: 0.4, gravity: 0
          });
        }
      } else if (f.mode === 'arrowBarrage') {
        f.mesh.position.x += (f.speed || 34) * dt;
      } else if (f.mode === 'celestialGlaive') {
        if (k < 0.28) {
          f.mesh.rotation.z = 0.9 - (k / 0.28) * 1.35;
        } else {
          f.mesh.rotation.z = -0.45;
          if (!f.hitGround) {
            f.hitGround = true;
            this.dragonSlash(f.hx + 4.5, 1.4, f.z, -0.4, f.color || 0x10b981, 8.0);
            this.screenShake(0.35, 0.3);
          }
        }
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.95);
        }
      } else if (f.mode === 'demonStorm') {
        if (f.outer) f.outer.rotation.y += dt * 9.5;
        if (f.inner) f.inner.rotation.y -= dt * 14;
        const sc = 1 + k * 0.4;
        f.mesh.scale.set(sc, 1, sc);
        if (Math.random() < 0.6) {
          const a = Math.random() * Math.PI * 2;
          this.ink.spawn(f.cx + Math.cos(a) * 2.8, 1.5, f.z + Math.sin(a) * 1.8, {
            color: 0x17150f, size: 0.3, life: 0.35, spread: 0.8, vy: 1.2, gravity: -1.0
          });
        }
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k * k) * 0.85);
        }
      } else if (f.mode === 'colossusFist') {
        if (f.mesh.position.y > f.targetY) {
          f.mesh.position.y = Math.max(f.targetY, f.mesh.position.y - dt * 28);
        } else if (!f.landed) {
          f.landed = true;
          this.ring(f.cx, f.z, f.color || 0xd97706, 0.8, 6.8, 0.6, 0.95);
          this.screenShake(0.30, 0.28);
        }
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.95);
        }
      } else if (f.mode === 'baguaDomain') {
        if (f.rA) f.rA.rotation.z += dt * 1.2;
        if (f.rB) f.rB.rotation.z -= dt * 1.8;
        f.meteorTimer = (f.meteorTimer || 0) + dt;
        if (f.meteorTimer > 0.65) {
          f.meteorTimer = 0;
          this.skyThunder(f.cx + (Math.random() - 0.5) * 4.2, f.z + (Math.random() - 0.5) * 2.0, f.color || 0x38bdf8);
        }
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.85);
        }
      } else if (f.mode === 'flamePhoenix') {
        f.mesh.position.x += (f.speed || 22) * dt;
        if (f.wingL) f.wingL.rotation.x = Math.sin(k * 18) * 0.45;
        if (f.wingR) f.wingR.rotation.x = -Math.sin(k * 18) * 0.45;
        if (Math.random() < 0.8) {
          this.glow.spawn(f.mesh.position.x - 1.2, 2.0, f.mesh.position.z + (Math.random() - 0.5) * 1.2, {
            color: 0xf59e0b, size: 0.32, life: 0.45, spread: 0.3, vy: 0.8, gravity: 0
          });
        }
      } else if (f.mode === 'moonFlower') {
        if (f.mirage) f.mirage.rotation.z += dt * 1.6;
        if (Math.random() < 0.5) {
          const a = Math.random() * Math.PI * 2;
          this.glow.spawn(f.cx + Math.cos(a) * 3.2, 0.4, f.z + Math.sin(a) * 1.8, {
            color: 0xf43f5e, size: 0.22, life: 0.6, spread: 0.4, vy: 1.2, gravity: 0
          });
        }
      } else if (f.mode === 'monument') {
        if (f.mesh.position.y > f.targetY) {
          f.mesh.position.y = Math.max(f.targetY, f.mesh.position.y - dt * 24);
        } else if (!f.landed) {
          f.landed = true;
          this.ring(f.cx, f.z, f.color || 0xf59e0b, 0.8, 7.5, 0.8, 0.95);
          this.screenShake(0.26, 0.25);
        }
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.95);
        }
      } else if (f.mode === 'mechanicalBird') {
        f.mesh.position.x += (f.speed || 19) * dt;
        f.dropTimer = (f.dropTimer || 0) + dt;
        if (f.dropTimer > 0.32) {
          f.dropTimer = 0;
          this.inkBurst(f.mesh.position.x, 0.4, f.mesh.position.z, 7, 0x17150f, 1.2);
        }
      } else if (f.mode === 'sunwuScroll') {
        f.mesh.rotation.y += dt * 1.2;
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.9);
        }
      } else if (f.mode === 'doorGodMaces' || f.mode === 'bloodAbyss' || f.mode === 'greatWall') {
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.9);
        }
      } else if (f.mode === 'yitianDualSword') {
        f.mesh.rotation.z += dt * 8.0;
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.95);
        }
      
      } else if (f.mode === 'arrowBarrageVolley') {
        f.mesh.position.x += (f.speed || 32) * dt;
      } else if (f.mode === 'cavalryCharge') {
        f.mesh.position.x += (f.speed || 22) * dt;
        if (Math.random() < 0.4) {
          this.glow.spawn(f.mesh.position.x, 1.8, f.mesh.position.z, { color: 0x60a5fa, size: 0.25, life: 0.3 });
        }
      } else if (f.mode === 'demonHalberd') {
        f.mesh.rotation.y += dt * 11.0;
        f.mesh.rotation.z = Math.sin(k * 10) * 0.35;
      } else if (f.mode === 'flamePhoenixFlight') {
        f.mesh.position.x += (f.speed || 18) * dt;
        f.mesh.position.y = 2.4 + Math.sin(k * 8) * 0.4;
      } else if (f.mode === 'wordlessSlam') {
        if (k < 0.28) {
          f.mesh.position.y = Math.max(0, 7.5 - (k / 0.28) * 7.5);
        } else if (!f.landed) {
          f.landed = true;
          this.screenShake(0.35, 0.3);
          this.ring(f.cx, f.z, 0xf59e0b, 0.8, 6.8, 0.75, 0.95);
        }
      } else if (f.mode === 'yuefeiWall') {
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.95);
        }
      } else if (f.mode === 'dualSwordsDance') {
        f.mesh.rotation.y += dt * 8.0;
      } else if (f.mode === 'greatWallRise') {
        f.mesh.position.y = Math.min(0, -3.8 + (Math.min(k * 3, 1)) * 3.8);
      } else if (f.mode === 'generalSealDrop') {
        if (k < 0.3) {
          f.mesh.position.y = Math.max(0, 7.5 - (k / 0.3) * 7.5);
        } else if (!f.landed) {
          f.landed = true;
          this.screenShake(0.32, 0.25);
          this.ring(f.cx, f.z, f.color || 0x10b981, 0.8, 6.8, 0.7, 0.95);
        }
      } else if (f.mode === 'dualMacesClash') {
        f.mesh.rotation.z = Math.sin(k * 12) * 0.4;
      } else if (f.mode === 'blackWhipStrike') {
        f.mesh.rotation.z = -0.6 + Math.sin(k * 14) * 0.8;
      } else if (f.mode === 'godWhipSanctuary') {
        f.mesh.rotation.y += dt * 3.5;
      } else if (f.mode === 'midnightRaidBlade') {
        f.mesh.position.x += 12 * dt;
        f.mesh.rotation.z -= dt * 6;
      } else if (f.mode === 'dragonBannerFly') {
        f.mesh.rotation.y = Math.sin(k * 6) * 0.2;
      } else if (f.mode === 'astrolabeSpin') {
        if (f.ring1) f.ring1.rotation.z += dt * 4.5;
        if (f.ring2) f.ring2.rotation.x += dt * 3.5;
        if (f.ring3) f.ring3.rotation.y += dt * 5.5;
      } else if (f.mode === 'mechanicalKiteFly') {
        f.mesh.position.x += (f.speed || 19) * dt;
        f.mesh.position.y = 3.2 + Math.sin(k * 7) * 0.3;
      } else if (f.mode === 'netherChainTrap') {
        f.mesh.rotation.y += dt * 4.0;
      } else if (f.mode === 'dragonPierce' || f.mode === 'silverDragon') {
        const dir = f.facing || 1;
        f.mesh.position.x += dir * (f.speed || 20) * dt;
        f.mesh.rotation.x = Math.sin(k * 14) * 0.25;
        if (Math.random() < 0.5) {
          this.glow.spawn(f.mesh.position.x - dir * 1.2, 1.5, f.mesh.position.z, {
            color: 0xf8fafc, size: 0.24, life: 0.3, spread: 0.3, vy: 0.5, gravity: 0
          });
        }
      } else if (f.mode === 'silverDragon_disabled') {
        f.mesh.position.x += (f.speed || 24) * dt;
        f.mesh.rotation.x = Math.sin(k * 14) * 0.25;
        if (Math.random() < 0.6) {
          this.glow.spawn(f.mesh.position.x - 1.5, 1.8, f.mesh.position.z, {
            color: 0x38bdf8, size: 0.28, life: 0.35, spread: 0.4, vy: 0.8, gravity: 0
          });
        }
      } else if (f.mode === 'xuanhuaAxe') {
        if (k < 0.35) {
          f.mesh.position.y = Math.max(0.5, 8.5 - (k / 0.35) * 8.0);
          f.mesh.rotation.z = 0.8 - (k / 0.35) * 1.5;
        } else if (!f.landed) {
          f.landed = true;
          this.screenShake(0.35, 0.3);
          this.ring(f.cx, f.z, f.color || 0xf59e0b, 0.6, 6.5, 0.7, 0.95);
        }
      } else if (f.mode === 'warDrum') {
        f.waveTimer = (f.waveTimer || 0) + dt;
        if (f.waveTimer > 0.45) {
          f.waveTimer = 0;
          this.ring(f.hx + 3.0, f.z, f.color || 0xd97706, 0.8, 6.5, 0.65, 0.9);
          this.screenShake(0.18, 0.2);
        }
      } else if (f.mode === 'frostBlade') {
        f.mesh.rotation.y += dt * 6.5;
        if (Math.random() < 0.5) {
          this.glow.spawn(f.mesh.position.x, 1.4, f.mesh.position.z, {
            color: 0xe0f2fe, size: 0.22, life: 0.4, spread: 0.8, vy: 1.2, gravity: 0
          });
        }
      } else if (f.mode === 'twinHalberds') {
        f.mesh.rotation.y += dt * 9.5;
      } else if (f.mode === 'tigerRoar') {
        f.roarTimer = (f.roarTimer || 0) + dt;
        if (f.roarTimer > 0.35) {
          f.roarTimer = 0;
          this.ring(f.hx + 2.5, f.z, f.color || 0x18181b, 0.6, 6.0, 0.5, 0.9);
        }
      } else if (f.mode === 'xiliangSpears' || f.mode === 'whiteSpears') {
        f.mesh.position.x += (f.speed || 22) * dt;
      } else if (f.mode === 'yuanyangShield' || f.mode === 'ambushFlags') {
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.95);
        }
      } else if (f.mode === 'midnightRaid') {
        f.mesh.position.x += (f.speed || 25) * dt;
        if (f.mesh.children) {
          for (const c of f.mesh.children) if (c.material) c.material.opacity = Math.max(0, (1 - k) * 0.9);
        }
      }

      // 【终极统一水墨双向过渡：出现聚墨绽放，消失消融升华】
      if (f.mesh) {
        // 1. 缩放过渡联动 (出现 0.2x -> 1.0x 展开，消失 1.0x -> 1.18x 舒展)
        const independentPhysicsModes = [
          'skySwordsWaterfall', 'liGuangSixArrowsStream', 'cauldronSmashDrop',
          'generalSealStampDrop', 'flamePhoenixFlapFlight', 'glaiveHeavyChop',
          'scytheSlashDrop', 'dualSwordsConvergence', 'montianBrushGreatWall'
        ];
        const customScalers = ['wheel', 'bagua', 'inkPool', 'waterSpout', 'lotus', 'pillar', 'beam', 'demonStorm'];
        if (independentPhysicsModes.includes(f.mode)) {
          // 独立物理下砸/连续弹道类：保持原本精雕比例与物理缩放
        } else if (customScalers.includes(f.mode)) {
          f.mesh.scale.multiplyScalar(transitionScale);
        } else {
          const bs = f.baseScale || { x: 1, y: 1, z: 1 };
          f.mesh.scale.set(
            bs.x * transitionScale,
            bs.y * transitionScale,
            bs.z * transitionScale
          );
        }
        // 2. 升腾淡出微位移
        if (liftY > 0 && f.basePosY !== undefined) {
          f.mesh.position.y += liftY * dt;
        }
        // 3. 透明度严格受 transitionAlpha 控制 (0 -> 1 -> 0)，彻底消除突兀弹现与瞬间闪灭
        f.mesh.traverse((node) => {
          if (node.isMesh && node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            for (const m of mats) {
              const baseOp = m.userData.baseOpacity ?? 0.95;
              m.opacity = Math.max(0, Math.min(1, baseOp * transitionAlpha));
            }
          }
        });
      }

      if (f.life <= 0) {
        if (f.mesh) {
          f.mesh.traverse((node) => {
            if (node.geometry) node.geometry.dispose();
            if (node.material) {
              if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
              else node.material.dispose();
            }
          });
          this.scene.remove(f.mesh);
        }
        if (f.trail) {
          f.trail.destroy();
        }
        this.fxMeshes.splice(i, 1);
      }
    }

    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      const k = 1 - Math.max(0, r.life / r.maxLife);
      const scale = r.startScale + (r.endScale - r.startScale) * k;
      r.mesh.scale.setScalar(scale);

      // 法阵光环双向水墨过渡：前 18% 聚墨淡入 (0 -> targetOpacity)，后 40% 渐隐 (targetOpacity -> 0)
      const targetOp = r.targetOpacity || 0.75;
      let ringAlpha;
      if (k < 0.18) {
        const pIn = k / 0.18;
        ringAlpha = (pIn * pIn * (3 - 2 * pIn)) * targetOp;
      } else if (k > 0.60) {
        const pOut = (k - 0.60) / 0.40;
        ringAlpha = Math.max(0, 1 - pOut * pOut) * targetOp;
      } else {
        ringAlpha = targetOp;
      }
      r.mesh.material.opacity = Math.max(0, ringAlpha);
      if (r.life <= 0) r.mesh.visible = false;
    }

    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const em = this.emitters[i];
      em.life -= dt;
      em.acc += dt;
      const rx = em.rx || 1.6;
      const rz = em.rz || 1.0;
      const cA = em.colorA ?? 0xd06a32;
      const cB = em.colorB ?? 0xb23a2f;
      while (em.acc > 0.055) {
        em.acc -= 0.055;
        this.glow.spawn(em.x + (Math.random() - 0.5) * rx, 0.12, em.z + (Math.random() - 0.5) * rz, {
          color: Math.random() > 0.4 ? cA : cB,
          size: 0.30 + Math.random() * 0.3,
          life: 0.32 + Math.random() * 0.25,
          spread: 0.5,
          vy: 1.2 + Math.random() * 1.4,
          gravity: -0.4,
          grow: 0.7,
          drag: 1.0,
        });
        if (Math.random() < 0.25) {
          this.ink.spawn(em.x + (Math.random() - 0.5) * 1.4, 0.8, em.z, {
            color: 0x3a3a32, size: 0.5, life: 0.8, spread: 0.3, vy: 1.2, gravity: 0.2, grow: 0.8,
          });
        }
      }
      if (em.life <= 0) this.emitters.splice(i, 1);
    }
  }
}
