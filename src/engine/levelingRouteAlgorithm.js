const PRIORITY_PROFILES = {
  stable: { preferredHits: [1, 2], maxComfortHits: 3, expWeight: 0.95, safetyWeight: 1.35, mesoWeight: 0.75, mpWeight: 1.15 },
  exp: { preferredHits: [1, 2, 3], maxComfortHits: 4, expWeight: 1.35, safetyWeight: 0.85, mesoWeight: 0.65, mpWeight: 0.8 },
  material: { preferredHits: [1, 2, 3], maxComfortHits: 4, expWeight: 0.9, safetyWeight: 0.9, mesoWeight: 0.95, mpWeight: 0.9 },
  meso: { preferredHits: [1, 2], maxComfortHits: 3, expWeight: 0.8, safetyWeight: 1.05, mesoWeight: 1.25, mpWeight: 1.25 },
};

const BUDGET_PROFILES = {
  low: { maxComfortHits: 2, minHit: 0.92, mpCostWeight: 1.35, potionCostWeight: 1.35, overLevelTolerance: 3, underLevelTolerance: 8, gearUpgradeAggression: 0.45 },
  mid: { maxComfortHits: 3, minHit: 0.88, mpCostWeight: 1, potionCostWeight: 1, overLevelTolerance: 5, underLevelTolerance: 10, gearUpgradeAggression: 0.7 },
  high: { maxComfortHits: 4, minHit: 0.86, mpCostWeight: 0.65, potionCostWeight: 0.7, overLevelTolerance: 7, underLevelTolerance: 12, gearUpgradeAggression: 1 },
};

const PRIORITY_HIT_FLOORS = {
  stable: { low: 0.94, mid: 0.91, high: 0.9 },
  exp: { low: 0.9, mid: 0.84, high: 0.8 },
  material: { low: 0.92, mid: 0.88, high: 0.85 },
  meso: { low: 0.93, mid: 0.89, high: 0.86 },
};

const DEFAULT_CONSUMABLE_PROFILE = {
  hpCostPerPoint: 0.25,
  mpCostPerPoint: 0.5,
  hpPotionName: 'Red Potion',
  mpPotionName: 'Lemon',
};

const SKILL_COST_HINTS = {
  'Energy Bolt': { mp: 7, lines: 1, role: 'single' },
  'Magic Claw': { mp: 14, lines: 2, role: 'single' },
  'Fire Arrow': { mp: 20, lines: 1, role: 'single' },
  'Cold Beam': { mp: 24, lines: 1, role: 'single-control' },
  'Thunder Bolt': { mp: 40, lines: 6, role: 'aoe' },
  'Heal': { mp: 24, lines: 6, role: 'undead-aoe' },
  'Holy Arrow': { mp: 24, lines: 1, role: 'single' },
  'Power Strike': { mp: 12, lines: 1, role: 'single' },
  'Slash Blast': { mp: 16, lines: 6, role: 'aoe' },
  'Arrow Blow': { mp: 14, lines: 1, role: 'single' },
  'Double Shot': { mp: 16, lines: 2, role: 'single' },
  'Lucky Seven': { mp: 16, lines: 2, role: 'single' },
  'Double Stab': { mp: 14, lines: 2, role: 'single' },
  'Arrow Bomb: Bow': { mp: 28, lines: 6, role: 'aoe-control' },
  'Iron Arrow: Crossbow': { mp: 28, lines: 1, role: 'line-aoe' },
  'Savage Blow': { mp: 28, lines: 6, role: 'single' },
  'Drain': { mp: 28, lines: 1, role: 'single-sustain' },
  '魔力弹': { mp: 7, lines: 1, role: 'single' },
  '魔法双击': { mp: 14, lines: 2, role: 'single' },
  '火箭术': { mp: 20, lines: 1, role: 'single' },
  '冰冻术': { mp: 24, lines: 1, role: 'single-control' },
  '雷电术': { mp: 40, lines: 6, role: 'aoe' },
  '治愈术': { mp: 24, lines: 6, role: 'undead-aoe' },
  '圣箭术': { mp: 24, lines: 1, role: 'single' },
  '强力攻击': { mp: 12, lines: 1, role: 'single' },
  '群体攻击': { mp: 16, lines: 6, role: 'aoe' },
  '断魂箭': { mp: 14, lines: 1, role: 'single' },
  '二连射': { mp: 16, lines: 2, role: 'single' },
  '双飞斩': { mp: 16, lines: 2, role: 'single' },
  '劈空斩': { mp: 14, lines: 1, role: 'single' },
};

