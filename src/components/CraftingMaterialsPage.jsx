import { useMemo, useState } from 'react';

const ICON_BASE = `${import.meta.env.BASE_URL}icons/crafting/`;

const PROFESSIONS = [
  { id: 'smithing', name: 'Smithing', zh: '锻造', icon: 'smithing_icon.png', description: '金属板材、矿石精炼和重装材料。' },
  { id: 'weaponcrafting', name: 'Weaponcrafting', zh: '武器制作', icon: 'weapon_crafting_icon.png', description: '武器底材、攻击路线和高价值装备。' },
  { id: 'tailoring', name: 'Tailoring', zh: '裁缝', icon: 'tailoring_icon.png', description: '布料、法师装备和轻甲路线。' },
  { id: 'woodcrafting', name: 'Woodcrafting', zh: '木工', icon: 'woodcrafting_icon.png', description: '木料、弓弩、法杖和把手材料。' },
  { id: 'leatherworking', name: 'Leatherworking', zh: '皮革', icon: 'leatherworking_icon.png', description: '皮革、手套、飞侠/弓手相关材料。' },
  { id: 'arcforge', name: 'Arcforge', zh: '融合机体', icon: 'arcforge_icon.png', description: '魔法催化、卷轴材料和后期高价值节点。' },
];

const MASTERY_TABLE = [
  { level: 1, expToNext: 50, cumulative: 50, reqCharLevel: '?' },
  { level: 2, expToNext: 115, cumulative: 165, reqCharLevel: 10 },
  { level: 3, expToNext: 200, cumulative: 365, reqCharLevel: 15 },
  { level: 4, expToNext: 308, cumulative: 673, reqCharLevel: 20 },
  { level: 5, expToNext: 450, cumulative: 1123, reqCharLevel: 25 },
  { level: 6, expToNext: 635, cumulative: 1758, reqCharLevel: 30 },
  { level: 7, expToNext: 882, cumulative: 2640, reqCharLevel: 35 },
  { level: 8, expToNext: 1190, cumulative: 3830, reqCharLevel: 40 },
  { level: 9, expToNext: 1587, cumulative: 5417, reqCharLevel: 45 },
  { level: 10, expToNext: 2115, cumulative: 7532, reqCharLevel: 50 },
];

