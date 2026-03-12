/**
 * Talk Moves Data for chain-building classroom scenarios.
 *
 * The app keeps the talk-move repertoire separate from the scenario content
 * so new levels can reuse the same move palette with different prompts.
 */

import { clampScore, type MetricDelta, type Metrics } from '../lib/game-progress';
import type { StudentResponseType } from '../lib/teacher-coaching';

// ============================================
// CLASSIFICATION: Terminal vs Non-Terminal
// ============================================
// Non-terminal moves can be chained (build the response)
// Terminal moves execute the response and advance to next student turn

export type MoveCategory = 'non-terminal' | 'terminal';

export interface TalkMove {
  id: string;
  name: string;
  shortName: string;
  category: MoveCategory;
  purpose: string;
  researchTip: string;
  example: string;
  teacherCue: string;
  scoreValue: number;
  utterance: string; // Scenario-specific
  chainLabel: string; // Short text shown in chain
  effectiveAfter: string[]; // Move IDs that this is effective after (for combos)
  comboMultiplier: number; // Bonus when used after effectiveAfter moves
  metricImpact: MetricDelta;
}

export interface TalkMoveNode {
  studentText: string;
  alternateStudentTexts?: string[];
  studentName: string;
  availableMoves: string[]; // Move IDs available at this node
  hint?: string;
  pressureCue?: string;
  alternatePressureCues?: string[];
  responseType?: StudentResponseType;
}

export interface TalkMoveScenarioDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  recommendedOrder: number;
  focusAreas: string[];
  reflectionPrompt: string;
  recommendedMoves: string[];
  startingMetrics: Metrics;
  passThreshold: number;
  startNodeId: string;
  nodes: Record<string, TalkMoveNode>;
}

// ============================================
// SCENARIO: Why Does Ice Melt - 8 Turns
// ============================================

