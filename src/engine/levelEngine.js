const STAT_KEYS = ['STR', 'DEX', 'INT', 'LUK'];
const clamp = (value, min, max) => Math.min(Math.max(Number(value) || min, min), max);

function normalizeSkillBonuses(raw = {}) {
  return {
    stats: Object.fromEntries(STAT_KEYS.map((key) => [key, Number(raw?.stats?.[key] ?? 0) || 0])),
    maxHpPercent: Number(raw?.maxHpPercent ?? 0) || 0,
    maxMpPercent: Number(raw?.maxMpPercent ?? 0) || 0,
    accuracy: Number(raw?.accuracy ?? 0) || 0,
    magicAccuracy: Number(raw?.magicAccuracy ?? 0) || 0,
    avoidability: Number(raw?.avoidability ?? 0) || 0,
    weaponAttack: Number(raw?.weaponAttack ?? 0) || 0,
    magicAttack: Number(raw?.magicAttack ?? 0) || 0,
    speed: Number(raw?.speed ?? 0) || 0,
    jump: Number(raw?.jump ?? 0) || 0,
    criticalRate: Number(raw?.criticalRate ?? 0) || 0,
    criticalDamage: Number(raw?.criticalDamage ?? 0) || 0,
  };
}

function applyPercent(value, percent) {
  return Math.round((Number(value) || 0) * (1 + (Number(percent) || 0) / 100));
}

export function getLevelGains(level) {
  const safeLevel = clamp(level, 1, 200);

  return {
    ap: safeLevel <= 10 ? 0 : 5,
    sp: safeLevel < 10 ? 0 : safeLevel < 30 ? 3 : 3,
  };
}

export function getTotalApFromLevel(level) {
  const safeLevel = clamp(level, 1, 200);
  return Math.max(0, safeLevel - 10) * 5;
}

export function getTotalSpFromLevel(level, firstJobLevel = 10, secondJobLevel = 30) {
  const safeLevel = clamp(level, 1, 200);
  const firstJobSp = Math.max(0, Math.min(safeLevel, secondJobLevel - 1) - firstJobLevel + 1) * 3;
  const secondJobSp = Math.max(0, safeLevel - secondJobLevel + 1) * 3;
  return firstJobSp + secondJobSp;
}

export function getRecommendedApAllocation(classLine, level, custom = {}) {
  const safeLevel = clamp(level, 1, 200);
  const totalAp = getTotalApFromLevel(safeLevel);
  const primary = classLine.primaryStat;
  const secondary = classLine.secondaryStat;
  const budget = custom.budget ?? 'mid';
  const secondaryTarget = custom.secondaryTarget ?? inferSecondaryTarget(classLine.id, safeLevel, budget);
  const accuracyTarget = custom.accuracyTarget ?? inferAccuracyTarget(classLine.id, safeLevel, budget);
  const baseStats = classLine.baseStats;
  const allocation = Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));

  // First satisfy the stat requirement implied by the budget's gear tier.
  // Low budget gear lags behind level, so bowman/mage gear stats can also lag;
  // low budget physical classes still need extra hit-rate insurance.
  const secondaryNeeded = Math.max(0, secondaryTarget - (baseStats[secondary] ?? 0));
  let secondaryAdded = Math.min(totalAp, secondaryNeeded);
  let primaryAdded = Math.max(0, totalAp - secondaryAdded);

  // For physical jobs, low/normal budget means fewer accuracy bonuses from gear.
  // Add secondary AP until the estimated hit target is reached, then put the rest
  // back into the main damage stat. Magician intentionally skips this rule.
  if (classLine.id !== 'magician' && accuracyTarget > 0) {
    let safety = 0;
    while (secondaryAdded < totalAp && safety < totalAp) {
      const currentStats = buildStatsForAccuracy(baseStats, primary, primaryAdded, secondary, secondaryAdded);
      const currentAccuracy = estimateAccuracy(classLine.id, currentStats, safeLevel);
      if (currentAccuracy >= accuracyTarget) break;
      secondaryAdded += 1;
      primaryAdded = Math.max(0, primaryAdded - 1);
      safety += 1;
    }
  }

  allocation[secondary] = secondaryAdded;
  allocation[primary] = primaryAdded;
  return allocation;
}

