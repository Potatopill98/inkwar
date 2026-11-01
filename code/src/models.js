// 程序化低模角色/建筑模型 —— 三渲二水墨风格（优化重构版）
// 保持 Low Poly 纯水墨美术风，大幅提升形体比例、甲胄层次与武器建筑质感
import * as THREE from '../lib/three.module.js';

// ---------- 共享材质与三阶光照 ----------
const gradientData = new Uint8Array([
  82, 82, 82, 255,
  160, 160, 160, 255,
  255, 255, 255, 255,
]);
const gradientMap = new THREE.DataTexture(gradientData, 3, 1);
gradientMap.colorSpace = THREE.NoColorSpace;
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

export const toonMaterial = new THREE.MeshToonMaterial({
  vertexColors: true,
  gradientMap,
  color: 0xffffff,
  transparent: false,
  opacity: 1.0,
  depthWrite: true,
  depthTest: true,
});

// 专用于隐匿 / 阵亡英灵的半透明独立材质，绝不修改 toonMaterial
export const ghostMaterial = new THREE.MeshToonMaterial({
  vertexColors: true,
  gradientMap,
  color: 0xffffff,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
  depthTest: true,
});

// ---------- 脚下贴片已按指令彻底移除 ----------
export function makeShadow() {
  return null;
}

// ---------- 几何构建与合批工具 ----------
function mat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
  return m;
}

function pushGeo(list, geo, color, m) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (m) g.applyMatrix4(m);
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  g.deleteAttribute('uv1');
  g.deleteAttribute('uv2');
  list.push(g);
  if (geo !== g) geo.dispose();
}

function mergeGeos(list) {
  if (!list.length) return new THREE.BufferGeometry();
  let total = 0;
  for (const g of list) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let off = 0;
  for (const g of list) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, off * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, off * 3);
    col.set(g.attributes.color.array, off * 3);
    off += n;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

// 基础低模几何体原型（Low Poly）
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6);
const CYL8 = new THREE.CylinderGeometry(1, 1, 1, 7);
const CONE5 = new THREE.ConeGeometry(1, 1, 5);
const CONE7 = new THREE.ConeGeometry(1, 1, 6);
const CONE4 = new THREE.ConeGeometry(1, 1, 4);
const SPH_LO = new THREE.SphereGeometry(1, 4, 3);
const SPH_MED = new THREE.SphereGeometry(1, 6, 4);
const SPH_HEAD = new THREE.SphereGeometry(1, 8, 6);

