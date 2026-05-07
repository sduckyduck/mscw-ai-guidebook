import { useEffect, useMemo, useState } from 'react';
import CharacterPreview from './components/CharacterPreview.jsx';
import { CLASS_LINES, EDITIONS } from './data/classes.js';
import { PROFESSIONS } from './data/crafting.js';
import { buildLowCostRoute, getMaterialValueIndex } from './engine/craftingEngine.js';
import { selectGear } from './engine/gearSelector.js';
import { buildStatPlan } from './engine/levelEngine.js';
import { getMapRecommendations } from './engine/recommendationEngine.js';
import { loadOfficialGuideData } from './engine/officialDataAdapter.js';

const TABS = [
  ['overview', '总览'], ['character', '角色'], ['maps', '地图'], ['gear', '装备'], ['materials', '材料'],
];
const JOBS = [['warrior', '战士'], ['magician', '魔法师'], ['bowman', '弓箭手'], ['thief', '飞侠']].map(([id, name]) => ({ id, name }));
const BUDGETS = [['low', '低资金'], ['mid', '普通'], ['high', '有钱']].map(([id, name]) => ({ id, name }));
const PRIORITIES = [['stable', '稳定'], ['exp', '经验'], ['material', '材料'], ['meso', '金币']].map(([id, name]) => ({ id, name }));

export default function AppGearFixed() {
  const [activeTab, setActiveTab] = useState('overview');
  const [editionId, setEditionId] = useState('global');
  const [classId, setClassId] = useState('magician');
  const [branchId, setBranchId] = useState('magician');
  const [gender, setGender] = useState('female');
  const [level, setLevel] = useState(25);
  const [budget, setBudget] = useState('low');
  const [priority, setPriority] = useState('material');
  const [professionId, setProfessionId] = useState('smithing');
  const [craftLevel, setCraftLevel] = useState(8);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOfficialGuideData().then(setData).catch((err) => setError(err.message || '官方数据读取失败'));
  }, []);

  const edition = EDITIONS.find((item) => item.id === editionId) ?? EDITIONS[0];
  const availableClasses = CLASS_LINES.filter((item) => edition.classIds.includes(item.id));
  const classLine = availableClasses.find((item) => item.id === classId) ?? availableClasses[0];
  const branch = classLine.branches.find((item) => item.id === branchId) ?? classLine.branches[0] ?? classLine;

  useEffect(() => {
    if (!availableClasses.some((item) => item.id === classId)) setClassId(availableClasses[0]?.id ?? 'warrior');
    if (!classLine.branches.some((item) => item.id === branchId)) setBranchId(classLine.branches[0]?.id ?? classLine.id);
  }, [availableClasses, branchId, classId, classLine]);

  const statPlan = useMemo(() => buildStatPlan(classLine, level), [classLine, level]);
  const maps = useMemo(() => getMapRecommendations({ classLine, level, statPlan, maps: data?.maps, monsters: data?.monsters }).slice(0, 8), [classLine, level, statPlan, data]);
  const gear = useMemo(() => selectGear({ classLine, branch, level, budget, gender, statPlan, items: data?.items }), [classLine, branch, level, budget, gender, statPlan, data]);
  const weapon = gear.find((item) => item.slot === 'weapon');
  const mainAttack = calcMainAttack(classLine, statPlan, weapon);
  const stats = compactStats(statPlan, classLine, mainAttack);
  const bestMap = maps[0];
  const bestMonster = bestMap?.monsters?.[0];
  const professions = buildProfessions(data);
  const activeProfession = professions.some((item) => item.id === professionId) ? professionId : professions[0]?.id ?? 'smithing';
  const route = buildLowCostRoute(activeProfession, craftLevel, data?.recipes, data?.materials);
  const materialValue = getMaterialValueIndex(data?.recipes, data?.materials).slice(0, 12);
  const controls = { editionId, setEditionId, classId, setClassId, branchId, setBranchId, gender, setGender, level, setLevel, budget, setBudget, priority, setPriority, availableClasses, classLine };

  return <main className="app-shell">
    <nav className="top-tabs">{TABS.map(([id, name]) => <button key={id} className={activeTab === id ? 'top-tab active' : 'top-tab'} onClick={() => setActiveTab(id)}>{name}</button>)}</nav>
    {activeTab === 'overview' && <><Hero controls={controls} classLine={classLine} gender={gender} level={level} bestMonster={bestMonster} bestMap={bestMap} weapon={weapon} gear={gear} stats={stats} /><NextStep bestMonster={bestMonster} bestMap={bestMap} weapon={weapon} nextAp={classLine.primaryStat} /></>}
    {activeTab === 'character' && <><Parameters {...controls} /><StatsCard stats={stats} nextAp={classLine.primaryStat} classLine={classLine} /></>}
    {activeTab === 'maps' && <MapsPage maps={maps} data={data} />}
    {activeTab === 'gear' && <GearPage gear={gear} />}
    {activeTab === 'materials' && <MaterialsPage professions={professions} professionId={activeProfession} setProfessionId={setProfessionId} craftLevel={craftLevel} setCraftLevel={setCraftLevel} route={route} materialValue={materialValue} />}
    {error && <p className="load-error">官方数据读取提示：{error}</p>}
  </main>;
}

