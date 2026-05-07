import { MAPS, MONSTERS } from '../data/maps.js';

const seedMonsterById = Object.fromEntries(MONSTERS.map((monster) => [monster.id, monster]));

const CLASS_RECOMMENDATION_PROFILES = {
  warrior: {
    attackType: 'physical',
    rangeType: 'melee',
    mobbingStyle: 'shortRangeAoe',
    preferredTags: ['战士友好', '密集', '高密度', '稳定刷怪', '低成本'],
    badTags: ['远程友好', '法师友好', '高血量'],
    safetyWeight: 1.15,
    accuracyWeight: 1.18,
    damageStat: 'STR',
  },
  magician: {
    attackType: 'magic',
    rangeType: 'magic',
    mobbingStyle: 'safePlatform',
    preferredTags: ['法师友好', '不死系', '稳定刷怪', '高密度'],
    badTags: ['高血量'],
    safetyWeight: 1.1,
    accuracyWeight: 0.92,
    damageStat: 'INT',
  },
  bowman: {
    attackType: 'physical',
    rangeType: 'ranged',
    mobbingStyle: 'longLane',
    preferredTags: ['稳定刷怪', '热门', '低成本'],
    badTags: ['消耗较高', '高血量'],
    safetyWeight: 1.0,
    accuracyWeight: 1.05,
    damageStat: 'DEX',
  },
  thief: {
    attackType: 'physical',
    rangeType: 'hybrid',
    mobbingStyle: 'mobile',
    preferredTags: ['热门', '高密度', '密集', '稳定刷怪'],
    badTags: ['高血量'],
    safetyWeight: 0.95,
    accuracyWeight: 1.02,
    damageStat: 'LUK',
  },
  pirate: {
    attackType: 'physical',
    rangeType: 'hybrid',
    mobbingStyle: 'mixed',
    preferredTags: ['密集', '高密度', '稳定刷怪'],
    badTags: ['高血量'],
    safetyWeight: 1.0,
    accuracyWeight: 1.0,
    damageStat: 'DEX',
  },
};

const BRANCH_OVERRIDES = {
  fighter: { preferredTags: ['战士友好', '密集', '高密度'], rangeType: 'melee', mobbingStyle: 'shortRangeAoe' },
  page: { preferredTags: ['战士友好', '低成本', '稳定刷怪'], rangeType: 'melee', mobbingStyle: 'safeMelee', safetyWeight: 1.25 },
  spearman: { preferredTags: ['密集', '高密度', '战士友好'], rangeType: 'melee', mobbingStyle: 'longMelee' },
  fp: { preferredTags: ['法师友好', '高密度', '稳定刷怪'], elementBias: ['fire', 'poison'] },
  il: { preferredTags: ['法师友好', '高密度', '稳定刷怪'], elementBias: ['ice', 'lightning'] },
  cleric: { preferredTags: ['不死系', '法师友好', '稳定刷怪'], elementBias: ['holy'], undeadBonus: 1.25 },
  hunter: { rangeType: 'ranged', mobbingStyle: 'longLane', preferredTags: ['稳定刷怪', '热门'] },
  crossbowman: { rangeType: 'ranged', mobbingStyle: 'longLane', preferredTags: ['稳定刷怪', '热门'] },
  assassin: { rangeType: 'ranged', mobbingStyle: 'longLane', preferredTags: ['热门', '稳定刷怪'], safetyWeight: 0.95 },
  bandit: { rangeType: 'melee', mobbingStyle: 'closeRange', preferredTags: ['密集', '高密度', '热门'], safetyWeight: 1.05 },
  brawler: { rangeType: 'melee', mobbingStyle: 'closeRange', preferredTags: ['密集', '高密度'] },
  gunslinger: { rangeType: 'ranged', mobbingStyle: 'longLane', preferredTags: ['稳定刷怪', '热门'] },
};

