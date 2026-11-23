// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import type { CurriculumUnit, CurriculumWord } from './types';
import { y4ScienceUnit4Plants } from './y4-science-unit4-plants';

export type {
  ConceptCartoon,
  ConceptCartoonClaim,
  ConceptCartoonStudentId,
  CurriculumLesson,
  CurriculumUnit,
  CurriculumWord,
  OddOneOutSet,
  VocabTier,
} from './types';

/**
 * Add newly deconstructed KPM units here to expose them immediately
 * across the Vocabulary, Games, Odd One Out, and Concept Cartoon views.
 */
export const curriculumUnits: CurriculumUnit[] = [y4ScienceUnit4Plants];

export function getAllCurriculumWords(): Array<CurriculumWord & { unitId: string; unitLabel: string }> {
  return curriculumUnits.flatMap((unit) =>
    unit.words.map((word) => ({
      ...word,
      unitId: unit.id,
      unitLabel: `Y${unit.yearLevel} ${unit.kpmCode}: ${unit.title}`,
    })),
  );
}

export function getUnitById(unitId: string): CurriculumUnit | undefined {
  return curriculumUnits.find((unit) => unit.id === unitId);
}
