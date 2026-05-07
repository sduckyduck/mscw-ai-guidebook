import { useEffect, useMemo, useState } from 'react';
import { SandboxPanel } from '../ai/SandboxPanel';
import { loadGameData } from '../ai/simulator/data';
import { JOB_OPTIONS } from '../ai/simulator/jobs';
import { CLASS_LINES } from '../data/classes.js';
import { buildStatPlan } from '../engine/levelEngine.js';
import { selectGear } from '../engine/gearSelector.js';
import { getMapRecommendations } from '../engine/recommendationEngine.js';
import TickBattleSimulator from './TickBattleSimulator.jsx';
import '../ai/sandbox.css';

const STRATEGIES = [
  { id: 'balanced', name: '综合' },
  { id: 'fastest', name: '经验优先' },
  { id: 'safe', name: '稳定优先' },
  { id: 'profit', name: '金币/材料优先' },
];

const BUDGETS = [
  { id: 'low', name: '低资金' },
  { id: 'mid', name: '普通' },
  { id: 'high', name: '有钱' },
];

const AI_JOB_TO_GUIDEBOOK = {
  fighter: { classId: 'warrior', branchId: 'fighter' },
  page: { classId: 'warrior', branchId: 'page' },
  spearman: { classId: 'warrior', branchId: 'spearman' },
  fire_poison: { classId: 'magician', branchId: 'fp' },
  ice_lightning: { classId: 'magician', branchId: 'il' },
  cleric: { classId: 'magician', branchId: 'cleric' },
  hunter: { classId: 'bowman', branchId: 'hunter' },
  crossbowman: { classId: 'bowman', branchId: 'crossbowman' },
  assassin: { classId: 'thief', branchId: 'assassin' },
  bandit: { classId: 'thief', branchId: 'bandit' },
  brawler: { classId: 'pirate', branchId: 'brawler' },
  gunslinger: { classId: 'pirate', branchId: 'gunslinger' },
};

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function getInputWeights(strategy, budget) {
  return {
    allowHighRisk: strategy === 'fastest' && budget !== 'low',
    travelPenalty: strategy === 'fastest' ? 0.1 : strategy === 'profit' ? 0.22 : 0.18,
    potionPenalty: budget === 'low' ? 1.6 : budget === 'high' ? 0.75 : 1,
    materialValueWeight: strategy === 'profit' ? 0.65 : 0.2,
  };
}

function priorityFromStrategy(strategy) {
  if (strategy === 'fastest') return 'exp';
  if (strategy === 'safe') return 'stable';
  if (strategy === 'profit') return 'material';
  return 'stable';
}

function buildVisualContext({ data, jobKey, level, budget, strategy }) {
  const mapping = AI_JOB_TO_GUIDEBOOK[jobKey] ?? AI_JOB_TO_GUIDEBOOK.spearman;
  const classLine = CLASS_LINES.find((item) => item.id === mapping.classId) ?? CLASS_LINES[0];
  const branch = classLine.branches.find((item) => item.id === mapping.branchId) ?? classLine.branches[0] ?? classLine;
  const gender = 'female';
  const statPlan = buildStatPlan(classLine, level, { budget });
  const gear = selectGear({
    classLine,
    branch,
    level,
    budget,
    gender,
    statPlan,
    items: data?.equipmentItems ?? [],
  });
  const maps = getMapRecommendations({
    classLine,
    branch,
    level,
    statPlan,
    budget,
    priority: priorityFromStrategy(strategy),
    maps: data?.maps ?? [],
    monsters: data?.monsters ?? [],
    gear,
  }).slice(0, 8);
  const bestMap = maps[0] ?? null;
  const bestMonster = bestMap?.monsters?.[0] ?? null;

  return {
    classLine,
    branch,
    gender,
    level,
    budget,
    strategy,
    statPlan,
    gear,
    maps,
    bestMap,
    bestMonster,
  };
}

