import { useEffect, useMemo, useState } from 'react';
import '../styles/materials-advanced.css';

const BASE_URL = import.meta.env?.BASE_URL || '/';
const appPath = (path) => `${BASE_URL}${String(path).replace(/^\/+/, '')}`;
const iconPath = (id) => appPath(`AppData/images/items/${String(id).padStart(8, '0')}.png`);
const monsterImagePath = (path) => path ? appPath(`AppData/${path}`) : '';

const PROFESSION_ID_BY_NAME = {
  Smithing: 'smithing',
  Weaponcrafting: 'weaponcrafting',
  Tailoring: 'tailoring',
  Woodcrafting: 'woodcrafting',
  Leatherworking: 'leatherworking',
  Arcforge: 'arcforge',
};

const PROFESSIONS = [
  { id: 'smithing', zh: '锻造', en: 'Smithing', icon: 'smithing_icon.png', note: '金属板材、矿石精炼和重装材料。' },
  { id: 'weaponcrafting', zh: '武器制作', en: 'Weaponcrafting', icon: 'weapon_crafting_icon.png', note: '武器底材、攻击路线和高价值装备。' },
  { id: 'tailoring', zh: '裁缝', en: 'Tailoring', icon: 'tailoring_icon.png', note: '布料、法师装备和轻甲路线。' },
  { id: 'woodcrafting', zh: '木工', en: 'Woodcrafting', icon: 'woodcrafting_icon.png', note: '木料、弓弩、法杖和把手材料。' },
  { id: 'leatherworking', zh: '皮革', en: 'Leatherworking', icon: 'leatherworking_icon.png', note: '皮革、手套、飞侠/弓手相关材料。' },
  { id: 'arcforge', zh: '融合机体', en: 'Arcforge', icon: 'arcforge_icon.png', note: '魔法催化、结晶和后期高价值节点。' },
];

const MODES = [
  { id: 'cheapest', zh: '最低成本', desc: '优先金币/材料成本最低' },
  { id: 'farm', zh: '刷怪友好', desc: '优先自刷材料，少买 NPC 材料' },
  { id: 'balanced', zh: '均衡路线', desc: '成本、经验和瓶颈材料折中' },
  { id: 'fastest', zh: '最快升级', desc: '优先单位制作经验' },
];

const MASTERY = [
  { level: 1, exp: 50 },
  { level: 2, exp: 115 },
  { level: 3, exp: 200 },
  { level: 4, exp: 308 },
  { level: 5, exp: 450 },
  { level: 6, exp: 635 },
  { level: 7, exp: 882 },
  { level: 8, exp: 1190 },
  { level: 9, exp: 1587 },
];

const TRANSLATIONS = {
  'Bronze Ore': '青铜矿石',
  'Iron Ore': '铁矿石',
  'Steel Ore': '钢铁矿石',
  'Mithril Ore': '秘银矿石',
  'Adamantium Ore': '金刚矿石',
  'Silver Ore': '银矿石',
  'Orihalcon Ore': '奥利哈钢矿石',
  'Gold Ore': '黄金矿石',
  'Bronze Ingot': '青铜锭',
  'Iron Ingot': '铁锭',
  'Steel Ingot': '钢铁锭',
  'Mithril Ingot': '秘银锭',
  'Adamantium Ingot': '金刚锭',
  'Silver Ingot': '银锭',
  'Orihalcon Ingot': '奥利哈钢锭',
  'Gold Ingot': '黄金锭',
  'Garnet': '石榴石',
  'Amethyst': '紫水晶',
  'Aquamarine': '海蓝石',
  'Emerald': '祖母绿',
  'Opal': '蛋白石',
  'Sapphire': '蓝宝石',
  'Topaz': '黄晶',
  'Diamond': '钻石',
  'Black Crystal': '黑水晶',
  'Garnet Ore': '石榴石母矿',
  'Amethyst Ore': '紫水晶母矿',
  'Aquamarine Ore': '海蓝石母矿',
  'Emerald Ore': '祖母绿母矿',
  'Opal Ore': '蛋白石母矿',
  'Sapphire Ore': '蓝宝石母矿',
  'Topaz Ore': '黄晶母矿',
  'Diamond Ore': '钻石母矿',
  'Black Crystal Ore': '黑水晶母矿',
  'Screw': '螺丝钉',
  'Processed Wood': '加工木材',
  'Firewood': '木柴',
  'Tree Branch': '树枝',
  'Branch': '树枝',
  'Stiff Feather': '硬羽毛',
  'Leather': '皮革',
  'Processed Leather': '加工皮革',
  'Animal Skin': '动物皮',
  'Spool of Thread': '线轴',
  'Silk Thread': '丝线',
  'Linen Cloth': '亚麻布',
  'Enchanted Thread': '魔化丝线',
  'Parchment': '羊皮纸',
  'Processed Parchment': '加工羊皮纸',
  'Catalyst': '催化剂',
  'Magic Powder': '魔法粉末',
  'Crystal Shard': '水晶碎片',
  'Monster Crystal': '怪物结晶',
  'Snail Shell': '蜗牛壳',
  'Blue Snail Shell': '蓝蜗牛壳',
  'Red Snail Shell': '红蜗牛壳',
  'Orange Mushroom Cap': '橙蘑菇盖',
  'Green Mushroom Cap': '绿蘑菇盖',
  'Blue Mushroom Cap': '蓝蘑菇盖',
  'Jr. Necki Skin': '小青蛇皮',
  'Curse Eye Tail': '诅咒眼尾巴',
  'Drake Skull': '幼龙头骨',
  'Clang Claw': '机械章鱼爪',
  'Stirge Wing': '蝙蝠翅膀',
};

