const FIRST_JOB_START_LEVEL = 10;
const FIRST_JOB_CAP_LEVEL = 30;

const CLASS_NAMES = {
  warrior: ['warrior'], fighter: ['fighter'], page: ['page'], spearman: ['spearman'],
  magician: ['magician', 'mage'], fp: ['f/p wizard', 'fire poison wizard', 'fire/poison wizard'], il: ['ice lightning wizard', 'ice/lightning wizard'], cleric: ['cleric'],
  bowman: ['archer', 'bowman'], hunter: ['hunter'], crossbowman: ['crossbowman', 'crossbow man'],
  thief: ['rogue', 'thief'], assassin: ['assassin'], bandit: ['bandit'],
  pirate: ['pirate'], brawler: ['brawler'], gunslinger: ['gunslinger'],
};

const FALLBACK_FIRST = {
  warrior: [['Power Strike', 20], ['Slash Blast', 20], ['Improved HP Recovery', 15, 3], ['Max HP Increase', 15], ['Precise Strikes', 15], ['Iron Body', 20]],
  magician: [['Energy Bolt', 20], ['Improved MP Recovery', 15, 5], ['Max MP Increase', 10], ['Magic Claw', 20], ['Magic Guard', 20], ['Magic Armor', 20]],
  bowman: [['Critical Shot', 20], ['The Eye of Amazon', 8], ['Double Shot', 20], ['Arrow Blow', 20], ['Focus', 20], ["Amazon's Judgement", 20]],
  thief: [['Lucky Seven', 20], ['Keen Eyes', 8], ['Double Stab', 20], ['Nimble Body', 20], ['Dark Sight', 20], ['Disorder', 20]],
  pirate: [['Basic Attack', 1]],
};

const FALLBACK_SECOND = {
  fighter: [['Sword Mastery', 20], ['Sword Booster', 20], ['Rage', 30], ['Final Attack: Sword', 30], ['Power Guard', 30]],
  page: [['Sword Mastery', 20], ['Sword Booster', 20], ['Threaten', 20], ['Final Attack: Sword', 30], ['Power Guard', 30]],
  spearman: [['Spear Mastery', 20], ['Spear Booster', 20], ['Hyper Body', 30], ['Iron Will', 20], ['Final Attack: Spear', 30]],
  fp: [['Fire Arrow', 30], ['Meditation', 20], ['Teleport', 20], ['MP Eater', 20], ['Slow', 20], ['Poison Breath', 30]],
  il: [['Thunder Bolt', 30], ['Cold Beam', 30], ['Meditation', 20], ['Teleport', 20], ['MP Eater', 20], ['Slow', 20]],
  cleric: [['Heal', 30], ['Bless', 20], ['Teleport', 20], ['MP Eater', 20], ['Invincible', 20], ['Holy Arrow', 30]],
  hunter: [['Bow Mastery', 20], ['Bow Booster', 20], ['Arrow Bomb: Bow', 30], ['Power Knockback', 20], ['Soul Arrow: Bow', 20], ['Final Attack: Bow', 30]],
  crossbowman: [['Crossbow Mastery', 20], ['Crossbow Booster', 20], ['Iron Arrow: Crossbow', 30], ['Power Knockback', 20], ['Soul Arrow: Crossbow', 20], ['Final Attack: Crossbow', 30]],
  assassin: [['Claw Mastery', 20], ['Critical Throw', 30], ['Claw Booster', 20], ['Haste', 20], ['Drain', 30], ['Critical Recovery', 20]],
  bandit: [['Dagger Mastery', 20], ['Dagger Booster', 20], ['Savage Blow', 30], ['Haste', 20], ['Steal', 30], ['Nimble Recovery', 20]],
};