// 楔形体（低多边形坡屋顶、云头靴尖、刀刃反曲必备）
function createWedgeGeometry(w = 1, h = 1, d = 1) {
  const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
  // 6个顶点组成三棱柱楔形
  const vertices = new Float32Array([
    // 底面矩形
    -hw, -hh, -hd,   hw, -hh, -hd,   hw, -hh, hd,
    -hw, -hh, -hd,   hw, -hh, hd,   -hw, -hh, hd,
    // 斜面矩形
    -hw, -hh, hd,    hw, -hh, hd,    hw, hh, -hd,
    -hw, -hh, hd,    hw, hh, -hd,   -hw, hh, -hd,
    // 后面竖直矩形
    -hw, -hh, -hd,  -hw, hh, -hd,    hw, hh, -hd,
    -hw, -hh, -hd,   hw, hh, -hd,    hw, -hh, -hd,
    // 侧面三角形左
    -hw, -hh, -hd,  -hw, -hh, hd,   -hw, hh, -hd,
    // 侧面三角形右
    hw, -hh, -hd,   hw, hh, -hd,    hw, -hh, hd,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  g.computeVertexNormals();
  return g;
}
const WEDGE = createWedgeGeometry(1, 1, 1);

function box(list, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  pushGeo(list, BOX, color, mat4(x, y, z, rx, ry, rz, sx, sy, sz));
}
function wedge(list, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  pushGeo(list, WEDGE, color, mat4(x, y, z, rx, ry, rz, sx, sy, sz));
}
function cyl(list, color, x, y, z, r, h, rz = 0, rx = 0, ry = 0, seg = 6) {
  const base = seg >= 8 ? CYL8 : CYL6;
  pushGeo(list, base, color, mat4(x, y, z, rx, ry, rz, r, h, r));
}
function cylTaper(list, color, x, y, z, rTop, rBot, h, rz = 0, rx = 0, ry = 0, seg = 6) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  pushGeo(list, g, color, mat4(x, y, z, rx, ry, rz));
}
function cone(list, color, x, y, z, r, h, rx = 0, ry = 0, rz = 0, four = false) {
  pushGeo(list, four ? CONE4 : CONE7, color, mat4(x, y, z, rx, ry, rz, r, h, r));
}
function sphere(list, color, x, y, z, rx, ry = rx, rz = rx, low = false) {
  pushGeo(list, low ? SPH_LO : SPH_MED, color, mat4(x, y, z, 0, 0, 0, rx, ry, rz));
}
// 头部/发髻保形专用（唯一保留高细分的部位，确保面部轮廓不塌）
function sphereHead(list, color, x, y, z, rx, ry = rx, rz = rx) {
  pushGeo(list, SPH_HEAD, color, mat4(x, y, z, 0, 0, 0, rx, ry, rz));
}

// ---------- 阵营水墨调色 ----------
function col(hex) {
  return new THREE.Color(hex);
}
function sideTint(hex, side, amount = 0.36) {
  const c = col(hex);
  if (side === 'enemy') {
    c.lerp(new THREE.Color(0x3a2622), amount);
  }
  return c;
}

// ============================================================================
// 1. 武器库升级（严格遵循中国古代冷兵器真实形制，5000面预算内极致还原）
// ============================================================================
function buildWeapon(list, kind, look, side, hero = false) {
  const steel = 0xede8d8;         // 汉唐百炼钢锻造冷钢（象牙白银霜）
  const frostSteel = 0xf5f3eb;    // 极锋刃口霜寒亮银
  const darkSteel = 0x3d3b36;     // 淬火高碳钢中脊/熟铁配件
  const dark = 0x1f1d1b;          // 乌木/黑漆/缠绳
  const trim = sideTint(look.trim || 0xc9a25e, side, 0.08); // 鎏金铜件
  const wood = 0x523928;          // 枣红木/坚实硬木
  const cinnabar = 0xb23a2f;      // 纯正国风朱砂赤红
  const jade = 0x3d7866;          // 华夏温润青玉/翡翠

  switch (kind) {
    case 'sword': {
      // 【八面汉剑】形制：八面起脊长剑身、内收剑腰、锐利四棱剑尖、汉代倒凹字一字格嵌玉、防滑缠绳双手长柄、圆盘配重剑首、朱砂长剑穗
      // 1. 剑身八面结构：高挺中脊 + 两侧宽刃斜面 + 外缘双锋刃
      box(list, darkSteel, 0, 0.62, 0, 0.026, 0.76, 0.038); // 百炼钢厚重剑脊
      box(list, steel, 0, 0.62, 0, 0.076, 0.74, 0.024);     // 八面斜面主剑体
      wedge(list, frostSteel, 0.046, 0.62, 0, 0.020, 0.74, 0.022); // 右刃锋
      wedge(list, frostSteel, -0.046, 0.62, 0, 0.020, 0.74, 0.022, 0, Math.PI, 0); // 左刃锋
      // 内收剑腰与四棱破甲剑尖
      box(list, steel, 0, 1.01, 0, 0.062, 0.08, 0.022);
      cone(list, frostSteel, 0, 1.10, 0, 0.048, 0.16, 0, 0, 0, true);

      // 2. 汉代倒凹字一字剑格（两端微翘，格中正反两面嵌青玉）
      box(list, trim, 0, 0.22, 0, 0.16, 0.042, 0.065);
      box(list, trim, 0.09, 0.24, 0, 0.042, 0.050, 0.058, 0, 0, -0.28);
      box(list, trim, -0.09, 0.24, 0, 0.042, 0.050, 0.058, 0, 0, 0.28);
      box(list, jade, 0, 0.22, 0.034, 0.038, 0.038, 0.012, 0, 0, Math.PI / 4);
      box(list, jade, 0, 0.22, -0.034, 0.038, 0.038, 0.012, 0, 0, Math.PI / 4);

      // 3. 剑茎：双手握把，外缠三道防滑交叉扎线
      cyl(list, dark, 0, 0.11, 0, 0.022, 0.20, 0, 0, 0, 7);
      cyl(list, 0x6e261f, 0, 0.16, 0, 0.026, 0.018, 0, 0, 0, 7);
      cyl(list, 0x6e261f, 0, 0.11, 0, 0.026, 0.018, 0, 0, 0, 7);
      cyl(list, 0x6e261f, 0, 0.06, 0, 0.026, 0.018, 0, 0, 0, 7);

      // 4. 汉代同心圆盘剑首（配重平衡手腕）
      cyl(list, trim, 0, 0.01, 0, 0.048, 0.025, 0, 0, 0, 8);
      sphere(list, darkSteel, 0, 0.005, 0, 0.025, 0.01, 0.025, true);

      // 5. 剑首系挂翡翠平安扣与朱砂双丝长剑穗
      sphere(list, jade, 0, -0.025, 0, 0.018, 0.018, 0.012, true);
      cyl(list, cinnabar, 0.015, -0.09, 0, 0.008, 0.16, 0, 0, 0.15, 5);
      cyl(list, cinnabar, -0.015, -0.09, 0, 0.008, 0.16, 0, 0, -0.15, 5);

      // 6. 名将神兵专属（错金雷纹与剑夹吞口）
      if (hero) {
        box(list, trim, 0, 0.27, 0, 0.055, 0.065, 0.038);
        box(list, trim, 0, 0.48, 0.020, 0.008, 0.36, 0.004);
        box(list, trim, 0, 0.48, -0.020, 0.008, 0.36, 0.004);
      }
      break;
    }
    case 'glaive': {
      // 【冷艳锯青龙偃月刀】形制：宽大月牙弧面重刃、刀背倒勾冷艳锯齿、立体青龙吞口含刃、龙目嵌朱砂珠、长红木柄配三铜箍、尾部破甲三棱铁钻鐏
      // 1. 枣红坚实长木柄与三道鎏金铜箍
      cyl(list, 0x4a2c1e, 0, 0.68, 0, 0.025, 1.36, 0, 0, 0, 7);
      cyl(list, trim, 0, 0.28, 0, 0.032, 0.032, 0, 0, 0, 7);
      cyl(list, trim, 0, 0.72, 0, 0.032, 0.032, 0, 0, 0, 7);
      cyl(list, trim, 0, 1.18, 0, 0.032, 0.032, 0, 0, 0, 7);
      // 柄尾三棱破甲铁钻鐏（配重大刀前后平衡）
      cone(list, darkSteel, 0, 0.04, 0, 0.038, 0.16, Math.PI, 0, 0, true);

      // 2. 青龙吞口（睚眦大张利齿衔咬刀身底端，龙角后挑，朱砂龙目）
      box(list, trim, 0.04, 1.32, 0, 0.16, 0.14, 0.12);
      box(list, trim, 0.08, 1.38, 0, 0.14, 0.09, 0.10);
      wedge(list, trim, -0.03, 1.42, 0.045, 0.06, 0.11, 0.038, 0, 0, -0.6);
      wedge(list, trim, -0.03, 1.42, -0.045, 0.06, 0.11, 0.038, 0, 0, -0.6);
      sphere(list, 0xb23a2f, 0.065, 1.38, 0.062, 0.022, 0.022, 0.022, true);
      sphere(list, 0xb23a2f, 0.065, 1.38, -0.062, 0.022, 0.022, 0.022, true);
      cone(list, frostSteel, 0.13, 1.38, 0.042, 0.015, 0.035, 0, 0, -Math.PI / 2);
      cone(list, frostSteel, 0.13, 1.38, -0.042, 0.015, 0.035, 0, 0, -Math.PI / 2);

      // 3. 龙首下垂大团双层朱砂红刀缨
      cone(list, cinnabar, -0.05, 1.24, 0, 0.09, 0.28, Math.PI, 0, -0.32);
      cone(list, 0xd04838, -0.03, 1.18, 0.03, 0.07, 0.22, Math.PI, 0, -0.22);

      // 4. 偃月弧形重刀面（下宽中阔上挑尖）与白霜主刃
      box(list, steel, 0.12, 1.58, 0, 0.18, 0.40, 0.034, 0, 0, 0.10);
      box(list, steel, 0.18, 1.84, 0, 0.22, 0.36, 0.034, 0, 0, 0.24);
      wedge(list, steel, 0.22, 2.06, 0, 0.18, 0.32, 0.034, 0, 0, 0.52);
      wedge(list, frostSteel, 0.23, 1.58, 0, 0.065, 0.40, 0.028, 0, 0, 0.10);
      wedge(list, frostSteel, 0.31, 1.84, 0, 0.075, 0.36, 0.028, 0, 0, 0.24);

      // 5. 刀背青龙厚脊与“冷艳锯”三大倒勾背齿
      const bladeBackCol = look.bladeEdge || 0x2a4e3a;
      box(list, bladeBackCol, 0.05, 1.68, 0, 0.06, 0.62, 0.045, 0, 0, 0.15);
      wedge(list, steel, 0.02, 1.60, 0, 0.065, 0.08, 0.032, 0, 0, -0.85);
      wedge(list, steel, 0.08, 1.80, 0, 0.075, 0.09, 0.032, 0, 0, -0.75);
      wedge(list, steel, 0.15, 1.98, 0, 0.085, 0.10, 0.032, 0, 0, -0.65);
      break;
    }
    case 'halberd': {
      // 【方天画戟】形制：修长四棱直刺矛尖、左右对称双月牙耳刃、横向镂空支撑梁、金钱兽面吞口与浓密戟缨、黑漆木杆、四棱尾鐏
      cyl(list, dark, 0, 0.72, 0, 0.024, 1.44, 0, 0, 0, 7);
      cone(list, darkSteel, 0, 0.04, 0, 0.035, 0.18, Math.PI, 0, 0, true);

      // 神将专属：金龙蟠杆铜箍
      if (hero) {
        cyl(list, trim, 0, 0.36, 0, 0.032, 0.035, 0, 0, 0, 7);
        cyl(list, trim, 0, 0.76, 0, 0.032, 0.035, 0, 0, 0, 7);
        cyl(list, trim, 0, 1.16, 0, 0.032, 0.035, 0, 0, 0, 7);
      }

      // 金钱兽面吞口与双层浓密马鬃长缨
      box(list, trim, 0, 1.34, 0, 0.14, 0.10, 0.10);
      if (hero) {
        sphere(list, cinnabar, 0.05, 1.34, 0.055, 0.02, 0.02, 0.02, true);
        sphere(list, cinnabar, -0.05, 1.34, 0.055, 0.02, 0.02, 0.02, true);
      }
      cone(list, cinnabar, 0, 1.25, 0, 0.12, 0.30, Math.PI, 0, 0);
      cone(list, 0xd04838, 0, 1.18, 0, 0.09, 0.22, Math.PI, 0, 0.3);

      // 直刺四棱中矛长尖（带血槽凹面，雪白霜刃）
      cyl(list, darkSteel, 0, 1.42, 0, 0.032, 0.12, 0, 0, 0, 6);
      box(list, steel, 0, 1.58, 0, 0.065, 0.32, 0.026);
      cone(list, frostSteel, 0, 1.84, 0, 0.052, 0.30, 0, 0, 0, true);

      // 左右对称双月牙耳刃（大弧度双月牙，两端起锋锐尖角，翼展鲜明张扬）
      // 左月牙耳
      box(list, trim, 0.11, 1.48, 0, 0.16, 0.028, 0.022);
      box(list, trim, 0.11, 1.66, 0, 0.16, 0.028, 0.022);
      box(list, steel, 0.20, 1.57, 0, 0.035, 0.40, 0.022);
      wedge(list, frostSteel, 0.21, 1.79, 0, 0.052, 0.15, 0.022, 0, 0, 0.38);
      wedge(list, frostSteel, 0.21, 1.35, 0, 0.052, 0.15, 0.022, Math.PI, 0, -0.38);
      // 右月牙耳
      box(list, trim, -0.11, 1.48, 0, 0.16, 0.028, 0.022);
      box(list, trim, -0.11, 1.66, 0, 0.16, 0.028, 0.022);
      box(list, steel, -0.20, 1.57, 0, 0.035, 0.40, 0.022);
      wedge(list, frostSteel, -0.21, 1.79, 0, 0.052, 0.15, 0.022, 0, 0, -0.38);
      wedge(list, frostSteel, -0.21, 1.35, 0, 0.052, 0.15, 0.022, Math.PI, 0, 0.38);
      break;
    }
    case 'mace': {
      // 金装熟铜锏 / 亢龙四棱双金锏（华夏真实钝击神兵，秦琼专属）
      box(list, 0xd97706, 0, 0.65, 0, 0.052, 0.76, 0.052);
      for (let i = 0; i < 7; i++) {
        box(list, 0xf59e0b, 0, 0.35 + i * 0.08, 0, 0.068, 0.022, 0.068);
      }
      cone(list, 0xfef08a, 0, 1.08, 0, 0.046, 0.12, 0, 0, 0, true);
      box(list, 0xb45309, 0, 0.24, 0, 0.14, 0.038, 0.14);
      sphere(list, cinnabar, 0, 0.24, 0.07, 0.02, 0.02, 0.02, true);
      cyl(list, dark, 0, 0.12, 0, 0.024, 0.20, 0, 0, 0, 7);
      sphere(list, 0xd97706, 0, 0.01, 0, 0.038, 0.038, 0.038, true);
      box(list, cinnabar, 0, -0.08, 0, 0.03, 0.14, 0.015, 0, 0, 0.2);
      break;
    }
    case 'whip': {
      // 乌金十三节钢鞭 / 太公打神鞭（华夏真实硬鞭，尉迟恭/姜子牙专属）
      for (let i = 0; i < 11; i++) {
        const rad = 0.032 - i * 0.0015;
        cyl(list, darkSteel, 0, 0.32 + i * 0.07, 0, rad, 0.055, 0, 0, 0, 7);
        cyl(list, trim, 0, 0.355 + i * 0.07, 0, rad + 0.006, 0.016, 0, 0, 0, 7);
      }
      cone(list, steel, 0, 1.12, 0, 0.034, 0.14, 0, 0, 0, true);
      cone(list, trim, 0, 0.27, 0, 0.058, 0.08, 0, 0, 0, true);
      sphere(list, cinnabar, 0, 0.27, 0.035, 0.015, 0.015, 0.015, true);
      cyl(list, dark, 0, 0.14, 0, 0.024, 0.18, 0, 0, 0, 7);
      sphere(list, darkSteel, 0, 0.02, 0, 0.036, 0.036, 0.036, true);
      break;
    }
    case 'ramlog': {
      // 破城撞车吊锤：自顶部横梁（挂点原点）以铁索垂吊的包铁巨木撞杆
      const ramWood = sideTint(0x4a3826, side, 0.2);
      const ramDark = 0x241c14;
      const ramIron = sideTint(0x3a3a34, side, 0.15);
      // 两股吊索（前后各一，自横梁垂至锤身）
      cyl(list, ramDark, -0.55, -0.30, 0, 0.024, 0.60);
      cyl(list, ramDark, 0.55, -0.30, 0, 0.024, 0.60);
      box(list, trim, -0.55, -0.02, 0, 0.08, 0.06, 0.08);
      box(list, trim, 0.55, -0.02, 0, 0.08, 0.06, 0.08);
      // 巨木撞杆主身（横卧 X 向，前伸后收）
      cyl(list, ramWood, 0.05, -0.62, 0, 0.17, 2.1, Math.PI / 2, 0, 0, 8);
      // 杆身两道包铁箍环
      cyl(list, ramIron, -0.45, -0.62, 0, 0.185, 0.10, Math.PI / 2, 0, 0, 8);
      cyl(list, ramIron, 0.42, -0.62, 0, 0.185, 0.10, Math.PI / 2, 0, 0, 8);
      // 首端包铁大撞角（锥形冲前）
      cone(list, ramIron, 1.26, -0.62, 0, 0.20, 0.44, 0, 0, -Math.PI / 2);
      sphere(list, 0x22201c, 1.46, -0.62, 0, 0.085, 0.085, 0.085, true);
      // 尾部配重方木与铁钉
      box(list, ramDark, -1.08, -0.62, 0, 0.24, 0.32, 0.32);
      sphere(list, ramIron, -1.18, -0.62, 0, 0.06, 0.06, 0.06, true);
      break;
    }
    case 'spear': {
      // 【沥泉柳叶枪】形制：柳叶双弧起脊长锋、双面血槽凹面、四瓣鎏金莲花枪吞、大团蓬松张扬马鬃朱红长缨、白蜡杆木杆、尾部铜枪鐏
      cyl(list, 0x8a6f52, 0, 0.74, 0, 0.022, 1.48, 0, 0, 0, 7);
      cyl(list, trim, 0, 0.04, 0, 0.03, 0.08, 0, 0, 0, 7);
      cone(list, steel, 0, 0.01, 0, 0.026, 0.06, Math.PI);

      // 鎏金四瓣莲花枪吞
      cyl(list, trim, 0, 1.38, 0, 0.05, 0.08, 0, 0, 0, 8);
      box(list, trim, 0, 1.41, 0, 0.082, 0.038, 0.082, 0, 0.78, 0);

      // 蓬松张扬马鬃朱红长缨（三层层次）
      cone(list, cinnabar, 0, 1.32, 0, 0.12, 0.28, Math.PI, 0, 0);
      cone(list, cinnabar, 0, 1.26, 0, 0.09, 0.22, Math.PI, 0, 0.4);
      cone(list, 0xd04838, 0, 1.29, 0.02, 0.075, 0.24, Math.PI, 0, -0.3);

      // 柳叶起脊长锋与破甲长针尖
      box(list, darkSteel, 0, 1.56, 0, 0.024, 0.32, 0.034);
      box(list, steel, 0, 1.53, 0, 0.085, 0.24, 0.022);
      wedge(list, frostSteel, 0.048, 1.53, 0, 0.022, 0.24, 0.020);
      wedge(list, frostSteel, -0.048, 1.53, 0, 0.022, 0.24, 0.020, 0, Math.PI, 0);
      cone(list, frostSteel, 0, 1.74, 0, 0.05, 0.28, 0, 0, 0, true);
      break;
    }
    case 'fan': {
      // 【诸葛白鹤羽扇】形制：7根天然白鹤羽翎圆弧阶梯排列、立体羽轴与墨染羽尖、红木雕花柄嵌金环、翡翠平安扣双流苏
      // 润泽红木扇柄与金环
      cyl(list, 0x4a2c1e, 0, 0.20, 0, 0.022, 0.36, 0, 0, 0, 7);
      sphere(list, trim, 0, 0.04, 0, 0.038, 0.038, 0.038, true);
      sphere(list, jade, 0, -0.03, 0, 0.025, 0.025, 0.015, true);
      cyl(list, 0x4b7a6a, 0.015, -0.10, 0, 0.008, 0.16, 0, 0, 0.15, 5);
      cyl(list, 0x4b7a6a, -0.015, -0.10, 0, 0.008, 0.16, 0, 0, -0.15, 5);

      // 扇根青玉扣
      box(list, trim, 0, 0.38, 0, 0.09, 0.06, 0.06);
      sphere(list, jade, 0, 0.38, 0.032, 0.025, 0.025, 0.025, true);

      // 7 根圆弧阶梯排列的天然白鹤羽翎（叠羽立体羽轴 + 水墨晕染羽尖）
      for (let i = -3; i <= 3; i++) {
        const ang = i * 0.14;
        const len = 0.44 - Math.abs(i) * 0.045;
        const fx = Math.sin(ang) * 0.22;
        const fy = 0.40 + Math.cos(ang) * 0.24;
        // 羽身白鹤天然素色
        box(list, 0xf6f3e8, fx, fy, 0.005 * i, 0.08, len, 0.012, 0, 0, -ang);
        // 羽轴中脊
        box(list, 0xdcd6c4, fx, fy, 0.01 * i, 0.016, len * 1.05, 0.016, 0, 0, -ang);
        // 水墨浸染羽尖
        const tipX = fx + Math.sin(ang) * (len * 0.45);
        const tipY = fy + Math.cos(ang) * (len * 0.45);
        box(list, 0x2e424d, tipX, tipY, 0.012 * i, 0.076, 0.12, 0.014, 0, 0, -ang);
      }
      break;
    }
    case 'axe': {
      // 【宣花开山板斧】形制：开花状半月形大斧刃、飞翘双尖角、雷云镂空减重纹、厚实破甲后刺方锤、缠革短柄配防脱尾环
      cyl(list, 0x3a251a, 0, 0.38, 0, 0.030, 0.76, 0, 0, 0, 7);
      cyl(list, 0x6a452d, 0, 0.22, 0, 0.036, 0.02, 0, 0, 0, 7);
      cyl(list, 0x6a452d, 0, 0.32, 0, 0.036, 0.02, 0, 0, 0, 7);
      cyl(list, 0x6a452d, 0, 0.42, 0, 0.036, 0.02, 0, 0, 0, 7);
      sphere(list, darkSteel, 0, 0.02, 0, 0.045, 0.045, 0.045, true);

      // 加厚斧眼与铸铁套筒
      box(list, darkSteel, 0, 0.68, 0, 0.10, 0.16, 0.09);
      box(list, trim, 0, 0.68, 0.048, 0.08, 0.12, 0.02);

      // 宣花半月开花重斧刃与雷云镂空
      box(list, steel, 0.18, 0.68, 0, 0.26, 0.38, 0.04);
      box(list, dark, 0.14, 0.68, 0, 0.08, 0.16, 0.045);
      wedge(list, frostSteel, 0.26, 0.88, 0, 0.14, 0.18, 0.036, 0, 0, 0.48);
      wedge(list, frostSteel, 0.26, 0.48, 0, 0.14, 0.18, 0.036, Math.PI, 0, -0.48);
      wedge(list, frostSteel, 0.35, 0.68, 0, 0.10, 0.42, 0.034, 0, 0, 0);

      // 破甲后方锤与后背锥
      box(list, darkSteel, -0.10, 0.68, 0, 0.12, 0.12, 0.08);
      cone(list, steel, -0.19, 0.68, 0, 0.045, 0.14, 0, 0, Math.PI / 2, true);
      break;
    }
    case 'bow': {
      // 【汉代反曲大梢弓】形制：双曲反曲木胎包桦皮、两端起翘外翻黑角大弓梢、紧绷牛筋弦、搭三翎雕羽重箭
      // 反曲弓体双臂
      box(list, wood, -0.06, 0.22, 0, 0.036, 0.28, 0.028, 0, 0, 0.24);
      box(list, wood, -0.06, -0.22, 0, 0.036, 0.28, 0.028, 0, 0, -0.24);
      box(list, wood, -0.14, 0.42, 0, 0.032, 0.24, 0.026, 0, 0, 0.58);
      box(list, wood, -0.14, -0.42, 0, 0.032, 0.24, 0.026, 0, 0, -0.58);

      // 起翘外翻黑角大弓梢（Siyahs）配金箍弦垫
      box(list, dark, -0.08, 0.58, 0, 0.028, 0.18, 0.024, 0, 0, -0.42);
      box(list, dark, -0.08, -0.58, 0, 0.028, 0.18, 0.024, 0, 0, 0.42);
      box(list, trim, -0.08, 0.52, 0, 0.034, 0.04, 0.03);
      box(list, trim, -0.08, -0.52, 0, 0.034, 0.04, 0.03);

      // 缠黑皮握把与青铜搭箭台
      box(list, dark, 0, 0, 0.02, 0.055, 0.14, 0.055);
      box(list, trim, 0.035, 0.02, 0, 0.025, 0.02, 0.04);

      // 紧绷牛筋弦
      box(list, 0xe8e4d4, -0.04, 0, 0, 0.012, 0.88, 0.01);

      // 搭弦三翎雕羽重箭
      cyl(list, wood, 0.12, 0.02, 0, 0.010, 0.68, Math.PI / 2, 0, 0);
      cone(list, steel, 0.48, 0.02, 0, 0.022, 0.08, 0, 0, -Math.PI / 2, true);
      box(list, cinnabar, -0.16, 0.02, 0.02, 0.10, 0.025, 0.005);
      box(list, 0xf2ede2, -0.16, 0.02, -0.02, 0.10, 0.025, 0.005);
      break;
    }
    case 'staff': {
      // 【亢龙四棱十三节双金锏 / 策士法杖】形制：四面起棱金铜锏身、十三节立体竹节横楞、八角宝盘铜镡、缠绳握柄、末端配重八卦铜盘
      box(list, 0xc49a45, 0, 0.72, 0, 0.052, 0.86, 0.052);
      for (let i = 0; i < 13; i++) {
        box(list, 0xdbb058, 0, 0.35 + i * 0.065, 0, 0.072, 0.022, 0.072);
      }
      cyl(list, trim, 0, 0.28, 0, 0.085, 0.035, 0, 0, 0, 8);
      cyl(list, dark, 0, 0.14, 0, 0.026, 0.24, 0, 0, 0, 7);
      cyl(list, 0x6e261f, 0, 0.14, 0, 0.029, 0.02, 0, 0, 0, 7);
      sphere(list, trim, 0, 0.01, 0, 0.045, 0.045, 0.045, true);
      cone(list, 0xdbb058, 0, 1.18, 0, 0.036, 0.08, 0, 0, 0, true);

      // 若为策士法杖（如张角、姜子牙），顶部托起温润青玉八卦符节
      if (hero) {
        sphere(list, jade, 0, 1.25, 0, 0.065, 0.065, 0.065, true);
        box(list, cinnabar, 0, 1.34, 0, 0.030, 0.20, 0.02);
      }
      break;
    }
    case 'dagger': {
      // 【鱼肠双短匕】形制：双曲波浪鱼肠刃、双面开刃透甲锋、鎏金饕餮吞口与配重首、缠绳防滑握柄
      box(list, steel, 0, 0.32, 0, 0.052, 0.28, 0.022);
      wedge(list, frostSteel, 0.032, 0.32, 0, 0.02, 0.28, 0.020);
      wedge(list, frostSteel, -0.032, 0.32, 0, 0.02, 0.28, 0.020, 0, Math.PI, 0);
      cone(list, frostSteel, 0, 0.48, 0, 0.038, 0.14, 0, 0, 0, true);
      box(list, trim, 0, 0.17, 0, 0.09, 0.04, 0.04);
      sphere(list, cinnabar, 0, 0.17, 0.025, 0.015, 0.015, 0.015, true);
      cyl(list, dark, 0, 0.08, 0, 0.022, 0.15, 0, 0, 0, 6);
      sphere(list, trim, 0, 0.005, 0, 0.035, 0.035, 0.035, true);
      break;
    }
    case 'shield': {
      // 【步兵虎头大阵盾】形制：加厚八角硬木盾面、四方鎏金铜钉包边、盾心兽面虎头铜盘吐破阵尖锥、朱砂太极道符
      box(list, 0x4a3422, -0.22, 0.48, 0, 0.54, 0.94, 0.065);
      box(list, trim, -0.22, 0.94, 0.02, 0.56, 0.07, 0.075);
      box(list, trim, -0.22, 0.02, 0.02, 0.56, 0.07, 0.075);
      box(list, trim, -0.49, 0.48, 0.02, 0.07, 0.88, 0.075);
      box(list, trim, 0.05, 0.48, 0.02, 0.07, 0.88, 0.075);
      sphere(list, trim, -0.22, 0.50, 0.06, 0.12, 0.12, 0.05, true);
      cone(list, steel, -0.22, 0.50, 0.15, 0.05, 0.16, Math.PI / 2, 0, 0, true);
      box(list, cinnabar, -0.22, 0.74, 0.045, 0.18, 0.16, 0.02);
      box(list, 0xe8e2d2, -0.22, 0.74, 0.050, 0.06, 0.06, 0.025);
      break;
    }
    case 'firelance': {
      // 【火铳】形制：硬木铳托、锻铁铳管与鼓凸药室、望山准星、引火绳、朱砂铳缨
      box(list, wood, 0.02, 0.08, 0, 0.50, 0.10, 0.08);
      box(list, wood, -0.30, 0.03, 0, 0.16, 0.13, 0.075);
      cyl(list, darkSteel, 0.14, 0.17, 0, 0.042, 0.76, Math.PI / 2, 0, 0, 7);
      cyl(list, darkSteel, -0.20, 0.17, 0, 0.058, 0.20, Math.PI / 2, 0, 0, 7);
      cyl(list, trim, 0.14, 0.17, 0, 0.050, 0.06, Math.PI / 2, 0, 0, 7);
      cyl(list, trim, 0.50, 0.17, 0, 0.052, 0.07, Math.PI / 2, 0, 0, 7);
      box(list, trim, 0.30, 0.235, 0, 0.045, 0.045, 0.02);
      box(list, trim, -0.06, 0.015, 0, 0.03, 0.09, 0.022);
      cyl(list, 0x8a7a4a, -0.34, 0.20, 0.03, 0.012, 0.18, 0.35, 0, 0.2, 5);
      cone(list, cinnabar, 0.16, 0.10, 0, 0.06, 0.16, Math.PI, 0, -0.1);
      break;
    }
    case 'crossbow': {
      // 【秦汉重步弩】形制：宽厚木弩床、青铜望山悬刀扳机、反曲双钢臂、脚踏拓环
      box(list, wood, 0.08, 0.10, 0, 0.52, 0.085, 0.085);
      box(list, trim, -0.05, 0.16, 0, 0.03, 0.06, 0.02);
      box(list, trim, -0.05, 0.03, 0, 0.02, 0.04, 0.02);
      box(list, darkSteel, 0.32, 0.06, 0, 0.045, 0.40, 0.032, 0, 0, 0.48);
      box(list, darkSteel, 0.32, 0.06, 0, 0.045, 0.40, 0.032, 0, 0, -0.48);
      box(list, darkSteel, 0.36, 0.10, 0, 0.08, 0.02, 0.14);
      break;
    }
    case 'flag': {
      // 【阵前大纛帅旗】形制：帅旗大纛杆、金矛顶配朱红短缨、飘逸双燕尾火焰大旗、墨染图腾
      cyl(list, wood, 0, 0.90, 0, 0.024, 1.80, 0, 0, 0, 7);
      cone(list, trim, 0, 1.84, 0, 0.065, 0.18);
      cone(list, cinnabar, 0, 1.74, 0, 0.08, 0.14, Math.PI);
      box(list, cinnabar, 0.28, 1.40, 0, 0.52, 0.62, 0.02);
      box(list, trim, 0.54, 1.40, 0, 0.04, 0.64, 0.024);
      wedge(list, cinnabar, 0.28, 1.05, 0, 0.52, 0.16, 0.02);
      break;
    }
    case 'javelin': {
      // 【破军透甲短投矛】形制：坚韧短木杆、鎏金铜箍与朱砂短缨、细长破甲三棱矛尖
      cyl(list, wood, 0, 0.56, 0, 0.020, 1.10, 0, 0, 0, 6);
      cyl(list, trim, 0, 1.04, 0, 0.028, 0.04);
      cone(list, cinnabar, 0, 1.00, 0, 0.065, 0.14, Math.PI);
      box(list, steel, 0, 1.12, 0, 0.05, 0.16, 0.022);
      cone(list, frostSteel, 0, 1.25, 0, 0.04, 0.16, 0, 0, 0, true);
      break;
    }
    default:
      break;
  }

  if (hero) {
    sphere(list, trim, 0, 0.03, 0, 0.055, 0.055, 0.055, true);
  }
}

function buildWeaponGeometry(kind, look, side, hero) {
  const list = [];
  buildWeapon(list, kind, look, side, hero);
  return mergeGeos(list);
}

// ============================================================================
// 2. 人体系统重塑（黄金比例将军身段 + 细腻国风甲胄）
// ============================================================================
function buildHumanoid(list, look, side, opts = {}) {
  const cloth = sideTint(look.cloth, side);
  const armor = sideTint(look.armor, side);
  const trim = sideTint(look.trim || 0xc9a25e, side, 0.1);
  const skin = sideTint(look.skin || 0xd8c3a1, side, 0.12);
  const dark = side === 'enemy' ? 0x26201c : 0x242826;
  const cape = look.cape ? sideTint(look.cape, side) : null;
  const hero = !!look.hero;
  const cinnabar = 0xb23a2f;

  // ---------- 1. 云头战靴与小腿胫甲 (历史考据精装重制) ----------
  // 双脚微外八站立，站姿稳如泰山
  for (const dir of [-1, 1]) {
    const footX = dir * 0.13;
    // 战靴鞋身与牛皮厚底
    box(list, 0x22221e, footX, 0.06, 0.03, 0.14, 0.11, 0.24);
    box(list, 0x141412, footX, 0.015, 0.03, 0.145, 0.03, 0.25);
    // 云头靴翘头尖 (古制高翘防泥)
    wedge(list, 0x22221e, footX, 0.08, 0.17, 0.12, 0.09, 0.10, -0.3, 0, dir * 0.15);
    wedge(list, trim, footX, 0.09, 0.18, 0.06, 0.05, 0.06, -0.3, 0, dir * 0.15);
    // 紧扎胫甲与绑腿 (行军护膝腿札)
    cylTaper(list, armor, footX, 0.22, 0, 0.078, 0.066, 0.22, 0, 0, dir * 0.06, 8);
    // 护腿前后皮带与铜扣
    box(list, dark, footX, 0.18, 0, 0.16, 0.024, 0.16, 0, 0, dir * 0.06);
    box(list, dark, footX, 0.26, 0, 0.16, 0.024, 0.16, 0, 0, dir * 0.06);
    box(list, trim, footX, 0.18, 0.082, 0.035, 0.035, 0.02, 0, 0, dir * 0.06);
    box(list, trim, footX, 0.26, 0.082, 0.035, 0.035, 0.02, 0, 0, dir * 0.06);
    // 膝盖虎头/圆铜护膝 (Poleyn)
    sphere(list, trim, footX, 0.33, 0.05, 0.052, 0.052, 0.035, true);
    if (hero) {
      sphere(list, 0xb23a2f, footX, 0.33, 0.075, 0.025, 0.025, 0.02, true);
    }
  }

  // ---------- 2. 战袍下裳与分层战裙（彻底告别单一笨圆锥） ----------
  // 内衬下裳：稳实优雅的长袍内折
  cylTaper(list, cloth, 0, 0.44, 0, 0.22, 0.32, 0.44, 0, 0, 0, 7);
  // 外层抱肚战裙（前挡甲片与左右护腿甲片）
  box(list, armor, 0, 0.46, 0.12, 0.24, 0.38, 0.04, 0.08, 0, 0);
  box(list, trim, 0, 0.30, 0.13, 0.22, 0.04, 0.045, 0.08, 0, 0);
  // 左右护腰战裙
  box(list, cloth, -0.17, 0.45, 0, 0.12, 0.40, 0.24, 0, 0, 0.08);
  box(list, cloth, 0.17, 0.45, 0, 0.12, 0.40, 0.24, 0, 0, -0.08);

  // ---------- 3. 腰封、狮蛮宝带与佩玉 (历史考据武官形制) ----------
  // 宽牛皮腰封收束身形
  box(list, dark, 0, 0.72, 0, 0.44, 0.12, 0.28);
  // 鎏金/青玉束带与中心兽首腰扣 (狮蛮宝带)
  box(list, trim, 0, 0.72, 0.02, 0.46, 0.05, 0.29);
  box(list, trim, 0, 0.72, 0.15, 0.14, 0.11, 0.05);
  // 兽首浮雕眉眼
  sphere(list, 0xb23a2f, -0.035, 0.73, 0.175, 0.018, 0.018, 0.015, true);
  sphere(list, 0xb23a2f, 0.035, 0.73, 0.175, 0.018, 0.018, 0.015, true);
  sphere(list, 0x4b7a6a, 0, 0.70, 0.175, 0.032, 0.032, 0.02, true);
  // 左侧悬挂金玉战佩与鱼符
  box(list, trim, -0.22, 0.65, 0.08, 0.035, 0.12, 0.025, 0, 0, 0.08);
  box(list, 0x3d7866, -0.22, 0.56, 0.08, 0.045, 0.065, 0.018, 0, 0, 0.08);

  // ---------- 4. 躯干与明光重铠 (左右护心镜+背镜+前胸鱼鳞甲) ----------
  // 倒三角挺拔胸膛
  cylTaper(list, armor, 0, 0.94, 0, 0.29, 0.22, 0.38, 0, 0, 0, 8);
  // 胸前双凸起明光护心镜 (八面凸起带金边)
  sphere(list, trim, -0.10, 0.96, 0.16, 0.09, 0.09, 0.045, true);
  sphere(list, trim, 0.10, 0.96, 0.16, 0.09, 0.09, 0.045, true);
  sphere(list, steelSpecular(armor), -0.10, 0.96, 0.185, 0.065, 0.065, 0.035, true);
  sphere(list, steelSpecular(armor), 0.10, 0.96, 0.185, 0.065, 0.065, 0.035, true);
  // 后背护背大圆镜
  sphere(list, trim, 0, 0.96, -0.16, 0.10, 0.10, 0.04, true);
  sphere(list, steelSpecular(armor), 0, 0.96, -0.18, 0.07, 0.07, 0.03, true);
  // 胸口横束带与压甲金带
  box(list, trim, 0, 1.05, 0.15, 0.26, 0.035, 0.04);
  if (hero) {
    // 将领专属：前胸兽面腹吞与金蟒云纹
    sphere(list, trim, 0, 0.83, 0.16, 0.09, 0.07, 0.045, true);
    cone(list, 0xb23a2f, 0, 0.82, 0.18, 0.04, 0.05, Math.PI / 2, 0, 0, true);
  }

  // ---------- 5. 吞肩披膊与手臂护腕 ----------
  for (const dir of [-1, 1]) {
    const shoulderX = dir * 0.28;
    // 上层微翘兽面飞羽肩吞
    box(list, trim, shoulderX, 1.16, 0, 0.18, 0.08, 0.24, 0, 0, -dir * 0.15);
    wedge(list, trim, dir * 0.38, 1.18, 0, 0.08, 0.10, 0.22, 0, 0, dir * 0.4);
    // 下层护肩甲片
    box(list, armor, shoulderX, 1.08, 0, 0.16, 0.12, 0.22);

    // 上臂斜下自然微屈
    cyl(list, cloth, dir * 0.30, 0.94, 0, 0.056, 0.24, dir * 0.14, 0, 0, 6);
    // 小臂铁护腕（Vambraces）
    cylTaper(list, armor, dir * 0.33, 0.77, 0.02, 0.052, 0.045, 0.18, dir * 0.08, 0, 0, 6);
    box(list, trim, dir * 0.33, 0.77, 0.02, 0.07, 0.035, 0.07, 0, 0, dir * 0.08);
    // 手部（握拳持物立体低模块）
    box(list, skin, dir * 0.34, 0.65, 0.03, 0.065, 0.08, 0.075);
  }

  // ---------- 6. 颈部与立体生动的国风面部 ----------
  // 挺拔战颈与领口护颈
  cyl(list, skin, 0, 1.18, 0, 0.068, 0.14, 0, 0, 0, 6);
  box(list, armor, 0, 1.14, 0.02, 0.22, 0.06, 0.20);
  // 头部轮廓
  sphereHead(list, skin, 0, 1.34, 0.02, 0.16, 0.17, 0.16);
  // 国画工笔剑眉星目（微挑水墨神韵双眼）
  box(list, 0x17150f, -0.058, 1.365, 0.155, 0.042, 0.016, 0.02, 0, 0, 0.15);
  box(list, 0x17150f, 0.058, 1.365, 0.155, 0.042, 0.016, 0.02, 0, 0, -0.15);
  // 后脑黑发体块
  sphereHead(list, dark, 0, 1.32, -0.10, 0.15, 0.14, 0.13);

  // ---------- 7. 披风（将帅多折风动大披风，层次分明） ----------
  if (cape) {
    // 双肩狮首金玉佩扣
    sphere(list, trim, -0.18, 1.14, -0.12, 0.045, 0.045, 0.035, true);
    sphere(list, trim, 0.18, 1.14, -0.12, 0.045, 0.045, 0.035, true);
    cone(list, 0xb23a2f, -0.18, 1.08, -0.12, 0.035, 0.10, Math.PI);
    cone(list, 0xb23a2f, 0.18, 1.08, -0.12, 0.035, 0.10, Math.PI);

    // 中段主披风 (三折层叠微风鼓动)
    box(list, cape, 0, 0.94, -0.17, 0.46, 0.40, 0.032, -0.12, 0, 0);
    box(list, cape, -0.12, 0.92, -0.18, 0.22, 0.40, 0.028, -0.15, -0.10, -0.05);
    box(list, cape, 0.12, 0.92, -0.18, 0.22, 0.40, 0.028, -0.15, 0.10, 0.05);

    // 下半截向后下方展开飘扬 (气势磅礴)
    box(list, cape, 0, 0.62, -0.26, 0.54, 0.44, 0.026, -0.24, 0, 0);
    box(list, cape, -0.16, 0.60, -0.28, 0.26, 0.44, 0.024, -0.28, -0.12, -0.08);
    box(list, cape, 0.16, 0.60, -0.28, 0.26, 0.44, 0.024, -0.28, 0.12, 0.08);

    // 披风下摆双道鎏金水墨滚边
    box(list, trim, 0, 0.41, -0.32, 0.58, 0.045, 0.035, -0.24, 0, 0);
    box(list, 0x17150f, 0, 0.43, -0.31, 0.56, 0.020, 0.038, -0.24, 0, 0);

    if (hero) {
      // 名将披风后摆带燕尾飞扬
      wedge(list, cape, -0.18, 0.35, -0.34, 0.20, 0.14, 0.025, -0.32, 0, -0.10);
      wedge(list, cape, 0.18, 0.35, -0.34, 0.20, 0.14, 0.025, -0.32, 0, 0.10);
    }
  }

  // ---------- 8. 美髯公胡须 ----------
  if (look.beard) {
    const beardCol = side === 'enemy' ? 0x2c2622 : 0x3d352e;
    // 上唇胡髭
    box(list, beardCol, 0, 1.28, 0.165, 0.10, 0.025, 0.03);
    // 下颌长髯两段垂落
    cone(list, beardCol, 0, 1.16, 0.15, 0.09, 0.22, Math.PI + 0.12, 0, 0);
    cone(list, beardCol, 0, 1.00, 0.17, 0.06, 0.18, Math.PI + 0.18, 0, 0);
  }

  // ---------- 9. 九大国风头盔/头饰重构 ----------
  const helm = look.helmet || 'bun';
  const metal = look.hero ? trim : armor;

  if (helm === 'cone') {
    // 宋式钵胄铁盔：盔体、盔梁、宝顶红缨、两侧顿项护耳
    cyl(list, dark, 0, 1.42, 0, 0.185, 0.06);
    cone(list, metal, 0, 1.54, 0, 0.18, 0.24, 0, 0, 0, 7);
    // 盔顶金宝珠与红缨
    sphere(list, trim, 0, 1.66, 0, 0.04, 0.04, 0.04, true);
    cone(list, 0xb23a2f, 0, 1.72, -0.04, 0.045, 0.16, -0.4, 0, 0);
    // 两侧护耳顿项
    box(list, armor, -0.17, 1.36, -0.02, 0.035, 0.16, 0.14, 0, 0, 0.1);
    box(list, armor, 0.17, 1.36, -0.02, 0.035, 0.16, 0.14, 0, 0, -0.1);
  } else if (helm === 'brim') {
    // 笠式大檐盔：飞翘大笠檐、鎏金盔梁与红缨
    cyl(list, dark, 0, 1.42, 0, 0.26, 0.035);
    wedge(list, metal, 0, 1.44, 0.14, 0.32, 0.04, 0.16, 0.15, 0, 0);
    cone(list, metal, 0, 1.52, 0, 0.17, 0.18, 0, 0, 0, 7);
    sphere(list, trim, 0, 1.62, 0, 0.035, 0.035, 0.035, true);
    box(list, trim, 0, 1.45, 0.16, 0.05, 0.07, 0.04);
  } else if (helm === 'straw') {
    // 八角编织斗笠：立体折面、笠顶结、后微翘
    cone(list, 0xb8aa78, 0, 1.48, 0, 0.36, 0.16, -0.08, 0, 0, 7);
    sphere(list, 0x6a5438, 0, 1.57, -0.02, 0.035, 0.035, 0.035, true);
    cyl(list, 0x8a7a52, 0, 1.43, -0.01, 0.18, 0.03);
  } else if (helm === 'crest') {
    // 凤翅兜鍪：两侧金凤展翅、高耸红缨、吕布双雉尾翎羽
    cyl(list, dark, 0, 1.42, 0, 0.19, 0.06);
    sphereHead(list, metal, 0, 1.49, 0, 0.19, 0.13, 0.18);
    // 两侧飞天金凤翅
    wedge(list, trim, -0.19, 1.54, 0, 0.04, 0.18, 0.16, 0, 0, 0.4);
    wedge(list, trim, 0.19, 1.54, 0, 0.04, 0.18, 0.16, 0, 0, -0.4);
    // 居中立翎红缨
    box(list, 0xb23a2f, 0, 1.64, -0.02, 0.04, 0.22, 0.14, -0.15, 0, 0);
    // 吕布等神将双雉翎（分段起伏优美曲线）
    if (look.plume) {
      for (const dir of [-1, 1]) {
        // 第一段向上向外
        box(list, 0xb23a2f, dir * 0.10, 1.72, -0.02, 0.022, 0.32, 0.025, -0.2, 0, dir * 0.3);
        // 第二段向后下飘垂
        box(list, 0xc9a25e, dir * 0.18, 1.88, -0.10, 0.020, 0.28, 0.022, -0.6, 0, dir * 0.15);
      }
    }
  } else if (helm === 'horn') {
    // 西楚霸王/重甲双角盔：两段式威武巨角、护额铁面
    cyl(list, dark, 0, 1.42, 0, 0.20, 0.07);
    sphereHead(list, metal, 0, 1.49, 0, 0.20, 0.14, 0.19);
    for (const dir of [-1, 1]) {
      cone(list, trim, dir * 0.18, 1.56, 0, 0.05, 0.22, 0, 0, dir * 0.7);
      cone(list, steelSpecular(metal), dir * 0.28, 1.68, 0, 0.038, 0.20, 0, 0, dir * 0.3);
    }
    box(list, trim, 0, 1.46, 0.17, 0.12, 0.06, 0.04);
  } else if (helm === 'crown') {
    // 冕冠/平天冠：长方天板、前后垂旒玉珠、金簪横贯
    cyl(list, dark, 0, 1.45, 0, 0.17, 0.10);
    box(list, 0x1f1f1a, 0, 1.58, 0.02, 0.34, 0.04, 0.44, 0.06, 0, 0);
    box(list, trim, 0, 1.58, 0.02, 0.36, 0.045, 0.05, 0.06, 0, 0);
    // 英雄平天冠前后垂旒
    if (hero) {
      for (let i = -2; i <= 2; i++) {
        box(list, 0xe8e2d2, i * 0.06, 1.50, 0.24, 0.015, 0.16, 0.015);
        box(list, 0xe8e2d2, i * 0.06, 1.50, -0.20, 0.015, 0.16, 0.015);
      }
    }
    // 横贯金簪
    cyl(list, trim, 0, 1.48, 0, 0.015, 0.36, 0, 0, Math.PI / 2);
  } else if (helm === 'hood') {
    // 刺客夜行兜帽：贴身裹头、深邃暗影、后垂飘角
    sphereHead(list, dark, 0, 1.38, -0.01, 0.21, 0.22, 0.20);
    cone(list, dark, 0, 1.50, -0.10, 0.16, 0.22, -0.5, 0, 0);
    box(list, 0x17150f, 0, 1.30, 0.14, 0.16, 0.08, 0.05); // 护口蒙面巾
  } else if (helm === 'bun') {
    // 侠士束发高髻：端正发髻、雕花金箍、横穿发簪、后垂发带
    sphereHead(list, dark, 0, 1.50, -0.08, 0.11, 0.11, 0.10);
    cyl(list, trim, 0, 1.44, -0.02, 0.16, 0.04);
    cyl(list, trim, 0, 1.48, -0.08, 0.012, 0.26, 0, 0, Math.PI / 2);
    box(list, cinnabar, 0, 1.38, -0.17, 0.06, 0.22, 0.015, -0.15, 0, 0); // 飘逸发带
  } else {
    sphere(list, dark, 0, 1.34, -0.02, 0.17, 0.17, 0.17);
  }

  // ---------- 10. 英雄专属装饰（玉佩、背旗、胸甲宝珠） ----------
  if (look.hero) {
    // 腰带垂挂长玉佩绦带
    box(list, trim, 0.10, 0.54, 0.14, 0.06, 0.36, 0.02, 0, 0, 0.08);
    sphere(list, 0x4b7a6a, 0.10, 0.40, 0.14, 0.03, 0.03, 0.02, true);
    // 威武背旗（岳飞/韩信等）
    if (look.banner) {
      cyl(list, 0x4a3a2a, -0.20, 1.46, -0.20, 0.016, 1.25);
      box(list, look.banner, 0.02, 1.86, -0.20, 0.42, 0.48, 0.016, 0, 0, 0.04);
      box(list, trim, 0.21, 1.86, -0.19, 0.03, 0.52, 0.02);
      wedge(list, look.banner, 0.02, 1.56, -0.20, 0.42, 0.12, 0.016);
    }
  }

  // 敌方辨识标记：赤煞盔缨
  if (side === 'enemy' && !hero) {
    box(list, 0x8a2a20, 0, 1.68, -0.03, 0.05, 0.22, 0.11, -0.14, 0, 0);
  }

  // 特殊兵种附加件
  if (look.extra === 'backflag') {
    cyl(list, 0x5a4a32, -0.16, 1.32, -0.18, 0.016, 0.94);
    box(list, side === 'enemy' ? 0x8a2a20 : 0x4b7a6a, -0.02, 1.64, -0.18, 0.32, 0.26, 0.016, 0, 0, 0.05);
  } else if (look.extra === 'sash') {
    box(list, 0xb23a2f, 0, 1.00, 0.17, 0.10, 0.64, 0.02, 0, 0, 0.5);
  }

  // 副手装备
  if (look.offhand === 'shield' || look.offhand === 'towerShield') {
    const isTower = look.offhand === 'towerShield';
    const h = isTower ? 0.84 : 0.58;
    const w = isTower ? 0.38 : 0.32;
    box(list, sideTint(0x7a6a52, side, 0.2), 0.38, 0.88, 0.12, 0.06, h, w, 0, 0.4, 0);
    box(list, trim, 0.40, 0.88, 0.12, 0.07, h * 0.94, 0.05, 0, 0.4, 0);
    sphere(list, trim, 0.42, 0.88, 0.12, 0.04, 0.06, 0.04, true);
  } else if (look.offhand === 'quiver') {
    cyl(list, 0x5a4232, -0.28, 0.96, -0.12, 0.055, 0.46, 0.35, 0, 0, 6);
    for (let i = 0; i < 3; i++) {
      cyl(list, 0xe0dcce, -0.34 + i * 0.045, 1.26, -0.22 + i * 0.02, 0.008, 0.26);
    }
  } else if (look.offhand === 'pot') {
    sphere(list, 0x6a4a3a, -0.32, 0.96, 0.10, 0.14, 0.16, 0.14, true);
    cyl(list, 0xb23a2f, -0.32, 1.08, 0.10, 0.06, 0.05, 0, 0, 0, 6);
  } else if (look.offhand === 'medicine') {
    box(list, 0xe8e2d2, -0.32, 0.96, 0.12, 0.18, 0.22, 0.12);
    box(list, 0xb23a2f, -0.32, 1.00, 0.19, 0.12, 0.035, 0.02);
    box(list, 0xb23a2f, -0.32, 1.00, 0.19, 0.035, 0.12, 0.02);
  } else if (look.offhand === 'gourd') {
    sphere(list, 0xb8aa78, -0.36, 0.72, 0.12, 0.09, 0.12, 0.09, true);
    sphere(list, 0xb8aa78, -0.36, 0.84, 0.12, 0.06, 0.07, 0.06, true);
    cyl(list, 0x5a4232, -0.36, 0.90, 0.12, 0.018, 0.07);
  } else if (look.offhand === 'talisman') {
    box(list, 0xf0ece0, -0.30, 0.84, 0.16, 0.10, 0.22, 0.015, 0, 0, 0.1);
    box(list, 0xb23a2f, -0.30, 0.84, 0.17, 0.025, 0.16, 0.01);
  } else if (look.offhand === 'mace') {
    box(list, 0xd97706, -0.32, 0.78, 0.12, 0.046, 0.65, 0.046, 0, 0, 0.2);
    box(list, 0xb45309, -0.32, 0.52, 0.12, 0.12, 0.032, 0.12, 0, 0, 0.2);
    cone(list, 0xfef08a, -0.32, 1.15, 0.12, 0.042, 0.11, 0, 0, 0.2, true);
  } else if (look.offhand === 'sword') {
    box(list, 0x3d3b36, -0.32, 0.75, 0.12, 0.024, 0.68, 0.032, 0, 0, 0.25);
    box(list, 0xf5f3eb, -0.32, 0.75, 0.12, 0.065, 0.66, 0.020, 0, 0, 0.25);
    box(list, trim, -0.32, 0.46, 0.12, 0.14, 0.038, 0.055, 0, 0, 0.25);
    cone(list, 0xf5f3eb, -0.32, 1.12, 0.12, 0.042, 0.14, 0, 0, 0.25, true);
  } else if (look.offhand === 'halberd') {
    cyl(list, dark, -0.32, 0.65, 0.12, 0.028, 0.75, 0, 0, 0.2);
    cone(list, 0xf5f3eb, -0.32, 1.08, 0.12, 0.045, 0.22, 0, 0, 0.2, true);
    box(list, trim, -0.32, 0.95, 0.12, 0.16, 0.03, 0.05, 0, 0, 0.2);
  } else if (look.offhand === 'dagger') {
    box(list, 0xd5d0c0, -0.32, 0.72, 0.10, 0.04, 0.30, 0.02);
  }
}

function steelSpecular(color) {
  const c = col(color);
  c.lerp(new THREE.Color(0xffffff), 0.35);
  return c;
}

// ============================================================================
// 3. 战马骑兵系统重塑（健硕昂扬的千里良驹）
// ============================================================================
function buildMounted(list, look, side) {
  const coat = look.mount === 'white' ? 0xeae6d8
    : look.mount === 'black' ? 0x22201e
      : look.mount === 'red' ? 0x7a2c24 : 0x5a3e2e;
  const mane = look.mount === 'white' ? 0xa89a82 : 0x1a1816;
  const hoof = 0x22221e;

  // 马身（饱满强壮的躯干，胸阔腰实）
  pushGeo(list, new THREE.CapsuleGeometry(0.32, 0.76, 2, 6), sideTint(coat, side, 0.24),
    mat4(0, 0.98, 0, 0, 0, Math.PI / 2, 1, 1, 1));

  // 昂扬挺拔的马颈与有骨骼棱角的马头
  cylTaper(list, coat, 0.58, 1.24, 0, 0.16, 0.25, 0.58, 0, 0, 0.72, 6);
  box(list, coat, 0.78, 1.44, 0, 0.32, 0.20, 0.20);
  wedge(list, coat, 0.92, 1.42, 0, 0.12, 0.16, 0.18, 0, 0, -0.3); // 马鼻吻部收细
  // 立体马耳
  cone(list, coat, 0.74, 1.62, 0.08, 0.045, 0.15, 0, 0, -0.2);
  cone(list, coat, 0.74, 1.62, -0.08, 0.045, 0.15, 0, 0, -0.2);
  // 起伏修长的马鬃
  box(list, mane, 0.48, 1.38, 0, 0.10, 0.38, 0.07);
  box(list, mane, 0.62, 1.50, 0, 0.08, 0.24, 0.07);
  // 飘逸向后下方垂洒的马尾
  cone(list, mane, -0.66, 0.96, 0, 0.09, 0.48, 0, 0, 0.9);
  cone(list, mane, -0.80, 0.78, 0, 0.06, 0.36, 0, 0, 0.7);

  // 四腿（肌肉关节折角与蹄铁）
  const legs = [
    [0.36, 0.22, 1], [0.36, -0.22, 1], [-0.36, 0.20, -1], [-0.36, -0.20, -1],
  ];
  for (const [x, z, dir] of legs) {
    // 大腿骨骼
    cylTaper(list, coat, x, 0.56, z, 0.085, 0.065, 0.36, 0, 0, dir * 0.08, 6);
    // 小腿与坚硬蹄铁
    cyl(list, coat, x + dir * 0.02, 0.24, z, 0.055, 0.38, 0, 0, 0, 6);
    box(list, hoof, x + dir * 0.02, 0.04, z, 0.13, 0.08, 0.14);
  }

  // 精美朱砂鞍鞯（Saddle & Blanket）
  box(list, 0xb23a2f, 0, 1.20, 0, 0.44, 0.08, 0.40);
  box(list, 0xc9a25e, 0, 1.26, 0, 0.32, 0.06, 0.34);
  // 前后鞍桥高耸
  box(list, 0xc9a25e, 0.16, 1.30, 0, 0.06, 0.10, 0.30);
  box(list, 0xc9a25e, -0.16, 1.30, 0, 0.06, 0.10, 0.30);
  // 垂挂铜马镫
  cyl(list, 0xc9a25e, 0, 0.88, 0.23, 0.035, 0.06);
  cyl(list, 0xc9a25e, 0, 0.88, -0.23, 0.035, 0.06);

  // 骑手（合批装载并微前倾，英姿勃发）
  const rider = [];
  const riderLook = { ...look, cape: look.hero ? look.cape : null };
  buildHumanoid(rider, riderLook, side, { mounted: true });
  const m = mat4(0.02, 1.12, 0, 0, 0, 0, 0.86, 0.86, 0.86);
  for (const g of rider) {
    g.applyMatrix4(m);
    list.push(g);
  }
}

// ============================================================================
// 4. 建筑与攻城器械重塑（飞檐歇山、榫卯重器）
// ============================================================================
function buildBuilding(list, look, side, kind) {
  const cloth = sideTint(look.cloth, side, 0.2);
  const armor = sideTint(look.armor, side, 0.2);
  const trim = sideTint(look.trim || 0xc9a25e, side, 0.1);
  const wood = sideTint(0x5a4430, side, 0.25);
  const darkWood = 0x221c16;
  const stone = 0x767066;

  if (kind === 'tower' || kind === 'repeater') {
    // 基础防御城楼：青石台基、四柱加固斜撑、木望台美人靠
    box(list, stone, 0, 0.14, 0, 1.9, 0.28, 1.9);
    for (let i = 0; i < 4; i++) {
      const x = i % 2 === 0 ? -0.58 : 0.58;
      const z = i < 2 ? -0.58 : 0.58;
      box(list, wood, x, 0.98, z, 0.14, 1.6, 0.14);
    }
    // X 型加固斜撑
    box(list, darkWood, 0, 0.88, 0.58, 1.1, 0.08, 0.06, 0, 0, 0.55);
    box(list, darkWood, 0, 0.88, 0.58, 1.1, 0.08, 0.06, 0, 0, -0.55);
    box(list, darkWood, 0, 0.88, -0.58, 1.1, 0.08, 0.06, 0, 0, 0.55);
    box(list, darkWood, 0, 0.88, -0.58, 1.1, 0.08, 0.06, 0, 0, -0.55);
    // 二层望台底板与木栏杆
    box(list, armor, 0, 1.76, 0, 1.6, 0.14, 1.6);
    box(list, wood, 0, 1.92, 0.74, 1.5, 0.24, 0.06);
    box(list, wood, 0, 1.92, -0.74, 1.5, 0.24, 0.06);
    box(list, wood, -0.74, 1.92, 0, 0.06, 0.24, 1.4);
    box(list, wood, 0.74, 1.92, 0, 0.06, 0.24, 1.4);

    if (kind === 'repeater') {
      // ===== 连弩塔特色：楼上架设重型机动大连弩 (Large Zhuge Repeating Crossbow) =====
      // 1. 底座重木回转机台
      cyl(list, darkWood, 0, 1.84, 0.15, 0.42, 0.16);
      // 2. 重弩机身大梁
      box(list, 0x423224, 0, 2.02, 0.32, 0.36, 0.24, 1.15);
      // 3. 左右横向延展的强力复合弩臂
      box(list, 0x2e241c, -0.52, 2.04, 0.76, 0.65, 0.10, 0.10, 0, 0.38, 0);
      box(list, 0x2e241c, 0.52, 2.04, 0.76, 0.65, 0.10, 0.10, 0, -0.38, 0);
      box(list, trim, -0.84, 2.04, 0.88, 0.14, 0.14, 0.14);
      box(list, trim, 0.84, 2.04, 0.88, 0.14, 0.14, 0.14);
      // 4. 重磅粗钢弦
      box(list, 0xf0efe6, -0.36, 2.04, 0.55, 0.54, 0.025, 0.025, 0, -0.58, 0);
      box(list, 0xf0efe6, 0.36, 2.04, 0.55, 0.54, 0.025, 0.025, 0, 0.58, 0);
      // 5. 诸葛连弩长方形立式重型弹仓 (突出装弹箱)
      box(list, darkWood, 0, 2.32, 0.32, 0.32, 0.48, 0.56);
      box(list, trim, 0, 2.48, 0.32, 0.34, 0.06, 0.58);
      box(list, trim, 0, 2.18, 0.32, 0.34, 0.06, 0.58);
      // 侧方推拉上弦把手
      cyl(list, trim, 0.24, 2.30, 0.18, 0.04, 0.52, 0.45, 0, 0);
      sphere(list, darkWood, 0.24, 2.52, 0.05, 0.08, 0.08, 0.08, true);
      // 6. 前端机首青铜破风防护板与三联装箭槽
      box(list, armor, 0, 2.02, 0.70, 0.76, 0.30, 0.10);
      for (const rx of [-0.10, 0.0, 0.10]) {
        box(list, 0xc9a25e, rx, 2.04, 0.90, 0.04, 0.04, 0.42);
        cone(list, 0xd5d0c0, rx, 2.04, 1.12, 0.05, 0.12, Math.PI / 2, 0, 0);
      }

      // 连弩塔飞檐顶（略抬高，露出雄伟的大连弩）
      cone(list, cloth, 0, 2.72, 0, 1.35, 0.55, 0, Math.PI / 4, 0, true);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        wedge(list, cloth, Math.cos(a) * 0.95, 2.48, Math.sin(a) * 0.95, 0.28, 0.14, 0.28, 0, -a, 0.35);
      }
      cyl(list, trim, 0, 3.06, 0, 0.05, 0.28);
      sphere(list, trim, 0, 3.20, 0, 0.08, 0.08, 0.08, true);
    } else {
      // ===== 箭塔特色：楼上驻守一名引弓待发的 3D 弓箭手 (Archer) =====
      // 弓箭手双腿站姿
      box(list, darkWood, -0.08, 1.88, 0.18, 0.09, 0.24, 0.09);
      box(list, darkWood, 0.08, 1.88, 0.18, 0.09, 0.24, 0.09);
      // 身躯甲胄与束腰
      box(list, cloth, 0.0, 2.08, 0.18, 0.28, 0.36, 0.22);
      box(list, trim, 0.0, 2.00, 0.18, 0.30, 0.06, 0.24);
      // 头部与发髻
      sphere(list, 0xefd8c0, 0.0, 2.32, 0.20, 0.10, 0.10, 0.10, true);
      box(list, cloth, 0.0, 2.38, 0.20, 0.22, 0.08, 0.22);
      cone(list, darkWood, 0.0, 2.45, 0.18, 0.05, 0.10);
      // 双臂持弓瞄准姿态（左臂前伸推弓，右臂后拉满弦）
      box(list, cloth, 0.18, 2.14, 0.38, 0.08, 0.08, 0.28, 0.15, 0.35, 0);
      box(list, cloth, -0.16, 2.12, 0.16, 0.08, 0.08, 0.18, -0.25, -0.2, 0);
      // 战弓本体（上下弧形弓臂与握把）
      box(list, 0x5a3318, 0.26, 2.14, 0.52, 0.05, 0.38, 0.05);
      box(list, 0x8a522a, 0.26, 2.38, 0.48, 0.04, 0.22, 0.04, 0.45, 0, 0);
      box(list, 0x8a522a, 0.26, 1.90, 0.48, 0.04, 0.22, 0.04, -0.45, 0, 0);
      // 紧绷弓弦与待发箭矢
      box(list, 0xf0efe6, 0.22, 2.14, 0.42, 0.02, 0.48, 0.02);
      box(list, 0xc9a25e, 0.18, 2.15, 0.38, 0.03, 0.03, 0.42, 0.1, 0.25, 0);
      cone(list, 0xd5d0c0, 0.24, 2.17, 0.60, 0.05, 0.10, Math.PI / 2, 0, 0);
      // 背后箭囊插箭
      box(list, 0x3d2b1f, -0.12, 2.10, 0.06, 0.12, 0.32, 0.12, 0.25, 0, 0.35);

      // 传统飞檐攒尖顶
      cone(list, cloth, 0, 2.52, 0, 1.35, 0.65, 0, Math.PI / 4, 0, true);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        wedge(list, cloth, Math.cos(a) * 0.95, 2.28, Math.sin(a) * 0.95, 0.28, 0.14, 0.28, 0, -a, 0.35);
      }
      cyl(list, trim, 0, 2.92, 0, 0.05, 0.32);
      sphere(list, trim, 0, 3.08, 0, 0.08, 0.08, 0.08, true);
    }
    // 楼头战旗
    cyl(list, wood, -0.92, 2.0, -0.45, 0.025, 2.6);
    box(list, 0xb23a2f, -0.70, 2.90, -0.45, 0.48, 0.60, 0.02, 0, 0, -0.04);
  } else if (kind === 'drum') {
    // 战鼓台：八角稳固实木台基、牛皮大红战鼓、金钉环绕、鼓槌与斜插大纛
    box(list, wood, 0, 0.12, 0, 1.4, 0.24, 1.1);
    box(list, wood, -0.48, 0.64, 0, 0.12, 1.0, 0.12);
    box(list, wood, 0.48, 0.64, 0, 0.12, 1.0, 0.12);
    // 大红皮鼓
    cyl(list, 0x7a241e, 0, 1.08, 0, 0.48, 0.56, Math.PI / 2);
    cyl(list, 0xb23a2f, 0, 1.08, 0.29, 0.45, 0.04);
    cyl(list, 0xb23a2f, 0, 1.08, -0.29, 0.45, 0.04);
    // 鼓圈一圈鎏金铜钉
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      sphere(list, trim, Math.cos(a) * 0.42, 1.08 + Math.sin(a) * 0.42, 0.30, 0.03, 0.03, 0.03, true);
    }
    // 鼓槌与旌旗
    cyl(list, 0xc9a25e, 0.25, 1.16, 0.36, 0.015, 0.30, 0, 0, 0.7);
    cyl(list, 0xc9a25e, -0.25, 1.16, 0.36, 0.015, 0.30, 0, 0, -0.7);
    cyl(list, wood, -0.66, 1.62, -0.32, 0.024, 1.45);
    box(list, 0xb23a2f, -0.42, 2.12, -0.32, 0.42, 0.46, 0.02);
  } else if (kind === 'tent') {
    // 医帐：八角水墨行军大帐、飞角翘顶、门帘挽起露出内帐、红十字药葫芦旗
    cyl(list, 0xe8e2d2, 0, 0.58, 0, 1.05, 1.08, 0, 0, 0, 7);
    cone(list, 0xe8e2d2, 0, 1.44, 0, 1.34, 0.88, 0, Math.PI / 4, 0, true);
    cone(list, trim, 0, 0.68, 0, 1.10, 0.16, 0, 0, 0, true);
    // 帐门挽起
    box(list, 0x242420, 0, 0.46, 0.98, 0.65, 0.84, 0.03);
    box(list, 0xd8d2c0, -0.28, 0.46, 0.99, 0.16, 0.84, 0.035);
    box(list, 0xd8d2c0, 0.28, 0.46, 0.99, 0.16, 0.84, 0.035);
    // 帐顶红十字药旗
    cyl(list, wood, 0, 1.96, 0, 0.04, 0.36);
    box(list, 0xf0ece0, 0.28, 1.84, 0.04, 0.38, 0.38, 0.02);
    box(list, 0xb23a2f, 0.28, 1.84, 0.05, 0.08, 0.26, 0.015);
    box(list, 0xb23a2f, 0.28, 1.84, 0.05, 0.26, 0.08, 0.015);
    } else if (kind === 'greatwall') {
    // =========================================================================
    // 蒙恬专属神将技能实体：秦万里长城 · 金汤关隘城楼（告别简陋木拒马，重现万仞长城）
    // =========================================================================
    const stoneDark = sideTint(0x2d2b28, side, 0.2);   // 夯土黑石青砖基座
    const stoneMid = sideTint(0x44403c, side, 0.2);    // 垛口与腰线青条石
    const stoneLight = sideTint(0x78716c, side, 0.15); // 汉白玉额枋与马道铺石
    const roofBlack = 0x1c1917;                        // 大秦玄黑筒瓦歇山顶
    const woodColumn = 0x241d18;                       // 关楼红黑玄木八大立柱
    const redLacquer = 0x7f1d1d;                       // 关楼梁枋与美人靠朱红漆
    const bronzeGold = 0xc9a25e;                       // 鎏金门钉与宝顶金刹
    const ironBlack = 0x141414;                        // 生铁包角重甲闸门
    const flameGold = 0xf59e0b;                        // 狼烟火盆烈焰

    // 1. 厚重巍峨的秦长城夯土城台基座 (跨度宽广扎实，Z轴延展 4.8米彻底封锁关口)
    box(list, stoneDark, 0, 0.65, 0, 2.2, 1.3, 4.8);
    // 基础城脚加厚护坡 (梯形出挑护脚)
    box(list, 0x1f1d1b, 0, 0.12, 0, 2.5, 0.24, 5.0);
    // 城台顶端马道外挑腰线石檐
    box(list, stoneMid, 0, 1.34, 0, 2.36, 0.12, 4.96);

    // 2. 瓮城生铁铁闸门洞与金钉兽面拱门 (X 轴正反面深邃关门)
    box(list, 0x18181b, 0.05, 0.60, 0, 0.35, 1.15, 1.45); // 拱券门洞青石门洞深槽
    box(list, ironBlack, 0.18, 0.58, 0, 0.14, 1.08, 1.30); // 生铁合扇排叉厚闸门
    // 门扇 8 颗突出鎏金门钉
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        const pz = (c === 0 ? -0.32 : 0.32);
        const py = 0.28 + r * 0.22;
        sphere(list, bronzeGold, 0.26, py, pz, 0.04, 0.04, 0.04, true);
      }
    }
    // 门额阴刻青石匾额（「金汤」关楼大匾）
    box(list, stoneLight, 0.24, 1.20, 0, 0.08, 0.22, 0.82);
    box(list, redLacquer, 0.27, 1.20, 0, 0.04, 0.12, 0.62);

    // 3. 城台顶部前后两沿石砌垛口墙与瞭望射箭孔 (Crenels & Merlons)
    // 前沿（面向敌方 X 正向）：9 个整齐排列的石砌箭垛口
    for (let i = 0; i < 9; i++) {
      const z = -2.0 + i * 0.5;
      box(list, stoneMid, 1.02, 1.65, z, 0.28, 0.52, 0.34);
      // 垛口压顶青石
      box(list, stoneLight, 1.02, 1.92, z, 0.32, 0.06, 0.36);
    }
    // 后沿（面向己方 X 负向）：女儿墙
    for (let i = 0; i < 9; i++) {
      const z = -2.0 + i * 0.5;
      box(list, stoneMid, -1.02, 1.60, z, 0.24, 0.42, 0.36);
    }

    // 4. 城台正中巍峨耸立的秦风歇山双层重楼关楼 (Main Fortress Watchtower)
    // 一层回廊 8 根玄黑朱红立柱 (四角柱 + 四中柱)
    const colCoords = [
      [-0.65, -0.9], [0.65, -0.9], [-0.65, 0.9], [0.65, 0.9],
      [-0.65, 0], [0.65, 0], [0, -0.9], [0, 0.9]
    ];
    for (const [cx, cz] of colCoords) {
      cyl(list, woodColumn, cx, 1.85, cz, 0.07, 0.9, 0, 0, 0, 6);
      cyl(list, redLacquer, cx, 1.44, cz, 0.09, 0.08, 0, 0, 0, 6); // 柱础
    }
    // 一层直棂隔扇门窗与红黑板壁
    box(list, redLacquer, 0, 1.85, 0, 1.15, 0.78, 1.65);
    box(list, 0x18181b, 0.58, 1.85, 0, 0.04, 0.64, 0.88); // 前窗格

    // 一层腰檐飞檐 (起翘飞挑大檐板)
    box(list, roofBlack, 0, 2.32, 0, 1.85, 0.12, 2.45);
    // 一层飞檐四角翘檐
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      wedge(list, roofBlack, Math.cos(a) * 1.15, 2.38, Math.sin(a) * 1.45, 0.32, 0.16, 0.32, 0, -a, 0.35);
    }

    // 二层凭栏望楼 (美人靠回廊栏杆)
    box(list, redLacquer, 0, 2.50, 0.85, 1.25, 0.24, 0.06);
    box(list, redLacquer, 0, 2.50, -0.85, 1.25, 0.24, 0.06);
    box(list, redLacquer, 0.62, 2.50, 0, 0.06, 0.24, 1.65);
    box(list, redLacquer, -0.62, 2.50, 0, 0.06, 0.24, 1.65);
    // 二层上柱 4 根
    for (const [cx, cz] of [[-0.45, -0.65], [0.45, -0.65], [-0.45, 0.65], [0.45, 0.65]]) {
      cyl(list, woodColumn, cx, 2.75, cz, 0.055, 0.65, 0, 0, 0, 6);
    }

    // 二层大秦歇山顶 (大屋脊四角起翘重檐)
    cone(list, roofBlack, 0, 3.25, 0, 1.65, 0.75, 0, Math.PI / 4, 0, true);
    // 飞檐四角大挑角
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      wedge(list, roofBlack, Math.cos(a) * 1.25, 3.02, Math.sin(a) * 1.25, 0.38, 0.18, 0.38, 0, -a, 0.45);
    }
    // 正脊两端青铜鸱吻
    box(list, bronzeGold, 0, 3.65, 0.58, 0.14, 0.24, 0.14, 0.35, 0, 0);
    box(list, bronzeGold, 0, 3.65, -0.58, 0.14, 0.24, 0.14, -0.35, 0, 0);
    // 正脊中央青铜宝刹金顶
    cyl(list, bronzeGold, 0, 3.75, 0, 0.06, 0.36);
    sphere(list, bronzeGold, 0, 3.95, 0, 0.10, 0.10, 0.10, true);

    // 5. 左右两翼凸出式烽燧敌台与青铜狼烟火盆 (Beacon Watchposts)
    for (const zSide of [-2.15, 2.15]) {
      // 凸出方石敌台
      box(list, stoneMid, 0, 1.75, zSide, 1.6, 0.7, 0.85);
      // 敌台顶面护墙
      box(list, stoneLight, 0.68, 2.18, zSide, 0.22, 0.22, 0.85);
      // 青铜三足狼烟火盆
      cyl(list, bronzeGold, 0, 2.22, zSide, 0.26, 0.20, 0, 0, 0, 6);
      cyl(list, 0x18181b, 0, 2.12, zSide, 0.06, 0.20); // 火盆立柱
      // 熊熊金红狼烟烈火余烬
      sphere(list, flameGold, 0, 2.36, zSide, 0.22, 0.18, 0.22, true);
      cone(list, 0xef4444, 0, 2.50, zSide, 0.16, 0.22);
    }

    // 6. 城头两侧高高飘扬的大秦黑色玄武帅旗大纛 (Black Qin War Banners)
    for (const [bx, bz] of [[-0.85, -1.35], [-0.85, 1.35]]) {
      cyl(list, 0x5a4430, bx, 2.85, bz, 0.035, 3.2); // 旗杆
      cone(list, bronzeGold, bx, 4.48, bz, 0.06, 0.22); // 矛头铜枪尖
      // 黑色大纛燕尾旗面 (长达 1.1 米，飘扬招展)
      box(list, 0x17150f, bx + 0.45, 3.90, bz, 0.85, 0.75, 0.02, 0, 0, -0.06);
      box(list, 0xb23a2f, bx + 0.45, 3.90, bz, 0.87, 0.06, 0.025); // 旗帜红边
      box(list, bronzeGold, bx + 0.35, 3.90, bz, 0.26, 0.26, 0.03); // 金色秦篆旗标
    }

    // 7. 蒙恬「笔祖」如椽神笔凌空点墨 (The Legendary Mengtian Brush)
    // 悬空斜卧在长城城楼上方，笔尖凝墨，点化长城关隘
    cyl(list, 0x78350f, 0.15, 4.45, -0.45, 0.08, 2.8, 0, 0, 0.65, 8); // 紫竹长笔杆
    cyl(list, bronzeGold, -0.65, 3.95, -0.45, 0.09, 0.28, 0, 0, 0.65, 8); // 笔头金箍
    cone(list, 0x18181b, -0.92, 3.75, -0.45, 0.16, 0.65, 0, 0, 0.65); // 饱蘸浓墨的笔锋
    sphere(list, 0x18181b, -1.18, 3.55, -0.45, 0.08, 0.08, 0.08, true); // 笔尖垂落的墨滴
  } else if (kind === 'barricade') {
    // 拒马桩：交叉削尖带皮圆木，卯榫穿插，粗麻绳捆扎，铁箍锋刃
    for (let i = -1; i <= 1; i++) {
      const px = i * 0.44;
      cyl(list, wood, px, 0.54, 0.16, 0.075, 1.08, 0.72);
      cyl(list, wood, px, 0.54, -0.16, 0.075, 1.08, -0.72);
      // 桩头削尖包铁
      cone(list, 0xd5d0c0, px - 0.34, 1.04, 0.16, 0.055, 0.26, 0, 0, 0.72);
      cone(list, 0xd5d0c0, px + 0.34, 1.04, -0.16, 0.055, 0.26, 0, 0, -0.72);
    }
    // 横梁加固与麻绳结
    box(list, darkWood, 0, 0.54, 0, 1.55, 0.14, 0.14);
    box(list, 0x8a7a52, 0, 0.54, 0, 1.62, 0.06, 0.16);
    box(list, darkWood, 0, 0.09, 0, 1.55, 0.18, 0.65);
  } else if (kind === 'trebuchet') {
    // 霹雳车（抛石机）：重型梯形底架、铁箍车轮、坚固三角架、抛臂配重箱与巨石 (按指令左右对调)
    box(list, wood, 0, 0.30, 0, 1.6, 0.36, 1.1);
    for (const x of [-0.60, 0.60]) {
      for (const z of [-0.44, 0.44]) {
        cyl(list, darkWood, x, 0.30, z, 0.30, 0.16, 0, Math.PI / 2, 0, 8);
        cyl(list, trim, x, 0.30, z, 0.10, 0.18, 0, Math.PI / 2);
      }
    }
    // 三角主支架（左右对调）
    box(list, wood, -0.58, 1.16, 0, 0.16, 1.75, 0.16, 0, 0, -0.25);
    box(list, wood, 0.58, 1.16, 0, 0.16, 1.75, 0.16, 0, 0, 0.25);
    box(list, wood, 0, 1.80, 0, 0.18, 0.18, 0.98);
    // 复合长抛臂与配重箱（左右对调：配重箱在右前，抛兜巨石在左后，蓄势抛掷朝向前方）
    box(list, darkWood, 0, 1.66, 0, 2.05, 0.14, 0.14, 0, 0, 0.26);
    box(list, 0x4a3424, 0.85, 1.08, 0, 0.42, 0.42, 0.42);
    // 抛兜与巨型石弹（左右对调至左侧）
    sphere(list, stone, -1.12, 1.20, 0, 0.18, 0.18, 0.18, true);
    box(list, darkWood, -1.02, 1.14, 0, 0.22, 0.05, 0.18);
    box(list, 0xb23a2f, 0.98, 1.80, 0, 0.34, 0.46, 0.02);
  } else if (kind === 'cart') {
    // 火药车：加固双轮大车、陶罐炸药堆叠、破阵尖锐撞角
    box(list, wood, 0, 0.44, 0, 1.05, 0.32, 0.68);
    // 粗铁轮
    cyl(list, darkWood, -0.32, 0.30, 0.38, 0.30, 0.12, 0, Math.PI / 2, 0, 8);
    cyl(list, darkWood, 0.32, 0.30, 0.38, 0.30, 0.12, 0, Math.PI / 2, 0, 8);
    cyl(list, darkWood, -0.32, 0.30, -0.38, 0.30, 0.12, 0, Math.PI / 2, 0, 8);
    cyl(list, darkWood, 0.32, 0.30, -0.38, 0.30, 0.12, 0, Math.PI / 2, 0, 8);
    // 堆叠火药陶罐
    for (const x of [-0.22, 0.22]) {
      sphere(list, 0x6a4232, x, 0.74, 0, 0.18, 0.18, 0.18, true);
      sphere(list, 0xb23a2f, x, 0.90, 0, 0.06, 0.05, 0.06, true);
    }
    // 车前突刺撞角
    cone(list, 0xd5d0c0, 0.62, 0.44, 0, 0.08, 0.32, 0, 0, -Math.PI / 2);
    box(list, 0xb23a2f, 0, 0.96, 0.38, 0.46, 0.32, 0.03);
  } else if (kind === 'ram') {
    // 破城撞车：四轮重木底盘 + 人字吊架横梁（包铁撞杆为 weaponPivot 独立摆动，见 ramlog）
    // 底盘大梁与厚重平板
    box(list, wood, 0, 0.44, 0, 2.4, 0.16, 1.3);
    box(list, darkWood, 0, 0.34, 0, 2.5, 0.10, 0.34);
    // 四只大木轮与铁毂
    for (const wx of [-0.85, 0.85]) {
      for (const wz of [-0.62, 0.62]) {
        cyl(list, darkWood, wx, 0.30, wz, 0.30, 0.14, 0, Math.PI / 2, 0, 8);
        cyl(list, trim, wx, 0.30, wz, 0.09, 0.16, 0, Math.PI / 2, 0, 6);
      }
    }
    // 前后两对人字斜柱（顶端收拢承重）
    for (const fx of [-0.55, 0.55]) {
      box(list, wood, fx, 0.98, 0.40, 0.11, 1.3, 0.11, -0.30, 0, 0);
      box(list, wood, fx, 0.98, -0.40, 0.11, 1.3, 0.11, 0.30, 0, 0);
      box(list, trim, fx, 0.48, 0.48, 0.14, 0.10, 0.14);
      box(list, trim, fx, 0.48, -0.48, 0.14, 0.10, 0.14);
    }
    // 顶部承重横梁（X 向，撞杆吊点横梁）
    box(list, darkWood, 0, 1.52, 0, 1.9, 0.14, 0.16);
    box(list, trim, -0.55, 1.52, 0, 0.10, 0.18, 0.20);
    box(list, trim, 0.55, 1.52, 0, 0.10, 0.18, 0.20);
    // 两侧生皮挡板（护住推车士卒，避开撞杆摆面）
    box(list, cloth, 0, 0.82, 0.56, 2.0, 0.66, 0.05);
    box(list, cloth, 0, 0.82, -0.56, 2.0, 0.66, 0.05);
    box(list, trim, 0, 1.12, 0.56, 2.0, 0.06, 0.06);
    box(list, trim, 0, 1.12, -0.56, 2.0, 0.06, 0.06);
    // 车尾「破」字战旗
    cyl(list, wood, -1.05, 1.1, -0.45, 0.024, 1.6);
    box(list, 0xb23a2f, -0.82, 1.72, -0.45, 0.42, 0.48, 0.02);
  }
}

