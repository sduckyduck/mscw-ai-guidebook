export const SKILL_BUILDS = {
  warrior: [
    { level: '10-20', priority: '生命恢复/生命强化 → 强力攻击', note: '优先提高生存和单体输出，前期少坐牢。' },
    { level: '21-30', priority: '群体攻击 → 强力攻击补满', note: '开始追求清怪效率，适合猪海岸/蚂蚁洞。' },
  ],
  fighter: [
    { level: '30-45', priority: '精准武器 → 快速武器 → 终极剑/斧', note: '先稳定命中和手感，再补输出。' },
    { level: '46-70', priority: '愤怒之火 → 伤害技能补满', note: '组队价值提升，路线可以转中期高血量图。' },
  ],
  page: [
    { level: '30-45', priority: '精准武器 → 快速武器 → 威胁/压制类技能', note: '突出容错和稳定性。' },
    { level: '46-70', priority: '属性攻击路线 → 防御向技能补强', note: '根据目标怪属性调整刷图。' },
  ],
  spearman: [
    { level: '30-45', priority: '精准枪/矛 → 快速枪/矛 → 极限防御', note: '长兵器攻击范围舒服，先解决命中和速度。' },
    { level: '46-70', priority: '神圣之火 → 输出技能补满', note: '组队非常有价值，中期路线更自由。' },
  ],
  magician: [
    { level: '8-20', priority: '魔法弹 → 魔力恢复 → 魔力强化', note: '先确保蓝量成长和基础输出。' },
    { level: '21-30', priority: '魔法双击/魔法盾按路线补', note: '如果药水压力大，魔法盾不要太晚。' },
  ],
  fp: [
    { level: '30-45', priority: '火焰箭 → 精神力 → 缓速术', note: '对弱火怪收益高，单点伤害强。' },
    { level: '46-70', priority: '毒雾/火系补强', note: '后续可做属性地图推荐。' },
  ],
  il: [
    { level: '30-45', priority: '冰冻术 → 雷电术 → 精神力', note: '控场强，刷密集图舒服。' },
    { level: '46-70', priority: '雷电术补满 → 冰系控制补强', note: '适合多怪密集地图。' },
  ],
  cleric: [
    { level: '30-45', priority: '群体治愈 → 魔力吸收 → 祝福', note: '遇到不死系地图后体验明显提升。' },
    { level: '46-70', priority: '神圣之箭/祝福/治愈补强', note: '死亡之林等不死系图优先级高。' },
  ],
  bowman: [
    { level: '10-20', priority: '精准箭/远程箭 → 断魂箭', note: '先保证远程手感与单体输出。' },
    { level: '21-30', priority: '二连射/群攻路线', note: '根据刷图密度决定单体或群体优先。' },
  ],
  hunter: [
    { level: '30-45', priority: '精准弓 → 快速弓 → 爆炸箭', note: '爆炸箭成型后刷怪体验提升。' },
    { level: '46-70', priority: '无形箭 → 爆炸箭补满', note: '降低消耗并提高群怪效率。' },
  ],
  crossbowman: [
    { level: '30-45', priority: '精准弩 → 快速弩 → 穿透箭', note: '穿透路线适合直线地形。' },
    { level: '46-70', priority: '无形箭 → 主力技能补满', note: '选图时关注平台和直线怪密度。' },
  ],
  thief: [
    { level: '10-20', priority: '双飞斩/二连击 → 远程暗器或集中术', note: '刺客和侠客在一转后期开始分化。' },
    { level: '21-30', priority: '主输出补满 → 机动/隐身补点', note: '消耗与装备会影响路线选择。' },
  ],
  assassin: [
    { level: '30-45', priority: '精准暗器 → 强力投掷 → 快速暗器', note: '先稳定伤害和手感。' },
    { level: '46-70', priority: '无形镖 → 速度/暴击补强', note: '降低标消耗，中后期体验更顺。' },
  ],
  bandit: [
    { level: '30-45', priority: '精准短刀 → 快速短刀 → 回旋斩', note: '近战爆发直接，但要注意药水压力。' },
    { level: '46-70', priority: '回旋斩补满 → 生存/机动补强', note: '适合怪物密度适中、站位安全的图。' },
  ],
  pirate: [
    { level: '10-20', priority: '直拳/双弹射击 → 疾驰类机动', note: '国服扩展职业，先按拳手/火枪路线分化。' },
    { level: '21-30', priority: '主输出补满 → 机动补强', note: '拳手偏近战，火枪偏远程。' },
  ],
  brawler: [
    { level: '30-45', priority: '精准指节 → 快速指节 → 主动连段', note: '吃站位和节奏，适合喜欢操作的人。' },
    { level: '46-70', priority: '能量/连段技能补强', note: '后续可接国服官方数据修正。' },
  ],
  gunslinger: [
    { level: '30-45', priority: '精准枪 → 快速枪 → 远程射击技能', note: '拉扯能力强，平台图体验好。' },
    { level: '46-70', priority: '机动技能 → 主输出补满', note: '地图推荐更看平台高度和怪物密度。' },
  ],
};
