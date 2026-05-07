import { MAPS, MONSTERS } from '../data/maps.js';

const FALLBACK_MONSTERS = Object.fromEntries(MONSTERS.map((monster) => [String(monster.id), monster]));

const CLASS_PROFILE = {
  warrior: { attackType: 'physical', range: 'melee', stat: 'STR', prefer: ['战士友好', '密集', '高密度', '密度高', '低成本'], avoid: ['法师友好'], safety: 1.15 },
  magician: { attackType: 'magic', range: 'magic', stat: 'INT', prefer: ['法师友好', '不死系', '稳定刷怪', '安全平台'], avoid: ['魔防高', '高血量'], safety: 1.06 },
  bowman: { attackType: 'physical', range: 'ranged', stat: 'DEX', prefer: ['远程友好', '长平台', '稳定刷怪'], avoid: ['贴脸'], safety: 0.96 },
  thief: { attackType: 'physical', range: 'hybrid', stat: 'LUK', prefer: ['热门', '高密度', '密集', '机动友好'], avoid: ['高血量'], safety: 0.98 },
  pirate: { attackType: 'physical', range: 'hybrid', stat: 'DEX', prefer: ['密集', '高密度', '机动友好'], avoid: ['高血量'], safety: 1.0 },
};

const BRANCH_PROFILE = {
  fighter: { range: 'melee', prefer: ['战士友好', '密集'] },
  page: { range: 'melee', prefer: ['战士友好', '低成本'], safety: 1.22 },
  spearman: { range: 'melee', prefer: ['密集', '高密度', '长平台'] },
  fp: { element: ['fire', 'poison'], prefer: ['法师友好', '高密度'] },
  il: { element: ['ice', 'lightning'], prefer: ['法师友好', '高密度', '控场友好'] },
  cleric: { element: ['holy'], undeadBonus: 1.32, prefer: ['不死系', '法师友好', '低成本'] },
  hunter: { range: 'ranged', prefer: ['远程友好', '长平台'] },
  crossbowman: { range: 'ranged', prefer: ['远程友好', '长平台'] },
  assassin: { range: 'ranged', prefer: ['远程友好', '热门', '长平台'] },
  bandit: { range: 'melee', prefer: ['密集', '高密度', '低成本'] },
  brawler: { range: 'melee', prefer: ['密集', '高密度', '低成本'] },
  gunslinger: { range: 'ranged', prefer: ['远程友好', '长平台'] },
};

const BUDGET = {
  low: { name: '低资金', minHit: 0.95, lowTol: 7, highTol: 5, danger: 1.25, value: 1.16 },
  mid: { name: '普通', minHit: 0.9, lowTol: 8, highTol: 7, danger: 1.0, value: 1.0 },
  high: { name: '有钱', minHit: 0.82, lowTol: 9, highTol: 10, danger: 0.78, value: 0.88 },
};

const MODE = {
  safe: { minHit: 0.03, highTol: -1, exp: 0.9, safety: 1.18, value: 1.05 },
  normal: { minHit: 0, highTol: 0, exp: 1, safety: 1, value: 1 },
  fast: { minHit: -0.04, highTol: 2, exp: 1.22, safety: 0.82, value: 0.95 },
};

const PRIORITY = {
  stable: { level: 0.22, hit: 0.2, exp: 0.18, speed: 0.1, safety: 0.2, density: 0.07, value: 0.03 },
  exp: { level: 0.18, hit: 0.16, exp: 0.3, speed: 0.18, safety: 0.08, density: 0.07, value: 0.03 },
  material: { level: 0.14, hit: 0.15, exp: 0.12, speed: 0.08, safety: 0.1, density: 0.1, value: 0.31 },
  meso: { level: 0.15, hit: 0.15, exp: 0.12, speed: 0.08, safety: 0.13, density: 0.1, value: 0.27 },
};

