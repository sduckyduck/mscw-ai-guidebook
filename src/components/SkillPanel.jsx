import { useState } from 'react';
import CharacterPreview from './CharacterPreview.jsx';
import IconFallback, { baseUrl, iconSourcesFromNames } from './IconFallback.jsx';
import SkillDetailSheet from './SkillDetailSheet.jsx';
import '../styles/detail-sheets.css';

const STAT_KEYS = ['STR', 'DEX', 'INT', 'LUK'];
const SKILL_ICON_FOLDERS = ['icons/skill', 'icons/skills', 'icons'];

const SKILL_ICON_ALIASES = {
  'Base Attack': ['base attack', 'basic attack', 'attack', 'normal attack'],
  '基础攻击': ['base attack', 'basic attack', 'attack', 'normal attack'],
  '强力攻击': ['power strike', '1001001_Power_Strike'],
  '群体攻击': ['slash blast', '1001002_Slash_Blast'],
  '提高 HP 恢复': ['improved hp recovery', '1000000_Improved_HP_Recovery'],
  '提高 HP 上限': ['max hp increase', '1000001_Max_HP_Increase'],
  '精准打击': ['precise strikes', '1000002_Precise_Strikes'],
  '铁甲术': ['iron body', '1001000_Iron_Body'],
  '魔力弹': ['energy bolt', '2001002_Energy_Bolt'],
  '提高 MP 恢复': ['improved mp recovery', '2000000_Improved_MP_Recovery'],
  '提高 MP 上限': ['max mp increase', '2000001_Max_MP_Increase'],
  '魔法双击': ['magic claw', '2001003_Magic_Claw'],
  '魔法盾': ['magic guard', '2001000_Magic_Guard'],
  '魔法铠甲': ['magic armor', '2001001_Magic_Armor'],
  '强力箭': ['critical shot', '3000000_Critical_Shot'],
  '远程箭': ['eye of amazon', '3000002_The_Eye_of_Amazon'],
  '集中术': ['focus', '3001000_Focus'],
  '断魂箭': ['arrow blow', '3001001_Arrow_Blow'],
  '二连射': ['double shot', '3001002_Double_Shot'],
  '双飞斩': ['lucky seven', '4001003_Lucky_Seven'],
  '劈空斩': ['double stab', '4001002_Double_Stab'],
  '远程暗器': ['keen eyes', '4000001_Keen_Eyes'],
  '诅咒术': ['disorder', '4001000_Disorder'],
  '隐身': ['dark sight', '4001001_Dark_Sight'],
  '灵巧身手': ['nimble body', '4000000_Nimble_Body'],
  '剑精通': ['sword mastery', '1100000_Sword_Mastery', '1200000_Sword_Mastery'],
  '斧精通': ['axe mastery', '1100001_Axe_Mastery'],
  '钝器精通': ['blunt weapon mastery', '1200001_Blunt_Weapon_Mastery'],
  '枪精通': ['spear mastery', '1300000_Spear_Mastery'],
  '矛精通': ['polearm mastery', '1300001_Polearm_Mastery'],
  '终极剑': ['final attack sword', '1101000_Final_Attack_Sword', '1201000_Final_Attack_Sword'],
  '终极斧': ['final attack axe', '1101001_Final_Attack_Axe'],
  '终极钝器': ['final attack blunt weapon', '1201001_Final_Attack_Blunt_Weapon'],
  '终极枪': ['final attack spear', '1301000_Final_Attack_Spear'],
  '终极矛': ['final attack polearm', '1301001_Final_Attack_Polearm'],
  '剑加速': ['sword booster', '1101002_Sword_Booster', '1201002_Sword_Booster'],
  '斧加速': ['axe booster', '1101003_Axe_Booster'],
  '钝器加速': ['blunt weapon booster', '1201003_Blunt_Weapon_Booster'],
  '枪加速': ['spear booster', '1301002_Spear_Booster'],
  '矛加速': ['polearm booster', '1301003_Polearm_Booster'],
  '愤怒': ['rage', '1101004_Rage'],
  '伤害反击': ['power guard', '1101005_Power_Guard', '1201005_Power_Guard'],
  '压制术': ['threaten', '1201004_Threaten'],
  '钢铁意志': ['iron will', '1301004_Iron_Will'],
  '神圣之火': ['hyper body', '1301005_Hyper_Body'],
  'MP 吸收': ['mp eater', '2100000_MP_Eater', '2200000_MP_Eater', '2300000_MP_Eater'],
  '精神力': ['meditation', '2101000_Meditation', '2201000_Meditation'],
  '瞬间移动': ['teleport', '2101001_Teleport', '2201001_Teleport', '2301000_Teleport'],
  '缓速术': ['slow', '2101002_Slow', '2201002_Slow'],
  '火箭术': ['fire arrow', '2101003_Fire_Arrow'],
  '毒雾': ['poison breath', '2101004_Poison_Breath'],
  '冰冻术': ['cold beam', '2201003_Cold_Beam'],
  '雷电术': ['thunder bolt', '2201004_Thunder_Bolt'],
  '治愈术': ['heal', '2301001_Heal'],
  '神之保护': ['invincible', '2301002_Invincible'],
  '祝福': ['bless', '2301003_Bless'],
  '圣箭术': ['holy arrow', '2301004_Holy_Arrow'],
  '弓精通': ['bow mastery', '3100000_Bow_Mastery'],
  '终极弓': ['final attack bow', '3101000_Final_Attack_Bow'],
  '弓加速': ['bow booster', '3101001_Bow_Booster'],
  '强弓': ['power knockback', '3101002_Power_Knockback'],
  '无形箭': ['soul arrow bow', '3101003_Soul_Arrow_Bow'],
  '爆炸箭': ['arrow bomb bow', '3101004_Arrow_Bomb_Bow'],
  '弩精通': ['crossbow mastery', '3200000_Crossbow_Mastery'],
  '终极弩': ['final attack crossbow', '3201000_Final_Attack_Crossbow'],
  '弩加速': ['crossbow booster', '3201001_Crossbow_Booster'],
  '强弩': ['power knockback', '3201002_Power_Knockback'],
  '无形弩': ['soul arrow crossbow', '3201003_Soul_Arrow_Crossbow'],
  '穿透箭': ['iron arrow crossbow', '3201004_Iron_Arrow_Crossbow'],
  '精准暗器': ['claw mastery', '4100000_Claw_Mastery'],
  '强力投掷': ['critical throw', '4100001_Critical_Throw'],
  '恢复术': ['critical recovery', 'nimble recovery', '4100002_Critical_Recovery', '4200001_Nimble_Recovery'],
  '快速暗器': ['claw booster', '4101000_Claw_Booster'],
  '轻功': ['haste', '4101001_Haste', '4201001_Haste'],
  '吸血': ['drain', '4101002_Drain'],
  '精准短刀': ['dagger mastery', '4200000_Dagger_Mastery'],
  '快速短刀': ['dagger booster', '4201000_Dagger_Booster'],
  '偷窃': ['steal', '4201002_Steal'],
  '回旋斩': ['savage blow', '4201003_Savage_Blow'],
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function publicIconAsset(path) {
  if (!path) return '';
  return `${baseUrl()}${String(path).replace(/^\/+/, '')}`;
}

function getSkillNames(name) {
  return [name, ...(SKILL_ICON_ALIASES[name] ?? [])].filter(Boolean);
}

function getSkillSources(name, iconKey = '') {
  if (name === 'Base Attack' || name === '基础攻击') return [];
  const names = getSkillNames(name);
  return unique([
    publicIconAsset(iconKey),
    ...iconSourcesFromNames(names, SKILL_ICON_FOLDERS),
  ]);
}

function trimSkillHint(value, max = 96) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function getShortSkillHint(skill, plan) {
  const levelStats = skill.allLevelStats ?? skill.all_level_stats ?? [];
  if (levelStats.length) {
    if (skill.level > 0) return trimSkillHint(levelStats[Math.max(0, skill.level - 1)] ?? 'Click to view skill effect');
    return levelStats[0] ? trimSkillHint(`Next Lv.1: ${levelStats[0]}`) : 'Click to view skill effect';
  }
  const damage = plan?.damageCards?.find((card) => card.name === skill.name);
  if (damage && skill.level > 0) return `当前伤害 ${damage.min}-${damage.max}`;
  if (skill.locked) return '点击查看开放条件';
  if (skill.level > 0) return `已加 ${skill.level} 点，点击查看效果`;
  return '点击查看技能说明';
}

export default function SkillPanel({
  plan,
  apNote,
  statPlan,
  classLine,
  gender = 'female',
  gear = [],
  level = 10,
  weapon,
  apAllocation,
  onApChange,
  onApReset,
  onSkillChange,
  onSkillReset,
}) {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const firstJobSkills = plan.skills.filter((skill) => skill.tier !== 'second');
  const secondJobSkills = plan.skills.filter((skill) => skill.tier === 'second');

  return (
    <section className="mg-dashboard mg-character-dashboard">
      <h1 className="mg-dashboard-title">MapleGuide: 角色能力与技能分配</h1>
      <p className="mg-dashboard-subtitle">SP/AP Distribution · 当前 {classLine?.name ?? '角色'} Lv.{level}</p>

      <div className="mg-character-grid">
        <div className="mg-left-stack">
          <section className="mg-glass-panel mg-ap-panel">
            <PanelHead kicker="AP 加点" title="能力值分配" action="系统推荐" onAction={onApReset} />
            <p className="mg-character-note">{apNote}</p>
            <div className="mg-character-meter">
              <span>总剩余 AP</span>
              <strong>{statPlan.remainingAp}</strong>
            </div>
            <div className="mg-ap-grid">
              {STAT_KEYS.map((stat) => (
                <PointRow
                  key={stat}
                  label={stat}
                  value={statPlan.stats[stat]}
                  points={apAllocation?.[stat] ?? 0}
                  canMinus={(apAllocation?.[stat] ?? 0) > 0}
                  canPlus={statPlan.remainingAp > 0}
                  onMinus={() => onApChange(stat, -1)}
                  onPlus={() => onApChange(stat, 1)}
                />
              ))}
            </div>
          </section>

          <SkillGroupCard
            title="一转技能"
            kicker="SP 加点"
            action="系统推荐"
            onAction={onSkillReset}
            note={plan.summary}
            remaining={plan.remainingByTier?.first ?? 0}
            total={plan.totalSpByTier?.first ?? 0}
            skills={firstJobSkills}
            plan={plan}
            onSkillChange={onSkillChange}
            onSkillInspect={setSelectedSkill}
            glass
          />
        </div>

        <div className="mg-right-stack">
          <section className="mg-character-preview-card">
            <div className="mg-character-frame-lg">
              <CharacterPreview classLine={classLine} gender={gender} gear={gear} />
            </div>
            <div className="mg-character-preview-meta">
              <strong>{classLine?.name ?? '角色'} Lv.{level}</strong>
              <span>{weapon?.title ?? '当前装备'}</span>
            </div>
          </section>

          {secondJobSkills.length > 0 && (
            <SkillGroupCard
              title="二转技能"
              kicker={Number(level) > 30 ? '已开放' : 'Lv.30 后开放'}
              remaining={plan.remainingByTier?.second ?? 0}
              total={plan.totalSpByTier?.second ?? 0}
              skills={secondJobSkills}
              plan={plan}
              onSkillChange={onSkillChange}
              onSkillInspect={setSelectedSkill}
              className="mg-second-skill-card"
            />
          )}
        </div>
      </div>

      <div className="mg-actions mg-character-actions">
        <button className="mg-action-small">分享</button>
        <button className="mg-action-main">更换推荐 / 生成路线</button>
        <button className="mg-action-small">百科</button>
      </div>
      <p className="mg-footer">© 2026 MapleGuide | by SduckyDuck</p>
      <SkillDetailSheet skill={selectedSkill} plan={plan} onClose={() => setSelectedSkill(null)} />
    </section>
  );
}

function SkillGroupCard({ title, kicker, action, onAction, note, remaining, total, skills, plan, onSkillChange, onSkillInspect, glass = false, className = '' }) {
  const cardClass = [glass ? 'mg-glass-panel mg-sp-panel' : 'mg-skill-side-card', className].filter(Boolean).join(' ');

  return (
    <section className={cardClass}>
      <PanelHead kicker={kicker} title={title} action={action} onAction={onAction} />
      {note && <p className="mg-character-note">{note}</p>}
      <div className="mg-character-meter mg-sp-meter">
        <span>剩余 SP</span>
        <strong>{remaining}</strong>
        <em>{title} {remaining}/{total}</em>
      </div>
      <SkillList skills={skills} plan={plan} onSkillChange={onSkillChange} onSkillInspect={onSkillInspect} />
    </section>
  );
}

function SkillList({ skills, plan, onSkillChange, onSkillInspect }) {
  return (
    <div className="mg-skill-stack compact">
      {skills.map((skill) => {
        const remainingForTier = plan.remainingByTier?.[skill.tier] ?? plan.remainingSp;
        return (
          <SkillPointRow
            key={skill.name}
            skill={skill}
            plan={plan}
            canMinus={!skill.locked && skill.level > 0}
            canPlus={!skill.locked && remainingForTier > 0 && skill.level < skill.max}
            onMinus={() => onSkillChange(skill.name, -1)}
            onPlus={() => onSkillChange(skill.name, 1)}
            onInspect={() => onSkillInspect(skill)}
          />
        );
      })}
    </div>
  );
}

function PanelHead({ kicker, title, action, onAction }) {
  return (
    <div className="mg-character-panel-head">
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
      {action && <button onClick={onAction}>{action}</button>}
    </div>
  );
}

function PointRow({ label, value, points, canMinus, canPlus, onMinus, onPlus }) {
  return (
    <article className="mg-ap-box">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <em>AP +{points}</em>
      </div>
      <div className="mg-mini-controls">
        <button onClick={onMinus} disabled={!canMinus}>-</button>
        <button onClick={onPlus} disabled={!canPlus}>+</button>
      </div>
    </article>
  );
}

function SkillPointRow({ skill, plan, canMinus, canPlus, onMinus, onPlus, onInspect }) {
  const rowClass = ['mg-skill-row clickable', skill.locked ? 'locked' : '', skill.tier === 'second' ? 'second-job' : 'first-job'].filter(Boolean).join(' ');
  return (
    <article className={rowClass} role="button" tabIndex={0} onClick={onInspect} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onInspect(); }}>
      <SkillBadge name={skill.name} iconKey={skill.iconKey} />
      <div className="mg-skill-main">
        <strong>{skill.name}</strong>
        <span>Lv. {skill.level}/{skill.max}{skill.locked ? ' · Lv.30 后开放' : ' · [+/-]'}</span>
        <small>{getShortSkillHint(skill, plan)}</small>
      </div>
      <div className="mg-mini-controls" onClick={(event) => event.stopPropagation()}>
        <button onClick={onMinus} disabled={!canMinus}>-</button>
        <button onClick={onPlus} disabled={!canPlus}>+</button>
      </div>
    </article>
  );
}

function SkillBadge({ name, iconKey = '', compact = false }) {
  const letters = String(name || '?').replace(/\s+/g, '').slice(0, 2);
  const names = getSkillNames(name);
  return (
    <div className={compact ? 'mg-skill-badge neutral' : 'mg-skill-badge'}>
      <IconFallback
        className="mg-skill-icon-img"
        names={names}
        folders={SKILL_ICON_FOLDERS}
        sources={getSkillSources(name, iconKey)}
        alt=""
        debugLabel={`skill:${name}`}
        fallback={<span>{letters}</span>}
      />
    </div>
  );
}