const BUDGET_PROFILES = {
  low: {
    minHit: 0.95,
    potionPenalty: 1.35,
    dangerTolerance: 0.75,
    expRiskTolerance: 0.82,
    dropWeight: 1.15,
    name: '低资金',
  },
  mid: {
    minHit: 0.9,
    potionPenalty: 1,
    dangerTolerance: 1,
    expRiskTolerance: 1,
    dropWeight: 1,
    name: '普通',
  },
  high: {
    minHit: 0.82,
    potionPenalty: 0.72,
    dangerTolerance: 1.22,
    expRiskTolerance: 1.18,
    dropWeight: 0.9,
    name: '有钱',
  },
};

const PRIORITY_WEIGHTS = {
  stable: { hit: 0.32, exp: 0.18, speed: 0.15, safety: 0.24, classFit: 0.08, value: 0.03 },
  exp: { hit: 0.22, exp: 0.34, speed: 0.22, safety: 0.1, classFit: 0.08, value: 0.04 },
  material: { hit: 0.22, exp: 0.2, speed: 0.16, safety: 0.12, classFit: 0.08, value: 0.22 },
  meso: { hit: 0.24, exp: 0.18, speed: 0.15, safety: 0.17, classFit: 0.07, value: 0.19 },
};

const DEFAULT_PRIORITY = 'stable';

export function getMapRecommendations({
  classLine,
  branch,
  level,
  statPlan,
  budget = 'mid',
  priority = DEFAULT_PRIORITY,
  maps = MAPS,
  monsters = MONSTERS,
  gear = [],
} = {}) {
  const playerLevel = Number(level) || 1;
  const profile = getRecommendationProfile(classLine, branch);
  const budgetProfile = BUDGET_PROFILES[budget] ?? BUDGET_PROFILES.mid;
  const weights = PRIORITY_WEIGHTS[priority] ?? PRIORITY_WEIGHTS[DEFAULT_PRIORITY];
  const combat = buildCombatSnapshot({ classLine, profile, level: playerLevel, statPlan, gear });
  const monsterById = Object.fromEntries((monsters || []).map((monster) => [monster.id, normalizeMonster(monster)]));

  return (maps || [])
    .map((map) => {
      const mapMonsters = getMapMonsters(map, monsterById).map((monster) => normalizeMonster(monster));
      const rankedMonsters = rankMonstersForPlayer({
        level: playerLevel,
        combat,
        profile,
        budgetProfile,
        weights,
        monsters: mapMonsters,
      });
      const mapScoreParts = scoreMap({ map, monsters: rankedMonsters, profile, budgetProfile, weights, level: playerLevel });
      const score = Math.round(clamp(mapScoreParts.total, 0, 100));

      return {
        ...map,
        monsters: rankedMonsters,
        score,
        scoreParts: mapScoreParts,
        accuracy: combat.accuracy,
        canHitAll: rankedMonsters.length ? rankedMonsters.every((monster) => monster.hitRate >= 0.99) : false,
        warning: buildWarning(rankedMonsters, classLine?.id, budgetProfile),
        reasons: buildMapReasons({ map, monsters: rankedMonsters, scoreParts: mapScoreParts, profile, budgetProfile }),
        recommendationMeta: {
          budget: budgetProfile.name,
          priority,
          combat,
          profile,
        },
      };
    })
    .filter((map) => map.monsters.length)
    .sort((a, b) => b.score - a.score || Number(b.spawnTotal ?? 0) - Number(a.spawnTotal ?? 0));
}

function getRecommendationProfile(classLine, branch) {
  const base = CLASS_RECOMMENDATION_PROFILES[classLine?.id] ?? CLASS_RECOMMENDATION_PROFILES.warrior;
  const override = BRANCH_OVERRIDES[branch?.id] ?? {};
  const preferredTags = [...new Set([...(override.preferredTags ?? []), ...(base.preferredTags ?? [])])];
  const badTags = [...new Set([...(override.badTags ?? []), ...(base.badTags ?? [])])];
  return {
    ...base,
    ...override,
    preferredTags,
    badTags,
  };
}

