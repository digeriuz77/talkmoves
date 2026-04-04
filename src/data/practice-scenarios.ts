/**
 * Practice Scenarios - Shorter, focused talk-move chain scenarios
 * based on real classroom transcripts.
 *
 * These scenarios are designed for quicker practice sessions (3-5 turns each)
 * that target specific talk moves in authentic classroom contexts.
 */

import type { TalkMoveScenarioDefinition, TalkMoveNode } from './talk_moves';
import type { StudentResponseType } from '../lib/teacher-coaching';

// ============================================
// SCENE 1: The Number Line Debate (Transcript 2)
// ============================================

const numberLineNodes: Record<string, TalkMoveNode> = {
  turn1_position_63: {
    studentText: "I think we should go there cuz um, 63 is close to 70, so it would make sense that it would go away.",
    studentName: "Student",
    hint: "The student is reasoning about proximity on the number line but the explanation is incomplete. This is a chance to press for clarity.",
    pressureCue: 'Pressure cue: the reasoning is there but the language is fragmented. Resist the urge to complete the thought for them.',
    responseType: 'partial-idea',
    availableMoves: ['TM-T03', 'TM-T04', 'TM-T08', 'TM-T01', 'TM-T07'],
  },
  turn2_seven_apart: {
    studentText: "They should be seven apart. Like, between 63 and 70.",
    studentName: "Student",
    hint: "The student has identified a numerical relationship. Press them to explain how they know.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T08', 'TM-T05', 'TM-T06', 'TM-T09'],
  },
  turn3_faith_counting: {
    studentText: "Faith figured it out. She counted the spaces between.",
    studentName: "Student",
    hint: "A student is crediting a peer. This is a moment to bring Faith into the talk and have her explain her reasoning.",
    responseType: 'partner-report',
    availableMoves: ['TM-T07', 'TM-T04', 'TM-T05', 'TM-T08', 'TM-T12'],
  },
  turn4_faith_explains: {
    studentText: "I just counted. 63, 64, 65, 66, 67, 68, 69, 70. That's seven jumps.",
    studentName: "Faith",
    hint: "Faith has shared her method. Now the class can build on it, challenge it, or connect it to the number line placement.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T05', 'TM-T06', 'TM-T08', 'TM-T13', 'TM-T14'],
  },
  turn5_wrap_up: {
    studentText: "So the 63 should be closer to 70 than to 60 because it's only seven away from 70 but three away from... wait, that's not right.",
    studentName: "Student",
    hint: "The student is self-correcting in real time. This is a golden moment — they are revising their own thinking publicly.",
    pressureCue: 'Pressure cue: the student is catching their own error. Resist jumping in. Let the revision play out.',
    responseType: 'partial-idea',
    availableMoves: ['TM-T01', 'TM-T04', 'TM-T13', 'TM-T14', 'TM-T10'],
  },
};

const numberLineScenario: TalkMoveScenarioDefinition = {
  id: 'number-line-debate',
  title: 'The Number Line Debate',
  subtitle: 'Practice — Reasoning with Evidence',
  description:
    'Students are placing numbers on a 0–100 number line. Build talk-move chains that help them clarify, justify, and revise their reasoning about where 63 belongs.',
  recommendedOrder: 16,
  focusAreas: ['press for reasoning', 'revoicing', 'revising thinking'],
  reflectionPrompt:
    'Which moves helped students explain their counting strategy and catch their own errors?',
  recommendedMoves: ['Revoicing', 'Say More', 'Press for Reasoning', 'Revise Your Thinking'],
  startingMetrics: {
    participation: 50,
    reasoning: 45,
    ownership: 48,
  },
  passThreshold: 64,
  startNodeId: 'turn1_position_63',
  nodes: numberLineNodes,
};

// ============================================
// SCENE 2: The Math Strategy Mix-Up (Transcript 3)
// ============================================

