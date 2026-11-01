// 战斗公共常量与共享资源（各战斗模块统一从这里取，避免魔法数字散落）
import * as THREE from '../../lib/three.module.js';

export const PLAYER_BASE_X = -15.5;
export const ENEMY_BASE_X = 15.5;
export const ENEMY_SPAWN_X = 14.3;
export const HERO_MIN = -14;
export const HERO_MAX = 4;
export const PLAYER_BASE_MAX = 3000;
export const ENERGY_MAX = 30;
export const START_ENERGY = 15;
export const MAX_UNITS_PER_SIDE = 30;
export const HERO_XP = [0, 8, 20, 35, 55];

// 投射物共享几何/材质
export const arrowGeo = new THREE.BoxGeometry(0.025, 0.025, 0.62);
export const boltGeo = new THREE.BoxGeometry(0.03, 0.03, 0.50);
export const javelinGeo = new THREE.BoxGeometry(0.045, 0.045, 0.85);
export const axeGeo = new THREE.BoxGeometry(0.18, 0.18, 0.05);
export const stoneGeo = new THREE.SphereGeometry(0.18, 7, 5);
export const oilGeo = new THREE.SphereGeometry(0.12, 6, 4);
export const talismanGeo = new THREE.PlaneGeometry(0.14, 0.26);
export const powderGeo = new THREE.SphereGeometry(0.15, 6, 4);
export const powderMat = new THREE.MeshBasicMaterial({ color: 0x2a2418 });
export const arrowMat = new THREE.MeshBasicMaterial({ color: 0x2a2a24 });
export const boltMat = new THREE.MeshBasicMaterial({ color: 0x3a3a32 });
export const stoneMat = new THREE.MeshBasicMaterial({ color: 0x5a5650 });
export const oilMat = new THREE.MeshBasicMaterial({ color: 0x6a4a2a });
export const talismanMat = new THREE.MeshBasicMaterial({ color: 0xd8d2c0, side: THREE.DoubleSide });

// 头顶高清血条共享资源（纯黑高对比坚实边框 + 高不透明度纯正翠绿与鲜红，彻底解决浅色看不清痛点）
export const HPBAR_BORDER_GEO = new THREE.PlaneGeometry(1.44, 0.30);
export const HPBAR_BORDER_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: false, opacity: 1.0, depthTest: false, depthWrite: false });

export const HPBAR_BG_GEO = new THREE.PlaneGeometry(1.34, 0.22);
export const HPBAR_BG_MAT = new THREE.MeshBasicMaterial({ color: 0x1c1917, transparent: false, opacity: 1.0, depthTest: false, depthWrite: false });

export const HPBAR_FILL_GEO = new THREE.PlaneGeometry(1.26, 0.16);
HPBAR_FILL_GEO.translate(0.63, 0, 0);

export const HPBAR_SHIELD_GEO = new THREE.PlaneGeometry(1.26, 0.08);
HPBAR_SHIELD_GEO.translate(0.63, 0, 0);
export const HPBAR_SHIELD_MAT = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: false, opacity: 1.0, depthTest: false, depthWrite: false });

export const HPBAR_GREEN_MAT = new THREE.MeshBasicMaterial({ color: 0x16a34a, transparent: false, opacity: 1.0, depthTest: false, depthWrite: false });
export const HPBAR_RED_MAT = new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: false, opacity: 1.0, depthTest: false, depthWrite: false });

export const HPBAR_BOSS_BORDER_GEO = new THREE.PlaneGeometry(2.46, 0.40);
export const HPBAR_BOSS_BG_GEO = new THREE.PlaneGeometry(2.34, 0.30);
export const HPBAR_BOSS_FILL_GEO = new THREE.PlaneGeometry(2.24, 0.22);
HPBAR_BOSS_FILL_GEO.translate(1.12, 0, 0);
export const HPBAR_BOSS_SHIELD_GEO = new THREE.PlaneGeometry(2.24, 0.12);
HPBAR_BOSS_SHIELD_GEO.translate(1.12, 0, 0);