export function getMapRecommendations({
  classLine,
  branch,
  level,
  statPlan,
  budget = 'mid',
  priority = 'stable',
  mode = 'normal',
  maps = MAPS,
  monsters = MONSTERS,
  gear = [],
} = {}) {
  const playerLevel = clampInt(level, 1, 250);
  const profile = buildProfile(classLine, branch);
  const budgetProfile = buildBudget(budget, mode);
  const weights = PRIORITY[priority] ?? PRIORITY.stable;
  const combat = buildCombat({ classLine, profile, statPlan, level: playerLevel, gear });
  const monsterById = Object.fromEntries((monsters || []).map((monster) => {
    const m = normalizeMonster(monster);
    return [m.id, m];
  }));

  return (maps || [])
    .map((map) => scoreMap({ map, monsterById, playerLevel, profile, budgetProfile, weights, priority, mode, combat }))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.scoreParts.levelFit - a.scoreParts.levelFit || b.scoreParts.density - a.scoreParts.density)
    .map((map) => ({
      ...map,
      monsters: map.monsters.sort((a, b) => b.targetScore - a.targetScore),
    }));
}

export const getRouteRecommendationsV2 = getMapRecommendations;

function buildProfile(classLine, branch) {
  const base = CLASS_PROFILE[classLine?.id] ?? CLASS_PROFILE.warrior;
  const extra = BRANCH_PROFILE[branch?.id] ?? {};
  return {
    ...base,
    ...extra,
    prefer: [...new Set([...(extra.prefer ?? []), ...(base.prefer ?? [])])],
    avoid: [...new Set([...(extra.avoid ?? []), ...(base.avoid ?? [])])],
  };
}

function buildBudget(budget, mode) {
  const base = BUDGET[budget] ?? BUDGET.mid;
  const mod = MODE[mode] ?? MODE.normal;
  return {
    ...base,
    mode,
    minHit: clamp(base.minHit + mod.minHit, 0.72, 1),
    highTol: Math.max(3, base.highTol + mod.highTol),
    expMul: mod.exp,
    safetyMul: mod.safety,
    valueMul: mod.value,
  };
}

function buildCombat({ classLine, profile, statPlan, level, gear = [] }) {
  const stats = statPlan?.stats ?? {};
  const derived = statPlan?.derived ?? {};
  const gearBonus = getGearBonuses(gear);
  const primary = Number(stats[classLine?.primaryStat] ?? stats[profile.stat] ?? 4) + Number(gearBonus[classLine?.primaryStat] ?? gearBonus[profile.stat] ?? 0);
  const secondary = Number(stats[classLine?.secondaryStat] ?? 4) + Number(gearBonus[classLine?.secondaryStat] ?? 0);
  const physicalAccuracy = Number(derived.accuracy ?? 0) + gearBonus.ACC;
  const magicAccuracy = Number(derived.magicAccuracy ?? derived.accuracy ?? 0) + Math.round((gearBonus.INT + gearBonus.LUK) * 0.35);
  const attackPower = profile.attackType === 'magic'
    ? Math.max(1, Math.round(primary * 1.2 + secondary * 0.34 + level * 0.6 + gearBonus.MATK * 2.35))
    : Math.max(1, Math.round(primary * 1.34 + secondary * 0.44 + level * 0.72 + gearBonus.WATK * 2.65));

  return {
    level,
    attackPower,
    accuracy: Math.round(profile.attackType === 'magic' ? Math.max(magicAccuracy, physicalAccuracy * 0.8) : physicalAccuracy),
    hp: Number(derived.hp ?? 0) + gearBonus.HP,
    mp: Number(derived.mp ?? 0) + gearBonus.MP,
  };
}