const ITEMS = {
  iron_ore: { id: 'iron_ore', name: 'Iron Ore', zh: '铁矿石', source: 'drop', rarity: 1, basePrice: 120 },
  bronze_ore: { id: 'bronze_ore', name: 'Bronze Ore', zh: '青铜矿石', source: 'drop', rarity: 1, basePrice: 90 },
  steel_ore: { id: 'steel_ore', name: 'Steel Ore', zh: '钢铁矿石', source: 'drop', rarity: 2, basePrice: 210 },
  mithril_ore: { id: 'mithril_ore', name: 'Mithril Ore', zh: '秘银矿石', source: 'drop', rarity: 3, basePrice: 450 },
  adamantium_ore: { id: 'adamantium_ore', name: 'Adamantium Ore', zh: '锂矿石', source: 'drop', rarity: 4, basePrice: 850 },
  coal: { id: 'coal', name: 'Coal', zh: '煤炭', source: 'npc', rarity: 1, basePrice: 80 },
  screw: { id: 'screw', name: 'Screw', zh: '螺丝钉', source: 'crafted', rarity: 2, basePrice: 250 },
  stiff_feather: { id: 'stiff_feather', name: 'Stiff Feather', zh: '硬羽毛', source: 'drop', rarity: 1, basePrice: 70 },
  animal_skin: { id: 'animal_skin', name: 'Animal Skin', zh: '动物皮', source: 'drop', rarity: 1, basePrice: 100, icon: 'animal_fur_bundle.png' },
  leather: { id: 'leather', name: 'Leather', zh: '加工皮革', source: 'crafted', rarity: 2, basePrice: 300, icon: 'processed_leather.png' },
  processed_wood: { id: 'processed_wood', name: 'Processed Wood', zh: '加工木材', source: 'crafted', rarity: 1, basePrice: 180 },
  firewood: { id: 'firewood', name: 'Firewood', zh: '木柴', source: 'drop', rarity: 1, basePrice: 60 },
  branch: { id: 'branch', name: 'Branch', zh: '树枝', source: 'drop', rarity: 1, basePrice: 45 },
  magic_powder: { id: 'magic_powder', name: 'Magic Powder', zh: '魔法粉末', source: 'drop', rarity: 3, basePrice: 600 },
  crystal_shard: { id: 'crystal_shard', name: 'Crystal Shard', zh: '水晶碎片', source: 'drop', rarity: 3, basePrice: 700 },
  dark_crystal: { id: 'dark_crystal', name: 'Dark Crystal', zh: '黑水晶', source: 'drop', rarity: 5, basePrice: 1500 },
  silk_thread: { id: 'silk_thread', name: 'Silk Thread', zh: '丝线', source: 'drop', rarity: 2, basePrice: 240, icon: 'spool_of_thread.png' },
  linen_cloth: { id: 'linen_cloth', name: 'Linen Cloth', zh: '亚麻布', source: 'drop', rarity: 1, basePrice: 120 },
  enchanted_thread: { id: 'enchanted_thread', name: 'Enchanted Thread', zh: '魔化丝线', source: 'crafted', rarity: 3, basePrice: 650, icon: 'spool_of_thread.png' },
  parchment: { id: 'parchment', name: 'Parchment', zh: '加工羊皮纸', source: 'crafted', rarity: 2, basePrice: 320, icon: 'processed_parchment.png' },
  catalyst: { id: 'catalyst', name: 'Catalyst', zh: '催化剂', source: 'npc', rarity: 3, basePrice: 900 },
  monster_crystal: { id: 'monster_crystal', name: 'Monster Crystal', zh: '怪物结晶', source: 'drop', rarity: 4, basePrice: 1200 },
};

