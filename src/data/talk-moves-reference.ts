/**
 * Talk Moves Reference - Quick reference guide for each talk move.
 *
 * This module provides structured overview data for each talk move,
 * including what it is, why it works, when to use it, and concrete examples.
 * Designed to help teachers learn the repertoire before and during gameplay.
 */

export interface TalkMoveReference {
  id: string;
  name: string;
  shortName: string;
  category: 'non-terminal' | 'terminal';
  what: string;
  why: string;
  whenToUse: string[];
  teacherCue: string;
  classroomExample: { context: string; exchange: string };
  whatToAvoid: string;
  effectiveAfter: string[];
  comboMultiplier: number;
}

export const talkMoveReferences: TalkMoveReference[] = [
  {
    id: 'TM-T01',
    name: 'Wait Time',
    shortName: 'Wait',
    category: 'non-terminal',
    what: 'Pause after asking a question or after a student speaks. Give students 3+ seconds to organise thinking before accepting responses.',
    why: 'The average teacher-student response gap is under 1 second. Extending this pause produces longer, more thoughtful student contributions. It signals that thinking matters more than speed.',
    whenToUse: [
      'Immediately after posing a complex question',
      'After a student contributes, before moving to the next speaker',
      'When quieter students need time to gather courage',
    ],
    teacherCue: 'Take some time to think. No hands yet.',
    classroomExample: {
      context: 'Year 1 maths – presenting data',
      exchange: 'Teacher: What\'s a good way to present our survey information? Now before we answer I want you to think about this, try to think back and remember. (2-second pause.) Right, over to you. Hannah: A graph chart, colour in the squares to match the amount.',
    },
    whatToAvoid: 'Accepting the first hand that goes up immediately, filling silences yourself, or asking questions in rapid succession.',
    effectiveAfter: [],
    comboMultiplier: 1.0,
  },
  {
    id: 'TM-T02',
    name: 'Turn and Talk',
    shortName: 'Pair',
    category: 'non-terminal',
    what: 'Have students rehearse ideas in pairs before whole-class sharing. Every student talks, not just the fastest hand.',
    why: 'By handing talk time to students as "rehearsal," each gets a turn before the teacher nominates who speaks. Cold-calling after pair talk is less threatening because the student can share "we thought..." rather than risking a solo answer.',
    whenToUse: [
      'Before whole-class discussion on a complex question',
      'When you want all students to participate, not just the confident ones',
      'To bring reluctant speakers into the conversation',
    ],
    teacherCue: 'Turn and talk to your elbow partner about...',
    classroomExample: {
      context: 'Year 4 writing – expressive language',
      exchange: 'Teacher: Turn to talk to your elbow partner and come up with three or four key things writers do to make their writing interesting. (2 minutes pair talk.) Aiden: Use interesting verbs so you can really imagine it better.',
    },
    whatToAvoid: 'Letting pair talk go on so long that momentum is lost, or accepting only one pair\'s answer without sampling others.',
    effectiveAfter: ['TM-T01'],
    comboMultiplier: 1.15,
  },
  {
    id: 'TM-T03',
    name: 'Revoicing',
    shortName: 'Revoice',
    category: 'non-terminal',
    what: 'Repeat or reformulate a student\'s contribution, then ask them to verify: "So you\'re saying... Do I have that right?"',
    why: 'Clarifies meaning for the whole class, reveals misconceptions gently, and helps students link everyday language to academic vocabulary. Especially valuable for EAL learners whose ideas might otherwise be lost.',
    whenToUse: [
      'When a student\'s contribution is unclear or hard to hear',
      'When you want to amplify an important idea',
      'When a student uses informal language and you want to model precise vocabulary',
      'When a misconception needs gentle surfacing',
    ],
    teacherCue: "So you're saying... Do I have that right?",
    classroomExample: {
      context: 'Year 4 environmental science',
      exchange: 'Student: It\'s like the hot air goes up and then... Teacher: Are you saying that warm air rises and displaces the cooler air above it? Student: Yeah, exactly.',
    },
    whatToAvoid: 'Revoicing that changes the student\'s meaning, or revoicing so frequently it becomes a filter rather than a scaffold.',
    effectiveAfter: [],
    comboMultiplier: 1.0,
  },
  {
    id: 'TM-T04',
    name: 'Say More',
    shortName: 'Say More',
    category: 'terminal',
    what: 'Stay with the same student and invite them to extend, elaborate, and deepen their own thinking. "Can you say more about that?"',
    why: 'Positions the student as a thinker and theorist, not merely correct or incorrect. Three rounds of "say more" can produce rich, evidence-linked explanations from students who began with brief statements.',
    whenToUse: [
      'When a student gives a brief response containing an interesting idea',
      'When you want to model that extended thinking is expected',
      'When a student appears to have more to say but hasn\'t been given permission',
    ],
    teacherCue: 'Can you say more about that?',
    classroomExample: {
      context: 'Year 4 environmental science',
      exchange: 'Teacher: Ryan, can you say more about that? Ryan: It is important for the wildlife that there is not too much logging so the forests stay healthy. Teacher: Can you go a bit further with that idea about what sustainable means? Ryan: It\'s about helping the earth stay healthy. People can all help; it\'s the small little things that add up.',
    },
    whatToAvoid: 'Moving away from the student too quickly after their first response.',
    effectiveAfter: ['TM-T01', 'TM-T03'],
    comboMultiplier: 1.25,
  },
  {
    id: 'TM-T05',
    name: 'Add On',
    shortName: 'Add On',
    category: 'terminal',
    what: 'Open the floor to others to build on, add to, or clarify a previous contribution. "Who can build on that idea?"',
    why: 'Creates a cumulative chain where each student\'s response builds on those before, rather than each giving isolated answers. Leads students to provide evidentiary talk that deepens reasoning.',
    whenToUse: [
      'After a student has shared a substantive idea',
      'When you want to build collective understanding, not collect individual answers',
      'To bring more voices into the conversation',
    ],
    teacherCue: 'Does anyone have something to add?',
    classroomExample: {
      context: 'Year 4 environmental science – biodiversity',
      exchange: 'Teacher: Ryan provided technical information. Does anyone have something else to add? Joelle: The plants need to stay healthy to supply oxygen and food as well as shelter. Jeremy: Flora. Teacher: Anyone else have another point?',
    },
    whatToAvoid: 'Letting "add on" become a rapid-fire round of disconnected answers. Keep students building on each other.',
    effectiveAfter: ['TM-T04', 'TM-T02'],
    comboMultiplier: 1.2,
  },
  {
    id: 'TM-T06',
    name: 'Challenge',
    shortName: 'Challenge',
    category: 'terminal',
    what: 'Invite students to respectfully question, agree, or disagree with others\' ideas. "Does anyone disagree, and why?"',
    why: 'Moves students beyond information exchange into genuine intellectual engagement. Develops skills in building arguments, recognising bias, and persuading others.',
    whenToUse: [
      'When you want to deepen discussion beyond surface level',
      'When a student\'s statement is debatable',
      'When students are not engaging with each other\'s reasoning',
    ],
    teacherCue: 'Does anyone disagree, and why?',
    classroomExample: {
      context: 'Year 4 – homework debate',
      exchange: 'Teacher: Does anyone disagree with Kip\'s points? Amy: I don\'t agree – I was going to say that it helps us practise what we do at school. Teacher: Say more about that, Amy. Amy: You can get better at your maths and reading if you have extra work.',
    },
    whatToAvoid: 'Allowing disagreement to become personal. Model respectful language: "I see why you might say that, but..."',
    effectiveAfter: ['TM-T04', 'TM-T03'],
    comboMultiplier: 1.15,
  },
  {
    id: 'TM-T07',
    name: 'Repeat',
    shortName: 'Repeat',
    category: 'non-terminal',
    what: 'Ask a student to repeat or rephrase what another student said. "Can someone put that in their own words?"',
    why: 'Sets the expectation that students should listen to each other, not just wait to speak. Slows the pace when concepts are complex and adds emphasis to important ideas.',
    whenToUse: [
      'After a significant or complex student contribution',
      'When you want to check that students were actually listening',
      'To slow the lesson pace and give emphasis to an important idea',
    ],
    teacherCue: 'Can someone repeat back what they heard in their own words?',
    classroomExample: {
      context: 'Year 1 – survey data',
      exchange: 'Teacher: What did Charlie find? Can someone repeat back what he said in their own words? Jennifer: Charlie found more children in our class catch the bus to school than walk.',
    },
    whatToAvoid: 'Using "repeat" as a punishment for inattentive students. Frame it as valuing the original speaker\'s idea.',
    effectiveAfter: [],
    comboMultiplier: 1.0,
  },
  {
    id: 'TM-T08',
    name: 'Press for Reasoning',
    shortName: 'Evidence',
    category: 'terminal',
    what: 'Encourage students to justify claims with evidence. "What\'s your evidence? Why do you think that?"',
    why: 'Exposes the thinking behind an answer so the class can engage with the reasoning, not just the conclusion. Students become accountable to accurate knowledge and rigorous reasoning.',
    whenToUse: [
      'After any claim is made that could be supported with evidence',
      'When a student gives a confident but unsupported assertion',
      'To build a culture of evidence-based talk',
    ],
    teacherCue: "What's your evidence?",
    classroomExample: {
      context: 'Science investigation',
      exchange: 'Student: I think the heavier object will fall faster. Teacher: Why do you think that? What evidence do you have? Student: Because it has more mass so gravity pulls it harder? Teacher: Can you say more – does your data support that?',
    },
    whatToAvoid: 'Asking for evidence in a way that sounds like an interrogation. Keep the tone curious, not accusatory.',
    effectiveAfter: ['TM-T01', 'TM-T04'],
    comboMultiplier: 1.3,
  },
  {
    id: 'TM-T09',
    name: 'Open Question',
    shortName: 'Open Q',
    category: 'terminal',
    what: 'Ask open, exploratory questions that invite investigation and flexible, creative responses. No predetermined right answer.',
    why: 'Open questions create space for genuine inquiry beyond right/wrong. They yield multiple legitimate answers grounded in evidence, producing genuinely dialogic exchanges.',
    whenToUse: [
      'To open discussion on a complex, multi-faceted topic',
      'When you want students to reason rather than recall',
      'When the topic allows for multiple valid perspectives',
    ],
    teacherCue: 'What would change if...?',
    classroomExample: {
      context: 'History',
      exchange: 'Teacher: Why might the different historians have reached such different conclusions? Student A: Maybe they were using different sources. Student B: Or they had different political views that affected what they thought was important.',
    },
    whatToAvoid: 'Asking open questions but then steering toward your preferred answer. That defeats the purpose.',
    effectiveAfter: [],
    comboMultiplier: 1.0,
  },
  {
    id: 'TM-T10',
    name: 'Learning Response',
    shortName: 'Learning',
    category: 'terminal',
    what: 'Reflect a student\'s response back in a way that deepens thinking. Treat confusions and misconceptions as opportunities to learn more.',
    why: 'Overuse of praise creates approval-seekers rather than genuine thinkers. Learning-focused responses keep the dialogic flow going while honouring the student\'s contribution.',
    whenToUse: [
      'When a student gives a partially correct or incomplete answer',
      'When a misconception needs gentle handling',
      'To build a culture where wrong answers are safe',
    ],
    teacherCue: "That's one way of looking at it. What might someone else add?",
    classroomExample: {
      context: 'History debate',
      exchange: 'Neil: I don\'t reckon he was a good king. Teacher: Thanks Neil. Anyone else? Wendy: I don\'t agree! Teacher: Hmmm. Ayesha: Yes, but he was cruel...',
    },
    whatToAvoid: 'Staying neutral ALL the time – students still need to know when their reasoning is sound. Use specific feedback at appropriate moments.',
    effectiveAfter: ['TM-T11'],
    comboMultiplier: 1.15,
  },
  {
    id: 'TM-T11',
    name: 'Stay Neutral',
    shortName: 'Neutral',
    category: 'non-terminal',
    what: 'Deliberately avoid praise or negative judgement after a student contribution. "Thanks. Anyone else?"',
    why: 'Prevents the discussion from reverting to IRF pattern where students work for teacher approval rather than genuine reasoning. Students take the lead in moving discussion forward.',
    whenToUse: [
      'During a lively discussion where students are engaging with each other',
      'When you want students to respond to each other, not to you',
      'When exploring open questions with multiple valid answers',
    ],
    teacherCue: 'Thanks. Anyone else?',
    classroomExample: {
      context: 'History debate – 13-year-olds',
      exchange: 'Neil: I don\'t reckon he was a good king. Teacher: Thanks Neil. Anyone else? Wendy: I don\'t agree! Teacher: Hmmm. Ayesha: Yes, but he was cruel... Teacher: Interesting. Anyone else?',
    },
    whatToAvoid: 'Staying neutral all the time – students still need feedback on reasoning quality. Use learning-focused responses at appropriate moments.',
    effectiveAfter: ['TM-T06', 'TM-T05'],
    comboMultiplier: 1.2,
  },
  {
    id: 'TM-T12',
    name: 'Include Yourself',
    shortName: 'Include',
    category: 'non-terminal',
    what: 'Position yourself as a co-inquirer thinking alongside students. "I\'m wondering if... Let\'s figure this out together."',
    why: 'Alters power and status relations, encouraging a more exploratory feel to thinking. The teacher remains in charge but plays with the nature of their role within the lesson.',
    whenToUse: [
      'When you want to model genuine intellectual curiosity',
      'When the topic is genuinely open or uncertain',
      'When students are stuck and need a thinking partner, not an answer',
    ],
    teacherCue: "I'm not sure about this either – let's think it through together.",
    classroomExample: {
      context: 'General class – complex concept',
      exchange: 'Teacher: I\'m hearing some really different ideas here. Is there a way we can pull them together? I\'m wondering if they\'re actually describing different parts of the same thing... Student A: Oh, like they\'re both true but for different situations? Teacher: Maybe. What do others think?',
    },
    whatToAvoid: 'Faking uncertainty you don\'t have. Students can tell. Use this when the topic genuinely has multiple valid answers.',
    effectiveAfter: [],
    comboMultiplier: 1.0,
  },
  {
    id: 'TM-T13',
    name: 'Revise Your Thinking',
    shortName: 'Revise',
    category: 'terminal',
    what: 'Signal that it is intellectually healthy to change thinking when new information emerges. "Has anyone revised their thinking?"',
    why: 'Normalises intellectual growth and changing one\'s mind. Creates a safe space for students to publicly revise a previous position – a significant intellectual and social move.',
    whenToUse: [
      'After new information has been introduced',
      'When students have heard compelling counter-arguments',
      'To normalise intellectual growth',
    ],
    teacherCue: 'Has anyone revised their thinking? What was your ah-ha moment?',
    classroomExample: {
      context: 'After a class discussion on a controversial issue',
      exchange: 'Teacher: Has anyone revised their thinking after hearing all the perspectives? Student A: I used to think it was obviously good for the economy, but now I can see why the people who live near it might feel differently.',
    },
    whatToAvoid: 'Asking for revision before students have actually heard new perspectives. Make sure there is genuine material to reflect on.',
    effectiveAfter: ['TM-T06', 'TM-T05'],
    comboMultiplier: 1.2,
  },
  {
    id: 'TM-T14',
    name: 'Reflect & Review',
    shortName: 'Review',
    category: 'terminal',
    what: 'Synthesise and summarise the key ideas that have emerged. "Who can pull all the opinions and reasons together?"',
    why: 'Makes learning visible. Can be used at any instructional point – before, during, or after – as a formative assessment experience.',
    whenToUse: [
      'At the end of a discussion to consolidate key ideas',
      'Part-way through to check shared understanding',
      'To transition from discussion to a new task',
    ],
    teacherCue: 'Who can summarise what we have discovered?',
    classroomExample: {
      context: 'Year 3 – petition writing preparation',
      exchange: 'Teacher: Let me see – who can pull all opinions and reasons together that we discovered about the influence of pollution on the landscape? Who can summarise our discussion?',
    },
    whatToAvoid: 'Doing the summary yourself without student input. Invite students to synthesise first, then add your own recap.',
    effectiveAfter: [],
    comboMultiplier: 1.0,
  },
];

export const talkMoveReferenceMap = Object.fromEntries(
  talkMoveReferences.map((ref) => [ref.id, ref]),
);

/**
 * Returns a brief overview string for a talk move, suitable for tooltips or quick reference.
 */
export function getTalkMoveBrief(moveId: string): string {
  const ref = talkMoveReferenceMap[moveId];
  if (!ref) return '';
  return `${ref.name}: ${ref.what}`;
}

/**
 * Returns the "why it works" explanation for a talk move.
 */
export function getTalkMoveWhy(moveId: string): string {
  const ref = talkMoveReferenceMap[moveId];
  if (!ref) return '';
  return ref.why;
}