const SECOND_ORDER = Object.fromEntries(Object.entries(FALLBACK_SECOND).map(([key, list]) => [key, list.map((item) => item[0])]));
const DAMAGE_NAMES = new Set(['Power Strike', 'Slash Blast', 'Energy Bolt', 'Magic Claw', 'Fire Arrow', 'Poison Breath', 'Cold Beam', 'Thunder Bolt', 'Heal', 'Holy Arrow', 'Arrow Blow', 'Double Shot', 'Power Knockback', 'Arrow Bomb: Bow', 'Iron Arrow: Crossbow', 'Double Stab', 'Lucky Seven', 'Drain', 'Savage Blow']);

function norm(value) {
  return String(value ?? '').toLowerCase().replace(/[()]/g, ' ').replace(/[^a-z0-9/]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function lowIntent({ budget, mode, priority }) {
  return budget === 'low' || mode === 'safe' || priority === 'meso';
}
function chooseRoute({ classId, branchId, budget = 'mid', mode = 'normal', priority = 'stable' }) {
  const low = lowIntent({ budget, mode, priority });
  const exp = priority === 'exp' || mode === 'fast' || budget === 'high';
  if (classId === 'magician' && low && !exp) return { id: 'magician_energy_bolt', firstOrder: ['Energy Bolt', 'Improved MP Recovery', 'Max MP Increase', 'Magic Guard', 'Magic Armor', 'Magic Claw'], caps: { 'Improved MP Recovery': 5 }, excludes: new Set(['Magic Claw']), copy: '低资金省蓝法师路线：Energy Bolt 是最终选择，不再延后或切回 Magic Claw。' };
  if (classId === 'magician') return { id: 'magician_magic_claw', firstOrder: ['Energy Bolt', 'Improved MP Recovery', 'Max MP Increase', 'Magic Claw', 'Magic Guard', 'Magic Armor'], caps: { 'Energy Bolt': 1, 'Improved MP Recovery': 5 }, excludes: new Set(), copy: '标准法师路线：Energy Bolt 只作前置，Magic Claw 作为一转主攻。' };
  if (classId === 'bowman' && low && !exp) return { id: 'bowman_arrow_blow', firstOrder: ['Critical Shot', 'The Eye of Amazon', 'Arrow Blow', 'Focus', "Amazon's Judgement", 'Double Shot'], caps: {}, excludes: new Set(['Double Shot']), copy: '弓箭手低耗路线：Arrow Blow 与 Double Shot 互斥，当前锁定 Arrow Blow。' };
  if (classId === 'bowman') return { id: 'bowman_double_shot', firstOrder: ['Critical Shot', 'The Eye of Amazon', 'Double Shot', 'Focus', "Amazon's Judgement", 'Arrow Blow'], caps: {}, excludes: new Set(['Arrow Blow']), copy: '弓箭手主流路线：Double Shot 与 Arrow Blow 互斥，当前锁定 Double Shot。' };
  if (classId === 'thief' && branchId === 'bandit' && low && !exp) return { id: 'thief_double_stab', firstOrder: ['Double Stab', 'Nimble Body', 'Dark Sight', 'Disorder', 'Lucky Seven', 'Keen Eyes'], caps: {}, excludes: new Set(['Lucky Seven', 'Keen Eyes']), copy: '低资金侠客路线：不默认临时买拳套/飞镖，使用 Double Stab 过渡。' };
  if (classId === 'thief') return { id: 'thief_lucky_seven', firstOrder: ['Lucky Seven', 'Keen Eyes', 'Nimble Body', 'Dark Sight', 'Disorder', 'Double Stab'], caps: {}, excludes: new Set(['Double Stab']), copy: '飞侠远程过渡路线：即使二转 Bandit，一转也可用 Lucky Seven 提升练级体验。' };
  return { id: 'default', firstOrder: (FALLBACK_FIRST[classId] ?? []).map((item) => item[0]), caps: { 'Improved HP Recovery': 3 }, excludes: new Set(), copy: '按当前职业阶段选择主输出、命中/精通、机动和生存技能。' };
}
function firstJobPoints(level) {
  const capped = Math.min(Number(level) || 0, FIRST_JOB_CAP_LEVEL);
  return capped < FIRST_JOB_START_LEVEL ? 0 : (capped - FIRST_JOB_START_LEVEL) * 3 + 1;
}
function secondJobPoints(level) { return Number(level) > FIRST_JOB_CAP_LEVEL ? (Number(level) - FIRST_JOB_CAP_LEVEL) * 3 : 0; }
function isFirstJobGroup(group) { return /1st|first/i.test(String(group?.job ?? group?.job_name ?? '')); }
function isSecondJobGroup(group) { return /2nd|second/i.test(String(group?.job ?? group?.job_name ?? '')); }
function matchesClass(group, classId) {
  const wanted = new Set((CLASS_NAMES[classId] ?? [classId]).map(norm));
  return [group?.className, group?.class_name, group?.baseClass, group?.baseClassLabel, group?.mainClass].map(norm).some((name) => wanted.has(name));
}
function stats(entry) { return entry?.allLevelStats ?? entry?.all_level_stats ?? entry?.levelStats ?? []; }
function dep(description = '') { const match = String(description).match(/Required Skill:\s*At least Level\s*(\d+)\s*on\s*([^\n]+)/i); return match ? { level: Number(match[1]) || 0, name: match[2].trim() } : null; }
function rowFromOfficial(entry, group, tier, locked) {
  const max = Number(entry?.maxLevel ?? entry?.max_level ?? entry?.max ?? 0);
  return { name: entry?.name ?? `Skill ${entry?.id ?? ''}`.trim(), id: String(entry?.id ?? ''), max, maxLevel: max, planCap: max, iconKey: entry?.thumbnail ?? '', thumbnail: entry?.thumbnail ?? '', tier, tierLabel: tier === 'first' ? '1st Job' : '2nd Job', locked, source: 'official', description: entry?.description ?? '', allLevelStats: stats(entry), all_level_stats: stats(entry), requiredDependency: dep(entry?.description ?? '') };
}
function rowFromFallback(entry, tier, locked) { return { name: entry[0], max: entry[1], maxLevel: entry[1], planCap: entry[2] ?? entry[1], iconKey: '', thumbnail: '', tier, tierLabel: tier === 'first' ? '一转' : '二转', locked, source: 'fallback', allLevelStats: [] }; }
function sortByOrder(rows, order = []) {
  const rank = new Map(order.map((name, index) => [name, index]));
  return [...rows].sort((a, b) => (rank.has(a.name) ? rank.get(a.name) : 999) - (rank.has(b.name) ? rank.get(b.name) : 999) || String(a.id ?? a.name).localeCompare(String(b.id ?? b.name)));
}
function buildRows({ classId, branchId, level, skillGroups = [], policy }) {
  const secondUnlocked = Number(level) > FIRST_JOB_CAP_LEVEL;
  if (Array.isArray(skillGroups) && skillGroups.length) {
    const first = skillGroups.filter((group) => isFirstJobGroup(group) && matchesClass(group, classId)).flatMap((group) => sortByOrder(group.skills ?? [], policy.firstOrder).map((entry) => rowFromOfficial(entry, group, 'first', false)));
    const second = skillGroups.filter((group) => isSecondJobGroup(group) && matchesClass(group, branchId)).flatMap((group) => sortByOrder(group.skills ?? [], SECOND_ORDER[branchId]).map((entry) => rowFromOfficial(entry, group, 'second', !secondUnlocked)));
    if (first.length || second.length) return [...first, ...second].filter((row) => row.max > 0);
  }
  const first = sortByOrder((FALLBACK_FIRST[classId] ?? FALLBACK_FIRST.warrior).map((entry) => rowFromFallback(entry, 'first', false)), policy.firstOrder);
  const second = sortByOrder((FALLBACK_SECOND[branchId] ?? []).map((entry) => rowFromFallback(entry, 'second', !secondUnlocked)), SECOND_ORDER[branchId]);
  return [...first, ...second];
}
function cap(row, policy) { return policy.excludes.has(row.name) ? 0 : Math.min(row.max, Number(policy.caps[row.name] ?? row.planCap ?? row.max) || 0); }
function depMet(row, byName) { return !row.requiredDependency?.name || Number(byName.get(row.requiredDependency.name)?.level ?? 0) >= row.requiredDependency.level; }
function addPoints(rows, total, policy, order) {
  let left = Math.max(0, Number(total) || 0);
  const byName = new Map(rows.map((row) => [row.name, row]));
  for (const row of sortByOrder(rows, order)) {
    if (!left || row.locked || !depMet(row, byName)) continue;
    const add = Math.min(left, Math.max(0, cap(row, policy) - row.level));
    row.level += add; left -= add;
  }
  for (const row of sortByOrder(rows, order)) {
    if (!left || row.locked || policy.excludes.has(row.name) || !depMet(row, byName)) continue;
    const add = Math.min(left, Math.max(0, row.max - row.level));
    row.level += add; left -= add;
  }
}
function distribute(rows, totals, policy) {
  const out = rows.map((row) => ({ ...row, level: 0, excludedByRoute: policy.excludes.has(row.name) }));
  addPoints(out.filter((row) => row.tier === 'first'), totals.first, policy, policy.firstOrder);
  addPoints(out.filter((row) => row.tier === 'second'), totals.second, { ...policy, caps: {}, excludes: new Set() }, SECOND_ORDER[policy.branchId]);
  return out;
}
function sanitize(rows, totals, custom, policy) {
  const out = rows.map((row) => ({ ...row, level: 0, excludedByRoute: policy.excludes.has(row.name) }));
  const left = { first: totals.first, second: totals.second };
  for (const row of out) {
    if (row.locked) continue;
    const value = Math.min(Math.max(0, Number(custom?.[row.name] ?? 0) || 0), row.max, left[row.tier]);
    row.level = value; left[row.tier] -= value;
  }
  addPoints(out.filter((row) => row.tier === 'first' && row.level < row.max), left.first, policy, policy.firstOrder);
  addPoints(out.filter((row) => row.tier === 'second' && row.level < row.max), left.second, { ...policy, caps: {}, excludes: new Set() }, SECOND_ORDER[policy.branchId]);
  return out;
}
function context(args = {}) {
  const policy = chooseRoute(args);
  policy.branchId = args.branchId;
  const rows = buildRows({ ...args, policy });
  return { policy, rows, totals: { first: firstJobPoints(args.level), second: secondJobPoints(args.level) } };
}
export function getRecommendedSkillAllocation(args = {}) {
  const config = context(args);
  return Object.fromEntries(distribute(config.rows, config.totals, config.policy).map((row) => [row.name, row.level]));
}
function remain(skills, totals) {
  const used = skills.reduce((sum, row) => ({ ...sum, [row.tier]: (sum[row.tier] ?? 0) + row.level }), { first: 0, second: 0 });
  return { first: Math.max(0, totals.first - used.first), second: Math.max(0, totals.second - used.second) };
}
function nextSteps(skills, totals, level, policy) {
  const remaining = remain(skills, totals);
  const tier = remaining.second > 0 ? 'second' : 'first';
  const order = tier === 'first' ? policy.firstOrder : SECOND_ORDER[policy.branchId];
  const target = sortByOrder(skills.filter((row) => row.tier === tier && !row.locked && !row.excludedByRoute && row.level < row.max), order)[0];
  return target ? [0, 1, 2, 3].map((offset) => ({ level: Number(level) + offset, name: `${target.name} x3` })) : [];
}
function effect(row) { return String((row.allLevelStats ?? row.all_level_stats ?? [])[Math.max(0, row.level - 1)] ?? ''); }
function parseDamage(text) {
  const multi = String(text).match(/Attack\s+(\d+)x\s+with\s+(\d+(?:\.\d+)?)%\s+damage/i);
  if (multi) return { hits: Number(multi[1]), ratio: Number(multi[2]) / 100 };
  const percent = String(text).match(/damage\s+(\d+(?:\.\d+)?)%/i);
  return percent ? { hits: 1, ratio: Number(percent[1]) / 100 } : null;
}
function damageCards(skills, mainAttack = 0) {
  const baseMin = Math.max(1, Math.round(mainAttack * 0.62));
  const baseMax = Math.max(baseMin + 1, Math.round(mainAttack * 1.18));
  const cards = skills.filter((row) => row.level > 0 && !row.locked && DAMAGE_NAMES.has(row.name)).map((row) => {
    const currentEffect = effect(row);
    const damage = parseDamage(currentEffect) ?? { hits: ['Magic Claw', 'Double Shot', 'Lucky Seven'].includes(row.name) ? 2 : 1, ratio: Math.max(0.5, row.level / Math.max(1, row.max)) };
    const min = Math.max(1, Math.round(mainAttack * damage.ratio * damage.hits * 0.82));
    const max = Math.max(min + 1, Math.round(mainAttack * damage.ratio * damage.hits * 1.18));
    return { name: row.name, role: currentEffect || row.description || row.tierLabel, level: row.level, maxLevel: row.max, iconKey: row.iconKey, min, max, hits: damage.hits };
  }).sort((a, b) => b.max - a.max).slice(0, 6);
  return [{ name: 'Base Attack', role: '普通攻击', level: null, maxLevel: null, min: baseMin, max: baseMax, isBase: true }, ...cards];
}
function statBonuses() { return { stats: { STR: 0, DEX: 0, INT: 0, LUK: 0 }, maxHpPercent: 0, maxMpPercent: 0, accuracy: 0, avoidability: 0, weaponAttack: 0, magicAttack: 0, speed: 0, jump: 0, criticalRate: 0, criticalDamage: 0 }; }
function summary({ level, policy, rows }) {
  const source = rows.some((row) => row.source === 'official') ? '已读取官方 skills.json。' : '官方技能未匹配，使用内置路线。';
  const stage = Number(level) > FIRST_JOB_CAP_LEVEL ? 'Lv.30 以后，一转 SP 已冻结；新 SP 只投入二转技能。' : 'Lv.1-10 统一视为 Beginner；Lv.10 开始获得一转 SP。';
  return `${source} ${stage} ${policy.copy}`;
}
export function getSkillPlan(args = {}) {
  const config = context(args);
  const skills = args.customSkills ? sanitize(config.rows, config.totals, args.customSkills, config.policy) : distribute(config.rows, config.totals, config.policy);
  const usedSp = skills.reduce((sum, row) => sum + row.level, 0);
  const totalSp = config.totals.first + config.totals.second;
  return { summary: summary({ level: args.level, policy: config.policy, rows: config.rows }), routeId: config.policy.id, routeNote: config.policy.copy, skills, current: skills.filter((row) => row.level > 0), next: nextSteps(skills, config.totals, args.level, config.policy), damageCards: damageCards(skills, Number(args.mainAttack) || 0), totalSp, totalSpByTier: config.totals, usedSp, remainingSp: Math.max(0, totalSp - usedSp), remainingByTier: remain(skills, config.totals), statBonuses: statBonuses(skills) };
}
export function getApNote({ classLine, budget } = {}) {
  const primary = classLine?.primaryStat ?? '主属性';
  const secondary = classLine?.secondaryStat ?? '副属性';
  const prefix = budget === 'low' ? '低资金 AP：' : 'AP：';
  return `${prefix}当前建议继续优先 ${primary}；${secondary} 只在命中或装备需求不足时补。`;
}
