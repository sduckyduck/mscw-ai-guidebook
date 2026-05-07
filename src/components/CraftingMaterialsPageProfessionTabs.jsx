import { useEffect, useMemo, useState } from 'react';
import MonsterIcon from './MonsterIcon.jsx';
import MsioItemIcon from './MsioItemIcon.jsx';
import { loadOfficialGuideData } from '../engine/officialDataAdapter.js';
import '../styles/materials-advanced.css';
import '../styles/materials-prof-tabs.css';

const PROFESSIONS = [
  { id: 'all', zh: '全部', icon: '✨', note: '查看六个专业共用材料、瓶颈材料和配方库。' },
  { id: 'smithing', zh: '锻造', icon: '⚒️', note: '金属板材、矿石精炼和重装材料。' },
  { id: 'weaponcrafting', zh: '武器制作', icon: '🗡️', note: '武器底材、攻击路线和高价值装备。' },
  { id: 'tailoring', zh: '裁缝', icon: '🧵', note: '布料、法师装备和轻甲路线。' },
  { id: 'woodcrafting', zh: '木工', icon: '🪵', note: '木料、弓弩、法杖和把手材料。' },
  { id: 'leatherworking', zh: '皮革', icon: '🧤', note: '皮革、手套、飞侠和弓手相关材料。' },
  { id: 'arcforge', zh: '炼金', icon: '⚗️', note: '催化剂、结晶、魔法材料和后期高价值节点。' },
];

const PROFESSION_IDS = PROFESSIONS.filter((row) => row.id !== 'all').map((row) => row.id);

const MODES = [
  { id: 'cheapest', zh: '最低成本', desc: '优先金币和材料成本最低。' },
  { id: 'farm', zh: '刷怪友好', desc: '优先自刷材料，尽量少买 NPC 材料。' },
  { id: 'balanced', zh: '均衡路线', desc: '成本、经验和瓶颈材料折中。' },
  { id: 'fastest', zh: '最快升级', desc: '优先单位制作经验。' },
];

const MASTERY = [50, 115, 200, 308, 450, 635, 882, 1190, 1587];

const ZH = {
  'Smithing': '锻造',
  'Weaponcrafting': '武器制作',
  'Tailoring': '裁缝',
  'Woodcrafting': '木工',
  'Leatherworking': '皮革',
  'Arcforge': '炼金',
  'Arcane Forge': '炼金',
  'Screw': '螺丝钉',
  'Thread': '线轴',
  'Spool of Thread': '线轴',
  'Processed Leather': '加工皮革',
  'Leather': '皮革',
  'Dragon Skin': '龙皮',
  'Processed Cloth': '加工布料',
  'Iron Ingot': '铁锭',
  'Iron Ore': '铁矿石',
  'Steel Ingot': '钢铁锭',
  'Steel Ore': '钢铁矿石',
  'Bronze Ingot': '青铜锭',
  'Bronze Ore': '青铜矿石',
  'Mithril Ingot': '秘银锭',
  'Mithril Ore': '秘银矿石',
  'Adamantium Ingot': '金刚锭',
  'Adamantium Ore': '金刚矿石',
  'Garnet': '石榴石',
  'Garnet Ore': '石榴石母矿',
  'Gold Ingot': '黄金锭',
  'Gold Ore': '黄金矿石',
  'Processed Wood': '加工木材',
  'Firewood': '木柴',
  'Tree Branch': '树枝',
  'Branch': '树枝',
  'Stiff Feather': '硬羽毛',
  'Fragment of Magic': '魔法碎片',
  'Magic Powder': '魔法粉末',
  'Crystal Shard': '水晶碎片',
  'Monster Crystal': '怪物结晶',
  'Black Crystal': '黑水晶',
  'Black Crystal Ore': '黑水晶母矿',
  'Catalyst': '催化剂',
  'Snail Shell': '蜗牛壳',
  'Blue Snail Shell': '蓝蜗牛壳',
  'Red Snail Shell': '红蜗牛壳',
  'Orange Mushroom Cap': '橙蘑菇盖',
  'Green Mushroom Cap': '绿蘑菇盖',
  'Blue Mushroom Cap': '蓝蘑菇盖',
  'Jr. Necki Skin': '小青蛇皮',
  'Curse Eye Tail': '诅咒眼尾巴',
  'Stirge Wing': '蝙蝠翅膀',
  'Arrow for Bow': '弓箭',
  'Bronze Arrow for Bow': '青铜弓箭',
  'Iron Arrow for Bow': '铁弓箭',
};