function getGearBonuses(gear = []) {
  return (gear || []).reduce((sum, item) => {
    sum.STR += readGearValue(item, ['incSTR', 'str', 'STR']);
    sum.DEX += readGearValue(item, ['incDEX', 'dex', 'DEX']);
    sum.INT += readGearValue(item, ['incINT', 'int', 'INT']);
    sum.LUK += readGearValue(item, ['incLUK', 'luk', 'LUK']);
    sum.HP += readGearValue(item, ['incMHP', 'incMaxHP', 'incHP', 'hp']);
    sum.MP += readGearValue(item, ['incMMP', 'incMaxMP', 'incMP', 'mp']);
    sum.ACC += readGearValue(item, ['incACC', 'accuracy', 'acc']);
    sum.WATK += readGearValue(item, ['incPAD', 'pad', 'watk', 'attack']);
    sum.MATK += readGearValue(item, ['incMAD', 'mad', 'matk', 'magicAttack']);
    return sum;
  }, { STR: 0, DEX: 0, INT: 0, LUK: 0, HP: 0, MP: 0, ACC: 0, WATK: 0, MATK: 0 });
}

function readGearValue(item, keys) {
  for (const key of keys) {
    const value = item?.[key] ?? item?.stats?.[key] ?? item?.raw?.[key];
    if (value !== undefined && value !== null && value !== '') return Number(value) || 0;
  }
  return 0;
}

function scoreMap({ map, monsterById, playerLevel, profile, budgetProfile, weights, priority, mode, combat }) {
  const monsters = getMapMonsters(map, monsterById);
  if (!monsters.length) return null;

  const scoredMonsters = monsters.map((monster) => scoreMonster({ monster, playerLevel, profile, budgetProfile, weights, priority, combat }));
  const gate = routeGate({ map, monsters: scoredMonsters, playerLevel, budgetProfile, priority });
  if (gate.reject) return null;

  const spawnTotal = getSpawnTotal(map, scoredMonsters);
  const levelFit = weighted(scoredMonsters.map((monster) => [monster.scoreParts.levelFit, spawnWeight(monster, spawnTotal)]));
  const hit = weighted(scoredMonsters.map((monster) => [monster.scoreParts.hit, spawnWeight(monster, spawnTotal)]));
  const exp = weighted(scoredMonsters.map((monster) => [monster.scoreParts.exp, spawnWeight(monster, spawnTotal)]));
  const speed = weighted(scoredMonsters.map((monster) => [monster.scoreParts.speed, spawnWeight(monster, spawnTotal)]));
  const safety = weighted(scoredMonsters.map((monster) => [monster.scoreParts.safety, spawnWeight(monster, spawnTotal)]));
  const value = weighted(scoredMonsters.map((monster) => [monster.scoreParts.value, spawnWeight(monster, spawnTotal)]));
  const density = scoreDensity(map, spawnTotal);
  const layout = scoreLayout(map, profile);
  const mixedPenalty = scoredMonsters.reduce((sum, monster) => sum + (monster.isBadTarget ? spawnWeight(monster, spawnTotal) * 30 : 0), 0);

  const rawScore =
    levelFit * weights.level
    + hit * weights.hit
    + exp * weights.exp
    + speed * weights.speed
    + safety * weights.safety
    + density * weights.density
    + value * weights.value
    + layout * 0.06
    - mixedPenalty
    - gate.penalty;

  const score = Math.round(clamp(gate.cap == null ? rawScore : Math.min(rawScore, gate.cap), 0, 100));
  if (score <= 0) return null;

  return {
    ...map,
    monsters: scoredMonsters,
    score,
    accuracy: combat.accuracy,
    canHitAll: scoredMonsters.every((monster) => monster.hitRate >= 0.99),
    warning: buildWarning(scoredMonsters, budgetProfile, gate),
    reasons: buildReasons(scoredMonsters, { levelFit, hit, exp, safety, density, value, gate }),
    recommendationMeta: { budget: budgetProfile.name, priority, mode, combat, profile, gate },
    scoreParts: {
      levelFit: Math.round(levelFit),
      hit: Math.round(hit),
      exp: Math.round(exp),
      speed: Math.round(speed),
      safety: Math.round(safety),
      density: Math.round(density),
      value: Math.round(value),
      layoutFit: Math.round(layout),
      routeGate: gate.label,
      gatePenalty: Math.round(gate.penalty),
      mixedPenalty: Math.round(mixedPenalty),
    },
  };
}

