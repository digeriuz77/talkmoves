import legacyScenario from './scenario.json';
import type { MetricDelta, Metrics } from '../lib/game-progress';
import type { StudentResponseType } from '../lib/teacher-coaching';

export type ClassroomHotspot = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ChoiceMove = {
  text: string;
  nextNode: string;
  tip?: string;
  moveType: string;
  metricsDelta: MetricDelta;
};

export type ChoiceNode = {
  text: string;
  alternateTexts?: string[];
  pressureCue?: string;
  alternatePressureCues?: string[];
  responseType?: StudentResponseType;
  speakerId?: string;
  speakerName?: string;
  choices: ChoiceMove[];
};

export type ChoiceScenarioDefinition = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  recommendedOrder: number;
  focusAreas: string[];
  reflectionPrompt: string;
  recommendedMoves: string[];
  startNodeId: string;
  passThreshold: number;
  startingMetrics: Metrics;
  hotspots: ClassroomHotspot[];
  dialogueTree: Record<string, ChoiceNode>;
};

const baseHotspots: ClassroomHotspot[] = legacyScenario.hotspots.map((hotspot) => ({
  ...hotspot,
}));

function inferLegacyMetrics(moveType: string, scoreDelta: number): MetricDelta {
  const positive = scoreDelta > 0;

  switch (moveType) {
    case 'Wait Time':
      return positive
        ? { participation: 14, reasoning: 6, ownership: 12 }
        : { participation: -8, reasoning: -4, ownership: -10 };
    case 'Revoicing':
      return positive
        ? { participation: 8, reasoning: 10, ownership: 6 }
        : { participation: -4, reasoning: -6, ownership: -6 };
    case 'Say More':
      return positive
        ? { participation: 6, reasoning: 12, ownership: 10 }
        : { participation: -4, reasoning: -8, ownership: -6 };
    case 'Adding On':
      return positive
        ? { participation: 12, reasoning: 8, ownership: 10 }
        : { participation: -6, reasoning: -4, ownership: -6 };
    case 'Reasoning':
      return positive
        ? { participation: 6, reasoning: 14, ownership: 8 }
        : { participation: -4, reasoning: -10, ownership: -4 };
    default:
      return positive
        ? { participation: 4, reasoning: 4, ownership: 4 }
        : { participation: -8, reasoning: -8, ownership: -8 };
  }
}

const crushedCanInquiry: ChoiceScenarioDefinition = {
  id: 'crushed-can-inquiry',
  title: 'Crushed Can Inquiry',
  subtitle: 'Foundation Prototype',
  description:
    'Navigate an 8-turn science discussion and learn how productive teacher moves keep inquiry alive.',
  recommendedOrder: 0,
  focusAreas: ['revoicing', 'wait time', 'reasoning', 'adding on'],
  reflectionPrompt:
    'When did you open the discussion up, and when did you accidentally collapse it back into answer-checking?',
  recommendedMoves: ['Wait Time', 'Revoicing', 'Say More', 'Reasoning', 'Adding On'],
  startNodeId: 'start_node',
  passThreshold: 70,
  startingMetrics: {
    participation: 50,
    reasoning: 50,
    ownership: 50,
  },
  hotspots: baseHotspots,
  dialogueTree: {
    start_node: {
      text: legacyScenario.dialogueTree.start_node.text,
      responseType: 'partial-idea',
      speakerId: 'studentA',
      speakerName: 'Student A',
      choices: legacyScenario.dialogueTree.start_node.choices.map((choice) => ({
        text: choice.text,
        nextNode: choice.nextNode,
        tip: choice.tip,
        moveType: choice.moveType ?? 'Teacher Move',
        metricsDelta: inferLegacyMetrics(choice.moveType ?? 'Teacher Move', choice.scoreDelta),
      })),
    },
    turn_2: {
      text: legacyScenario.dialogueTree.turn_2.text,
      responseType: 'prediction',
      speakerId: 'studentB',
      speakerName: 'Student B',
      choices: legacyScenario.dialogueTree.turn_2.choices.map((choice) => ({
        text: choice.text,
        nextNode: choice.nextNode,
        tip: choice.tip,
        moveType: choice.moveType ?? 'Teacher Move',
        metricsDelta: inferLegacyMetrics(choice.moveType ?? 'Teacher Move', choice.scoreDelta),
      })),
    },
    turn_3: {
      text: legacyScenario.dialogueTree.turn_3.text,
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: legacyScenario.dialogueTree.turn_3.choices.map((choice) => ({
        text: choice.text,
        nextNode: choice.nextNode,
        tip: choice.tip,
        moveType: choice.moveType ?? 'Teacher Move',
        metricsDelta: inferLegacyMetrics(choice.moveType ?? 'Teacher Move', choice.scoreDelta),
      })),
    },
    turn_4: {
      text: legacyScenario.dialogueTree.turn_4.text,
      speakerId: 'studentA',
      speakerName: 'Student A',
      choices: legacyScenario.dialogueTree.turn_4.choices.map((choice) => ({
        text: choice.text,
        nextNode: choice.nextNode,
        tip: choice.tip,
        moveType: choice.moveType ?? 'Teacher Move',
        metricsDelta: inferLegacyMetrics(choice.moveType ?? 'Teacher Move', choice.scoreDelta),
      })),
    },
    turn_5: {
      text: legacyScenario.dialogueTree.turn_5.text,
      speakerId: 'studentB',
      speakerName: 'Student B',
      choices: legacyScenario.dialogueTree.turn_5.choices.map((choice) => ({
        text: choice.text,
        nextNode: choice.nextNode,
        tip: choice.tip,
        moveType: choice.moveType ?? 'Teacher Move',
        metricsDelta: inferLegacyMetrics(choice.moveType ?? 'Teacher Move', choice.scoreDelta),
      })),
    },
    turn_6: {
      text: legacyScenario.dialogueTree.turn_6.text,
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: legacyScenario.dialogueTree.turn_6.choices.map((choice) => ({
        text: choice.text,
        nextNode: choice.nextNode,
        tip: choice.tip,
        moveType: choice.moveType ?? 'Teacher Move',
        metricsDelta: inferLegacyMetrics(choice.moveType ?? 'Teacher Move', choice.scoreDelta),
      })),
    },
    turn_7: {
      text: legacyScenario.dialogueTree.turn_7.text,
      speakerId: 'studentA',
      speakerName: 'Student A',
      choices: legacyScenario.dialogueTree.turn_7.choices.map((choice) => ({
        text: choice.text,
        nextNode: choice.nextNode,
        tip: choice.tip,
        moveType: choice.moveType ?? 'Teacher Move',
        metricsDelta: inferLegacyMetrics(choice.moveType ?? 'Teacher Move', choice.scoreDelta),
      })),
    },
    turn_8: {
      text: legacyScenario.dialogueTree.turn_8.text,
      speakerId: 'studentB',
      speakerName: 'Student B',
      choices: legacyScenario.dialogueTree.turn_8.choices.map((choice) => ({
        text: choice.text,
        nextNode: choice.nextNode,
        tip: choice.tip,
        moveType: choice.moveType ?? 'Teacher Move',
        metricsDelta: inferLegacyMetrics(choice.moveType ?? 'Teacher Move', choice.scoreDelta),
      })),
    },
  },
};