function buildCombatSnapshot({ classLine, profile, level, statPlan, gear = [] }) {
  const stats = statPlan?.stats ?? {};
  const derived = statPlan?.derived ?? {};
  const gearBonus = getGearBonuses(gear);
  const primaryStat = Number(stats[classLine?.primaryStat] ?? stats[profile.damageStat] ?? 4) + Number(gearBonus[classLine?.primaryStat] ?? gearBonus[profile.damageStat] ?? 0);
  const secondaryStat = Number(stats[classLine?.secondaryStat] ?? 4) + Number(gearBonus[classLine?.secondaryStat] ?? 0);
  const physicalAccuracy = Number(derived.accuracy ?? 0) + gearBonus.ACC;
  const magicAccuracy = Number(derived.magicAccuracy ?? derived.accuracy ?? 0) + Math.round((gearBonus.INT + gearBonus.LUK) * 0.35);
  const attackPower = profile.attackType === 'magic'
    ? Math.max(1, Math.round(primaryStat * 1.18 + secondaryStat * 0.32 + Number(level) * 0.55 + gearBonus.MATK * 2.25))
    : Math.max(1, Math.round(primaryStat * 1.32 + secondaryStat * 0.42 + Number(level) * 0.7 + gearBonus.WATK * 2.6));
  const accuracy = profile.attackType === 'magic' ? Math.max(magicAccuracy, physicalAccuracy * 0.8) : physicalAccuracy;
  const hp = Number(derived.hp ?? 0) + gearBonus.HP;
  const mp = Number(derived.mp ?? 0) + gearBonus.MP;
  const physicalDefense = gearBonus.PDD;
  const magicDefense = gearBonus.MDD;
  const avoidability = Number(derived.avoidability ?? 0) + gearBonus.AVOID;

  return {
    level: Number(level) || 1,
    attackType: profile.attackType,
    primaryStat,
    secondaryStat,
    attackPower,
    accuracy: Math.round(accuracy),
    hp,
    mp,
    physicalDefense,
    magicDefense,
    avoidability,
    gearBonus,
  };
}

function getGearBonuses(gear = []) {
  return (gear || []).reduce((sum, item) => {
    sum.STR += readGearValue(item, ['incSTR', 'str']);
    sum.DEX += readGearValue(item, ['incDEX', 'dex']);
    sum.INT += readGearValue(item, ['incINT', 'int']);
    sum.LUK += readGearValue(item, ['incLUK', 'luk']);
    sum.HP += readGearValue(item, ['incMHP', 'incMaxHP', 'incHP', 'mhp', 'hp']);
    sum.MP += readGearValue(item, ['incMMP', 'incMaxMP', 'incMP', 'mmp', 'mp']);
    sum.ACC += readGearValue(item, ['incACC', 'accuracy', 'acc']);
    sum.AVOID += readGearValue(item, ['incEVA', 'incAVOID', 'incAvoid', 'avoidability', 'eva']);
    sum.WATK += readGearValue(item, ['incPAD', 'pad', 'watk']);
    sum.MATK += readGearValue(item, ['incMAD', 'mad', 'matk']);
    sum.PDD += readGearValue(item, ['incPDD', 'pdd', 'wdef', 'defense']);
    sum.MDD += readGearValue(item, ['incMDD', 'mdd', 'magicDefense']);
    return sum;
  }, { STR: 0, DEX: 0, INT: 0, LUK: 0, HP: 0, MP: 0, ACC: 0, AVOID: 0, WATK: 0, MATK: 0, PDD: 0, MDD: 0 });
}

function readGearValue(item, aliases) {
  for (const key of aliases) {
    const value = item?.[key] ?? item?.stats?.[key];
    if (value !== undefined && value !== null && value !== '') return Number(value) || 0;
  }
  return 0;
}

function getMapMonsters(map, monsterById) {
  if (Array.isArray(map?.monsterDetails)) return map.monsterDetails;
  return (map?.monsters || []).map((id) => monsterById[id] ?? seedMonsterById[id]).filter(Boolean);
}

