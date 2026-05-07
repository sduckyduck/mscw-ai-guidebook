import { MAPS, MONSTERS } from '../data/maps.js';

const seedMonsterById = Object.fromEntries(MONSTERS.map((monster) => [String(monster.id), monster]));

const CLASS_PROFILES = {
  warrior: {
    attackType: 'physical',
    rangeType: 'melee',
    damageStat: 'STR',
    preferredTags: ['战士友好', '密集', '高密度', '密度高', '稳定刷怪', '低成本', '刷怪顺手'],
    badTags: ['法师友好', '远程友好'],
    safety: 1.18,
    density: 1.08,
    cost: 1.12,
  },
  magician: {
    attackType: 'magic',
    rangeType: 'magic',
    damageStat: 'INT',
    preferredTags: ['法师友好', '不死系', '稳定刷怪', '高密度', '安全平台'],
    badTags: ['高血量', '魔防高'],
    safety: 1.08,
    density: 1.02,
    cost: 0.94,
  },
  bowman: {
    attackType: 'physical',
    rangeType: 'ranged',
    damageStat: 'DEX',
    preferredTags: ['远程友好', '稳定刷怪', '热门', '长平台', '低成本'],
    badTags: ['消耗较高', '贴脸', '高血量'],
    safety: 0.98,
    density: 0.98,
    cost: 1.0,
  },
  thief: {
    attackType: 'physical',
    rangeType: 'hybrid',
    damageStat: 'LUK',
    preferredTags: ['热门', '高密度', '密集', '稳定刷怪', '机动友好'],
    badTags: ['高血量'],
    safety: 0.96,
    density: 1.03,
    cost: 1.08,
  },
  pirate: {
    attackType: 'physical',
    rangeType: 'hybrid',
    damageStat: 'DEX',
    preferredTags: ['密集', '高密度', '稳定刷怪', '机动友好'],
    badTags: ['高血量'],
    safety: 1.0,
    density: 1.02,
    cost: 1.03,
  },
};

const BRANCH_OVERRIDES = {
  fighter: { rangeType: 'melee', preferredTags: ['战士友好', '密集', '高密度'] },
  page: { rangeType: 'melee', preferredTags: ['战士友好', '低成本', '稳定刷怪'], safety: 1.28, cost: 1.18 },
  spearman: { rangeType: 'melee', preferredTags: ['密集', '高密度', '战士友好', '长平台'], density: 1.14 },
  fp: { elementBias: ['fire', 'poison'], preferredTags: ['法师友好', '高密度', '稳定刷怪'] },
  il: { elementBias: ['ice', 'lightning'], preferredTags: ['法师友好', '高密度', '稳定刷怪', '控场友好'] },
  cleric: { elementBias: ['holy'], undeadBonus: 1.3, preferredTags: ['不死系', '法师友好', '稳定刷怪', '低成本'], cost: 0.84 },
  hunter: { rangeType: 'ranged', preferredTags: ['远程友好', '稳定刷怪', '热门', '长平台'] },
  crossbowman: { rangeType: 'ranged', preferredTags: ['远程友好', '稳定刷怪', '热门', '长平台'] },
  assassin: { rangeType: 'ranged', preferredTags: ['远程友好', '热门', '稳定刷怪', '长平台'], cost: 1.18 },
  bandit: { rangeType: 'melee', preferredTags: ['密集', '高密度', '热门', '低成本'], safety: 1.08 },
  brawler: { rangeType: 'melee', preferredTags: ['密集', '高密度', '低成本'], safety: 1.08 },
  gunslinger: { rangeType: 'ranged', preferredTags: ['远程友好', '稳定刷怪', '热门', '长平台'] },
};

const BUDGETS = {
  low: { id: 'low', name: '低资金', minHit: 0.95, highTol: 6, lowTol: 9, potion: 1.32, danger: 1.28, cost: 1.32, value: 1.18 },
  mid: { id: 'mid', name: '普通', minHit: 0.9, highTol: 8, lowTol: 10, potion: 1, danger: 1, cost: 1, value: 1 },
  high: { id: 'high', name: '有钱', minHit: 0.82, highTol: 11, lowTol: 11, potion: 0.72, danger: 0.82, cost: 0.72, value: 0.86 },
};

const MODES = {
  safe: { minHit: 0.03, highTol: -2, multipliers: { safety: 1.18, cost: 1.12, exp: 0.9, density: 0.95 } },
  normal: { minHit: 0, highTol: 0, multipliers: {} },
  fast: { minHit: -0.04, highTol: 2, multipliers: { safety: 0.84, cost: 0.78, exp: 1.2, density: 1.13 } },
};

const WEIGHTS = {
  stable: { feasible: 0.22, exp: 0.18, speed: 0.1, density: 0.11, safety: 0.22, cost: 0.1, value: 0.02, classFit: 0.05 },
  exp: { feasible: 0.18, exp: 0.3, speed: 0.17, density: 0.15, safety: 0.08, cost: 0.04, value: 0.03, classFit: 0.05 },
  material: { feasible: 0.16, exp: 0.12, speed: 0.08, density: 0.12, safety: 0.1, cost: 0.07, value: 0.29, classFit: 0.06 },
  meso: { feasible: 0.17, exp: 0.12, speed: 0.08, density: 0.11, safety: 0.12, cost: 0.1, value: 0.24, classFit: 0.06 },
};

