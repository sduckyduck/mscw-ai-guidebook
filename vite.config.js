import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function mscwAlgorithmPatch() {
  return {
    name: 'mscw-algorithm-patch',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0].replace(/\\/g, '/');
      if (!cleanId.endsWith('/src/App.jsx')) return null;

      let next = code;

      next = next.replace(
        "import { getMapRecommendations } from './engine/recommendationEngine.js';",
        "import { getMapRecommendations } from './engine/recommendationEngineV3.js';\nimport { buildRecommendedGearV2 } from './engine/gearRecommendationEngine.js';",
      );

      next = next.replace(
        'const statPlan = useMemo(() => buildStatPlan(classLine, level), [classLine, level]);',
        "const statPlan = useMemo(() => buildStatPlan(classLine, level, { budget }), [classLine, level, budget]);",
      );

      next = next.replace(
        `() => getMapRecommendations({\n      classLine,\n      level,\n      statPlan,\n      maps: officialData?.maps,\n      monsters: officialData?.monsters,\n    }).slice(0, 8),\n    [classLine, level, statPlan, officialData],`,
        `() => getMapRecommendations({\n      classLine,\n      branch: selectedBranch,\n      level,\n      statPlan,\n      budget,\n      priority,\n      mode,\n      maps: officialData?.maps,\n      monsters: officialData?.monsters,\n    }).slice(0, 8),\n    [classLine, selectedBranch, level, statPlan, budget, priority, mode, officialData],`,
      );

      next = next.replace(
        'const recommendedGear = buildRecommendedGear(classLine, level, budget, officialData?.items, professionRecipes);',
        'const recommendedGear = buildRecommendedGearV2(classLine, level, budget, officialData?.items, professionRecipes);',
      );

      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  plugins: [mscwAlgorithmPatch(), react()],
  base: process.env.GITHUB_ACTIONS ? '/mscw-guidebook/' : '/',
});
