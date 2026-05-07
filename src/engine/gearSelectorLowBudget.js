import {
  applyGearOverrides,
  getGearCandidatesBySlot as getBaseGearCandidatesBySlot,
  selectGear as selectBaseGear,
  SLOT_LABELS,
} from './gearSelector.js';

export { applyGearOverrides, SLOT_LABELS };

const LOW_BUDGET_STARTER_CUTOFF = 15;
const EARLY_SLOT_ORDER = ['cap', 'top', 'bottom', 'shoes', 'weapon'];
const EMPTY_SLOTS = ['weapon', 'cap', 'overall', 'top', 'bottom', 'shoes', 'glove', 'shield', 'cape', 'earring'];

const STARTER_NAMES = {
  female: {
    cap: ['Red Headband', 'Black Headband'],
    top: ['White Tubetop', 'Orange Sporty T-Shirt', 'White Undershirt'],
    bottom: ['Red Miniskirt', 'Red Mini Skirt'],
    shoes: ['Red Rubber Boots', 'Yellow Basic Boots', 'Brown Hard Leather Boots'],
  },
  male: {
    cap: ['Black Headband', 'Red Headband'],
    top: ['White Undershirt', 'White Tubetop'],
    bottom: ['Blue Jean Shorts', 'Red Miniskirt', 'Red Mini Skirt'],
    shoes: ['Yellow Basic Boots', 'Brown Hard Leather Boots', 'Red Rubber Boots'],
  },
};

const STARTER_FALLBACKS = {
  female: {
    cap: { id: '1002067', title: 'Red Headband', name: 'Red Headband', reqLevel: 0 },
    top: { id: '1041013', title: 'White Tubetop', name: 'White Tubetop', reqLevel: 0 },
    bottom: { id: '1061013', title: 'Red Miniskirt', name: 'Red Miniskirt', reqLevel: 0 },
    shoes: { id: '1072005', title: 'Red Rubber Boots', name: 'Red Rubber Boots', reqLevel: 0 },
  },
  male: {
    cap: { id: '1002019', title: 'Black Headband', name: 'Black Headband', reqLevel: 0 },
    top: { id: '1040002', title: 'White Undershirt', name: 'White Undershirt', reqLevel: 0 },
    bottom: { id: '1060002', title: 'Blue Jean Shorts', name: 'Blue Jean Shorts', reqLevel: 0 },
    shoes: { id: '1072007', title: 'Yellow Basic Boots', name: 'Yellow Basic Boots', reqLevel: 0 },
  },
};

const WEAPON_NAMES = {
  warrior: ["Beginner's Sword", 'Sword'],
  magician: ["Beginner's Wooden Wand", 'Wooden Wand'],
  bowman: ["Beginner's Bow", 'War Bow'],
  thief: ["Beginner's Claw", 'Garnier'],
  pirate: ["Beginner's Gun", 'Pistol'],
};

const WEAPON_FALLBACKS = {
  warrior: { id: '1302000', title: "Beginner's Sword", name: "Beginner's Sword", reqLevel: 0, weaponType: '1h Sword', weapon_type: '1h Sword', incPAD: 17, desc: '攻击 17 · 需求 无属性需求' },
  magician: { id: '1372005', title: "Beginner's Wooden Wand", name: "Beginner's Wooden Wand", reqLevel: 0, weaponType: 'Wand', weapon_type: 'Wand', incMAD: 15, desc: '魔攻 15 · 需求 无属性需求' },
  bowman: { id: '1452002', title: 'War Bow', name: 'War Bow', reqLevel: 10, weaponType: 'Bow', weapon_type: 'Bow', incPAD: 20, desc: '攻击 20 · 需求 无属性需求' },
  thief: { id: '1472000', title: 'Garnier', name: 'Garnier', reqLevel: 10, weaponType: 'Claw', weapon_type: 'Claw', incPAD: 12, desc: '攻击 12 · 需求 无属性需求' },
  pirate: { id: '1492000', title: 'Pistol', name: 'Pistol', reqLevel: 10, weaponType: 'Gun', weapon_type: 'Gun', incPAD: 12, desc: '攻击 12 · 需求 无属性需求' },
};