const noHandsUp: ChoiceScenarioDefinition = {
  id: 'no-hands-up',
  title: 'No Hands Up',
  subtitle: 'Priority Level 1',
  description:
    'Practice resisting the one fast correct hand-up while Primary pupils build partial ideas in English.',
  recommendedOrder: 1,
  focusAreas: ['equity', 'think time', 'participation'],
  reflectionPrompt:
    'Which choices widened access to the conversation, and which ones rewarded only speed, confidence, and the one pupil already ready in English?',
  recommendedMoves: ['Wait Time', 'No Hands Up', 'Turn and Talk', 'Learning-Focused Response'],
  startNodeId: 'start_node',
  passThreshold: 68,
  startingMetrics: {
    participation: 52,
    reasoning: 48,
    ownership: 46,
  },
  hotspots: baseHotspots,
  dialogueTree: {
    start_node: {
      text: "You ask, 'Why do you think the balloon inflated?' One confident pupil shoots a hand up straight away. Around the room, most pupils look unsure or whisper in Malay because they cannot yet form the English. The lesson clock is moving. What do you do?",
      alternateTexts: [
        "You ask, 'Why did the balloon get bigger?' One pupil is already waving a hand. Most of the class are still staring, whispering in Malay, or looking at that pupil for the answer. You can feel time slipping.",
      ],
      pressureCue: 'Pressure cue: one fluent volunteer is ready, but most of the room is not.',
      alternatePressureCues: [
        'Pressure cue: the quick correct answer is available right now if you want to move on fast.',
      ],
      responseType: 'echo',
      speakerId: 'studentA',
      speakerName: 'Student A',
      choices: [
        {
          text: "[NO HANDS UP] 'No hands yet. Everyone take ten silent seconds so we can all think first.'",
          nextNode: 'turn_2',
          moveType: 'No Hands Up',
          tip: 'Strong move. You resisted the urge to grab the one quick answer and gave the wider class time to think.',
          metricsDelta: { participation: 16, reasoning: 6, ownership: 12 },
        },
        {
          text: "[FASTEST HAND] 'Ava, you were first. Go ahead.'",
          nextNode: 'turn_2',
          moveType: 'Fastest Hand',
          tip: 'This feels efficient, but it rewards speed and leaves most pupils watching rather than thinking aloud.',
          metricsDelta: { participation: -12, reasoning: -4, ownership: -10 },
        },
        {
          text: "[TEACHER RESCUE] 'Let me remind you what gas particles do first.'",
          nextNode: 'turn_2',
          moveType: 'Teacher Rescue',
          tip: 'Explaining too early may save time, but it shrinks student ownership before anyone has reasoned aloud.',
          metricsDelta: { participation: -8, reasoning: -10, ownership: -12 },
        },
        {
          text: "[COLD CALL] 'Malik, answer now before anyone else.'",
          nextNode: 'turn_2',
          moveType: 'Premature Cold Call',
          tip: 'Cold call is safer after think time or pair rehearsal, not before.',
          metricsDelta: { participation: -10, reasoning: -6, ownership: -12 },
        },
      ],
    },
    turn_2: {
      text: "After the pause, Student B says, 'Maybe... the air inside push out?' It is not polished English, but it is a real idea. Several pupils are now whispering possible explanations to themselves.",
      alternateTexts: [
        "After the pause, Student B says, 'I think... air inside go out and make balloon big.' The sentence is rough, but the idea has substance. A few pupils begin murmuring possible reasons to their partners.",
      ],
      pressureCue: 'Pressure cue: this is the moment many teachers paraphrase quickly and move on.',
      responseType: 'emergent-language',
      speakerId: 'studentB',
      speakerName: 'Student B',
      choices: [
        {
          text: "[PAIR REHEARSAL] 'Turn to your shoulder partner and compare what each of you thinks the trapped gas was doing.'",
          nextNode: 'turn_3',
          moveType: 'Turn and Talk',
          tip: 'Excellent. Pair rehearsal helps more pupils turn rough thinking into sayable English.',
          metricsDelta: { participation: 14, reasoning: 8, ownership: 10 },
        },
        {
          text: "[SAME STUDENT] 'Okay, Student B, keep going while everyone else listens.'",
          nextNode: 'turn_3',
          moveType: 'Stay Narrow',
          tip: 'One student may deepen, but the room stays spectator-heavy.',
          metricsDelta: { participation: -8, reasoning: 4, ownership: -6 },
        },
        {
          text: "[APPROVAL] 'Yes, that's the right direction. Who else agrees?'",
          nextNode: 'turn_3',
          moveType: 'Approval Seeking',
          tip: 'Agreement checks often turn a fragile idea into answer-hunting before it has been developed.',
          metricsDelta: { participation: -6, reasoning: -8, ownership: -6 },
        },
        {
          text: "[VOLUNTEER CHASE] 'I just want one more hand. Who knows it for sure?'",
          nextNode: 'turn_3',
          moveType: 'Volunteer Chase',
          tip: 'You have reintroduced competition for speed and certainty.',
          metricsDelta: { participation: -12, reasoning: -6, ownership: -8 },
        },
      ],
    },
    turn_3: {
      text: "You are ready to bring the class back. Student C has not spoken yet, but you noticed they shared a useful idea during partner talk, partly in Malay and partly in English.",
      responseType: 'partner-report',
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: [
        {
          text: "[TARGETED INVITE] 'Student C, would you share what you and your partner were thinking?'",
          nextNode: 'turn_4',
          moveType: 'Targeted Invite',
          tip: 'Smart. This keeps the routine equitable and lowers the risk by letting the pupil report pair thinking instead of performing alone.',
          metricsDelta: { participation: 12, reasoning: 8, ownership: 12 },
        },
        {
          text: "[TOP VOLUNTEER] 'Who wants to tell us? ... okay, same front table again.'",
          nextNode: 'turn_4',
          moveType: 'Repeat Volunteers',
          tip: 'You sampled the already-confident students again, narrowing ownership.',
          metricsDelta: { participation: -10, reasoning: -2, ownership: -10 },
        },
        {
          text: "[TEACHER SUMMARY] 'Here is the idea I heard most often...' ",
          nextNode: 'turn_4',
          moveType: 'Teacher Summary',
          tip: 'Summarising too soon prevents students from publicly owning the idea.',
          metricsDelta: { participation: -6, reasoning: -6, ownership: -10 },
        },
        {
          text: "[POP QUIZ] 'Hands up if you can define pressure correctly.'",
          nextNode: 'turn_4',
          moveType: 'Hands Up Quiz',
          tip: 'The routine slips back into selecting the quickest correct response.',
          metricsDelta: { participation: -12, reasoning: -6, ownership: -8 },
        },
      ],
    },
    turn_4: {
      text: "Student C shares, 'We thought the air spread and push the balloon wall.' The English is still developing, but the scientific idea is opening up. How do you close this level?",
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: [
        {
          text: "[BUILD] 'Who can build on that and help us name the pattern more precisely?'",
          nextNode: 'end_game',
          moveType: 'Add On',
          tip: 'Great close. You treat the half-formed answer as something to build, not something to replace.',
          metricsDelta: { participation: 10, reasoning: 10, ownership: 8 },
        },
        {
          text: "[EVALUATE] 'Exactly. That is the correct answer.'",
          nextNode: 'end_game',
          moveType: 'Evaluation',
          tip: 'Correctness lands, but the discussion closes around teacher approval.',
          metricsDelta: { participation: -8, reasoning: -8, ownership: -8 },
        },
        {
          text: "[RECAP SOLO] 'Thanks. Let me explain the full model now.'",
          nextNode: 'end_game',
          moveType: 'Teacher Explanation',
          tip: 'This produces clarity, but it also takes ownership back from students.',
          metricsDelta: { participation: -6, reasoning: -4, ownership: -10 },
        },
        {
          text: "[MOVE ON] 'Great. Open your books.'",
          nextNode: 'end_game',
          moveType: 'Abrupt Closure',
          tip: 'Momentum disappears when students never get to build the idea together.',
          metricsDelta: { participation: -10, reasoning: -8, ownership: -10 },
        },
      ],
    },
  },
};