const ITEM_ID_HINTS = {
  screw: 4003000,
  'processed wood': 4003001,
  firewood: 4003004,
  'stiff feather': 4003005,
  'snail shell': 4000000,
  'blue snail shell': 4000001,
  'red snail shell': 4000002,
  'orange mushroom cap': 4000009,
  'green mushroom cap': 4000013,
  'blue mushroom cap': 4000016,
  'jr necki skin': 4000018,
  'curse eye tail': 4000027,
  'stirge wing': 4000052,
  leather: 4000021,
  'animal skin': 4000021,
  'bronze ore': 4010000,
  'iron ore': 4010001,
  'steel ore': 4010001,
  'mithril ore': 4010002,
  'adamantium ore': 4010003,
  'silver ore': 4010004,
  'orihalcon ore': 4010005,
  'gold ore': 4010006,
  'bronze ingot': 4011000,
  'iron ingot': 4011001,
  'steel ingot': 4011001,
  'mithril ingot': 4011002,
  'adamantium ingot': 4011003,
  'silver ingot': 4011004,
  'orihalcon ingot': 4011005,
  'gold ingot': 4011006,
  garnet: 4021000,
  'garnet ore': 4020000,
  'black crystal': 4021008,
  'black crystal ore': 4020008,
};

const DROP_GUIDES = [
  { material: 'Processed Wood', aliases: ['Processed Wood', 'Firewood', 'Tree Branch', 'Branch'], monsters: ['Stump', 'Dark Stump', 'Axe Stump'], note: '优先刷树妖系材料，再转成加工木材。' },
  { material: 'Leather', aliases: ['Leather', 'Processed Leather', 'Animal Skin'], monsters: ['Pig', 'Ribbon Pig', 'Wild Boar'], note: '皮革系材料，适合和战士/飞侠早期刷怪一起囤。' },
  { material: 'Stiff Feather', aliases: ['Stiff Feather'], monsters: ['Jr. Sentinel', 'Sentinel'], note: '弓箭、弩箭和部分轻甲材料，按需求补。' },
  { material: 'Snail Shell', aliases: ['Snail Shell'], monsters: ['Snail'], note: '新手岛和明珠港低级图密度高。' },
  { material: 'Blue Snail Shell', aliases: ['Blue Snail Shell'], monsters: ['Blue Snail'], note: '低级地图密度高，适合顺手囤。' },
  { material: 'Red Snail Shell', aliases: ['Red Snail Shell'], monsters: ['Red Snail'], note: '低级地图密度高，适合顺手囤。' },
  { material: 'Orange Mushroom Cap', aliases: ['Orange Mushroom Cap'], monsters: ['Orange Mushroom', 'Shroom'], note: '蘑菇系材料，适合早期顺手刷。' },
  { material: 'Green Mushroom Cap', aliases: ['Green Mushroom Cap'], monsters: ['Green Mushroom'], note: '蘑菇系材料，覆盖部分低级配方。' },
  { material: 'Blue Mushroom Cap', aliases: ['Blue Mushroom Cap'], monsters: ['Blue Mushroom'], note: '蘑菇系材料，覆盖部分低级配方。' },
  { material: 'Jr. Necki Skin', aliases: ['Jr. Necki Skin'], monsters: ['Jr. Necki'], note: '蛇皮类材料，通常需要专门刷。' },
  { material: 'Curse Eye Tail', aliases: ['Curse Eye Tail'], monsters: ['Curse Eye'], note: '地下城路线材料。' },
  { material: 'Stirge Wing', aliases: ['Stirge Wing'], monsters: ['Stirge'], note: '低中级材料，适合按配方需求补。' },
];