const DEFAULT_PRIORITY = 'stable';

export function getMapRecommendations({
  classLine,
  branch,
  level,
  statPlan,
  budget = 'mid',
  priority = DEFAULT_PRIORITY,
  mode = 'normal',
  maps = MAPS,
  monsters = MONSTERS,
  gear = [],
  masterSuggestions = [],
  communitySuggestions = [],
} = {}) {
  const playerLevel = clampInt(level, 1, 250);
  const profile = getProfile(classLine, branch);
  const budgetProfile = applyMode(BUDGETS[budget] ?? BUDGETS.mid, MODES[mode] ?? MODES.normal);
  const weights = applyWeightMode(WEIGHTS[priority] ?? WEIGHTS[DEFAULT_PRIORITY], MODES[mode] ?? MODES.normal);
  const combat = buildCombatSnapshot({ classLine, profile, level: playerLevel, statPlan, gear });
  const monsterById = Object.fromEntries((monsters || []).map((monster) => {
    const normalized = normalizeMonster(monster);
    return [normalized.id, normalized];
  }));
  const masterIndex = buildSuggestionIndex(masterSuggestions);
  const communityIndex = buildSuggestionIndex(communitySuggestions);

  return (maps || [])
    .map((map) => buildMapRecommendation({
      map,
      monsterById,
      playerLevel,
      combat,
      profile,
      budgetProfile,
      weights,
      priority,
      mode,
      classId: classLine?.id,
      masterIndex,
      communityIndex,
    }))
    .filter(Boolean)
    .filter((map) => map.monsters.length && map.score > 0)
    .sort((a, b) => (
      b.score - a.score
      || (b.scoreParts?.levelFit ?? 0) - (a.scoreParts?.levelFit ?? 0)
      || Number(b.spawnTotal ?? 0) - Number(a.spawnTotal ?? 0)
    ));
}

export const getRouteRecommendationsV2 = getMapRecommendations;

export function buildCharacterSnapshot({ classLine, branch, level, statPlan, budget = 'mid', mode = 'normal', gear = [] } = {}) {
  const profile = getProfile(classLine, branch);
  const budgetProfile = applyMode(BUDGETS[budget] ?? BUDGETS.mid, MODES[mode] ?? MODES.normal);
  const playerLevel = clampInt(level, 1, 250);
  return {
    level: playerLevel,
    classId: classLine?.id,
    branchId: branch?.id,
    profile,
    budgetProfile,
    combat: buildCombatSnapshot({ classLine, profile, level: playerLevel, statPlan, gear }),
  };
}

function buildMapRecommendation({ map, monsterById, playerLevel, combat, profile, budgetProfile, weights, priority, mode, classId, masterIndex, communityIndex }) {
  const mapMonsters = getMapMonsters(map, monsterById);
  const rankedMonsters = rankMonstersForPlayer({ level: playerLevel, combat, profile, budgetProfile, weights, monsters: mapMonsters });
  const gate = analyzeMapGate({ map, monsters: rankedMonsters, level: playerLevel, budgetProfile, priority });

  if (gate.reject) return null;

  const scoreParts = scoreMap({
    map,
    monsters: rankedMonsters,
    profile,
    budgetProfile,
    weights,
    level: playerLevel,
    priority,
    gate,
    masterBoost: getSuggestionBoost(map, masterIndex, 8),
    communityBoost: getSuggestionBoost(map, communityIndex, 6),
  });

  const cappedScore = gate.scoreCap == null ? scoreParts.total : Math.min(scoreParts.total, gate.scoreCap);
  const score = Math.round(clamp(cappedScore, 0, 100));

  return {
    ...map,
    monsters: rankedMonsters,
    score,
    scoreParts: {
      ...scoreParts,
      routeGate: gate.label,
      gatePenalty: Math.round(gate.penalty),
      scoreCap: gate.scoreCap,
    },
    accuracy: combat.accuracy,
    canHitAll: rankedMonsters.length ? rankedMonsters.every((monster) => monster.hitRate >= 0.99) : false,
    warning: buildWarning({ monsters: rankedMonsters, classId, budgetProfile, gate }),
    reasons: buildMapReasons({ monsters: rankedMonsters, scoreParts, profile, budgetProfile, gate }),
    recommendationMeta: {
      budget: budgetProfile.name,
      priority,
      mode,
      combat,
      profile,
      gate,
    },
  };
}

function getProfile(classLine, branch) {
  const base = CLASS_PROFILES[classLine?.id] ?? CLASS_PROFILES.warrior;
  const override = BRANCH_OVERRIDES[branch?.id] ?? {};
  return {
    ...base,
    ...override,
    preferredTags: [...new Set([...(override.preferredTags ?? []), ...(base.preferredTags ?? [])])],
    badTags: [...new Set([...(override.badTags ?? []), ...(base.badTags ?? [])])],
  };
}

