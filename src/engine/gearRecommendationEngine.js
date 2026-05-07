const SLOT_ORDER = ['weapon', 'hat', 'overall', 'top', 'bottom', 'shoes', 'gloves', 'shield', 'cape', 'earrings'];

const SLOT_LABELS = {
  weapon: '武器',
  hat: '头盔',
  overall: '套服',
  top: '上衣',
  bottom: '下衣',
  shoes: '鞋子',
  gloves: '手套',
  shield: '盾牌',
  cape: '披风',
  earrings: '耳环',
};

const CLASS_LABELS = {
  warrior: ['warrior'],
  magician: ['mage', 'magician'],
  bowman: ['bowman', 'archer'],
  thief: ['thief'],
  pirate: ['pirate'],
};

const WEAPON_KEYWORDS = {
  warrior: ['sword', 'axe', 'blunt', 'spear', 'polearm', 'pole arm', 'mace'],
  magician: ['wand', 'staff'],
  bowman: ['bow', 'crossbow'],
  thief: ['claw', 'dagger'],
  pirate: ['gun', 'knuckle'],
};

const BUDGET_POLICY = {
  low: {
    name: '低资金',
    weaponLead: 2,
    armorLead: 0,
    accessoryLead: 0,
    pricePenalty: 1.25,
    levelSmooth: 5,
    weaponWeight: 1.1,
  },
  mid: {
    name: '普通',
    weaponLead: 4,
    armorLead: 2,
    accessoryLead: 1,
    pricePenalty: 0.8,
    levelSmooth: 4,
    weaponWeight: 1.18,
  },
  high: {
    name: '有钱',
    weaponLead: 7,
    armorLead: 4,
    accessoryLead: 3,
    pricePenalty: 0.28,
    levelSmooth: 3,
    weaponWeight: 1.35,
  },
};

export function buildRecommendedGearV2(classLine, level, budget = 'mid', items = [], professionRecipes = []) {
  const playerLevel = clampInt(level, 1, 250);
  const policy = BUDGET_POLICY[budget] ?? BUDGET_POLICY.mid;
  const normalizedItems = safeArray(items).map(normalizeItem).filter((item) => item.slot);
  const selected = [];
  const selectedSlots = new Set();

  for (const slot of SLOT_ORDER) {
    if (slot === 'shield' && !shouldUseShield(selected, classLine)) continue;
    if ((slot === 'top' || slot === 'bottom') && selectedSlots.has('overall')) continue;
    if (slot === 'overall' && (selectedSlots.has('top') || selectedSlots.has('bottom'))) continue;

    const candidates = normalizedItems
      .filter((item) => item.slot === slot)
      .filter((item) => isClassCompatible(item, classLine))
      .filter((item) => isWeaponCompatible(item, classLine))
      .filter((item) => isReasonableItem(item))
      .map((item) => ({ ...item, gearScore: scoreItem(item, classLine, playerLevel, policy, budget) }))
      .filter((item) => item.gearScore > 0)
      .sort((a, b) => b.gearScore - a.gearScore || b.reqLevel - a.reqLevel);

    const best = candidates[0];
    if (!best) continue;

    selected.push(formatGearCard(best, slot, policy));
    selectedSlots.add(slot);
  }

  if (!selected.some((item) => item.slot === 'weapon')) {
    selected.unshift(fallbackWeapon(classLine, playerLevel));
  }

  return fillDisplaySlots(selected, classLine, playerLevel);
}