const ICON_IDS = {
  'Bronze Ore': '4010000',
  'Iron Ore': '4010001',
  'Steel Ore': '4010001',
  'Mithril Ore': '4010002',
  'Adamantium Ore': '4010003',
  'Silver Ore': '4010004',
  'Orihalcon Ore': '4010005',
  'Gold Ore': '4010006',
  'Bronze Ingot': '4011000',
  'Iron Ingot': '4011001',
  'Steel Ingot': '4011001',
  'Mithril Ingot': '4011002',
  'Adamantium Ingot': '4011003',
  'Silver Ingot': '4011004',
  'Orihalcon Ingot': '4011005',
  'Gold Ingot': '4011006',
  'Garnet': '4021000',
  'Amethyst': '4021001',
  'Aquamarine': '4021002',
  'Emerald': '4021003',
  'Opal': '4021004',
  'Sapphire': '4021005',
  'Topaz': '4021006',
  'Diamond': '4021007',
  'Black Crystal': '4021008',
  'Garnet Ore': '4020000',
  'Amethyst Ore': '4020001',
  'Aquamarine Ore': '4020002',
  'Emerald Ore': '4020003',
  'Opal Ore': '4020004',
  'Sapphire Ore': '4020005',
  'Topaz Ore': '4020006',
  'Diamond Ore': '4020007',
  'Black Crystal Ore': '4020008',
  'Screw': '4003000',
  'Processed Wood': '4003001',
  'Firewood': '4003004',
  'Stiff Feather': '4003005',
  'Leather': '4000021',
  'Animal Skin': '4000021',
  'Snail Shell': '4000000',
  'Blue Snail Shell': '4000001',
  'Red Snail Shell': '4000002',
  'Orange Mushroom Cap': '4000009',
  'Green Mushroom Cap': '4000013',
  'Blue Mushroom Cap': '4000016',
  'Jr. Necki Skin': '4000018',
  'Curse Eye Tail': '4000027',
  'Drake Skull': '4000030',
  'Clang Claw': '4000040',
  'Stirge Wing': '4000052',
};

const DROP_GUIDES = [
  { material: 'Processed Wood', monsters: ['Stump', 'Dark Stump', 'Axe Stump'], source: '制作/采集', note: '优先刷树妖系材料，再转成加工木材。' },
  { material: 'Firewood', monsters: ['Stump', 'Dark Stump', 'Axe Stump'], source: '怪物掉落', note: '木工路线常见前置材料。' },
  { material: 'Tree Branch', monsters: ['Stump', 'Dark Stump', 'Axe Stump'], source: '怪物掉落', note: '木工低级路线核心材料。' },
  { material: 'Branch', monsters: ['Stump', 'Dark Stump', 'Axe Stump'], source: '怪物掉落', note: '木工低级路线核心材料。' },
  { material: 'Leather', monsters: ['Pig', 'Ribbon Pig', 'Wild Boar'], source: '怪物掉落/加工', note: '皮革系与武器握把常用。' },
  { material: 'Animal Skin', monsters: ['Pig', 'Ribbon Pig', 'Wild Boar'], source: '怪物掉落', note: '皮革路线原材料。' },
  { material: 'Stiff Feather', monsters: ['Jr. Sentinel', 'Sentinel'], source: '怪物掉落', note: '弓身、箭矢和部分轻甲材料。' },
  { material: 'Snail Shell', monsters: ['Snail'], source: '怪物掉落', note: '新手岛与低级图密度高。' },
  { material: 'Blue Snail Shell', monsters: ['Blue Snail'], source: '怪物掉落', note: '低级地图密度高，适合顺手囤。' },
  { material: 'Red Snail Shell', monsters: ['Red Snail'], source: '怪物掉落', note: '低级地图密度高，适合顺手囤。' },
  { material: 'Orange Mushroom Cap', monsters: ['Orange Mushroom'], source: '怪物掉落', note: '蘑菇系材料，适合早期顺手刷。' },
  { material: 'Green Mushroom Cap', monsters: ['Green Mushroom'], source: '怪物掉落', note: '蘑菇系材料，覆盖部分低级配方。' },
  { material: 'Blue Mushroom Cap', monsters: ['Blue Mushroom'], source: '怪物掉落', note: '蘑菇系材料，覆盖部分低级配方。' },
  { material: 'Jr. Necki Skin', monsters: ['Jr. Necki'], source: '怪物掉落', note: '蛇皮类材料，通常需要专门刷。' },
  { material: 'Curse Eye Tail', monsters: ['Curse Eye'], source: '怪物掉落', note: '地下城路线材料。' },
  { material: 'Drake Skull', monsters: ['Drake', 'Copper Drake', 'Dark Drake'], source: '怪物掉落', note: '中后期地图材料。' },
  { material: 'Clang Claw', monsters: ['Clang'], source: '怪物掉落', note: '岛屿怪物材料，建议按需刷。' },
  { material: 'Stirge Wing', monsters: ['Stirge'], source: '怪物掉落', note: '低中级材料，适合按配方需求补。' },
  { material: 'Coal', monsters: [], source: 'NPC/市场', note: '这类材料优先商店/市场处理，不建议占用刷怪时间。' },
  { material: 'Catalyst', monsters: [], source: 'NPC/市场', note: 'NPC/市场材料，规划时单独算金币压力。' },
];