function parseMpCost(text) {
  const match = String(text || '').match(/\bMP\s*-?\s*(\d+)/i);
  return match ? Number(match[1]) || 0 : 0;
}

function getHitFloorPercent(budget, priority, budgetProfile) {
  const priorityFloor = PRIORITY_HIT_FLOORS[priority]?.[budget];
  return (priorityFloor ?? budgetProfile.minHit ?? 0.85) * 100;
}

export function scoreLevelingTarget({
  monster,
  map,
  level,
  budget = 'mid',
  priority = 'stable',
  skillPlan,
  mainAttack = 0,
  hitPercent = 100,
  combat = {},
  profile = {},
  consumables,
} = {}) {
  const budgetProfile = BUDGET_PROFILES[budget] ?? BUDGET_PROFILES.mid;
  const priorityProfile = PRIORITY_PROFILES[priority] ?? PRIORITY_PROFILES.stable;
  const consumableProfile = normalizeConsumableProfile(consumables);
  const hitRate = clamp(Number(hitPercent ?? 100) / 100, 0, 1);
  const usableSkills = getUsableDamageSkills(skillPlan, mainAttack);
  const bestSkill = pickBestSkillForMonster({ monster, skills: usableSkills, budgetProfile, priorityProfile, hitRate });
  const levelDelta = Number(monster?.level ?? 1) - Number(level ?? 1);
  const density = normalizeSpawnDensity(map, monster);
  const survival = estimateSurvival({
    monster,
    level,
    combat,
    profile,
    bestSkill,
    budgetProfile,
    priorityProfile,
    consumableProfile,
  });
  const safety = survival.safetyScore;
  const levelFit = scoreLevelFitByBreakpoint({ levelDelta, hitsToKill: bestSkill.expectedCastsToKill, budgetProfile });
  const overkillPenalty = scoreOverkillWaste({ monster, level, bestSkill });
  const underLevelPenalty = scoreUnderleveledFarming({ monster, level, bestSkill, budgetProfile });
  const hitFloor = getHitFloorPercent(budget, priority, budgetProfile);
  const hitPenalty = Math.max(0, hitFloor - Number(hitPercent ?? 100)) * (budget === 'low' ? 3.4 : budget === 'mid' ? 2.2 : 1.35)
    + (hitRate <= 0 ? 120 : hitRate < 0.6 ? 58 : 0);
  const expScore = normalizeExpScore(monster, bestSkill, density);
  const mpScore = normalizeMpEfficiency(monster, bestSkill, priorityProfile, budgetProfile);
  const potionPenalty = scorePotionBurden({
    monster,
    survival,
    budgetProfile,
    priorityProfile,
  });
  const deathPenalty = survival.deathRisk * (budget === 'low' ? 130 : budget === 'mid' ? 95 : 70);
  const rawTotal = clamp(
    expScore * priorityProfile.expWeight
      + safety * priorityProfile.safetyWeight * 0.32
      + levelFit * 0.34
      + density * 0.18
      + mpScore * 0.18
      - overkillPenalty
      - underLevelPenalty
      - hitPenalty
      - potionPenalty
      - deathPenalty,
    0,
    100,
  );
  const hitShortfall = Math.max(0, hitFloor - Number(hitPercent ?? 100));
  const reliabilityCap = hitShortfall > 0 ? clamp(Number(hitPercent ?? 0) - hitShortfall * 2.8, 0, 100) : 100;
  const survivalCap = survival.deathRisk > 0.02
    ? clamp(100 - survival.deathRisk * (budget === 'low' ? 165 : 125), 0, 100)
    : survival.safetyScore < 35 ? survival.safetyScore : 100;
  const total = Math.min(rawTotal, reliabilityCap, survivalCap);

  return {
    monster,
    map,
    score: Math.round(total),
    bestSkill,
    hitsToKill: bestSkill.hitsToKill,
    expectedCastsToKill: bestSkill.expectedCastsToKill,
    castsPerKill: bestSkill.expectedCastsToKill,
    estimatedExpPerCast: Math.round(Number(monster?.exp ?? 0) / Math.max(1, bestSkill.expectedCastsToKill)),
    estimatedExpPerMp: round(Number(monster?.exp ?? 0) / Math.max(1, bestSkill.totalMpCost), 2),
    expectedPotionCost: Math.round(survival.totalPotionCost),
    hpPotionCost: Math.round(survival.hpPotionCost),
    mpPotionCost: Math.round(survival.mpPotionCost),
    deathRisk: round(survival.deathRisk, 2),
    maxIncomingDamage: survival.maxIncomingDamage,
    avgIncomingDamage: survival.avgIncomingDamage,
    hitsTaken: round(survival.expectedHitsTaken, 2),
    survival,
    scoreParts: {
      exp: Math.round(expScore),
      safety: Math.round(safety),
      levelFit: Math.round(levelFit),
      density: Math.round(density),
      mp: Math.round(mpScore),
      potionPenalty: Math.round(potionPenalty),
      deathPenalty: Math.round(deathPenalty),
      overkillPenalty: Math.round(overkillPenalty),
      underLevelPenalty: Math.round(underLevelPenalty),
      hitPenalty: Math.round(hitPenalty),
    },
    reason: buildTargetReason({ monster, bestSkill, levelDelta, expScore, mpScore, safety, survival }),
  };
}

