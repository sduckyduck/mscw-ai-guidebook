const BASE_URL = import.meta.env?.BASE_URL || '/';

function asset(path) {
  if (!path) return '';
  return `${BASE_URL}${String(path).replace(/^\/+/, '')}`;
}

function levelOf(skill, offset = 0) {
  const max = Number(skill?.max || 0);
  return Math.max(0, Math.min(max, Number(skill?.level || 0) + offset));
}

function percent(value) {
  return `${Math.round(value)}%`;
}

function seconds(value) {
  return `${Math.round(value)} 秒`;
}

function mk(type, note, current, next, values = []) {
  return { type, note, current, next, values };
}

function officialStats(skill) {
  return skill?.allLevelStats ?? skill?.all_level_stats ?? [];
}

function cleanDescription(description = '') {
  const lines = String(description)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\[Master Level/i.test(line));
  return lines.join(' ') || String(description).trim() || 'Current AppData skill entry.';
}

function officialEffectType(skill, currentText = '') {
  const text = `${skill?.description ?? ''} ${currentText}`;
  if (/Damage|Basic Attack|Attack \d+x/i.test(text)) return 'Attack skill';
  if (/\bfor\s+\d+\s+sec|while active|party/i.test(text)) return 'Active buff';
  if (/Max HP|Max MP|Accuracy|Avoidability|Mastery|Critical Rate|Critical Damage/i.test(text)) return 'Passive stat skill';
  return 'Skill effect';
}

