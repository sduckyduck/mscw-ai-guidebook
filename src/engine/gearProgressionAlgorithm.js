export const GEAR_SLOT_ORDER = [
  'cap', 'overall', 'top', 'bottom', 'shoes', 'glove', 'cape', 'earring', 'shield', 'weapon',
];

export const NON_WEAPON_SLOTS = GEAR_SLOT_ORDER.filter((slot) => slot !== 'weapon');

const BUDGET_PHASES = {
  low: [
    { maxLevel: 14, maxNonWeaponUpgrades: 0, minUpgradeGain: 999, weakUpgradeGain: 999, weaponMinGain: 999, autoSlots: [] },
    { maxLevel: 19, maxNonWeaponUpgrades: 2, minUpgradeGain: 22, weakUpgradeGain: 13, weaponMinGain: 6, autoSlots: ['cap', 'top', 'bottom', 'shoes'] },
    { maxLevel: 24, maxNonWeaponUpgrades: 3, minUpgradeGain: 18, weakUpgradeGain: 10, weaponMinGain: 5, autoSlots: ['cap', 'overall', 'top', 'bottom', 'shoes', 'shield'] },
    { maxLevel: 29, maxNonWeaponUpgrades: 4, minUpgradeGain: 14, weakUpgradeGain: 8, weaponMinGain: 4, autoSlots: ['cap', 'overall', 'top', 'bottom', 'shoes', 'shield'] },
    { maxLevel: 39, maxNonWeaponUpgrades: 5, minUpgradeGain: 10, weakUpgradeGain: 6, weaponMinGain: 3, autoSlots: ['cap', 'overall', 'top', 'bottom', 'shoes', 'glove', 'shield'] },
    { maxLevel: Infinity, maxNonWeaponUpgrades: 7, minUpgradeGain: 8, weakUpgradeGain: 5, weaponMinGain: 2, autoSlots: ['cap', 'overall', 'top', 'bottom', 'shoes', 'glove', 'shield', 'cape', 'earring'] },
  ],
  mid: [
    { maxLevel: 19, maxNonWeaponUpgrades: 3, minUpgradeGain: 10, weakUpgradeGain: 5, weaponMinGain: 4, autoSlots: ['cap', 'overall', 'top', 'bottom', 'shoes', 'shield'] },
    { maxLevel: 29, maxNonWeaponUpgrades: 5, minUpgradeGain: 7, weakUpgradeGain: 4, weaponMinGain: 3, autoSlots: ['cap', 'overall', 'top', 'bottom', 'shoes', 'shield'] },
    { maxLevel: 39, maxNonWeaponUpgrades: 7, minUpgradeGain: 5, weakUpgradeGain: 3, weaponMinGain: 2, autoSlots: ['cap', 'overall', 'top', 'bottom', 'shoes', 'glove', 'shield'] },
    { maxLevel: Infinity, maxNonWeaponUpgrades: 99, minUpgradeGain: 4, weakUpgradeGain: 2, weaponMinGain: 2, autoSlots: ['cap', 'overall', 'top', 'bottom', 'shoes', 'glove', 'shield', 'cape', 'earring'] },
  ],
  high: [
    { maxLevel: Infinity, maxNonWeaponUpgrades: 99, minUpgradeGain: 4, weakUpgradeGain: 2, weaponMinGain: 2, autoSlots: ['cap', 'overall', 'top', 'bottom', 'shoes', 'glove', 'shield', 'cape', 'earring'] },
  ],
};

const CLASS_SLOT_PRIORITY = {
  magician: { weapon: 40, cap: 12, overall: 10, top: 10, bottom: 8, shoes: 5, shield: 2, glove: 1, cape: 1, earring: 2 },
  warrior: { weapon: 42, cap: 9, overall: 9, top: 8, bottom: 8, shoes: 5, shield: 7, glove: 5, cape: 2, earring: 2 },
  bowman: { weapon: 42, cap: 8, overall: 8, top: 8, bottom: 8, shoes: 5, shield: 0, glove: 6, cape: 2, earring: 2 },
  thief: { weapon: 42, cap: 8, overall: 8, top: 8, bottom: 8, shoes: 6, shield: 6, glove: 7, cape: 2, earring: 2 },
  pirate: { weapon: 42, cap: 8, overall: 8, top: 8, bottom: 8, shoes: 6, shield: 0, glove: 6, cape: 2, earring: 2 },
};