export function rankLevelingMapsByBreakpoints({ maps = [], level, budget, priority, skillPlan, mainAttack, getHitPercent, items = [], consumables } = {}) {
  const consumableProfile = consumables ?? buildConsumableProfile(items);
  return maps
    .map((map) => {
      const combat = map.recommendationMeta?.combat ?? {};
      const profile = map.recommendationMeta?.profile ?? {};
      const targets = (map.monsters ?? []).map((monster) => scoreLevelingTarget({
        monster,
        map,
        level,
        budget,
        priority,
        skillPlan,
        mainAttack,
        hitPercent: typeof getHitPercent === 'function' ? getHitPercent(monster, map) : monster.hitPercent,
        combat,
        profile,
        consumables: consumableProfile,
      })).sort((a, b) => b.score - a.score);
      const best = targets[0];
      const mapScore = best ? Math.round(best.score * 0.72 + normalizeSpawnDensity(map, best.monster) * 0.28) : 0;
      return {
        ...map,
        monsters: targets.map((target) => ({
          ...target.monster,
          targetScore: target.score,
          hitsToKill: target.hitsToKill,
          expectedCastsToKill: target.expectedCastsToKill,
          bestSkillName: target.bestSkill.name,
          estimatedExpPerMp: target.estimatedExpPerMp,
          expectedPotionCost: target.expectedPotionCost,
          hpPotionCost: target.hpPotionCost,
          mpPotionCost: target.mpPotionCost,
          deathRisk: target.deathRisk,
          maxIncomingDamage: target.maxIncomingDamage,
          avgIncomingDamage: target.avgIncomingDamage,
          hitsTaken: target.hitsTaken,
          breakpointReason: target.reason,
        })),
        score: mapScore,
        breakpointMeta: best,
      };
    })
    .sort((a, b) => b.score - a.score || Number(b.spawnTotal ?? 0) - Number(a.spawnTotal ?? 0));
}