const mathStrategyNodes: Record<string, TalkMoveNode> = {
  turn1_sarah_breaks_down: {
    studentText: "I broke the 7 down into 1 and 6. I know 4 and 6 makes 10, and 7 + 3...",
    studentName: "Sarah",
    hint: "Sarah is mid-explanation and getting tangled in her own numbers. She used the 7 already but is trying to add it again. This is a moment for a peer to gently correct.",
    pressureCue: 'Pressure cue: Sarah is confused mid-strategy. A peer correction is more powerful than a teacher fix.',
    responseType: 'misconception',
    availableMoves: ['TM-T03', 'TM-T04', 'TM-T01', 'TM-T05', 'TM-T11'],
  },
  turn2_peer_corrects: {
    studentText: "Oh, oh! You already used the 7, so you can't do 7 + 3. You can only do 3 + 1. You still have the 1 left over!",
    studentName: "Student",
    hint: "A peer has spotted the error and is offering a correction. This is productive student-to-student talk. Build on it.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T07', 'TM-T04', 'TM-T05', 'TM-T08', 'TM-T06'],
  },
  turn3_alternate_strategy: {
    studentText: "I have a different strategy. I combined the 3 and the 7 to make a 10, and I have 4 leftovers, so it makes 14.",
    studentName: "Student",
    hint: "A second strategy has emerged. Now the class can compare approaches and see that multiple paths lead to 14.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T05', 'TM-T06', 'TM-T08', 'TM-T09', 'TM-T14'],
  },
  turn4_callie_agrees: {
    studentText: "I agree because I noticed that you knew this was a 10, so you put a 10, not a 1, and got 14 instead of 4.",
    studentName: "Callie",
    hint: "Callie is articulating why the strategy works — she noticed the place-value reasoning. This is a moment to amplify her insight.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T05', 'TM-T07', 'TM-T13', 'TM-T14'],
  },
};

const mathStrategyScenario: TalkMoveScenarioDefinition = {
  id: 'math-strategy-mixup',
  title: 'The Math Strategy Mix-Up',
  subtitle: 'Practice — Comparing Strategies',
  description:
    'Students are finding different ways to make 14 using 3, 4, and 7. One student gets tangled. Build chains that let peers correct, compare strategies, and agree with reasoning.',
  recommendedOrder: 17,
  focusAreas: ['peer correction', 'adding on', 'agreeing with reasoning'],
  reflectionPrompt:
    'How did peer-to-peer correction compare to teacher-led correction? Which moves kept the student\'s dignity intact?',
  recommendedMoves: ['Revoicing', 'Add On', 'Press for Reasoning', 'Repeat'],
  startingMetrics: {
    participation: 52,
    reasoning: 48,
    ownership: 50,
  },
  passThreshold: 65,
  startNodeId: 'turn1_sarah_breaks_down',
  nodes: mathStrategyNodes,
};

// ============================================
// SCENE 3: The Heavy/Light Scale (Transcript 4)
// ============================================

const heavyLightNodes: Record<string, TalkMoveNode> = {
  turn1_mia_notices: {
    studentText: "I noticed that um... he weighs a lot and he's not light.",
    studentName: "Mia",
    hint: "Mia has an observation but is struggling to articulate it. She needs to be directed to talk to her peer Shaunie, not just to the teacher.",
    pressureCue: 'Pressure cue: Mia is looking at you. Redirect her to her peer to build student-to-student talk.',
    responseType: 'partial-idea',
    availableMoves: ['TM-T03', 'TM-T04', 'TM-T08', 'TM-T01', 'TM-T02'],
  },
  turn2_shaunie_watermelon: {
    studentText: "The watermelon — this piece here is cut. It's the light one because it's smaller.",
    studentName: "Shaunie",
    hint: "Shaunie is connecting size to weight. Press for evidence from the story or diagram they studied.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T08', 'TM-T05', 'TM-T09', 'TM-T07'],
  },
  turn3_elephant_question: {
    studentText: "Shaunie, why do you think you should put the elephant on the heavy side?",
    studentName: "Student",
    hint: "A student is now asking a peer a reasoning question directly. This is the gold standard — student-to-student uptake.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T05', 'TM-T08', 'TM-T11', 'TM-T12'],
  },
  turn4_story_evidence: {
    studentText: "Do you remember from our story? Is the piece of watermelon heavy or light? How did we know it was light in the story?",
    studentName: "Student",
    hint: "Students are now referencing the text as evidence. This is accountable talk to knowledge in action.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T05', 'TM-T07', 'TM-T08', 'TM-T14', 'TM-T10'],
  },
};