const thinkPairShare: ChoiceScenarioDefinition = {
  id: 'think-pair-share',
  title: 'Think-Pair-Share',
  subtitle: 'Priority Level 2',
  description:
    'Practice sequencing silent think time, partner rehearsal, and share-out when most pupils need support to form the English.',
  recommendedOrder: 2,
  focusAreas: ['think-pair-share', 'rehearsal', 'whole-class discussion'],
  reflectionPrompt:
    'Did your sequence help pupils rehearse an idea before public talk, or did it skip too quickly to a whole-class answer from the strongest speaker?',
  recommendedMoves: ['Wait Time', 'Turn and Talk', 'Report Partner', 'Add On'],
  startNodeId: 'start_node',
  passThreshold: 68,
  startingMetrics: {
    participation: 50,
    reasoning: 48,
    ownership: 46,
  },
  hotspots: baseHotspots,
  dialogueTree: {
    start_node: {
      text: "You ask, 'Why might the character hide the letter instead of sending it?' A few pupils know something but cannot yet say it clearly in English. You want everyone thinking, not just the quickest volunteers.",
      alternateTexts: [
        "You ask, 'Why did the character keep the letter instead of sending it?' Some pupils have ideas, but only in short phrases. One confident child is ready to answer now.",
      ],
      pressureCue: 'Pressure cue: literary discussion can easily collapse into one polished response from the strongest reader.',
      responseType: 'partial-idea',
      speakerId: 'studentA',
      speakerName: 'Student A',
      choices: [
        {
          text: "[THINK FIRST] 'No hands yet. Take fifteen seconds to think and jot one possibility.'",
          nextNode: 'turn_2',
          moveType: 'Think Time',
          tip: 'Strong start. Pupils now have some thinking to bring into partner talk before the pressure of whole-class English.',
          metricsDelta: { participation: 12, reasoning: 8, ownership: 10 },
        },
        {
          text: "[STRAIGHT TO WHOLE CLASS] 'Who can answer right now?'",
          nextNode: 'turn_2',
          moveType: 'Skip Think Time',
          tip: 'You lost the rehearsal window for slower processors and pupils who need language support before speaking publicly.',
          metricsDelta: { participation: -10, reasoning: -6, ownership: -10 },
        },
        {
          text: "[TEACHER HINT] 'Remember, it has to do with fear.'",
          nextNode: 'turn_2',
          moveType: 'Teacher Hint',
          tip: 'Helpful, but it narrows the inquiry before students have formed ideas.',
          metricsDelta: { participation: -4, reasoning: -8, ownership: -6 },
        },
        {
          text: "[EXPLAIN THE THEME] 'This is really about shame, so think about that.'",
          nextNode: 'turn_2',
          moveType: 'Teacher Framing',
          tip: 'You have already done much of the interpretive work for them.',
          metricsDelta: { participation: -8, reasoning: -10, ownership: -10 },
        },
      ],
    },
    turn_2: {
      text: 'Pupils have individual ideas, but many are still only fragments or short phrases. What is your next move?',
      responseType: 'emergent-language',
      speakerId: 'studentB',
      speakerName: 'Student B',
      choices: [
        {
          text: "[PAIR REHEARSAL] 'Turn to your shoulder partner and explain your idea. Be ready to share what your partner said too.'",
          nextNode: 'turn_3',
          moveType: 'Pair Rehearsal',
          tip: 'Excellent. This makes partner talk purposeful and gives pupils a safer space to rehearse the English.',
          metricsDelta: { participation: 14, reasoning: 8, ownership: 10 },
        },
        {
          text: "[ONE MORE HAND] 'Okay, now I just need one student to tell us.'",
          nextNode: 'turn_3',
          moveType: 'Collapse to Volunteer',
          tip: 'The sequence skipped from private thinking straight to public performance.',
          metricsDelta: { participation: -10, reasoning: -4, ownership: -8 },
        },
        {
          text: "[TEACHER MODEL] 'Listen to how I would answer this first.'",
          nextNode: 'turn_3',
          moveType: 'Teacher Model',
          tip: 'Modelling can support students, but here it replaces their rehearsal.',
          metricsDelta: { participation: -8, reasoning: -6, ownership: -10 },
        },
        {
          text: "[SILENT WRITING ONLY] 'Write a longer answer quietly on your own.'",
          nextNode: 'turn_3',
          moveType: 'Silent Writing Only',
          tip: 'Useful for thought, but it misses the language rehearsal benefit of partner talk.',
          metricsDelta: { participation: -2, reasoning: 2, ownership: -2 },
        },
      ],
    },
    turn_3: {
      text: "Pairs have talked. You heard a promising but unfinished idea from Student C's partnership, and they usually avoid whole-class speaking.",
      alternateTexts: [
        "Pairs have talked. Student C and their partner have a useful idea, but it is still hesitant and incomplete, and Student C rarely volunteers publicly.",
      ],
      pressureCue: 'Pressure cue: you could choose the fluent pupil again and get a smoother answer immediately.',
      responseType: 'partner-report',
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: [
        {
          text: "[SAFE SHARE-OUT] 'Student C, would you share what you and your partner discussed?'",
          nextNode: 'turn_4',
          moveType: 'Partner Report Share-Out',
          tip: 'Great choice. Reporting pair thinking lowers the public risk and lets partial language still count.',
          metricsDelta: { participation: 12, reasoning: 6, ownership: 12 },
        },
        {
          text: "[BEST HAND] 'Whose answer is strongest?'",
          nextNode: 'turn_4',
          moveType: 'Best Hand',
          tip: 'The activity has shifted back to performance instead of collective rehearsal.',
          metricsDelta: { participation: -10, reasoning: -6, ownership: -8 },
        },
        {
          text: "[SAME CONFIDENT STUDENT] 'Student A, tell us the polished version.'",
          nextNode: 'turn_4',
          moveType: 'Confident Share-Out',
          tip: 'You chose fluency, but lost equity and ownership.',
          metricsDelta: { participation: -8, reasoning: 0, ownership: -8 },
        },
        {
          text: "[TEACHER SUMMARY] 'I heard most pairs say she was protecting herself.'",
          nextNode: 'turn_4',
          moveType: 'Teacher Summary',
          tip: 'Useful synthesis, but too early for students to own the idea publicly.',
          metricsDelta: { participation: -6, reasoning: -4, ownership: -10 },
        },
      ],
    },
    turn_4: {
      text: "Student C shares a thoughtful partner idea, but it is still incomplete. How do you keep the sequence dialogic rather than ending on a single report?",
      responseType: 'partial-idea',
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: [
        {
          text: "[BUILD] 'Who can build on that or offer a slightly different interpretation from their pair?'",
          nextNode: 'end_game',
          moveType: 'Add On',
          tip: 'Perfect. Think-pair-share becomes a bridge from rough rehearsal to richer whole-class thinking.',
          metricsDelta: { participation: 10, reasoning: 10, ownership: 8 },
        },
        {
          text: "[EVALUATE] 'Yes, that is the answer I wanted.'",
          nextNode: 'end_game',
          moveType: 'Evaluation',
          tip: 'The sequence ended in teacher approval instead of peer reasoning.',
          metricsDelta: { participation: -8, reasoning: -8, ownership: -8 },
        },
        {
          text: "[MOVE ON] 'Great. Let us get back to the worksheet.'",
          nextNode: 'end_game',
          moveType: 'Abrupt Exit',
          tip: 'You used the structure, but not to deepen the public discussion.',
          metricsDelta: { participation: -8, reasoning: -8, ownership: -8 },
        },
        {
          text: "[TEACHER INTERPRETATION] 'Exactly. The scene shows internal conflict because...' ",
          nextNode: 'end_game',
          moveType: 'Teacher Interpretation',
          tip: 'Clear, but it shifts students from co-constructors back to listeners.',
          metricsDelta: { participation: -6, reasoning: -6, ownership: -10 },
        },
      ],
    },
  },
};