const EMPTY_SLOT_BASELINE = {
  low: { shield: 28, glove: 28, cape: 28, earring: 28, default: 34 },
  mid: { shield: 16, glove: 16, cape: 16, earring: 16, default: 24 },
  high: { shield: 8, glove: 8, cape: 8, earring: 8, default: 12 },
};

export function getGearProgressionPhase(level, budget = 'mid') {
  const numericLevel = Number(level) || 1;
  const phases = BUDGET_PHASES[budget] ?? BUDGET_PHASES.mid;
  const phase = phases.find((item) => numericLevel <= item.maxLevel) ?? phases[phases.length - 1];
  return {
    ...phase,
    budget,
    level: numericLevel,
    autoSlots: new Set(phase.autoSlots),
  };
}

export function selectNaturalProgressionGearSet({
  classLine,
  branch,
  level,
  budget = 'mid',
  candidatesBySlot = {},
  baselineBySlot = {},
  scoreItem,
  canUseShield,
} = {}) {
  const phase = getGearProgressionPhase(level, budget);
  const selected = Object.fromEntries(GEAR_SLOT_ORDER.map((slot) => [slot, firstItem(baselineBySlot[slot])]));

  selected.weapon = pickNaturalWeapon({
    classLine,
    level,
    budget,
    phase,
    current: selected.weapon,
    candidates: candidatesBySlot.weapon ?? [],
    scoreItem,
  });

  const upgrades = [];
  for (const slot of NON_WEAPON_SLOTS) {
    if (!phase.autoSlots.has(slot)) continue;
    if (slot === 'shield' && !shouldConsiderAutoShield({ classLine, branch, budget, level, weapon: selected.weapon, canUseShield })) continue;

    const upgrade = pickBestSlotUpgrade({
      slot,
      classLine,
      level,
      budget,
      phase,
      current: selected[slot],
      candidates: candidatesBySlot[slot] ?? [],
      scoreItem,
    });
    if (upgrade) upgrades.push(upgrade);
  }

  upgrades
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, phase.maxNonWeaponUpgrades)
    .forEach(({ slot, item }) => { selected[slot] = item; });

  resolveSlotConflicts(selected, { classLine, branch, budget, canUseShield });

  return GEAR_SLOT_ORDER.map((slot) => selected[slot]).filter(Boolean);
}

export function pickNaturalWeapon({ classLine, level, budget, phase, current, candidates = [], scoreItem }) {
  const legal = candidates.filter(Boolean);
  if (!legal.length) return current ?? null;

  const best = legal[0];
  if (!current) return best;

  const bestScore = progressionItemScore({ item: best, classLine, level, budget, slot: 'weapon', scoreItem });
  const currentScore = progressionItemScore({ item: current, classLine, level, budget, slot: 'weapon', scoreItem });
  const gain = bestScore - currentScore;
  const bestAttack = readItemValue(best, classLine?.id === 'magician' ? ['incMAD', 'mad', 'matk'] : ['incPAD', 'pad', 'watk']);
  const currentAttack = readItemValue(current, classLine?.id === 'magician' ? ['incMAD', 'mad', 'matk'] : ['incPAD', 'pad', 'watk']);

  if (bestAttack > currentAttack || gain >= phase.weaponMinGain) return best;
  return current;
}