function Hero({ controls, classLine, gender, level, bestMonster, bestMap, weapon, gear, stats }) {
  return <section className="hero-card">
    <h1>Lv.{level} {classLine.name} 开荒驾驶舱</h1>
    <p>优先打 <strong>{bestMonster?.name ?? '推荐怪物'}</strong>，当前命中 {bestMap?.canHitAll ? '稳定' : '偏紧'}，推荐地图 <strong>{bestMap?.name ?? '读取中'}</strong>。</p>
    <CompactControls {...controls} />
    <div className="preview-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(140px, .95fr)', gap: 12, alignItems: 'stretch' }}>
      <div className="preview-frame real-preview-frame" style={{ minHeight: 230 }}><CharacterPreview classLine={classLine} gender={gender} gear={gear} /></div>
      <aside style={{ border: '1px solid var(--border)', borderRadius: 15, background: 'white', padding: 12, minWidth: 0 }}>
        <div style={{ color: 'var(--muted)', fontWeight: 1000, fontSize: 12, marginBottom: 8 }}>角色属性</div><strong style={{ display: 'block', color: 'var(--text)', fontSize: 18, marginBottom: 10 }}>最终属性</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{stats.map(([label, value]) => <MiniStat key={label} label={label} value={value} />)}</div>
      </aside>
      <div className="preview-meta" style={{ gridColumn: '1 / -1' }}><strong>{classLine.name} Lv.{level}</strong><span>{weapon?.title ?? '官方装备读取中'} · 严格装备预览</span></div>
    </div>
  </section>;
}