function normalizeMonster(monster) {
  const elementWeakness = safeArray(monster?.elementWeakness);
  const elementResist = safeArray(monster?.elementResist);
  const hp = Number(monster?.hp ?? 1);
  const exp = Number(monster?.exp ?? 0);
  const level = Number(monster?.level ?? 1);
  return {
    ...monster,
    id: String(monster?.id ?? monster?.rawId ?? monster?.name ?? 'unknown'),
    name: monster?.name ?? `Monster ${monster?.id ?? ''}`,
    level,
    hp: Math.max(1, hp),
    exp: Math.max(0, exp),
    avoid: Number(monster?.avoid ?? monster?.eva ?? 0),
    defense: Number(monster?.defense ?? monster?.physicalDefense ?? monster?.PDDamage ?? 0),
    magicDefense: Number(monster?.magicDefense ?? monster?.MDDamage ?? 0),
    physicalAttack: Number(monster?.physicalAttack ?? monster?.PADamage ?? 0),
    magicAttack: Number(monster?.magicAttack ?? monster?.MADamage ?? 0),
    spawnCount: Number(monster?.spawnCount ?? monster?.count ?? 1),
    mobTime: Number(monster?.mobTime ?? monster?.mob_time ?? 0),
    elementWeakness,
    elementResist,
    undead: Boolean(monster?.undead),
    attackType: monster?.attackType ?? (Number(monster?.magicAttack ?? monster?.MADamage ?? 0) > 0 ? 'magic' : 'contact'),
  };
}

function rankMonstersForPlayer({ level, combat, profile, budgetProfile, weights, monsters }) {
  const scored = (monsters || []).map((monster) => scoreMonster({ monster, level, combat, profile, budgetProfile, weights }));
  return scored.sort((a, b) => b.targetScore - a.targetScore || b.spawnCount - a.spawnCount || b.level - a.level);
}

function scoreMonster({ monster, level, combat, profile, budgetProfile, weights }) {
  const hitProfile = getMonsterHitProfile({
    characterLevel: level,
    monster,
    accuracy: combat.accuracy,
    attackType: profile.attackType,
  });
  const { requiredAccuracy, minimumAccuracy, hitRate } = hitProfile;
  const levelDelta = Number(monster.level) - Number(level);
  const averageDamage = estimateAverageDamage({ monster, combat, profile });
  const timeToKill = Math.max(0.35, monster.hp / Math.max(1, averageDamage * hitRate));
  const killsPerMinute = 60 / timeToKill;
  const expPerMinute = killsPerMinute * monster.exp;
  const hitComponent = scoreHitComponent(hitRate, budgetProfile);
  const expComponent = normalizeExpPerMinute(expPerMinute, level);
  const speedComponent = normalizeKillSpeed(timeToKill, monster.level, level);
  const safetyComponent = scoreSafety({ monster, level, timeToKill, combat, profile, budgetProfile });
  const classFitComponent = scoreMonsterClassFit({ monster, profile, levelDelta });
  const valueComponent = scoreMonsterValue({ monster, budgetProfile });
  const levelPenalty = scoreMonsterLevelPenalty(levelDelta, budgetProfile);
  const missPenalty = profile.attackType === 'magic' ? 0 : Math.max(0, (budgetProfile.minHit - hitRate) * 78);
  const noHitPenalty = profile.attackType === 'magic' ? 0 : hitRate <= 0 ? 88 : hitRate < 0.6 ? 34 : 0;
  const dangerPenalty = missPenalty + noHitPenalty + levelPenalty;
  const targetScore = clamp(
    (hitComponent * weights.hit)
      + (expComponent * weights.exp)
      + (speedComponent * weights.speed)
      + (safetyComponent * weights.safety)
      + (classFitComponent * weights.classFit)
      + (valueComponent * weights.value)
      - dangerPenalty,
    0,
    100,
  );

  return {
    ...monster,
    requiredAccuracy,
    minimumAccuracy,
    hitRate,
    hitPercent: Math.round(hitRate * 100),
    averageDamage: Math.round(averageDamage),
    estimatedTimeToKill: round(timeToKill, 2),
    estimatedKillsPerMinute: round(killsPerMinute, 1),
    estimatedExpPerMinute: Math.round(expPerMinute),
    scoreParts: {
      hit: Math.round(hitComponent),
      exp: Math.round(expComponent),
      speed: Math.round(speedComponent),
      safety: Math.round(safetyComponent),
      classFit: Math.round(classFitComponent),
      value: Math.round(valueComponent),
      penalty: Math.round(dangerPenalty),
    },
    targetScore,
  };
}