const partnerRoutines: ChoiceScenarioDefinition = {
  id: 'partner-routines',
  title: 'Partner Routines',
  subtitle: 'Priority Level 2',
  description:
    'Rehearse shoulder-partner expectations so pair talk becomes accountable, not just noisy.',
  recommendedOrder: 3,
  focusAreas: ['partner talk', 'shoulder partners', 'accountability'],
  reflectionPrompt:
    'Did your pair routine create purposeful rehearsal, or did it leave students unsure what quality talk should sound like?',
  recommendedMoves: ['Shoulder Partners', 'Turn and Talk', 'Paraphrase', 'Build On'],
  startNodeId: 'start_node',
  passThreshold: 67,
  startingMetrics: {
    participation: 48,
    reasoning: 50,
    ownership: 47,
  },
  hotspots: baseHotspots,
  dialogueTree: {
    start_node: {
      text: "You want every student discussing a poem opening line. Some students already know their shoulder partners, others do not. How do you launch?",
      responseType: 'echo',
      speakerId: 'studentA',
      speakerName: 'Student A',
      choices: [
        {
          text: "[CLEAR ROUTINE] 'Turn knee-to-knee with your shoulder partner. Partner A speaks first for 20 seconds, then Partner B paraphrases before adding on.'",
          nextNode: 'turn_2',
          moveType: 'Structured Partner Routine',
          tip: 'Excellent. You set participation and listening norms before the talk starts.',
          metricsDelta: { participation: 14, reasoning: 8, ownership: 10 },
        },
        {
          text: "[LOOSE DIRECTION] 'Talk to someone near you about the line.'",
          nextNode: 'turn_2',
          moveType: 'Loose Direction',
          tip: 'Students may talk, but the quality and accountability of the routine stay fuzzy.',
          metricsDelta: { participation: 2, reasoning: -2, ownership: 0 },
        },
        {
          text: "[ONE STUDENT ONLY] 'Just tell me what you think, Student A.'",
          nextNode: 'turn_2',
          moveType: 'Skip Pair Talk',
          tip: 'You lost the chance to rehearse ideas safely before going public.',
          metricsDelta: { participation: -12, reasoning: -4, ownership: -10 },
        },
        {
          text: "[TEACHER MODEL ONLY] 'Listen while I show you the interpretation first.'",
          nextNode: 'turn_2',
          moveType: 'Teacher Model Only',
          tip: 'Modelling has value, but here it steals the discovery work from the students.',
          metricsDelta: { participation: -8, reasoning: -10, ownership: -12 },
        },
      ],
    },
    turn_2: {
      text: "As pairs talk, you notice one student dominating while their partner nods quietly.",
      responseType: 'echo',
      speakerId: 'studentB',
      speakerName: 'Student B',
      choices: [
        {
          text: "[RESET NORMS] 'Pause. Make sure both partners share. This time, Person B starts and Person A paraphrases first.'",
          nextNode: 'turn_3',
          moveType: 'Reset Partner Norms',
          tip: 'Great intervention. You protected equitable talk without scrapping the routine.',
          metricsDelta: { participation: 12, reasoning: 6, ownership: 10 },
        },
        {
          text: "[IGNORE IT] 'Keep going, everyone.'",
          nextNode: 'turn_3',
          moveType: 'Ignore Imbalance',
          tip: 'Talk time keeps happening, but not for everyone.',
          metricsDelta: { participation: -10, reasoning: -2, ownership: -8 },
        },
        {
          text: "[CALL OUT] 'Student B, stop dominating.'",
          nextNode: 'turn_3',
          moveType: 'Public Correction',
          tip: 'You addressed the issue, but at the cost of psychological safety.',
          metricsDelta: { participation: -6, reasoning: -2, ownership: -6 },
        },
        {
          text: "[ABANDON PAIRS] 'Never mind, let us come back whole class.'",
          nextNode: 'turn_3',
          moveType: 'Abandon Routine',
          tip: 'Ending the routine early tells students that pair talk is optional rather than teachable.',
          metricsDelta: { participation: -12, reasoning: -6, ownership: -10 },
        },
      ],
    },
    turn_3: {
      text: "You are ready for the share-out. What kind of prompt keeps the partner routine accountable?",
      responseType: 'partner-report',
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: [
        {
          text: "[REPORT PARTNER] 'Tell us one idea your partner shared before you add your own.'",
          nextNode: 'end_game',
          moveType: 'Report Partner',
          tip: 'Perfect. Students now have a reason to listen closely during partner talk.',
          metricsDelta: { participation: 10, reasoning: 8, ownership: 8 },
        },
        {
          text: "[BEST ANSWER] 'Who heard the best interpretation?'",
          nextNode: 'end_game',
          moveType: 'Best Answer Hunt',
          tip: 'This turns pair talk into competition for a winning idea.',
          metricsDelta: { participation: -8, reasoning: -8, ownership: -8 },
        },
        {
          text: "[FAST SHARE] 'Just give me one quick thought from anyone.'",
          nextNode: 'end_game',
          moveType: 'Quick Share',
          tip: 'You brought students back, but the partner routine never shaped the public discussion.',
          metricsDelta: { participation: -4, reasoning: -4, ownership: -6 },
        },
        {
          text: "[TEACHER PARAPHRASE] 'I probably know what most pairs said, so I will summarise.'",
          nextNode: 'end_game',
          moveType: 'Teacher Paraphrase',
          tip: 'Students lose the chance to make their partner’s thinking visible.',
          metricsDelta: { participation: -10, reasoning: -4, ownership: -10 },
        },
      ],
    },
  },
};

