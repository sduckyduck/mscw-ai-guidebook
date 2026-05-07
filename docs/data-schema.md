# Data Schema Plan

This app currently uses seed data under `src/data/`. The long-term goal is to convert official `AppData` and `RawData` into these normalized schemas.

## Recommended folder layout

```txt
public/
  AppData/
  RawData/
src/
  data/
  engine/
```

Vite only serves static runtime files from `public/`, so official data that must be loaded by the browser should live under `public/AppData` and `public/RawData`.

## Monster schema

```js
{
  id: 'slime',
  name: '绿水灵',
  level: 6,
  hp: 50,
  exp: 10,
  avoid: 1,
  requiredAccuracy: 7,
  elementWeakness: [],
  elementResist: [],
  defense: 2,
  attackType: 'contact'
}
```

## Map schema

```js
{
  id: 'henesys-hunting-ground',
  name: '射手村训练场',
  region: '维多利亚岛',
  levelRange: [1, 15],
  tags: ['新手', '低成本'],
  monsters: ['slime'],
  routeNote: '适合刚开荒熟悉操作。'
}
```

## Recipe schema

```js
{
  id: 'bronze-sword',
  profession: 'smithing',
  level: 1,
  output: '青铜剑坯',
  exp: 16,
  mesoCost: 120,
  materials: [
    { id: 'ore-bronze', qty: 3 }
  ]
}
```

## Skill build schema

```js
{
  level: '30-45',
  priority: '精准武器 → 快速武器',
  note: '先稳定命中和手感。'
}
```

## Converter strategy

1. Identify the official files that contain monster stats, map spawn lists, item names, skill names, and crafting recipes.
2. Write converters that turn official raw fields into the normalized schemas above.
3. Keep the engines stable: `levelEngine`, `recommendationEngine`, and `craftingEngine` should not depend on official raw field names.
4. Add a generated file such as `src/data/generated/monsters.generated.js` after conversion is stable.