function estimateAverageDamage({ monster, combat, profile }) {
  const defense = profile.attackType === 'magic' ? monster.magicDefense : monster.defense;
  const defensePenalty = Math.min(0.45, Number(defense || 0) / Math.max(400, combat.attackPower * 18));
  const elementMultiplier = getElementMultiplier(monster, profile);
  const rangeMultiplier = profile.rangeType === 'melee' ? 1.05 : profile.rangeType === 'ranged' ? 0.98 : 1;
  return Math.max(1, combat.attackPower * (1 - defensePenalty) * elementMultiplier * rangeMultiplier);
}

function getElementMultiplier(monster, profile) {
  const biases = safeArray(profile.elementBias);
  const weak = safeArray(monster.elementWeakness).map((x) => String(x).toLowerCase());
  const resist = safeArray(monster.elementResist).map((x) => String(x).toLowerCase());
  if (profile.undeadBonus && monster.undead) return Number(profile.undeadBonus) || 1.2;
  if (biases.some((element) => weak.includes(String(element).toLowerCase()))) return 1.18;
  if (biases.some((element) => resist.includes(String(element).toLowerCase()))) return 0.78;
  if (profile.attackType === 'magic' && resist.length >= 2) return 0.9;
  return 1;
}

function scoreHitComponent(hitRate, budgetProfile) {
  const minimum = budgetProfile.minHit;
  if (hitRate >= 0.99) return 100;
  if (hitRate >= minimum) return 88 + (hitRate - minimum) * 80;
  if (hitRate >= 0.8) return 60 + (hitRate - 0.8) * 110;
  if (hitRate >= 0.6) return 35 + (hitRate - 0.6) * 125;
  return Math.max(0, hitRate * 55);
}

function normalizeExpPerMinute(expPerMinute, level) {
  const expected = Math.max(12, Math.pow(Number(level) + 5, 1.32));
  return clamp((expPerMinute / expected) * 72, 0, 100);
}

function normalizeKillSpeed(timeToKill, monsterLevel, playerLevel) {
  const expectedSeconds = clamp(1.4 + (Number(monsterLevel) - Number(playerLevel)) * 0.08, 0.9, 5.5);
  return clamp((expectedSeconds / Math.max(0.35, timeToKill)) * 74, 0, 100);
}

function scoreSafety({ monster, level, timeToKill, combat, profile, budgetProfile }) {
  const incomingProfile = getIncomingDamageProfile(monster, combat);
  const incoming = incomingProfile.maxDamage;
  const levelRisk = clamp((monster.level - level) * 3, -12, 35);
  const hpBuffer = combat.hp ? clamp(combat.hp / Math.max(1, incoming * 5), 0.45, 1.35) : 0.85;
  const contactFactor = profile.rangeType === 'ranged' ? 0.72 : profile.rangeType === 'magic' ? 0.82 : 1.05;
  const exposure = Math.min(1.5, timeToKill / 4) * contactFactor;
  const risk = (incoming * exposure * budgetProfile.potionPenalty * profile.safetyWeight) / Math.max(40, level * 6) + levelRisk / 100;
  return clamp(100 - risk * 85 / hpBuffer, 0, 100);
}

function getIncomingDamageProfile(monster, combat = {}) {
  const physicalAttack = Number(monster?.physicalAttack ?? 0);
  const magicAttack = Number(monster?.magicAttack ?? 0);
  const usesMagic = magicAttack > physicalAttack;
  const attack = Math.max(physicalAttack, magicAttack, Number(monster?.level ?? 1) * 2.2);
  const defense = usesMagic ? Number(combat.magicDefense ?? 0) : Number(combat.physicalDefense ?? 0);
  const monsterLevel = Math.max(1, Number(monster?.level ?? 1));
  const reduction = Math.floor(Math.min(defense * monsterLevel / 70, defense / 5));
  return {
    minDamage: Math.max(1, Math.floor(attack * 1.0) - reduction),
    avgDamage: Math.max(1, Math.floor(attack * 1.25) - reduction),
    maxDamage: Math.max(1, Math.floor(attack * 1.5) - reduction),
    reduction,
  };
}