const waitTimeMastery: ChoiceScenarioDefinition = {
  id: 'wait-time-mastery',
  title: 'Wait Time Mastery',
  subtitle: 'Priority Level 4',
  description:
    'Feel the difference between rescuing the silence and staying long enough for Primary pupils to build a partial answer.',
  recommendedOrder: 4,
  focusAreas: ['wait time', 'silence', 'processing'],
  reflectionPrompt:
    'What became possible when you held the silence a little longer, and what disappeared when anxiety and time pressure made you fill it yourself?',
  recommendedMoves: ['Wait Time', 'Stay Neutral', 'Say More', 'Turn and Talk'],
  startNodeId: 'start_node',
  passThreshold: 69,
  startingMetrics: {
    participation: 46,
    reasoning: 48,
    ownership: 45,
  },
  hotspots: baseHotspots,
  dialogueTree: {
    start_node: {
      text: "You ask, 'What pattern do you notice in the fractions?' No one answers immediately. Two seconds already feel too long, and you are aware the lesson is slipping on.",
      alternateTexts: [
        "You ask, 'What is happening in this fraction pattern?' Nobody answers straight away. The silence feels awkward, and part of you wants to rescue it immediately.",
      ],
      pressureCue: 'Pressure cue: the silence feels expensive, even though the thinking may only just be starting.',
      responseType: 'echo',
      speakerId: 'studentA',
      speakerName: 'Student A',
      choices: [
        {
          text: "[HOLD THE SILENCE] (Stay quiet, scan the room, and keep the question open for five more seconds.)",
          nextNode: 'turn_2',
          moveType: 'Wait Time',
          tip: 'Strong move. The silence is uncomfortable, but it creates thinking space instead of panic.',
          metricsDelta: { participation: 14, reasoning: 10, ownership: 12 },
        },
        {
          text: "[RESCUE] 'It is the numerator, everyone. Look at the top number.'",
          nextNode: 'turn_2',
          moveType: 'Teacher Rescue',
          tip: 'You removed the struggle before pupils could productively enter it for themselves.',
          metricsDelta: { participation: -10, reasoning: -12, ownership: -10 },
        },
        {
          text: "[REPHRASE RAPIDLY] 'Okay, what is the rule? What changes? What do you see? Anyone?'",
          nextNode: 'turn_2',
          moveType: 'Question Flood',
          tip: 'Rapid-fire rephrasing often increases pressure without improving thinking.',
          metricsDelta: { participation: -8, reasoning: -8, ownership: -8 },
        },
        {
          text: "[VOLUNTEER ONLY] 'Hands up if you have it.'",
          nextNode: 'turn_2',
          moveType: 'Hands Up',
          tip: 'This pulls attention toward speed and confidence instead of collective reasoning.',
          metricsDelta: { participation: -10, reasoning: -4, ownership: -8 },
        },
      ],
    },
    turn_2: {
      text: "Student B finally says, 'I think... top number go up one each time.' The room goes quiet again after the contribution.",
      alternateTexts: [
        "Student B finally says, 'Maybe the number on top is adding one... every time.' The class goes quiet again after the contribution.",
      ],
      pressureCue: 'Pressure cue: the answer is incomplete, and the temptation to clean it up for the class is high.',
      responseType: 'partial-idea',
      speakerId: 'studentB',
      speakerName: 'Student B',
      choices: [
        {
          text: "[SECOND WAIT] (Pause again before responding so peers can process the idea.)",
          nextNode: 'turn_3',
          moveType: 'Second Wait Time',
          tip: 'Excellent. Wait time after a student contribution is often the most powerful pause because it lets the class work on the idea.',
          metricsDelta: { participation: 12, reasoning: 10, ownership: 10 },
        },
        {
          text: "[IMMEDIATE PRAISE] 'Yes! Exactly right, Student B.'",
          nextNode: 'turn_3',
          moveType: 'Immediate Praise',
          tip: 'Warm, but it tells everyone else the thinking work is already done by one pupil.',
          metricsDelta: { participation: -6, reasoning: -8, ownership: -8 },
        },
        {
          text: "[IMMEDIATE EXPLANATION] 'And that means the sequence increases by one whole unit each step.'",
          nextNode: 'turn_3',
          moveType: 'Immediate Explanation',
          tip: 'You closed down the chance for peer uptake.',
          metricsDelta: { participation: -8, reasoning: -10, ownership: -8 },
        },
        {
          text: "[NEXT QUESTION FAST] 'Good. So what happens in term six? Anyone?'",
          nextNode: 'turn_3',
          moveType: 'Move On Too Fast',
          tip: 'Students have no time to absorb or challenge the first idea.',
          metricsDelta: { participation: -8, reasoning: -6, ownership: -6 },
        },
      ],
    },
    turn_3: {
      text: "Several pupils look almost ready now. How do you use the pause productively?",
      responseType: 'partial-idea',
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: [
        {
          text: "[BUILD ON] 'Who can build on Student B’s idea or test it with another example?'",
          nextNode: 'end_game',
          moveType: 'Add On',
          tip: 'Perfect. The uncomfortable silence has now set up stronger student-to-student reasoning.',
          metricsDelta: { participation: 10, reasoning: 12, ownership: 8 },
        },
        {
          text: "[PICK SAME STUDENT] 'Student B, just finish the whole explanation for us.'",
          nextNode: 'end_game',
          moveType: 'Single Voice',
          tip: 'One student may succeed, but the rest of the room stays passive.',
          metricsDelta: { participation: -8, reasoning: 2, ownership: -6 },
        },
        {
          text: "[TELL THEM] 'The pattern is obvious now, so let me show you the rule.'",
          nextNode: 'end_game',
          moveType: 'Teacher Tell',
          tip: 'You transformed a promising collective pause into teacher delivery.',
          metricsDelta: { participation: -10, reasoning: -8, ownership: -10 },
        },
        {
          text: "[CHECK CORRECTNESS] 'Thumbs up if Student B is correct.'",
          nextNode: 'end_game',
          moveType: 'Correctness Check',
          tip: 'This checks agreement, but not why the idea makes sense.',
          metricsDelta: { participation: -4, reasoning: -8, ownership: -4 },
        },
      ],
    },
  },
};