const FALLBACK_RECIPES = [
  ['smithing', 'Iron Plate', 1, 20, 30, [['Iron Ore', 2], ['Coal', 1]]],
  ['smithing', 'Bronze Plate', 2, 28, 35, [['Bronze Ore', 3], ['Coal', 1]]],
  ['weaponcrafting', 'Training Sword', 1, 22, 25, [['Iron Ore', 2], ['Processed Wood', 1]]],
  ['woodcrafting', 'Arrow for Bow', 1, 3, 0, [['Processed Wood', 1]]],
  ['woodcrafting', 'Bronze Arrow for Bow', 4, 12, 0, [['Processed Wood', 1], ['Stiff Feather', 1]]],
  ['woodcrafting', 'Iron Arrow for Bow', 7, 22, 0, [['Processed Wood', 1], ['Iron Ingot', 1]]],
  ['leatherworking', 'Processed Leather', 3, 36, 45, [['Leather', 5], ['Stiff Feather', 1]]],
].map(([profession, output, level, exp, mesoCost, materials], index) => ({
  id: `fallback-${index}`,
  profession,
  output,
  outputId: null,
  outputType: 'Material',
  level,
  exp,
  mesoCost,
  materials: materials.map(([name, qty]) => ({ id: slug(name), name, zh: translate(name), qty })),
}));