export function buildStatPlan(classLine, level, custom = {}) {
  const safeLevel = clamp(level, 1, 200);
  const baseStats = classLine.baseStats;
  const skillBonuses = normalizeSkillBonuses(custom.skillBonuses);
  const totalAp = getTotalApFromLevel(safeLevel);
  const primary = classLine.primaryStat;
  const secondary = classLine.secondaryStat;
  const budget = custom.budget ?? 'mid';
  const secondaryTarget = custom.secondaryTarget ?? inferSecondaryTarget(classLine.id, safeLevel, budget);
  const accuracyTarget = custom.accuracyTarget ?? inferAccuracyTarget(classLine.id, safeLevel, budget);
  const allocation = sanitizeApAllocation(
    custom.apAllocation ?? getRecommendedApAllocation(classLine, safeLevel, custom),
    totalAp,
  );
  const stats = { ...baseStats };

  for (const key of STAT_KEYS) {
    stats[key] = (stats[key] ?? 0) + (allocation[key] ?? 0);
    stats[key] += skillBonuses.stats[key] ?? 0;
  }

  const baseHp = Math.round((stats.HP ?? 0) + safeLevel * inferHpGrowth(classLine.id));
  const baseMp = Math.round((stats.MP ?? 0) + safeLevel * inferMpGrowth(classLine.id, stats.INT));
  stats.HP = applyPercent(baseHp, skillBonuses.maxHpPercent);
  stats.MP = applyPercent(baseMp, skillBonuses.maxMpPercent);

  const allocatedAp = STAT_KEYS.reduce((sum, key) => sum + (allocation[key] ?? 0), 0);
  const accuracy = estimateAccuracy(classLine.id, stats, safeLevel) + skillBonuses.accuracy;
  const magicAccuracy = estimateMagicAccuracy(stats, safeLevel) + skillBonuses.magicAccuracy;

  return {
    level: safeLevel,
    totalAp,
    totalSp: getTotalSpFromLevel(safeLevel, classLine.id === 'magician' ? 8 : 10),
    remainingAp: Math.max(0, totalAp - allocatedAp),
    primaryAdded: allocation[primary] ?? 0,
    secondaryAdded: allocation[secondary] ?? 0,
    secondaryTarget,
    accuracyTarget,
    apAllocation: allocation,
    stats,
    derived: {
      accuracy,
      magicAccuracy,
      hp: stats.HP,
      mp: stats.MP,
      avoidability: skillBonuses.avoidability,
      weaponAttackBonus: skillBonuses.weaponAttack,
      magicAttackBonus: skillBonuses.magicAttack,
      speedBonus: skillBonuses.speed,
      jumpBonus: skillBonuses.jump,
      criticalRateBonus: skillBonuses.criticalRate,
      criticalDamageBonus: skillBonuses.criticalDamage,
    },
  };
}

function sanitizeApAllocation(allocation, totalAp) {
  let remaining = Math.max(0, Number(totalAp) || 0);
  const next = {};

  for (const key of STAT_KEYS) {
    const requested = Math.max(0, Math.floor(Number(allocation?.[key] ?? 0)));
    next[key] = Math.min(requested, remaining);
    remaining -= next[key];
  }

  return next;
}

function buildStatsForAccuracy(baseStats, primary, primaryAdded, secondary, secondaryAdded) {
  const stats = { ...baseStats };
  stats[primary] = (stats[primary] ?? 0) + (primaryAdded ?? 0);
  stats[secondary] = (stats[secondary] ?? 0) + (secondaryAdded ?? 0);
  return stats;
}