export function evaluateGearUpgradeForRoute({ currentRoute, upgradedRoute, budget = 'mid', mesoCost = 0 } = {}) {
  const budgetProfile = BUDGET_PROFILES[budget] ?? BUDGET_PROFILES.mid;
  const scoreGain = Number(upgradedRoute?.score ?? 0) - Number(currentRoute?.score ?? 0);
  const hitGain = Number(currentRoute?.hitsToKill ?? 99) - Number(upgradedRoute?.hitsToKill ?? 99);
  const newMobLevelGain = Number(upgradedRoute?.monster?.level ?? 0) - Number(currentRoute?.monster?.level ?? 0);
  const costPenalty = Math.log10(Math.max(1, Number(mesoCost) || 1)) * (1.2 - budgetProfile.gearUpgradeAggression);
  const value = scoreGain + hitGain * 18 + newMobLevelGain * 1.6 - costPenalty;
  return {
    worthIt: value >= (budget === 'low' ? 18 : budget === 'mid' ? 10 : 4),
    value: Math.round(value),
    reasons: [
      hitGain > 0 ? `少 ${hitGain} 次技能击杀` : '',
      newMobLevelGain > 0 ? `可上探 Lv.${newMobLevelGain} 更高怪物` : '',
      scoreGain > 0 ? `路线分 +${Math.round(scoreGain)}` : '',
      costPenalty > 5 ? '价格会降低性价比' : '',
    ].filter(Boolean),
  };
}

function getUsableDamageSkills(skillPlan, mainAttack) {
  const cards = (skillPlan?.damageCards ?? [])
    .filter((card) => !card.isBase && Number(card.level ?? 0) > 0)
    .map((card) => {
      const hint = SKILL_COST_HINTS[card.name] ?? { mp: Math.max(4, Math.round(Number(card.level ?? 1) * 0.8 + 5)), lines: card.hits ?? 1, role: 'single' };
      const avgDamage = (Number(card.min ?? 0) + Number(card.max ?? 0)) / 2;
      const mpCost = Number(card.mpCost ?? 0) || parseMpCost(card.role) || hint.mp;
      return {
        name: card.name,
        level: Number(card.level ?? 0),
        min: Number(card.min ?? 0),
        max: Number(card.max ?? 0),
        avgDamage: Math.max(1, avgDamage),
        mpCost,
        lines: Number(card.hits ?? hint.lines ?? 1) || 1,
        role: hint.role,
      };
    });

  if (cards.length) return cards;

  const base = Math.max(1, Number(mainAttack ?? 0));
  return [{ name: '普通攻击', level: 1, min: Math.round(base * 0.55), max: Math.round(base * 1.1), avgDamage: Math.max(1, base * 0.82), mpCost: 0, lines: 1, role: 'basic' }];
}

function pickBestSkillForMonster({ monster, skills, budgetProfile, priorityProfile, hitRate = 1 }) {
  return skills
    .map((skill) => {
      const effectiveDamage = skill.avgDamage * skillEfficiencyAgainstMonster(skill, monster);
      const hitsToKill = Math.max(1, Math.ceil(Number(monster?.hp ?? 1) / Math.max(1, effectiveDamage)));
      const expectedCastsToKill = Math.max(1, Math.ceil(hitsToKill / Math.max(0.05, hitRate)));
      const totalMpCost = expectedCastsToKill * skill.mpCost;
      const comfortPenalty = Math.max(0, expectedCastsToKill - Math.min(budgetProfile.maxComfortHits, priorityProfile.maxComfortHits)) * 14;
      const mpPenalty = totalMpCost * budgetProfile.mpCostWeight * priorityProfile.mpWeight * 0.08;
      const score = Number(monster?.exp ?? 0) / Math.max(1, expectedCastsToKill) - comfortPenalty - mpPenalty;
      return { ...skill, effectiveDamage: Math.round(effectiveDamage), hitsToKill, expectedCastsToKill, totalMpCost, score };
    })
    .sort((a, b) => b.score - a.score || a.expectedCastsToKill - b.expectedCastsToKill || a.hitsToKill - b.hitsToKill)[0];
}