function applyMode(budget, mode) {
  return {
    ...budget,
    minHit: clamp((budget.minHit ?? 0.9) + (mode.minHit ?? 0), 0.72, 1),
    highTol: Math.max(3, (budget.highTol ?? 8) + (mode.highTol ?? 0)),
  };
}

function applyWeightMode(weights, mode) {
  const next = { ...weights };
  for (const [key, multiplier] of Object.entries(mode.multipliers ?? {})) {
    if (next[key] !== undefined) next[key] *= multiplier;
  }
  const total = Object.values(next).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  return Object.fromEntries(Object.entries(next).map(([key, value]) => [key, value / total]));
}

function buildCombatSnapshot({ classLine, profile, level, statPlan, gear = [] }) {
  const stats = statPlan?.stats ?? {};
  const derived = statPlan?.derived ?? {};
  const gearBonus = getGearBonuses(gear);
  const primaryKey = classLine?.primaryStat ?? profile.damageStat;
  const secondaryKey = classLine?.secondaryStat;
  const primaryStat = Number(stats[primaryKey] ?? stats[profile.damageStat] ?? 4) + Number(gearBonus[primaryKey] ?? gearBonus[profile.damageStat] ?? 0);
  const secondaryStat = Number(stats[secondaryKey] ?? 4) + Number(gearBonus[secondaryKey] ?? 0);
  const physicalAccuracy = Number(derived.accuracy ?? 0) + gearBonus.ACC;
  const magicAccuracy = Number(derived.magicAccuracy ?? derived.accuracy ?? 0) + Math.round((gearBonus.INT + gearBonus.LUK) * 0.35);
  const attackPower = profile.attackType === 'magic'
    ? Math.max(1, Math.round(primaryStat * 1.2 + secondaryStat * 0.34 + Number(level) * 0.58 + gearBonus.MATK * 2.35))
    : Math.max(1, Math.round(primaryStat * 1.34 + secondaryStat * 0.44 + Number(level) * 0.72 + gearBonus.WATK * 2.65));

  return {
    level: Number(level) || 1,
    attackType: profile.attackType,
    primaryStat,
    secondaryStat,
    attackPower,
    accuracy: Math.round(profile.attackType === 'magic' ? Math.max(magicAccuracy, physicalAccuracy * 0.8) : physicalAccuracy),
    hp: Number(derived.hp ?? 0) + gearBonus.HP,
    mp: Number(derived.mp ?? 0) + gearBonus.MP,
    gearBonus,
  };
}

function getGearBonuses(gear = []) {
  return (gear || []).reduce((sum, item) => {
    sum.STR += readGearValue(item, ['incSTR', 'str', 'STR']);
    sum.DEX += readGearValue(item, ['incDEX', 'dex', 'DEX']);
    sum.INT += readGearValue(item, ['incINT', 'int', 'INT']);
    sum.LUK += readGearValue(item, ['incLUK', 'luk', 'LUK']);
    sum.HP += readGearValue(item, ['incMHP', 'incMaxHP', 'incHP', 'mhp', 'hp']);
    sum.MP += readGearValue(item, ['incMMP', 'incMaxMP', 'incMP', 'mmp', 'mp']);
    sum.ACC += readGearValue(item, ['incACC', 'accuracy', 'acc']);
    sum.WATK += readGearValue(item, ['incPAD', 'pad', 'watk', 'attack']);
    sum.MATK += readGearValue(item, ['incMAD', 'mad', 'matk', 'magicAttack']);
    return sum;
  }, { STR: 0, DEX: 0, INT: 0, LUK: 0, HP: 0, MP: 0, ACC: 0, WATK: 0, MATK: 0 });
}

function readGearValue(item, aliases) {
  for (const key of aliases) {
    const value = item?.[key] ?? item?.stats?.[key] ?? item?.raw?.[key];
    if (value !== undefined && value !== null && value !== '') return Number(value) || 0;
  }
  return 0;
}

function getMapMonsters(map, monsterById) {
  if (Array.isArray(map?.monsterDetails)) return map.monsterDetails.map(normalizeMonster);
  return (map?.monsters || [])
    .map((entry) => {
      if (typeof entry === 'object') return normalizeMonster(entry);
      return monsterById[String(entry)] ?? seedMonsterById[String(entry)];
    })
    .filter(Boolean)
    .map(normalizeMonster);
}