const targetedQuestioning: ChoiceScenarioDefinition = {
  id: 'targeted-questioning',
  title: 'Targeted Questioning',
  subtitle: 'Priority Level 5',
  description:
    'Choose who to invite next based on readiness, confidence, language support, and what the discussion needs.',
  recommendedOrder: 5,
  focusAreas: ['targeted questioning', 'equity', 'student uptake'],
  reflectionPrompt:
    'Did your invitations distribute voice strategically, or did they default to the same confident pupils with the quickest English?',
  recommendedMoves: ['Turn and Talk', 'Targeted Invite', 'Press for Reasoning', 'Add On'],
  startNodeId: 'start_node',
  passThreshold: 69,
  startingMetrics: {
    participation: 50,
    reasoning: 52,
    ownership: 48,
  },
  hotspots: baseHotspots,
  dialogueTree: {
    start_node: {
      text: "Pairs have discussed why a character in the novel chose to leave home. You heard three useful ideas: one from a quiet pupil with hesitant English, one misconception, and one strong textual link. Who do you invite first?",
      responseType: 'partner-report',
      speakerId: 'studentA',
      speakerName: 'Student A',
      choices: [
        {
          text: "[QUIET STUDENT AFTER PAIR TALK] 'Student A, would you share what you and your partner noticed in the final paragraph?'",
          nextNode: 'turn_2',
          moveType: 'Target Quiet Student',
          tip: 'Great. Pair talk lowers the risk and expands who gets public airtime, even if the English is not polished yet.',
          metricsDelta: { participation: 14, reasoning: 8, ownership: 12 },
        },
        {
          text: "[SAME CONFIDENT STUDENT] 'Student B, you always explain this well. Go ahead again.'",
          nextNode: 'turn_2',
          moveType: 'Repeat Confident Student',
          tip: 'Comfortable, but it narrows who gets positioned as a thinker.',
          metricsDelta: { participation: -10, reasoning: 2, ownership: -10 },
        },
        {
          text: "[TEACHER SUMMARY] 'I heard three interesting points, so let me summarise them.'",
          nextNode: 'turn_2',
          moveType: 'Teacher Summary',
          tip: 'You retained control, but students lost ownership of the interpretive work.',
          metricsDelta: { participation: -8, reasoning: -6, ownership: -10 },
        },
        {
          text: "[WHO KNOWS?] 'Who knows the best answer here?'",
          nextNode: 'turn_2',
          moveType: 'Best Answer Hunt',
          tip: 'This frames discussion as answer retrieval, not interpretation.',
          metricsDelta: { participation: -12, reasoning: -8, ownership: -8 },
        },
      ],
    },
    turn_2: {
      text: "Student A says, 'We thought she leaves because... at home nobody see her.' Another pupil quietly mutters, 'No, she just rude.' What now?",
      responseType: 'misconception',
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: [
        {
          text: "[TARGET MISCONCEPTION] 'Student C, say more about why you think it comes across as rude.'",
          nextNode: 'turn_3',
          moveType: 'Surface Misconception',
          tip: 'Strong. You brought a contrasting reading into the open instead of letting the class wait for you to settle it.',
          metricsDelta: { participation: 8, reasoning: 12, ownership: 8 },
        },
        {
          text: "[CORRECT IT] 'No, that misses the point of the chapter.'",
          nextNode: 'turn_3',
          moveType: 'Shut Down',
          tip: 'Fast correction protects accuracy, but weakens discussion and risk-taking.',
          metricsDelta: { participation: -10, reasoning: -8, ownership: -10 },
        },
        {
          text: "[IGNORE IT] 'Let us stay with Student A only.'",
          nextNode: 'turn_3',
          moveType: 'Ignore Tension',
          tip: 'You kept the flow smooth, but missed a useful opportunity to deepen reasoning.',
          metricsDelta: { participation: -4, reasoning: -8, ownership: -2 },
        },
        {
          text: "[ANSWER IT YOURSELF] 'Actually, the author signals loneliness through the imagery.'",
          nextNode: 'turn_3',
          moveType: 'Teacher Interpretation',
          tip: 'Your interpretation may be strong, but students no longer need to reason together.',
          metricsDelta: { participation: -8, reasoning: -10, ownership: -10 },
        },
      ],
    },
    turn_3: {
      text: "You have two live interpretations in the room, both only partly formed. Which next invitation best deepens the discussion?",
      responseType: 'partial-idea',
      speakerId: 'studentB',
      speakerName: 'Student B',
      choices: [
        {
          text: "[TARGET TEXTUAL LINK] 'Student B, can you connect one of these ideas to a line from the text?'",
          nextNode: 'end_game',
          moveType: 'Target Evidence',
          tip: 'Excellent targeting. You chose the next voice because of what the discussion needed, not because the pupil sounded most fluent.',
          metricsDelta: { participation: 8, reasoning: 14, ownership: 8 },
        },
        {
          text: "[RANDOM PICK] 'Anyone. I do not mind who.'",
          nextNode: 'end_game',
          moveType: 'Random Pick',
          tip: 'Randomness can feel fair, but here it ignores the intellectual shape of the discussion.',
          metricsDelta: { participation: -2, reasoning: -6, ownership: -2 },
        },
        {
          text: "[TEACHER WRAP-UP] 'You have all helped enough. Here is the real theme.'",
          nextNode: 'end_game',
          moveType: 'Teacher Wrap-Up',
          tip: 'You ended with clarity, but not with student sense-making.',
          metricsDelta: { participation: -8, reasoning: -8, ownership: -10 },
        },
        {
          text: "[CONFIDENT STUDENT AGAIN] 'Student B, just settle the disagreement for us.'",
          nextNode: 'end_game',
          moveType: 'Over-Reliance',
          tip: 'You used evidence, but still concentrated authority in one familiar voice.',
          metricsDelta: { participation: -6, reasoning: 4, ownership: -8 },
        },
      ],
    },
  },
};