function normalizeItem(item) {
  const subCategory = String(item?.sub_category ?? item?.subCategory ?? item?.type ?? '').toLowerCase();
  const name = String(item?.name ?? item?.title ?? 'Unknown Item');
  const stats = item?.stats ?? item ?? {};
  const slot = detectSlot(subCategory, name, item?.weapon_type);

  return {
    ...item,
    slot,
    id: String(item?.id ?? item?.rawId ?? name),
    title: name,
    name,
    reqLevel: Number(item?.reqLevel ?? stats.reqLevel ?? 0),
    reqJobLabel: item?.req_job_label ?? item?.reqJobLabel ?? 'All',
    weaponType: item?.weapon_type ?? item?.weaponType ?? '',
    attackSpeed: item?.attack_speed_label ?? item?.attackSpeedLabel ?? stats.attackSpeed ?? '',
    price: Number(item?.price ?? 0),
    incPAD: Number(item?.incPAD ?? stats.incPAD ?? 0),
    incMAD: Number(item?.incMAD ?? stats.incMAD ?? 0),
    incACC: Number(item?.incACC ?? stats.incACC ?? stats.incACCr ?? 0),
    incSTR: Number(item?.incSTR ?? stats.incSTR ?? 0),
    incDEX: Number(item?.incDEX ?? stats.incDEX ?? 0),
    incINT: Number(item?.incINT ?? stats.incINT ?? 0),
    incLUK: Number(item?.incLUK ?? stats.incLUK ?? 0),
    incHP: Number(item?.incMHP ?? item?.incHP ?? stats.incMHP ?? stats.incHP ?? 0),
    incMP: Number(item?.incMMP ?? item?.incMP ?? stats.incMMP ?? stats.incMP ?? 0),
    incSpeed: Number(item?.incSpeed ?? stats.incSpeed ?? 0),
    thumbnail: item?.thumbnail ?? null,
  };
}

function detectSlot(subCategory, name, weaponType) {
  const text = `${subCategory} ${name} ${weaponType ?? ''}`.toLowerCase();
  if (/weapon|sword|axe|wand|staff|bow|crossbow|claw|dagger|spear|pole|gun|knuckle|mace/.test(text)) return 'weapon';
  if (/hat|cap|helmet|headband|head/.test(text)) return 'hat';
  if (/overall|robe|armor|dress/.test(text)) return 'overall';
  if (/top|shirt|coat|upper/.test(text)) return 'top';
  if (/bottom|pants|skirt|lower/.test(text)) return 'bottom';
  if (/shoe|boot/.test(text)) return 'shoes';
  if (/glove/.test(text)) return 'gloves';
  if (/shield/.test(text)) return 'shield';
  if (/cape/.test(text)) return 'cape';
  if (/earring/.test(text)) return 'earrings';
  return null;
}

function isClassCompatible(item, classLine) {
  const label = String(item.reqJobLabel ?? 'All').toLowerCase();
  if (!label || label === 'all') return true;
  const classLabels = CLASS_LABELS[classLine?.id] ?? [];
  return classLabels.some((name) => label.includes(name));
}

function isWeaponCompatible(item, classLine) {
  if (item.slot !== 'weapon') return true;
  const text = `${item.weaponType} ${item.name}`.toLowerCase();
  const keywords = WEAPON_KEYWORDS[classLine?.id] ?? [];
  if (!keywords.length) return true;
  return keywords.some((word) => text.includes(word));
}

function isReasonableItem(item) {
  const text = String(item.name ?? '').toLowerCase();
  if (/underwear/.test(text)) return false;
  if (/cash|nx|event only/.test(text)) return false;
  return true;
}

function scoreItem(item, classLine, playerLevel, policy, budget) {
  const cap = getSlotLevelCap(item.slot, playerLevel, policy);
  const overCap = Math.max(0, item.reqLevel - cap);
  const tooFarBelow = Math.max(0, playerLevel - item.reqLevel - getLowLevelTolerance(item.slot, policy));
  if (overCap > 0) return 0;
  if (item.reqLevel > playerLevel + 12) return 0;

  const levelFit = 100 - Math.abs(playerLevel - item.reqLevel) * policy.levelSmooth - tooFarBelow * 3;
  const statScore = getStatScore(item, classLine);
  const slotValue = getSlotValue(item, classLine);
  const pricePenalty = getPricePenalty(item, policy, playerLevel);
  const beginnerPenalty = item.reqLevel <= 0 && playerLevel >= 12 ? 14 : 0;
  const slotWeight = item.slot === 'weapon' ? policy.weaponWeight : 1;

  return clamp((levelFit * 0.42 + statScore * 0.3 + slotValue * 0.28) * slotWeight - pricePenalty - beginnerPenalty, 0, 200);
}

function getSlotLevelCap(slot, level, policy) {
  if (slot === 'weapon') return level + policy.weaponLead;
  if (slot === 'cape' || slot === 'earrings') return level + policy.accessoryLead;
  return level + policy.armorLead;
}