// ============================================================================
// 4.5 纸鸢（首个空中单位）：菱形纸鸢面 + 竹骨 + 朱砂绘纹 + 飘带尾 + 悬吊投弹人
// ============================================================================
function buildKite(list, look, side) {
  const paper = sideTint(look.cloth ?? 0xe6dcc0, side, 0.22);
  const paperDeep = sideTint(0xcfc0a0, side, 0.24);
  const armor = sideTint(look.armor ?? 0x9a8a6a, side, 0.2);
  const trim = sideTint(look.trim ?? 0xb23a2f, side, 0.06);
  const skin = sideTint(look.skin ?? 0xd8c3a1, side, 0.12);
  const dark = 0x2a2622;
  const bamboo = 0x6a5a42;
  const cinnabar = sideTint(0xb23a2f, side, 0.1);

  // ---------- 1. 鸢面组（在水平面绘制，最后整体立起并抬升） ----------
  const kite = [];
  // 菱形鸢面：下层朱砂描边 + 上层宣纸面 + 心部深纸
  box(kite, cinnabar, 0, 0.52, 0, 1.46, 0.024, 1.46, 0, Math.PI / 4, 0);
  box(kite, paper, 0, 0.542, 0, 1.32, 0.024, 1.32, 0, Math.PI / 4, 0);
  box(kite, paperDeep, 0, 0.556, 0, 0.58, 0.022, 0.58, 0, Math.PI / 4, 0);
  // 竹骨十字与四角扎节
  box(kite, bamboo, 0, 0.566, 0, 1.40, 0.028, 0.042, 0, 0, 0);
  box(kite, bamboo, 0, 0.566, 0, 0.042, 0.028, 1.40, 0, 0, 0);
  box(kite, trim, 1.00, 0.560, 0, 0.07, 0.05, 0.07, 0, Math.PI / 4, 0);
  box(kite, trim, -1.00, 0.560, 0, 0.07, 0.05, 0.07, 0, Math.PI / 4, 0);
  box(kite, trim, 0, 0.560, 1.00, 0.07, 0.05, 0.07, 0, Math.PI / 4, 0);
  box(kite, trim, 0, 0.560, -1.00, 0.07, 0.05, 0.07, 0, Math.PI / 4, 0);
  // 朱砂绘纹与墨笔
  box(kite, cinnabar, 0.30, 0.572, 0, 0.10, 0.02, 0.30, 0, Math.PI / 4, 0);
  box(kite, cinnabar, -0.30, 0.572, 0, 0.10, 0.02, 0.30, 0, Math.PI / 4, 0);
  box(kite, dark, 0, 0.574, 0.42, 0.34, 0.02, 0.05, 0, 0, 0);
  box(kite, dark, 0, 0.574, -0.42, 0.34, 0.02, 0.05, 0, 0, 0);
  // 三节飘带尾
  wedge(kite, cinnabar, -1.16, 0.60, 0, 0.34, 0.10, 0.02, 0, 0, 0.28);
  box(kite, cinnabar, -1.46, 0.68, 0, 0.36, 0.05, 0.13, 0, 0, 0.34);
  box(kite, 0xd0503f, -1.82, 0.78, 0.05, 0.34, 0.04, 0.10, 0, 0.12, 0.42);
  box(kite, paperDeep, -2.12, 0.90, -0.04, 0.30, 0.03, 0.09, 0, -0.10, 0.5);
  box(kite, cinnabar, -1.30, 0.62, 0.12, 0.30, 0.04, 0.08, 0, 0.22, 0.22);
  // 立起 75 度并抬升到投弹人上方（侧视镜头下露出鸢面）
  const pivot = new THREE.Vector3(0, 0.56, 0);
  const m = new THREE.Matrix4()
    .makeTranslation(0, 1.00, 0)
    .multiply(new THREE.Matrix4().makeScale(0.84, 0.84, 0.84))
    .multiply(new THREE.Matrix4().makeRotationX(1.30))
    .multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
  const kg = mergeGeos(kite);
  kg.applyMatrix4(m);
  list.push(kg);

  // ---------- 2. 牵线（自鸢心收束到悬吊人肩） ----------
  box(list, bamboo, 0.05, 0.55, 0.05, 0.014, 0.90, 0.014, 0, 0, 0.10);
  box(list, bamboo, -0.05, 0.55, -0.05, 0.014, 0.90, 0.014, 0, 0, -0.10);
  box(list, bamboo, 0, 0.52, 0.14, 0.014, 0.86, 0.014, 0.18, 0, 0);
  // ---------- 3. 悬吊投弹人（斗笠 + 短褐 + 四肢 + 火药罐） ----------
  sphereHead(list, skin, 0, 0.03, 0, 0.105, 0.11, 0.10);
  cone(list, 0xd8c880, 0, 0.14, 0, 0.21, 0.08);
  box(list, cinnabar, 0, 0.02, 0.02, 0.20, 0.05, 0.16);
  box(list, paper, 0, -0.22, 0, 0.20, 0.36, 0.15);
  box(list, trim, 0, -0.09, 0, 0.22, 0.05, 0.17);
  box(list, paper, 0.15, -0.10, 0.06, 0.26, 0.06, 0.06, 0, 0, -0.5);
  box(list, paper, -0.15, -0.10, 0.06, 0.26, 0.06, 0.06, 0, 0, 0.5);
  box(list, armor, 0.07, -0.48, 0, 0.075, 0.24, 0.08, 0, 0, 0.08);
  box(list, armor, -0.07, -0.48, 0, 0.075, 0.24, 0.08, 0, 0, -0.08);
  sphere(list, 0x3a3028, 0, -0.34, 0.09, 0.10, 0.11, 0.09, true);
  box(list, 0x8a7a4a, 0, -0.26, 0.09, 0.02, 0.10, 0.02);
  // 头顶朱砂短缨
  cone(list, cinnabar, 0, 0.20, 0, 0.045, 0.10);
}

