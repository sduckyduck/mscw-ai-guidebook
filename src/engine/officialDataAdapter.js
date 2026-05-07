const PROFESSION_ID_BY_NAME = {
  Smithing: 'smithing',
  Weaponcrafting: 'weaponcrafting',
  Tailoring: 'tailoring',
  Woodcrafting: 'woodcrafting',
  Leatherworking: 'leatherworking',
  Arcforge: 'arcforge',
};

const BASE_URL = import.meta.env?.BASE_URL || '/';
const appDataPath = (path) => `${BASE_URL}${path.replace(/^\/+/, '')}`;
const padItemId = (id) => String(id ?? '').padStart(8, '0');
const padSkillId = (id) => String(id ?? '').padStart(7, '0');
const itemIconPath = (id) => appDataPath(`AppData/images/items/${padItemId(id)}.png`);
const skillIconPath = (id) => appDataPath(`AppData/images/skills/${padSkillId(id)}.png`);

export async function loadOfficialGuideData() {
  const [overview, monstersRaw, mapsRaw, craftingRaw, itemsRaw, skillsRaw] = await Promise.all([
    fetchJson(appDataPath('AppData/overview.json')),
    fetchJson(appDataPath('AppData/monsters.json')),
    fetchJson(appDataPath('AppData/maps.json')),
    fetchJson(appDataPath('AppData/crafting.json')),
    fetchJson(appDataPath('AppData/items.json')),
    fetchJson(appDataPath('AppData/skills.json')),
  ]);

  const monsters = normalizeMonsters(monstersRaw?.monsters ?? []);
  const maps = normalizeMaps(mapsRaw?.regions ?? [], monsters);
  const { recipes, materials, professions } = normalizeCrafting(craftingRaw?.disciplines ?? []);
  const items = normalizeItems(itemsRaw?.items ?? []);
  const skillGroups = normalizeSkillGroups(skillsRaw ?? {});

  return {
    source: 'official-appdata',
    overview: overview?.stats ?? null,
    monsters,
    maps,
    recipes,
    materials,
    professions,
    items,
    skillGroups,
  };
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} ${response.status}`);
  }
  return response.json();
}

function normalizeMonsters(monsters) {
  return safeArray(monsters).map((monster) => {
    const level = Number(monster.level ?? 1);
    const eva = Number(monster.eva ?? monster.avoid ?? 0);
    const requiredAccuracy = Math.max(1, Math.ceil((55 * eva) / 15));
    const elements = parseElements(monster.elements);

    return {
      id: String(monster.id),
      rawId: monster.id,
      name: monster.name ?? `Monster ${monster.id}`,
      level,
      hp: Number(monster.hp ?? 0),
      mp: Number(monster.mp ?? 0),
      exp: Number(monster.exp ?? 0),
      avoid: eva,
      requiredAccuracy,
      monsterAccuracy: Number(monster.acc ?? 0),
      defense: Number(monster.PDDamage ?? monster.defense ?? 0),
      magicDefense: Number(monster.MDDamage ?? 0),
      physicalAttack: Number(monster.PADamage ?? 0),
      magicAttack: Number(monster.MADamage ?? 0),
      elementWeakness: elements.weak,
      elementResist: elements.resist,
      attackType: Number(monster.MADamage ?? 0) > 0 ? 'magic' : 'contact',
      isBoss: Boolean(monster.is_boss),
      isNew: Boolean(monster.is_new),
      undead: Boolean(monster.undead),
      thumbnail: monster.thumbnail ? appDataPath(`AppData/${monster.thumbnail}`) : null,
      gif: monster.gif ? appDataPath(`AppData/${monster.gif}`) : null,
      maps: safeArray(monster.maps).map((map) => ({
        id: Number(map.id),
        name: map.name,
        count: Number(map.count ?? 0),
        mobTime: Number(map.mob_time ?? 0),
      })),
    };
  });
}

function normalizeMaps(regions, monsters) {
  const metadataById = new Map();

  for (const region of safeArray(regions)) {
    for (const map of safeArray(region.maps)) {
      metadataById.set(Number(map.id), {
        id: String(map.id),
        rawId: Number(map.id),
        name: map.name ?? `Map ${map.id}`,
        streetName: map.street_name ?? '',
        region: map.region ?? region.region ?? 'Unknown',
        isTown: Boolean(map.is_town),
        mobRate: Number(map.mob_rate ?? 1),
        minimap: map.minimap ? appDataPath(`AppData/${map.minimap}`) : null,
        thumbnail: map.thumbnail ? appDataPath(`AppData/${map.thumbnail}`) : null,
        bgm: map.bgm ?? '',
      });
    }
  }

  const monstersByMap = new Map();
  for (const monster of monsters) {
    for (const mapRef of safeArray(monster.maps)) {
      const key = Number(mapRef.id);
      if (!monstersByMap.has(key)) monstersByMap.set(key, []);
      monstersByMap.get(key).push({ ...monster, spawnCount: mapRef.count, mobTime: mapRef.mobTime });
    }
  }

  return [...monstersByMap.entries()].map(([mapId, mapMonsters]) => {
    const metadata = metadataById.get(Number(mapId)) ?? {
      id: String(mapId),
      rawId: Number(mapId),
      name: mapMonsters[0]?.maps?.find((item) => Number(item.id) === Number(mapId))?.name ?? `Map ${mapId}`,
      streetName: '',
      region: 'Unknown',
      isTown: false,
      mobRate: 1,
      minimap: null,
      thumbnail: null,
      bgm: '',
    };

    const levels = mapMonsters.map((monster) => monster.level).filter(Number.isFinite);
    const spawnTotal = mapMonsters.reduce((sum, monster) => sum + Number(monster.spawnCount ?? 0), 0);
    const tags = buildMapTags(metadata, mapMonsters, spawnTotal);

    return {
      ...metadata,
      levelRange: [Math.min(...levels), Math.max(...levels)],
      tags,
      monsters: mapMonsters.map((monster) => monster.id),
      monsterDetails: mapMonsters,
      spawnTotal,
      routeNote: buildRouteNote(metadata, mapMonsters, spawnTotal),
    };
  })
    .filter((map) => !map.isTown && map.monsterDetails.length > 0)
    .sort((a, b) => a.levelRange[0] - b.levelRange[0] || b.spawnTotal - a.spawnTotal);
}

function buildMapTags(map, monsters, spawnTotal) {
  const tags = [];
  if (spawnTotal >= 35) tags.push('高密度');
  if (spawnTotal >= 18 && spawnTotal < 35) tags.push('稳定刷怪');
  if (monsters.some((monster) => monster.isBoss)) tags.push('Boss');
  if (monsters.some((monster) => monster.undead)) tags.push('不死系');
  if (map.region) tags.push(map.region);
  return tags.slice(0, 5);
}

function buildRouteNote(map, monsters, spawnTotal) {
  const minLevel = Math.min(...monsters.map((monster) => monster.level));
  const maxLevel = Math.max(...monsters.map((monster) => monster.level));
  const density = spawnTotal >= 35 ? '怪物密度高' : spawnTotal >= 18 ? '怪物数量稳定' : '怪物数量偏少';
  return `${density}，主要等级 Lv.${minLevel}-${maxLevel}，适合按命中和等级差筛选。`;
}

function normalizeCrafting(disciplines) {
  const recipes = [];
  const materialMap = new Map();
  const professions = [];

  for (const discipline of safeArray(disciplines)) {
    const professionId = PROFESSION_ID_BY_NAME[discipline.discipline] ?? slugify(discipline.discipline);
    professions.push({ id: professionId, name: discipline.discipline, skillId: discipline.skill_id });

    for (const outputType of safeArray(discipline.output_types)) {
      for (const levelGroup of safeArray(outputType.levels)) {
        for (const recipe of safeArray(levelGroup.recipes)) {
          const materials = safeArray(recipe.ingredients).map((ingredient) => {
            const id = slugify(ingredient.item_name);
            if (!materialMap.has(id)) {
              materialMap.set(id, { id, name: ingredient.item_name, source: '官方配方材料', valueTags: [] });
            }
            return { id, qty: Number(ingredient.count ?? 1) };
          });

          recipes.push({
            id: String(recipe.id ?? `${professionId}-${recipe.output_id}`),
            profession: professionId,
            outputType: outputType.output_type,
            level: Number(recipe.req_level ?? levelGroup.level ?? 1),
            output: recipe.result_item_name ?? `Item ${recipe.output_id}`,
            outputId: recipe.output_id,
            resultCount: Number(recipe.result_count ?? 1),
            exp: Number(recipe.craft_exp ?? 0),
            mesoCost: Number(recipe.meso_cost ?? 0),
            materials,
          });
        }
      }
    }
  }

  return { recipes, materials: [...materialMap.values()], professions };
}

function normalizeItems(items) {
  return safeArray(items).map((item) => ({
    ...item,
    id: String(item.id),
    reqLevel: Number(item.stats?.reqLevel ?? 0),
    reqJob: Number(item.stats?.reqJob ?? 0),
    reqSTR: Number(item.stats?.reqSTR ?? 0),
    reqDEX: Number(item.stats?.reqDEX ?? 0),
    reqINT: Number(item.stats?.reqINT ?? 0),
    reqLUK: Number(item.stats?.reqLUK ?? 0),
    incPAD: Number(item.stats?.incPAD ?? 0),
    incMAD: Number(item.stats?.incMAD ?? 0),
    incACC: Number(item.stats?.incACC ?? item.stats?.incACCr ?? 0),
    incSpeed: Number(item.stats?.incSpeed ?? 0),
    thumbnail: item.thumbnail ? appDataPath(`AppData/${item.thumbnail}`) : itemIconPath(item.id),
  }));
}

function normalizeSkillGroups(rawSkillData) {
  const normalizedGroups = [];

  for (const [baseClass, node] of Object.entries(rawSkillData ?? {})) {
    for (const group of collectSkillGroups(node)) {
      const skills = safeArray(group.skills).map((skill) => ({
        ...skill,
        id: String(skill.id),
        maxLevel: Number(skill.max_level ?? skill.maxLevel ?? 0),
        thumbnail: skill.thumbnail ? appDataPath(`AppData/${skill.thumbnail}`) : skillIconPath(skill.id),
      }));

      if (!skills.length) continue;
      normalizedGroups.push({
        baseClass,
        className: group.class_name ?? group.className ?? group.name ?? baseClass,
        job: group.job ?? group.job_name ?? '',
        mainClass: group.main_class ?? group.mainClass ?? '',
        baseClassLabel: group.base_class ?? group.baseClass ?? baseClass,
        subclasses: safeArray(group.subclasses),
        skills,
      });
    }
  }

  return normalizedGroups;
}

function collectSkillGroups(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(collectSkillGroups);
  if (typeof node !== 'object') return [];
  if (Array.isArray(node.skills)) return [node];

  const candidateKeys = ['groups', 'jobs', 'classes', 'data', 'children'];
  for (const key of candidateKeys) {
    if (node[key]) {
      const nested = collectSkillGroups(node[key]);
      if (nested.length) return nested;
    }
  }

  return Object.values(node).flatMap((value) => collectSkillGroups(value));
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [];
}

function parseElements(elements) {
  if (!elements) return { weak: [], resist: [] };
  if (Array.isArray(elements)) return { weak: elements, resist: [] };
  if (typeof elements === 'string') {
    return { weak: elements.split(/[;,/|]/).map((item) => item.trim()).filter(Boolean), resist: [] };
  }
  return { weak: elements.weak ?? elements.weakness ?? [], resist: elements.resist ?? elements.resistance ?? [] };
}

function slugify(value) {
  return String(value ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}
