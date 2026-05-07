import { useEffect, useMemo, useState } from 'react';
import { SandboxPanel } from '../ai/SandboxPanel';
import { loadGameData } from '../ai/simulator/data';
import { CLASS_LINES, EDITIONS } from '../data/classes.js';
import { buildStatPlan, getRecommendedApAllocation } from '../engine/levelEngine.js';
import { applyGearOverrides, selectGear } from '../engine/gearSelector.js';
import { getMapRecommendations } from '../engine/recommendationEngine.js';
import { rankLevelingMapsByBreakpoints } from '../engine/levelingRouteAlgorithm.js';
import { loadOfficialGuideData } from '../engine/officialDataAdapter.js';
import { getRecommendedSkillAllocation, getSkillPlan } from '../engine/skillPlanner.js';
import TickBattleSimulator from './TickBattleSimulator.jsx';
import '../ai/sandbox.css';

const STORAGE_KEY = 'mscw-guidebook-state-v2';

const GUIDEBOOK_TO_AI_JOB = {
  fighter: 'fighter',
  page: 'page',
  spearman: 'spearman',
  fp: 'fire_poison',
  il: 'ice_lightning',
  cleric: 'cleric',
  hunter: 'hunter',
  crossbowman: 'crossbowman',
  assassin: 'assassin',
  bandit: 'bandit',
  brawler: 'brawler',
  gunslinger: 'gunslinger',
  warrior: 'fighter',
  magician: 'fire_poison',
  bowman: 'hunter',
  thief: 'assassin',
  pirate: 'brawler',
};

function readSavedGuidebookState() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function priorityToStrategy(priority) {
  if (priority === 'exp') return 'fastest';
  if (priority === 'stable') return 'safe';
  if (priority === 'material' || priority === 'meso') return 'profit';
  return 'balanced';
}

function getInputWeights(strategy, budget) {
  return {
    allowHighRisk: strategy === 'fastest' && budget !== 'low',
    travelPenalty: strategy === 'fastest' ? 0.1 : strategy === 'profit' ? 0.22 : 0.18,
    potionPenalty: budget === 'low' ? 1.6 : budget === 'high' ? 0.75 : 1,
    materialValueWeight: strategy === 'profit' ? 0.65 : 0.2,
  };
}

function safeClassAndBranch(saved, edition) {
  const allowedClassIds = edition.classIds ?? ['warrior', 'magician', 'bowman', 'thief'];
  const classLine = CLASS_LINES.find((item) => item.id === saved.classId && allowedClassIds.includes(item.id))
    ?? CLASS_LINES.find((item) => allowedClassIds.includes(item.id))
    ?? CLASS_LINES[0];
  const branch = classLine.branches.find((item) => item.id === saved.branchId) ?? classLine.branches[0] ?? classLine;
  return { classLine, branch };
}

function simpleMainAttack(classLine, statPlan, gear) {
  const stats = statPlan?.stats ?? {};
  const primary = Number(stats[classLine?.primaryStat] ?? 0);
  const secondary = Number(stats[classLine?.secondaryStat] ?? 0);
  const gearAttack = (gear ?? []).reduce((sum, item) => {
    const pad = Number(item?.incPAD ?? item?.stats?.incPAD ?? 0);
    const mad = Number(item?.incMAD ?? item?.stats?.incMAD ?? 0);
    return sum + Math.max(pad, mad);
  }, 0);
  return Math.max(1, Math.round(primary * 1.8 + secondary * 0.35 + gearAttack * 3));
}