function CompactControls(props) {
  const { editionId, setEditionId, classId, setClassId, branchId, setBranchId, gender, setGender, level, setLevel, budget, setBudget, priority, setPriority, availableClasses, classLine } = props;
  return <div style={{ marginTop: 18, border: '1px solid rgba(255,255,255,.28)', borderRadius: 18, background: 'rgba(255,255,255,.12)', padding: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}><strong style={{ fontSize: 18 }}>角色参数</strong><span style={{ color: 'rgba(255,255,255,.78)', fontWeight: 900, fontSize: 13 }}>紧凑调整</span></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
      <SmallSelect title="版本" value={editionId} setValue={setEditionId} options={EDITIONS} />
      <SmallSelect title="性别" value={gender} setValue={setGender} options={[{ id: 'male', name: '男' }, { id: 'female', name: '女' }]} />
      <SmallSelect title="职业" value={classId} setValue={setClassId} options={JOBS.filter((job) => availableClasses.some((item) => item.id === job.id))} />
      <SmallSelect title="二转" value={branchId} setValue={setBranchId} options={classLine.branches.map((branch) => ({ id: branch.id, name: branch.name }))} />
      <SmallLevel level={level} setLevel={setLevel} />
      <SmallSelect title="资金" value={budget} setValue={setBudget} options={BUDGETS} />
      <SmallSelect title="优先" value={priority} setValue={setPriority} options={PRIORITIES} wide />
    </div>
  </div>;
}

function SmallSelect({ title, value, setValue, options, wide = false }) { return <div style={{ gridColumn: wide ? '1 / -1' : 'auto', minWidth: 0 }}><div style={{ color: 'rgba(255,255,255,.78)', fontSize: 12, fontWeight: 1000, marginBottom: 6 }}>{title}</div><div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, minmax(0, 1fr))`, gap: 6 }}>{options.map((option) => <button key={option.id} onClick={() => setValue(option.id)} style={{ minHeight: 42, borderRadius: 12, padding: '8px 10px', fontWeight: 1000, fontSize: 14, border: '1px solid rgba(255,255,255,.28)', background: value === option.id ? '#dceee7' : 'rgba(255,255,255,.14)', color: value === option.id ? '#176d5b' : 'white' }}>{option.name}</button>)}</div></div>; }
function SmallLevel({ level, setLevel }) { return <div style={{ minWidth: 0 }}><div style={{ color: 'rgba(255,255,255,.78)', fontSize: 12, fontWeight: 1000, marginBottom: 6 }}>等级</div><div style={{ display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr) 42px', gap: 6 }}><button style={smallLevelButton} onClick={() => setLevel(Math.max(1, level - 1))}>-</button><div style={{ ...smallLevelButton, display: 'grid', placeItems: 'center', background: 'white', color: '#111827', fontSize: 22 }}>{level}</div><button style={smallLevelButton} onClick={() => setLevel(Math.min(120, level + 1))}>+</button></div><input style={{ width: '100%', marginTop: 8, accentColor: '#dceee7' }} type="range" min="1" max="120" value={level} onChange={(event) => setLevel(Number(event.target.value))} /></div>; }
const smallLevelButton = { minHeight: 42, borderRadius: 12, padding: '8px 10px', fontWeight: 1000, fontSize: 14, border: '1px solid rgba(255,255,255,.28)', background: 'rgba(255,255,255,.16)', color: 'white' };
function MiniStat({ label, value }) { return <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '9px 8px', background: '#f8fbf9' }}><span style={{ display: 'block', color: 'var(--muted)', fontWeight: 1000, fontSize: 11 }}>{label}</span><strong style={{ display: 'block', color: 'var(--text)', fontSize: 22, lineHeight: 1.05 }}>{value}</strong></div>; }
function NextStep({ bestMonster, bestMap, weapon, nextAp }) { return <Section title="下一步"><div className="info-list"><Info label="练级" title={`${bestMonster?.name ?? '推荐怪物'} Lv.${bestMonster?.level ?? '-'}`} desc="按当前命中和等级推荐" image={bestMonster?.gif || bestMonster?.thumbnail} /><Info label="地图" title={bestMap?.name ?? '推荐地图读取中'} desc={`${bestMap?.canHitAll ? '安全' : '需补命中'} · 刷怪数 ${bestMap?.spawnTotal ?? '-'}`} /><Info label="装备" title={weapon?.title ?? '职业武器'} desc={weapon?.desc ?? '按当前等级推荐'} image={weapon?.thumbnail} /><Info label="AP" title={nextAp} desc="按当前职业主属性优先" /></div></Section>; }
function Parameters(props) { const { editionId, setEditionId, classId, setClassId, branchId, setBranchId, gender, setGender, level, setLevel, budget, setBudget, priority, setPriority, availableClasses, classLine } = props; return <Section title="角色参数"><Choice title="版本" value={editionId} setValue={setEditionId} options={EDITIONS} /><Choice title="职业" value={classId} setValue={setClassId} options={JOBS.filter((job) => availableClasses.some((item) => item.id === job.id))} /><Choice title="二转方向" value={branchId} setValue={setBranchId} options={classLine.branches.map((branch) => ({ id: branch.id, name: branch.name }))} /><Choice title="性别" value={gender} setValue={setGender} options={[{ id: 'male', name: '男' }, { id: 'female', name: '女' }]} /><div className="level-control"><h3>等级</h3><div className="level-row"><button className="level-btn" onClick={() => setLevel(Math.max(1, level - 1))}>-</button><input className="level-input" value={level} readOnly /><button className="level-btn" onClick={() => setLevel(Math.min(120, level + 1))}>+</button></div><input className="level-slider" type="range" min="1" max="120" value={level} onChange={(event) => setLevel(Number(event.target.value))} /></div><Choice title="资金" value={budget} setValue={setBudget} options={BUDGETS} /><Choice title="优先级" value={priority} setValue={setPriority} options={PRIORITIES} /></Section>; }
function Choice({ title, value, setValue, options }) { return <div className="control-block"><h3>{title}</h3><div className="option-grid two">{options.map((option) => <button key={option.id} className={value === option.id ? 'option-btn active' : 'option-btn'} onClick={() => setValue(option.id)}>{option.name}</button>)}</div></div>; }
function StatsCard({ stats, nextAp, classLine }) { return <Section title="最终属性"><div className="stat-stack">{stats.map(([label, value]) => <div className="stat-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="next-ap-note"><strong>下一点 AP：{nextAp}</strong><span>当前建议主 {classLine.primaryStat}，{classLine.secondaryStat} 只保留装备需求。</span></div></Section>; }
function MapsPage({ maps, data }) { return <Section title="推荐地图"><p className="section-copy">{data ? '已使用官方 AppData 的怪物与地图数据。' : '正在读取官方数据。'}</p><div className="map-stack">{maps.map((map) => <article className="map-result" key={map.id}><div className="map-result-main"><div><span className="item-label">Lv.{map.levelRange[0]}-{map.levelRange[1]} · {map.region}</span><h3>{map.name}</h3><p>{map.routeNote}</p></div><strong className="score-pill">{map.score}</strong></div>{map.thumbnail && <img className="map-preview" src={map.thumbnail} alt={map.name} />}<div className="small-tags">{map.tags.map((tag) => <span key={tag}>{tag}</span>)}<span>刷怪数 {map.spawnTotal ?? '-'}</span><span>{map.canHitAll ? '命中稳定' : '命中偏紧'}</span></div><div className="mini-table">{map.monsters.slice(0, 5).map((monster) => <div key={`${map.id}-${monster.id}`} className="monster-row"><div className="monster-name">{(monster.gif || monster.thumbnail) && <img src={monster.gif || monster.thumbnail} alt="" />}<span>{monster.name}</span></div><span>Lv.{monster.level}</span><span>HP {monster.hp}</span><span>命中 {monster.requiredAccuracy}</span></div>)}</div></article>)}</div></Section>; }
function GearPage({ gear }) { return <Section title="装备推荐"><p className="section-copy">装备从官方 items.json 读取，按职业、二转、等级、属性需求、性别和装备槽筛选。</p><div className="gear-stack">{gear.map((item) => <article className="gear-card" key={`${item.slot}-${item.title}`}>{item.thumbnail && <img className="gear-thumb" src={item.thumbnail} alt="" />}<div><span className="item-label">{item.label} · Lv.{item.reqLevel ?? '-'}</span><h3>{item.title}</h3><p>{item.desc}</p><div className="small-tags"><span>{item.slot}</span>{item.weaponType && <span>{item.weaponType}</span>}{item.attackSpeed && <span>{item.attackSpeed}</span>}{item.reqJobLabel && <span>{item.reqJobLabel}</span>}{item.scoreLabel && <span>{item.scoreLabel}</span>}</div></div></article>)}</div></Section>; }
function MaterialsPage({ professions, professionId, setProfessionId, craftLevel, setCraftLevel, route, materialValue }) { return <><Section title="材料价值指数"><p className="section-copy">价值分数按覆盖配方数、总需求量、覆盖专业数综合计算。</p><div className="material-stack">{materialValue.map((item) => <article className="material-row" key={item.id}><div><h3>{item.name}</h3><p>覆盖 {item.recipeCount} 配方 · 总需求 {item.totalDemand}</p></div><strong>{item.score}</strong></article>)}</div></Section><Section title="锻造路线"><Choice title="专业" value={professionId} setValue={setProfessionId} options={professions.map((item) => ({ id: item.id, name: item.name }))} /><div className="level-control compact-level"><h3>目标专业等级</h3><div className="level-row"><button className="level-btn" onClick={() => setCraftLevel(Math.max(2, craftLevel - 1))}>-</button><input className="level-input" value={craftLevel} readOnly /><button className="level-btn" onClick={() => setCraftLevel(Math.min(20, craftLevel + 1))}>+</button></div><input className="level-slider" type="range" min="2" max="20" value={craftLevel} onChange={(event) => setCraftLevel(Number(event.target.value))} /></div><div className="mini-table route-table">{route.route.map((step) => <div className="route-row" key={`${step.from}-${step.to}`}><span>Lv.{step.from}→{step.to}</span><strong>{step.recipe}</strong><span>{step.crafts} 次 · {step.cost.toLocaleString()} meso</span></div>)}</div></Section></>; }
function Section({ title, children }) { return <section className="section-card"><h2>{title}</h2>{children}</section>; }
function Info({ label, title, desc, image }) { return <article className="info-row"><span>{label}</span><div className="info-row-main">{image && <img className="info-thumb" src={image} alt="" />}<div><strong>{title}</strong><p>{desc}</p></div></div></article>; }
function compactStats(statPlan, classLine, mainAttack) { return [['STR', statPlan.stats.STR], ['DEX', statPlan.stats.DEX], ['INT', statPlan.stats.INT], ['LUK', statPlan.stats.LUK], ['ACC', statPlan.derived.accuracy], ['HP', statPlan.derived.hp], ['MP', statPlan.derived.mp], [classLine.id === 'magician' ? 'MATK' : 'WATK', mainAttack]]; }
function buildProfessions(data) { if (!data?.professions?.length) return PROFESSIONS; return data.professions.map((profession) => ({ id: profession.id, name: PROFESSIONS.find((item) => item.id === profession.id)?.name ?? profession.name })); }
function calcMainAttack(classLine, statPlan, weapon) { const primary = statPlan.stats[classLine.primaryStat] ?? 0; const secondary = statPlan.stats[classLine.secondaryStat] ?? 0; const gearAttack = classLine.id === 'magician' ? (weapon?.incMAD ?? 0) : (weapon?.incPAD ?? 0); return Math.max(1, Math.round(primary * 1.35 + secondary * 0.35 + statPlan.level * 0.7 + gearAttack)); }
