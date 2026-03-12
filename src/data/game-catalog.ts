import type { ChoiceScenarioDefinition } from './choice-scenarios';
import { choiceScenarios } from './choice-scenarios';
import type { TalkMoveScenarioDefinition } from './talk_moves';
import { talkMoveScenarios } from './talk_moves';

export type ChoiceGameEntry = {
  id: string;
  engine: 'choice';
  title: string;
  subtitle: string;
  description: string;
  recommendedOrder: number;
  focusAreas: string[];
  scenario: ChoiceScenarioDefinition;
};

export type TalkMoveGameEntry = {
  id: string;
  engine: 'talk-moves';
  title: string;
  subtitle: string;
  description: string;
  recommendedOrder: number;
  focusAreas: string[];
  scenario: TalkMoveScenarioDefinition;
};

export type GameCatalogEntry = ChoiceGameEntry | TalkMoveGameEntry;

const choiceEntries: ChoiceGameEntry[] = Object.values(choiceScenarios).map((scenario) => ({
  id: scenario.id,
  engine: 'choice',
  title: scenario.title,
  subtitle: scenario.subtitle,
  description: scenario.description,
  recommendedOrder: scenario.recommendedOrder,
  focusAreas: scenario.focusAreas,
  scenario,
}));

const talkMoveEntries: TalkMoveGameEntry[] = Object.values(talkMoveScenarios).map((scenario) => ({
  id: scenario.id,
  engine: 'talk-moves',
  title: scenario.title,
  subtitle: scenario.subtitle,
  description: scenario.description,
  recommendedOrder: scenario.recommendedOrder,
  focusAreas: scenario.focusAreas,
  scenario,
}));

export const gameCatalog: GameCatalogEntry[] = [...choiceEntries, ...talkMoveEntries].sort(
  (left, right) => left.recommendedOrder - right.recommendedOrder,
);