// ---------- 模型几何体缓存 ----------
const bodyCache = new Map();
const weaponCache = new Map();
const buildingCache = new Map();

function cacheKey(id, side) {
  return `${id}:${side}`;
}

function buildBodyGeo(unit, side) {
  const key = cacheKey(unit.id, side);
  if (bodyCache.has(key)) return bodyCache.get(key);
  if (!unit.look) return new THREE.BufferGeometry();
  const list = [];
  if (unit.look.air === 'kite') {
    buildKite(list, unit.look, side);
  } else if (unit.look.mount) {
    buildMounted(list, unit.look, side);
  } else {
    buildHumanoid(list, unit.look, side);
  }
  const geo = mergeGeos(list);
  // 壁垒「fat」体型：横向放宽、纵向微压，形成魁梧肥硕的巨躯重卫轮廓
  if (unit.look && unit.look.fat) {
    const f = unit.look.fat;
    geo.scale(f[0] ?? 1.4, f[1] ?? 0.95, f[2] ?? 1.3);
    geo.computeVertexNormals();
  }
  bodyCache.set(key, geo);
  return geo;
}

function buildWeaponGeo(unit, side) {
  const key = cacheKey(unit.id, side);
  if (weaponCache.has(key)) return weaponCache.get(key);
  if (!unit.look) return null;
  const kind = unit.look.weapon;
  const geo = kind && kind !== 'none' ? buildWeaponGeometry(kind, unit.look, side, !!unit.look.hero) : null;
  weaponCache.set(key, geo);
  return geo;
}