function normalizeMonster(monster) {
  const level = Number(monster?.level ?? monster?.lv ?? 1);
  const physicalAttack = Number(monster?.physicalAttack ?? monster?.PADamage ?? monster?.pad ?? 0);
  const magicAttack = Number(monster?.magicAttack ?? monster?.MADamage ?? monster?.mad ?? 0);

  return {
    ...monster,
    id: String(monster?.id ?? monster?.rawId ?? monster?.name ?? 'unknown'),
    name: monster?.name ?? monster?.displayName ?? `Monster ${monster?.id ?? ''}`,
    level,
    hp: Math.max(1, Number(monster?.hp ?? monster?.maxHP ?? 1)),
    exp: Math.max(0, Number(monster?.exp ?? monster?.experience ?? 0)),
    avoid: Number(monster?.avoid ?? monster?.eva ?? monster?.evasion ?? 0),
    requiredAccuracy: Number(monster?.requiredAccuracy ?? monster?.reqAccuracy ?? 0),
    defense: Number(monster?.defense ?? monster?.physicalDefense ?? monster?.PDDamage ?? monster?.pdd ?? 0),
    magicDefense: Number(monster?.magicDefense ?? monster?.MDDamage ?? monster?.mdd ?? 0),
    physicalAttack,
    magicAttack,
    spawnCount: Math.max(1, Number(monster?.spawnCount ?? monster?.count ?? monster?.mobCount ?? 1)),
    mobTime: Number(monster?.mobTime ?? monster?.mob_time ?? monster?.respawn ?? 0),
    elementWeakness: safeArray(monster?.elementWeakness ?? monster?.weakness),
    elementResist: safeArray(monster?.elementResist ?? monster?.resist),
    undead: Boolean(monster?.undead ?? monster?.isUndead),
    attackType: monster?.attackType ?? (magicAttack > physicalAttack ? 'magic' : 'contact'),
  };
}

function rankMonstersForPlayer({ level, combat, profile, budgetProfile, weights, monsters }) {
  return (monsters || [])
    .map((monster) => scoreMonster({ monster, level, combat, profile, budgetProfile, weights }))
    .sort((a, b) => b.targetScore - a.targetScore || b.spawnCount - a.spawnCount || Math.abs(a.level - level) - Math.abs(b.level - level));
}

export function scoreMonsterForCharacter(input = {}) {
  const snapshot = input.combat ? input : buildCharacterSnapshot(input);
  return scoreMonster({
    monster: normalizeMonster(input.monster),
    level: snapshot.level ?? input.level,
    combat: snapshot.combat ?? input.combat,
    profile: snapshot.profile ?? input.profile,
    budgetProfile: snapshot.budgetProfile ?? BUDGETS.mid,
    weights: WEIGHTS[input.priority ?? DEFAULT_PRIORITY] ?? WEIGHTS[DEFAULT_PRIORITY],
  });
}

function scoreMonster({ monster, level, combat, profile, budgetProfile, weights }) {
  const normalized = normalizeMonster(monster);
  const requiredAccuracy = getRequiredAccuracy(level, normalized);
  const hitRate = getHitRate(combat.accuracy, requiredAccuracy);
  const levelDelta = normalized.level - Number(level);
  const averageDamage = estimateAverageDamage({ monster: normalized, combat, profile });
  const timeToKill = Math.max(0.35, normalized.hp / Math.max(1, averageDamage * Math.max(0.05, hitRate)));
  const killsPerMinute = 60 / timeToKill;
  const expPerMinute = killsPerMinute * normalized.exp;
  const hit = scoreHit(hitRate, budgetProfile);
  const exp = scoreExp(expPerMinute, level);
  const speed = scoreSpeed(timeToKill, normalized.level, level);
  const safety = scoreSafety({ monster: normalized, level, timeToKill, combat, profile, budgetProfile });
  const classFit = scoreClassFit({ monster: normalized, profile, levelDelta });
  const value = scoreValue({ monster: normalized, budgetProfile });
  const levelFit = scoreMonsterLevelFit(levelDelta, budgetProfile);
  const hitPenalty = Math.max(0, budgetProfile.minHit - hitRate) * 70;
  const lowPenalty = levelDelta < -budgetProfile.lowTol ? Math.abs(levelDelta + budgetProfile.lowTol) * 4.2 : 0;
  const highPenalty = levelDelta > budgetProfile.highTol ? (levelDelta - budgetProfile.highTol) * 5.8 : 0;
  const targetScore = clamp(
    hit * weights.feasible
      + exp * weights.exp
      + speed * weights.speed
      + safety * weights.safety
      + classFit * weights.classFit
      + value * weights.value
      + levelFit * 0.12
      - hitPenalty
      - lowPenalty
      - highPenalty,
    0,
    100,
  );

  return {
    ...normalized,
    requiredAccuracy,
    hitRate,
    hitPercent: Math.round(hitRate * 100),
    averageDamage: Math.round(averageDamage),
    estimatedTimeToKill: round(timeToKill, 2),
    estimatedKillsPerMinute: round(killsPerMinute, 1),
    estimatedExpPerMinute: Math.round(expPerMinute),
    scoreParts: {
      hit: Math.round(hit),
      exp: Math.round(exp),
      speed: Math.round(speed),
      safety: Math.round(safety),
      classFit: Math.round(classFit),
      value: Math.round(value),
      levelFit: Math.round(levelFit),
      penalty: Math.round(hitPenalty + lowPenalty + highPenalty),
    },
    targetScore,
  };
}