const RECIPES = [
  { id: 'iron_plate', profession: 'smithing', name: 'Iron Plate', zh: '铁板', outputType: 'Material', level: 1, exp: 20, meso: 30, resale: 80, ingredients: [{ id: 'iron_ore', qty: 2 }, { id: 'coal', qty: 1 }] },
  { id: 'bronze_plate', profession: 'smithing', name: 'Bronze Plate', zh: '青铜板', outputType: 'Material', level: 2, exp: 28, meso: 35, resale: 90, ingredients: [{ id: 'bronze_ore', qty: 3 }, { id: 'coal', qty: 1 }] },
  { id: 'steel_plate', profession: 'smithing', name: 'Steel Plate', zh: '钢板', outputType: 'Material', level: 4, exp: 50, meso: 70, resale: 160, ingredients: [{ id: 'steel_ore', qty: 3 }, { id: 'coal', qty: 2 }, { id: 'screw', qty: 1 }] },
  { id: 'mithril_plate', profession: 'smithing', name: 'Mithril Plate', zh: '秘银板', outputType: 'Material', level: 6, exp: 82, meso: 120, resale: 280, ingredients: [{ id: 'mithril_ore', qty: 3 }, { id: 'coal', qty: 2 }, { id: 'screw', qty: 1 }] },
  { id: 'training_sword', profession: 'weaponcrafting', name: 'Training Sword', zh: '练习剑', outputType: 'Equipment', level: 1, exp: 22, meso: 25, resale: 95, ingredients: [{ id: 'iron_ore', qty: 2 }, { id: 'processed_wood', qty: 1 }] },
  { id: 'bronze_spear', profession: 'weaponcrafting', name: 'Bronze Spear', zh: '青铜枪', outputType: 'Equipment', level: 2, exp: 32, meso: 45, resale: 120, ingredients: [{ id: 'bronze_ore', qty: 3 }, { id: 'processed_wood', qty: 2 }] },
  { id: 'steel_blade', profession: 'weaponcrafting', name: 'Steel Blade', zh: '钢制刀刃', outputType: 'Equipment', level: 4, exp: 58, meso: 80, resale: 210, ingredients: [{ id: 'steel_ore', qty: 4 }, { id: 'screw', qty: 1 }, { id: 'leather', qty: 1 }] },
  { id: 'linen_patch', profession: 'tailoring', name: 'Linen Patch', zh: '亚麻补片', outputType: 'Material', level: 1, exp: 18, meso: 20, resale: 70, ingredients: [{ id: 'linen_cloth', qty: 3 }] },
  { id: 'silk_wrap', profession: 'tailoring', name: 'Silk Wrap', zh: '丝绸卷', outputType: 'Material', level: 3, exp: 38, meso: 50, resale: 130, ingredients: [{ id: 'silk_thread', qty: 3 }, { id: 'linen_cloth', qty: 2 }] },
  { id: 'enchanted_lining', profession: 'tailoring', name: 'Enchanted Lining', zh: '魔化内衬', outputType: 'Material', level: 5, exp: 70, meso: 95, resale: 240, ingredients: [{ id: 'enchanted_thread', qty: 2 }, { id: 'magic_powder', qty: 1 }] },
  { id: 'wooden_handle', profession: 'woodcrafting', name: 'Wooden Handle', zh: '木柄', outputType: 'Material', level: 1, exp: 19, meso: 15, resale: 65, ingredients: [{ id: 'branch', qty: 4 }] },
  { id: 'processed_wood_recipe', profession: 'woodcrafting', name: 'Processed Wood', zh: '加工木材', outputType: 'Material', level: 2, exp: 30, meso: 30, resale: 120, ingredients: [{ id: 'firewood', qty: 4 }, { id: 'branch', qty: 2 }] },
  { id: 'bow_frame', profession: 'woodcrafting', name: 'Bow Frame', zh: '弓身', outputType: 'Equipment', level: 4, exp: 55, meso: 65, resale: 190, ingredients: [{ id: 'processed_wood', qty: 3 }, { id: 'stiff_feather', qty: 2 }, { id: 'screw', qty: 1 }] },
  { id: 'animal_fur_bundle', profession: 'leatherworking', name: 'Animal Fur Bundle', zh: '动物皮毛包', outputType: 'Material', level: 1, exp: 18, meso: 20, resale: 70, ingredients: [{ id: 'animal_skin', qty: 3 }] },
  { id: 'processed_leather', profession: 'leatherworking', name: 'Processed Leather', zh: '加工皮革', outputType: 'Material', level: 3, exp: 36, meso: 45, resale: 130, ingredients: [{ id: 'animal_skin', qty: 5 }, { id: 'stiff_feather', qty: 1 }] },
  { id: 'leather_guard', profession: 'leatherworking', name: 'Leather Guard', zh: '皮革护具', outputType: 'Equipment', level: 5, exp: 72, meso: 100, resale: 245, ingredients: [{ id: 'leather', qty: 3 }, { id: 'screw', qty: 1 }] },
  { id: 'minor_catalyst', profession: 'arcforge', name: 'Minor Catalyst', zh: '小型催化剂', outputType: 'Material', level: 1, exp: 24, meso: 90, resale: 100, ingredients: [{ id: 'magic_powder', qty: 1 }, { id: 'coal', qty: 1 }] },
  { id: 'parchment_refine', profession: 'arcforge', name: 'Processed Parchment', zh: '加工羊皮纸', outputType: 'Material', level: 2, exp: 32, meso: 80, resale: 120, ingredients: [{ id: 'parchment', qty: 1 }, { id: 'magic_powder', qty: 1 }] },
  { id: 'crystal_focus', profession: 'arcforge', name: 'Crystal Focus', zh: '水晶核心', outputType: 'Material', level: 3, exp: 48, meso: 130, resale: 180, ingredients: [{ id: 'crystal_shard', qty: 1 }, { id: 'magic_powder', qty: 1 }, { id: 'catalyst', qty: 1 }] },
  { id: 'monster_crystal_refine', profession: 'arcforge', name: 'Monster Crystal Refine', zh: '怪物结晶精炼', outputType: 'Material', level: 5, exp: 76, meso: 180, resale: 300, ingredients: [{ id: 'monster_crystal', qty: 1 }, { id: 'catalyst', qty: 1 }, { id: 'magic_powder', qty: 2 }] },
];