function getLowLevelTolerance(slot, policy) {
  if (slot === 'weapon') return 7;
  if (slot === 'hat' || slot === 'overall' || slot === 'top' || slot === 'bottom' || slot === 'shoes') return 9;
  return 12;
}

function getStatScore(item, classLine) {
  const id = classLine?.id;
  if (id === 'magician') return item.incMAD * 2.4 + item.incINT * 4 + item.incLUK * 1.2 + item.incMP * 0.05 + item.incACC * 0.4;
  if (id === 'warrior') return item.incPAD * 2.5 + item.incSTR * 3.2 + item.incDEX * 1.5 + item.incACC * 2 + item.incHP * 0.05;
  if (id === 'bowman') return item.incPAD * 2.5 + item.incDEX * 3.2 + item.incSTR * 1.3 + item.incACC * 1.6;
  if (id === 'thief') return item.incPAD * 2.6 + item.incLUK * 3.3 + item.incDEX * 1.7 + item.incACC * 1.5;
  if (id === 'pirate') return item.incPAD * 2.5 + item.incDEX * 2.7 + item.incSTR * 1.8 + item.incACC * 1.4;
  return item.incPAD * 2 + item.incMAD * 2 + item.incACC;
}

function getSlotValue(item, classLine) {
  if (item.slot === 'weapon') return Math.max(item.incPAD, item.incMAD) * 2 + item.incACC * 1.2;
  if (item.slot === 'shield') return item.incINT * 3 + item.incSTR * 2 + item.incDEX * 2 + item.incLUK * 2 + item.incHP * 0.04 + 12;
  if (item.slot === 'shoes') return item.incSpeed * 3 + item.incDEX * 2 + item.incLUK * 2 + item.incHP * 0.03 + 10;
  return getStatScore(item, classLine) + 10;
}

function getPricePenalty(item, policy, level) {
  if (!item.price) return 0;
  const expected = Math.max(1500, level * 500);
  return Math.log10(1 + item.price / expected) * 18 * policy.pricePenalty;
}

function shouldUseShield(selected, classLine) {
  const weapon = selected.find((item) => item.slot === 'weapon');
  if (!weapon) return classLine?.id === 'warrior' || classLine?.id === 'magician';
  const type = `${weapon.weaponType ?? ''} ${weapon.title ?? ''}`.toLowerCase();
  if (/2h|two.?hand|spear|polearm|pole arm|bow|crossbow|claw|gun|knuckle|staff/.test(type)) return false;
  return classLine?.id === 'warrior' || classLine?.id === 'magician' || /1h|one.?hand|wand/.test(type);
}

function formatGearCard(item, slot, policy) {
  const statBits = [];
  if (item.incPAD) statBits.push(`攻 ${item.incPAD}`);
  if (item.incMAD) statBits.push(`魔攻 ${item.incMAD}`);
  if (item.incINT) statBits.push(`INT +${item.incINT}`);
  if (item.incSTR) statBits.push(`STR +${item.incSTR}`);
  if (item.incDEX) statBits.push(`DEX +${item.incDEX}`);
  if (item.incLUK) statBits.push(`LUK +${item.incLUK}`);
  if (item.incACC) statBits.push(`命中 +${item.incACC}`);
  if (item.incHP) statBits.push(`HP +${item.incHP}`);

  return {
    ...item,
    label: SLOT_LABELS[slot] ?? slot,
    title: item.title,
    desc: statBits.length ? `${policy.name}推荐：${statBits.slice(0, 4).join(' · ')}` : `${policy.name}推荐：等级合适，过渡成本较低`,
    scoreLabel: `${Math.round(item.gearScore)}分`,
  };
}

function fallbackWeapon(classLine, level) {
  const isMage = classLine?.id === 'magician';
  return {
    slot: 'weapon',
    label: '武器',
    title: isMage ? "Beginner's Wooden Wand" : "Beginner's Weapon",
    desc: '未找到合适官方装备，使用新手武器占位',
    reqLevel: 0,
    weaponType: isMage ? 'Wand' : 'Weapon',
    scoreLabel: 'fallback',
  };
}

function fillDisplaySlots(items, classLine, level) {
  const bySlot = new Map(items.map((item) => [item.slot, item]));
  return SLOT_ORDER.map((slot) => bySlot.get(slot)).filter(Boolean);
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