function estimateAverageDamage({ monster, combat, profile }) {
  const defense = profile.attackType === 'magic' ? monster.magicDefense : monster.defense;
  const defensePenalty = Math.min(0.48, Number(defense || 0) / Math.max(420, combat.attackPower * 18));
  const elementMultiplier = getElementMultiplier(monster, profile);
  const rangeMultiplier = profile.rangeType === 'melee' ? 1.06 : profile.rangeType === 'ranged' ? 0.98 : 1;
  return Math.max(1, combat.attackPower * (1 - defensePenalty) * elementMultiplier * rangeMultiplier);
}

function getElementMultiplier(monster, profile) {
  const biases = safeArray(profile.elementBias).map((x) => String(x).toLowerCase());
  const weak = safeArray(monster.elementWeakness).map((x) => String(x).toLowerCase());
  const resist = safeArray(monster.elementResist).map((x) => String(x).toLowerCase());

  if (profile.undeadBonus && monster.undead) return Number(profile.undeadBonus) || 1.25;
  if (biases.some((element) => weak.includes(element))) return 1.18;
  if (biases.some((element) => resist.includes(element))) return 0.76;
  if (profile.attackType === 'magic' && resist.length >= 2) return 0.9;
  return 1;
}

function scoreHit(hitRate, budgetProfile) {
  const minimum = budgetProfile.minHit;
  if (hitRate >= 0.99) return 100;
  if (hitRate >= minimum) return 86 + (hitRate - minimum) * 120;
  if (hitRate >= 0.8) return 55 + (hitRate - 0.8) * 125;
  if (hitRate >= 0.6) return 28 + (hitRate - 0.6) * 120;
  return Math.max(0, hitRate * 45);
}

function scoreExp(expPerMinute, level) {
  const expected = Math.max(15, Math.pow(Number(level) + 6, 1.36));
  return clamp((expPerMinute / expected) * 70, 0, 100);
}

function scoreSpeed(timeToKill, monsterLevel, playerLevel) {
  const expectedSeconds = clamp(1.6 + (Number(monsterLevel) - Number(playerLevel)) * 0.12, 0.9, 6.2);
  return clamp((expectedSeconds / Math.max(0.35, timeToKill)) * 72, 0, 100);
}

function scoreSafety({ monster, level, timeToKill, combat, profile, budgetProfile }) {
  const incoming = Math.max(monster.physicalAttack, monster.magicAttack, monster.level * 2.3);
  const levelRisk = clamp((monster.level - level) * 3.6, -14, 42);
  const hpBuffer = combat.hp ? clamp(combat.hp / Math.max(1, incoming * 5.5), 0.42, 1.4) : 0.88;
  const contactFactor = profile.rangeType === 'ranged' ? 0.7 : profile.rangeType === 'magic' ? 0.8 : 1.08;
  const exposure = Math.min(1.55, timeToKill / 4.2) * contactFactor;
  const risk = ((incoming * exposure * budgetProfile.potion * profile.safety) / Math.max(42, level * 6)) + levelRisk / 100;
  return clamp(100 - risk * 86 / hpBuffer, 0, 100);
}

function scoreClassFit({ monster, profile, levelDelta }) {
  let score = 60;
  if (profile.attackType === 'magic' && monster.magicDefense > monster.defense * 1.5) score -= 12;
  if (profile.attackType === 'physical' && monster.defense > monster.magicDefense * 1.8) score -= 6;
  if (profile.rangeType === 'melee' && monster.attackType === 'magic') score -= 7;
  if (profile.rangeType === 'ranged' && monster.attackType === 'contact') score += 5;
  if (profile.undeadBonus && monster.undead) score += 24;
  if (safeArray(profile.elementBias).some((element) => safeArray(monster.elementWeakness).map(String).map((x) => x.toLowerCase()).includes(String(element).toLowerCase()))) score += 17;
  if (levelDelta >= -7 && levelDelta <= 5) score += 13;
  if (levelDelta > 10) score -= 18;
  if (levelDelta < -14) score -= 22;
  return clamp(score, 0, 100);
}

function scoreValue({ monster, budgetProfile }) {
  const dropCount = safeArray(monster.drops ?? monster.dropItems ?? monster.materials).length;
  const dropProxy = Math.log10(Math.max(2, monster.exp + monster.spawnCount * 10 + dropCount * 18)) * 22;
  const lowCostBonus = monster.hp <= Math.max(220, monster.exp * 8.5) ? 8 : 0;
  return clamp((dropProxy + lowCostBonus + dropCount * 4) * budgetProfile.value, 0, 100);
}

function scoreMonsterLevelFit(levelDelta, budgetProfile) {
  if (levelDelta >= -5 && levelDelta <= 3) return 100;
  if (levelDelta >= -budgetProfile.lowTol && levelDelta <= budgetProfile.highTol) {
    const distance = levelDelta < -5 ? Math.abs(levelDelta + 5) : Math.abs(levelDelta - 3);
    return clamp(90 - distance * 5.2, 45, 96);
  }
  if (levelDelta < -budgetProfile.lowTol) return clamp(42 - Math.abs(levelDelta + budgetProfile.lowTol) * 5.5, 0, 42);
  return clamp(50 - (levelDelta - budgetProfile.highTol) * 6.5, 0, 50);
}

