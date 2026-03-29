import type { MetricDelta } from './game-progress';
import { talkMovesMap } from '../data/talk_moves';

export type TalkMoveChainQuality = 'weak' | 'developing' | 'strong';

export type TalkMoveChainAssessment = {
  quality: TalkMoveChainQuality;
  adjustment: MetricDelta;
  feedback: string;
  terminalMoveId?: string;
};

const TERMINAL_ONLY_PENALTY: MetricDelta = {
  participation: -6,
  reasoning: -12,
  ownership: -8,
};

const SETUP_CHAIN_BONUS: MetricDelta = {
  participation: 1,
  reasoning: 1,
  ownership: 1,
};

const COMBO_CHAIN_BONUS: MetricDelta = {
  participation: 2,
  reasoning: 3,
  ownership: 2,
};

const EXTENDED_CHAIN_BONUS: MetricDelta = {
  participation: 2,
  reasoning: 2,
  ownership: 2,
};

const REPEATED_TERMINAL_PENALTY: MetricDelta = {
  participation: -1,
  reasoning: -3,
  ownership: -3,
};

function addDeltas(left: MetricDelta, right: MetricDelta): MetricDelta {
  return {
    participation: (left.participation ?? 0) + (right.participation ?? 0),
    reasoning: (left.reasoning ?? 0) + (right.reasoning ?? 0),
    ownership: (left.ownership ?? 0) + (right.ownership ?? 0),
  };
}

function hasCombo(chainMoveIds: string[]): boolean {
  for (let index = 1; index < chainMoveIds.length; index += 1) {
    const previousMove = talkMovesMap[chainMoveIds[index - 1]];
    const currentMove = talkMovesMap[chainMoveIds[index]];
    if (currentMove?.effectiveAfter.includes(previousMove?.id ?? '')) {
      return true;
    }
  }

  return false;
}

function getTerminalMoveId(chainMoveIds: string[]): string | undefined {
  const lastMoveId = chainMoveIds[chainMoveIds.length - 1];
  return talkMovesMap[lastMoveId]?.category === 'terminal' ? lastMoveId : undefined;
}

export function assessTalkMoveChain(
  chainMoveIds: string[],
  previousTerminalMoveId?: string,
): TalkMoveChainAssessment {
  if (chainMoveIds.length === 0) {
    return {
      quality: 'weak',
      adjustment: {},
      feedback: 'Build a short chain before you run the turn.',
    };
  }

  const terminalMoveId = getTerminalMoveId(chainMoveIds);
  const comboApplied = hasCombo(chainMoveIds);
  const hasSetupMove = chainMoveIds.length > 1;
  const isRepeatedTerminal = Boolean(previousTerminalMoveId && previousTerminalMoveId === terminalMoveId);

  let quality: TalkMoveChainQuality = 'developing';
  let adjustment: MetricDelta = {};
  let feedback = 'Good start. Try building the setup a little more before you close the turn.';

  if (!hasSetupMove) {
    quality = 'weak';
    adjustment = addDeltas(adjustment, TERMINAL_ONLY_PENALTY);
    feedback = 'Too quick. Add a setup move before you close the turn.';
  } else {
    adjustment = addDeltas(adjustment, SETUP_CHAIN_BONUS);
    feedback = 'Nice setup. You gave the class a better path into the talk.';

    if (comboApplied) {
      quality = 'strong';
      adjustment = addDeltas(adjustment, COMBO_CHAIN_BONUS);
      feedback = 'Nice chain! You set up the thinking before you closed the turn.';
    }

    if (chainMoveIds.length >= 3) {
      quality = 'strong';
      adjustment = addDeltas(adjustment, EXTENDED_CHAIN_BONUS);
      feedback = 'Great chain! You kept the talk open, then closed the turn with purpose.';
    }
  }

  if (isRepeatedTerminal) {
    adjustment = addDeltas(adjustment, REPEATED_TERMINAL_PENALTY);
    feedback = `${feedback} Try a different closing move next time so pupils do more varied thinking.`;
    if (quality === 'strong') {
      quality = 'developing';
    }
  }

  return {
    quality,
    adjustment,
    feedback,
    terminalMoveId,
  };
}