function skillEfficiencyAgainstMonster(skill, monster) {
  if (skill.role === 'undead-aoe') return monster?.undead ? 1.35 : 0;
  if (skill.name === 'Fire Arrow' && safeArray(monster?.elementWeakness).map(lower).includes('fire')) return 1.25;
  if (skill.name === 'Cold Beam' && safeArray(monster?.elementWeakness).map(lower).includes('ice')) return 1.22;
  if (skill.name === 'Thunder Bolt' && safeArray(monster?.elementWeakness).map(lower).includes('lightning')) return 1.18;
  if (safeArray(monster?.elementResist).some((x) => lower(x) === 'fire' && skill.name === 'Fire Arrow')) return 0.75;
  if (skill.name === '火箭术' && safeArray(monster?.elementWeakness).map(lower).includes('fire')) return 1.25;
  if (skill.name === '冰冻术' && safeArray(monster?.elementWeakness).map(lower).includes('ice')) return 1.22;
  if (skill.name === '雷电术' && safeArray(monster?.elementWeakness).map(lower).includes('lightning')) return 1.18;
  if (safeArray(monster?.elementResist).some((x) => lower(x) === 'fire' && skill.name === '火箭术')) return 0.75;
  return 1;
}

function normalizeExpScore(monster, skill, density) {
  const expPerCast = Number(monster?.exp ?? 0) / Math.max(1, skill.expectedCastsToKill ?? skill.hitsToKill);
  const densityMultiplier = 0.7 + density / 220;
  return clamp(Math.log2(expPerCast + 1) * 18 * densityMultiplier, 0, 100);
}

function normalizeMpEfficiency(monster, skill, priorityProfile, budgetProfile) {
  if (!skill.totalMpCost) return 88;
  const expPerMp = Number(monster?.exp ?? 0) / Math.max(1, skill.totalMpCost);
  return clamp(expPerMp * 18 / (priorityProfile.mpWeight * budgetProfile.mpCostWeight), 0, 100);
}

function normalizeSpawnDensity(map, monster) {
  const spawnTotal = Number(map?.spawnTotal ?? 0);
  const monsterCount = Number(monster?.spawnCount ?? 0);
  const count = monsterCount || spawnTotal || 1;
  return clamp(Math.log2(count + 1) * 14 + Math.log2(spawnTotal + 1) * 4, 0, 100);
}

export function buildConsumableProfile(items = []) {
  const profile = { ...DEFAULT_CONSUMABLE_PROFILE };
  for (const item of items ?? []) {
    const category = lower(item?.category);
    const subCategory = lower(item?.sub_category ?? item?.subCategory ?? item?.type);
    if (!category.includes('consumable') && !subCategory.includes('consume')) continue;
    if (Number(item?.stats?.notSale ?? item?.notSale ?? 0)) continue;
    const price = Number(item?.price ?? item?.stats?.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) continue;

    const description = String(item?.description ?? '');
    const hp = parseRecoveryAmount(description, 'HP');
    const mp = parseRecoveryAmount(description, 'MP');
    if (hp > 0 && price / hp < profile.hpCostPerPoint) {
      profile.hpCostPerPoint = price / hp;
      profile.hpPotionName = item?.name ?? profile.hpPotionName;
    }
    if (mp > 0 && price / mp < profile.mpCostPerPoint) {
      profile.mpCostPerPoint = price / mp;
      profile.mpPotionName = item?.name ?? profile.mpPotionName;
    }
  }
  return profile;
}

function normalizeConsumableProfile(consumables) {
  return {
    ...DEFAULT_CONSUMABLE_PROFILE,
    ...(consumables ?? {}),
    hpCostPerPoint: Number(consumables?.hpCostPerPoint ?? DEFAULT_CONSUMABLE_PROFILE.hpCostPerPoint) || DEFAULT_CONSUMABLE_PROFILE.hpCostPerPoint,
    mpCostPerPoint: Number(consumables?.mpCostPerPoint ?? DEFAULT_CONSUMABLE_PROFILE.mpCostPerPoint) || DEFAULT_CONSUMABLE_PROFILE.mpCostPerPoint,
  };
}