export function scoreMapForCharacter(input = {}) {
  const snapshot = buildCharacterSnapshot(input);
  const monsterById = Object.fromEntries((input.monsters || MONSTERS).map((monster) => {
    const normalized = normalizeMonster(monster);
    return [normalized.id, normalized];
  }));
  const rankedMonsters = rankMonstersForPlayer({
    level: snapshot.level,
    combat: snapshot.combat,
    profile: snapshot.profile,
    budgetProfile: snapshot.budgetProfile,
    weights: WEIGHTS[input.priority ?? DEFAULT_PRIORITY] ?? WEIGHTS[DEFAULT_PRIORITY],
    monsters: getMapMonsters(input.map, monsterById),
  });
  const gate = analyzeMapGate({ map: input.map, monsters: rankedMonsters, level: snapshot.level, budgetProfile: snapshot.budgetProfile, priority: input.priority ?? DEFAULT_PRIORITY });
  return scoreMap({
    map: input.map,
    monsters: rankedMonsters,
    profile: snapshot.profile,
    budgetProfile: snapshot.budgetProfile,
    weights: WEIGHTS[input.priority ?? DEFAULT_PRIORITY] ?? WEIGHTS[DEFAULT_PRIORITY],
    level: snapshot.level,
    priority: input.priority ?? DEFAULT_PRIORITY,
    gate,
  });
}

function scoreMap({ map, monsters, profile, budgetProfile, weights, level, priority, gate, masterBoost = 0, communityBoost = 0 }) {
  const spawnTotal = getSpawnTotal(map, monsters);
  const feasible = scoreFeasibility(monsters, spawnTotal, budgetProfile, gate);
  const exp = weightedAverage(monsters.map((monster) => [monster.scoreParts.exp, getSpawnWeight(monster, spawnTotal)]));
  const speed = weightedAverage(monsters.map((monster) => [monster.scoreParts.speed, getSpawnWeight(monster, spawnTotal)]));
  const safety = weightedAverage(monsters.map((monster) => [monster.scoreParts.safety, getSpawnWeight(monster, spawnTotal)]));
  const value = weightedAverage(monsters.map((monster) => [monster.scoreParts.value, getSpawnWeight(monster, spawnTotal)]));
  const density = scoreDensity(map, spawnTotal, profile);
  const classFit = scoreLayoutFit(map, profile);
  const cost = scoreCost({ monsters, spawnTotal, safetyScore: safety, budgetProfile, profile });
  const levelFit = scoreMapLevelFit(level, map?.levelRange, monsters);
  const mixedBadMobPenalty = scoreMixedBadMobPenalty(monsters, spawnTotal, budgetProfile);
  const travelPenalty = scoreTravelPenalty(map, priority);
  const total =
    feasible * weights.feasible
    + exp * weights.exp
    + speed * weights.speed
    + density * weights.density
    + safety * weights.safety
    + cost * weights.cost
    + value * weights.value
    + classFit * weights.classFit
    + levelFit * 0.08
    + masterBoost
    + communityBoost
    - mixedBadMobPenalty
    - travelPenalty
    - (gate?.penalty ?? 0);

  return {
    total,
    weightedMobScore: Math.round(weightedAverage(monsters.map((monster) => [monster.targetScore, getSpawnWeight(monster, spawnTotal)]))),
    feasibility: Math.round(feasible),
    exp: Math.round(exp),
    speed: Math.round(speed),
    density: Math.round(density),
    layoutFit: Math.round(classFit),
    safety: Math.round(safety),
    cost: Math.round(cost),
    value: Math.round(value),
    levelFit: Math.round(levelFit),
    mixedBadMobPenalty: Math.round(mixedBadMobPenalty),
    travelPenalty: Math.round(travelPenalty),
    masterBoost: Math.round(masterBoost),
    communityBoost: Math.round(communityBoost),
  };
}

