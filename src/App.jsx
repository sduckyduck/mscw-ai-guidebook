import { useEffect, useMemo, useState } from 'react';
import { CLASS_LINES, EDITIONS } from './data/classes.js';
import { PROFESSIONS } from './data/crafting.js';
import { SKILL_BUILDS } from './data/skills.js';
import { buildLowCostRoute, getMaterialValueIndex, getProfessionRecipes } from './engine/craftingEngine.js';
import { buildStatPlan } from './engine/levelEngine.js';
import { getMapRecommendations } from './engine/recommendationEngine.js';
import { loadOfficialGuideData } from './engine/officialDataAdapter.js';

const TABS = [
  { id: 'overview', name: '总览' },
  { id: 'character', name: '角色' },
  { id: 'maps', name: '地图' },
  { id: 'gear', name: '装备' },
  { id: 'materials', name: '材料' },
];

const JOB_BUTTONS = [
  { id: 'warrior', name: '战士' },
  { id: 'magician', name: '魔法师' },
  { id: 'bowman', name: '弓箭手' },
  { id: 'thief', name: '飞侠' },
];

const MODE_BUTTONS = [
  { id: 'safe', name: '保守' },
  { id: 'normal', name: '标准' },
  { id: 'fast', name: '激进' },
];

const BUDGET_BUTTONS = [
  { id: 'low', name: '低资金' },
  { id: 'mid', name: '普通' },
  { id: 'high', name: '有钱' },
];

const PRIORITY_BUTTONS = [
  { id: 'stable', name: '稳定优先' },
  { id: 'exp', name: '经验优先' },
  { id: 'material', name: '材料优先' },
  { id: 'meso', name: '金币收益优先' },
];

const OFFICIAL_CLASS_NAMES = {
  warrior: ['warrior'],
  fighter: ['fighter'],
  page: ['page'],
  spearman: ['spearman'],
  magician: ['magician', 'mage'],
  fp: ['fire/poison wizard', 'wizard fire poison', 'fire poison wizard'],
  il: ['ice/lightning wizard', 'wizard ice lightning', 'ice lightning wizard'],
  cleric: ['cleric'],
  bowman: ['bowman'],
  hunter: ['hunter'],
  crossbowman: ['crossbowman', 'crossbow man'],
  thief: ['thief'],
  assassin: ['assassin'],
  bandit: ['bandit'],
  pirate: ['pirate'],
  brawler: ['brawler'],
  gunslinger: ['gunslinger'],
};

const JOB_LABEL_BY_CLASS = {
  warrior: 'Warrior',
  magician: 'Mage',
  bowman: 'Bowman',
  thief: 'Thief',
  pirate: 'Pirate',
};

const WEAPON_KEYWORDS_BY_CLASS = {
  warrior: ['sword', 'axe', 'blunt', 'spear', 'pole'],
  magician: ['wand', 'staff', 'mace'],
  bowman: ['bow', 'crossbow'],
  thief: ['claw', 'dagger'],
  pirate: ['gun', 'knuckle'],
};

