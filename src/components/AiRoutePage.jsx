import { useEffect, useMemo, useState } from 'react';
import { SandboxPanel } from '../ai/SandboxPanel';
import { loadGameData } from '../ai/simulator/data';
import { JOB_OPTIONS } from '../ai/simulator/jobs';
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

  return (
    <section className="section-card ai-route-page">
      <div className="sandbox-header">
        <div>
          <p className="eyebrow">MapleStory Classic World</p>
          <h1>AI 路线模拟器</h1>
          <p className="section-copy">
            这个页面会把怪物属性、地图刷怪组成、装备、AP/SP、命中、药耗、死亡风险和金币压力放进同一个开荒模拟里。
          </p>
        </div>
        <div className="hero-badge">
          <span>AI BOT</span>
          <strong>Guidebook v1</strong>
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
            模拟说明
            <input value={selectedJob?.notes ?? '当前职业参数读取中'} readOnly />
          </label>
        </div>
      </div>

      <div className="sandbox-findings">
        <div className="finding optimization">
          <strong>怪物层</strong>
          <p>使用等级、HP、EXP、攻击、防御、avoid、地图出现数，输出加权命中和击杀效率。</p>
        </div>
        <div className="finding success">
          <strong>装备层</strong>
          <p>使用等级需求、职业需求、攻击/魔攻、命中、属性、防御和资金模式，决定是否值得换装。</p>
        </div>
        <div className="finding warning">
          <strong>经济层</strong>
          <p>第一版已接药耗/金币压力；下一步会接 MeowDB NPC 商店、消耗品价格和本地快照。</p>
        </div>
      </div>

      {loadError ? <p className="load-error">AI 数据读取提示：{loadError}</p> : null}

      {!data ? (
        <div className="sandbox-empty">正在读取 AI 模拟数据...</div>
      ) : (
        <SandboxPanel data={data} input={input} />
      )}
    </section>
  );
}
