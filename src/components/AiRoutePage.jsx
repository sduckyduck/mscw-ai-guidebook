import { useEffect, useMemo, useState } from 'react';
import { SandboxPanel } from '../ai/SandboxPanel';
import { loadGameData } from '../ai/simulator/data';
import { JOB_OPTIONS } from '../ai/simulator/jobs';
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

export default function AiRoutePage() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [jobKey, setJobKey] = useState('spearman');
  const [startLevel, setStartLevel] = useState(10);
  const [targetLevel, setTargetLevel] = useState(40);
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
            这版把原来的无头数值沙盒升级成前端可视化模拟器：Tick 时间轴、坐标空间、攻击范围、碰撞伤害、无敌帧、药水消耗、伤害跳字和 UI 状态同步都会直接展示。
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
          <strong>从回合制到 Tick-based</strong>
          <p>每个动作都占用时间：攻击冷却、怪物追踪、复活、无敌帧和药水触发都按 Tick 推进。</p>
        </div>
        <div className="finding success">
          <strong>从纯数值到空间判定</strong>
          <p>Player_X / Monster_X 决定攻击范围；碰撞半径触发 touch damage、击退和 i-frames。</p>
        </div>
        <div className="finding warning">
          <strong>从后台算法到 UI 渲染</strong>
          <p>HP/MP/EXP 条、伤害跳字、状态动画和公式回放会跟随模拟状态实时更新。</p>
        </div>
      </div>

      {loadError ? <p className="load-error">AI 数据读取提示：{loadError}</p> : null}

      {viewMode === 'visual' ? (
        <TickBattleSimulator jobKey={jobKey} strategy={strategy} budget={budget} dataCoverage={dataCoverage} gameData={data} />
      ) : !data ? (
        <div className="sandbox-empty">正在读取 AI 模拟数据...</div>
      ) : (
        <SandboxPanel data={data} input={input} />
      )}
    </section>
  );
}