function buildDashboardContext({ saved, officialData }) {
  const edition = EDITIONS.find((item) => item.id === saved.editionId) ?? EDITIONS[0];
  const activeData = edition.dataMode === 'official-appdata' ? officialData : { items: [], maps: [], monsters: [], skillGroups: [] };
  const { classLine, branch } = safeClassAndBranch(saved, edition);
  const level = Math.max(edition.minLevel ?? 10, Math.min(edition.maxLevel ?? 50, Number(saved.level ?? 25) || 25));
  const gender = saved.gender === 'male' ? 'male' : 'female';
  const budget = ['low', 'mid', 'high'].includes(saved.budget) ? saved.budget : 'low';
  const priority = ['stable', 'exp', 'material', 'meso'].includes(saved.priority) ? saved.priority : 'stable';
  const strategy = priorityToStrategy(priority);
  const skillGroups = activeData?.skillGroups ?? [];

  const recommendedSkillAllocation = getRecommendedSkillAllocation({
    classId: classLine.id,
    branchId: branch.id,
    level,
    budget,
    skillGroups,
  });
  const effectiveSkillAllocation = saved.skillAllocation && typeof saved.skillAllocation === 'object'
    ? saved.skillAllocation
    : recommendedSkillAllocation;
  const skillPlanForStats = getSkillPlan({
    classId: classLine.id,
    branchId: branch.id,
    level,
    budget,
    mainAttack: 0,
    customSkills: effectiveSkillAllocation,
    skillGroups,
  });
  const recommendedApAllocation = getRecommendedApAllocation(classLine, level, { budget });
  const effectiveApAllocation = saved.apAllocation && typeof saved.apAllocation === 'object'
    ? saved.apAllocation
    : recommendedApAllocation;
  const statPlan = buildStatPlan(classLine, level, {
    budget,
    apAllocation: effectiveApAllocation,
    skillBonuses: skillPlanForStats.statBonuses,
  });
  const recommendedGear = selectGear({
    classLine,
    branch,
    level,
    budget,
    gender,
    statPlan,
    items: activeData?.items ?? [],
  });
  const gear = applyGearOverrides(recommendedGear, saved.gearOverrides ?? {});
  const mainAttack = simpleMainAttack(classLine, statPlan, gear);
  const skillPlan = getSkillPlan({
    classId: classLine.id,
    branchId: branch.id,
    level,
    budget,
    mainAttack,
    customSkills: effectiveSkillAllocation,
    skillGroups,
  });
  const baseMaps = getMapRecommendations({
    classLine,
    branch,
    level,
    statPlan,
    budget,
    priority,
    maps: activeData?.maps ?? [],
    monsters: activeData?.monsters ?? [],
    gear,
  });
  const maps = rankLevelingMapsByBreakpoints({
    maps: baseMaps,
    level,
    budget,
    priority,
    skillPlan,
    mainAttack,
    items: activeData?.items ?? [],
  }).slice(0, 8);

  return {
    source: 'dashboard-localStorage',
    edition,
    activeData,
    classLine,
    branch,
    gender,
    level,
    budget,
    priority,
    strategy,
    statPlan,
    gear,
    skillPlan,
    maps,
    bestMap: maps[0] ?? null,
    bestMonster: maps[0]?.monsters?.[0] ?? null,
    mainAttack,
    saved,
  };
}