export const talkMovesData: TalkMove[] = [
  // ---- NON-TERMINAL MOVES ----
  {
    id: 'TM-T01',
    name: 'Wait Time',
    shortName: 'Wait',
    category: 'non-terminal',
    purpose: 'Gives students time to organize thinking and formulate elaborate responses.',
    researchTip: 'Extending pause to even 3 seconds leads to longer, more thoughtful student contributions.',
    example: 'Take some time to think before you answer.',
    teacherCue: 'Take some time to think. No hands yet.',
    scoreValue: 8,
    utterance: '(Pause for 5 seconds, scanning the class...)',
    chainLabel: 'Wait in silence...',
    effectiveAfter: [],
    comboMultiplier: 1.0,
    metricImpact: { participation: 6, reasoning: 4, ownership: 6 },
  },
  {
    id: 'TM-T02',
    name: 'Turn and Talk',
    shortName: 'Pair',
    category: 'non-terminal',
    purpose: 'Every student gets to talk before whole-class response; builds confidence.',
    teacherCue: 'Turn and talk to your elbow partner about...',
    example: 'Turn to talk to your elbow partner and share what you have been thinking.',
    researchTip: 'Pair talk ensures all students engage, not just the fastest thinkers.',
    scoreValue: 10,
    utterance: 'Turn to your elbow partner and discuss: What do you think is happening to the ice?',
    chainLabel: 'Turn and Talk...',
    effectiveAfter: ['TM-T01'],
    comboMultiplier: 1.15,
    metricImpact: { participation: 8, reasoning: 4, ownership: 6 },
  },
  {
    id: 'TM-T03',
    name: 'Revoicing',
    shortName: 'Revoice',
    category: 'non-terminal',
    purpose: 'Repeats student contribution with clarification; helps clarify meaning.',
    teacherCue: "So you're saying... Do I have that right?",
    example: "So you're saying warm air rises and displaces the cooler air above it?",
    researchTip: 'Particularly valuable for EAL learners whose ideas might otherwise be lost.',
    scoreValue: 12,
    utterance: "So you're saying the ice turned into water? Let me check if I understood correctly...",
    chainLabel: 'Revoice student idea...',
    effectiveAfter: [],
    comboMultiplier: 1.0,
    metricImpact: { participation: 4, reasoning: 6, ownership: 4 },
  },
  {
    id: 'TM-T11',
    name: 'Stay Neutral',
    shortName: 'Neutral',
    category: 'non-terminal',
    purpose: 'Avoids praise/evaluation; keeps dialogic flow going between students.',
    teacherCue: 'Thanks. Anyone else?',
    example: 'Hmmm. Interesting. Anyone else?',
    researchTip: 'Overuse of praise creates approval-seekers rather than genuine thinkers.',
    scoreValue: 7,
    utterance: '(Nods. Pauses.) Interesting. Does anyone else have a thought?',
    chainLabel: 'Stay neutral...',
    effectiveAfter: ['TM-T06', 'TM-T05'],
    comboMultiplier: 1.2,
    metricImpact: { participation: 4, reasoning: 2, ownership: 5 },
  },
  {
    id: 'TM-T12',
    name: 'Include Yourself',
    shortName: 'Include',
    category: 'non-terminal',
    purpose: 'Teacher positions as co-inquirer, thinking alongside students.',
    teacherCue: "I'm wondering if... Let's figure this out together.",
    example: "I'm not sure about this either – let's think it through together.",
    researchTip: 'Alters power relations; encourages exploratory feel to thinking.',
    scoreValue: 9,
    utterance: "I'm genuinely curious about this too. What do we think is happening at the分子 level?",
    chainLabel: 'Think alongside...',
    effectiveAfter: [],
    comboMultiplier: 1.0,
    metricImpact: { participation: 3, reasoning: 4, ownership: 7 },
  },
  {
    id: 'TM-T07',
    name: 'Repeating / Active Listening',
    shortName: 'Repeat',
    category: 'non-terminal',
    purpose: 'Student repeats another contribution; builds culture of active listening.',
    teacherCue: 'Can someone put that in their own words?',
    example: 'Who thinks they understood what James is saying?',
    researchTip: 'Sets expectation that students should listen to each other, not just wait to speak.',
    scoreValue: 8,
    utterance: "Can someone repeat back what Maya just said in their own words?",
    chainLabel: 'Have student repeat...',
    effectiveAfter: [],
    comboMultiplier: 1.0,
    metricImpact: { participation: 5, reasoning: 4, ownership: 4 },
  },
  // ---- TERMINAL MOVES ----
  {
    id: 'TM-T04',
    name: 'Sustaining the Thinking',
    shortName: 'Say More',
    category: 'terminal',
    purpose: 'Invites student to extend, elaborate and deepen their own thinking.',
    teacherCue: 'Can you say more about that?',
    example: "That's an interesting idea. Can you say more?",
    researchTip: 'Stays with same student to build and communicate ideas, positioning them as thinker.',
    scoreValue: 15,
    utterance: "That's an interesting observation. Can you say more about what makes you think that?",
    chainLabel: 'Say More...',
    effectiveAfter: ['TM-T01', 'TM-T03'],
    comboMultiplier: 1.25,
    metricImpact: { participation: 3, reasoning: 8, ownership: 6 },
  },
  {
    id: 'TM-T05',
    name: 'Extending and Deepening',
    shortName: 'Add On',
    category: 'terminal',
    purpose: 'Opens floor to others to build on, add to, or clarify previous contribution.',
    teacherCue: 'Does anyone have something to add?',
    example: 'Who can build on that idea?',
    researchTip: 'Creates cumulative chain where each response builds on those before.',
    scoreValue: 14,
    utterance: "Who can build on what Alex just said? Does anyone have something to add?",
    chainLabel: 'Add On...',
    effectiveAfter: ['TM-T04', 'TM-T02'],
    comboMultiplier: 1.2,
    metricImpact: { participation: 7, reasoning: 5, ownership: 5 },
  },
  {
    id: 'TM-T06',
    name: 'Challenging Thinking',
    shortName: 'Challenge',
    category: 'terminal',
    purpose: 'Invites students to question, agree or disagree with others ideas.',
    teacherCue: 'Does anyone disagree, and why?',
    example: 'Does anyone disagree with what Ryan said?',
    researchTip: 'Develops skills in building arguments and recognizing alternative perspectives.',
    scoreValue: 13,
    utterance: "Does anyone have a different view? Does anyone disagree with that idea?",
    chainLabel: 'Challenge thinking...',
    effectiveAfter: ['TM-T04', 'TM-T03'],
    comboMultiplier: 1.15,
    metricImpact: { participation: 4, reasoning: 8, ownership: 4 },
  },
  {
    id: 'TM-T08',
    name: 'Press for Reasoning',
    shortName: 'Evidence',
    category: 'terminal',
    purpose: 'Encourages justification with evidence; exposes thinking for class engagement.',
    teacherCue: "What's your evidence? Why do you think that?",
    example: 'Where did you get that idea? Do you have evidence?',
    researchTip: 'Students must be accountable to accurate knowledge and rigorous reasoning.',
    scoreValue: 16,
    utterance: "That's a great idea! But what evidence do you have? What makes you confident about that?",
    chainLabel: 'Press for Evidence...',
    effectiveAfter: ['TM-T01', 'TM-T04'],
    comboMultiplier: 1.3,
    metricImpact: { participation: 2, reasoning: 9, ownership: 4 },
  },
  {
    id: 'TM-T09',
    name: 'Asking Open Guiding Questions',
    shortName: 'Open Q',
    category: 'terminal',
    purpose: 'Open, exploratory questions invite investigation and flexible, creative responses.',
    teacherCue: 'What would change if...? Why might people see this differently?',
    example: "What would happen if we changed one variable?",
    researchTip: 'Open questions create space for genuine inquiry beyond right/wrong.',
    scoreValue: 14,
    utterance: "What do you think would happen if we put the ice in hot water instead? Why might that be different?",
    chainLabel: 'Ask Open Question...',
    effectiveAfter: [],
    comboMultiplier: 1.0,
    metricImpact: { participation: 5, reasoning: 7, ownership: 6 },
  },
  {
    id: 'TM-T10',
    name: 'Giving Learning-Focused Responses',
    shortName: 'Learning',
    category: 'terminal',
    purpose: 'Reflects response back to deepen thinking; treats confusion as learning opportunity.',
    teacherCue: "That's one way of looking at it. What might someone add?",
    example: "So you're thinking that... Can anyone build on that?",
    researchTip: 'Responses focused on thinking process, not answer accuracy.',
    scoreValue: 12,
    utterance: "Interesting perspective. Let's think about that together. What else might be at play here?",
    chainLabel: 'Learning Response...',
    effectiveAfter: ['TM-T11'],
    comboMultiplier: 1.15,
    metricImpact: { participation: 4, reasoning: 5, ownership: 6 },
  },
  {
    id: 'TM-T13',
    name: 'Revise Your Thinking',
    shortName: 'Revise',
    category: 'terminal',
    purpose: 'Signals it is healthy to change thinking when new information emerges.',
    teacherCue: 'Has anyone revised their thinking? What was your ah-ha moment?',
    example: 'Has anyone revised their thinking after hearing these perspectives?',
    researchTip: 'Normalizes intellectual growth and changing positions.',
    scoreValue: 11,
    utterance: "Now that we've discussed this, has anyone changed or added to their original thinking?",
    chainLabel: 'Invite Revision...',
    effectiveAfter: ['TM-T06', 'TM-T05'],
    comboMultiplier: 1.2,
    metricImpact: { participation: 5, reasoning: 6, ownership: 7 },
  },
  {
    id: 'TM-T14',
    name: 'Reflecting and Reviewing',
    shortName: 'Review',
    category: 'terminal',
    purpose: 'Synthesizes key ideas; makes learning visible.',
    teacherCue: 'Who can summarise what we have discovered?',
    example: "So let me recap what we've established together...",
    researchTip: 'Used at any point for formative assessment.',
    scoreValue: 10,
    utterance: "Let's pause and reflect. What have we figured out about why ice melts?",
    chainLabel: 'Reflect & Review...',
    effectiveAfter: [],
    comboMultiplier: 1.0,
    metricImpact: { participation: 3, reasoning: 5, ownership: 5 },
  },
];