function parseRecoveryAmount(description, stat) {
  const text = String(description || '').replace(/\s+/g, ' ');
  const both = text.match(/Recovers\s+(?:around\s+|about\s+|up to\s+)?(\d+)\s+for both HP and MP/i);
  if (both) return Number(both[1]) || 0;

  const patterns = [
    new RegExp(`Recovers\\s+(?:around\\s+|about\\s+|up to\\s+)?(\\d+)\\s+${stat}\\b`, 'i'),
    new RegExp(`Recovers\\s+${stat}\\s*\\+?\\s*(\\d+)\\b`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && !/%/.test(match[0])) return Number(match[1]) || 0;
  }
  return 0;
}

function estimateSurvival({ monster, level, combat = {}, profile = {}, bestSkill, budgetProfile, priorityProfile, consumableProfile }) {
  const levelDelta = Number(monster?.level ?? 1) - Number(level ?? 1);
  const hp = Math.max(1, Number(combat?.hp ?? 0) || Number(level ?? 1) * 24);
  const incoming = getIncomingDamageProfile(monster, combat);
  const expectedCasts = Math.max(1, Number(bestSkill?.expectedCastsToKill ?? bestSkill?.hitsToKill ?? 1));
  const exposure = estimateContactExposure({ monster, profile, bestSkill });
  const expectedHitsTaken = Math.max(0.05, expectedCasts * exposure);
  const expectedHpLoss = incoming.avgDamage * expectedHitsTaken;
  const hpPressure = expectedHpLoss / hp;
  const oneShotRatio = incoming.maxDamage / hp;
  const oneShotRisk = oneShotRatio >= 1 ? 1 : oneShotRatio >= 0.82 ? 0.55 : oneShotRatio >= 0.66 ? 0.24 : 0;
  const sustainRisk = clamp((expectedHpLoss - hp * 0.46) / Math.max(1, hp * 0.72), 0, 1);
  const overLevelRisk = clamp((levelDelta - budgetProfile.overLevelTolerance) / 10, 0, 1);
  const deathRisk = clamp(Math.max(oneShotRisk, sustainRisk) + overLevelRisk * 0.16, 0, 1);
  const hpPotionCost = expectedHpLoss * consumableProfile.hpCostPerPoint;
  const mpPotionCost = Number(bestSkill?.totalMpCost ?? 0) * consumableProfile.mpCostPerPoint;
  const totalPotionCost = hpPotionCost + mpPotionCost;
  const safetyScore = clamp(
    100
      - hpPressure * 76 * priorityProfile.safetyWeight
      - Math.max(0, oneShotRatio - 0.38) * 68
      - deathRisk * 110
      - Math.max(0, levelDelta - budgetProfile.overLevelTolerance) * 7,
    0,
    100,
  );

  return {
    safetyScore,
    expectedHitsTaken,
    expectedHpLoss,
    hpPotionCost,
    mpPotionCost,
    totalPotionCost,
    deathRisk,
    minIncomingDamage: incoming.minDamage,
    avgIncomingDamage: incoming.avgDamage,
    maxIncomingDamage: incoming.maxDamage,
    damageReduction: incoming.reduction,
    hpCostPerPoint: consumableProfile.hpCostPerPoint,
    mpCostPerPoint: consumableProfile.mpCostPerPoint,
    hpPotionName: consumableProfile.hpPotionName,
    mpPotionName: consumableProfile.mpPotionName,
  };
}

function estimateContactExposure({ monster, profile = {}, bestSkill = {} }) {
  const rangeType = profile.rangeType ?? 'hybrid';
  let exposure = rangeType === 'ranged' ? 0.28 : rangeType === 'magic' ? 0.34 : rangeType === 'melee' ? 0.72 : 0.48;
  const role = lower(bestSkill.role);
  if (role.includes('aoe')) exposure += 0.14;
  if (role.includes('control') || role.includes('sustain')) exposure -= 0.08;
  if (Number(monster?.magicAttack ?? 0) > Number(monster?.physicalAttack ?? 0)) exposure += 0.18;
  if (Number(monster?.speed ?? 0) > 8 && rangeType !== 'melee') exposure += 0.08;
  return clamp(exposure, 0.12, 0.95);
}

