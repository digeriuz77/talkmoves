export type LevelProgressEntry = {
  attempts: number;
  bestScore: number;
  completed: boolean;
};

export type LevelProgressMap = Record<string, LevelProgressEntry>;

export function updateLevelProgress(
  current: LevelProgressMap,
  levelId: string,
  update: { completed: boolean; score: number },
): LevelProgressMap {
  const existing = current[levelId];

  return {
    ...current,
    [levelId]: {
      attempts: (existing?.attempts ?? 0) + 1,
      bestScore: Math.max(existing?.bestScore ?? 0, update.score),
      completed: (existing?.completed ?? false) || update.completed,
    },
  };
}

export type StatusKey = 'completed' | 'inProgress' | 'new';

export function getLevelStatus(
  current: LevelProgressMap,
  levelId: string,
): LevelProgressEntry & { statusKey: StatusKey } {
  const entry = current[levelId] ?? {
    attempts: 0,
    bestScore: 0,
    completed: false,
  };

  return {
    ...entry,
    statusKey: entry.completed ? 'completed' : entry.attempts > 0 ? 'inProgress' : 'new',
  };
}