// Map for quick lookup
export const talkMovesMap = Object.fromEntries(
  talkMovesData.map(move => [move.id, move])
);

// ============================================
// SCENARIOS
// ============================================

const iceMeltScenarioNodes: Record<string, TalkMoveNode> = {
  // Turn 1: Initial Observation
  observation: {
    studentText: "Teacher, look. The ice getting smaller... turning to water.",
    alternateStudentTexts: [
      "Teacher, the ice become smaller and smaller... now got water.",
    ],
    studentName: "Maya",
    hint: "This is a real observation in partial English. How do we keep the idea moving without correcting it into silence?",
    pressureCue: 'Pressure cue: the observation is useful, but the language is unfinished and easy to over-correct.',
    responseType: 'emergent-language',
    availableMoves: ['TM-T01', 'TM-T02', 'TM-T03', 'TM-T04', 'TM-T11'],
  },
  
  // Turn 2: What IS it?
  what_is_it: {
    studentText: "But teacher... still water or not? Like both? Solid, but becoming liquid?",
    studentName: "Alex",
    hint: "The pupil is grappling with states of matter, but the language is still emerging.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T03', 'TM-T04', 'TM-T05', 'TM-T09', 'TM-T12'],
  },
  
  // Turn 3: Where did it GO?
  where_go: {
    studentText: "Where the water go? It not just disappear, right?",
    studentName: "Jordan",
    hint: "A strong science question can arrive in rough English. Stay with the thinking.",
    responseType: 'prediction',
    availableMoves: ['TM-T04', 'TM-T06', 'TM-T08', 'TM-T09', 'TM-T11'],
  },
  
  // Turn 4: Why at room temp?
  why_room_temp: {
    studentText: "Why here melt faster than freezer? What different?",
    studentName: "Sam",
    hint: "The key variable is there, but the pupil still needs help elaborating it.",
    availableMoves: ['TM-T01', 'TM-T04', 'TM-T08', 'TM-T09', 'TM-T12'],
  },
  
  // Turn 5: Hot vs Cold
  hot_vs_cold: {
    studentText: "I think if put in hot water, melt more fast... because heat?",
    alternateStudentTexts: [
      "If put in hot water, maybe the ice melt faster... maybe because very hot.",
    ],
    studentName: "Maya",
    hint: "This is the sort of half-formed hypothesis teachers are often tempted to replace with the correct answer.",
    pressureCue: 'Pressure cue: a nearly-there answer makes it tempting to jump straight to the correct explanation.',
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T05', 'TM-T06', 'TM-T08', 'TM-T11'],
  },
  
  // Turn 6: Salt experiment
  salt_ice: {
    studentText: "My dad put salt on ice. Ice change different... but I don't know why.",
    studentName: "Alex",
    hint: "A rich concept is hiding inside weak vocabulary. Keep the thinking alive.",
    availableMoves: ['TM-T04', 'TM-T05', 'TM-T08', 'TM-T09', 'TM-T12'],
  },
  
  // Turn 7: The science explanation
  explanation: {
    studentText: "So the warm air got more energy, then the water things move faster... that why it melts?",
    studentName: "Jordan",
    hint: "This is a partial synthesis, not a finished explanation. Treat it as something to develop.",
    availableMoves: ['TM-T05', 'TM-T07', 'TM-T08', 'TM-T14', 'TM-T11'],
  },
  
  // Turn 8: Wrap up
  conclusion: {
    studentText: "Can we do another one? Maybe evaporation? I want see what else can change state.",
    studentName: "Sam",
    hint: "Curiosity and transfer matter, even when the English is still developing.",
    availableMoves: ['TM-T05', 'TM-T09', 'TM-T13', 'TM-T14', 'TM-T10'],
  },
};