const plannedCodeSwitching: ChoiceScenarioDefinition = {
  id: 'planned-code-switching',
  title: 'Planned Code-Switching',
  subtitle: 'Multilingual Support',
  description:
    'Use Malay support deliberately so pupils can return to English with stronger reasoning, not less.',
  recommendedOrder: 6,
  focusAreas: ['multilingual talk', 'code-switching', 'sentence stems'],
  reflectionPrompt:
    'Did you use the first language as a bridge back into academic English, or did it become an unplanned escape from thinking aloud?',
  recommendedMoves: ['Sentence Stems', 'Vocabulary Support', 'Partner Rehearsal', 'Planned Revoicing'],
  startNodeId: 'start_node',
  passThreshold: 69,
  startingMetrics: {
    participation: 48,
    reasoning: 50,
    ownership: 46,
  },
  hotspots: baseHotspots,
  dialogueTree: {
    start_node: {
      text: "Your class is discussing why shadows change length. Several pupils understand the idea but switch into Malay because they do not yet have the English to explain it.",
      alternateTexts: [
        "Your class is discussing why shadows change length. Pupils are thinking hard, but many slip into Malay because the English explanation feels out of reach.",
      ],
      pressureCue: 'Pressure cue: you need English to stay visible, but forcing it too early may shut down the thinking.',
      responseType: 'emergent-language',
      speakerId: 'studentA',
      speakerName: 'Student A',
      choices: [
        {
          text: "[PLANNED BRIDGE] 'Talk with your partner in either language for one minute, then use this English stem: \"We noticed the shadow changed because...\"'",
          nextNode: 'turn_2',
          moveType: 'Planned Bridge',
          tip: 'Strong choice. You legitimised bilingual sense-making while still protecting the return to English.',
          metricsDelta: { participation: 12, reasoning: 8, ownership: 12 },
        },
        {
          text: "[ENGLISH ONLY NOW] 'No first language. Say it only in English.'",
          nextNode: 'turn_2',
          moveType: 'Shut Down Home Language',
          tip: 'This may sound rigorous, but it often raises anxiety and reduces the chance that pupils will attempt the English at all.',
          metricsDelta: { participation: -10, reasoning: -6, ownership: -10 },
        },
        {
          text: "[LET IT DRIFT] 'Just talk however you want and we will see what happens.'",
          nextNode: 'turn_2',
          moveType: 'Unplanned Drift',
          tip: 'Code-switching can help, but without a planned bridge back, English reasoning stays underdeveloped.',
          metricsDelta: { participation: 4, reasoning: -4, ownership: -2 },
        },
        {
          text: "[TEACHER EXPLAINS] 'Let me give you the English explanation first.'",
          nextNode: 'turn_2',
          moveType: 'Teacher Explains Language',
          tip: 'You removed the productive work of rehearsal and language construction.',
          metricsDelta: { participation: -8, reasoning: -8, ownership: -10 },
        },
      ],
    },
    turn_2: {
      text: "Pairs have talked. One group has the idea, but not the vocabulary: 'The sun... same, but angle different... shadow longer.' What do you do?",
      alternateTexts: [
        "Pairs have talked. One group clearly has the concept, but only says, 'Sun there... different angle... so shadow more long.' What do you do?",
      ],
      pressureCue: 'Pressure cue: you can either build the language from the idea or replace the idea with your own words.',
      responseType: 'emergent-language',
      speakerId: 'studentB',
      speakerName: 'Student B',
      choices: [
        {
          text: "[REVOICE WITH STEM] 'You are saying the sun's angle changed, so the shadow became longer. Can you try that with the stem on the board?'",
          nextNode: 'turn_3',
          moveType: 'Revoice with Stem',
          tip: 'Excellent. You honoured the idea first, then strengthened the English needed to express it.',
          metricsDelta: { participation: 8, reasoning: 10, ownership: 10 },
        },
        {
          text: "[CORRECT THE ENGLISH] 'No, say it properly before you answer.'",
          nextNode: 'turn_3',
          moveType: 'Surface Correction',
          tip: 'Public correction raises the linguistic risk and can silence future contributions.',
          metricsDelta: { participation: -10, reasoning: -4, ownership: -10 },
        },
        {
          text: "[ACCEPT VAGUELY] 'Yes, close enough. Anyone else?'",
          nextNode: 'turn_3',
          moveType: 'Vague Acceptance',
          tip: 'You kept things moving, but missed the chance to build academic English deliberately.',
          metricsDelta: { participation: -2, reasoning: -2, ownership: -2 },
        },
        {
          text: "[TRANSLATE FOR THEM] 'What Student B means is that the angle of sunlight changes the shadow length.'",
          nextNode: 'turn_3',
          moveType: 'Teacher Translation',
          tip: 'Helpful in the moment, but students do not get to rehearse the English themselves.',
          metricsDelta: { participation: -6, reasoning: -4, ownership: -8 },
        },
      ],
    },
    turn_3: {
      text: "More pupils want to join in, but they are still cautious about the English. How do you widen participation?",
      responseType: 'partner-report',
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: [
        {
          text: "[LOW-RISK SHARE] 'Tell us what your partner said first, then add one of your own words using the key vocabulary.'",
          nextNode: 'end_game',
          moveType: 'Low-Risk Share',
          tip: 'Perfect. You lowered the language risk while keeping English visible in the public discussion.',
          metricsDelta: { participation: 12, reasoning: 8, ownership: 10 },
        },
        {
          text: "[BEST ENGLISH ONLY] 'I only want complete English sentences from now on.'",
          nextNode: 'end_game',
          moveType: 'Perfect English Demand',
          tip: 'This raises the bar in the wrong way: fluency becomes more important than reasoning.',
          metricsDelta: { participation: -10, reasoning: -6, ownership: -10 },
        },
        {
          text: "[LET TEACHER HOLD IT] 'I will say it for you, and you just agree if it is right.'",
          nextNode: 'end_game',
          moveType: 'Teacher Holds Language',
          tip: 'You supported accuracy, but students lost ownership of the English expression.',
          metricsDelta: { participation: -8, reasoning: -4, ownership: -10 },
        },
        {
          text: "[FULL L1 SHARE] 'Just answer fully in your first language.'",
          nextNode: 'end_game',
          moveType: 'No Bridge Back',
          tip: 'This may produce ideas, but it does not prepare students for English assessment talk unless you bridge back intentionally.',
          metricsDelta: { participation: 4, reasoning: 2, ownership: -4 },
        },
      ],
    },
  },
};