const heavyLightScenario: TalkMoveScenarioDefinition = {
  id: 'heavy-light-scale',
  title: 'The Heavy/Light Scale',
  subtitle: 'Practice — Peer-to-Peer Talk',
  description:
    'Students are sorting objects as heavy or light based on a story. Build chains that redirect talk from teacher to peer, and press for text-based evidence.',
  recommendedOrder: 12,
  focusAreas: ['peer-to-peer talk', 'evidence from text', 'redirecting to students'],
  reflectionPrompt:
    'How did you shift the talk from student-to-teacher to student-to-student? Which moves made that possible?',
  recommendedMoves: ['Turn and Talk', 'Press for Reasoning', 'Say More', 'Stay Neutral'],
  startingMetrics: {
    participation: 48,
    reasoning: 50,
    ownership: 45,
  },
  passThreshold: 63,
  startNodeId: 'turn1_mia_notices',
  nodes: heavyLightNodes,
};

// ============================================
// SCENE 4: Visualizing the Poem (Transcript 4)
// ============================================

const visualizingPoemNodes: Record<string, TalkMoveNode> = {
  turn1_lex_visualizes: {
    studentText: "I created a red hat with a red feather and a green head and then like bright yellow socks and shoes like a chocolate drop.",
    studentName: "Lex",
    hint: "Lex has produced a rich, detailed mental image from the poem. Ask what in the poem created that image — press for the connection between text and visualization.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T08', 'TM-T07', 'TM-T01', 'TM-T03'],
  },
  turn2_lex_details: {
    studentText: "I used the details from the poem. Like when it said the colors, I pictured them in my head.",
    studentName: "Lex",
    hint: "Lex is naming the strategy (using details) but could go deeper. Which specific words or phrases triggered the image?",
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T08', 'TM-T05', 'TM-T09', 'TM-T06'],
  },
  turn3_chocolate_drop: {
    studentText: "I heard you say his shoes were like a chocolate drop! I like how you used the words in the poem to help you with your visualization.",
    studentName: "Student",
    hint: "A peer is repeating and affirming Lex's specific image. This is active listening in action. Build on this moment of student-to-student uptake.",
    responseType: 'echo',
    availableMoves: ['TM-T07', 'TM-T05', 'TM-T04', 'TM-T11', 'TM-T12'],
  },
  turn4_class_shares: {
    studentText: "I saw something different. I pictured the hat but not the feather. The poem didn't say feather, did it?",
    studentName: "Student",
    hint: "A student is gently challenging the visualization by checking against the text. This is critical literacy — distinguishing what the text says from what the reader adds.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T06', 'TM-T08', 'TM-T05', 'TM-T13', 'TM-T14'],
  },
};

const visualizingPoemScenario: TalkMoveScenarioDefinition = {
  id: 'visualizing-poem',
  title: 'Visualizing the Poem',
  subtitle: 'Practice — Text-Based Imagery',
  description:
    'After listening to a poem with eyes closed, students share mental images. Build chains that connect visualization to textual evidence and invite gentle challenge.',
  recommendedOrder: 13,
  focusAreas: ['visualization', 'text evidence', 'challenging thinking'],
  reflectionPrompt:
    'How did you help students distinguish between what the text says and what they imagined? Which moves supported critical reading?',
  recommendedMoves: ['Say More', 'Press for Reasoning', 'Repeat', 'Challenge'],
  startingMetrics: {
    participation: 55,
    reasoning: 42,
    ownership: 50,
  },
  passThreshold: 63,
  startNodeId: 'turn1_lex_visualizes',
  nodes: visualizingPoemNodes,
};

// ============================================
// SCENE 5: The Forgotten Shadow (Transcript 4)
// ============================================

