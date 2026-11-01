import fs from 'fs';
import path from 'path';

// Let's create a minimal browser environment mock
const html = fs.readFileSync('index.html', 'utf8');

// Parse element IDs from index.html
const idRegex = /id=["']([^"']+)["']/g;
const domElements = new Map();
let m;
while ((m = idRegex.exec(html)) !== null) {
  const id = m[1];
  domElements.set(id, {
    id,
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    },
    style: {},
    dataset: {},
    children: [],
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    removeChild() {},
    closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  });
}

global.window = {
  requestAnimationFrame(cb) { return setTimeout(cb, 16); },
  cancelAnimationFrame(id) { clearTimeout(id); },
  addEventListener() {},
  removeEventListener() {},
  history: { pushState() {}, replaceState() {} },
  location: { reload() {} },
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  AudioContext: class {
    createOscillator() { return { connect() {}, start() {}, stop() {} }; }
    createGain() { return { connect() {}, gain: { value: 1, linearRampToValueAtTime() {} } }; }
  },
  webkitAudioContext: class {}
};
global.requestAnimationFrame = global.window.requestAnimationFrame;
global.cancelAnimationFrame = global.window.cancelAnimationFrame;

global.document = {
  getElementById(id) {
    if (!domElements.has(id)) {
      // Create dynamically if requested
      domElements.set(id, {
        id,
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        style: {},
        dataset: {},
        children: [],
        querySelectorAll() { return []; },
        querySelector() { return null; },
        addEventListener() {},
        removeEventListener() {},
        appendChild() {},
        removeChild() {},
        closest() { return null; },
        getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
      });
    }
    return domElements.get(id);
  },
  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return {
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      style: {},
      addEventListener() {},
      appendChild() {}
    };
  },
  querySelectorAll(sel) {
    return [];
  },
  createElement(tag) {
    return {
      tagName: tag.toUpperCase(),
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      style: {},
      dataset: {},
      children: [],
      querySelectorAll() { return []; },
      querySelector() { return null; },
      addEventListener() {},
      appendChild() {},
      removeChild() {},
      getContext() {
        return {
          fillRect() {}, clearRect() {}, getImageData() {}, putImageData() {},
          beginPath() {}, arc() {}, fill() {}, stroke() {}
        };
      }
    };
  },
  addEventListener() {},
  removeEventListener() {},
  body: { appendChild() {}, style: {} }
};

const store = new Map();
global.localStorage = {
  getItem(k) { return store.get(k) || null; },
  setItem(k, v) { store.set(k, String(v)); },
  removeItem(k) { store.delete(k); },
  clear() { store.clear(); }
};

global.performance = {
  now() { return Date.now(); }
};

console.log('Testing App import and boot...');
try {
  // Import main.js
  await import('../src/main.js');
  console.log('main.js imported successfully!');
  console.log('App instance on window:', typeof global.window.__MOZHEN_APP__);
  if (global.window.__MOZHEN_APP__) {
    console.log('Current screen:', global.window.__MOZHEN_APP__.ui.currentScreen || 'screen-title');
    console.log('Save object loaded:', !!global.window.__MOZHEN_APP__.save);
    console.log('Tokens:', global.window.__MOZHEN_APP__.save.tokens);
    console.log('Mobao:', global.window.__MOZHEN_APP__.save.mobao);
    console.log('Hero levels:', global.window.__MOZHEN_APP__.save.hero.levels);

    // Test starting a battle
    console.log('\nTesting Battle initialization...');
    const app = global.window.__MOZHEN_APP__;
    const { getLevel } = await import('../src/data/levels.js');
    app.startBattle(getLevel(1), 'zhaoyun', app.save.deck);
    console.log('Battle started successfully! State:', app.battle.state);
    console.log('Hero in battle:', app.battle.heroId, 'HP:', app.battle.heroHp, 'MaxHP:', app.battle.heroMaxHp);
    console.log('Hero outside level:', app.battle.heroOutsideLevel, 'Perm multiplier:', app.battle.heroPermMultiplier);
  }
} catch (err) {
  console.error('ERROR DURING BOOT:', err);
}