export function pickBestSlotUpgrade({ slot, classLine, level, budget, phase, current, candidates = [], scoreItem }) {
  const currentScore = current
    ? progressionItemScore({ item: current, classLine, level, budget, slot, scoreItem })
    : starterEmptyScore(slot, budget, level);

  const ranked = candidates
    .filter(Boolean)
    .filter((item) => item.id !== current?.id)
    .filter((item) => item.slot === slot)
    .filter((item) => isAutoRelevantItem(item, classLine, budget))
    .map((item) => {
      const score = progressionItemScore({ item, classLine, level, budget, slot, scoreItem });
      const gain = score - currentScore;
      const relevance = classRelevanceScore(item, classLine);
      const threshold = relevance >= 10 ? phase.weakUpgradeGain : phase.minUpgradeGain;
      return {
        slot,
        item,
        gain,
        relevance,
        threshold,
        priorityScore: gain + relevance * 0.65 + slotPriority(slot, classLine),
      };
    })
    .filter((entry) => entry.gain >= entry.threshold);

  return ranked.sort((a, b) => b.priorityScore - a.priorityScore)[0] ?? null;
}

export function progressionItemScore({ item, classLine, level, budget = 'mid', slot = item?.slot, scoreItem }) {
  const baseScore = typeof scoreItem === 'function' ? Number(scoreItem(item, { classLine, level, budget, slot }) || 0) : defaultItemScore(item, classLine, level, budget);
  const relevance = classRelevanceScore(item, classLine);
  const slotTax = cosmeticOrDefenseOnlyPenalty(item, classLine, budget);
  return baseScore + relevance * 2 + slotPriority(slot, classLine) - slotTax;
}

export function classRelevanceScore(item, classLine) {
  if (!item) return 0;
  const primary = readItemValue(item, [`inc${classLine?.primaryStat}`, String(classLine?.primaryStat || '').toLowerCase()]);
  const secondary = readItemValue(item, [`inc${classLine?.secondaryStat}`, String(classLine?.secondaryStat || '').toLowerCase()]);
  const acc = readItemValue(item, ['incACC', 'accuracy', 'acc']);
  const hp = readItemValue(item, ['incMHP', 'incMaxHP', 'incHP', 'mhp', 'hp']);
  const mp = readItemValue(item, ['incMMP', 'incMaxMP', 'incMP', 'mmp', 'mp']);
  const watk = readItemValue(item, ['incPAD', 'pad', 'watk']);
  const matk = readItemValue(item, ['incMAD', 'mad', 'matk']);
  const mobility = readItemValue(item, ['incSpeed', 'speed']) + readItemValue(item, ['incJump', 'jump']);

  if (classLine?.id === 'magician') return primary * 5 + secondary * 2 + matk * 6 + mp * 0.06 + hp * 0.04 + mobility * 0.7;
  return primary * 4 + secondary * 2 + watk * 7 + acc * 3 + hp * 0.04 + mobility * 0.6;
}

export function isAutoShieldWorthUsing(shield, classLine, budget = 'mid') {
  if (!shield) return false;

  if (classLine?.id === 'magician') {
    const mageValue = readItemValue(shield, ['incINT', 'int']) * 5
      + readItemValue(shield, ['incLUK', 'luk']) * 2
      + readItemValue(shield, ['incMAD', 'mad', 'matk']) * 8
      + readItemValue(shield, ['incMMP', 'incMaxMP', 'incMP', 'mmp', 'mp']) * 0.08
      + readItemValue(shield, ['incMHP', 'incMaxHP', 'incHP', 'mhp', 'hp']) * 0.04;
    return budget === 'high' ? mageValue >= 3 : mageValue >= 8;
  }

  if (budget === 'low') return classRelevanceScore(shield, classLine) >= 5 || isClassSpecificLike(shield, classLine);
  return hasAnyUsefulStat(shield) || isClassSpecificLike(shield, classLine);
}

export function shouldConsiderAutoShield({ classLine, branch, budget = 'mid', level, weapon, canUseShield }) {
  if (typeof canUseShield === 'function' && !canUseShield({ classLine, branch, weapon })) return false;
  if (!weapon) return false;
  if (classLine?.id === 'magician') return budget !== 'low' || Number(level) >= 20;
  return true;
}

