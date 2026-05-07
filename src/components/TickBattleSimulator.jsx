import { useEffect, useMemo, useState } from 'react';
import '../styles/ai-battle-simulator.css';

const TICK_MS = 100;
const WORLD_WIDTH = 760;
const COLLISION_RADIUS = 34;

const FALLBACK_MONSTERS = {
  octopus: {
    key: 'octopus',
    id: 'octopus',
    name: 'Octopus / 章鱼',
    lookupNames: ['Octopus'],
    level: 12,
    maxHp: 200,
    mp: 30,
    exp: 24,
    physicalAttack: 62,
    magicAttack: 0,
    physicalDefense: 8,
    magicDefense: 6,
    accuracy: 70,
    avoid: 5,
    visualSpeed: 18,
    spawnX: 590,
    meso: 34,
    attributes: [],
    source: 'fallback preset',
  },
  greenMushroom: {
    key: 'greenMushroom',
    id: 'greenMushroom',
    name: 'Green Mushroom / 绿蘑菇',
    lookupNames: ['Green Mushroom'],
    level: 15,
    maxHp: 250,
    mp: 30,
    exp: 32,
    physicalAttack: 72,
    magicAttack: 0,
    physicalDefense: 12,
    magicDefense: 8,
    accuracy: 85,
    avoid: 6,
    visualSpeed: 15,
    spawnX: 585,
    meso: 42,
    attributes: [],
    source: 'fallback preset',
  },
  zombieMushroom: {
    key: 'zombieMushroom',
    id: 'zombieMushroom',
    name: 'Zombie Mushroom / 僵尸蘑菇',
    lookupNames: ['Zombie Mushroom'],
    level: 24,
    maxHp: 443,
    mp: 30,
    exp: 45,
    physicalAttack: 104,
    magicAttack: 0,
    physicalDefense: 15,
    magicDefense: 15,
    accuracy: 108,
    avoid: 15,
    visualSpeed: 13,
    spawnX: 600,
    meso: 78,
    attributes: ['Holy weak', 'Undead'],
    source: 'verified fallback from monster table',
  },
};

const JOB_COMBAT = {
  fighter: { label: '剑客', maxHp: 720, maxMp: 110, minDamage: 90, maxDamage: 165, attackRange: 86, attackTicks: 8, accuracy: 62, mpCost: 0, walkSpeed: 36, weaponDefense: 18 },
  page: { label: '准骑士', maxHp: 760, maxMp: 115, minDamage: 82, maxDamage: 152, attackRange: 82, attackTicks: 9, accuracy: 62, mpCost: 0, walkSpeed: 34, weaponDefense: 26 },
  spearman: { label: '枪战士', maxHp: 740, maxMp: 115, minDamage: 95, maxDamage: 176, attackRange: 108, attackTicks: 9, accuracy: 60, mpCost: 0, walkSpeed: 34, weaponDefense: 20 },
  fire_poison: { label: '火毒法师', maxHp: 360, maxMp: 520, minDamage: 145, maxDamage: 230, attackRange: 190, attackTicks: 10, accuracy: 999, mpCost: 14, walkSpeed: 34, weaponDefense: 8 },
  ice_lightning: { label: '冰雷法师', maxHp: 365, maxMp: 510, minDamage: 135, maxDamage: 215, attackRange: 185, attackTicks: 10, accuracy: 999, mpCost: 13, walkSpeed: 34, weaponDefense: 8 },
  cleric: { label: '牧师', maxHp: 380, maxMp: 500, minDamage: 112, maxDamage: 188, attackRange: 175, attackTicks: 11, accuracy: 999, mpCost: 11, walkSpeed: 34, weaponDefense: 10 },
  hunter: { label: '猎人', maxHp: 500, maxMp: 220, minDamage: 86, maxDamage: 158, attackRange: 245, attackTicks: 8, accuracy: 82, mpCost: 8, walkSpeed: 40, weaponDefense: 12 },
  crossbowman: { label: '弩弓手', maxHp: 500, maxMp: 220, minDamage: 94, maxDamage: 170, attackRange: 250, attackTicks: 9, accuracy: 84, mpCost: 8, walkSpeed: 38, weaponDefense: 12 },
  assassin: { label: '刺客', maxHp: 470, maxMp: 250, minDamage: 96, maxDamage: 168, attackRange: 225, attackTicks: 7, accuracy: 88, mpCost: 9, walkSpeed: 48, weaponDefense: 10 },
  bandit: { label: '侠客', maxHp: 520, maxMp: 230, minDamage: 105, maxDamage: 190, attackRange: 70, attackTicks: 7, accuracy: 84, mpCost: 6, walkSpeed: 46, weaponDefense: 14 },
  brawler: { label: '拳手', maxHp: 610, maxMp: 210, minDamage: 94, maxDamage: 172, attackRange: 76, attackTicks: 7, accuracy: 76, mpCost: 7, walkSpeed: 44, weaponDefense: 16 },
  gunslinger: { label: '火枪手', maxHp: 500, maxMp: 245, minDamage: 88, maxDamage: 160, attackRange: 235, attackTicks: 7, accuracy: 86, mpCost: 8, walkSpeed: 46, weaponDefense: 10 },
};

