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

  // DialogueBox
  'dialogue.context': 'Context',
  'dialogue.timePressure': 'Time pressure',
  'dialogue.noPressure': 'No extra pressure cue this turn.',
  'dialogue.responseType': 'Response type',
  'dialogue.tapForTip': 'Tap for coaching tip',
  'dialogue.speakingNow': 'Speaking now',

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

  // Language toggle
  'lang.label': 'EN',
  'lang.name': 'English',
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

  // DialogueBox
  'dialogue.context': 'Konteks',
  'dialogue.timePressure': 'Tekanan masa',
  'dialogue.noPressure': 'Tiada isyarat tekanan tambahan giliran ini.',
  'dialogue.responseType': 'Jenis respons',
  'dialogue.tapForTip': 'Ketik untuk petua',
  'dialogue.speakingNow': 'Sedang bercakap',

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

  // Language toggle
  'lang.label': 'BM',
  'lang.name': 'Bahasa Melayu',
};

export const translations: Record<Lang, Record<string, string>> = { en, ms };

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