function byId(id) {
  return ITEMS[id] || { id, name: id, zh: id, source: 'unknown', rarity: 1, basePrice: 999 };
}

function iconForProfession(profession) {
  return `${ICON_BASE}${profession.icon}`;
}

function iconForItem(item) {
  if (item.icon) return `${ICON_BASE}${item.icon}`;
  if (item.id === 'leather') return `${ICON_BASE}processed_leather.png`;
  if (item.id === 'processed_wood') return `${ICON_BASE}processed_leather.png`;
  if (item.id.includes('thread')) return `${ICON_BASE}spool_of_thread.png`;
  return '';
}

function sourceLabel(source) {
  if (source === 'drop') return '怪物掉落';
  if (source === 'crafted') return '制作中间件';
  if (source === 'npc') return 'NPC/消耗';
  return '未知';
}

function itemCost(itemId, mode) {
  const item = byId(itemId);
  const sourcePenalty = {
    cheapest: { drop: 1, crafted: 1.1, npc: 1, unknown: 1.4 },
    fastest: { drop: 1.15, crafted: 1.05, npc: 0.95, unknown: 1.5 },
    farm: { drop: 0.55, crafted: 0.75, npc: 4, unknown: 3 },
    balanced: { drop: 0.9, crafted: 1, npc: 1.35, unknown: 1.8 },
  }[mode] || {};
  return item.basePrice * (sourcePenalty[item.source] || 1.5) * (1 + item.rarity * 0.08);
}

function recipeCost(recipe, mode) {
  const materialCost = recipe.ingredients.reduce((sum, ing) => sum + itemCost(ing.id, mode) * ing.qty, 0);
  const rarityPenalty = recipe.ingredients.reduce((sum, ing) => sum + byId(ing.id).rarity * ing.qty * (mode === 'farm' ? 30 : 12), 0);
  const resaleCredit = mode === 'cheapest' || mode === 'balanced' ? (recipe.resale || 0) * 0.6 : (recipe.resale || 0) * 0.25;
  return Math.max(1, recipe.meso + materialCost + rarityPenalty - resaleCredit);
}

function rankRecipe(recipe, mode) {
  const cost = recipeCost(recipe, mode);
  if (mode === 'fastest') return recipe.exp * 1000 - cost * 0.15;
  if (mode === 'farm') return recipe.exp / cost - recipe.ingredients.filter((ing) => byId(ing.id).source === 'npc').length * 0.02;
  return recipe.exp / cost;
}

function aggregateMaterials(target, ingredients, times = 1) {
  ingredients.forEach((ing) => {
    const item = byId(ing.id);
    if (!target[ing.id]) target[ing.id] = { id: ing.id, name: item.name, zh: item.zh, qty: 0 };
    target[ing.id].qty += ing.qty * times;
  });
}

function simulateLeveling(professionId, mode, startLevel, targetLevel) {
  let level = Number(startLevel);
  const goal = Number(targetLevel);
  const steps = [];
  const totalMaterials = {};
  let totalCost = 0;
  let totalCrafts = 0;

  while (level < goal) {
    const expNeeded = MASTERY_TABLE.find((row) => row.level === level)?.expToNext || 1000;
    const unlocked = RECIPES.filter((r) => r.profession === professionId && r.level <= level && r.exp > 0);
    if (!unlocked.length) break;
    const best = [...unlocked].sort((a, b) => rankRecipe(b, mode) - rankRecipe(a, mode))[0];
    const crafts = Math.ceil(expNeeded / best.exp);
    const costEach = recipeCost(best, mode);
    const stepCost = Math.round(costEach * crafts);
    aggregateMaterials(totalMaterials, best.ingredients, crafts);
    totalCost += stepCost;
    totalCrafts += crafts;
    steps.push({ from: level, to: level + 1, recipe: best, crafts, costEach: Math.round(costEach), stepCost });
    level += 1;
  }

  return { steps, totalMaterials, totalCost, totalCrafts };
}