function pct(value, max) {
  return `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100)).toFixed(1)}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cloneState(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function getDefenseMultiplier(defense) {
  return 100 / (Math.max(0, defense) + 100);
}

function normalizeVisualSpeed(rawSpeed, fallbackSpeed) {
  const raw = safeNumber(rawSpeed, fallbackSpeed);
  if (!Number.isFinite(raw) || raw === 0) return fallbackSpeed;
  return clamp(Math.abs(raw) / 2.8, 8, 28);
}

function getAttributes(raw, fallback) {
  const attrs = [...(fallback.attributes ?? [])];
  if (raw?.undead && !attrs.includes('Undead')) attrs.push('Undead');
  if (typeof raw?.elements === 'string' && raw.elements.trim()) attrs.push(raw.elements.trim());
  return Array.from(new Set(attrs));
}

function normalizeMonster(raw, fallback) {
  return {
    ...fallback,
    id: raw?.id ?? fallback.id,
    name: raw?.name ? `${raw.name}` : fallback.name,
    level: safeNumber(raw?.level, fallback.level),
    maxHp: safeNumber(raw?.hp ?? raw?.maxHp, fallback.maxHp),
    mp: safeNumber(raw?.mp, fallback.mp),
    exp: safeNumber(raw?.exp, fallback.exp),
    physicalAttack: safeNumber(raw?.PADamage ?? raw?.physicalAttack, fallback.physicalAttack),
    magicAttack: safeNumber(raw?.MADamage ?? raw?.magicAttack, fallback.magicAttack),
    physicalDefense: safeNumber(raw?.PDDamage ?? raw?.physicalDefense, fallback.physicalDefense),
    magicDefense: safeNumber(raw?.MDDamage ?? raw?.magicDefense, fallback.magicDefense),
    accuracy: safeNumber(raw?.acc ?? raw?.accuracy, fallback.accuracy),
    avoid: safeNumber(raw?.eva ?? raw?.avoid, fallback.avoid),
    visualSpeed: normalizeVisualSpeed(raw?.speed, fallback.visualSpeed),
    touchDamage: safeNumber(raw?.PADamage ?? raw?.physicalAttack, fallback.physicalAttack),
    meso: Math.max(1, Math.round(safeNumber(raw?.exp, fallback.exp) * 1.7)),
    attributes: getAttributes(raw, fallback),
    source: raw ? 'public/data/app_metadata/monsters.json' : fallback.source,
    thumbnail: raw?.thumbnail,
    gif: raw?.gif ?? raw?.gifs?.move,
  };
}

function findRawMonster(gameData, fallback) {
  const monsters = Array.isArray(gameData?.monsters) ? gameData.monsters : [];
  return monsters.find((monster) => fallback.lookupNames.some((name) => String(monster.name).toLowerCase() === name.toLowerCase()));
}

function buildMonsterOptions(gameData) {
  return Object.values(FALLBACK_MONSTERS).map((fallback) => normalizeMonster(findRawMonster(gameData, fallback), fallback));
}

function getHitRate(profile, monster) {
  if (profile.accuracy >= 999) return 1;
  const raw = (profile.accuracy * 100) / ((Math.max(0, monster.level - 18) + 51) * 5);
  const needed = monster.avoid / Math.max(1, raw);
  return clamp(1.05 - needed, 0.05, 1);
}

function averageDamageAfterDefense(profile, monster) {
  const rawAverage = (profile.minDamage + profile.maxDamage) / 2;
  return Math.max(1, rawAverage * getDefenseMultiplier(monster.physicalDefense));
}

function rollDamage(profile, monster) {
  const raw = profile.minDamage + Math.random() * (profile.maxDamage - profile.minDamage);
  return Math.max(1, Math.round(raw * getDefenseMultiplier(monster.physicalDefense)));
}

function makeInitialState(profile, monster) {
  return {
    tick: 0,
    virtualSeconds: 0,
    player: {
      x: 125,
      level: 18,
      hp: profile.maxHp,
      mp: profile.maxMp,
      maxHp: profile.maxHp,
      maxMp: profile.maxMp,
      exp: 0,
      meso: 1200,
      action: 'idle',
      cooldown: 0,
      iframes: 0,
      knockback: 0,
      kills: 0,
      deaths: 0,
      hitsLanded: 0,
      damageDone: 0,
      hpPotions: 0,
      mpPotions: 0,
    },
    monster: {
      x: monster.spawnX,
      hp: monster.maxHp,
      maxHp: monster.maxHp,
      alive: true,
      respawnTicks: 0,
      action: 'move',
    },
    floaters: [],
    log: [`模拟器就绪：${monster.name} HP ${monster.maxHp}, P.DEF ${monster.physicalDefense}, EXP ${monster.exp}.`],
    lastFormula: '等待第一次攻击判定。',
  };
}

function pushLog(log, message) {
  return [message, ...log].slice(0, 7);
}

function simulateTick(state, profile, monster, policy) {
  const next = cloneState(state);
  next.tick += 1;
  next.virtualSeconds = Math.round(next.tick * TICK_MS / 100) / 10;
  next.floaters = next.floaters
    .map((item) => ({ ...item, life: item.life - 1, y: item.y - 2, opacity: Math.max(0, item.opacity - 0.055) }))
    .filter((item) => item.life > 0);

  const player = next.player;
  const mob = next.monster;
  player.cooldown = Math.max(0, player.cooldown - 1);
  player.iframes = Math.max(0, player.iframes - 1);

  if (mob.respawnTicks > 0) {
    mob.respawnTicks -= 1;
    mob.action = 'respawn';
    if (mob.respawnTicks === 0) {
      mob.alive = true;
      mob.hp = monster.maxHp;
      mob.maxHp = monster.maxHp;
      mob.x = monster.spawnX;
      mob.action = 'move';
      next.log = pushLog(next.log, `${monster.name} respawned with ${monster.maxHp} HP.`);
    }
    return next;
  }

  const distance = Math.abs(mob.x - player.x);
  const direction = mob.x >= player.x ? 1 : -1;
  const policyRangeBuffer = policy === 'stable' ? 14 : policy === 'fastest' ? -8 : 0;
  const desiredRange = Math.max(48, profile.attackRange + policyRangeBuffer);

  if (mob.alive && distance > desiredRange) {
    player.x = clamp(player.x + direction * (profile.walkSpeed * TICK_MS / 1000), 40, WORLD_WIDTH - 40);
    player.action = 'move';
  } else if (mob.alive && player.cooldown <= 0 && distance <= profile.attackRange) {
    const hitRate = getHitRate(profile, monster);
    const didHit = Math.random() <= hitRate;
    player.cooldown = profile.attackTicks;
    player.action = 'attack';
    player.mp = Math.max(0, player.mp - profile.mpCost);

    if (didHit) {
      const damage = rollDamage(profile, monster);
      const beforeHp = mob.hp;
      mob.hp = Math.max(0, mob.hp - damage);
      mob.action = 'hit';
      player.hitsLanded += 1;
      player.damageDone += damage;
      next.floaters.push({ id: `${next.tick}-dmg`, value: damage, type: 'damage', x: mob.x, y: 56, life: 26, opacity: 1 });
      next.lastFormula = `Damage = random(${profile.minDamage}-${profile.maxDamage}) × 100/(${monster.physicalDefense}+100) → ${damage}; ${monster.name} HP ${beforeHp} → ${mob.hp}/${monster.maxHp}; hitRate=${Math.round(hitRate * 100)}%; range=${Math.round(distance)}/${profile.attackRange}`;

      if (mob.hp <= 0) {
        mob.alive = false;
        mob.respawnTicks = 18;
        mob.action = 'dead';
        player.kills += 1;
        player.exp += monster.exp;
        player.meso += monster.meso;
        next.log = pushLog(next.log, `击杀 ${monster.name}: ${player.hitsLanded} landed hits so far, +${monster.exp} EXP, +${monster.meso} meso.`);
      }
    } else {
      next.floaters.push({ id: `${next.tick}-miss`, value: 'MISS', type: 'miss', x: mob.x, y: 56, life: 20, opacity: 1 });
      next.lastFormula = `MISS: hitRate=${Math.round(hitRate * 100)}%; player accuracy=${profile.accuracy}; monster avoid=${monster.avoid}.`;
    }
  } else {
    player.action = mob.alive ? 'wait' : 'idle';
  }

  if (mob.alive && distance > COLLISION_RADIUS) {
    mob.x = clamp(mob.x - direction * (monster.visualSpeed * TICK_MS / 1000), 35, WORLD_WIDTH - 35);
    mob.action = mob.action === 'hit' ? 'hit' : 'move';
  }

  const collisionDistance = Math.abs(mob.x - player.x);
  if (mob.alive && collisionDistance <= COLLISION_RADIUS && player.iframes <= 0) {
    const rawTouch = Math.max(1, monster.touchDamage - Math.round(profile.weaponDefense * 0.45));
    player.hp = Math.max(0, player.hp - rawTouch);
    player.iframes = 10;
    player.knockback = 6;
    player.x = clamp(player.x - direction * 34, 40, WORLD_WIDTH - 40);
    player.action = 'hit';
    next.floaters.push({ id: `${next.tick}-touch`, value: `-${rawTouch}`, type: 'touch', x: player.x, y: 52, life: 26, opacity: 1 });
    next.log = pushLog(next.log, `Touch damage from ${monster.name}: ${rawTouch}. 触发 10 ticks 无敌帧和击退。`);
  }

  if (player.hp > 0 && player.hp / player.maxHp < 0.35 && player.meso >= 50) {
    player.hp = Math.min(player.maxHp, player.hp + 150);
    player.meso -= 50;
    player.hpPotions += 1;
    next.log = pushLog(next.log, '自动使用 Red Potion: +150 HP, -50 meso.');
  }

  if (player.mp / player.maxMp < 0.25 && profile.mpCost > 0 && player.meso >= 200) {
    player.mp = Math.min(player.maxMp, player.mp + 300);
    player.meso -= 200;
    player.mpPotions += 1;
    next.log = pushLog(next.log, '自动使用 Blue Potion: +300 MP, -200 meso.');
  }

  if (player.hp <= 0) {
    player.deaths += 1;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.x = 100;
    player.iframes = 18;
    next.log = pushLog(next.log, '死亡并回城复活：路线风险过高，AI 应降低地图难度或提高防御/命中。');
  }

  while (player.exp >= 100) {
    player.exp -= 100;
    player.level += 1;
    player.maxHp += 28;
    player.maxMp += 8;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    next.log = pushLog(next.log, `LEVEL UP! 当前 Lv.${player.level}.`);
  }

  return next;
}

function StatBar({ label, value, max, className }) {
  return (
    <div className="ai-statbar-row">
      <span>{label}</span>
      <div className="ai-statbar-track">
        <div className={`ai-statbar-fill ${className}`} style={{ width: pct(value, max) }} />
      </div>
      <strong>{Math.round(value)} / {Math.round(max)}</strong>
    </div>
  );
}

function SimulatorSprite({ type, x, action, iframes = 0, hp, maxHp, image }) {
  const left = `${(x / WORLD_WIDTH) * 100}%`;
  return (
    <div className={`ai-sprite ${type} ${action} ${iframes > 0 ? 'iframe' : ''}`} style={{ left }}>
      <div className="ai-sprite-hp"><span style={{ width: pct(hp, maxHp) }} /></div>
      <div className="ai-sprite-body">
        {image ? <img src={`/${String(image).replace(/^\/+/, '')}`} alt="" /> : (type === 'player' ? '⚔️' : '🐙')}
      </div>
      <small>{type === 'player' ? action.toUpperCase() : action}</small>
    </div>
  );
}

export default function TickBattleSimulator({ jobKey = 'spearman', strategy = 'balanced', budget = 'low', dataCoverage = null, gameData = null }) {
  const [monsterKey, setMonsterKey] = useState('zombieMushroom');
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const profile = JOB_COMBAT[jobKey] ?? JOB_COMBAT.spearman;
  const monsterOptions = useMemo(() => buildMonsterOptions(gameData), [gameData]);
  const monster = monsterOptions.find((item) => item.key === monsterKey) ?? monsterOptions[0];
  const [sim, setSim] = useState(() => makeInitialState(profile, monster));

  useEffect(() => {
    setRunning(false);
    setSim(makeInitialState(profile, monster));
  }, [jobKey, monsterKey, monster.id]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setSim((current) => simulateTick(current, profile, monster, strategy));
    }, Math.max(20, TICK_MS / speed));
    return () => window.clearInterval(timer);
  }, [running, profile, monster, strategy, speed]);

  const distance = Math.abs(sim.monster.x - sim.player.x);
  const hitRate = useMemo(() => getHitRate(profile, monster), [profile, monster]);
  const avgDamage = useMemo(() => averageDamageAfterDefense(profile, monster), [profile, monster]);
  const estimatedHits = Math.ceil(monster.maxHp / Math.max(1, avgDamage));
  const hpPerExp = monster.exp > 0 ? (monster.maxHp / monster.exp).toFixed(2) : '—';

  return (
    <div className="ai-battle-shell">
      <div className="ai-battle-top">
        <div>
          <p className="eyebrow">Tick-based Visual Simulator</p>
          <h2>实时伤害计算模拟器</h2>
          <p>当前怪物数据优先读取 public/data/app_metadata/monsters.json；没有数据时才使用 fallback。Zombie Mushroom 已按表格修正为 HP 443 / EXP 45 / P.DEF 15 / M.DEF 15 / ACC 108 / AVOID 15。</p>
        </div>
        <div className="ai-engine-badge">
          <span>{Math.round(1000 / TICK_MS)} Tick/s</span>
          <strong>{running ? 'RUNNING' : 'PAUSED'}</strong>
        </div>
      </div>

      <div className="ai-battle-controls">
        <label>
          怪物
          <select value={monsterKey} onChange={(event) => setMonsterKey(event.target.value)}>
            {monsterOptions.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
          </select>
        </label>
        <label>
          播放速度
          <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </label>
        <button className="ai-primary-btn" onClick={() => setRunning((value) => !value)}>{running ? '暂停模拟' : '开始模拟'}</button>
        <button className="ai-secondary-btn" onClick={() => setSim(makeInitialState(profile, monster))}>重置</button>
      </div>

      <div className="ai-stage-wrap">
        <div className="ai-stage">
          <div className="ai-stage-title">Training Field · {profile.label} vs {monster.name} · HP {monster.maxHp}</div>
          <div className="ai-range-zone" style={{ left: `${((sim.player.x - profile.attackRange) / WORLD_WIDTH) * 100}%`, width: `${(profile.attackRange * 2 / WORLD_WIDTH) * 100}%` }} />
          <div className="ai-collision-zone" style={{ left: `${((sim.player.x - COLLISION_RADIUS) / WORLD_WIDTH) * 100}%`, width: `${(COLLISION_RADIUS * 2 / WORLD_WIDTH) * 100}%` }} />
          <div className="ai-ground-line" />
          <SimulatorSprite type="player" x={sim.player.x} action={sim.player.action} iframes={sim.player.iframes} hp={sim.player.hp} maxHp={sim.player.maxHp} />
          {sim.monster.alive ? <SimulatorSprite type="monster" x={sim.monster.x} action={sim.monster.action} hp={sim.monster.hp} maxHp={sim.monster.maxHp} image={monster.gif || monster.thumbnail} /> : <div className="ai-respawn-marker" style={{ left: `${(monster.spawnX / WORLD_WIDTH) * 100}%` }}>respawn...</div>}
          {sim.floaters.map((item) => (
            <div key={item.id} className={`ai-floater ${item.type}`} style={{ left: `${(item.x / WORLD_WIDTH) * 100}%`, bottom: `${item.y}%`, opacity: item.opacity }}>
              {item.value}
            </div>
          ))}
        </div>
      </div>

      <div className="ai-panel-grid">
        <section className="ai-glass-panel">
          <h3>角色状态</h3>
          <StatBar label="HP" value={sim.player.hp} max={sim.player.maxHp} className="hp" />
          <StatBar label="MP" value={sim.player.mp} max={sim.player.maxMp} className="mp" />
          <StatBar label="EXP" value={sim.player.exp} max={100} className="exp" />
          <div className="ai-kpi-grid">
            <div><span>Lv</span><strong>{sim.player.level}</strong></div>
            <div><span>Meso</span><strong>{sim.player.meso}</strong></div>
            <div><span>Kills</span><strong>{sim.player.kills}</strong></div>
            <div><span>Hits</span><strong>{sim.player.hitsLanded}</strong></div>
          </div>
        </section>

        <section className="ai-glass-panel">
          <h3>怪物真实数据</h3>
          <StatBar label="MOB" value={sim.monster.hp} max={sim.monster.maxHp} className="hp" />
          <div className="ai-metric-list">
            <p><span>Level / HP / EXP</span><strong>Lv.{monster.level} / {monster.maxHp} / {monster.exp}</strong></p>
            <p><span>P.DMG / M.DMG</span><strong>{monster.physicalAttack} / {monster.magicAttack}</strong></p>
            <p><span>P.DEF / M.DEF</span><strong>{monster.physicalDefense} / {monster.magicDefense}</strong></p>
            <p><span>ACC / AVOID</span><strong>{monster.accuracy} / {monster.avoid}</strong></p>
            <p><span>HP/EXP</span><strong>{hpPerExp}</strong></p>
            <p><span>Attributes</span><strong>{monster.attributes.length ? monster.attributes.join(' · ') : '—'}</strong></p>
            <p><span>Source</span><strong>{monster.source}</strong></p>
          </div>
        </section>

        <section className="ai-glass-panel ai-formula-panel">
          <h3>实时公式回放</h3>
          <p>{sim.lastFormula}</p>
          <div className="ai-mini-tags">
            <span>策略：{strategy}</span>
            <span>资金：{budget}</span>
            <span>平均伤害≈{Math.round(avgDamage)}</span>
            <span>预计击数≈{estimatedHits}</span>
          </div>
        </section>
      </div>

      <div className="ai-panel-grid">
        <section className="ai-glass-panel">
          <h3>判定数据</h3>
          <div className="ai-metric-list">
            <p><span>Distance</span><strong>{Math.round(distance)} px</strong></p>
            <p><span>Attack Range</span><strong>{profile.attackRange} px</strong></p>
            <p><span>Collision Radius</span><strong>{COLLISION_RADIUS} px</strong></p>
            <p><span>Hit Rate</span><strong>{Math.round(hitRate * 100)}%</strong></p>
            <p><span>Defense Multiplier</span><strong>{getDefenseMultiplier(monster.physicalDefense).toFixed(3)}</strong></p>
          </div>
        </section>
        <section className="ai-glass-panel">
          <h3>消耗统计</h3>
          <div className="ai-metric-list">
            <p><span>HP Potions</span><strong>{sim.player.hpPotions}</strong></p>
            <p><span>MP Potions</span><strong>{sim.player.mpPotions}</strong></p>
            <p><span>Deaths</span><strong>{sim.player.deaths}</strong></p>
            <p><span>Total Damage Done</span><strong>{sim.player.damageDone}</strong></p>
          </div>
        </section>
        <section className="ai-glass-panel">
          <h3>数据校验</h3>
          <p className="section-copy">如果跳字是 111，Zombie Mushroom 的 443 HP 至少需要 4 次命中才会死亡；现在击杀判定只在当前 HP 扣到 0 后触发。</p>
        </section>
      </div>

      <div className="ai-architecture-grid">
        <article><strong>1. Tick Engine</strong><p>每 {TICK_MS}ms 推进一次状态，攻击冷却、移动、无敌帧、复活都走时间轴。</p></article>
        <article><strong>2. Spatial System</strong><p>Player_X / Monster_X 决定攻击范围、碰撞半径、击退方向和怪物追踪。</p></article>
        <article><strong>3. Render Layer</strong><p>HP/MP/EXP 条、sprite 状态、伤害跳字和事件日志全部监听模拟状态。</p></article>
        <article><strong>4. Data Adapter</strong><p>{dataCoverage ? `当前加载：${dataCoverage.monsters} monsters / ${dataCoverage.maps} maps / ${dataCoverage.items} items.` : '下一步接 MeowDB snapshots 和 AppData 映射。'}</p></article>
      </div>

      <section className="ai-log-panel">
        <h3>事件日志</h3>
        {sim.log.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}
      </section>
    </div>
  );
}