function analyzeMapGate({ map, monsters, level, budgetProfile, priority }) {
  if (!monsters.length) {
    return { reject: true, label: 'no-monsters', penalty: 100, scoreCap: 0, notes: ['地图没有可识别怪物。'] };
  }

  const levels = monsters.map((monster) => Number(monster.level || 1));
  const minMonsterLevel = Math.min(...levels);
  const maxMonsterLevel = Math.max(...levels);
  const mapRange = Array.isArray(map?.levelRange) ? map.levelRange : [minMonsterLevel, maxMonsterLevel];
  const effectiveMax = Math.max(maxMonsterLevel, Number(mapRange[1] ?? maxMonsterLevel));
  const effectiveMin = Math.min(minMonsterLevel, Number(mapRange[0] ?? minMonsterLevel));
  const tooLowDistance = level - effectiveMax;
  const tooHighDistance = effectiveMin - level;
  const isFarmGoal = priority === 'material' || priority === 'meso';

  if (tooLowDistance > 24 && !isFarmGoal) {
    return { reject: true, label: 'too-low', penalty: 100, scoreCap: 0, notes: ['怪物等级明显过低，不适合作为当前等级主练级地图。'] };
  }

  if (tooLowDistance > budgetProfile.lowTol) {
    return {
      reject: false,
      label: isFarmGoal ? 'farm-only-low-level' : 'too-low-capped',
      penalty: isFarmGoal ? Math.min(18, tooLowDistance * 0.9) : Math.min(34, tooLowDistance * 1.8),
      scoreCap: isFarmGoal ? clamp(58 - tooLowDistance * 0.55, 34, 58) : clamp(46 - tooLowDistance * 0.9, 18, 46),
      notes: [isFarmGoal ? '等级偏低，只作为材料/金币回刷推荐。' : '等级偏低，已限制练级推荐分数。'],
    };
  }

  if (tooHighDistance > budgetProfile.highTol + 5) {
    return { reject: true, label: 'too-high', penalty: 100, scoreCap: 0, notes: ['怪物等级明显过高，当前配置不推荐硬打。'] };
  }

  if (tooHighDistance > budgetProfile.highTol) {
    return {
      reject: false,
      label: 'too-high-risky',
      penalty: Math.min(32, tooHighDistance * 2.2),
      scoreCap: clamp(72 - tooHighDistance * 2, 42, 72),
      notes: ['越级偏多，已按资金与命中容忍度扣分。'],
    };
  }

  return { reject: false, label: 'main-route', penalty: 0, scoreCap: null, notes: ['等级区间适合作为主路线。'] };
}

function scoreFeasibility(monsters, spawnTotal, budgetProfile, gate) {
  const hit = weightedAverage(monsters.map((monster) => [scoreHit(monster.hitRate, budgetProfile), getSpawnWeight(monster, spawnTotal)]));
  const level = weightedAverage(monsters.map((monster) => [monster.scoreParts.levelFit, getSpawnWeight(monster, spawnTotal)]));
  const gateScore = gate?.label === 'main-route' ? 100 : gate?.label === 'farm-only-low-level' ? 55 : 65;
  return clamp(hit * 0.42 + level * 0.38 + gateScore * 0.2, 0, 100);
}

function getSpawnTotal(map, monsters) {
  return Number(map?.spawnTotal ?? map?.mobCount ?? monsters.reduce((sum, monster) => sum + Number(monster.spawnCount ?? 1), 0));
}

function getSpawnWeight(monster, spawnTotal) {
  if (!spawnTotal) return 1;
  return Math.max(0.04, Number(monster.spawnCount ?? 1) / spawnTotal);
}

function weightedAverage(pairs) {
  const totalWeight = pairs.reduce((sum, [, weight]) => sum + Number(weight || 0), 0) || 1;
  return pairs.reduce((sum, [value, weight]) => sum + Number(value || 0) * Number(weight || 0), 0) / totalWeight;
}

function scoreDensity(map, spawnTotal, profile) {
  const mobRate = Number(map?.mobRate ?? map?.spawnRate ?? 1);
  const base = Math.log2(Math.max(1, spawnTotal) + 1) * 14;
  const rateBonus = clamp(mobRate * 8, 0, 18);
  const tagBonus = hasAnyTag(map, ['密集', '高密度', '密度高', '热门']) ? 12 : hasAnyTag(map, ['稳定刷怪', '刷怪顺手']) ? 7 : 0;
  return clamp((base + rateBonus + tagBonus) * (profile.density ?? 1), 0, 100);
}

function scoreLayoutFit(map, profile) {
  const tags = safeArray(map?.tags);
  let score = 54;

  for (const tag of profile.preferredTags ?? []) if (tags.includes(tag)) score += 8;
  for (const tag of profile.badTags ?? []) if (tags.includes(tag)) score -= 8;

  if (profile.rangeType === 'melee' && hasAnyTag(map, ['密集', '高密度', '密度高', '战士友好'])) score += 11;
  if (profile.rangeType === 'ranged' && hasAnyTag(map, ['远程友好', '长平台', '稳定刷怪'])) score += 11;
  if (profile.rangeType === 'magic' && hasAnyTag(map, ['法师友好', '不死系', '安全平台'])) score += 12;
  if (hasAnyTag(map, ['消耗较高']) && profile.cost > 1) score -= 8;
  if (hasAnyTag(map, ['高血量']) && profile.attackType === 'physical') score -= 5;

  return clamp(score, 0, 100);
}

function scoreCost({ monsters, spawnTotal, safetyScore, budgetProfile, profile }) {
  const incomingPressure = weightedAverage(monsters.map((monster) => {
    const attack = Math.max(monster.physicalAttack, monster.magicAttack, monster.level * 2.3);
    return [attack / Math.max(1, monster.level * 3), getSpawnWeight(monster, spawnTotal)];
  }));
  const base = 100 - incomingPressure * 24 * budgetProfile.cost * (profile.cost ?? 1);
  return clamp(base * 0.68 + safetyScore * 0.32, 0, 100);
}