const shareOutSamplingNodes: Record<string, TalkMoveNode> = {
  pair_rehearsal: {
    studentText:
      'My partner think the seed grow faster at sunny window, but we not sure how say the why.',
    alternateStudentTexts: [
      'We know the sunny window one grow faster, but we do not know how explain the reason yet.',
    ],
    studentName: 'Leila',
    hint: 'The pair has an idea, but they need a safe, structured public share-out in manageable English.',
    pressureCue: 'Pressure cue: the pair has the thinking, but not yet the polished English.',
    responseType: 'partner-report',
    availableMoves: ['TM-T01', 'TM-T03', 'TM-T04', 'TM-T05', 'TM-T10'],
  },
  report_partner: {
    studentText:
      'We thought the light help make food, but my partner say maybe also the warm place.',
    studentName: 'Omar',
    hint: 'Invite students to report a partner idea before centering their own.',
    responseType: 'partner-report',
    availableMoves: ['TM-T02', 'TM-T05', 'TM-T07', 'TM-T08', 'TM-T11'],
  },
  compare_ideas: {
    studentText:
      'Our pair got different idea. We think the plant near window maybe get more water too because the soil look dry.',
    studentName: 'Sara',
    hint: 'Multiple pair ideas are now on the table. The goal is comparison, not teacher selection.',
    responseType: 'partial-idea',
    availableMoves: ['TM-T03', 'TM-T05', 'TM-T06', 'TM-T08', 'TM-T09'],
  },
  include_quieter_voice: {
    studentText:
      'I not want say first, but my partner notice the leaves on the darker shelf were smaller too.',
    alternateStudentTexts: [
      'I was shy to say, but my partner saw the darker shelf leaves were smaller also.',
    ],
    studentName: 'Nadia',
    hint: 'The routine should reward careful listening and create space for quieter voices.',
    pressureCue: 'Pressure cue: a quieter pupil is entering the talk, but only if the room stays safe enough.',
    responseType: 'partner-report',
    availableMoves: ['TM-T01', 'TM-T03', 'TM-T04', 'TM-T10', 'TM-T12'],
  },
  synthesize: {
    studentText:
      'So maybe not only one thing. Light, warm, and water all change what the plants do.',
    studentName: 'Tariq',
    hint: 'Students are ready to synthesise and refine the claim together.',
    responseType: 'partial-idea',
    availableMoves: ['TM-T05', 'TM-T06', 'TM-T08', 'TM-T13', 'TM-T14'],
  },
};