function buildBuildingGeo(unit, side) {
  const key = cacheKey(unit.id, side);
  if (buildingCache.has(key)) return buildingCache.get(key);
  if (!unit.look) return new THREE.BufferGeometry();
  const list = [];
  buildBuilding(list, unit.look, side, unit.look.building || 'tower');
  const geo = mergeGeos(list);
  buildingCache.set(key, geo);
  return geo;
}

// ============================================================================
// 5. 模型工厂对外 API
// ============================================================================
export function createUnitModel(unit, side = 'player', options = {}) {
  const group = new THREE.Group();
  const look = unit.look || {};
  const scale = look.size || 1;
  const isBuilding = !!unit.building;
  const isSiege = !isBuilding && (look.building === 'trebuchet' || look.building === 'ram');
  const geo = (isBuilding || isSiege || look.building === 'cart') ? buildBuildingGeo(unit, side) : buildBodyGeo(unit, side);
  const body = new THREE.Mesh(geo, toonMaterial);
  body.castShadow = false;
  body.receiveShadow = false;
  group.add(body);

  let weapon = null;
  let weaponPivot = null;
  if (!isBuilding && look.weapon && look.weapon !== 'none') {
    const wgeo = buildWeaponGeo(unit, side);
    if (wgeo) {
      weaponPivot = new THREE.Group();
      weaponPivot.position.set(0.33 * scale, 1.0 * scale, 0.04);
      // 破城撞杆：挂点固定于吊架顶部横梁（与 ramlog 几何原点对应）
      if (look.weapon === 'ramlog') weaponPivot.position.set(0, 1.52, 0);
      weapon = new THREE.Mesh(wgeo, toonMaterial);
      if (look.weaponScale) weapon.scale.setScalar(look.weaponScale);
      weaponPivot.add(weapon);
      group.add(weaponPivot);
    }
  }
  const isEnemy = side === 'enemy';
  const initialFacing = isEnemy ? -1 : 1;
  group.scale.set(initialFacing * scale, scale, scale);
  group.position.y = 0;
  group.rotation.y = 0;

  let aura = null;
  if (look.hero || options.aura) {
    const color = look.hero ? (side === 'enemy' ? 0xb23a2f : 0x4b7a6a) : 0xc9a25e;
    const ringGeo = new THREE.RingGeometry(0.75, 0.86, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false,
    });
    aura = new THREE.Mesh(ringGeo, ringMat);
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.035;
    aura.name = 'auraRing';
    group.add(aura);
  }

  const model = { group, body, weapon, weaponPivot, aura, unit, baseScale: scale };
  group.userData = { unitId: unit.id, side, isBuilding, weaponPivot, aura };
  return model;
}