function scoreMonsterClassFit({ monster, profile, levelDelta }) {
  let score = 62;
  if (profile.attackType === 'magic' && monster.magicDefense > monster.defense * 1.5) score -= 12;
  if (profile.attackType === 'physical' && monster.defense > monster.magicDefense * 1.8) score -= 6;
  if (profile.rangeType === 'melee' && monster.attackType === 'magic') score -= 7;
  if (profile.rangeType === 'ranged' && monster.attackType === 'contact') score += 4;
  if (profile.undeadBonus && monster.undead) score += 22;
  if (safeArray(profile.elementBias).some((element) => safeArray(monster.elementWeakness).map(String).map((x) => x.toLowerCase()).includes(String(element).toLowerCase()))) score += 16;
  if (levelDelta >= -6 && levelDelta <= 5) score += 12;
  if (levelDelta > 9) score -= 16;
  if (levelDelta < -13) score -= 18;
  return clamp(score, 0, 100);
}

function scoreMonsterValue({ monster, budgetProfile }) {
  const spawn = Number(monster.spawnCount ?? 1);
  const exp = Number(monster.exp ?? 0);
  const hp = Number(monster.hp ?? 1);
  const dropProxy = Math.log10(Math.max(2, exp + spawn * 8)) * 20;
  const lowCostBonus = hp <= Math.max(200, exp * 8) ? 8 : 0;
  return clamp((dropProxy + lowCostBonus) * budgetProfile.dropWeight, 0, 100);
}

function scoreMonsterLevelPenalty(levelDelta, budgetProfile) {
  if (levelDelta > 12) return (levelDelta - 12) * 3.5 / budgetProfile.expRiskTolerance;
  if (levelDelta < -15) return Math.abs(levelDelta + 15) * 2.2;
  return 0;
}

function scoreMap({ map, monsters, profile, budgetProfile, weights, level }) {
  const spawnTotal = Number(map.spawnTotal ?? monsters.reduce((sum, monster) => sum + Number(monster.spawnCount ?? 1), 0));
  const weightedMobScore = getWeightedMobScore(monsters, spawnTotal);
  const densityScore = scoreDensity(map, spawnTotal);
  const layoutFitScore = scoreLayoutFit(map, profile);
  const safetyScore = monsters.length ? weightedAverage(monsters.map((monster) => [monster.scoreParts.safety, getSpawnWeight(monster, spawnTotal)])) : 0;
  const valueScore = monsters.length ? weightedAverage(monsters.map((monster) => [monster.scoreParts.value, getSpawnWeight(monster, spawnTotal)])) : 0;
  const levelFit = scoreLevelFit(level, map.levelRange, monsters);
  const mixedBadMobPenalty = scoreMixedBadMobPenalty(monsters, spawnTotal, budgetProfile);
  const travelPenalty = scoreTravelPenalty(map);
  const total =
    weightedMobScore * 0.4
    + densityScore * 0.22
    + layoutFitScore * 0.14
    + safetyScore * 0.1
    + valueScore * (weights.value > 0.1 ? 0.11 : 0.06)
    + levelFit * 0.12
    - mixedBadMobPenalty
    - travelPenalty;

  return {
    total,
    weightedMobScore: Math.round(weightedMobScore),
    density: Math.round(densityScore),
    layoutFit: Math.round(layoutFitScore),
    safety: Math.round(safetyScore),
    value: Math.round(valueScore),
    levelFit: Math.round(levelFit),
    mixedBadMobPenalty: Math.round(mixedBadMobPenalty),
    travelPenalty: Math.round(travelPenalty),
  };
}