function effectPills(text, nextText) {
  return [text, nextText]
    .flatMap((value) => String(value || '').split(/[;,]/))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function officialSkillEffect(skill) {
  const stats = officialStats(skill);
  if (!stats.length) return null;
  const lv = levelOf(skill);
  const nx = levelOf(skill, 1);
  const max = Number(skill?.max || 0);
  const currentText = lv > 0 ? String(stats[lv - 1] ?? '') : '';
  const nextText = nx > 0 ? String(stats[nx - 1] ?? '') : '';
  return mk(
    officialEffectType(skill, currentText || nextText),
    cleanDescription(skill?.description),
    currentText ? `Current Lv.${lv}: ${currentText}` : `Current Lv.${lv}: no SP invested, no level effect is active.`,
    lv >= max ? `Next level: maxed. Effect remains: ${currentText || stats[max - 1] || 'none'}.` : `Next Lv.${nx}: ${nextText}`,
    effectPills(currentText, nextText),
  );
}

function attackEffect(skill, cfg) {
  const lv = levelOf(skill);
  const nx = levelOf(skill, 1);
  const max = Number(skill?.max || 0);
  const cur = lv ? Math.max(cfg.min ?? 1, cfg.start + cfg.per * lv) : 0;
  const next = nx ? Math.max(cfg.min ?? 1, cfg.start + cfg.per * nx) : 0;
  const mp = Math.max(0, Math.round((cfg.mpBase ?? 5) + lv * (cfg.mpPer ?? 0.6)));
  const nextMp = Math.max(0, Math.round((cfg.mpBase ?? 5) + nx * (cfg.mpPer ?? 0.6)));
  return mk(
    cfg.type || '主动攻击技能',
    cfg.note || '主动攻击技能，伤害会随技能等级提升。',
    `当前 Lv.${lv}：造成 ${percent(cur)} 伤害，攻击段数 ${cfg.hits || 1}，约消耗 MP ${mp}。`,
    lv >= max ? `下一级：已经满级，伤害保持 ${percent(cur)}。` : `下一级 Lv.${nx}：造成 ${percent(next)} 伤害，攻击段数 ${cfg.hits || 1}，约消耗 MP ${nextMp}。`,
    [`当前 ${percent(cur)}`, lv < max ? `下一级 ${percent(next)}` : '已满级', `${cfg.hits || 1} 段`],
  );
}

function growthEffect(skill, statName) {
  const lv = levelOf(skill);
  const nx = levelOf(skill, 1);
  const max = Number(skill?.max || 0);
  const cur = lv >= max ? 20 : Math.round((lv / Math.max(1, max)) * 20);
  const next = nx >= max ? 20 : Math.round((nx / Math.max(1, max)) * 20);
  return mk(
    '被动成长技能',
    `这个技能越早点高，后面累计 ${statName} 越好；它不是即时回复，而是升级成长收益。`,
    `当前 Lv.${lv}：升级时最大 ${statName} 成长 +${percent(cur)}。`,
    lv >= max ? `下一级：已经满级，最大 ${statName} 成长加成保持 +20%。` : `下一级 Lv.${nx}：升级时最大 ${statName} 成长 +${percent(next)}。`,
    [`当前 +${percent(cur)}`, lv < max ? `下一级 +${percent(next)}` : '已满级'],
  );
}

function flatPassive(skill, cfg) {
  const lv = levelOf(skill);
  const nx = levelOf(skill, 1);
  const max = Number(skill?.max || 0);
  const cur = lv ? cfg.base + cfg.per * lv : 0;
  const next = nx ? cfg.base + cfg.per * nx : 0;
  const unit = cfg.unit || '';
  return mk(
    cfg.type,
    cfg.note,
    `当前 Lv.${lv}：${cfg.label} +${cur}${unit}。`,
    lv >= max ? `下一级：已经满级，${cfg.label}保持 +${cur}${unit}。` : `下一级 Lv.${nx}：${cfg.label} +${next}${unit}。`,
    [`当前 +${cur}${unit}`, lv < max ? `下一级 +${next}${unit}` : '已满级'],
  );
}

function percentBuff(skill, cfg) {
  const lv = levelOf(skill);
  const nx = levelOf(skill, 1);
  const max = Number(skill?.max || 0);
  const cur = lv ? Math.min(cfg.maxValue, cfg.start + cfg.per * lv) : 0;
  const next = nx ? Math.min(cfg.maxValue, cfg.start + cfg.per * nx) : 0;
  const duration = cfg.durationBase + cfg.durationPer * lv;
  const nextDuration = cfg.durationBase + cfg.durationPer * nx;
  return mk(
    cfg.type,
    cfg.note,
    `当前 Lv.${lv}：${cfg.label} +${percent(cur)}，持续 ${seconds(duration)}。`,
    lv >= max ? `下一级：已经满级，效果保持 +${percent(cur)}。` : `下一级 Lv.${nx}：${cfg.label} +${percent(next)}，持续 ${seconds(nextDuration)}。`,
    [`当前 +${percent(cur)}`, lv < max ? `下一级 +${percent(next)}` : '已满级', seconds(duration)],
  );
}

function flatBuff(skill, cfg) {
  const lv = levelOf(skill);
  const nx = levelOf(skill, 1);
  const max = Number(skill?.max || 0);
  const cur = lv ? cfg.start + cfg.per * lv : 0;
  const next = nx ? cfg.start + cfg.per * nx : 0;
  const duration = cfg.durationBase + cfg.durationPer * lv;
  const nextDuration = cfg.durationBase + cfg.durationPer * nx;
  const unit = cfg.unit || '';
  return mk(
    cfg.type,
    cfg.note,
    `当前 Lv.${lv}：${cfg.label} +${cur}${unit}，持续 ${seconds(duration)}。`,
    lv >= max ? `下一级：已经满级，效果保持 +${cur}${unit}。` : `下一级 Lv.${nx}：${cfg.label} +${next}${unit}，持续 ${seconds(nextDuration)}。`,
    [`当前 +${cur}${unit}`, lv < max ? `下一级 +${next}${unit}` : '已满级', seconds(duration)],
  );
}

function dualEffect(skill, cfg) {
  const lv = levelOf(skill);
  const nx = levelOf(skill, 1);
  const max = Number(skill?.max || 0);
  const cur = lv ? cfg.start + cfg.per * lv : 0;
  const next = nx ? cfg.start + cfg.per * nx : 0;
  const hasDuration = Number(cfg.durationBase || 0) > 0;
  const duration = hasDuration ? cfg.durationBase + cfg.durationPer * lv : 0;
  const nextDuration = hasDuration ? cfg.durationBase + cfg.durationPer * nx : 0;
  return mk(
    cfg.type,
    cfg.note,
    hasDuration ? `当前 Lv.${lv}：${cfg.a} +${cur}，${cfg.b} +${cur}，持续 ${seconds(duration)}。` : `当前 Lv.${lv}：${cfg.a} +${cur}，${cfg.b} +${cur}。`,
    lv >= max ? `下一级：已经满级，效果保持 +${cur}。` : hasDuration ? `下一级 Lv.${nx}：${cfg.a} +${next}，${cfg.b} +${next}，持续 ${seconds(nextDuration)}。` : `下一级 Lv.${nx}：${cfg.a} +${next}，${cfg.b} +${next}。`,
    [`当前 +${cur}`, lv < max ? `下一级 +${next}` : '已满级'],
  );
}

function critEffect(skill, cfg) {
  const lv = levelOf(skill);
  const nx = levelOf(skill, 1);
  const max = Number(skill?.max || 0);
  const curChance = lv * cfg.chancePer;
  const nextChance = nx * cfg.chancePer;
  const curDamage = cfg.damageBase + lv * cfg.damagePer;
  const nextDamage = cfg.damageBase + nx * cfg.damagePer;
  return mk(
    cfg.type,
    cfg.note,
    `当前 Lv.${lv}：暴击概率 +${percent(curChance)}，暴击伤害约 ${percent(curDamage)}。`,
    lv >= max ? `下一级：已经满级，暴击概率保持 +${percent(curChance)}。` : `下一级 Lv.${nx}：暴击概率 +${percent(nextChance)}，暴击伤害约 ${percent(nextDamage)}。`,
    [`暴击 +${percent(curChance)}`, lv < max ? `下一级 +${percent(nextChance)}` : '已满级', `伤害 ${percent(curDamage)}`],
  );
}

function teleportEffect(skill) {
  const lv = levelOf(skill);
  const nx = levelOf(skill, 1);
  const max = Number(skill?.max || 0);
  const distance = 100 + lv * 7;
  const nextDistance = 100 + nx * 7;
  const mp = Math.max(13, 60 - lv * 2);
  const nextMp = Math.max(13, 60 - nx * 2);
  return mk(
    '位移技能',
    '瞬间移动主要提升跑图、躲避和刷怪节奏。',
    `当前 Lv.${lv}：瞬移距离约 ${distance}，消耗 MP ${mp}。`,
    lv >= max ? `下一级：已经满级，瞬移距离保持约 ${distance}。` : `下一级 Lv.${nx}：瞬移距离约 ${nextDistance}，消耗 MP ${nextMp}。`,
    [`距离 ${distance}`, lv < max ? `下一级 ${nextDistance}` : '已满级', `MP ${mp}`],
  );
}

function healEffect(skill) {
  const lv = levelOf(skill);
  const nx = levelOf(skill, 1);
  const max = Number(skill?.max || 0);
  const cur = 30 + lv * 5;
  const next = 30 + nx * 5;
  return mk(
    '治疗与亡灵攻击技能',
    '牧师练级时，治愈术会直接决定亡灵地图效率。',
    `当前 Lv.${lv}：治疗与亡灵伤害约 ${percent(cur)}，可作用于周围目标。`,
    lv >= max ? `下一级：已经满级，效果保持约 ${percent(cur)}。` : `下一级 Lv.${nx}：治疗与亡灵伤害约 ${percent(next)}。`,
    [`当前 ${percent(cur)}`, lv < max ? `下一级 ${percent(next)}` : '已满级'],
  );
}

function getSkillEffect(skill) {
  const official = officialSkillEffect(skill);
  if (official) return official;

  const name = skill?.name || '';
  const rules = {
    '提高 HP 上限': () => growthEffect(skill, 'HP'),
    '提高 MP 上限': () => growthEffect(skill, 'MP'),
    '提高 HP 恢复': () => flatPassive(skill, { label: 'HP 自然恢复', type: '被动续航技能', unit: '点', base: 2, per: 2, note: '主要减少红药压力，不直接提高单次伤害。' }),
    '提高 MP 恢复': () => flatPassive(skill, { label: 'MP 自然恢复', type: '被动续航技能', unit: '点', base: 1, per: 1, note: '主要减少蓝药压力，不直接提高单次伤害。' }),
    '魔法双击': () => attackEffect(skill, { type: '主动攻击技能', start: -50, per: 10, min: 10, hits: 2, mpBase: 8, note: '每次释放打出 2 段。比如 Lv.17 显示约 120%，Lv.18 显示约 130%。这里用于路线模拟展示。' }),
    '魔力弹': () => attackEffect(skill, { type: '前置攻击技能', start: 35, per: 4, min: 35, hits: 1, mpBase: 5, note: '通常只点 1 点作为魔法双击前置。' }),
    '强力攻击': () => attackEffect(skill, { type: '主动攻击技能', start: 80, per: 13, min: 80, hits: 1, mpBase: 4, note: '战士一转单体主攻。适合打血量较高的单只怪。' }),
    '群体攻击': () => attackEffect(skill, { type: '主动范围技能', start: 55, per: 7, min: 55, hits: 6, mpBase: 6, note: '适合怪物密集地图。伤害低于单体技，但能同时打多个目标。' }),
    '断魂箭': () => attackEffect(skill, { type: '主动攻击技能', start: 70, per: 9, min: 70, hits: 1, mpBase: 4, note: '弓箭手早期单体攻击技能。' }),
    '二连射': () => attackEffect(skill, { type: '主动攻击技能', start: 45, per: 6, min: 45, hits: 2, mpBase: 6, note: '连续射击两次，适合作为一转主攻。' }),
    '劈空斩': () => attackEffect(skill, { type: '主动攻击技能', start: 65, per: 8, min: 65, hits: 1, mpBase: 5, note: '刀飞一转近战攻击技能。' }),
    '双飞斩': () => attackEffect(skill, { type: '主动攻击技能', start: 55, per: 7, min: 55, hits: 2, mpBase: 8, note: '标飞一转核心输出技能，一次投出两枚飞镖。' }),
    '魔法盾': () => percentBuff(skill, { label: 'MP 抵消伤害', type: '防御 Buff', start: 5, per: 2.5, maxValue: 50, durationBase: 60, durationPer: 6, note: '受到伤害时由 MP 承担一部分伤害，提高容错，但会增加蓝耗压力。' }),
    '魔法铠甲': () => flatBuff(skill, { label: '物理防御力', type: '防御 Buff', unit: '点', start: 2, per: 2, durationBase: 60, durationPer: 6, note: '前期开荒能减少碰撞伤害压力，但优先级通常低于主攻和 MP 成长。' }),
    '铁甲术': () => flatBuff(skill, { label: '物理防御力', type: '防御 Buff', unit: '点', start: 2, per: 2, durationBase: 60, durationPer: 6, note: '战士前期防御 Buff。' }),
    '集中术': () => dualEffect(skill, { type: '辅助 Buff', a: '命中', b: '回避', start: 1, per: 1, durationBase: 60, durationPer: 6, note: '适合命中偏紧或想提高稳定性的地图。' }),
    '灵巧身手': () => dualEffect(skill, { type: '被动基础能力', a: '命中', b: '回避', start: 1, per: 1, note: '飞侠早期基础手感技能。' }),
    '远程箭': () => flatPassive(skill, { label: '攻击距离', type: '被动射程技能', unit: '距离', base: 15, per: 15, note: '提高弓箭手攻击距离，改善风筝和站位。' }),
    '远程暗器': () => flatPassive(skill, { label: '飞镖射程', type: '被动射程技能', unit: '距离', base: 20, per: 25, note: '标飞早期很重要，射程够了之后练级舒服很多。' }),
    '强力箭': () => critEffect(skill, { type: '被动输出技能', chancePer: 2, damageBase: 100, damagePer: 2, note: '提高弓箭手输出上限。' }),
    '强力投掷': () => critEffect(skill, { type: '被动输出技能', chancePer: 2, damageBase: 100, damagePer: 2, note: '提高标飞爆发上限。' }),
    '轻功': () => dualEffect(skill, { type: '移动 Buff', a: '移动速度', b: '跳跃力', start: 1, per: 1, durationBase: 60, durationPer: 6, note: '跑图和刷怪手感提升非常明显。' }),
    '瞬间移动': () => teleportEffect(skill),
    '治愈术': () => healEffect(skill),
    '神圣之火': () => percentBuff(skill, { label: '最大 HP/MP', type: '队伍 Buff', start: 2, per: 2, maxValue: 60, durationBase: 60, durationPer: 6, note: '提高队伍最大 HP 和 MP，是枪战士核心团队技能。' }),
    '祝福': () => dualEffect(skill, { type: '队伍 Buff', a: '命中与回避', b: '防御', start: 1, per: 1, durationBase: 60, durationPer: 6, note: '团队稳定性技能，适合组队和命中偏紧的地图。' }),
  };
  if (rules[name]) return rules[name]();
  if (/精通$/.test(name)) return flatPassive(skill, { label: '熟练度', type: '被动精通技能', unit: '%', base: 10, per: 2, note: '精通提高最低伤害，让输出波动变小。' });
  if (/加速$/.test(name)) return flatBuff(skill, { label: '攻击速度提升', type: '攻击速度 Buff', unit: '档', start: 0, per: 1, durationBase: 30, durationPer: 5, note: '加速类技能主要改善攻击节奏和手感。' });
  if (/^终极/.test(name)) return percentBuff(skill, { label: '追加攻击触发率', type: '被动追加攻击', start: 1, per: 2, maxValue: 60, durationBase: 0, durationPer: 0, note: '使用指定攻击技能后，有概率追加一次额外攻击。' });
  if (/箭|火箭术|冰冻术|雷电术|穿透箭|爆炸箭|回旋斩|吸血|圣箭术|毒雾/.test(name)) return attackEffect(skill, { type: '主动攻击技能', start: 45, per: 6, min: 45, hits: 1, mpBase: 8, note: '当前没有官方逐级表，先按路线模拟倍率显示。' });
  return flatPassive(skill, { label: '技能效果', type: '技能效果', unit: '级', base: 0, per: 1, note: '当前没有官方逐级表，先显示当前等级和下一级变化。' });
}

function SkillIcon({ skill }) {
  const letters = String(skill?.name || '?').replace(/\s+/g, '').slice(0, 2);
  const src = asset(skill?.iconKey);
  return (
    <div className="mg-skill-badge detail">
      {src ? <img className="mg-skill-icon-img" src={src} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span>{letters}</span>}
    </div>
  );
}

export default function SkillDetailSheet({ skill, plan, onClose }) {
  if (!skill) return null;
  const damage = plan?.damageCards?.find((card) => card.name === skill.name);
  const effect = getSkillEffect(skill);
  const currentLevel = Number(skill.level || 0);
  const maxLevel = Number(skill.max || 0);
  const progress = maxLevel > 0 ? Math.round((currentLevel / maxLevel) * 100) : 0;

  return (
    <div className="mg-detail-backdrop" onClick={onClose}>
      <section className="mg-detail-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="mg-detail-head">
          <SkillIcon skill={skill} />
          <div>
            <span>{skill.tierLabel || (skill.tier === 'second' ? '二转技能' : '一转技能')}</span>
            <h2>{skill.name}</h2>
            <p>当前 Lv. {skill.level}/{skill.max}</p>
          </div>
          <button onClick={onClose}>关闭</button>
        </div>

        <div className="mg-detail-kpis">
          <div><span>已投入 SP</span><strong>{skill.level}</strong></div>
          <div><span>最高等级</span><strong>{skill.max}</strong></div>
          <div><span>状态</span><strong>{skill.locked ? '未开放' : currentLevel >= maxLevel ? '已满级' : '可调整'}</strong></div>
        </div>

        <div className="mg-skill-progress">
          <span>技能等级进度</span>
          <div><i style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
          <em>{progress}%</em>
        </div>

        <p className="mg-detail-copy">{effect.note}</p>

        <div className="mg-effect-grid">
          <article><span>技能定位</span><strong>{effect.type}</strong></article>
          <article className="wide"><span>当前等级效果</span><strong>{effect.current}</strong></article>
          <article className="wide"><span>下一级变化</span><strong>{effect.next}</strong></article>
        </div>

        <div className="mg-effect-pills">
          {(effect.values || []).map((value) => <span key={value}>{value}</span>)}
        </div>

        {damage && (
          <div className="mg-detail-damage">
            <span>{damage.role || '路线估算伤害'}</span>
            <strong>{damage.min} - {damage.max}</strong>
            <em>这是根据当前角色属性、装备和当前技能点计算出来的路线估算伤害。上面的百分比是技能等级效果展示。</em>
          </div>
        )}
      </section>
    </div>
  );
}