function getIncomingDamageProfile(monster, combat = {}) {
  const physicalAttack = Number(monster?.physicalAttack ?? monster?.PADamage ?? 0);
  const magicAttack = Number(monster?.magicAttack ?? monster?.MADamage ?? 0);
  const usesMagic = magicAttack > physicalAttack;
  const attack = Math.max(physicalAttack, magicAttack, Number(monster?.level ?? 1) * 2.2);
  const defense = usesMagic ? Number(combat?.magicDefense ?? 0) : Number(combat?.physicalDefense ?? 0);
  const monsterLevel = Math.max(1, Number(monster?.level ?? 1));
  const reduction = Math.floor(Math.min(defense * monsterLevel / 70, defense / 5));
  return {
    minDamage: Math.max(1, Math.floor(attack * 1.0) - reduction),
    avgDamage: Math.max(1, Math.floor(attack * 1.25) - reduction),
    maxDamage: Math.max(1, Math.floor(attack * 1.5) - reduction),
    reduction,
  };
}

function scorePotionBurden({ monster, survival, budgetProfile, priorityProfile }) {
  const exp = Math.max(1, Number(monster?.exp ?? 0));
  const freeBudget = exp * (budgetProfile === BUDGET_PROFILES.low ? 0.2 : budgetProfile === BUDGET_PROFILES.mid ? 0.32 : 0.5);
  const netCost = Math.max(0, Number(survival?.totalPotionCost ?? 0) - freeBudget);
  const costToExpRatio = netCost / exp;
  return clamp(
    netCost * 0.42 * budgetProfile.potionCostWeight * priorityProfile.safetyWeight
      + costToExpRatio * 26 * budgetProfile.potionCostWeight,
    0,
    85,
  );
}

function scoreLevelFitByBreakpoint({ levelDelta, hitsToKill, budgetProfile }) {
  let score = 72;
  if (levelDelta >= -3 && levelDelta <= budgetProfile.overLevelTolerance) score += 20;
  if (levelDelta > budgetProfile.overLevelTolerance) score -= (levelDelta - budgetProfile.overLevelTolerance) * 7;
  if (levelDelta < -budgetProfile.underLevelTolerance) score -= Math.abs(levelDelta + budgetProfile.underLevelTolerance) * 5;
  if (hitsToKill === 1) score += 4;
  if (hitsToKill === 2) score += 8;
  if (hitsToKill === 3) score += 2;
  if (hitsToKill > budgetProfile.maxComfortHits) score -= (hitsToKill - budgetProfile.maxComfortHits) * 10;
  return clamp(score, 0, 100);
}

function scoreOverkillWaste({ monster, level, bestSkill }) {
  const levelGap = Number(level ?? 1) - Number(monster?.level ?? 1);
  if ((bestSkill.expectedCastsToKill ?? bestSkill.hitsToKill) > 1 || levelGap <= 8) return 0;
  return Math.min(28, (levelGap - 8) * 4);
}

function scoreUnderleveledFarming({ monster, level, bestSkill, budgetProfile }) {
  const levelGap = Number(level ?? 1) - Number(monster?.level ?? 1);
  const tolerance = budgetProfile.underLevelTolerance;
  if (levelGap <= tolerance) return 0;
  const penalty = (levelGap - tolerance) * ((bestSkill.expectedCastsToKill ?? bestSkill.hitsToKill) === 1 ? 6 : 4);
  return Math.min(42, penalty);
}

function buildTargetReason({ monster, bestSkill, levelDelta, expScore, mpScore, safety }) {
  const direction = levelDelta > 0 ? `高你 ${levelDelta} 级` : levelDelta < 0 ? `低你 ${Math.abs(levelDelta)} 级` : '同级';
  return `${bestSkill.name} 约 ${bestSkill.expectedCastsToKill ?? bestSkill.hitsToKill} 次击杀，${direction}，经验评分 ${Math.round(expScore)}，蓝耗效率 ${Math.round(mpScore)}，安全 ${Math.round(safety)}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function lower(value) {
  return String(value ?? '').toLowerCase();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function round(value, digits = 1) {
  const scale = 10 ** digits;
  return Math.round((Number(value) || 0) * scale) / scale;
}
