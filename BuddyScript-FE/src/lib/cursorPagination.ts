export const mergeUniqueById = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
  const ids = new Set(current.map((item) => item.id));
  const merged = [...current];

  for (const item of incoming) {
    if (!ids.has(item.id)) {
      ids.add(item.id);
      merged.push(item);
    }
  }

  return merged;
};

export const mergeReplaceById = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
  const map = new Map(current.map((item) => [item.id, item]));

  for (const item of incoming) {
    map.set(item.id, item);
  }

  return Array.from(map.values());
};