export function createBuildingModel(unit, side = 'player') {
  return createUnitModel({ ...unit, building: true }, side);
}

export function createHeroModel(hero, side = 'player') {
  const unit = {
    id: `hero_${hero.id}`,
    name: hero.name,
    look: { ...hero.look, hero: true },
    building: false,
    hero,
  };
  const model = createUnitModel(unit, side, { aura: true });
  // 英雄体型为普通士兵(1.12)的 1.3 倍高（兼顾战场英姿与展示界面完整度）
  const heroMultiplier = hero.look && hero.look.size ? hero.look.size : 1.30;
  const effMul = heroMultiplier >= 1.15 ? heroMultiplier : 1.30;
  const baseScale = 1.12 * effMul;
  model.baseScale = baseScale;
  model.group.scale.setScalar(baseScale);
  if (model.aura) {
    model.aura.material.opacity = 0.55;
    model.aura.scale.setScalar(1.30);
  }
  return model;
}

// ============================================================================
// 6. 基地（帅帐行辕 vs 敌寨黑堡）
// ============================================================================
export function createBase(side = 'player') {
  const group = new THREE.Group();
  const list = [];
  const enemy = side === 'enemy';
  const cloth = enemy ? 0x3a2622 : 0x4b7a6a;
  const wood = enemy ? 0x322822 : 0x5a4232;
  const trim = enemy ? 0xb23a2f : 0xc9a25e;
  const paper = 0xeae4d4;
  const stone = enemy ? 0x4a4642 : 0x827c70;
  const darkWood = 0x1f1c18;

  // 层叠青石坚实台基
  box(list, stone, 0, 0.18, 0, 4.6, 0.36, 3.4);
  box(list, stone, 0, 0.42, 0, 4.0, 0.18, 2.9);

  if (!enemy) {
    // 我方：气势磅礴的水墨中军大帐与飞檐大纛
    cyl(list, paper, 0, 1.60, -0.2, 1.65, 1.55, 0, 0, 0, 8);
    cone(list, paper, 0, 2.95, -0.2, 2.1, 1.15, 0, Math.PI / 4, 0, true);
    cone(list, cloth, 0, 1.95, -0.2, 1.75, 0.38, 0, 0, 0, true);
    // 四角飞檐起翘
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      wedge(list, cloth, Math.cos(a) * 1.45, 2.30, Math.sin(a) * 1.45 - 0.2, 0.36, 0.18, 0.36, 0, -a, 0.4);
    }
    // 门厅重檐柱架
    box(list, wood, -1.35, 1.15, 0.8, 0.16, 2.1, 0.16);
    box(list, wood, 1.35, 1.15, 0.8, 0.16, 2.1, 0.16);
    box(list, trim, 0, 2.15, 0.8, 3.0, 0.12, 0.12);
    // 青玉大纛帅旗
    cyl(list, wood, -1.65, 2.5, -0.7, 0.055, 4.2);
    box(list, trim, -1.36, 3.75, -0.7, 0.58, 0.76, 0.02, 0, 0, -0.03);
    box(list, 0xb23a2f, -1.36, 3.75, -0.72, 0.20, 0.54, 0.02);
    // 聚将牛皮战鼓
    cyl(list, 0x7a241e, 1.45, 0.98, 0.8, 0.42, 0.54, Math.PI / 2);
    // 前营防线拒马
    for (let i = 0; i < 3; i++) {
      cyl(list, wood, -1.7 + i * 0.5, 0.55, 1.40, 0.06, 0.85, 0.7);
      cyl(list, wood, -1.7 + i * 0.5, 0.55, 1.40, 0.06, 0.85, -0.7);
    }
  } else {
    // 敌方：黑木狼牙重寨、犬牙交错原木栅栏、血煞望楼
    for (let i = 0; i < 7; i++) {
      const x = -1.8 + i * 0.6;
      cyl(list, wood, x, 1.30, 0.65, 0.11, 2.6, 0, 0, 0, 6);
      cone(list, wood, x, 2.65, 0.65, 0.11, 0.42);
    }
    box(list, wood, 0, 2.42, 0.65, 4.4, 0.18, 0.18);
    box(list, darkWood, 0, 1.85, 0.65, 4.4, 0.12, 0.12);
    // 险要敌楼
    box(list, wood, 0, 1.95, -0.7, 2.7, 2.9, 0.65);
    box(list, 0x24201c, 0, 3.45, -0.7, 3.1, 0.18, 0.95);
    cone(list, 0x24201c, 0, 4.05, -0.7, 1.9, 0.85, 0, Math.PI / 4, 0, true);
    // 残破血色战旗
    cyl(list, wood, 1.75, 2.9, -0.6, 0.055, 4.4);
    box(list, 0x5a2420, 2.02, 4.25, -0.6, 0.55, 0.85, 0.02, 0, 0, -0.06);
    box(list, trim, 2.02, 4.25, -0.62, 0.14, 0.74, 0.02);
    // 侧翼黑木望台
    box(list, wood, -1.60, 1.65, -0.9, 0.85, 2.3, 0.85);
    box(list, darkWood, -1.60, 2.80, -0.9, 1.25, 0.14, 1.25);
    // 险恶拒马
    for (let i = 0; i < 3; i++) {
      cyl(list, wood, -1.6 + i * 0.55, 0.55, 1.45, 0.06, 0.85, 0.7);
      cyl(list, wood, -1.6 + i * 0.55, 0.55, 1.45, 0.06, 0.85, -0.7);
    }
  }

  // 两侧青铜烈火长明盆
  for (const x of [-2.15, 2.15]) {
    cyl(list, stone, x, 0.68, 1.05, 0.18, 0.75, 0, 0, 0, 6);
    sphere(list, 0xb23a2f, x, 1.10, 1.05, 0.20, 0.15, 0.20, true);
  }

  const geo = mergeGeos(list);
  const mesh = new THREE.Mesh(geo, toonMaterial);
  group.add(mesh);
  return group;
}

