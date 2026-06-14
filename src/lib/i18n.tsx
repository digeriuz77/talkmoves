import { createContext, useContext, type ReactNode } from 'react';

export type Lang = 'en' | 'ms';

export const LANG_STORAGE_KEY = 'dialogic-lang';

// ============================================
// TRANSLATIONS
// ============================================

const en: Record<string, string> = {
  // Landing
  'landing.tagline': 'Dialogic Teaching Practice',
  'landing.title': 'Talk Moves',
  'landing.welcome':
    'Welcome to Talk Moves. These are short scenarios to help teachers think about dialogic practice in the classroom.',
  'landing.contact': 'For further levels, contact Gary at:',
  'landing.enter': 'Enter',

  // ModeSelect
  'mode.tagline': 'Primary Classroom Practice',
  'mode.title': 'Dialogic Classroom',
  'mode.description':
    'Practice realistic Primary classroom routines where pupils may think in Malay, answer in partial English, and still need help turning half-formed ideas into stronger talk.',
  'mode.aboutTitle': 'About This Training Build',
  'mode.aboutBody':
    "Based on research by Edwards-Groves, Chapin, O'Connor, and Alexander. These levels are designed to help teachers rehearse dialogic routines that keep English available for reasoning, even when lesson time is tight and the temptation is to take the one fast correct answer.",
  'hub.tagline': 'Choose Experience',
  'hub.title': 'What do you want to do?',
  'hub.description':
    'Choose scenario play for rehearsal, or build a custom talk-move plan for your own class context.',
  'hub.playTitle': 'Play scenarios and test knowledge',
  'hub.playBody':
    'Run classroom scenarios and practise high-leverage talk moves under pressure.',
  'hub.playCta': 'Open scenario library',
  'hub.buildTitle': 'Build my own talk moves',
  'hub.buildBody':
    'Generate a tailored dialogic scaffolding map for your question, class profile, and language context.',
  'hub.buildCta': 'Open builder',

  // GameCard
  'card.startLevel': 'Start level',
  'card.chainInfo': 'Chain responses \u00b7 Talk-move combos',
  'card.choiceInfo': 'Scenario choices \u00b7 Visible classroom consequences',
  'card.bestScore': 'Best score:',
  'card.attempts': 'Attempts:',

  // Level status
  'status.completed': 'Completed',
  'status.inProgress': 'In Progress',
  'status.new': 'New',

  // GameSessionHeader
  'header.levels': 'Levels',
  'header.about': 'About',
  'header.outcomes': 'Outcomes',
  'header.classroomOutcomes': 'Classroom outcomes',
  'header.turn': 'Turn',
  'guide.summary': 'Plan',
  'guide.title': 'Talk Move Plan',
  'guide.vocabulary': 'Key vocabulary',
  'guide.anticipated': 'Likely student answers',
  'guide.followUp': 'Follow-up path',
  'guide.bridge': 'Language bridge',

  // DialogueBox
  'dialogue.context': 'Context',
  'dialogue.timePressure': 'Time pressure',
  'dialogue.noPressure': 'No extra pressure cue this turn.',
  'dialogue.responseType': 'Response type',
  'dialogue.tapForTip': 'Tap for coaching tip',
  'dialogue.speakingNow': 'Speaking now',
  'builder.back': 'Back',
  'builder.tagline': 'Classroom-Speed Planner',
  'builder.title': 'Build My Own Talk Moves',
  'builder.questionLabel': "Teacher's question",
  'builder.questionPlaceholder':
    'Example: Why do we need to clean our tools after using them?',
  'builder.yearLevelLabel': 'Year level',
  'builder.topicLabel': 'Topic or subject',
  'builder.languageLabel': 'Most Common Class Language',
  'builder.vocabularyLabel': 'Priority vocabulary (comma separated)',
  'builder.classProfileLabel': 'Context: special things to consider',
  'builder.generate': 'Generate plan',
  'builder.generating': 'Generating...',
  'builder.modelLabel': 'Model:',
  'builder.cached': 'Cache hit',
  'builder.fresh': 'Fresh response',
  'builder.outputTitle': 'Dialogic Scaffolding Map',
  'builder.downloadTxt': 'Download .txt',
  'builder.print': 'Print',
  'builder.bridgeColumn': 'Malay/Iban Bridge',
  'builder.englishColumn': 'English Transition',
  'builder.revoiceBridge': 'Revoicing (bridge language)',
  'builder.revoiceEnglish': 'Revoicing (English)',
  'builder.reasoningMalay': 'Press reasoning (Malay)',
  'builder.reasoningEnglish': 'Press reasoning (English)',
  'builder.anticipatedAnswers': 'Anticipated answers',
  'builder.conceptGap': 'Concept gap',
  'builder.codeswitch': 'Code-switching strategy',
  'builder.targetVocab': 'Target vocabulary',
  'builder.followUpMap': 'Follow-up map',
  'builder.quickLines': 'Quick board-ready lines',
  'builder.copy': 'Copy',
  'builder.errors.questionRequired': 'Please enter a teacher question.',
  'builder.errors.generateFailed': 'Could not generate the plan. Please try again.',
  'builder.afl.title': 'Assessment for Learning',
  'builder.afl.hingeQuestion': 'Hinge Question',
  'builder.afl.diagnosticGuide': 'Diagnostic Reading Guide',
  'builder.afl.adaptiveActivities': 'Adaptive Activities',
  'builder.afl.reconvergence': 'Reconvergence Move',
  'builder.afl.gap.vocabulary': 'Vocabulary',
  'builder.afl.gap.reasoning': 'Reasoning',
  'builder.afl.gap.misconception': 'Misconception',
  'builder.afl.gap.confidence': 'Confidence',

  // Coach modes (shared)
  'coach.tabsAria': 'Coaching modes',
  'coach.tab.primer': '5-Minute Primer',
  'coach.tab.primerHint': 'Type 3-5 words, get a vocab game plus the talk bridge',
  'coach.tab.plan': 'Plan a Question',
  'coach.tab.planHint': 'Build a dialogic scaffolding map for one question',
  'coach.tab.lesson': 'Lesson Plan Coach',
  'coach.tab.lessonHint': 'Upload a plan; find EAL risk moments and fixes',
  'coach.tab.live': 'Live Coach',
  'coach.tab.liveHint': 'Stuck right now? Get a 3-step micro-adaptation',
  'coach.need.pacing': 'Pacing',
  'coach.need.control': 'Control',
  'coach.need.scaffolding': 'Language Scaffolding',
  'coach.need.mixed': 'Mixed',
  'coach.startNew': 'Start new',
  'coach.clearConfirm': 'Clear this tab? The prepped content saved here will be removed.',

  // Live Coach
  'live.observationLabel': 'What is happening in your room right now?',
  'live.observationPlaceholder':
    "e.g. 'My Year 4s are silent, the English is too hard' / 'Murid bising, tak siap aktiviti lagi' / 'Bala nembiak enda nyaut'",
  'live.observationHint': 'Write quickly in English, Malay, or Iban. Rough notes are fine.',
  'live.yearLabel': 'Year level',
  'live.subjectLabel': 'Subject',
  'live.languageLabel': 'Class home language',
  'live.coachMe': 'Coach me now',
  'live.coaching': 'Coaching...',
  'live.readBack': 'What I heard',
  'live.detectedLanguage': 'Input',
  'live.microTitle': '3-Step Micro-Adaptation',
  'live.step1Title': 'Talk move to use now',
  'live.step2Title': 'Sentence frames for pupils (board-ready)',
  'live.step3Title': 'Phrasing tip (Malay/Iban)',
  'live.sayEnglish': 'Say it in English',
  'live.sayBridge': 'Say it in Malay/Iban',
  'live.tipMalay': 'Tip in Malay',
  'live.tipIban': 'Tip in Iban',
  'live.regainFocus': 'Regain focus line',
  'live.ifItFails': 'If it falls flat',
  'live.errors.observationRequired': 'Tell me what is happening first.',
  'live.errors.failed': 'Could not get a coaching response. Please try again.',

  // 5-Minute Primer
  'primer.wordsLabel': "Today's key words (3-5, comma separated)",
  'primer.wordsPlaceholder': 'e.g. habitat, forest, shelter',
  'primer.wordsHint': 'Just the words. No lesson plan needed.',
  'primer.generate': 'Build my 5-minute primer',
  'primer.generating': 'Building primer...',
  'primer.localHook': 'Local hook (say this first)',
  'primer.pickGame': 'Pick your game',
  'primer.game.bingo': 'Vocab Bingo',
  'primer.game.flyswatter': 'Flyswatter',
  'primer.game.hotseat': 'Hot Seat',
  'primer.setupEnglish': 'Setup script (English)',
  'primer.setupBridge': 'Setup script (Malay/Iban)',
  'primer.bingoPreview': 'Bingo card preview',
  'primer.printBingo': 'Print bingo cards',
  'primer.bingoCardTitle': 'Vocab Bingo Card',
  'primer.bingoHint': 'Printing gives 4 shuffled cards so neighbours cannot copy. No printer? Pupils draw a 3x3 grid and pick 9 words from the board.',
  'primer.wordCards': 'Word cards: definitions and caller clues',
  'primer.clue': 'Caller clue',
  'primer.cognate': 'Cognate',
  'primer.transition': 'After the game: turn play into talk',
  'primer.transitionHint': 'The game is the warm-up. This move makes pupils do the reasoning, do not skip it.',
  'primer.errors.wordsRequired': 'Type at least 2 key words first.',
  'primer.errors.failed': 'Could not build the primer. Please try again.',
  'primer.viewReference': 'Caller reference',
  'primer.viewFlip': 'Flip cards',
  'primer.leadWord': 'Word first',
  'primer.leadDefinition': 'Meaning first',
  'primer.tapToFlip': 'Tap a card to flip',
  'primer.flipBack': 'Tap to flip back',
  'primer.present': 'Present',
  'primer.presentBingo': 'Show on screen',
  'primer.tapToReveal': 'Tap to reveal',
  'primer.tapToContinue': 'Tap for next',
  'primer.next': 'Next',
  'primer.prev': 'Back',
  'primer.close': 'Close',
  'primer.slideOf': '{current} / {total}',
  'primer.teachingTip': 'Now turn it into talk',
  'primer.bingoCard': 'Card {n}',

  // Lesson Plan Coach
  'lesson.pasteLabel': 'Paste your lesson plan or script',
  'lesson.pastePlaceholder': 'Paste the lesson plan, script, or notes here (any language)...',
  'lesson.uploadLabel': 'Upload PDF / text file',
  'lesson.uploadHint': 'or upload a .pdf, .txt, or .md file',
  'lesson.removeFile': 'Remove file',
  'lesson.concernLabel': 'What worries you about this lesson? (optional, any language)',
  'lesson.concernPlaceholder': "e.g. 'Takut tak sempat habis' / 'They will not speak English in group work'",
  'lesson.analyze': 'Interrogate my plan',
  'lesson.analyzing': 'Interrogating plan...',
  'lesson.outputTitle': 'EAL Risk Game Plan',
  'lesson.detectedConcern': 'Detected concern',
  'lesson.riskMoments': 'High-risk moments for EAL pupils',
  'lesson.scriptEnglish': 'Say it in English',
  'lesson.scriptBridge': 'Say it in Malay/Iban',
  'lesson.frames': 'Pupil sentence frames',
  'lesson.pacingCoach': 'Pacing coach: teacher-talk overload zones',
  'lesson.hardBreak': 'Hard break',
  'lesson.script': 'Script',
  'lesson.languageBridge': 'Language bridge',
  'lesson.cognates': 'Cognate bridge list (English \u2194 Malay)',
  'lesson.quickSheet': 'Quick-Sheet for this lesson',
  'lesson.targetQuestion': 'Target question (English)',
  'lesson.lowStakesEntry': 'Low-stakes entry (Malay/Iban)',
  'lesson.hinge': 'Instructional hinge',
  'lesson.gamePlan': 'If/then game plan',
  'lesson.ifStudentSays': 'If a pupil says',
  'lesson.agencyShift': 'Agency shift: hand the talking to pupils',
  'lesson.errors.textRequired': 'Paste your lesson plan or upload a file first.',
  'lesson.errors.fileRead': 'Could not read that file. Try pasting the text instead.',
  'lesson.errors.failed': 'Could not analyse the plan. Please try again.',

  // TalkMovesGame
  'talk.chain': 'Your chain',
  'talk.pts': 'pts',
  'talk.execute': 'Execute',
  'talk.addTerminal': 'Add a terminal move (amber) to run the chain.',
  'talk.tapToAdd': 'Talk moves \u2014 tap to add',
  'talk.endChain': 'End chain',
  'talk.add': 'Add',
  'talk.combo': 'Combo!',

  // CoachingStrip
  'coaching.programResponse': 'Program response',
  'coaching.dismiss': 'Dismiss',

  // Hints
  'hint.pedagogical': 'Pedagogical hint',
  'hint.hide': 'Hide hint',
  'hint.openTip': 'Open for tip',

  // Response types
  'response.partialIdea': 'Partial Idea',
  'response.partialIdea.coaching':
    'There is real thinking here. Revoice it, add precision, and keep the pupil in the conversation.',
  'response.echo': 'Echo',
  'response.echo.coaching':
    'The pupil is repeating language already in the room. Press for what they mean or ask someone to build on it.',
  'response.misconception': 'Misconception',
  'response.misconception.coaching':
    'The pupil is making visible a flawed idea. Surface the reasoning, then let the class test and revise it.',
  'response.partnerReport': 'Partner Report',
  'response.partnerReport.coaching':
    'This is a low-risk entry into whole-class talk. Use it to widen participation before asking for personal elaboration.',
  'response.prediction': 'Prediction',
  'response.prediction.coaching':
    'A prediction opens inquiry. Stay with the why so pupils connect it to evidence instead of guessing quickly.',
  'response.emergentLanguage': 'Emergent Language',
  'response.emergentLanguage.coaching':
    'The thinking may be ahead of the English. Build from the idea first, then strengthen the language around it.',

  // Dynamic advice (short, teacher-friendly English)
  'advice.lowParticipation':
    'Too few pupils joined the talk. Use pair talk, wait time, or a wider mix of voices.',
  'advice.lowReasoning':
    'The class needed more "why" and "how" before settling on an answer.',
  'advice.lowOwnership':
    'You carried too much of the talk. Let pupils explain more in their own words.',
  'advice.partialIdeas':
    'You heard several half-formed ideas. Stay with them and help pupils build them.',
  'advice.misconceptions':
    'A wrong idea came up. Ask for the thinking first, then let the class test it.',
  'advice.echoes':
    'Some answers only repeated teacher or peer words. Ask, "What do you mean?" or "Who can add a new idea?"',
  'advice.emergentLang':
    'Some pupils had the idea before the English. Keep the idea alive first, then support the English.',

  // EndScreen (legacy titles kept for compatibility; primary copy is run-specific reflection)
  'end.discussionOpened': 'Discussion Opened Up',
  'end.keepRehearsing': 'Keep Rehearsing the Routine',
  'end.winDescription':
    'You created a more dialogic version of "{title}" by widening participation and protecting student thinking, even before pupils could say everything cleanly in English.',
  'end.lossDescription':
    'This run shows how quickly discussion can collapse back into answer-hunting when time pressure and teacher anxiety take over. "{title}" is designed to be replayed so those trade-offs feel real.',
  'end.score': 'Score',
  'end.goal': 'Goal',
  'end.metricParticipation': 'Who joined',
  'end.metricReasoning': 'How ideas grew',
  'end.metricOwnership': 'Who did the thinking',
  'end.whatWorked': 'What Worked',
  'end.watchOut': 'Watch Out',
  'end.tryNext': 'Try Next',
  'end.replayEvidence': 'Replay Evidence',
  'end.trainerDebrief': 'Trainer Debrief',
  'end.compositeOutcome': 'Composite outcome',
  'end.teachingStyle': 'Teaching Style',
  'end.talkMoveProfile': 'Talk Move Profile',
  'end.movePattern': 'Move Pattern',
  'end.noMoves': 'No moves recorded.',
  'end.reflectionPrompt': 'Reflection Prompt',
  'end.tryAgain': 'Try Again',
  'end.backToLevels': 'Back to Levels',

  // End-of-run reflection (dynamic summary; follows UI language)
  'reflection.headline.win.participation': 'More pupils joined.',
  'reflection.headline.win.reasoning': 'Ideas got stronger.',
  'reflection.headline.win.ownership': 'Pupils carried more of the thinking.',
  'reflection.headline.close': 'You were close.',
  'reflection.headline.loss.participation': 'More pupils needed to join.',
  'reflection.headline.loss.reasoning': 'Ideas needed more time.',
  'reflection.headline.loss.ownership': 'Pupils needed more room to think.',
  'reflection.summary.win': 'You reached the goal for "{title}" with a score of {score}%.',
  'reflection.summary.loss': 'You got {score}%. The goal for "{title}" is {goal}%.',
  'reflection.strength.participation':
    'You widened the talk and brought in more than one voice.',
  'reflection.strength.reasoning':
    'You kept the class on the thinking by staying with "why" and "how", not just the answer.',
  'reflection.strength.ownership': 'You let pupils carry more of the explanation themselves.',
  'reflection.strength.default': 'You kept the discussion moving.',
  'reflection.risk.participation': 'Too much of the talk stayed with a small number of pupils.',
  'reflection.risk.reasoning': 'The talk needed more "why" and "how" before the answer.',
  'reflection.risk.ownership': 'The teacher voice was still doing too much of the work.',
  'reflection.risk.default': 'The discussion closed too quickly.',
  'reflection.next.participation.open':
    'Next run, use pair talk or invite one more pupil in before moving on.',
  'reflection.next.participation.closed':
    'Next run, add one more participation move before you close the turn.',
  'reflection.next.reasoning':
    'Next run, ask one more "Why?" or "What makes you think that?" before moving on.',
  'reflection.next.ownership.open':
    'Next run, revoice briefly, then give the explanation back to the pupil.',
  'reflection.next.ownership.closed':
    'Next run, add one more pupil-owned move before you close the turn.',
  'reflection.next.default.open': 'Next run, stay with the pupil idea a little longer.',
  'reflection.next.default.closed': 'Next run, add one more talk move before you close the turn.',
  'reflection.evidence.topMove': 'You used {move} more than any other move.',
  'reflection.evidence.variety.good': 'You used a good mix of talk moves.',
  'reflection.evidence.variety.narrow': 'You leaned on the same move pattern a lot.',
  'reflection.evidence.signal.participation': 'The room opened up to more voices.',
  'reflection.evidence.signal.reasoning': 'Pupils had more space to explain their thinking.',
  'reflection.evidence.signal.ownership': 'Pupils carried more of the explanation themselves.',
  'reflection.languageNote':
    'When pupils start in {language} or partial English, keep the idea first. Then help them say it in simple English.',

  // Language toggle
  'lang.label': 'EN',
  'lang.name': 'English',
  'lang.segmentEn': 'English',
  'lang.segmentMs': 'Bahasa Melayu',
  'lang.aria': 'Interface language — choose English or Bahasa Melayu',

  // Talk-moves layout
  'talk.studentTurn': 'Student turn',
  'talk.turnSummary': 'How your chain played out',
  'talk.continue': 'Continue',
  'talk.scoreAfterTurn': 'Score after this turn: {score}%',
  'talk.movePurpose': 'Purpose',
  'talk.moveTip': 'Research note',
  'talk.continueHint': 'Or press Enter',
};