const professionIconMap = Object.fromEntries(PROFESSIONS.map((profession) => [profession.id, profession]));

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [editionId, setEditionId] = useState('global');
  const [classId, setClassId] = useState('magician');
  const [branchId, setBranchId] = useState('magician');
  const [gender, setGender] = useState('female');
  const [level, setLevel] = useState(25);
  const [mode, setMode] = useState('safe');
  const [budget, setBudget] = useState('low');
  const [priority, setPriority] = useState('material');
  const [professionId, setProfessionId] = useState('smithing');
  const [targetCraftLevel, setTargetCraftLevel] = useState(8);
  const [officialData, setOfficialData] = useState(null);
  const [officialError, setOfficialError] = useState('');

  useEffect(() => {
    loadOfficialGuideData()
      .then((data) => {
        setOfficialData(data);
        setOfficialError('');
      })
      .catch((error) => {
        setOfficialError(error.message || '官方数据读取失败');
      });
  }, []);

  const edition = EDITIONS.find((item) => item.id === editionId) ?? EDITIONS[0];
  const availableClasses = CLASS_LINES.filter((item) => edition.classIds.includes(item.id));
  const classLine = availableClasses.find((item) => item.id === classId) ?? availableClasses[0];
  const selectedBranch = classLine.branches.find((item) => item.id === branchId) ?? classLine.branches[0] ?? classLine;

  useEffect(() => {
    if (!availableClasses.some((item) => item.id === classId)) {
      setClassId(availableClasses[0]?.id ?? 'warrior');
      return;
    }
    if (!classLine.branches.some((branch) => branch.id === branchId)) {
      setBranchId(classLine.branches[0]?.id ?? classLine.id);
    }
  }, [availableClasses, branchId, classId, classLine]);

  const statPlan = useMemo(() => buildStatPlan(classLine, level), [classLine, level]);
  const recommendations = useMemo(
    () => getMapRecommendations({
      classLine,
      level,
      statPlan,
      maps: officialData?.maps,
      monsters: officialData?.monsters,
    }).slice(0, 8),
    [classLine, level, statPlan, officialData],
  );

  const bestMap = recommendations[0];
  const bestMonster = bestMap?.monsters?.[0];
  const fallbackSkillRows = SKILL_BUILDS[selectedBranch?.id] ?? SKILL_BUILDS[classLine.id] ?? [];
  const officialSkills = useMemo(
    () => getOfficialSkills(officialData, classLine, selectedBranch, level),
    [officialData, classLine, selectedBranch, level],
  );
  const professions = useMemo(() => buildProfessionList(officialData), [officialData]);
  const activeProfessionId = professions.some((profession) => profession.id === professionId)
    ? professionId
    : professions[0]?.id ?? 'smithing';
  const recipes = officialData?.recipes;
  const materials = officialData?.materials;
  const professionRecipes = getProfessionRecipes(activeProfessionId, recipes, materials);
  const materialValue = getMaterialValueIndex(recipes, materials).slice(0, 12);
  const craftingRoute = buildLowCostRoute(activeProfessionId, targetCraftLevel, recipes, materials);
  const nextAp = classLine.primaryStat;
  const nextSkillPlan = buildSkillPlan(officialSkills, fallbackSkillRows, level);
  const recommendedGear = buildRecommendedGear(classLine, level, budget, officialData?.items, professionRecipes);
  const equippedWeapon = recommendedGear.find((item) => item.slot === 'weapon');
  const mainAttack = estimateMainAttack(classLine, statPlan, equippedWeapon);
  const damageRows = buildDamageRows(classLine, selectedBranch, level, statPlan, nextSkillPlan.current, equippedWeapon);

  return (
    <main className="app-shell">
      <nav className="top-tabs" aria-label="MSCW guide sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'top-tab active' : 'top-tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <>
          <HeroOverview
            classLine={classLine}
            level={level}
            statPlan={statPlan}
            bestMonster={bestMonster}
            bestMap={bestMap}
            officialData={officialData}
            mainAttack={mainAttack}
            equippedWeapon={equippedWeapon}
            recommendedGear={recommendedGear}
          />
          <NextStepCard
            bestMonster={bestMonster}
            bestMap={bestMap}
            recommendedGear={recommendedGear}
            nextAp={nextAp}
          />
          <CharacterParameters
            editionId={editionId}
            setEditionId={setEditionId}
            classId={classId}
            setClassId={setClassId}
            branchId={branchId}
            setBranchId={setBranchId}
            availableClasses={availableClasses}
            classLine={classLine}
            gender={gender}
            setGender={setGender}
            level={level}
            setLevel={setLevel}
            mode={mode}
            setMode={setMode}
            budget={budget}
            setBudget={setBudget}
            priority={priority}
            setPriority={setPriority}
          />
          <StatsCard statPlan={statPlan} nextAp={nextAp} classLine={classLine} mainAttack={mainAttack} />
          <SkillCard nextSkillPlan={nextSkillPlan} />
          <DamageCard damageRows={damageRows} />
        </>
      )}

      {activeTab === 'character' && (
        <>
          <CharacterParameters
            editionId={editionId}
            setEditionId={setEditionId}
            classId={classId}
            setClassId={setClassId}
            branchId={branchId}
            setBranchId={setBranchId}
            availableClasses={availableClasses}
            classLine={classLine}
            gender={gender}
            setGender={setGender}
            level={level}
            setLevel={setLevel}
            mode={mode}
            setMode={setMode}
            budget={budget}
            setBudget={setBudget}
            priority={priority}
            setPriority={setPriority}
          />
          <StatsCard statPlan={statPlan} nextAp={nextAp} classLine={classLine} mainAttack={mainAttack} />
          <SkillCard nextSkillPlan={nextSkillPlan} />
          <DamageCard damageRows={damageRows} />
        </>
      )}

      {activeTab === 'maps' && (
        <SectionCard title="推荐地图">
          <p className="section-copy">
            {officialData
              ? '已使用官方 AppData 的怪物与地图数据。推荐综合等级差、命中、刷怪数和职业适配。'
              : '正在读取官方数据；若读取失败，会暂时使用内置示例数据。'}
          </p>
          <div className="map-stack">
            {recommendations.map((map) => (
              <article className="map-result" key={map.id}>
                <div className="map-result-main">
                  <div>
                    <span className="item-label">Lv.{map.levelRange[0]}-{map.levelRange[1]} · {map.region}</span>
                    <h3>{map.name}</h3>
                    <p>{map.routeNote}</p>
                  </div>
                  <strong className="score-pill">{map.score}</strong>
                </div>
                {map.thumbnail && <img className="map-preview" src={map.thumbnail} alt={map.name} />}
                <div className="small-tags">
                  {map.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  <span>刷怪数 {map.spawnTotal ?? '-'}</span>
                  <span>{map.canHitAll ? '命中稳定' : '命中偏紧'}</span>
                </div>
                <div className="mini-table">
                  {map.monsters.slice(0, 5).map((monster) => (
                    <div key={`${map.id}-${monster.id}`} className="monster-row">
                      <div className="monster-name">
                        {(monster.gif || monster.thumbnail) && <img src={monster.gif || monster.thumbnail} alt="" />}
                        <span>{monster.name}</span>
                      </div>
                      <span>Lv.{monster.level}</span>
                      <span>HP {monster.hp}</span>
                      <span>命中 {monster.requiredAccuracy}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      )}

      {activeTab === 'gear' && (
        <>
          <SectionCard title="装备推荐">
            <p className="section-copy">
              装备已从官方 items.json 读取，并按职业、等级、装备需求和攻击/魔攻筛选。
            </p>
            <div className="gear-stack">
              {recommendedGear.map((item) => (
                <GearCard key={`${item.label}-${item.id ?? item.title}`} item={item} />
              ))}
            </div>
          </SectionCard>
          <SectionCard title="技能 / AP">
            <SkillCard nextSkillPlan={nextSkillPlan} nested />
          </SectionCard>
        </>
      )}

      {activeTab === 'materials' && (
        <>
          <SectionCard title="材料价值指数">
            <p className="section-copy">
              价值分数按覆盖配方数、总需求量、覆盖专业数综合计算。适合用来判断哪些材料值得囤。
            </p>
            <div className="material-stack">
              {materialValue.map((material) => (
                <article className="material-row" key={material.id}>
                  <div>
                    <h3>{material.name}</h3>
                    <p>覆盖 {material.recipeCount} 配方 · 总需求 {material.totalDemand} · {material.source}</p>
                  </div>
                  <strong>{material.score}</strong>
                </article>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="锻造路线">
            <div className="control-block">
              <h3>专业</h3>
              <div className="option-grid two">
                {professions.map((profession) => (
                  <button
                    key={profession.id}
                    className={activeProfessionId === profession.id ? 'option-btn active' : 'option-btn'}
                    onClick={() => setProfessionId(profession.id)}
                  >
                    {profession.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="level-control compact-level">
              <h3>目标专业等级</h3>
              <div className="level-row">
                <button className="level-btn" onClick={() => setTargetCraftLevel(Math.max(2, targetCraftLevel - 1))}>-</button>
                <input className="level-input" value={targetCraftLevel} readOnly />
                <button className="level-btn" onClick={() => setTargetCraftLevel(Math.min(20, targetCraftLevel + 1))}>+</button>
              </div>
              <input
                className="level-slider"
                type="range"
                min="2"
                max="20"
                value={targetCraftLevel}
                onChange={(event) => setTargetCraftLevel(Number(event.target.value))}
              />
            </div>
            <div className="mini-table route-table">
              {craftingRoute.route.map((step) => (
                <div className="route-row" key={`${step.from}-${step.to}`}>
                  <span>Lv.{step.from}→{step.to}</span>
                  <strong>{step.recipe}</strong>
                  <span>{step.crafts} 次 · {step.cost.toLocaleString()} meso</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}

      {officialError && <p className="load-error">官方数据读取提示：{officialError}</p>}
    </main>
  );
}

function HeroOverview({ classLine, level, statPlan, bestMonster, bestMap, officialData, mainAttack, equippedWeapon, recommendedGear }) {
  return (
    <section className="hero-card">
      <h1>Lv.{level} {classLine.name} 开荒驾驶舱</h1>
      <p>
        优先打 <strong>{bestMonster?.name ?? '推荐怪物'}</strong>，当前命中 {bestMap?.canHitAll ? '稳定' : '偏紧'}，推荐地图 <strong>{bestMap?.name ?? '读取中'}</strong>。
      </p>
      <div className="hero-stats">
        <HeroStat label="ACC" value={statPlan.derived.accuracy} />
        <HeroStat label={classLine.id === 'magician' ? '魔攻' : '主攻'} value={mainAttack} />
        <HeroStat label="HP" value={statPlan.derived.hp} />
      </div>
      <div className="preview-card">
        <div className="preview-frame">
          <div className={`pixel-avatar ${classLine.id}`}>
            <div className="avatar-hat" />
            <div className="avatar-face" />
            <div className="avatar-body" />
            <div className="avatar-weapon" />
          </div>
        </div>
        <div className="preview-meta">
          <strong>{classLine.name} Lv.{level}</strong>
          <span>{equippedWeapon?.title ?? '官方装备读取中'} · {officialData ? `映射 ${recommendedGear.length} 件` : '读取中'}</span>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="hero-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NextStepCard({ bestMonster, bestMap, recommendedGear, nextAp }) {
  return (
    <SectionCard title="下一步">
      <div className="info-list">
        <InfoRow label="练级" title={`${bestMonster?.name ?? '推荐怪物'} Lv.${bestMonster?.level ?? '-'}`} desc="按当前命中和等级推荐" image={bestMonster?.gif || bestMonster?.thumbnail} />
        <InfoRow label="地图" title={bestMap?.name ?? '推荐地图读取中'} desc={`刷新 ${bestMap?.mobRate ?? 1} · ${bestMap?.canHitAll ? '安全' : '需补命中'}`} />
        <InfoRow label="装备" title={recommendedGear[0]?.title ?? '职业装备'} desc={recommendedGear[0]?.desc ?? '可换'} image={recommendedGear[0]?.thumbnail} />
        <InfoRow label="AP" title={nextAp} desc="按当前职业主属性优先" />
      </div>
    </SectionCard>
  );
}

function CharacterParameters(props) {
  const {
    editionId,
    setEditionId,
    classId,
    setClassId,
    branchId,
    setBranchId,
    availableClasses,
    classLine,
    gender,
    setGender,
    level,
    setLevel,
    mode,
    setMode,
    budget,
    setBudget,
    priority,
    setPriority,
  } = props;

  return (
    <SectionCard title="角色参数">
      <div className="control-block">
        <h3>版本</h3>
        <div className="option-grid two">
          {EDITIONS.map((item) => (
            <button
              key={item.id}
              className={editionId === item.id ? 'option-btn active' : 'option-btn'}
              onClick={() => setEditionId(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="control-block">
        <h3>职业</h3>
        <div className="option-grid two">
          {JOB_BUTTONS.filter((job) => availableClasses.some((item) => item.id === job.id)).map((job) => (
            <button
              key={job.id}
              className={classId === job.id ? 'option-btn active' : 'option-btn'}
              onClick={() => setClassId(job.id)}
            >
              {job.name}
            </button>
          ))}
        </div>
      </div>

      <div className="control-block">
        <h3>二转方向</h3>
        <div className="option-grid two">
          {classLine.branches.map((branch) => (
            <button
              key={branch.id}
              className={branchId === branch.id ? 'option-btn active' : 'option-btn'}
              onClick={() => setBranchId(branch.id)}
            >
              {branch.name}
            </button>
          ))}
        </div>
      </div>

      <div className="control-block">
        <h3>性别</h3>
        <div className="option-grid two">
          <button className={gender === 'male' ? 'option-btn active' : 'option-btn'} onClick={() => setGender('male')}>男</button>
          <button className={gender === 'female' ? 'option-btn active' : 'option-btn'} onClick={() => setGender('female')}>女</button>
        </div>
      </div>

      <div className="level-control">
        <h3>等级</h3>
        <div className="level-row">
          <button className="level-btn" onClick={() => setLevel(Math.max(1, level - 1))}>-</button>
          <input className="level-input" value={level} readOnly />
          <button className="level-btn" onClick={() => setLevel(Math.min(120, level + 1))}>+</button>
        </div>
        <input
          className="level-slider"
          type="range"
          min="1"
          max="120"
          value={level}
          onChange={(event) => setLevel(Number(event.target.value))}
        />
      </div>

      <ChoiceGroup title="推荐模式" value={mode} setValue={setMode} options={MODE_BUTTONS} />
      <ChoiceGroup title="资金" value={budget} setValue={setBudget} options={BUDGET_BUTTONS} />
      <ChoiceGroup title="优先级" value={priority} setValue={setPriority} options={PRIORITY_BUTTONS} />
    </SectionCard>
  );
}

function ChoiceGroup({ title, value, setValue, options }) {
  return (
    <div className="control-block">
      <h3>{title}</h3>
      <div className="option-grid two">
        {options.map((option) => (
          <button
            key={option.id}
            className={value === option.id ? 'option-btn active' : 'option-btn'}
            onClick={() => setValue(option.id)}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatsCard({ statPlan, nextAp, classLine, mainAttack }) {
  const stats = [
    ['STR', statPlan.stats.STR],
    ['DEX', statPlan.stats.DEX],
    ['INT', statPlan.stats.INT],
    ['LUK', statPlan.stats.LUK],
    ['ACC', statPlan.derived.accuracy],
    ['AVOID', Math.round((statPlan.stats.LUK ?? 0) * 0.8 + statPlan.level * 0.15)],
    ['HP', statPlan.derived.hp],
    ['MP', statPlan.derived.mp],
    [classLine.id === 'magician' ? 'MATK' : 'WATK', mainAttack],
  ];

  return (
    <SectionCard title="最终属性">
      <div className="stat-stack">
        {stats.map(([label, value]) => (
          <div className="stat-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="next-ap-note">
        <strong>下一点 AP：{nextAp}</strong>
        <span>当前建议主 {classLine.primaryStat}，{classLine.secondaryStat} 只保留装备需求。</span>
      </div>
    </SectionCard>
  );
}

function SkillCard({ nextSkillPlan, nested = false }) {
  const content = (
    <>
      <p className="skill-path">
        {nextSkillPlan.source === 'official' ? '已读取官方 skills.json：显示真实技能、上限和当前等级效果。' : '官方技能暂未匹配，显示内置路线。'}
      </p>
      <h3 className="small-heading">当前技能</h3>
      <div className="skill-list">
        {nextSkillPlan.current.map((skill) => (
          <div className="skill-row" key={skill.name}>
            <div className="skill-name-cell">
              {skill.thumbnail && <img src={skill.thumbnail} alt="" />}
              <div>
                <strong>{skill.name}</strong>
                {skill.effect && <p>{skill.effect}</p>}
              </div>
            </div>
            <span>{skill.points}</span>
          </div>
        ))}
      </div>
      <h3 className="small-heading">接下来</h3>
      <div className="skill-list">
        {nextSkillPlan.next.map((skill) => (
          <div className="skill-row" key={`${skill.level}-${skill.name}`}>
            <strong>Lv.{skill.level}</strong>
            <span>{skill.name}</span>
          </div>
        ))}
      </div>
    </>
  );

  if (nested) return content;
  return <SectionCard title="技能 / AP">{content}</SectionCard>;
}

function DamageCard({ damageRows }) {
  return (
    <SectionCard title="技能伤害">
      <div className="damage-stack">
        {damageRows.map((row) => (
          <article className="damage-row" key={row.name}>
            <div>
              <h3>{row.name}</h3>
              <p>{row.desc}</p>
            </div>
            <strong>{row.damage}</strong>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function GearCard({ item }) {
  return (
    <article className="gear-card">
      {item.thumbnail && <img className="gear-thumb" src={item.thumbnail} alt="" />}
      <div>
        <span className="item-label">{item.label} · Lv.{item.reqLevel ?? '-'}</span>
        <h3>{item.title}</h3>
        <p>{item.desc}</p>
        <div className="small-tags">
          {item.weaponType && <span>{item.weaponType}</span>}
          {item.attackSpeed && <span>{item.attackSpeed}</span>}
          {item.reqJobLabel && <span>{item.reqJobLabel}</span>}
          {item.scoreLabel && <span>{item.scoreLabel}</span>}
        </div>
      </div>
    </article>
  );
}

function SectionCard({ title, children }) {
  return (
    <section className="section-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ label, title, desc, image }) {
  return (
    <article className="info-row">
      <span>{label}</span>
      <div className="info-row-main">
        {image && <img className="info-thumb" src={image} alt="" />}
        <div>
          <strong>{title}</strong>
          <p>{desc}</p>
        </div>
      </div>
    </article>
  );
}

function buildProfessionList(officialData) {
  if (!officialData?.professions?.length) return PROFESSIONS;

  return officialData.professions.map((profession) => {
    const local = professionIconMap[profession.id];
    return {
      id: profession.id,
      name: local?.name ?? profession.name,
      icon: local?.icon ?? '🔧',
      focus: local?.focus ?? `Skill ID ${profession.skillId}`,
    };
  });
}

function getOfficialSkills(officialData, classLine, branch, level) {
  if (!officialData?.skillGroups?.length) return [];

  const wanted = new Set([
    ...(OFFICIAL_CLASS_NAMES[classLine.id] ?? []),
    ...(level >= 30 ? (OFFICIAL_CLASS_NAMES[branch?.id] ?? []) : []),
  ].map(normalizeName));

  return officialData.skillGroups
    .filter((group) => {
      const names = [group.className, group.baseClass, group.mainClass, group.baseClassLabel].map(normalizeName);
      return names.some((name) => wanted.has(name));
    })
    .flatMap((group) => group.skills.map((skill) => ({ ...skill, groupName: group.className, job: group.job })));
}

function buildSkillPlan(officialSkills, fallbackSkillRows, level) {
  if (officialSkills.length) {
    const prioritized = prioritizeSkills(officialSkills);
    const firstJobLevel = 10;
    let remainingSp = Math.max(0, level - firstJobLevel + 1) * 3;
    const current = [];

    for (const skill of prioritized) {
      if (remainingSp <= 0 || current.length >= 5) break;
      const points = Math.min(skill.maxLevel || 20, remainingSp);
      if (points <= 0) continue;
      current.push({
        name: skill.name,
        points: `${points}/${skill.maxLevel || 20}`,
        rawPoints: points,
        maxLevel: skill.maxLevel || 20,
        thumbnail: skill.thumbnail,
        effect: skill.all_level_stats?.[Math.max(0, points - 1)] ?? skill.description?.split('\n')?.[1] ?? '',
        skill,
      });
      remainingSp -= points;
    }

    const nextTarget = current.find((item) => item.rawPoints < item.maxLevel) ?? current[current.length - 1];
    const next = [0, 1, 2, 3].map((offset) => ({
      level: level + offset,
      name: nextTarget ? `${nextTarget.name} x3` : '继续补主力技能',
    }));

    return { source: 'official', current, next };
  }

  const first = fallbackSkillRows[0]?.priority ?? '主力技能';
  const parts = first.split('→').map((item) => item.trim()).filter(Boolean);
  const names = parts.length ? parts : ['主力技能', '被动强化', '机动/生存'];

  return {
    source: 'fallback',
    current: names.slice(0, 4).map((name, index) => ({
      name,
      points: `${Math.max(1, Math.min(20, level - 5 - index * 4))}/${index === 1 ? 15 : 20}`,
    })),
    next: [
      { level, name: `${names[1] ?? names[0]} x3` },
      { level: level + 1, name: `${names[1] ?? names[0]} x3` },
      { level: level + 2, name: `${names[2] ?? names[0]} x3` },
      { level: level + 3, name: `${names[2] ?? names[0]} x2 / ${names[3] ?? names[0]}` },
    ],
  };
}

function prioritizeSkills(skills) {
  const attackWords = ['damage', 'attack', 'strike', 'blast', 'arrow', 'bolt', 'claw', 'double', 'slash', 'snail'];
  return [...skills].sort((a, b) => skillPriority(a, attackWords) - skillPriority(b, attackWords));
}

function skillPriority(skill, attackWords) {
  const text = `${skill.name} ${skill.description}`.toLowerCase();
  if (text.includes('max hp') || text.includes('max mp') || text.includes('mastery')) return 0;
  if (attackWords.some((word) => text.includes(word))) return 1;
  if (text.includes('booster') || text.includes('speed')) return 2;
  return 3;
}

function buildDamageRows(classLine, branch, level, statPlan, currentSkills, equippedWeapon) {
  const attack = estimateMainAttack(classLine, statPlan, equippedWeapon);
  const damageSkills = currentSkills
    .filter((item) => item.effect && /damage\s+\d+%|damage\s+\d+/i.test(item.effect))
    .slice(0, 2);

  if (damageSkills.length) {
    return damageSkills.map((item) => {
      const ratio = extractDamageRatio(item.effect);
      const min = Math.round(attack * ratio * 0.82);
      const max = Math.round(attack * ratio * 1.18);
      return {
        name: item.name,
        desc: `Lv.${item.rawPoints}/${item.maxLevel} · ${item.effect}`,
        damage: `${min} ~ ${max}`,
      };
    });
  }

  const skillName = classLine.id === 'magician' ? '魔法弹' : branch?.name ?? '主力技能';
  const min = Math.round(attack * (classLine.id === 'magician' ? 0.8 : 0.65));
  const max = Math.round(attack * (classLine.id === 'magician' ? 1.28 : 1.45));

  return [
    {
      name: skillName,
      desc: `Lv.${Math.min(20, Math.max(1, level - 5))}/20 · 当前主力输出估算`,
      damage: `${min} ~ ${max}`,
    },
    {
      name: '普通攻击',
      desc: '按当前主属性、等级和装备粗略估算',
      damage: `${Math.round(min * 0.42)} ~ ${Math.round(max * 0.56)}`,
    },
  ];
}

function buildRecommendedGear(classLine, level, budget, officialItems, professionRecipes) {
  if (officialItems?.length) {
    const eligible = officialItems.filter((item) => isEligibleItem(item, classLine, level));
    const weapons = eligible
      .filter((item) => item.sub_category === 'Weapon' && isWeaponForClass(item, classLine))
      .sort((a, b) => gearScore(b, classLine, budget, level) - gearScore(a, classLine, budget, level));
    const armor = eligible
      .filter((item) => item.category === 'Equipment' && item.sub_category !== 'Weapon')
      .sort((a, b) => gearScore(b, classLine, budget, level) - gearScore(a, classLine, budget, level));

    const weapon = weapons[0];
    const armorTop = armor.find((item) => /Overall|Top|Coat|Robe|Suit|Longcoat/i.test(item.sub_category ?? item.name)) ?? armor[0];
    const accessory = armor.find((item) => /Accessory|Eye|Face|Earring|Pendant|Ring/i.test(item.sub_category ?? item.name)) ?? armor[1];

    return [weapon, armorTop, accessory]
      .filter(Boolean)
      .map((item, index) => toGearRecommendation(item, index === 0 ? 'weapon' : index === 1 ? 'armor' : 'accessory', classLine));
  }

  const firstRecipe = professionRecipes.find((recipe) => recipe.level <= Math.max(1, Math.floor(level / 5))) ?? professionRecipes[0];
  const budgetText = budget === 'low' ? '低资金可换' : budget === 'high' ? '优先高属性' : '平价过渡';

  return [
    { label: '武器', title: classLine.weaponTypes[0] ?? '职业武器', desc: `${budgetText} · Lv.${level} 过渡`, slot: 'weapon' },
    { label: '防具', title: firstRecipe?.output ?? '职业防具', desc: '套服 · 可换', slot: 'armor' },
    { label: '饰品', title: '命中 / 主属性饰品', desc: '优先补命中与主属性', slot: 'accessory' },
  ];
}

function isEligibleItem(item, classLine, level) {
  if (item.category !== 'Equipment') return false;
  if (item.reqLevel > level + 5) return false;
  const label = item.req_job_label ?? item.reqJobLabel ?? 'All';
  if (!label || label === 'All') return true;
  const jobLabel = JOB_LABEL_BY_CLASS[classLine.id];
  return label.toLowerCase().includes(jobLabel.toLowerCase());
}

function isWeaponForClass(item, classLine) {
  const keywords = WEAPON_KEYWORDS_BY_CLASS[classLine.id] ?? [];
  const weaponType = `${item.weapon_type ?? item.weaponType ?? ''}`.toLowerCase();
  return keywords.some((keyword) => weaponType.includes(keyword));
}

function gearScore(item, classLine, budget, level) {
  const attackScore = classLine.id === 'magician'
    ? item.incMAD * 2 + item.incPAD * 0.25
    : item.incPAD * 2 + item.incMAD * 0.25;
  const statScore = (item.stats?.incSTR ?? 0) + (item.stats?.incDEX ?? 0) + (item.stats?.incINT ?? 0) + (item.stats?.incLUK ?? 0) + item.incACC;
  const levelFit = 80 - Math.abs(level - item.reqLevel) * 2;
  const costPenalty = budget === 'low' ? Math.log10(Math.max(1, item.price ?? 1)) * 2 : 0;
  return attackScore + statScore + levelFit - costPenalty;
}

function toGearRecommendation(item, slot, classLine) {
  const attackLabel = classLine.id === 'magician'
    ? `魔攻 ${item.incMAD || 0}${item.incPAD ? ` / 攻击 ${item.incPAD}` : ''}`
    : `攻击 ${item.incPAD || 0}${item.incMAD ? ` / 魔攻 ${item.incMAD}` : ''}`;
  const labelBySlot = { weapon: '武器', armor: '防具', accessory: '饰品' };

  return {
    ...item,
    id: item.id,
    slot,
    label: labelBySlot[slot] ?? item.sub_category ?? '装备',
    title: item.name,
    desc: `${attackLabel} · 需求 ${formatRequirements(item)}`,
    reqLevel: item.reqLevel,
    thumbnail: item.thumbnail,
    weaponType: item.weapon_type,
    attackSpeed: item.attack_speed_label,
    reqJobLabel: item.req_job_label,
    scoreLabel: item.price ? `${item.price.toLocaleString()} meso` : '无价格数据',
  };
}

function formatRequirements(item) {
  const reqs = [
    item.reqSTR ? `STR ${item.reqSTR}` : '',
    item.reqDEX ? `DEX ${item.reqDEX}` : '',
    item.reqINT ? `INT ${item.reqINT}` : '',
    item.reqLUK ? `LUK ${item.reqLUK}` : '',
  ].filter(Boolean);
  return reqs.length ? reqs.join(' / ') : '无属性需求';
}

function estimateMainAttack(classLine, statPlan, equippedWeapon) {
  const primary = statPlan.stats[classLine.primaryStat] ?? 0;
  const secondary = statPlan.stats[classLine.secondaryStat] ?? 0;
  const gearAttack = classLine.id === 'magician'
    ? (equippedWeapon?.incMAD ?? 0)
    : (equippedWeapon?.incPAD ?? 0);
  return Math.max(1, Math.round(primary * 1.35 + secondary * 0.35 + statPlan.level * 0.7 + gearAttack));
}

function extractDamageRatio(effect) {
  const percent = effect.match(/Damage\s+(\d+)%/i)?.[1];
  if (percent) return Number(percent) / 100;
  const flat = effect.match(/Damage\s+(\d+)/i)?.[1];
  if (flat) return Math.max(0.2, Number(flat) / 100);
  return 1;
}

function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export default App;