function getWeightedMobScore(monsters, spawnTotal) {
  if (!monsters.length) return 0;
  return weightedAverage(monsters.map((monster) => [monster.targetScore, getSpawnWeight(monster, spawnTotal)]));
}

function getSpawnWeight(monster, spawnTotal) {
  if (!spawnTotal) return 1;
  return Math.max(0.05, Number(monster.spawnCount ?? 1) / spawnTotal);
}

function weightedAverage(pairs) {
  const totalWeight = pairs.reduce((sum, [, weight]) => sum + Number(weight || 0), 0) || 1;
  return pairs.reduce((sum, [value, weight]) => sum + Number(value || 0) * Number(weight || 0), 0) / totalWeight;
}

function scoreDensity(map, spawnTotal) {
  const mobRate = Number(map?.mobRate ?? 1);
  const densityBase = Math.log2(Math.max(1, spawnTotal) + 1) * 14;
  const rateBonus = clamp(mobRate * 8, 0, 18);
  const tagBonus = hasAnyTag(map, ['密集', '高密度', '热门']) ? 10 : hasAnyTag(map, ['稳定刷怪']) ? 6 : 0;
  return clamp(densityBase + rateBonus + tagBonus, 0, 100);
}

function scoreLayoutFit(map, profile) {
  const tags = safeArray(map?.tags);
  let score = 55;
  for (const tag of profile.preferredTags ?? []) {
    if (tags.includes(tag)) score += 9;
  }
  for (const tag of profile.badTags ?? []) {
    if (tags.includes(tag)) score -= 8;
  }
  if (profile.rangeType === 'melee' && hasAnyTag(map, ['密集', '高密度', '战士友好'])) score += 10;
  if (profile.rangeType === 'ranged' && hasAnyTag(map, ['消耗较高'])) score -= 7;
  if (profile.rangeType === 'magic' && hasAnyTag(map, ['法师友好', '不死系'])) score += 12;
  return clamp(score, 0, 100);
}

function scoreLevelFit(level, levelRange, monsters) {
  const [min, max] = Array.isArray(levelRange) ? levelRange : [Math.min(...monsters.map((monster) => monster.level)), Math.max(...monsters.map((monster) => monster.level))];
  if (level >= min && level <= max) return 92;
  const distance = level < min ? min - level : level - max;
  if (level > max) return clamp(86 - distance * 7.5, 0, 90);
  return clamp(82 - distance * 8.5, 0, 88);
}

function scoreMixedBadMobPenalty(monsters, spawnTotal, budgetProfile) {
  if (!monsters.length) return 0;
  const badWeight = monsters.reduce((sum, monster) => {
    const isBad = monster.hitRate < budgetProfile.minHit || monster.targetScore < 42;
    return sum + (isBad ? getSpawnWeight(monster, spawnTotal) : 0);
  }, 0);
  return badWeight * 24;
}

function scoreTravelPenalty(map) {
  const text = `${map?.name ?? ''} ${map?.region ?? ''} ${safeArray(map?.tags).join(' ')}`;
  if (/Boss|深处|死亡|矿|雪域/.test(text)) return 3;
  return 0;
}

function getMonsterHitProfile({ characterLevel, monster, accuracy, attackType }) {
  if (attackType === 'magic') {
    return { hitRate: 1, requiredAccuracy: 0, minimumAccuracy: 0 };
  }
  const hitRate = getPhysicalHitRate({ accuracy, characterLevel, monster });
  return {
    hitRate,
    requiredAccuracy: getAccuracyForHitRate({ characterLevel, monster, desiredHitRate: 1 }),
    minimumAccuracy: getAccuracyForHitRate({ characterLevel, monster, desiredHitRate: 0.000001 }),
  };
}