export default function AiRoutePage() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [jobKey, setJobKey] = useState('spearman');
  const [startLevel, setStartLevel] = useState(42);
  const [targetLevel, setTargetLevel] = useState(50);
  const [strategy, setStrategy] = useState('balanced');
  const [budget, setBudget] = useState('low');
  const [viewMode, setViewMode] = useState('visual');

  useEffect(() => {
    loadGameData()
      .then((loaded) => {
        setData(loaded);
        setLoadError('');
      })
      .catch((error) => {
        setLoadError(error.message || 'AI 数据读取失败');
      });
  }, []);

  const selectedJob = JOB_OPTIONS.find((job) => job.key === jobKey) ?? JOB_OPTIONS[0];
  const safeTargetLevel = Math.max(startLevel + 1, targetLevel);
  const weights = getInputWeights(strategy, budget);

  const input = useMemo(() => ({
    jobKey,
    startLevel,
    targetLevel: safeTargetLevel,
    strategy,
    currentMapId: undefined,
    ...weights,
  }), [jobKey, startLevel, safeTargetLevel, strategy, weights.allowHighRisk, weights.travelPenalty, weights.potionPenalty, weights.materialValueWeight]);

  const visualContext = useMemo(
    () => buildVisualContext({ data, jobKey, level: startLevel, budget, strategy }),
    [data, jobKey, startLevel, budget, strategy],
  );

  const dataCoverage = data ? {
    monsters: data.monsters?.length ?? 0,
    maps: data.maps?.length ?? 0,
    items: data.equipmentItems?.length ?? 0,
  } : null;

  return (
    <section className="section-card ai-route-page">
      <div className="sandbox-header">
        <div>
          <p className="eyebrow">MapleStory Classic World</p>
          <h1>AI 可视化路线模拟器</h1>
          <p className="section-copy">
            现在 AI 战斗模拟会直接复用 Guidebook 仪表盘的角色、装备、推荐地图、推荐怪物和真实怪物数据。换职业、等级、资金或策略后，角色图、怪物图、地图背景和战斗数值会一起联动。
          </p>
        </div>
        <div className="hero-badge">
          <span>AI ENGINE</span>
          <strong>{viewMode === 'visual' ? 'Visual Tick' : 'Route RL'}</strong>
        </div>
      </div>

      <div className="control-panel ai-control-panel">
        <div className="section-title">AI 模拟参数</div>
        <div className="row-two">
          <label>
            职业路线
            <select value={jobKey} onChange={(event) => setJobKey(event.target.value)}>
              {JOB_OPTIONS.map((job) => (
                <option key={job.key} value={job.key}>{job.label}</option>
              ))}
            </select>
          </label>
          <label>
            推荐目标
            <select value={strategy} onChange={(event) => setStrategy(event.target.value)}>
              {STRATEGIES.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="row-two">
          <label>
            起始等级
            <input
              type="number"
              min={10}
              max={119}
              value={startLevel}
              onChange={(event) => setStartLevel(clampNumber(event.target.value, startLevel, 10, 119))}
            />
          </label>
          <label>
            目标等级
            <input
              type="number"
              min={11}
              max={120}
              value={safeTargetLevel}
              onChange={(event) => setTargetLevel(clampNumber(event.target.value, targetLevel, startLevel + 1, 120))}
            />
          </label>
        </div>

        <div className="row-two">
          <label>
            资金模式
            <select value={budget} onChange={(event) => setBudget(event.target.value)}>
              {BUDGETS.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            模拟视图
            <select value={viewMode} onChange={(event) => setViewMode(event.target.value)}>
              <option value="visual">实时战斗可视化</option>
              <option value="route">路线决策沙盒</option>
            </select>
          </label>
        </div>

        <p className="job-note">{selectedJob?.notes ?? '当前职业参数读取中'}</p>
      </div>

      <div className="sandbox-findings">
        <div className="finding optimization">
          <strong>角色同步</strong>
          <p>使用同一套职业、等级、AP、装备选择逻辑，直接渲染仪表盘角色预览。</p>
        </div>
        <div className="finding success">
          <strong>地图同步</strong>
          <p>实时战斗背景来自当前推荐地图，怪物图标来自当前推荐怪物。</p>
        </div>
        <div className="finding warning">
          <strong>数据同步</strong>
          <p>怪物 HP、EXP、攻击、防御、命中、回避优先从 AppData/MeowDB 快照读取。</p>
        </div>
      </div>

      {loadError ? <p className="load-error">AI 数据读取提示：{loadError}</p> : null}

      {viewMode === 'visual' ? (
        <TickBattleSimulator
          jobKey={jobKey}
          strategy={strategy}
          budget={budget}
          dataCoverage={dataCoverage}
          gameData={data}
          visualContext={visualContext}
        />
      ) : !data ? (
        <div className="sandbox-empty">正在读取 AI 模拟数据...</div>
      ) : (
        <SandboxPanel data={data} input={input} />
      )}
    </section>
  );
}