function inferSecondaryTarget(classId, level, budget = 'mid') {
  if (classId === 'magician') {
    if (budget === 'low') return Math.max(8, Math.round(level * 0.78));
    if (budget === 'high') return Math.max(8, level + 3);
    return Math.max(8, Math.round(level * 0.92));
  }

  if (classId === 'warrior') {
    if (budget === 'low') return Math.min(100, Math.max(24, Math.round(level * 1.42)));
    if (budget === 'high') return Math.min(85, Math.max(18, Math.round(level * 1.08)));
    return Math.min(92, Math.max(20, Math.round(level * 1.25)));
  }

  if (classId === 'bowman') {
    // Bowman damage and accuracy already come mostly from DEX. Low budget can keep
    // STR lower because weapon upgrades lag; high budget needs fresher weapon reqs.
    if (budget === 'low') return Math.min(70, Math.max(10, Math.round(level * 0.48)));
    if (budget === 'high') return Math.min(90, Math.max(15, Math.round(level * 0.82)));
    return Math.min(80, Math.max(12, Math.round(level * 0.65)));
  }

  if (classId === 'thief') {
    if (budget === 'low') return Math.min(110, Math.max(28, Math.round(level * 1.48)));
    if (budget === 'high') return Math.min(95, Math.max(24, Math.round(level * 1.22)));
    return Math.min(100, Math.max(25, Math.round(level * 1.36)));
  }

  if (classId === 'pirate') {
    if (budget === 'low') return Math.min(95, Math.max(20, Math.round(level * 1.12)));
    if (budget === 'high') return Math.min(95, Math.max(20, Math.round(level * 0.92)));
    return Math.min(90, Math.max(20, Math.round(level * 1.0)));
  }

  return Math.max(20, level);
}

function inferAccuracyTarget(classId, level, budget = 'mid') {
  if (classId === 'magician') return 0;
  if (classId === 'warrior') {
    if (budget === 'low') return Math.round(level * 1.35 + 10);
    if (budget === 'high') return Math.round(level * 1.28 + 10);
    return Math.round(level * 1.3 + 10);
  }
  if (classId === 'bowman') {
    if (budget === 'low') return Math.round(level * 1.18 + 8);
    if (budget === 'high') return Math.round(level * 1.08 + 8);
    return Math.round(level * 1.12 + 8);
  }
  if (classId === 'thief') {
    if (budget === 'low') return Math.round(level * 1.28 + 10);
    if (budget === 'high') return Math.round(level * 1.18 + 10);
    return Math.round(level * 1.23 + 10);
  }
  if (classId === 'pirate') {
    if (budget === 'low') return Math.round(level * 1.22 + 8);
    if (budget === 'high') return Math.round(level * 1.1 + 8);
    return Math.round(level * 1.14 + 8);
  }
  return Math.round(level + 6);
}

function inferHpGrowth(classId) {
  if (classId === 'warrior') return 24;
  if (classId === 'pirate') return 20;
  if (classId === 'bowman') return 16;
  if (classId === 'thief') return 16;
  if (classId === 'magician') return 10;
  return 14;
}

function inferMpGrowth(classId, intValue) {
  if (classId === 'magician') return 18 + intValue * 0.08;
  return 6 + intValue * 0.02;
}

function estimateAccuracy(classId, stats, level) {
  if (classId === 'magician') return Math.round(level * 0.35 + stats.LUK * 0.4 + stats.INT * 0.1);
  if (classId === 'warrior') return Math.round(stats.DEX * 0.8 + stats.LUK * 0.5 + level * 0.3);
  if (classId === 'bowman') return Math.round(stats.DEX * 0.9 + stats.LUK * 0.4 + level * 0.4);
  if (classId === 'thief') return Math.round(stats.DEX * 0.7 + stats.LUK * 0.6 + level * 0.4);
  if (classId === 'pirate') return Math.round(stats.DEX * 0.8 + stats.STR * 0.25 + level * 0.35);
  return Math.round(level + (stats.DEX ?? 0));
}

function estimateMagicAccuracy(stats, level) {
  return Math.round(stats.INT * 0.8 + stats.LUK * 0.35 + level * 0.5);
}