export const talkMoveScenarios: Record<string, TalkMoveScenarioDefinition> = {
  iceMelt: {
    id: 'ice-melt',
    title: 'Why Does Ice Melt?',
    subtitle: 'Chain Builder Prototype',
    description:
      'Build sequences of talk moves that deepen scientific reasoning across an 8-turn inquiry.',
    recommendedOrder: 2,
    focusAreas: ['sequencing', 'reasoning', 'scientific inquiry'],
    reflectionPrompt:
      'Which move combinations helped students reason together instead of waiting for you to finish the explanation?',
    recommendedMoves: ['Wait Time', 'Turn and Talk', 'Say More', 'Press for Reasoning'],
    startingMetrics: {
      participation: 50,
      reasoning: 50,
      ownership: 50,
    },
    passThreshold: 60,
    startNodeId: 'observation',
    nodes: iceMeltScenarioNodes,
  },
  shareOutSampling: {
    id: 'share-out-sampling',
    title: 'Share-Out Sampling',
    subtitle: 'Priority Level 8',
    description:
      'Use the talk-moves palette to turn pair rehearsal into accountable, student-to-student whole-class discussion.',
    recommendedOrder: 8,
    focusAreas: ['share-out', 'partner reporting', 'uptake'],
    reflectionPrompt:
      'Did your public discussion sample pair thinking in a way that broadened participation and kept ideas moving between students?',
    recommendedMoves: ['Turn and Talk', 'Repeating', 'Add On', 'Press for Reasoning'],
    startingMetrics: {
      participation: 48,
      reasoning: 50,
      ownership: 48,
    },
    passThreshold: 62,
    startNodeId: 'pair_rehearsal',
    nodes: shareOutSamplingNodes,
  },
};