const FALLBACK_RECIPES = [
  ['smithing', 'Iron Plate', 'Material', 1, 20, 30, [['Iron Ore', 2], ['Coal', 1]]],
  ['smithing', 'Bronze Plate', 'Material', 2, 28, 35, [['Bronze Ore', 3], ['Coal', 1]]],
  ['smithing', 'Steel Plate', 'Material', 4, 50, 70, [['Steel Ore', 3], ['Coal', 2], ['Screw', 1]]],
  ['smithing', 'Mithril Plate', 'Material', 6, 82, 120, [['Mithril Ore', 3], ['Coal', 2], ['Screw', 1]]],
  ['weaponcrafting', 'Training Sword', 'Equipment', 1, 22, 25, [['Iron Ore', 2], ['Processed Wood', 1]]],
  ['weaponcrafting', 'Bronze Spear', 'Equipment', 2, 32, 45, [['Bronze Ore', 3], ['Processed Wood', 2]]],
  ['weaponcrafting', 'Steel Blade', 'Equipment', 4, 58, 80, [['Steel Ore', 4], ['Screw', 1], ['Leather', 1]]],
  ['tailoring', 'Linen Patch', 'Material', 1, 18, 20, [['Linen Cloth', 3]]],
  ['tailoring', 'Silk Wrap', 'Material', 3, 38, 50, [['Silk Thread', 3], ['Linen Cloth', 2]]],
  ['tailoring', 'Enchanted Lining', 'Material', 5, 70, 95, [['Enchanted Thread', 2], ['Magic Powder', 1]]],
  ['woodcrafting', 'Wooden Handle', 'Material', 1, 19, 15, [['Branch', 4]]],
  ['woodcrafting', 'Processed Wood', 'Material', 2, 30, 30, [['Firewood', 4], ['Branch', 2]]],
  ['woodcrafting', 'Bow Frame', 'Equipment', 4, 55, 65, [['Processed Wood', 3], ['Stiff Feather', 2], ['Screw', 1]]],
  ['woodcrafting', 'Staff Core', 'Equipment', 6, 88, 130, [['Processed Wood', 4], ['Magic Powder', 2], ['Crystal Shard', 1]]],
  ['leatherworking', 'Animal Fur Bundle', 'Material', 1, 18, 20, [['Animal Skin', 3]]],
  ['leatherworking', 'Processed Leather', 'Material', 3, 36, 45, [['Animal Skin', 5], ['Stiff Feather', 1]]],
  ['leatherworking', 'Leather Guard', 'Equipment', 5, 72, 100, [['Leather', 3], ['Screw', 1]]],
  ['arcforge', 'Minor Catalyst', 'Material', 1, 24, 90, [['Magic Powder', 1], ['Coal', 1]]],
  ['arcforge', 'Processed Parchment', 'Material', 2, 32, 80, [['Parchment', 1], ['Magic Powder', 1]]],
  ['arcforge', 'Crystal Focus', 'Material', 3, 48, 130, [['Crystal Shard', 1], ['Magic Powder', 1], ['Catalyst', 1]]],
  ['arcforge', 'Monster Crystal Refine', 'Material', 5, 76, 180, [['Monster Crystal', 1], ['Catalyst', 1], ['Magic Powder', 2]]],
].map(([profession, output, outputType, level, exp, meso, materials], index) => ({
  id: `fallback-${index}`,
  profession,
  output,
  outputZh: translate(output),
  outputType,
  level,
  exp,
  meso,
  materials: materials.map(([name, qty]) => ({ name, zh: translate(name), qty })),
}));

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function translate(name) {
  if (!name) return '';
  if (TRANSLATIONS[name]) return TRANSLATIONS[name];
  const clean = String(name).replace(/\s+/g, ' ').trim();
  if (TRANSLATIONS[clean]) return TRANSLATIONS[clean];
  return clean;
}