const forgottenShadowNodes: Record<string, TalkMoveNode> = {
  turn1_nicholas_forgets: {
    studentText: "I think I forgot what my partner said because my brain's getting messed up today.",
    studentName: "Nicholas",
    hint: "Nicholas is being honest about forgetting. This is a vulnerable moment. Model problem-solving: what can he do? He can ask his partner. This is a chance to teach the norm that we help each other, we don't yell answers.",
    pressureCue: 'Pressure cue: a student is admitting confusion publicly. Handle with care — model the norm, don\'t rescue.',
    responseType: 'partner-report',
    availableMoves: ['TM-T04', 'TM-T01', 'TM-T09', 'TM-T10', 'TM-T12'],
  },
  turn2_asks_partner: {
    studentText: "Um, what did you say again? Can you tell me?",
    studentName: "Nicholas",
    hint: "Nicholas is following the norm and asking his partner. This is exactly the behaviour you want to reinforce.",
    responseType: 'partner-report',
    availableMoves: ['TM-T01', 'TM-T03', 'TM-T07', 'TM-T11', 'TM-T10'],
  },
  turn3_alisia_explains: {
    studentText: "When there is light, and something gets in front of it, it causes the shadow.",
    studentName: "Alisia",
    hint: "Alisia has re-explained her idea. Now revoice to check understanding and press for the scientific vocabulary (object, block, etc.).",
    responseType: 'partial-idea',
    availableMoves: ['TM-T03', 'TM-T07', 'TM-T08', 'TM-T05', 'TM-T04'],
  },
  turn4_object_name: {
    studentText: "What is that object called? The thing that blocks the light?",
    studentName: "Student",
    hint: "The class is now searching for precise scientific vocabulary. This is a natural moment for an open question or learning-focused response.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T09', 'TM-T05', 'TM-T08', 'TM-T14', 'TM-T10'],
  },
};

const forgottenShadowScenario: TalkMoveScenarioDefinition = {
  id: 'forgotten-shadow',
  title: 'The Forgotten Shadow',
  subtitle: 'Practice — Partner Norms',
  description:
    'During turn-and-talks about shadows, a student forgets their partner\'s idea. Build chains that model problem-solving norms, partner re-explanation, and scientific vocabulary building.',
  recommendedOrder: 15,
  focusAreas: ['partner norms', 'problem-solving', 'scientific vocabulary'],
  reflectionPrompt:
    'How did you handle a student who forgot? Did you model the norm or rescue? Which moves kept the student\'s dignity?',
  recommendedMoves: ['Say More', 'Wait Time', 'Open Question', 'Learning Response'],
  startingMetrics: {
    participation: 50,
    reasoning: 48,
    ownership: 52,
  },
  passThreshold: 64,
  startNodeId: 'turn1_nicholas_forgets',
  nodes: forgottenShadowNodes,
};

// ============================================
// SCENE 6: The Spider Science Talk Synthesis (Transcript 1)
// ============================================

const spiderScienceNodes: Record<string, TalkMoveNode> = {
  turn1_jonathan_survive: {
    studentText: "Because those need to eat to survive.",
    studentName: "Jonathan",
    hint: "Jonathan is connecting a body part to survival function. This is the big question of the lesson. Press him to elaborate which body part and how it helps.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T08', 'TM-T03', 'TM-T01', 'TM-T07'],
  },
  turn2_sentence_starter: {
    studentText: "I agree with you Jonathan because... the spider needs its legs to catch food.",
    studentName: "Student",
    hint: "A student is using the sentence starter to agree and add reasoning. This is the norm in action. Build the chain by inviting more students to connect body parts to survival.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T05', 'TM-T06', 'TM-T08', 'TM-T09', 'TM-T11'],
  },
  turn3_arianna_main_idea: {
    studentText: "Every part of the spider's body has a job that helps it survive. The legs, the eyes, the mouth — they all do something.",
    studentName: "Arianna",
    hint: "Arianna is synthesizing the big idea. This is a moment to revoice and check if the class agrees, or to press for specific evidence about each body part.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T03', 'TM-T05', 'TM-T06', 'TM-T08', 'TM-T14'],
  },
  turn4_big_part: {
    studentText: "What is this big part here? Can someone say more about what this does?",
    studentName: "Student",
    hint: "A student is now asking the class a question about a specific body part. This is student-led inquiry. Stay neutral and let the class respond.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T05', 'TM-T08', 'TM-T11', 'TM-T12'],
  },
  turn5_synthesis: {
    studentText: "So the spinnerets make silk, the fangs inject venom, the eyes see prey — every part has a job.",
    studentName: "Student",
    hint: "The class has arrived at a full synthesis. This is the moment to reflect, review, and invite revision of earlier thinking.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T14', 'TM-T13', 'TM-T05', 'TM-T09', 'TM-T10'],
  },
};