function slug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function norm(value) {
  return String(value || '').trim().toLowerCase().replace(/[’']/g, '').replace(/\bjr\.?\b/g, 'jr').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function translate(name) {
  const clean = String(name || '').trim();
  return ZH[clean] || clean.replace(/Arcane Forge|Arcforge/gi, '炼金');
}

function fmt(value) {
  return Number(value || 0).toLocaleString();
}

function prof(id) {
  return PROFESSIONS.find((row) => row.id === id) || PROFESSIONS[0];
}

function canonicalProfession(value) {
  const key = norm(value);
  if (key.includes('smith')) return 'smithing';
  if (key.includes('weapon')) return 'weaponcrafting';
  if (key.includes('tailor')) return 'tailoring';
  if (key.includes('wood')) return 'woodcrafting';
  if (key.includes('leather')) return 'leatherworking';
  if (key.includes('arc') || key.includes('alchemy') || key.includes('forge')) return 'arcforge';
  return PROFESSION_IDS.includes(value) ? value : value;
}

function sourceFor(name) {
  const lower = norm(name);
  if (lower.includes('coal') || lower.includes('catalyst')) return 'NPC/市场';
  if (lower.includes('processed') || lower.includes('ingot') || lower.includes('plate')) return '制作中间件';
  if (DROP_GUIDES.some((guide) => guide.aliases.some((alias) => norm(alias) === lower))) return '怪物/采集掉落';
  return '掉落/采集待补充';
}

function materialValue(name) {
  const lower = norm(name);
  if (lower.includes('dragon') || lower.includes('crystal')) return 1500;
  if (lower.includes('thread') || lower.includes('screw') || lower.includes('leather')) return 520;
  if (lower.includes('ingot') || lower.includes('fragment')) return 400;
  if (lower.includes('wood') || lower.includes('branch') || lower.includes('feather')) return 160;
  return 240;
}

function estimateCost(name, mode) {
  const source = sourceFor(name);
  const factor = {
    cheapest: source.includes('NPC') ? 1 : source.includes('中间件') ? 1.05 : 0.9,
    farm: source.includes('NPC') ? 4 : source.includes('中间件') ? 0.8 : 0.45,
    balanced: source.includes('NPC') ? 1.35 : source.includes('中间件') ? 1 : 0.75,
    fastest: source.includes('NPC') ? 0.95 : source.includes('中间件') ? 1.05 : 1.15,
  }[mode] || 1;
  return materialValue(name) * factor;
}

function recipeCost(recipe, mode) {
  return Math.max(1, Number(recipe.mesoCost || 0) + recipe.materials.reduce((sum, item) => sum + estimateCost(item.name, mode) * item.qty, 0));
}

function recipeRank(recipe, mode, bottleneckByName) {
  const cost = recipeCost(recipe, mode);
  const bottleneckPenalty = recipe.materials.reduce((sum, item) => sum + (bottleneckByName.get(norm(item.name))?.score || 0) * item.qty, 0);
  if (mode === 'fastest') return recipe.exp * 1000 - cost * 0.1;
  if (mode === 'farm') return recipe.exp / cost - recipe.materials.filter((item) => sourceFor(item.name).includes('NPC')).length * 0.04;
  if (mode === 'balanced') return recipe.exp / Math.max(1, cost + bottleneckPenalty * 3);
  return recipe.exp / cost;
}

function normalizeRecipes(rawRecipes, rawMaterials) {
  const materialById = Object.fromEntries((rawMaterials || []).map((item) => [item.id, item]));
  const list = (rawRecipes || []).map((recipe) => {
    const output = recipe.output || recipe.result_item_name || recipe.name || `Recipe ${recipe.id}`;
    return {
      ...recipe,
      profession: canonicalProfession(recipe.profession || recipe.discipline),
      output,
      outputType: recipe.outputType || recipe.output_type || 'Material',
      mesoCost: Number(recipe.mesoCost || recipe.meso_cost || recipe.meso || 0),
      exp: Number(recipe.exp || recipe.craft_exp || 0),
      level: Number(recipe.level || recipe.req_level || 1),
      materials: (recipe.materials || recipe.ingredients || []).map((material) => {
        const found = materialById[material.id] || material;
        const name = found.name || material.name || material.item_name || material.id;
        return { id: material.id || slug(name), name, zh: translate(name), qty: Number(material.qty || material.count || 1) };
      }),
    };
  }).filter((recipe) => recipe.profession && recipe.materials.length && recipe.exp >= 0);
  return list.length ? list : FALLBACK_RECIPES;
}

function buildBottlenecks(recipes) {
  const map = new Map();
  recipes.forEach((recipe) => {
    recipe.materials.forEach((material) => {
      const key = norm(material.name);
      const row = map.get(key) || { name: material.name, zh: translate(material.name), qty: 0, recipes: new Set(), professions: new Set(), high: 0 };
      row.qty += material.qty;
      row.recipes.add(recipe.id);
      row.professions.add(recipe.profession);
      row.high += material.qty * recipe.level;
      map.set(key, row);
    });
  });
  const rows = [...map.values()].map((row) => ({
    ...row,
    recipeCount: row.recipes.size,
    professionCount: row.professions.size,
    scoreRaw: row.qty * 4 + row.recipes.size * 14 + row.professions.size * 20 + row.high + materialValue(row.name) / 35,
  })).sort((a, b) => b.scoreRaw - a.scoreRaw || b.qty - a.qty);
  const max = Math.max(1, ...rows.map((row) => row.scoreRaw));
  return rows.map((row) => ({ ...row, score: Math.round((row.scoreRaw / max) * 100) }));
}

function buildMatrix(recipes, bottlenecks) {
  return bottlenecks.map((row) => {
    const byProfession = Object.fromEntries(PROFESSION_IDS.map((id) => [id, 0]));
    recipes.forEach((recipe) => {
      recipe.materials.forEach((material) => {
        if (norm(material.name) === norm(row.name)) byProfession[recipe.profession] += material.qty;
      });
    });
    return { ...row, byProfession };
  });
}

function simulate(recipes, professionId, mode, targetLevel, bottleneckByName, noBuy = false) {
  const totalMaterials = new Map();
  const steps = [];
  let totalCrafts = 0;
  let totalCost = 0;
  for (let level = 1; level < targetLevel; level += 1) {
    const need = MASTERY[level - 1] || 1000;
    const pool = recipes.filter((recipe) => {
      if (recipe.profession !== professionId || recipe.level > level || recipe.exp <= 0) return false;
      if (noBuy && recipe.materials.some((material) => sourceFor(material.name).includes('NPC'))) return false;
      return true;
    });
    if (!pool.length) break;
    const best = [...pool].sort((a, b) => recipeRank(b, mode, bottleneckByName) - recipeRank(a, mode, bottleneckByName))[0];
    const crafts = Math.max(1, Math.ceil(need / Math.max(1, best.exp)));
    best.materials.forEach((material) => {
      const key = norm(material.name);
      const existing = totalMaterials.get(key) || { name: material.name, zh: translate(material.name), qty: 0 };
      totalMaterials.set(key, { ...existing, qty: existing.qty + material.qty * crafts });
    });
    totalCrafts += crafts;
    totalCost += recipeCost(best, mode) * crafts;
    steps.push({ level, to: level + 1, recipe: best, crafts });
  }
  return { steps, totalCrafts, totalCost, totalMaterials: [...totalMaterials.values()].sort((a, b) => b.qty - a.qty) };
}

function buildDropRoutes(materialName, monsters) {
  const selected = norm(materialName);
  const guide = DROP_GUIDES.find((row) => row.aliases.some((alias) => norm(alias) === selected) || norm(row.material) === selected);
  if (!guide) return { guide: null, monsters: [] };
  const found = [];
  guide.monsters.forEach((alias) => {
    const key = norm(alias);
    const matches = monsters.filter((monster) => norm(monster.name) === key || norm(monster.name).includes(key));
    matches.slice(0, 5).forEach((monster) => {
      if (!found.some((item) => item.id === monster.id)) found.push(monster);
    });
  });
  return { guide, monsters: found.slice(0, 6) };
}

function resolveItemObject(name, items, explicitId = null) {
  const key = norm(name);
  const exact = (items || []).find((item) => norm(item.name || item.title) === key);
  if (exact) return exact;
  const fuzzy = (items || []).find((item) => key && (norm(item.name || item.title).includes(key) || key.includes(norm(item.name || item.title))));
  if (fuzzy) return fuzzy;
  const hintedId = explicitId || ITEM_ID_HINTS[key];
  return hintedId ? { id: String(hintedId), title: translate(name), name: translate(name) } : { id: '', title: translate(name), name: translate(name) };
}

function MaterialIcon({ name, items, explicitId = null, size = 24 }) {
  const item = useMemo(() => resolveItemObject(name, items, explicitId), [name, items, explicitId]);
  return <span className="craft-msio-icon"><MsioItemIcon item={item} size={size} /></span>;
}

function emptyData() {
  return { recipes: FALLBACK_RECIPES, materials: [], monsters: [], items: [], source: 'fallback', error: '' };
}

export default function CraftingMaterialsPageProfessionTabs() {
  const [data, setData] = useState(emptyData);
  const [scope, setScope] = useState('all');
  const [mode, setMode] = useState('farm');
  const [targetLevel, setTargetLevel] = useState(10);
  const [recipeType, setRecipeType] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('Processed Wood');

  useEffect(() => {
    let active = true;
    loadOfficialGuideData()
      .then((loaded) => {
        if (!active) return;
        setData({
          recipes: normalizeRecipes(loaded.recipes, loaded.materials),
          materials: loaded.materials || [],
          monsters: loaded.monsters || [],
          items: loaded.items || [],
          source: 'official',
          error: '',
        });
      })
      .catch((error) => {
        if (!active) return;
        setData({ ...emptyData(), error: error.message || 'AppData 读取失败，已使用内置示例。' });
      });
    return () => { active = false; };
  }, []);

  const recipes = data.recipes;
  const scopedRecipes = useMemo(() => scope === 'all' ? recipes : recipes.filter((recipe) => recipe.profession === scope), [recipes, scope]);
  const bottlenecks = useMemo(() => buildBottlenecks(scopedRecipes), [scopedRecipes]);
  const bottleneckByName = useMemo(() => new Map(bottlenecks.map((row) => [norm(row.name), row])), [bottlenecks]);
  const matrixRows = useMemo(() => buildMatrix(scopedRecipes, bottlenecks), [scopedRecipes, bottlenecks]);
  const routeProfession = scope === 'all' ? 'woodcrafting' : scope;
  const route = useMemo(() => simulate(recipes, routeProfession, mode, targetLevel, bottleneckByName), [recipes, routeProfession, mode, targetLevel, bottleneckByName]);
  const woodZeroRoute = useMemo(() => {
    const noBuy = simulate(recipes, 'woodcrafting', 'farm', 10, bottleneckByName, true);
    return noBuy.steps.length ? noBuy : simulate(recipes, 'woodcrafting', 'farm', 10, bottleneckByName);
  }, [recipes, bottleneckByName]);

  const materialOptions = useMemo(() => {
    const map = new Map();
    [...route.totalMaterials, ...bottlenecks.slice(0, 18)].forEach((row) => map.set(norm(row.name), row));
    DROP_GUIDES.forEach((row) => map.set(norm(row.material), { name: row.material, zh: translate(row.material), qty: 0 }));
    return [...map.values()];
  }, [route.totalMaterials, bottlenecks]);

  const activeMaterial = materialOptions.some((row) => norm(row.name) === norm(selectedMaterial)) ? selectedMaterial : materialOptions[0]?.name || 'Processed Wood';
  const dropRoutes = useMemo(() => buildDropRoutes(activeMaterial, data.monsters), [activeMaterial, data.monsters]);
  const activeProfession = prof(scope);
  const mainBottleneck = (scope === 'all' ? bottlenecks[0] : route.totalMaterials[0]) || bottlenecks[0];

  const filteredRecipes = useMemo(() => {
    const text = norm(query);
    return scopedRecipes.filter((recipe) => {
      if (recipeType !== 'all' && norm(recipe.outputType) !== norm(recipeType)) return false;
      if (!text) return true;
      const haystack = norm([recipe.output, translate(recipe.output), prof(recipe.profession).zh, ...recipe.materials.flatMap((material) => [material.name, material.zh])].join(' '));
      return haystack.includes(text);
    }).sort((a, b) => a.level - b.level || String(a.output).localeCompare(String(b.output))).slice(0, 48);
  }, [scopedRecipes, recipeType, query]);

  return <section className="craft-guide">
    <header className="craft-hero">
      <div>
        <span className="craft-eyebrow">MCW Crafting · Guidebook</span>
        <h1>材料与锻造路线</h1>
        <p>先选专业，再看推荐路线、缺什么材料、去哪刷，最后用配方库查细节。</p>
      </div>
      <div className="craft-source-badge">{data.source === 'official' ? `已读取 AppData · ${recipes.length} 配方` : '内置示例数据'}</div>
    </header>

    <nav className="craft-prof-tabs" aria-label="专业筛选">
      {PROFESSIONS.map((row) => <button key={row.id} type="button" className={scope === row.id ? 'craft-prof-tab active' : 'craft-prof-tab'} onClick={() => { setScope(row.id); if (row.id !== 'all') setSelectedMaterial('Processed Wood'); }}>
        <span className="craft-prof-icon">{row.icon}</span>
        <strong>{row.zh}</strong>
      </button>)}
    </nav>

    <section className="craft-control-card compact-controls">
      <label><span>路线</span><select value={mode} onChange={(event) => setMode(event.target.value)}>{MODES.map((row) => <option key={row.id} value={row.id}>{row.zh}</option>)}</select></label>
      <label><span>目标</span><select value={targetLevel} onChange={(event) => setTargetLevel(Number(event.target.value))}>{[3, 4, 5, 6, 7, 8, 9, 10].map((level) => <option key={level} value={level}>Lv.{level}</option>)}</select></label>
    </section>

    <section id="craft-plan" className="craft-main-grid">
      <article className="craft-panel craft-summary-panel">
        <div className="craft-panel-title"><h2><span className="craft-profession-emoji">{activeProfession.icon}</span>{scope === 'all' ? '全部专业总览' : `${activeProfession.zh}升级策略`}</h2><span>{scope === 'all' ? '六大专业' : activeProfession.zh}</span></div>
        <p className="craft-muted">{activeProfession.note}</p>
        <div className="craft-kpis">
          <div><span>{scope === 'all' ? '配方数量' : '制作次数'}</span><strong>{scope === 'all' ? fmt(scopedRecipes.length) : fmt(route.totalCrafts)}</strong></div>
          <div><span>{scope === 'all' ? '材料种类' : '估算成本'}</span><strong>{scope === 'all' ? fmt(bottlenecks.length) : `${fmt(route.totalCost)} meso`}</strong></div>
          <div><span>最大瓶颈</span><strong>{mainBottleneck?.zh || '-'}</strong></div>
        </div>
        <p className="craft-note">{scope === 'all' ? '选择上方某个专业后，会切换成该专业的升级路线和材料清单。' : MODES.find((row) => row.id === mode)?.desc}</p>
      </article>

      <article className="craft-panel">
        <div className="craft-panel-title"><h2>{scope === 'all' ? '重点囤货' : '推荐路线'}</h2><span>{scope === 'all' ? 'Top 材料' : `Lv.1 → Lv.${targetLevel}`}</span></div>
        {scope === 'all' ? <div className="craft-bottleneck-list compact-list">
          {bottlenecks.slice(0, 8).map((row, index) => <button key={row.name} className="craft-bottleneck-row" onClick={() => setSelectedMaterial(row.name)}>
            <strong>#{index + 1}</strong><MaterialIcon name={row.name} items={data.items} size={20} /><span>{row.zh}<small>总需求 {row.qty}</small></span><em>{row.score}</em>
          </button>)}
        </div> : <div className="craft-route-list">
          {route.steps.map((step) => <button key={`${step.level}-${step.recipe.id}`} className="craft-route-row" onClick={() => setSelectedMaterial(step.recipe.materials[0]?.name || activeMaterial)}>
            <strong>Lv.{step.level}→{step.to}</strong>
            <span>{translate(step.recipe.output)}</span>
            <em>x{step.crafts}</em>
          </button>)}
        </div>}
      </article>

      <article className="craft-panel">
        <div className="craft-panel-title"><h2>{scope === 'all' ? '当前专业入口' : '当前材料清单'}</h2><span>点击查掉落</span></div>
        <div className="craft-chip-list">
          {(scope === 'all' ? bottlenecks.slice(0, 10) : route.totalMaterials).map((material) => <button key={material.name} className={norm(activeMaterial) === norm(material.name) ? 'craft-chip active' : 'craft-chip'} onClick={() => setSelectedMaterial(material.name)}>
            <MaterialIcon name={material.name} items={data.items} size={20} />{material.zh || translate(material.name)}{material.qty ? ` x${material.qty}` : ''}
          </button>)}
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
          <MaterialIcon name={activeMaterial} items={data.items} size={38} />
          <div>
            <strong>{translate(activeMaterial)}</strong>
            <span>{activeMaterial}</span>
            <p>{dropRoutes.guide?.note || '这个材料还没有确认掉落映射，先按配方需求、市场或后续数据补充处理。'}</p>
          </div>
        </div>
        <div className="craft-drop-cards">
          {dropRoutes.monsters.map((monster) => <article key={monster.id} className="craft-drop-card">
            <MonsterIcon monster={monster} size={42} />
            <div>
              <strong>{monster.name}</strong>
              <span>Lv.{monster.level}</span>
              <div className="craft-map-lines">
                {(monster.maps || []).slice(0, 3).map((map) => <em key={`${monster.id}-${map.id}`}>{map.name} · {map.count}只</em>)}
              </div>
            </div>
          </article>)}
          {!dropRoutes.monsters.length && <article className="craft-drop-card empty"><strong>{dropRoutes.guide ? 'NPC/市场或待补数据' : '待补充'}</strong><span>{dropRoutes.guide?.note || '没有匹配到 AppData 怪物。'}</span></article>}
        </div>
      </div>
    </section>

    <section id="craft-matrix" className="craft-two-col">
      <article className="craft-panel">
        <div className="craft-panel-title"><h2>跨专业材料矩阵</h2><span>关键 10 个</span></div>
        <div className="craft-matrix-list">
          {matrixRows.slice(0, 10).map((row) => <div key={row.name} className="craft-matrix-row">
            <div className="craft-matrix-name"><MaterialIcon name={row.name} items={data.items} size={22} /><strong>{row.zh}</strong><span>{row.professionCount}系 / {row.recipeCount}配方</span></div>
            <div className="craft-prof-pills">{PROFESSION_IDS.filter((id) => row.byProfession[id] > 0).slice(0, 4).map((id) => <em key={id}>{prof(id).zh} {row.byProfession[id]}</em>)}</div>
          </div>)}
        </div>
      </article>

      <article className="craft-panel">
        <div className="craft-panel-title"><h2>材料瓶颈排行</h2><span>需求 / 覆盖 / 稀有度</span></div>
        <div className="craft-bottleneck-list">
          {bottlenecks.slice(0, 10).map((row, index) => <button key={row.name} className="craft-bottleneck-row" onClick={() => setSelectedMaterial(row.name)}>
            <strong>#{index + 1}</strong>
            <MaterialIcon name={row.name} items={data.items} size={22} />
            <span>{row.zh}<small>{sourceFor(row.name)} · 总需求 {row.qty}</small></span>
            <em>{row.score}</em>
          </button>)}
        </div>
      </article>
    </section>

    {(scope === 'all' || scope === 'woodcrafting') && <section className="craft-panel craft-zero-panel">
      <div className="craft-panel-title"><h2>木工零金币升级规划</h2><span>自刷材料优先</span></div>
      <div className="craft-zero-grid">
        <div className="craft-zero-summary">
          <div><span>目标</span><strong>Lv.1 → Lv.10</strong></div>
          <div><span>制作次数</span><strong>{fmt(woodZeroRoute.totalCrafts)}</strong></div>
          <div><span>外购材料</span><strong>0 meso</strong></div>
          <div><span>估算成本</span><strong>{fmt(woodZeroRoute.totalCost)} meso</strong></div>
        </div>
        <div className="craft-chip-list compact">
          {woodZeroRoute.totalMaterials.slice(0, 10).map((material) => <button key={material.name} className="craft-chip" onClick={() => setSelectedMaterial(material.name)}><MaterialIcon name={material.name} items={data.items} size={20} />{material.zh} x{material.qty}</button>)}
        </div>
      </div>
      <div className="craft-zero-route">{woodZeroRoute.steps.map((step) => <span key={`${step.level}-${step.recipe.id}`}>Lv.{step.level}→{step.to} · {translate(step.recipe.output)} ×{step.crafts}</span>)}</div>
    </section>}

    <section id="craft-recipes" className="craft-panel">
      <div className="craft-panel-title"><h2>配方浏览器</h2><span>{filteredRecipes.length} 条</span></div>
      <div className="craft-browser-toolbar compact-browser">
        <select value={recipeType} onChange={(event) => setRecipeType(event.target.value)}><option value="all">全部类型</option><option value="Materials">材料</option><option value="Equipment">装备</option><option value="Material">材料</option></select>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索中文名 / 英文名 / 材料名" />
      </div>
      <div className="craft-recipe-grid">
        {filteredRecipes.map((recipe) => <article key={recipe.id} className="craft-recipe-card">
          <div className="craft-recipe-head"><MaterialIcon name={recipe.output} explicitId={recipe.outputId} items={data.items} size={22} /><strong>{translate(recipe.output)}</strong></div>
          <span>{prof(recipe.profession).zh} · Lv.{recipe.level} · EXP {recipe.exp} · {fmt(recipe.mesoCost)} meso</span>
          <p>{recipe.materials.map((material) => `${material.zh} x${material.qty}`).join(' / ')}</p>
        </article>)}
      </div>
    </section>

    {data.error && <p className="craft-load-note">读取提示：{data.error}</p>}
  </section>;
}