function professionMeta(id) {
  return PROFESSIONS.find((profession) => profession.id === id) || PROFESSIONS[0];
}

function sourceForMaterial(name) {
  const guide = DROP_GUIDES.find((row) => normalizeText(row.material) === normalizeText(name));
  if (guide) return guide.source;
  const lower = normalizeText(name);
  if (lower.includes('catalyst') || lower.includes('coal')) return 'NPC/市场';
  if (lower.includes('processed') || lower.includes('ingot') || lower.includes('plate')) return '制作中间件';
  return '掉落/采集待补充';
}

function materialBaseValue(name) {
  const lower = normalizeText(name);
  if (lower.includes('dark crystal') || lower.includes('monster crystal')) return 1500;
  if (lower.includes('crystal') || lower.includes('magic powder')) return 700;
  if (lower.includes('mithril') || lower.includes('adamantium')) return 480;
  if (lower.includes('steel') || lower.includes('screw') || lower.includes('leather')) return 260;
  if (lower.includes('wood') || lower.includes('branch') || lower.includes('feather')) return 110;
  if (lower.includes('coal')) return 80;
  return 160;
}

function estimateMaterialCost(name, mode) {
  const source = sourceForMaterial(name);
  const factor = {
    cheapest: source.includes('NPC') ? 1 : source.includes('中间件') ? 1.05 : .9,
    farm: source.includes('NPC') ? 4 : source.includes('中间件') ? .8 : .45,
    balanced: source.includes('NPC') ? 1.4 : source.includes('中间件') ? 1 : .75,
    fastest: source.includes('NPC') ? .9 : source.includes('中间件') ? 1.05 : 1.15,
  }[mode] || 1;
  return materialBaseValue(name) * factor;
}

function recipeCost(recipe, mode) {
  const materialCost = recipe.materials.reduce((sum, material) => sum + estimateMaterialCost(material.name, mode) * material.qty, 0);
  return Math.max(1, recipe.meso + materialCost);
}

function recipeRank(recipe, mode, bottleneckByName) {
  const cost = recipeCost(recipe, mode);
  const bottleneckPenalty = recipe.materials.reduce((sum, material) => sum + (bottleneckByName.get(normalizeText(material.name))?.score || 0) * material.qty, 0);
  if (mode === 'fastest') return recipe.exp * 1000 - cost * .1;
  if (mode === 'farm') return recipe.exp / Math.max(1, cost) - recipe.materials.filter((material) => sourceForMaterial(material.name).includes('NPC')).length * .04;
  if (mode === 'balanced') return recipe.exp / Math.max(1, cost + bottleneckPenalty * 3);
  return recipe.exp / Math.max(1, cost);
}

function simulateLeveling(recipes, professionId, mode, targetLevel, bottleneckByName, noBuy = false) {
  const steps = [];
  const totalMaterials = new Map();
  let totalCost = 0;
  let totalCrafts = 0;

  for (let level = 1; level < targetLevel; level += 1) {
    const need = MASTERY.find((row) => row.level === level)?.exp || 1000;
    const pool = recipes.filter((recipe) => {
      if (recipe.profession !== professionId || recipe.level > level || recipe.exp <= 0) return false;
      if (noBuy && recipe.materials.some((material) => sourceForMaterial(material.name).includes('NPC'))) return false;
      return true;
    });
    if (!pool.length) break;
    const best = [...pool].sort((a, b) => recipeRank(b, mode, bottleneckByName) - recipeRank(a, mode, bottleneckByName))[0];
    const crafts = Math.max(1, Math.ceil(need / Math.max(1, best.exp)));
    best.materials.forEach((material) => {
      const key = normalizeText(material.name);
      const existing = totalMaterials.get(key) || { name: material.name, zh: material.zh, qty: 0 };
      totalMaterials.set(key, { ...existing, qty: existing.qty + material.qty * crafts });
    });
    totalCrafts += crafts;
    totalCost += crafts * recipeCost(best, mode);
    steps.push({ level, to: level + 1, need, recipe: best, crafts, cost: recipeCost(best, mode) * crafts });
  }

  return { steps, totalMaterials: [...totalMaterials.values()].sort((a, b) => b.qty - a.qty), totalCost, totalCrafts };
}