function scoreMapLevelFit(level, levelRange, monsters) {
  const fallbackMin = Math.min(...monsters.map((monster) => monster.level));
  const fallbackMax = Math.max(...monsters.map((monster) => monster.level));
  const [min, max] = Array.isArray(levelRange) ? levelRange : [fallbackMin, fallbackMax];
  if (level >= min && level <= max) return 96;
  const distance = level < min ? min - level : level - max;
  return level > max ? clamp(88 - distance * 9.5, 0, 88) : clamp(82 - distance * 8.5, 0, 82);
}

function scoreMixedBadMobPenalty(monsters, spawnTotal, budgetProfile) {
  const badWeight = monsters.reduce((sum, monster) => {
    const isBad = monster.hitRate < budgetProfile.minHit || monster.targetScore < 38;
    return sum + (isBad ? getSpawnWeight(monster, spawnTotal) : 0);
  }, 0);
  return badWeight * 28;
}

function scoreTravelPenalty(map, priority) {
  const text = `${map?.name ?? ''} ${map?.region ?? ''} ${safeArray(map?.tags).join(' ')}`;
  let penalty = 0;
  if (/Boss|深处|死亡|矿|雪域|隐藏|hidden/i.test(text)) penalty += 4;
  if (/新手|训练场/.test(text) && priority !== 'material' && priority !== 'meso') penalty += 2;
  return penalty;
}

function getRequiredAccuracy(characterLevel, monster) {
  if (Number(monster.requiredAccuracy) > 0) {
    const levelDiff = Math.max(0, Number(monster.level ?? 1) - Number(characterLevel ?? 1));
    return Math.max(1, Math.ceil(Number(monster.requiredAccuracy) + levelDiff * 1.35));
  }
  const levelDiff = Math.max(0, Number(monster.level ?? 1) - Number(characterLevel ?? 1));
  const avoid = Math.max(0, Number(monster.avoid ?? monster.eva ?? 0));
  return Math.max(1, Math.ceil(((55 + levelDiff * 2) * avoid) / 15));
}

function getHitRate(accuracy, requiredAccuracy) {
  if (!requiredAccuracy) return 1;
  return clamp(Number(accuracy ?? 0) / requiredAccuracy, 0, 1);
}

function buildWarning({ monsters, classId, budgetProfile, gate }) {
  if (gate?.label === 'farm-only-low-level') return '等级偏低：只适合回刷材料/金币，不建议作为主练级地图。';
  if (gate?.label === 'too-low-capped') return '等级偏低：系统已压低分数，建议去更高等级地图练级。';
  if (gate?.label === 'too-high-risky') return '越级偏多：如果伤害或命中不够，实际效率会明显下降。';

  const hardTargets = monsters.filter((monster) => monster.hitRate < budgetProfile.minHit);
  if (!hardTargets.length) return '命中、等级和风险都比较稳定，可以尝试。';

  const names = hardTargets.slice(0, 3).map((monster) => monster.name).join('、');
  const suffix = hardTargets.length > 3 ? ` 等 ${hardTargets.length} 种怪` : '';
  const minText = `${Math.round(budgetProfile.minHit * 100)}%`;
  if (classId === 'magician') return `${names}${suffix} 未达到 ${minText} 稳定线，可能需要补 INT/LUK、换低等级怪或选择更安全地图。`;
  return `${names}${suffix} 未达到 ${minText} 稳定线，建议补 DEX/命中装备后再来。`;
}

function buildMapReasons({ monsters, scoreParts, profile, budgetProfile, gate }) {
  const best = monsters[0];
  const reasons = [];

  if (best) reasons.push(`主目标 ${best.name}：Lv.${best.level} / 命中 ${best.hitPercent}% / 预计 ${best.estimatedTimeToKill}s 击杀`);
  if (gate?.notes?.[0]) reasons.push(gate.notes[0]);
  if (scoreParts.feasibility >= 75) reasons.push('等级与命中可行性较高');
  if (scoreParts.density >= 65) reasons.push(`地图密度评分 ${scoreParts.density}，刷怪节奏较好`);
  if (scoreParts.layoutFit >= 70) reasons.push(`地图标签适合 ${profile.rangeType === 'melee' ? '近战' : profile.rangeType === 'magic' ? '法系' : '远程'}职业`);
  if (scoreParts.safety >= 72) reasons.push(`${budgetProfile.name}模式下药水压力较低`);
  if (scoreParts.value >= 70) reasons.push('掉落/材料价值较好');
  if (scoreParts.mixedBadMobPenalty > 8) reasons.push('地图内有部分怪不适合当前配置，已扣分');

  return reasons.slice(0, 5);
}

function buildSuggestionIndex(suggestions) {
  if (!Array.isArray(suggestions)) return new Set();
  return new Set(suggestions.map((item) => {
    if (typeof item === 'string') return normalizeKey(item);
    return normalizeKey(item.id ?? item.mapId ?? item.name);
  }).filter(Boolean));
}

function getSuggestionBoost(map, suggestionIndex, maxBoost) {
  if (!suggestionIndex?.size) return 0;
  const keys = [map?.id, map?.mapId, map?.name].map(normalizeKey);
  return keys.some((key) => suggestionIndex.has(key)) ? maxBoost : 0;
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
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