function resolveSlotConflicts(selected, { classLine, branch, budget, canUseShield }) {
  if (selected.overall) {
    selected.top = null;
    selected.bottom = null;
  } else if (selected.top || selected.bottom) {
    selected.overall = null;
  }

  if (selected.shield) {
    const shieldAllowed = typeof canUseShield === 'function' ? canUseShield({ classLine, branch, weapon: selected.weapon }) : true;
    if (!shieldAllowed || !isAutoShieldWorthUsing(selected.shield, classLine, budget)) selected.shield = null;
  }
}

function isAutoRelevantItem(item, classLine, budget) {
  if (!item) return false;
  if (item.slot === 'weapon') return true;
  if (item.slot === 'shield') return isAutoShieldWorthUsing(item, classLine, budget);

  const relevance = classRelevanceScore(item, classLine);
  if (budget === 'high') return relevance > 0 || hasAnyUsefulStat(item);
  if (budget === 'mid') return relevance >= 4 || hasAnyUsefulStat(item);
  return relevance >= 6 || isClassSpecificLike(item, classLine);
}

function cosmeticOrDefenseOnlyPenalty(item, classLine, budget) {
  if (!item) return 0;
  const relevance = classRelevanceScore(item, classLine);
  const price = Math.log10(Math.max(1, Number(item.price ?? 1)));
  const isDefenseOnly = relevance <= 2 && item.slot !== 'weapon';
  const lowBudgetTax = budget === 'low' ? price * 4 : price * 1.5;
  return (isDefenseOnly ? (budget === 'low' ? 22 : 10) : 0) + lowBudgetTax;
}

function starterEmptyScore(slot, budget, level) {
  const baselines = EMPTY_SLOT_BASELINE[budget] ?? EMPTY_SLOT_BASELINE.mid;
  if (Object.prototype.hasOwnProperty.call(baselines, slot)) return baselines[slot];
  return Math.max(10, Number(baselines.default) - Number(level || 1) * 0.8);
}

function slotPriority(slot, classLine) {
  const priorities = CLASS_SLOT_PRIORITY[classLine?.id] ?? CLASS_SLOT_PRIORITY.warrior;
  return priorities[slot] ?? 0;
}

function defaultItemScore(item, classLine, level, budget) {
  if (!item) return 0;
  const attack = classLine?.id === 'magician'
    ? readItemValue(item, ['incMAD', 'mad', 'matk']) * 3 + readItemValue(item, ['incPAD', 'pad', 'watk']) * 0.25
    : readItemValue(item, ['incPAD', 'pad', 'watk']) * 3 + readItemValue(item, ['incMAD', 'mad', 'matk']) * 0.25;
  const primary = readItemValue(item, [`inc${classLine?.primaryStat}`, String(classLine?.primaryStat || '').toLowerCase()]) * 5;
  const secondary = readItemValue(item, [`inc${classLine?.secondaryStat}`, String(classLine?.secondaryStat || '').toLowerCase()]) * 2;
  const acc = readItemValue(item, ['incACC', 'accuracy', 'acc']) * 2;
  const levelFit = 100 - Math.abs(Number(level || 1) - Number(item.reqLevel ?? 0)) * 3.8;
  const budgetPenalty = Math.log10(Math.max(1, Number(item.price ?? 1))) * (budget === 'low' ? 3.2 : budget === 'high' ? 0.25 : 1.45);
  return attack + primary + secondary + acc + levelFit - budgetPenalty;
}

function hasAnyUsefulStat(item) {
  return ['incSTR', 'incDEX', 'incINT', 'incLUK', 'incPAD', 'incMAD', 'incACC', 'incSpeed', 'incJump', 'incMHP', 'incMMP']
    .some((key) => readItemValue(item, [key]) !== 0);
}

function isClassSpecificLike(item, classLine) {
  const label = String(item?.reqJobLabel ?? item?.req_job_label ?? '').toLowerCase();
  if (!label || label === 'all') return false;
  const expected = String(classLine?.name ?? classLine?.id ?? '').toLowerCase();
  return expected && label.includes(expected);
}

function firstItem(value) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function readItemValue(item, aliases) {
  for (const key of aliases) {
    const value = item?.[key] ?? item?.stats?.[key];
    if (value !== undefined && value !== null && value !== '') return Number(value) || 0;
  }
  return 0;
}