function buildBottlenecks(recipes) {
  const rows = new Map();
  recipes.forEach((recipe) => {
    recipe.materials.forEach((material) => {
      const key = normalizeText(material.name);
      const row = rows.get(key) || {
        name: material.name,
        zh: material.zh,
        qty: 0,
        recipes: new Set(),
        professions: new Set(),
        highLevelUse: 0,
      };
      row.qty += material.qty;
      row.recipes.add(recipe.id);
      row.professions.add(recipe.profession);
      row.highLevelUse += material.qty * recipe.level;
      rows.set(key, row);
    });
  });

  const scored = [...rows.values()].map((row) => ({
    ...row,
    recipeCount: row.recipes.size,
    professionCount: row.professions.size,
    score: row.qty * 4 + row.recipes.size * 14 + row.professions.size * 20 + row.highLevelUse + materialBaseValue(row.name) / 40,
  })).sort((a, b) => b.score - a.score || b.qty - a.qty);

  const maxScore = Math.max(1, ...scored.map((row) => row.score));
  return scored.map((row) => ({ ...row, score: Math.round((row.score / maxScore) * 100) }));
}

function buildMatrixRows(recipes) {
  return buildBottlenecks(recipes).map((row) => {
    const byProfession = Object.fromEntries(PROFESSIONS.map((profession) => [profession.id, 0]));
    recipes.forEach((recipe) => {
      recipe.materials.forEach((material) => {
        if (normalizeText(material.name) === normalizeText(row.name)) byProfession[recipe.profession] += material.qty;
      });
    });
    return { ...row, byProfession };
  });
}

function normalizeCrafting(raw) {
  const disciplines = raw?.disciplines || [];
  const recipes = [];
  disciplines.forEach((discipline) => {
    const professionId = PROFESSION_ID_BY_NAME[discipline.discipline] || normalizeText(discipline.discipline).replace(/[^a-z0-9]+/g, '');
    (discipline.output_types || []).forEach((outputType) => {
      (outputType.levels || []).forEach((levelGroup) => {
        (levelGroup.recipes || []).forEach((recipe, index) => {
          const output = recipe.result_item_name || `Recipe ${recipe.output_id || index}`;
          recipes.push({
            id: String(recipe.id || `${professionId}-${recipe.output_id || index}`),
            profession: professionId,
            output,
            outputZh: translate(output),
            outputType: outputType.output_type || 'Other',
            level: Number(recipe.req_level || levelGroup.level || 1),
            exp: Number(recipe.craft_exp || 0),
            meso: Number(recipe.meso_cost || 0),
            materials: (recipe.ingredients || []).map((ingredient) => ({
              name: ingredient.item_name,
              zh: translate(ingredient.item_name),
              qty: Number(ingredient.count || 1),
            })),
          });
        });
      });
    });
  });
  return recipes.length ? recipes : FALLBACK_RECIPES;
}

function normalizeMonsters(raw) {
  return (raw?.monsters || []).map((monster) => ({
    id: String(monster.id),
    name: monster.name || `Monster ${monster.id}`,
    level: Number(monster.level || 1),
    image: monsterImagePath(monster.thumbnail || monster.gif),
    maps: (monster.maps || []).map((map) => ({
      id: String(map.id),
      name: map.name || `Map ${map.id}`,
      count: Number(map.count || 0),
      mobTime: Number(map.mob_time || 0),
    })).sort((a, b) => b.count - a.count),
  }));
}

function buildDropRoutes(materialName, monsters) {
  const guide = DROP_GUIDES.find((row) => normalizeText(row.material) === normalizeText(materialName));
  if (!guide) return { guide: null, monsters: [] };
  const found = [];
  guide.monsters.forEach((alias) => {
    const exact = monsters.filter((monster) => normalizeText(monster.name) === normalizeText(alias));
    const fuzzy = exact.length ? exact : monsters.filter((monster) => normalizeText(monster.name).includes(normalizeText(alias)));
    fuzzy.slice(0, 4).forEach((monster) => {
      if (!found.some((row) => row.id === monster.id)) found.push(monster);
    });
  });
  return { guide, monsters: found.slice(0, 6) };
}

function resolveIconId(name) {
  const exact = Object.entries(ICON_IDS).find(([key]) => normalizeText(key) === normalizeText(name));
  return exact?.[1] || null;
}

function fmt(value) {
  return Number(value || 0).toLocaleString();
}

function ItemIcon({ name, size = 28 }) {
  const [failed, setFailed] = useState(false);
  const id = resolveIconId(name);
  const translated = translate(name);
  return <span className="craft-icon" style={{ width: size, height: size }}>
    {id && !failed ? <img src={iconPath(id)} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span>{translated.slice(0, 1)}</span>}
  </span>;
}

