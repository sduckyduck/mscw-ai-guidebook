import { CLASS_LINES } from '../data/classes.js';
import { buildStatPlan } from './levelEngine.js';
import { getMapRecommendations } from './recommendationEngineV2.js';

const EXAMPLES = [
  { classId: 'warrior', branchId: 'fighter', level: 17, budget: 'low', priority: 'stable', mode: 'safe' },
  { classId: 'warrior', branchId: 'spearman', level: 25, budget: 'high', priority: 'exp', mode: 'fast' },
  { classId: 'magician', branchId: 'cleric', level: 35, budget: 'low', priority: 'stable', mode: 'safe' },
  { classId: 'bowman', branchId: 'hunter', level: 35, budget: 'mid', priority: 'exp', mode: 'normal' },
  { classId: 'thief', branchId: 'assassin', level: 40, budget: 'high', priority: 'meso', mode: 'fast' },
  { classId: 'pirate', branchId: 'gunslinger', level: 30, budget: 'mid', priority: 'stable', mode: 'normal' },
];

export function runRecommendationExamples() {
  return EXAMPLES.map((example) => {
    const classLine = CLASS_LINES.find((item) => item.id === example.classId);
    const branch = classLine?.branches?.find((item) => item.id === example.branchId);
    const statPlan = buildStatPlan(classLine, example.level, { budget: example.budget });
    const recommendations = getMapRecommendations({
      classLine,
      branch,
      level: example.level,
      statPlan,
      budget: example.budget,
      priority: example.priority,
      mode: example.mode,
    }).slice(0, 5);

    return {
      input: example,
      top: recommendations.map((map) => ({
        name: map.name,
        score: map.score,
        gate: map.scoreParts?.routeGate,
        warning: map.warning,
        target: map.monsters?.[0]?.name,
        targetLevel: map.monsters?.[0]?.level,
        hit: map.monsters?.[0]?.hitPercent,
        reasons: map.reasons,
      })),
    };
  });
}

if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(runRecommendationExamples(), null, 2));
}