function scoreMonster({ monster, playerLevel, profile, budgetProfile, weights, priority, combat }) {
  const m = normalizeMonster(monster);
  const levelDelta = m.level - playerLevel;
  const requiredAccuracy = getRequiredAccuracy(playerLevel, m);
  const hitRate = getHitRate(combat.accuracy, requiredAccuracy);
  const damage = estimateDamage(m, combat, profile);
  const ttd = Math.max(0.35, m.hp / Math.max(1, damage * Math.max(0.05, hitRate)));
  const expPerMinute = (60 / ttd) * m.exp;

  const levelFit = scoreMonsterLevelFit(levelDelta, budgetProfile, priority);
  const hit = scoreHit(hitRate, budgetProfile);
  const exp = clamp((expPerMinute / Math.max(15, Math.pow(playerLevel + 6, 1.36))) * 70 * budgetProfile.expMul, 0, 100);
  const speed = clamp((clamp(1.5 + levelDelta * 0.13, 0.9, 6.4) / ttd) * 72, 0, 100);
  const safety = scoreSafety(m, playerLevel, ttd, combat, profile, budgetProfile);
  const value = scoreValue(m, budgetProfile, priority);
  const underLevelBad = levelDelta < -budgetProfile.lowTol;
  const overLevelBad = levelDelta > budgetProfile.highTol || hitRate < budgetProfile.minHit;
  const offRoutePenalty = underLevelBad ? Math.abs(levelDelta + budgetProfile.lowTol) * (priority === 'material' || priority === 'meso' ? 3.2 : 8.5) : 0;
  const overPenalty = overLevelBad ? Math.max(0, levelDelta - budgetProfile.highTol) * 6 + Math.max(0, budgetProfile.minHit - hitRate) * 80 : 0;

  const targetScore = clamp(
    levelFit * weights.level
      + hit * weights.hit
      + exp * weights.exp
      + speed * weights.speed
      + safety * weights.safety
      + value * weights.value
      - offRoutePenalty
      - overPenalty,
    0,
    100,
  );

  return {
    ...m,
    requiredAccuracy,
    hitRate,
    hitPercent: Math.round(hitRate * 100),
    averageDamage: Math.round(damage),
    estimatedTimeToKill: round(ttd, 2),
    estimatedKillsPerMinute: round(60 / ttd, 1),
    estimatedExpPerMinute: Math.round(expPerMinute),
    isBadTarget: underLevelBad || overLevelBad,
    targetScore,
    scoreParts: {
      levelFit: Math.round(levelFit),
      hit: Math.round(hit),
      exp: Math.round(exp),
      speed: Math.round(speed),
      safety: Math.round(safety),
      value: Math.round(value),
      penalty: Math.round(offRoutePenalty + overPenalty),
    },
  };
}

function scoreMonsterLevelFit(levelDelta, budgetProfile, priority) {
  const farmGoal = priority === 'material' || priority === 'meso';
  if (levelDelta >= -3 && levelDelta <= 3) return 100;
  if (levelDelta >= -budgetProfile.lowTol && levelDelta <= budgetProfile.highTol) {
    const distance = levelDelta < -3 ? Math.abs(levelDelta + 3) : Math.abs(levelDelta - 3);
    return clamp(92 - distance * 6, 45, 94);
  }
  if (levelDelta < -budgetProfile.lowTol) {
    const base = farmGoal ? 42 : 18;
    return clamp(base - Math.abs(levelDelta + budgetProfile.lowTol) * (farmGoal ? 4 : 8), 0, base);
  }
  return clamp(48 - (levelDelta - budgetProfile.highTol) * 7, 0, 48);
}