// ============================================
// SCORING SYSTEM
// ============================================

export function calculateChainScore(chain: string[]): number {
  if (chain.length === 0) return 0;
  
  let totalScore = 0;
  
  for (let i = 0; i < chain.length; i++) {
    const moveId = chain[i];
    const move = talkMovesMap[moveId];
    if (!move) continue;
    
    // Base score for this move
    let moveScore = move.scoreValue;
    
    // Combo bonus: check if this move follows an effective predecessor
    if (i > 0) {
      const prevMoveId = chain[i - 1];
      if (move.effectiveAfter.includes(prevMoveId)) {
        moveScore = Math.floor(moveScore * move.comboMultiplier);
      }
    }
    
    // Chain length bonus: each additional move adds small bonus
    if (i > 0) {
      moveScore += 5;
    }
    
    totalScore += moveScore;
  }
  
  return totalScore;
}

export function calculateChainMetrics(chain: string[]): Metrics {
  return chain.reduce<Metrics>(
    (metrics, moveId) => {
      const move = talkMovesMap[moveId];
      if (!move) {
        return metrics;
      }

      return {
        participation: clampScore(metrics.participation + (move.metricImpact.participation ?? 0)),
        reasoning: clampScore(metrics.reasoning + (move.metricImpact.reasoning ?? 0)),
        ownership: clampScore(metrics.ownership + (move.metricImpact.ownership ?? 0)),
      };
    },
    {
      participation: 0,
      reasoning: 0,
      ownership: 0,
    },
  );
}

// ============================================
// PEDAGOGICAL PROFILE ANALYSIS
// ============================================

export interface PedagogicalProfile {
  totalMoves: number;
  movesByCategory: { 'non-terminal': number; 'terminal': number };
  movesById: Record<string, number>;
  comboCount: number;
  mostUsed: string;
  style: 'Scaffolder' | 'Challenger' | 'Facilitator' | 'Guide';
  advice: string[];
}

export function generateProfile(chain: string[]): PedagogicalProfile {
  const movesById: Record<string, number> = {};
  let nonTerminal = 0;
  let terminal = 0;
  let comboCount = 0;
  
  for (let i = 0; i < chain.length; i++) {
    const moveId = chain[i];
    const move = talkMovesMap[moveId];
    if (!move) continue;
    
    movesById[moveId] = (movesById[moveId] || 0) + 1;
    
    if (move.category === 'non-terminal') {
      nonTerminal++;
    } else {
      terminal++;
    }
    
    // Count combos
    if (i > 0) {
      const prevMoveId = chain[i - 1];
      if (move.effectiveAfter.includes(prevMoveId)) {
        comboCount++;
      }
    }
  }
  
  // Find most used
  const mostUsed = Object.entries(movesById)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
  
  // Determine teaching style
  let style: PedagogicalProfile['style'] = 'Facilitator';
  if (nonTerminal > terminal * 1.5) {
    style = 'Scaffolder';
  } else if (terminal > nonTerminal * 1.5) {
    style = 'Challenger';
  } else if (comboCount >= 3) {
    style = 'Guide';
  }
  
  // Generate advice
  const advice: string[] = [];
  if (nonTerminal < 2) {
    advice.push('Try using more Wait Time and Revoicing to give students thinking space.');
  }
  if (comboCount < 2) {
    advice.push('Challenge: Try chaining Wait Time → Say More for maximum impact!');
  }
  if (terminal > nonTerminal * 2) {
    advice.push('Consider adding Turn and Talk before pressing for answers.');
  }
  if ((movesById['TM-T08'] ?? 0) < 2) {
    advice.push('Press for Reasoning helps students justify their thinking with evidence.');
  }
  
  return {
    totalMoves: chain.length,
    movesByCategory: { 'non-terminal': nonTerminal, 'terminal': terminal },
    movesById,
    comboCount,
    mostUsed,
    style,
    advice,
  };
}

export const iceMeltScenario = talkMoveScenarios.iceMelt.nodes;