function getPhysicalHitRate({ accuracy, characterLevel, monster }) {
  const avoid = Math.max(0, Number(monster?.avoid ?? monster?.eva ?? 0));
  if (avoid <= 0) {
    const legacyRequired = getLegacyRequiredAccuracy(characterLevel, monster);
    return legacyRequired > 0 ? clamp(Number(accuracy ?? 0) / legacyRequired, 0, 1) : 1;
  }
  const acc = Number(accuracy ?? 0);
  if (acc <= 0) return 0;
  const levelGap = Math.max(0, Number(monster?.level ?? 1) - Number(characterLevel ?? 1));
  const accuracyFactor = acc * 100 / ((levelGap + 51) * 5);
  if (accuracyFactor <= 0) return 0;

  const spread = 0.3 / (1 + Math.exp((accuracyFactor - avoid) / 12));
  const minRoll = 0.95 - spread;
  const maxRoll = 1.05 + spread;
  const requiredRoll = avoid / accuracyFactor;
  if (requiredRoll <= minRoll) return 1;
  if (requiredRoll >= maxRoll) return 0;
  return clamp((maxRoll - requiredRoll) / (maxRoll - minRoll), 0, 1);
}

function getAccuracyForHitRate({ characterLevel, monster, desiredHitRate }) {
  const avoid = Math.max(0, Number(monster?.avoid ?? monster?.eva ?? 0));
  const legacyRequired = getLegacyRequiredAccuracy(characterLevel, monster);
  if (avoid <= 0) {
    if (legacyRequired > 0) return Math.max(1, Math.ceil(legacyRequired * desiredHitRate));
    return 0;
  }
  const target = clamp(desiredHitRate, 0, 1);
  for (let acc = 0; acc <= 9999; acc += 1) {
    if (getPhysicalHitRate({ accuracy: acc, characterLevel, monster }) >= target) return acc;
  }
  return 9999;
}

function getLegacyRequiredAccuracy(characterLevel, monster) {
  if (Number(monster?.requiredAccuracy) <= 0) return 0;
  const levelDiff = Math.max(0, Number(monster?.level ?? 1) - Number(characterLevel ?? 1));
  return Math.max(1, Math.ceil(Number(monster.requiredAccuracy) + levelDiff * 1.35));
}

function buildWarning(monsters, classId, budgetProfile) {
  const hardTargets = monsters.filter((monster) => monster.hitRate < budgetProfile.minHit);
  if (!hardTargets.length) return '命中和风险都比较稳定，可以尝试。';
  const names = hardTargets.slice(0, 3).map((monster) => monster.name).join('、');
  const suffix = hardTargets.length > 3 ? ` 等 ${hardTargets.length} 种怪` : '';
  const minText = `${Math.round(budgetProfile.minHit * 100)}%`;
  if (classId === 'magician') return `${names}${suffix} 未达到 ${minText} 稳定线，可能需要补 INT/LUK、换低等级怪或选择更安全地图。`;
  return `${names}${suffix} 未达到 ${minText} 稳定线，建议补 DEX/命中装备后再来。`;
}

function buildMapReasons({ map, monsters, scoreParts, profile, budgetProfile }) {
  const best = monsters[0];
  const reasons = [];
  if (best) reasons.push(`主目标 ${best.name}：命中 ${best.hitPercent}% / 预计 ${best.estimatedTimeToKill}s 击杀`);
  if (Number(map.spawnTotal ?? 0) > 0) reasons.push(`刷怪数 ${map.spawnTotal}，密度评分 ${scoreParts.density}`);
  if (scoreParts.layoutFit >= 70) reasons.push(`地图标签适合 ${profile.rangeType === 'melee' ? '近战' : profile.rangeType === 'magic' ? '法系' : '远程'} 职业`);
  if (scoreParts.safety >= 72) reasons.push(`${budgetProfile.name}模式下药水压力较低`);
  if (scoreParts.value >= 70) reasons.push('掉落/材料价值较好');
  if (scoreParts.mixedBadMobPenalty > 8) reasons.push('地图内有部分怪不适合当前配置，已扣分');
  return reasons.slice(0, 5);
}

export function getMonsterRows(map) {
  return (map?.monsters ?? []).map((monster) => ({
    name: monster.name,
    level: monster.level,
    hp: monster.hp,
    exp: monster.exp,
    minimumAccuracy: monster.minimumAccuracy,
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

function round(value, digits = 1) {
  const scale = 10 ** digits;
  return Math.round((Number(value) || 0) * scale) / scale;
}