function materialRanking(professionId = 'all') {
  const scoped = professionId === 'all' ? RECIPES : RECIPES.filter((recipe) => recipe.profession === professionId);
  const stats = {};
  scoped.forEach((recipe) => {
    recipe.ingredients.forEach((ing) => {
      const item = byId(ing.id);
      if (!stats[ing.id]) stats[ing.id] = { itemId: ing.id, name: item.name, zh: item.zh, totalQty: 0, recipes: new Set(), professions: new Set(), highLevelUse: 0 };
      stats[ing.id].totalQty += ing.qty;
      stats[ing.id].recipes.add(recipe.id);
      stats[ing.id].professions.add(recipe.profession);
      stats[ing.id].highLevelUse += ing.qty * recipe.level;
    });
  });
  const rows = Object.values(stats).map((row) => {
    const item = byId(row.itemId);
    const rawScore = row.totalQty * 2 + row.recipes.size * 8 + row.professions.size * 12 + row.highLevelUse + item.rarity * 10;
    return { ...row, item, score: rawScore, recipeCount: row.recipes.size, professionCount: row.professions.size };
  });
  const maxScore = Math.max(1, ...rows.map((row) => row.score));
  return rows.map((row) => ({ ...row, score: Math.round((row.score / maxScore) * 100) })).sort((a, b) => b.score - a.score || b.totalQty - a.totalQty);
}

function formatMeso(value) {
  return `${Math.round(value || 0).toLocaleString()} meso`;
}

function MaterialIcon({ item, size = 26 }) {
  const src = iconForItem(item);
  return <span className="mg-craft-icon" style={{ width: size, height: size }}>{src ? <img src={src} alt="" /> : <span>{String(item.zh || item.name || '?').slice(0, 1)}</span>}</span>;
}

function ProfessionIcon({ profession, size = 28 }) {
  return <span className="mg-craft-icon" style={{ width: size, height: size }}><img src={iconForProfession(profession)} alt="" /></span>;
}

