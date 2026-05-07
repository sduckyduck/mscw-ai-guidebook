# MSCW Guidebook

An interactive MapleStory Classic World guidebook app for character preview, level/AP/SP planning, map recommendations, monster lookup, skill builds, and crafting/profession optimization.

## Planned modules

- Character preview and class selection
- Level simulator with AP/SP progression
- Stat planner and hit-rate/map recommendation engine
- Monster and map explorer
- Skill build tables by class and level band
- Six-profession crafting guide and route optimizer
- Mobile-first guidebook UI

## Data folders

Recommended static data layout for Vite deployment:

```txt
public/AppData/
public/RawData/
```

If your official data folders currently sit at the repository root, move or copy them into `public/` so the browser can load them after deployment.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```