export default function AiRoutePage() {
  const [officialData, setOfficialData] = useState(null);
  const [simulatorData, setSimulatorData] = useState(null);
  const [savedState, setSavedState] = useState(() => readSavedGuidebookState());
  const [loadError, setLoadError] = useState('');
  const [viewMode, setViewMode] = useState('visual');

  useEffect(() => {
    Promise.all([loadOfficialGuideData(), loadGameData()])
      .then(([official, simulator]) => {
        setOfficialData(official);
        setSimulatorData(simulator);
        setLoadError('');
      })
      .catch((error) => {
        setLoadError(error.message || 'AI 数据读取失败');
      });
  }, []);

  useEffect(() => {
    const refresh = () => setSavedState(readSavedGuidebookState());
    window.addEventListener('focus', refresh);
    window.addEventListener('hashchange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('hashchange', refresh);
    };
  }, []);

  const visualContext = useMemo(
    () => officialData ? buildDashboardContext({ saved: savedState, officialData }) : null,
    [officialData, savedState],
  );

  const jobKey = GUIDEBOOK_TO_AI_JOB[visualContext?.branch?.id] ?? GUIDEBOOK_TO_AI_JOB[visualContext?.classLine?.id] ?? 'fighter';
  const strategy = visualContext?.strategy ?? 'balanced';
  const budget = visualContext?.budget ?? 'low';
  const targetLevel = Math.min(120, Math.max((visualContext?.level ?? 10) + 1, Number(savedState.targetLevel ?? 0) || (visualContext?.level ?? 10) + 8));
  const input = useMemo(() => ({
    jobKey,
    startLevel: visualContext?.level ?? 10,
    targetLevel,
    strategy,
    currentMapId: visualContext?.bestMap?.rawId ?? visualContext?.bestMap?.id,
    ...getInputWeights(strategy, budget),
  }), [jobKey, visualContext?.level, visualContext?.bestMap?.rawId, visualContext?.bestMap?.id, targetLevel, strategy, budget]);

  const dataCoverage = visualContext?.activeData ? {
    monsters: visualContext.activeData.monsters?.length ?? 0,
    maps: visualContext.activeData.maps?.length ?? 0,
    items: visualContext.activeData.items?.length ?? 0,
  } : null;

  return (
    <section className="section-card ai-route-page">
      <div className="sandbox-header">
        <div>
          <p className="eyebrow">MapleStory Classic World</p>
          <h1>AI 可视化路线模拟器</h1>
          <p className="section-copy">
            这个页面不再维护第二套职业/等级/装备参数。它会读取前面总览/角色页保存的职业、等级、资金、优先级、AP、技能和手动装备覆盖，然后使用同一套推荐地图与推荐怪物进入实时模拟。
          </p>
        </div>
        <div className="hero-badge">
          <span>SYNCED</span>
          <strong>{viewMode === 'visual' ? 'Dashboard → Sim' : 'Route Sandbox'}</strong>
        </div>
      </div>

      <div className="control-panel ai-control-panel">
        <div className="section-title">当前同步状态</div>
        <div className="row-two">
          <label>
            角色来源
            <input value={visualContext ? `${visualContext.classLine.name} / ${visualContext.branch.name} / Lv.${visualContext.level}` : '读取中'} readOnly />
          </label>
          <label>
            装备来源
            <input value={visualContext ? `${visualContext.gear.length} 件装备，含手动覆盖：${Object.keys(savedState.gearOverrides ?? {}).length} 项` : '读取中'} readOnly />
          </label>
        </div>
        <div className="row-two">
          <label>
            推荐地图
            <input value={visualContext?.bestMap?.name ?? '读取中'} readOnly />
          </label>
          <label>
            推荐怪物
            <input value={visualContext?.bestMonster?.name ?? '读取中'} readOnly />
          </label>
        </div>
        <div className="row-two">
          <label>
            资金 / 优先级
            <input value={visualContext ? `${visualContext.budget} / ${visualContext.priority}` : '读取中'} readOnly />
          </label>
          <label>
            模拟视图
            <select value={viewMode} onChange={(event) => setViewMode(event.target.value)}>
              <option value="visual">实时战斗可视化</option>
              <option value="route">路线决策沙盒</option>
            </select>
          </label>
        </div>
      </div>

      <div className="sandbox-findings">
        <div className="finding optimization">
          <strong>角色已同步</strong>
          <p>CharacterPreview 使用同一个 classLine、gender 和 gear，所以换装后 AI 里的小人会跟着变。</p>
        </div>
        <div className="finding success">
          <strong>地图已同步</strong>
          <p>战斗背景强制使用当前 bestMap 的 thumbnail / minimap，不再使用假的 placeholder 地图。</p>
        </div>
        <div className="finding warning">
          <strong>怪物已同步</strong>
          <p>默认怪物锁定当前推荐怪物；怪物 HP、EXP、攻击、防御、命中、回避从同一份 AppData 进入模拟。</p>
        </div>
      </div>

      {loadError ? <p className="load-error">AI 数据读取提示：{loadError}</p> : null}

      {!visualContext ? (
        <div className="sandbox-empty">正在读取总览页状态和官方数据...</div>
      ) : viewMode === 'visual' ? (
        <TickBattleSimulator
          jobKey={jobKey}
          strategy={strategy}
          budget={budget}
          dataCoverage={dataCoverage}
          gameData={visualContext.activeData}
          visualContext={visualContext}
        />
      ) : !simulatorData ? (
        <div className="sandbox-empty">正在读取路线决策沙盒数据...</div>
      ) : (
        <SandboxPanel data={simulatorData} input={input} />
      )}
    </section>
  );
}