const spiderScienceScenario: TalkMoveScenarioDefinition = {
  id: 'spider-science-synthesis',
  title: 'The Spider Science Synthesis',
  subtitle: 'Practice — Fishbowl Discussion',
  description:
    'In a fishbowl circle with a microphone, students answer: How does a spider\'s body help it survive? Build chains that use sentence starters, synthesize ideas, and reach the big conclusion.',
  recommendedOrder: 19,
  focusAreas: ['fishbowl discussion', 'sentence starters', 'synthesis'],
  reflectionPrompt:
    'How did the sentence starter "I agree with ___ because..." change the quality of student responses? Which moves led to synthesis?',
  recommendedMoves: ['Say More', 'Press for Reasoning', 'Add On', 'Reflect & Review'],
  startingMetrics: {
    participation: 55,
    reasoning: 50,
    ownership: 52,
  },
  passThreshold: 66,
  startNodeId: 'turn1_jonathan_survive',
  nodes: spiderScienceNodes,
};

// ============================================
// SCENE 7: Scaffolding the Number Hoops (Transcript 6)
// ============================================

const numberHoopsNodes: Record<string, TalkMoveNode> = {
  turn1_stuck_at_14: {
    studentText: "Fourteen... we need 17...",
    studentName: "Student",
    hint: "The student is frozen between 14 and 17 during a physical number-sequencing activity. Model your own thinking: show them how you handle being stuck by going back and counting again.",
    pressureCue: 'Pressure cue: the student is stuck in a physical activity with peers watching. Model thinking, don\'t give the answer.',
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T01', 'TM-T12', 'TM-T09', 'TM-T10'],
  },
  turn2_model_counting: {
    studentText: "I want to make sure I get my thinking right because these numbers are getting a bit bigger. Can you see how when I get a bit stuck I just go back and start counting again? One, two, three...",
    studentName: "Teacher (modeling)",
    hint: "You've modeled the strategy of restarting the count. Now invite the student to continue from where they left off.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T04', 'TM-T09', 'TM-T05', 'TM-T11', 'TM-T12'],
  },
  turn3_other_direction: {
    studentText: "Should we do it the other way? So you move the 20 here and then it goes that way?",
    studentName: "Student",
    hint: "A student is proposing a different approach. This is mathematical reasoning in action. Press them to explain why or why not.",
    responseType: 'prediction',
    availableMoves: ['TM-T08', 'TM-T06', 'TM-T05', 'TM-T09', 'TM-T04'],
  },
  turn4_checking_progress: {
    studentText: "I heard you say 14. Let me check and see how I'm going... One, two, three, four, five, six, seven. The next number I think is eight. Yep. Let's keep going.",
    studentName: "Student",
    hint: "The student is now self-monitoring and checking their progress. This is metacognition. Celebrate the strategy, not just the answer.",
    responseType: 'partial-idea',
    availableMoves: ['TM-T07', 'TM-T05', 'TM-T13', 'TM-T14', 'TM-T10'],
  },
};

const numberHoopsScenario: TalkMoveScenarioDefinition = {
  id: 'number-hoops-scaffolding',
  title: 'Scaffolding the Number Hoops',
  subtitle: 'Practice — Physical Math',
  description:
    'Outside with hoops and numbers, a student gets stuck counting past 14. Build chains that model thinking strategies, invite direction changes, and celebrate self-monitoring.',
  recommendedOrder: 18,
  focusAreas: ['modeling thinking', 'self-monitoring', 'physical math'],
  reflectionPrompt:
    'How did modeling your own stuck-ness help the student? Which moves encouraged the student to self-correct rather than wait for the answer?',
  recommendedMoves: ['Include Yourself', 'Say More', 'Open Question', 'Repeat'],
  startingMetrics: {
    participation: 52,
    reasoning: 46,
    ownership: 55,
  },
  passThreshold: 65,
  startNodeId: 'turn1_stuck_at_14',
  nodes: numberHoopsNodes,
};

// ============================================
// EXPORT ALL PRACTICE SCENARIOS
// ============================================

export const practiceScenarios: Record<string, TalkMoveScenarioDefinition> = {
  numberLine: numberLineScenario,
  mathStrategy: mathStrategyScenario,
  heavyLight: heavyLightScenario,
  visualizingPoem: visualizingPoemScenario,
  forgottenShadow: forgottenShadowScenario,
  spiderScience: spiderScienceScenario,
  numberHoops: numberHoopsScenario,
};