function ProfessionIcon({ profession, size = 30 }) {
  const meta = professionMeta(profession);
  const [failed, setFailed] = useState(false);
  return <span className="craft-icon profession" style={{ width: size, height: size }}>
    {!failed ? <img src={appPath(`icons/crafting/${meta.icon}`)} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span>{meta.zh.slice(0, 1)}</span>}
  </span>;
}

function fallbackState() {
  return {
    recipes: FALLBACK_RECIPES,
    monsters: [],
    source: 'fallback',
    error: '',
  };
}

export default function CraftingMaterialsPageEnhanced() {
  const [data, setData] = useState(fallbackState);
  const [professionId, setProfessionId] = useState('woodcrafting');
  const [mode, setMode] = useState('farm');
  const [targetLevel, setTargetLevel] = useState(10);
  const [recipeScope, setRecipeScope] = useState('all');
  const [recipeType, setRecipeType] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('Processed Wood');

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(appPath('AppData/crafting.json')).then((response) => response.ok ? response.json() : Promise.reject(new Error(`crafting ${response.status}`))),
      fetch(appPath('AppData/monsters.json')).then((response) => response.ok ? response.json() : Promise.reject(new Error(`monsters ${response.status}`))),
    ])
      .then(([crafting, monsters]) => {
        if (!alive) return;
        setData({ recipes: normalizeCrafting(crafting), monsters: normalizeMonsters(monsters), source: 'official', error: '' });
      })
      .catch((error) => {
        if (!alive) return;
        setData({ ...fallbackState(), error: error.message || 'AppData 读取失败，正在使用内置示例。' });
      });
    return () => {
      alive = false;
    };
  }, []);

  const bottlenecks = useMemo(() => buildBottlenecks(data.recipes), [data.recipes]);
  const bottleneckByName = useMemo(() => new Map(bottlenecks.map((row) => [normalizeText(row.name), row])), [bottlenecks]);
  const matrixRows = useMemo(() => buildMatrixRows(data.recipes), [data.recipes]);
  const route = useMemo(() => simulateLeveling(data.recipes, professionId, mode, targetLevel, bottleneckByName), [data.recipes, professionId, mode, targetLevel, bottleneckByName]);
  const woodZeroRoute = useMemo(() => {
    const noBuy = simulateLeveling(data.recipes, 'woodcrafting', 'farm', 10, bottleneckByName, true);
    return noBuy.steps.length ? noBuy : simulateLeveling(data.recipes, 'woodcrafting', 'farm', 10, bottleneckByName);
  }, [data.recipes, bottleneckByName]);

  const materialOptions = useMemo(() => {
    const map = new Map();
    [...route.totalMaterials, ...bottlenecks.slice(0, 18)].forEach((row) => {
      const key = normalizeText(row.name);
      if (!map.has(key)) map.set(key, row);
    });
    DROP_GUIDES.forEach((row) => {
      const key = normalizeText(row.material);
      if (!map.has(key)) map.set(key, { name: row.material, zh: translate(row.material), qty: 0 });
    });
    return [...map.values()];
  }, [route.totalMaterials, bottlenecks]);

  const activeMaterial = materialOptions.some((row) => normalizeText(row.name) === normalizeText(selectedMaterial))
    ? selectedMaterial
    : materialOptions[0]?.name || 'Processed Wood';
  const dropRoutes = useMemo(() => buildDropRoutes(activeMaterial, data.monsters), [activeMaterial, data.monsters]);

  const filteredRecipes = useMemo(() => {
    const text = normalizeText(query);
    return data.recipes.filter((recipe) => {
      if (recipeScope !== 'all' && recipe.profession !== recipeScope) return false;
      if (recipeType !== 'all' && normalizeText(recipe.outputType) !== normalizeText(recipeType)) return false;
      if (!text) return true;
      const haystack = normalizeText([recipe.output, recipe.outputZh, professionMeta(recipe.profession).zh, professionMeta(recipe.profession).en, ...recipe.materials.flatMap((material) => [material.name, material.zh])].join(' '));
      return haystack.includes(text);
    }).sort((a, b) => a.level - b.level || a.output.localeCompare(b.output));
  }, [data.recipes, recipeScope, recipeType, query]);

  const selectedProfession = professionMeta(professionId);
  const mainBottleneck = route.totalMaterials[0] || bottlenecks[0];

  return <section className="craft-guide">
    <header className="craft-hero">
      <div>
        <span className="craft-eyebrow">MCW Crafting · Guidebook</span>
        <h1>材料与锻造路线</h1>
        <p>页面已合并成一个规划器：先看推荐路线，再看缺什么、去哪刷，最后用配方库查细节。</p>
      </div>
      <div className="craft-source-badge">{data.source === 'official' ? `已读取 AppData · ${data.recipes.length} 配方` : '内置示例数据'}</div>
    </header>

    <nav className="craft-subnav" aria-label="crafting sections">
      <a href="#craft-plan">路线</a>
      <a href="#craft-farm">掉落地图</a>
      <a href="#craft-matrix">材料矩阵</a>
      <a href="#craft-recipes">配方库</a>
    </nav>

    <section className="craft-control-card">
      <label><span>专业</span><select value={professionId} onChange={(event) => setProfessionId(event.target.value)}>{PROFESSIONS.map((profession) => <option key={profession.id} value={profession.id}>{profession.zh} · {profession.en}</option>)}</select></label>
      <label><span>路线</span><select value={mode} onChange={(event) => setMode(event.target.value)}>{MODES.map((row) => <option key={row.id} value={row.id}>{row.zh}</option>)}</select></label>
      <label><span>目标</span><select value={targetLevel} onChange={(event) => setTargetLevel(Number(event.target.value))}>{[3, 4, 5, 6, 7, 8, 9, 10].map((level) => <option key={level} value={level}>Lv.{level}</option>)}</select></label>
    </section>

    <section id="craft-plan" className="craft-main-grid">
      <article className="craft-panel craft-summary-panel">
        <div className="craft-panel-title"><h2><ProfessionIcon profession={professionId} />{selectedProfession.zh}升级策略</h2><span>{selectedProfession.en}</span></div>
        <p className="craft-muted">{selectedProfession.note}</p>
        <div className="craft-kpis">
          <div><span>制作次数</span><strong>{fmt(route.totalCrafts)}</strong></div>
          <div><span>估算成本</span><strong>{fmt(route.totalCost)} meso</strong></div>
          <div><span>最大瓶颈</span><strong>{mainBottleneck?.zh || '-'}</strong></div>
        </div>
        <p className="craft-note">{MODES.find((row) => row.id === mode)?.desc}。如果你只想看最少操作，可以按这个面板从上往下做。</p>
      </article>

      <article className="craft-panel">
        <div className="craft-panel-title"><h2>推荐路线</h2><span>Lv.1 → Lv.{targetLevel}</span></div>
        <div className="craft-route-list">
          {route.steps.map((step) => <button key={`${step.level}-${step.recipe.id}`} className="craft-route-row" onClick={() => setSelectedMaterial(step.recipe.materials[0]?.name || activeMaterial)}>
            <strong>Lv.{step.level}→{step.to}</strong>
            <span>{step.recipe.outputZh || step.recipe.output}</span>
            <em>x{step.crafts}</em>
          </button>)}
        </div>
      </article>

      <article className="craft-panel">
        <div className="craft-panel-title"><h2>当前材料清单</h2><span>点击查掉落</span></div>
        <div className="craft-chip-list">
          {route.totalMaterials.map((material) => <button key={material.name} className={normalizeText(activeMaterial) === normalizeText(material.name) ? 'craft-chip active' : 'craft-chip'} onClick={() => setSelectedMaterial(material.name)}>
            <ItemIcon name={material.name} size={22} />{material.zh || translate(material.name)} x{material.qty}
          </button>)}
          {!route.totalMaterials.length && <p className="craft-empty">当前专业没有可用路线。</p>}
        </div>
      </article>
    </section>

    <section id="craft-farm" className="craft-panel craft-farm-panel">
      <div className="craft-panel-title">
        <h2>怪物掉落与采集地图</h2>
        <select value={activeMaterial} onChange={(event) => setSelectedMaterial(event.target.value)}>
          {materialOptions.map((material) => <option key={material.name} value={material.name}>{material.zh || translate(material.name)}</option>)}
        </select>
      </div>
      <div className="craft-farm-layout">
        <div className="craft-material-focus">
          <ItemIcon name={activeMaterial} size={42} />
          <div>
            <strong>{translate(activeMaterial)}</strong>
            <span>{activeMaterial}</span>
            <p>{dropRoutes.guide?.note || '这个材料还没有确认掉落映射，先按配方需求、市场或后续数据补充处理。'}</p>
          </div>
        </div>

        <div className="craft-drop-cards">
          {dropRoutes.monsters.map((monster) => <article key={monster.id} className="craft-drop-card">
            {monster.image && <img src={monster.image} alt="" loading="lazy" />}
            <div>
              <strong>{monster.name}</strong>
              <span>Lv.{monster.level}</span>
              <div className="craft-map-lines">
                {monster.maps.slice(0, 3).map((map) => <em key={`${monster.id}-${map.id}`}>{map.name} · {map.count}只</em>)}
              </div>
            </div>
          </article>)}
          {!dropRoutes.monsters.length && <article className="craft-drop-card empty"><strong>{dropRoutes.guide?.source || '待补充'}</strong><span>{dropRoutes.guide?.note || '没有匹配到 AppData 怪物；之后可以继续补这个材料的怪物掉落表。'}</span></article>}
        </div>
      </div>
    </section>

    <section id="craft-matrix" className="craft-two-col">
      <article className="craft-panel">
        <div className="craft-panel-title"><h2>跨专业材料矩阵</h2><span>只显示最关键 10 个</span></div>
        <div className="craft-matrix-list">
          {matrixRows.slice(0, 10).map((row) => <div key={row.name} className="craft-matrix-row">
            <div className="craft-matrix-name"><ItemIcon name={row.name} size={24} /><strong>{row.zh}</strong><span>{row.professionCount}系 / {row.recipeCount}配方</span></div>
            <div className="craft-prof-pills">{PROFESSIONS.filter((profession) => row.byProfession[profession.id] > 0).slice(0, 4).map((profession) => <em key={profession.id}>{profession.zh} {row.byProfession[profession.id]}</em>)}</div>
          </div>)}
        </div>
      </article>

      <article className="craft-panel">
        <div className="craft-panel-title"><h2>材料瓶颈排行</h2><span>需求 / 覆盖 / 稀有度</span></div>
        <div className="craft-bottleneck-list">
          {bottlenecks.slice(0, 10).map((row, index) => <button key={row.name} className="craft-bottleneck-row" onClick={() => setSelectedMaterial(row.name)}>
            <strong>#{index + 1}</strong>
            <ItemIcon name={row.name} size={24} />
            <span>{row.zh}<small>{sourceForMaterial(row.name)} · 总需求 {row.qty}</small></span>
            <em>{row.score}</em>
          </button>)}
        </div>
      </article>
    </section>

    <section className="craft-panel craft-zero-panel">
      <div className="craft-panel-title"><h2>木工零金币升级规划</h2><span>自刷材料优先</span></div>
      <div className="craft-zero-grid">
        <div className="craft-zero-summary">
          <div><span>目标</span><strong>Lv.1 → Lv.10</strong></div>
          <div><span>制作次数</span><strong>{fmt(woodZeroRoute.totalCrafts)}</strong></div>
          <div><span>外购材料</span><strong>0 meso</strong></div>
          <div><span>制作手续费</span><strong>{fmt(woodZeroRoute.steps.reduce((sum, step) => sum + step.recipe.meso * step.crafts, 0))} meso</strong></div>
        </div>
        <div className="craft-chip-list compact">
          {woodZeroRoute.totalMaterials.slice(0, 10).map((material) => <button key={material.name} className="craft-chip" onClick={() => setSelectedMaterial(material.name)}><ItemIcon name={material.name} size={20} />{material.zh} x{material.qty}</button>)}
        </div>
      </div>
      <div className="craft-zero-route">{woodZeroRoute.steps.map((step) => <span key={`${step.level}-${step.recipe.id}`}>Lv.{step.level}→{step.to} · {step.recipe.outputZh} ×{step.crafts}</span>)}</div>
    </section>

    <section id="craft-recipes" className="craft-panel">
      <div className="craft-panel-title"><h2>配方浏览器</h2><span>{filteredRecipes.length} 条</span></div>
      <div className="craft-browser-toolbar">
        <select value={recipeScope} onChange={(event) => setRecipeScope(event.target.value)}><option value="all">全部专业</option>{PROFESSIONS.map((profession) => <option key={profession.id} value={profession.id}>{profession.zh} · {profession.en}</option>)}</select>
        <select value={recipeType} onChange={(event) => setRecipeType(event.target.value)}><option value="all">全部类型</option><option value="Materials">材料</option><option value="Equipment">装备</option><option value="Material">材料</option></select>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索中文名 / 英文名 / 材料名" />
      </div>
      <div className="craft-recipe-grid">
        {filteredRecipes.slice(0, 36).map((recipe) => <article key={recipe.id} className="craft-recipe-card">
          <div className="craft-recipe-head"><ItemIcon name={recipe.output} size={24} /><strong>{recipe.outputZh}</strong></div>
          <span>{professionMeta(recipe.profession).zh} · Lv.{recipe.level} · EXP {recipe.exp} · {fmt(recipe.meso)} meso</span>
          <p>{recipe.materials.map((material) => `${material.zh} x${material.qty}`).join(' / ')}</p>
        </article>)}
      </div>
      {filteredRecipes.length > 36 && <p className="craft-muted center">已显示前 36 条，继续缩小专业、类型或搜索词可以更快定位。</p>}
    </section>

    {data.error && <p className="craft-load-note">读取提示：{data.error}</p>}
  </section>;
}