function routeGate({ map, monsters, playerLevel, budgetProfile, priority }) {
  const levels = monsters.map((monster) => monster.level);
  const min = Math.min(...levels, ...(Array.isArray(map?.levelRange) ? [map.levelRange[0]] : []));
  const max = Math.max(...levels, ...(Array.isArray(map?.levelRange) ? [map.levelRange[1]] : []));
  const tooLow = playerLevel - max;
  const tooHigh = min - playerLevel;
  const farmGoal = priority === 'material' || priority === 'meso';

  if (tooLow > 20 && !farmGoal) return { reject: true, label: 'too-low', penalty: 100, cap: 0 };
  if (tooLow > budgetProfile.lowTol) {
    return {
      reject: false,
      label: farmGoal ? 'farm-only-low-level' : 'too-low-capped',
      penalty: farmGoal ? Math.min(20, tooLow * 1.1) : Math.min(44, tooLow * 2.8),
      cap: farmGoal ? clamp(52 - tooLow * 0.7, 30, 52) : clamp(38 - tooLow * 1.2, 12, 38),
    };
  }
  if (tooHigh > budgetProfile.highTol + 5) return { reject: true, label: 'too-high', penalty: 100, cap: 0 };
  if (tooHigh > budgetProfile.highTol) {
    return {
      reject: false,
      label: 'too-high-risky',
      penalty: Math.min(36, tooHigh * 2.8),
      cap: clamp(70 - tooHigh * 2.5, 38, 70),
    };
  }
  return { reject: false, label: 'main-route', penalty: 0, cap: null };
}

function scoreDensity(map, spawnTotal) {
  const rate = Number(map?.mobRate ?? map?.spawnRate ?? 1);
  const tagBonus = hasAnyTag(map, ['密集', '高密度', '密度高', '热门']) ? 12 : hasAnyTag(map, ['稳定刷怪', '刷怪顺手']) ? 7 : 0;
  return clamp(Math.log2(Math.max(1, spawnTotal) + 1) * 14 + clamp(rate * 8, 0, 18) + tagBonus, 0, 100);
}

function scoreLayout(map, profile) {
  const tags = safeArray(map?.tags);
  let score = 54;
  for (const tag of profile.prefer ?? []) if (tags.includes(tag)) score += 8;
  for (const tag of profile.avoid ?? []) if (tags.includes(tag)) score -= 8;
  if (profile.range === 'melee' && hasAnyTag(map, ['密集', '高密度', '战士友好'])) score += 10;
  if (profile.range === 'ranged' && hasAnyTag(map, ['远程友好', '长平台'])) score += 10;
  if (profile.range === 'magic' && hasAnyTag(map, ['法师友好', '不死系', '安全平台'])) score += 12;
  return clamp(score, 0, 100);
}

function scoreHit(hitRate, budgetProfile) {
  if (hitRate >= 0.99) return 100;
  if (hitRate >= budgetProfile.minHit) return 86 + (hitRate - budgetProfile.minHit) * 120;
  if (hitRate >= 0.8) return 58 + (hitRate - 0.8) * 120;
  if (hitRate >= 0.6) return 30 + (hitRate - 0.6) * 110;
  return hitRate * 45;
}

function scoreSafety(monster, playerLevel, ttd, combat, profile, budgetProfile) {
  const incoming = Math.max(monster.physicalAttack, monster.magicAttack, monster.level * 2.2);
  const contact = profile.range === 'ranged' ? 0.68 : profile.range === 'magic' ? 0.78 : 1.08;
  const exposure = Math.min(1.55, ttd / 4.2) * contact;
  const levelRisk = clamp((monster.level - playerLevel) * 3.5, -14, 42);
  const hpBuffer = combat.hp ? clamp(combat.hp / Math.max(1, incoming * 5.5), 0.42, 1.4) : 0.88;
  const risk = ((incoming * exposure * budgetProfile.danger * (profile.safety ?? 1)) / Math.max(42, playerLevel * 6)) + levelRisk / 100;
  return clamp(100 - risk * 86 / hpBuffer, 0, 100) * budgetProfile.safetyMul;
}

