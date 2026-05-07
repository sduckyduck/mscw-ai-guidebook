export async function probeOfficialData() {
  const candidates = [
    '/AppData/index.json',
    '/RawData/index.json',
    '/AppData/Item.wz.json',
    '/RawData/Item.wz.json',
    '/AppData/String.wz.json',
    '/RawData/String.wz.json',
  ];

  const checks = await Promise.all(
    candidates.map(async (path) => {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        return { path, found: response.ok, status: response.status };
      } catch {
        return { path, found: false, status: 0 };
      }
    }),
  );

  return checks;
}

export function normalizeOfficialMonster(raw) {
  return {
    id: String(raw.id ?? raw.monsterId ?? raw.name ?? crypto.randomUUID()),
    name: raw.name ?? raw.chineseName ?? raw.id ?? '未知怪物',
    level: Number(raw.level ?? raw.lv ?? 1),
    hp: Number(raw.hp ?? raw.maxHp ?? 0),
    exp: Number(raw.exp ?? raw.experience ?? 0),
    avoid: Number(raw.avoid ?? raw.eva ?? 0),
    requiredAccuracy: Number(raw.requiredAccuracy ?? raw.accRequired ?? 0),
    defense: Number(raw.defense ?? raw.pdd ?? 0),
    elementWeakness: raw.elementWeakness ?? [],
    elementResist: raw.elementResist ?? [],
    attackType: raw.attackType ?? 'contact',
  };
}

export function normalizeOfficialRecipe(raw) {
  return {
    id: String(raw.id ?? raw.recipeId ?? raw.output ?? crypto.randomUUID()),
    profession: raw.profession ?? raw.type ?? 'unknown',
    level: Number(raw.level ?? raw.reqLevel ?? 1),
    output: raw.outputName ?? raw.output ?? raw.name ?? '未知配方',
    exp: Number(raw.exp ?? raw.craftExp ?? 0),
    mesoCost: Number(raw.mesoCost ?? raw.cost ?? 0),
    materials: (raw.materials ?? []).map((item) => ({
      id: String(item.id ?? item.itemId ?? item.name),
      qty: Number(item.qty ?? item.count ?? 1),
    })),
  };
}
