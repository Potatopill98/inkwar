import { spawn } from 'child_process';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9341;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_hero12_${Date.now()}`;
  const edge = spawn(edgePath, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, 'about:blank']);
  await new Promise(r => setTimeout(r, 1800));
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const mid = id++; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return 'EXC ' + r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || '');
    return r.result?.result?.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  const errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map(a => a.value || a.description).join(' '));
    }
  });

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html' });
  await new Promise(r => setTimeout(r, 2800));
  await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.enterGame();
      a.save.settings.firstGuideDone = true;
      a.save.settings.tutorialDone = true;
      if (a.firstGuide) { a.firstGuide.hide(); if (a.firstGuide.el) a.firstGuide.el.remove(); }
      const ids = ['zhaoyun','hanxin','guanyu','zhugeliang','lvbu','libai','sunwu','weiqing','huoqubing','wuzetian','mengtian','diaochan'];
      a.save.unlocks.heroes = ids.slice();
      a.save.progress.unlockedLevel = 20;
      for (const id of ids) { a.save.hero.levels[id] = a.save.hero.levels[id] || 1; }
      return ids.join(',');
    })()
  `);

  const ids = ['zhaoyun','hanxin','guanyu','zhugeliang','lvbu','libai','sunwu','weiqing','huoqubing','wuzetian','mengtian','diaochan'];
  for (const hid of ids) {
    await ev(`(() => { const a=window.__MOZHEN_APP__; try { a.openPrep(5); a.selectHero('${hid}'); a.beginBattleFromPrep(); return 'ok'; } catch(e){ return 'ERR '+e.message; } })()`);
    await new Promise(r => setTimeout(r, 1500));
    const info = await ev(`
      (() => {
        try {
          const a = window.__MOZHEN_APP__;
          const b = a.battle;
          if (!b) return JSON.stringify({ hero: '${hid}', battle: false });
          b.state = 'running'; b.introT = 0; b.speed = 4;
          b.heroX = 6; b.heroZ = 0; b.heroRallyX = 6; b.heroRallyZ = 0;
          b.heroTargetX = 6; b.heroTargetZ = 0;
          if (b.heroModel && b.heroModel.group) b.heroModel.group.position.set(6, 0, 0);
          return JSON.stringify({
            hero: '${hid}',
            name: b.heroData && b.heroData.name,
            hp: Math.round(b.heroHp), maxHp: Math.round(b.heroMaxHp),
            atk: b.heroAtk, interval: b.heroAtkInterval,
            range: b.heroRange, block: b.heroBlockSlots,
            ranged: !!(b.heroCombat && b.heroCombat.ranged),
            stealth: !!(b.heroCombat && b.heroCombat.stealth),
            thorns: b.heroCombat && b.heroCombat.thorns,
            cd: b.heroSuperCooldown,
            hudName: (document.getElementById('hud-hero-name') || {}).textContent,
            hpTrack: (() => { const el = document.getElementById('hud-hero-hp-track'); return el ? getComputedStyle(el).display : 'none'; })(),
          });
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    console.log('[spawn]', info);
    await new Promise(r => setTimeout(r, 4500));
    const live = await ev(`
      (() => {
        const a = window.__MOZHEN_APP__; const b = a.battle;
        if (!b) return 'no battle';
        return JSON.stringify({
          hp: Math.round(b.heroHp), respawn: Math.round(b.heroRespawnTimer || 0),
          x: Math.round(b.heroX * 10) / 10, z: Math.round(b.heroZ * 10) / 10,
          blocked: b.heroBlockedFoes ? b.heroBlockedFoes.size : -1,
          charge: b.heroChargeT || 0,
          stele: !!b.heroWuzetianStele,
          kills: b.kills, wave: b.waveIndex,
        });
      })()
    `);
    console.log('[live ]', hid, live);

    // 大招冒烟
    const ultStart = await ev(`
      (() => {
        try {
          const b = window.__MOZHEN_APP__.battle;
          if (!b) return 'no battle';
          // 为验证魅惑/巨化/隐匿，临时准备目标与友军
          const hid = '${hid}';
          const enemy = b.entities.find(e => e.alive && e.side === 'enemy');
          if (hid === 'diaochan') {
            const t = enemy || b.createEntity({ unit: b.deckUnits[0], side: 'enemy', x: b.heroX + 2.0, z: 0, kind: 'unit', hpMul: 1, atkMul: 1 });
            t.x = b.heroX + 1.6; t.z = 0;
            if (t.model) t.model.group.position.x = t.x;
          }
          if (enemy && (hid === 'weiqing' || hid === 'sunwu')) {
            b.createEntity({ unit: enemy.unit, side: 'player', x: b.heroX + 1.2, z: 0, kind: 'unit', hpMul: 1, atkMul: 1 });
          }
          b.heroSuperCharge = 100; b.skillCd = 0;
          b.runSkill();
          return 'ult';
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    await new Promise(r => setTimeout(r, 200));
    // 无头标签页 rAF 会被节流，这里手动推进技能动作帧，验证动画能正常收尾并触发 runSkill
    await ev("(() => { const b=window.__MOZHEN_APP__.battle; if(!b) return 'no'; for (let i=0;i<60 && b.heroSkillAnim;i++) b.updateHeroVisual(0.05); return 'stepped'; })()");
    await new Promise(r => setTimeout(r, 300));
    const ult = await ev(`
      (() => {
        try {
          const b = window.__MOZHEN_APP__.battle;
          if (!b) return 'no battle';
          const allies = b.entities.filter(e => e.alive && e.side === 'player');
          return JSON.stringify({
            start: ${JSON.stringify(ultStart)},
            animDone: !b.heroSkillAnim && !b.pendingSkill,
            state: b.state, paused: b.paused,
            animLeft: b.heroSkillAnim ? Math.round((b.heroSkillAnim.totalDur - b.heroSkillAnim.elapsed) * 10) / 10 : null,
            pending: !!b.pendingSkill,
            stealthAllies: allies.filter(e => (e.stealth || 0) > 0).length,
            playerCount: allies.length,
            sunwuT: b.sunwuStealthT || 0,
            weiqingT: b.weiqingBuffT || 0,
            sample: allies.slice(0, 3).map(e => ({ id: e.unit && e.unit.id, st: Math.round((e.stealth || 0) * 10) / 10, gt: Math.round((e.giantT || 0) * 10) / 10, life: e.timedLife || 0 })),
            giants: allies.filter(e => (e.giantT || 0) > 0).length,
            timedSummons: allies.filter(e => e.summoned && e.timedLife > 0).length,
            stele: !!b.heroWuzetianStele,
            blocked: b.heroBlockedFoes ? b.heroBlockedFoes.size : -1,
            hp: Math.round(b.heroHp),
          });
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    console.log('[ult  ]', hid, ult);

    // 阵亡与复活/留碑冒烟
    await ev("(() => { const b=window.__MOZHEN_APP__.battle; if(!b) return 'no'; b.heroHp = 1; b.damageHero(99999, null); return 'killed'; })()");
    await new Promise(r => setTimeout(r, 700));
    const dead = await ev("(() => { const b=window.__MOZHEN_APP__.battle; if(!b) return 'no'; return JSON.stringify({ hp: Math.round(b.heroHp), respawn: Math.round(b.heroRespawnTimer||0), stele: !!b.heroWuzetianStele, alive: b.isHeroAlive() }); })()");
    console.log('[dead ]', hid, dead);
    await ev("(() => { const a=window.__MOZHEN_APP__; if (a.destroyBattle) a.destroyBattle(); else if (a.battle) { a.battle.destroy(); a.battle=null; } return 'ok'; })()");
    await new Promise(r => setTimeout(r, 400));
  }
  console.log('CONSOLE_ERRORS', JSON.stringify(errors.slice(0, 8)));
  ws.close(); edge.kill(); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