function scoreValue(monster, budgetProfile, priority) {
  const drops = safeArray(monster.drops ?? monster.dropItems ?? monster.materials).length;
  const base = Math.log10(Math.max(2, monster.exp + monster.spawnCount * 10 + drops * 18)) * 22 + drops * 4;
  const farmBonus = priority === 'material' || priority === 'meso' ? 1.15 : 1;
  return clamp(base * budgetProfile.value * budgetProfile.valueMul * farmBonus, 0, 100);
}

function estimateDamage(monster, combat, profile) {
  const defense = profile.attackType === 'magic' ? monster.magicDefense : monster.defense;
  const defensePenalty = Math.min(0.48, Number(defense || 0) / Math.max(420, combat.attackPower * 18));
  const element = elementMultiplier(monster, profile);
  const range = profile.range === 'melee' ? 1.06 : profile.range === 'ranged' ? 0.98 : 1;
  return Math.max(1, combat.attackPower * (1 - defensePenalty) * element * range);
}

function elementMultiplier(monster, profile) {
  const elements = safeArray(profile.element).map((x) => String(x).toLowerCase());
  const weak = safeArray(monster.elementWeakness).map((x) => String(x).toLowerCase());
  const resist = safeArray(monster.elementResist).map((x) => String(x).toLowerCase());
  if (profile.undeadBonus && monster.undead) return profile.undeadBonus;
  if (elements.some((element) => weak.includes(element))) return 1.18;
  if (elements.some((element) => resist.includes(element))) return 0.76;
  return 1;
}

function getMapMonsters(map, monsterById) {
  if (Array.isArray(map?.monsterDetails)) return map.monsterDetails.map(normalizeMonster);
  return (map?.monsters || [])
    .map((entry) => (typeof entry === 'object' ? entry : monsterById[String(entry)] ?? FALLBACK_MONSTERS[String(entry)]))
    .filter(Boolean)
    .map(normalizeMonster);
}

function normalizeMonster(monster) {
  const physicalAttack = Number(monster?.physicalAttack ?? monster?.PADamage ?? monster?.pad ?? 0);
  const magicAttack = Number(monster?.magicAttack ?? monster?.MADamage ?? monster?.mad ?? 0);
  return {
    ...monster,
    id: String(monster?.id ?? monster?.rawId ?? monster?.name ?? 'unknown'),
    name: monster?.name ?? monster?.displayName ?? `Monster ${monster?.id ?? ''}`,
    level: Number(monster?.level ?? monster?.lv ?? 1),
    hp: Math.max(1, Number(monster?.hp ?? monster?.maxHP ?? 1)),
    exp: Math.max(0, Number(monster?.exp ?? monster?.experience ?? 0)),
    avoid: Number(monster?.avoid ?? monster?.eva ?? monster?.evasion ?? 0),
    requiredAccuracy: Number(monster?.requiredAccuracy ?? monster?.reqAccuracy ?? 0),
    defense: Number(monster?.defense ?? monster?.physicalDefense ?? monster?.PDDamage ?? monster?.pdd ?? 0),
    magicDefense: Number(monster?.magicDefense ?? monster?.MDDamage ?? monster?.mdd ?? 0),
    physicalAttack,
    magicAttack,
    spawnCount: Math.max(1, Number(monster?.spawnCount ?? monster?.count ?? monster?.mobCount ?? 1)),
    elementWeakness: safeArray(monster?.elementWeakness ?? monster?.weakness),
    elementResist: safeArray(monster?.elementResist ?? monster?.resist),
    undead: Boolean(monster?.undead ?? monster?.isUndead),
  };
}