const curiosityHooks: ChoiceScenarioDefinition = {
  id: 'curiosity-hooks',
  title: 'Curiosity Hooks',
  subtitle: 'Priority Level 7',
  description:
    'Practice launching inquiry with noticing, wondering, and productive uncertainty in a Primary classroom where pupils may only offer fragments at first.',
  recommendedOrder: 7,
  focusAreas: ['curiosity', 'hooks', 'prediction'],
  reflectionPrompt:
    'Which opening invited real wondering, and which one merely disguised recall as inquiry while steering pupils back to teacher-answer mode?',
  recommendedMoves: ['Notice and Wonder', 'Prediction', 'Include Yourself', 'Open Guiding Question'],
  startNodeId: 'start_node',
  passThreshold: 68,
  startingMetrics: {
    participation: 48,
    reasoning: 46,
    ownership: 44,
  },
  hotspots: baseHotspots,
  dialogueTree: {
    start_node: {
      text: "You hold up a sealed jar with a candle inside that has gone out. You want to launch a discussion about combustion, but you know most pupils will begin with short, partial observations. How do you open?",
      responseType: 'prediction',
      speakerId: 'studentA',
      speakerName: 'Student A',
      choices: [
        {
          text: "[NOTICE & WONDER] 'What do you notice? What do you wonder? Write one of each before we talk.'",
          nextNode: 'turn_2',
          moveType: 'Notice and Wonder',
          tip: 'Excellent. You created genuine entry points instead of a hidden right answer, so even short observations can matter.',
          metricsDelta: { participation: 12, reasoning: 8, ownership: 12 },
        },
        {
          text: "[QUIZ QUESTION] 'Who knows why the candle went out?'",
          nextNode: 'turn_2',
          moveType: 'Quiz Launch',
          tip: 'This feels efficient, but it frames the moment as answer retrieval.',
          metricsDelta: { participation: -8, reasoning: -8, ownership: -8 },
        },
        {
          text: "[TELL FIRST] 'Today we are learning about oxygen depletion. Let me explain the setup.'",
          nextNode: 'turn_2',
          moveType: 'Frontload Answer',
          tip: 'Clear, but the curiosity is gone before students can generate it.',
          metricsDelta: { participation: -8, reasoning: -10, ownership: -12 },
        },
        {
          text: "[LEADING PROMPT] 'Was it because there was no oxygen left in the jar?'",
          nextNode: 'turn_2',
          moveType: 'Leading Hook',
          tip: 'It is a question, but not one that invites broad exploration.',
          metricsDelta: { participation: -6, reasoning: -10, ownership: -8 },
        },
      ],
    },
    turn_2: {
      text: "Students offer mixed observations: smoke on the glass, melted wax, and the candle dimming before it died. What comes next?",
      responseType: 'prediction',
      speakerId: 'studentB',
      speakerName: 'Student B',
      choices: [
        {
          text: "[PREDICTION] 'What do you predict would change if the jar were larger? Why?'",
          nextNode: 'turn_3',
          moveType: 'Prediction',
          tip: 'Strong move. Prediction keeps curiosity alive while nudging students toward mechanism.',
          metricsDelta: { participation: 8, reasoning: 12, ownership: 8 },
        },
        {
          text: "[RIGHT ANSWER CHECK] 'So who can explain the scientific reason now?'",
          nextNode: 'turn_3',
          moveType: 'Premature Explanation',
          tip: 'You moved too quickly from wondering to proving you know.',
          metricsDelta: { participation: -6, reasoning: -8, ownership: -6 },
        },
        {
          text: "[TEACHER HINT] 'Think about oxygen. That should help.'",
          nextNode: 'turn_3',
          moveType: 'Heavy Hint',
          tip: 'Hints can help, but this one narrows the field before students have explored enough.',
          metricsDelta: { participation: -4, reasoning: -8, ownership: -4 },
        },
        {
          text: "[PRAISE AND MOVE ON] 'Great observations. Open your notebooks.'",
          nextNode: 'turn_3',
          moveType: 'Lost Curiosity',
          tip: 'You validated students, but did not convert their noticing into inquiry.',
          metricsDelta: { participation: -6, reasoning: -6, ownership: -8 },
        },
      ],
    },
    turn_3: {
      text: "The class is now genuinely curious. How do you preserve that sense of co-inquiry?",
      responseType: 'prediction',
      speakerId: 'studentC',
      speakerName: 'Student C',
      choices: [
        {
          text: "[CO-INQUIRER] 'I am wondering about that too. Which clue from the jar might help us test our prediction?'",
          nextNode: 'end_game',
          moveType: 'Include Yourself',
          tip: 'Perfect. You stayed curious with the class instead of stepping outside the puzzle.',
          metricsDelta: { participation: 8, reasoning: 12, ownership: 10 },
        },
        {
          text: "[TEACHER EXPLANATION] 'Here is the chemistry behind it.'",
          nextNode: 'end_game',
          moveType: 'Teacher Explanation',
          tip: 'Explanation matters, but here it ends the exploration too abruptly.',
          metricsDelta: { participation: -8, reasoning: -6, ownership: -10 },
        },
        {
          text: "[SINGLE RIGHT ANSWER] 'I only want the correct explanation now.'",
          nextNode: 'end_game',
          moveType: 'Single Answer Demand',
          tip: 'Curiosity shrinks when students feel they are guessing the teacher’s answer.',
          metricsDelta: { participation: -10, reasoning: -10, ownership: -10 },
        },
        {
          text: "[MOVE ON] 'We can come back later if there is time.'",
          nextNode: 'end_game',
          moveType: 'Deferred Inquiry',
          tip: 'The moment of curiosity often fades if it is not used right away.',
          metricsDelta: { participation: -8, reasoning: -6, ownership: -8 },
        },
      ],
    },
  },
};

export const choiceScenarios = {
  crushedCanInquiry,
  noHandsUp,
  thinkPairShare,
  partnerRoutines,
  waitTimeMastery,
  targetedQuestioning,
  plannedCodeSwitching,
  curiosityHooks,
} as const;

export type ChoiceScenarioId = keyof typeof choiceScenarios;