// ============================================================================
// 7. 场景古风水墨松石道具
// ============================================================================
export function createPine(x, z, scale = 1, variant = 0) {
  const list = [];
  const trunk = 0x443424;
  const leaves = variant === 1 ? 0x3a5646 : 0x2a4436;
  cyl(list, trunk, 0, 0.6, 0, 0.11, 1.25, 0, 0, 0, 6);
  cone(list, leaves, 0, 1.55, 0, 0.74, 1.15, 0, variant * 0.4, 0);
  cone(list, leaves, 0, 2.18, 0, 0.55, 0.95, 0, variant * 0.4 + 0.4, 0);
  cone(list, leaves, 0, 2.75, 0, 0.38, 0.75, 0, variant * 0.4 + 0.8, 0);
  const geo = mergeGeos(list);
  const mesh = new THREE.Mesh(geo, toonMaterial);
  mesh.position.set(x, 0, z);
  mesh.scale.setScalar(scale);
  return mesh;
}

export function createRock(x, z, scale = 1) {
  const geo = new THREE.DodecahedronGeometry(0.5, 0);
  const list = [];
  pushGeo(list, geo, 0x767066, mat4(0, 0.2, 0, 0.2, 0.5, 0.1, 1, 0.6, 1));
  const merged = mergeGeos(list);
  const mesh = new THREE.Mesh(merged, toonMaterial);
  mesh.position.set(x, 0, z);
  mesh.scale.setScalar(scale);
  return mesh;
}

export function createBanner(x, z, color = 0xb23a2f, side = 1) {
  const list = [];
  const wood = 0x443424;
  cyl(list, wood, 0, 1.45, 0, 0.035, 2.9, 0, 0, 0, 6);
  cone(list, 0xc9a25e, 0, 2.94, 0, 0.06, 0.16);
  box(list, color, 0.32 * side, 2.38, 0, 0.58, 0.78, 0.016);
  box(list, 0xc9a25e, 0.58 * side, 2.38, 0.01, 0.05, 0.82, 0.022);
  const mesh = new THREE.Mesh(mergeGeos(list), toonMaterial);
  mesh.position.set(x, 0, z);
  return mesh;
}

export function disposeModelCaches() {
  for (const g of bodyCache.values()) g.dispose();
  for (const g of weaponCache.values()) if (g) g.dispose();
  for (const g of buildingCache.values()) g.dispose();
  bodyCache.clear();
  weaponCache.clear();
  buildingCache.clear();
}
