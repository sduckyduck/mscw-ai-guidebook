export const PROFESSIONS = [
  { id: 'smithing', name: '锻造', icon: '⚒️', focus: '战士武器与金属装备' },
  { id: 'weaponcrafting', name: '武器制作', icon: '🗡️', focus: '职业武器路线' },
  { id: 'tailoring', name: '裁缝', icon: '🧵', focus: '布甲与法师装备' },
  { id: 'woodcrafting', name: '木工', icon: '🪵', focus: '弓弩、木材与远程装备' },
  { id: 'leatherworking', name: '皮革', icon: '🧤', focus: '飞侠/弓手皮革装备' },
  { id: 'arcforge', name: '融合机体', icon: '🔮', focus: '核心材料融合与高阶组件' },
];

export const MATERIALS = [
  { id: 'ore-bronze', name: '青铜矿石', source: '低级矿脉/低级怪物', valueTags: ['基础金属', '覆盖广'] },
  { id: 'ore-steel', name: '钢铁矿石', source: '中低级矿脉/战士装备材料', valueTags: ['武器常用'] },
  { id: 'wood-basic', name: '普通木材', source: '木妖/木材采集', valueTags: ['木工核心'] },
  { id: 'leather-basic', name: '动物皮', source: '猪猪/野兽类怪物', valueTags: ['皮革核心'] },
  { id: 'cloth-basic', name: '柔软羽毛/布料', source: '低级怪物掉落', valueTags: ['裁缝核心'] },
  { id: 'crystal-basic', name: '基础结晶', source: '融合/精炼', valueTags: ['融合机体'] },
  { id: 'monster-essence', name: '怪物精华', source: '怪物掉落/分解', valueTags: ['跨专业'] },
];

export const RECIPES = [
  {
    id: 'bronze-sword',
    profession: 'smithing',
    level: 1,
    output: '青铜剑坯',
    exp: 16,
    mesoCost: 120,
    materials: [
      { id: 'ore-bronze', qty: 3 },
      { id: 'wood-basic', qty: 1 },
    ],
  },
  {
    id: 'training-spear',
    profession: 'weaponcrafting',
    level: 2,
    output: '练习长枪组件',
    exp: 22,
    mesoCost: 180,
    materials: [
      { id: 'ore-steel', qty: 2 },
      { id: 'wood-basic', qty: 2 },
    ],
  },
  {
    id: 'soft-robe-lining',
    profession: 'tailoring',
    level: 1,
    output: '柔软内衬',
    exp: 14,
    mesoCost: 90,
    materials: [
      { id: 'cloth-basic', qty: 4 },
    ],
  },
  {
    id: 'bow-limb',
    profession: 'woodcrafting',
    level: 1,
    output: '弓臂',
    exp: 15,
    mesoCost: 100,
    materials: [
      { id: 'wood-basic', qty: 4 },
      { id: 'monster-essence', qty: 1 },
    ],
  },
  {
    id: 'leather-grip',
    profession: 'leatherworking',
    level: 1,
    output: '皮革握把',
    exp: 15,
    mesoCost: 100,
    materials: [
      { id: 'leather-basic', qty: 3 },
      { id: 'monster-essence', qty: 1 },
    ],
  },
  {
    id: 'basic-core',
    profession: 'arcforge',
    level: 1,
    output: '基础融合核心',
    exp: 30,
    mesoCost: 260,
    materials: [
      { id: 'crystal-basic', qty: 2 },
      { id: 'monster-essence', qty: 3 },
    ],
  },
];