export default function CraftingMaterialsPage() {
  const [profession, setProfession] = useState('smithing');
  const [mode, setMode] = useState('cheapest');
  const [startLevel, setStartLevel] = useState(1);
  const [targetLevel, setTargetLevel] = useState(10);
  const selectedProfession = PROFESSIONS.find((p) => p.id === profession) || PROFESSIONS[0];
  const professionRecipes = RECIPES.filter((r) => r.profession === selectedProfession.id);
  const route = useMemo(() => simulateLeveling(selectedProfession.id, mode, startLevel, targetLevel), [selectedProfession.id, mode, startLevel, targetLevel]);
  const rankedMaterials = useMemo(() => materialRanking(selectedProfession.id), [selectedProfession.id]);
  const globalMaterials = useMemo(() => materialRanking('all'), []);

  return <section className="mg-dashboard mg-materials-dashboard">
    <h1 className="mg-dashboard-title">MapleGuide: 材料与锻造路线</h1>
    <p className="mg-dashboard-subtitle">用 MCW Crafting 的路线思路，接入 Guidebook 的卡片 UI。</p>

    <div className="mg-material-controls mg-glass-panel">
      <label>专业</label>
      <select className="mg-select" value={selectedProfession.id} onChange={(e) => setProfession(e.target.value)}>
        {PROFESSIONS.map((p) => <option key={p.id} value={p.id}>{p.zh} · {p.name}</option>)}
      </select>
      <label>路线</label>
      <select className="mg-select" value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="cheapest">最低成本</option>
        <option value="balanced">均衡路线</option>
        <option value="farm">刷怪友好</option>
        <option value="fastest">最快升级</option>
      </select>
      <label>起点</label>
      <select className="mg-select" value={startLevel} onChange={(e) => setStartLevel(Number(e.target.value))}>
        {MASTERY_TABLE.slice(0, 9).map((row) => <option key={row.level} value={row.level}>Lv.{row.level}</option>)}
      </select>
      <label>目标</label>
      <select className="mg-select" value={targetLevel} onChange={(e) => setTargetLevel(Number(e.target.value))}>
        {MASTERY_TABLE.slice(1).map((row) => <option key={row.level} value={row.level}>Lv.{row.level}</option>)}
      </select>
    </div>

    <div className="mg-material-grid">
      <Panel title="专业概览" meta={selectedProfession.name} icon={<ProfessionIcon profession={selectedProfession} />}>
        <p className="mg-material-copy">{selectedProfession.description}</p>
        <div className="mg-material-stat-row"><strong>{professionRecipes.length}</strong><span>当前专业配方</span></div>
        <div className="mg-material-stat-row"><strong>{route.totalCrafts}</strong><span>推荐路线制作次数</span></div>
        <p className="mg-material-summary">估算成本 {formatMeso(route.totalCost)}</p>
      </Panel>

      <Panel title="升级路线" meta={`Lv.${startLevel} → Lv.${targetLevel}`}>
        <div className="mg-material-route-list">
          {route.steps.slice(0, 8).map((step) => <article key={`${step.from}-${step.recipe.id}`} className="mg-material-route-row">
            <strong>Lv.{step.from}→{step.to}</strong>
            <span>{step.recipe.zh || step.recipe.name}</span>
            <em>x{step.crafts}</em>
          </article>)}
        </div>
      </Panel>

      <Panel title="本专业材料" meta="价值分">
        <div className="mg-material-rank-list">
          {rankedMaterials.slice(0, 8).map((row, index) => <article key={row.itemId} className="mg-material-rank-row with-icon">
            <MaterialIcon item={row.item} />
            <span>#{index + 1} {row.zh || row.name}</span>
            <em>{row.score}</em>
          </article>)}
        </div>
      </Panel>

      <Panel title="全局囤货" meta="跨专业">
        <div className="mg-material-rank-list">
          {globalMaterials.slice(0, 8).map((row, index) => <article key={row.itemId} className="mg-material-rank-row with-icon">
            <MaterialIcon item={row.item} />
            <span>#{index + 1} {row.zh || row.name}</span>
            <em>{row.professionCount}系</em>
          </article>)}
        </div>
      </Panel>
    </div>

    <section className="mg-glass-panel mg-material-recipes-panel">
      <div className="mg-material-panel-head"><h2>当前路线材料需求</h2><span>按数量排序</span></div>
      <div className="mg-material-chip-list">
        {Object.values(route.totalMaterials).sort((a, b) => b.qty - a.qty).map((item) => <span key={item.id} className="mg-material-chip"><MaterialIcon item={byId(item.id)} size={20} />{item.zh || item.name} x{item.qty}</span>)}
      </div>
    </section>

    <section className="mg-glass-panel mg-material-recipes-panel">
      <div className="mg-material-panel-head"><h2>{selectedProfession.zh}配方表</h2><span>{professionRecipes.length} 条</span></div>
      <div className="mg-material-recipe-grid">
        {professionRecipes.map((recipe) => <article key={recipe.id} className="mg-material-recipe-card">
          <strong>{recipe.zh || recipe.name}</strong>
          <span>Lv.{recipe.level} · EXP {recipe.exp} · {formatMeso(recipe.meso)}</span>
          <p>{recipe.ingredients.map((ing) => `${byId(ing.id).zh || byId(ing.id).name} x${ing.qty}`).join(' / ')}</p>
        </article>)}
      </div>
    </section>

    <p className="mg-footer">© 2026 MapleGuide | Materials module based on MCW Crafting logic</p>
  </section>;
}

function Panel({ title, meta, icon, children }) {
  return <section className="mg-material-panel">
    <div className="mg-material-panel-head"><h2>{icon}{title}</h2>{meta && <span>{meta}</span>}</div>
    {children}
  </section>;
}