function getRequiredAccuracy(playerLevel, monster) {
  if (Number(monster.requiredAccuracy) > 0) {
    return Math.max(1, Math.ceil(Number(monster.requiredAccuracy) + Math.max(0, monster.level - playerLevel) * 1.35));
  }
  return Math.max(1, Math.ceil(((55 + Math.max(0, monster.level - playerLevel) * 2) * Math.max(0, monster.avoid)) / 15));
}

function getHitRate(accuracy, requiredAccuracy) {
  return requiredAccuracy ? clamp(Number(accuracy ?? 0) / requiredAccuracy, 0, 1) : 1;
}

function getSpawnTotal(map, monsters) {
  return Number(map?.spawnTotal ?? map?.mobCount ?? monsters.reduce((sum, monster) => sum + monster.spawnCount, 0));
}

function spawnWeight(monster, spawnTotal) {
  return spawnTotal ? Math.max(0.04, monster.spawnCount / spawnTotal) : 1;
}

function weighted(pairs) {
  const total = pairs.reduce((sum, [, weight]) => sum + Number(weight || 0), 0) || 1;
  return pairs.reduce((sum, [value, weight]) => sum + Number(value || 0) * Number(weight || 0), 0) / total;
}

function buildWarning(monsters, budgetProfile, gate) {
  if (gate.label === 'farm-only-low-level') return '等级偏低：只适合回刷材料/金币，不建议作为主练级地图。';
  if (gate.label === 'too-low-capped') return '等级偏低：系统已压低分数，建议换更高等级地图练级。';
  if (gate.label === 'too-high-risky') return '越级偏多：如果伤害或命中不够，实际效率会明显下降。';
  const bad = monsters.filter((monster) => monster.hitRate < budgetProfile.minHit);
  return bad.length ? `${bad.slice(0, 3).map((monster) => monster.name).join('、')} 命中未达到 ${Math.round(budgetProfile.minHit * 100)}% 稳定线。` : '命中、等级和风险都比较稳定，可以尝试。';
}

function buildReasons(monsters, parts) {
  const best = [...monsters].sort((a, b) => b.targetScore - a.targetScore)[0];
  return [
    best ? `主目标 ${best.name}：Lv.${best.level} / 命中 ${best.hitPercent}% / ${best.estimatedTimeToKill}s 击杀` : '',
    parts.gate.label === 'main-route' ? '等级区间适合作为主路线。' : '',
    parts.density >= 65 ? `地图密度评分 ${Math.round(parts.density)}，刷怪节奏较好。` : '',
    parts.value >= 70 ? '掉落/材料价值较好。' : '',
  ].filter(Boolean).slice(0, 4);
}

export function getMonsterRows(map) {
  return (map?.monsters ?? []).map((monster) => ({
    name: monster.name,
    level: monster.level,
    hp: monster.hp,
    exp: monster.exp,
    requiredAccuracy: monster.requiredAccuracy,
    hitPercent: monster.hitPercent,
    defense: monster.defense,
    attackType: monster.attackType,
    element: formatElement(monster),
    estimatedTimeToKill: monster.estimatedTimeToKill,
    estimatedExpPerMinute: monster.estimatedExpPerMinute,
    targetScore: Math.round(monster.targetScore ?? 0),
  }));
}

function formatElement(monster) {
  const weak = safeArray(monster?.elementWeakness).length ? `弱: ${safeArray(monster.elementWeakness).join('/')}` : '无明显弱点';
  const resist = safeArray(monster?.elementResist).length ? `抗: ${safeArray(monster.elementResist).join('/')}` : '无明显抗性';
  return `${weak}; ${resist}`;
}

function hasAnyTag(map, tags) {
  const current = safeArray(map?.tags);
  return tags.some((tag) => current.includes(tag));
}

function safeArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function clampInt(value, min, max) {
  return Math.round(clamp(value, min, max));
}

function round(value, digits = 1) {
  const scale = 10 ** digits;
  return Math.round((Number(value) || 0) * scale) / scale;
}