function shouldForceStarter({ budget, level, manualMode }) {
  return budget === 'low' && !manualMode && Number(level || 1) <= LOW_BUDGET_STARTER_CUTOFF;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesName(item, names) {
  const text = normalizeText(`${item?.title || ''} ${item?.name || ''}`);
  return names.some((name) => {
    const key = normalizeText(name);
    return text === key || text.includes(key);
  });
}

function withDefaults(item, slot, classLine) {
  const label = SLOT_LABELS[slot] ?? '装备';
  const title = item?.title || item?.name || label;
  const isMage = classLine?.id === 'magician';
  const attackText = isMage
    ? `魔攻 ${item?.incMAD || item?.stats?.incMAD || 0}${item?.incPAD ? ` / 攻击 ${item.incPAD}` : ''}`
    : `攻击 ${item?.incPAD || item?.stats?.incPAD || 0}${item?.incMAD ? ` / 魔攻 ${item.incMAD}` : ''}`;
  return {
    category: 'Equipment',
    reqJobLabel: item?.reqJobLabel || item?.req_job_label || 'All',
    reqJob: item?.reqJob || item?.req_job || 0,
    price: item?.price || 0,
    stats: item?.stats || {},
    visualGender: item?.visualGender || 'unisex',
    scoreLabel: item?.scoreLabel || '新手/基础装备',
    desc: item?.desc || `${attackText} · 需求 无属性需求`,
    label,
    ...item,
    slot,
    title,
    name: item?.name || title,
    reqLevel: Number(item?.reqLevel ?? item?.req_level ?? 0),
    weaponType: item?.weaponType || item?.weapon_type,
    attackSpeed: item?.attackSpeed || item?.attack_speed_label,
  };
}

function pickFromPool(pool, names, fallback, slot, classLine) {
  const exact = (pool || []).find((item) => matchesName(item, names));
  const starter = (pool || []).find((item) => Number(item?.reqLevel ?? 999) <= 0);
  const picked = exact || starter || fallback;
  return picked ? [withDefaults(picked, slot, classLine)] : [];
}

function buildForcedStarterMap(args) {
  const baseMap = getBaseGearCandidatesBySlot({ ...args, manualMode: true });
  const classId = args.classLine?.id || 'warrior';
  const gender = args.gender === 'male' ? 'male' : 'female';
  const outfitNames = STARTER_NAMES[gender] || STARTER_NAMES.female;
  const outfitFallback = STARTER_FALLBACKS[gender] || STARTER_FALLBACKS.female;
  const output = Object.fromEntries(EMPTY_SLOTS.map((slot) => [slot, []]));

  for (const slot of ['cap', 'top', 'bottom', 'shoes']) {
    output[slot] = pickFromPool(baseMap[slot], outfitNames[slot] || [], outfitFallback[slot], slot, args.classLine);
  }

  output.weapon = pickFromPool(
    baseMap.weapon,
    WEAPON_NAMES[classId] || WEAPON_NAMES.warrior,
    WEAPON_FALLBACKS[classId] || WEAPON_FALLBACKS.warrior,
    'weapon',
    args.classLine,
  );

  return output;
}

export function getGearCandidatesBySlot(args) {
  if (shouldForceStarter(args)) return buildForcedStarterMap(args);
  return getBaseGearCandidatesBySlot(args);
}

export function selectGear(args) {
  if (!shouldForceStarter({ ...args, manualMode: false })) return selectBaseGear(args);
  const bySlot = getGearCandidatesBySlot({ ...args, manualMode: false });
  return EARLY_SLOT_ORDER.flatMap((slot) => bySlot[slot]?.[0] ? [bySlot[slot][0]] : []);
}