const ms: Record<string, string> = {
  // Landing
  'landing.tagline': 'Amalan Pengajaran Dialogik',
  'landing.title': 'Langkah Perbincangan',
  'landing.welcome':
    'Selamat datang ke Langkah Perbincangan. Ini ialah senario ringkas untuk membantu guru berfikir tentang amalan dialogik di dalam bilik kelas.',
  'landing.contact': 'Untuk tahap seterusnya, hubungi Gary di:',
  'landing.enter': 'Masuk',

  // ModeSelect
  'mode.tagline': 'Amalan Bilik Kelas Rendah',
  'mode.title': 'Bilik Kelas Dialogik',
  'mode.description':
    'Latih rutin bilik kelas Rendah yang realistik di mana pelajar mungkin berfikir dalam BM, menjawab dalam Inggeris separa, dan masih memerlukan bantuan mengubah idea separa bentuk kepada perbincangan yang lebih mantap.',
  'mode.aboutTitle': 'Tentang Binaan Latihan Ini',
  'mode.aboutBody':
    "Berdasarkan penyelidikan oleh Edwards-Groves, Chapin, O'Connor, dan Alexander. Tahap-tahap ini direka untuk membantu guru melatih rutin dialogik yang mengekalkan Inggeris tersedia untuk penaakulan, walaupun masa pengajaran terhad dan godaan untuk mengambil satu jawapan pantas yang betul.",
  'hub.tagline': 'Pilih Pengalaman',
  'hub.title': 'Apa yang anda mahu buat?',
  'hub.description':
    'Pilih permainan senario untuk latihan, atau bina pelan langkah perbincangan tersuai ikut konteks kelas anda.',
  'hub.playTitle': 'Main senario dan uji pengetahuan',
  'hub.playBody':
    'Jalankan senario bilik kelas dan latih langkah perbincangan berimpak tinggi di bawah tekanan.',
  'hub.playCta': 'Buka senarai senario',
  'hub.buildTitle': 'Bina langkah perbincangan saya',
  'hub.buildBody':
    'Jana peta sokongan dialogik tersuai untuk soalan, profil kelas, dan konteks bahasa anda.',
  'hub.buildCta': 'Buka pembina',

  // GameCard
  'card.startLevel': 'Mula tahap',
  'card.chainInfo': 'Rantaian respons \u00b7 Gabungan langkah perbincangan',
  'card.choiceInfo': 'Pilihan senario \u00b7 Akibat bilik kelas yang nyata',
  'card.bestScore': 'Markah terbaik:',
  'card.attempts': 'Percubaan:',

  // Level status
  'status.completed': 'Selesai',
  'status.inProgress': 'Sedang Berjalan',
  'status.new': 'Baru',

  // GameSessionHeader
  'header.levels': 'Tahap',
  'header.about': 'Tentang',
  'header.outcomes': 'Hasil',
  'header.classroomOutcomes': 'Hasil bilik kelas',
  'header.turn': 'Giliran',
  'guide.summary': 'Pelan',
  'guide.title': 'Pelan Langkah Perbincangan',
  'guide.vocabulary': 'Kosa kata utama',
  'guide.anticipated': 'Jangkaan jawapan pelajar',
  'guide.followUp': 'Laluan soalan susulan',
  'guide.bridge': 'Jambatan bahasa',

  // DialogueBox
  'dialogue.context': 'Konteks',
  'dialogue.timePressure': 'Tekanan masa',
  'dialogue.noPressure': 'Tiada isyarat tekanan tambahan giliran ini.',
  'dialogue.responseType': 'Jenis respons',
  'dialogue.tapForTip': 'Ketik untuk petua',
  'dialogue.speakingNow': 'Sedang bercakap',
  'builder.back': 'Kembali',
  'builder.tagline': 'Perancang Pantas Kelas',
  'builder.title': 'Bina Langkah Perbincangan Saya',
  'builder.questionLabel': 'Soalan guru',
  'builder.questionPlaceholder':
    'Contoh: Kenapa kita perlu membersihkan alat selepas menggunakannya?',
  'builder.yearLevelLabel': 'Tahap tahun',
  'builder.topicLabel': 'Topik atau subjek',
  'builder.languageLabel': 'Bahasa kelas paling biasa',
  'builder.vocabularyLabel': 'Kosa kata keutamaan (dipisah koma)',
  'builder.classProfileLabel': 'Konteks: perkara khas untuk dipertimbangkan',
  'builder.generate': 'Jana pelan',
  'builder.generating': 'Menjana...',
  'builder.modelLabel': 'Model:',
  'builder.cached': 'Dari cache',
  'builder.fresh': 'Respons baharu',
  'builder.outputTitle': 'Peta Sokongan Dialogik',
  'builder.downloadTxt': 'Muat turun .txt',
  'builder.print': 'Cetak',
  'builder.bridgeColumn': 'Jambatan BM/Iban',
  'builder.englishColumn': 'Peralihan Inggeris',
  'builder.revoiceBridge': 'Revoicing (bahasa jambatan)',
  'builder.revoiceEnglish': 'Revoicing (Inggeris)',
  'builder.reasoningMalay': 'Tekan penaakulan (BM)',
  'builder.reasoningEnglish': 'Tekan penaakulan (Inggeris)',
  'builder.anticipatedAnswers': 'Jangkaan jawapan',
  'builder.conceptGap': 'Jurang konsep',
  'builder.codeswitch': 'Strategi tukar kod',
  'builder.targetVocab': 'Kosa kata sasaran',
  'builder.followUpMap': 'Peta soalan susulan',
  'builder.quickLines': 'Ayat ringkas untuk papan',
  'builder.copy': 'Salin',
  'builder.errors.questionRequired': 'Sila isi soalan guru.',
  'builder.errors.generateFailed': 'Pelan tidak dapat dijana. Sila cuba lagi.',
  'builder.afl.title': 'Penilaian untuk Pembelajaran',
  'builder.afl.hingeQuestion': 'Soalan Engsel',
  'builder.afl.diagnosticGuide': 'Panduan Bacaan Diagnostik',
  'builder.afl.adaptiveActivities': 'Aktiviti Adaptif',
  'builder.afl.reconvergence': 'Langkah Penyatuan Semula',
  'builder.afl.gap.vocabulary': 'Kosa Kata',
  'builder.afl.gap.reasoning': 'Penaakulan',
  'builder.afl.gap.misconception': 'Salah Faham',
  'builder.afl.gap.confidence': 'Keyakinan',

  // Coach modes (shared)
  'coach.tabsAria': 'Mod bimbingan',
  'coach.tab.primer': 'Pemula 5 Minit',
  'coach.tab.primerHint': 'Taip 3-5 perkataan, dapatkan permainan kosa kata dan jambatan perbincangan',
  'coach.tab.plan': 'Rancang Soalan',
  'coach.tab.planHint': 'Bina peta sokongan dialogik untuk satu soalan',
  'coach.tab.lesson': 'Jurulatih Rancangan Pengajaran',
  'coach.tab.lessonHint': 'Muat naik rancangan; kenal pasti momen risiko EAL dan penyelesaiannya',
  'coach.tab.live': 'Jurulatih Langsung',
  'coach.tab.liveHint': 'Buntu sekarang? Dapatkan adaptasi mikro 3 langkah',
  'coach.need.pacing': 'Pemasaan',
  'coach.need.control': 'Kawalan',
  'coach.need.scaffolding': 'Sokongan Bahasa',
  'coach.need.mixed': 'Campuran',
  'coach.startNew': 'Mula baharu',
  'coach.clearConfirm': 'Kosongkan tab ini? Kandungan persediaan yang disimpan di sini akan dibuang.',

  // Live Coach
  'live.observationLabel': 'Apa yang sedang berlaku dalam kelas anda sekarang?',
  'live.observationPlaceholder':
    "cth. 'Murid Tahun 4 saya senyap, BI terlalu susah' / 'Murid bising, tak siap aktiviti lagi' / 'Bala nembiak enda nyaut'",
  'live.observationHint': 'Tulis cepat dalam BI, BM, atau Iban. Nota kasar pun boleh.',
  'live.yearLabel': 'Tahap tahun',
  'live.subjectLabel': 'Subjek',
  'live.languageLabel': 'Bahasa ibunda kelas',
  'live.coachMe': 'Bimbing saya sekarang',
  'live.coaching': 'Sedang membimbing...',
  'live.readBack': 'Apa yang saya faham',
  'live.detectedLanguage': 'Input',
  'live.microTitle': 'Adaptasi Mikro 3 Langkah',
  'live.step1Title': 'Langkah perbincangan untuk digunakan sekarang',
  'live.step2Title': 'Bingkai ayat untuk murid (sedia untuk papan)',
  'live.step3Title': 'Tip frasa (BM/Iban)',
  'live.sayEnglish': 'Sebut dalam BI',
  'live.sayBridge': 'Sebut dalam BM/Iban',
  'live.tipMalay': 'Tip dalam BM',
  'live.tipIban': 'Tip dalam Iban',
  'live.regainFocus': 'Ayat menarik semula fokus',
  'live.ifItFails': 'Jika tidak berkesan',
  'live.errors.observationRequired': 'Beritahu dahulu apa yang sedang berlaku.',
  'live.errors.failed': 'Respons bimbingan tidak dapat dijana. Sila cuba lagi.',

  // 5-Minute Primer
  'primer.wordsLabel': 'Perkataan utama hari ini (3-5, dipisah koma)',
  'primer.wordsPlaceholder': 'cth. habitat, hutan, tempat perlindungan',
  'primer.wordsHint': 'Perkataan sahaja. Tiada rancangan pengajaran diperlukan.',
  'primer.generate': 'Bina pemula 5 minit saya',
  'primer.generating': 'Membina pemula...',
  'primer.localHook': 'Cangkuk tempatan (sebut ini dahulu)',
  'primer.pickGame': 'Pilih permainan anda',
  'primer.game.bingo': 'Bingo Kosa Kata',
  'primer.game.flyswatter': 'Pemukul Lalat',
  'primer.game.hotseat': 'Kerusi Panas',
  'primer.setupEnglish': 'Skrip persediaan (BI)',
  'primer.setupBridge': 'Skrip persediaan (BM/Iban)',
  'primer.bingoPreview': 'Pratonton kad bingo',
  'primer.printBingo': 'Cetak kad bingo',
  'primer.bingoCardTitle': 'Kad Bingo Kosa Kata',
  'primer.bingoHint': 'Cetakan memberi 4 kad rawak supaya jiran tidak meniru. Tiada pencetak? Murid lukis grid 3x3 dan pilih 9 perkataan dari papan.',
  'primer.wordCards': 'Kad perkataan: definisi dan klu pemanggil',
  'primer.clue': 'Klu pemanggil',
  'primer.cognate': 'Kata seasal',
  'primer.transition': 'Selepas permainan: ubah main kepada perbincangan',
  'primer.transitionHint': 'Permainan hanyalah pemanas badan. Langkah ini membuat murid menaakul, jangan langkau.',
  'primer.errors.wordsRequired': 'Taip sekurang-kurangnya 2 perkataan utama dahulu.',
  'primer.errors.failed': 'Pemula tidak dapat dibina. Sila cuba lagi.',
  'primer.viewReference': 'Rujukan pemanggil',
  'primer.viewFlip': 'Kad selak',
  'primer.leadWord': 'Perkataan dahulu',
  'primer.leadDefinition': 'Makna dahulu',
  'primer.tapToFlip': 'Ketik kad untuk menyelak',
  'primer.flipBack': 'Ketik untuk selak semula',
  'primer.present': 'Persembah',
  'primer.presentBingo': 'Papar pada skrin',
  'primer.tapToReveal': 'Ketik untuk dedah',
  'primer.tapToContinue': 'Ketik untuk seterusnya',
  'primer.next': 'Seterusnya',
  'primer.prev': 'Kembali',
  'primer.close': 'Tutup',
  'primer.slideOf': '{current} / {total}',
  'primer.teachingTip': 'Kini ubah kepada perbincangan',
  'primer.bingoCard': 'Kad {n}',

  // Lesson Plan Coach
  'lesson.pasteLabel': 'Tampal rancangan pengajaran atau skrip anda',
  'lesson.pastePlaceholder': 'Tampal rancangan pengajaran, skrip, atau nota di sini (apa-apa bahasa)...',
  'lesson.uploadLabel': 'Muat naik fail PDF / teks',
  'lesson.uploadHint': 'atau muat naik fail .pdf, .txt, atau .md',
  'lesson.removeFile': 'Buang fail',
  'lesson.concernLabel': 'Apa yang merisaukan anda tentang pelajaran ini? (pilihan, apa-apa bahasa)',
  'lesson.concernPlaceholder': "cth. 'Takut tak sempat habis' / 'Murid tidak mahu bercakap BI dalam kerja kumpulan'",
  'lesson.analyze': 'Siasat rancangan saya',
  'lesson.analyzing': 'Menyiasat rancangan...',
  'lesson.outputTitle': 'Pelan Tindakan Risiko EAL',
  'lesson.detectedConcern': 'Kebimbangan dikesan',
  'lesson.riskMoments': 'Momen berisiko tinggi untuk murid EAL',
  'lesson.scriptEnglish': 'Sebut dalam BI',
  'lesson.scriptBridge': 'Sebut dalam BM/Iban',
  'lesson.frames': 'Bingkai ayat murid',
  'lesson.pacingCoach': 'Jurulatih pemasaan: zon lebihan cakap guru',
  'lesson.hardBreak': 'Hentian wajib',
  'lesson.script': 'Skrip',
  'lesson.languageBridge': 'Jambatan bahasa',
  'lesson.cognates': 'Senarai kata seasal (BI \u2194 BM)',
  'lesson.quickSheet': 'Helaian Pantas untuk pelajaran ini',
  'lesson.targetQuestion': 'Soalan sasaran (BI)',
  'lesson.lowStakesEntry': 'Permulaan santai (BM/Iban)',
  'lesson.hinge': 'Soalan engsel pengajaran',
  'lesson.gamePlan': 'Pelan tindakan jika/maka',
  'lesson.ifStudentSays': 'Jika murid berkata',
  'lesson.agencyShift': 'Anjakan agensi: serahkan percakapan kepada murid',
  'lesson.errors.textRequired': 'Tampal rancangan pengajaran atau muat naik fail dahulu.',
  'lesson.errors.fileRead': 'Fail itu tidak dapat dibaca. Cuba tampal teksnya.',
  'lesson.errors.failed': 'Rancangan tidak dapat dianalisis. Sila cuba lagi.',

  // TalkMovesGame
  'talk.chain': 'Rantaian anda',
  'talk.pts': 'mata',
  'talk.execute': 'Laksana',
  'talk.addTerminal': 'Tambah langkah terminal (amber) untuk jalankan rantaian.',
  'talk.tapToAdd': 'Langkah perbincangan \u2014 ketik untuk tambah',
  'talk.endChain': 'Tamat rantaian',
  'talk.add': 'Tambah',
  'talk.combo': 'Gabungan!',

  // CoachingStrip
  'coaching.programResponse': 'Respons program',
  'coaching.dismiss': 'Tutup',

  // Hints
  'hint.pedagogical': 'Petua pedagogi',
  'hint.hide': 'Sembunyi petua',
  'hint.openTip': 'Ketik untuk petua',

  // Response types
  'response.partialIdea': 'Idea Separa',
  'response.partialIdea.coaching':
    'Ada pemikiran sebenar di sini. Suarakan semula, tambah ketepatan, dan kekalkan pelajar dalam perbualan.',
  'response.echo': 'Gema',
  'response.echo.coaching':
    'Pelajar mengulang bahasa yang sudah ada dalam bilik kelas. Tekan untuk apa yang dimaksudkan atau minta seseorang membina atasnya.',
  'response.misconception': 'Salah Faham',
  'response.misconception.coaching':
    'Pelajar menampakkan idea yang salah. Ketengahkan penaakulan, biarkan kelas menguji dan menyemak semula idea itu.',
  'response.partnerReport': 'Laporan Rakan',
  'response.partnerReport.coaching':
    'Ini penyertaan risiko rendah ke perbincangan kelas. Gunakannya untuk meluaskan penyertaan sebelum meminta huraian peribadi.',
  'response.prediction': 'Ramalan',
  'response.prediction.coaching':
    'Ramalan membuka inkuiri. Kekal dengan mengapa supaya pelajar menghubungkannya dengan bukti, bukan meneka cepat.',
  'response.emergentLanguage': 'Bahasa Muncul',
  'response.emergentLanguage.coaching':
    'Pemikiran mungkin mendahului Inggeris. Bina dari idea dahulu, kemudian perkukuh bahasa di sekelilingnya.',

  // Dynamic advice (ringkas, mesra guru)
  'advice.lowParticipation':
    'Kurang pelajar menyertai perbincangan. Gunakan perbualan berpasangan, masa menunggu, atau campuran suara.',
  'advice.lowReasoning':
    'Kelas memerlukan lebih "mengapa" dan "bagaimana" sebelum jawapan akhir.',
  'advice.lowOwnership':
    'Anda membawa terlalu banyak bercakap. Biar pelajar terapkan sendiri dalam perkataan mereka.',
  'advice.partialIdeas':
    'Anda dengar beberapa idea separa. Kekal dengan idea itu dan bantu pelajar membina.',
  'advice.misconceptions':
    'Idea yang kurang tepat muncul. Tanya pemikiran dahulu, kemudian biar kelas menguji.',
  'advice.echoes':
    'Sesetengah jawapan hanya mengulang perkataan guru atau rakan. Tanya "Apa maksud kamu?" atau "Siapa boleh tambah idea baru?"',
  'advice.emergentLang':
    'Sesetengah pelajar ada idea dahulu sebelum Inggeris. Kekalkan idea dahulu, kemudian bantu Inggeris.',

  // EndScreen
  'end.discussionOpened': 'Perbincangan Terbuka',
  'end.keepRehearsing': 'Teruskan Berlatih Rutin',
  'end.winDescription':
    'Anda mencipta versi lebih dialogik "{title}" dengan meluaskan penyertaan dan melindungi pemikiran pelajar, walaupun sebelum pelajar boleh menyatakan semuanya dengan jelas dalam Inggeris.',
  'end.lossDescription':
    'Percubaan ini menunjukkan betapa cepatnya perbincangan runtuh kembali kepada pemburuan jawapan apabila tekanan masa dan kebimbangan guru mengambil alih. "{title}" direka untuk dimainkan semula supaya pertukaran itu terasa nyata.',
  'end.score': 'Markah',
  'end.goal': 'Sasaran',
  'end.metricParticipation': 'Siapa menyertai',
  'end.metricReasoning': 'Bagaimana idea berkembang',
  'end.metricOwnership': 'Siapa berfikir',
  'end.whatWorked': 'Apa yang berjaya',
  'end.watchOut': 'Berhati-hati',
  'end.tryNext': 'Cuba seterusnya',
  'end.replayEvidence': 'Bukti main semula',
  'end.trainerDebrief': 'Debrief jurulatih',
  'end.compositeOutcome': 'Hasil komposit',
  'end.teachingStyle': 'Gaya Pengajaran',
  'end.talkMoveProfile': 'Profil Langkah Perbincangan',
  'end.movePattern': 'Corak Langkah',
  'end.noMoves': 'Tiada langkah direkodkan.',
  'end.reflectionPrompt': 'Soalan Refleksi',
  'end.tryAgain': 'Cuba Lagi',
  'end.backToLevels': 'Kembali ke Tahap',

  // Refleksi akhir permainan (ikut bahasa UI)
  'reflection.headline.win.participation': 'Lebih ramai pelajar menyertai.',
  'reflection.headline.win.reasoning': 'Idea menjadi lebih kukuh.',
  'reflection.headline.win.ownership': 'Pelajar membawa lebih banyak pemikiran.',
  'reflection.headline.close': 'Anda hampir mencapai sasaran.',
  'reflection.headline.loss.participation': 'Lebih ramai pelajar perlu menyertai.',
  'reflection.headline.loss.reasoning': 'Idea memerlukan lebih masa.',
  'reflection.headline.loss.ownership': 'Pelajar memerlukan lebih ruang untuk berfikir.',
  'reflection.summary.win': 'Anda mencapai sasaran untuk "{title}" dengan markah {score}%.',
  'reflection.summary.loss': 'Anda mendapat {score}%. Sasaran untuk "{title}" ialah {goal}%.',
  'reflection.strength.participation':
    'Anda meluaskan perbincangan dan membawa lebih daripada satu suara.',
  'reflection.strength.reasoning':
    'Anda mengekalkan kelas pada pemikiran dengan "mengapa" dan "bagaimana", bukan hanya jawapan.',
  'reflection.strength.ownership': 'Anda membiarkan pelajar membawa lebih banyak penerangan sendiri.',
  'reflection.strength.default': 'Anda mengekalkan perbincangan berjalan.',
  'reflection.risk.participation':
    'Terlalu banyak perbincangan terpusu pada bilangan pelajar yang kecil.',
  'reflection.risk.reasoning':
    'Perbincangan memerlukan lebih "mengapa" dan "bagaimana" sebelum jawapan.',
  'reflection.risk.ownership': 'Suara guru masih membawa terlalu banyak tugas.',
  'reflection.risk.default': 'Perbincangan ditutup terlalu cepat.',
  'reflection.next.participation.open':
    'Percubaan seterusnya, gunakan perbualan berpasangan atau jemput satu pelajar lagi sebelum teruskan.',
  'reflection.next.participation.closed':
    'Percubaan seterusnya, tambah satu langkah penyertaan lagi sebelum menutup giliran.',
  'reflection.next.reasoning':
    'Percubaan seterusnya, tanya sekali lagi "Mengapa?" atau "Apa yang buat kamu fikir begitu?" sebelum teruskan.',
  'reflection.next.ownership.open':
    'Percubaan seterusnya, suarakan semula secara ringkas, kemudian pulangkan penerangan kepada pelajar.',
  'reflection.next.ownership.closed':
    'Percubaan seterusnya, tambah satu langkah pemilikan pelajar lagi sebelum menutup giliran.',
  'reflection.next.default.open':
    'Percubaan seterusnya, kekal sedikit lebih lama dengan idea pelajar.',
  'reflection.next.default.closed':
    'Percubaan seterusnya, tambah satu langkah perbincangan lagi sebelum menutup giliran.',
  'reflection.evidence.topMove': 'Anda menggunakan {move} lebih kerap daripada langkah lain.',
  'reflection.evidence.variety.good': 'Anda menggunakan campuran langkah perbincangan yang baik.',
  'reflection.evidence.variety.narrow': 'Anda banyak merujuk corak langkah yang sama.',
  'reflection.evidence.signal.participation': 'Bilik terbuka kepada lebih ramai suara.',
  'reflection.evidence.signal.reasoning': 'Pelajar mempunyai lebih ruang untuk menerangkan pemikiran.',
  'reflection.evidence.signal.ownership': 'Pelajar membawa lebih banyak penerangan mereka sendiri.',
  'reflection.languageNote':
    'Apabila pelajar mula dalam {language} atau Inggeris separa, kekalkan idea dahulu. Kemudian bantu mereka menyatakannya dalam Inggeris mudah.',

  // Language toggle
  'lang.label': 'BM',
  'lang.name': 'Bahasa Melayu',
  'lang.segmentEn': 'English',
  'lang.segmentMs': 'Bahasa Melayu',
  'lang.aria': 'Bahasa paparan — pilih English atau Bahasa Melayu',

  // Talk-moves layout
  'talk.studentTurn': 'Giliran pelajar',
  'talk.turnSummary': 'Bagaimana rantaian anda berjalan',
  'talk.continue': 'Teruskan',
  'talk.scoreAfterTurn': 'Markah selepas giliran ini: {score}%',
  'talk.movePurpose': 'Tujuan',
  'talk.moveTip': 'Nota penyelidikan',
  'talk.continueHint': 'Atau tekan Enter',
};

export const translations: Record<Lang, Record<string, string>> = { en, ms };

/** Static copy without React context (e.g. reflection builder, tests). */
export function translate(lang: Lang, key: string, params?: Record<string, string>): string {
  let str = translations[lang][key] ?? translations.en[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) {
      str = str.split(`{${k}}`).join(params[k]);
    }
  }
  return str;
}

// ============================================
// CONTEXT
// ============================================

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string>) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({
  lang,
  setLang,
  children,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  children: ReactNode;
}) {
  const t = (key: string, params?: Record<string, string>): string => {
    let str = translations[lang][key] ?? translations.en[key] ?? key;
    if (params) {
      for (const k of Object.keys(params)) {
        str = str.replace(`{${k}}`, params[k]);
      }
    }
    return str;
  };

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}

// ============================================
// HELPERS
// ============================================

export function getInitialLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'ms' || stored === 'en') return stored;
  } catch {
    // ignore
  }
  return 'en';
}

export function persistLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function setDocumentLang(lang: Lang): void {
  document.documentElement.lang = lang === 'ms' ? 'ms' : 'en';
}
