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

  // Dynamic advice
  'advice.lowParticipation':
    'Too much of the room stayed peripheral. Use more no-hands-up routines, pair rehearsal, and targeted invitations after talk time.',
  'advice.lowReasoning':
    'The discussion needed more development moves. Ask for why, evidence, comparison, or revision before settling on an answer.',
  'advice.lowOwnership':
    'Teacher control stayed high. Let pupils carry more of the explanation publicly, even when the English is still rough.',
  'advice.partialIdeas':
    'You saw several partial ideas. In this classroom context, those are the moments to extend, revoice, and connect rather than replace.',
  'advice.misconceptions':
    'Misconceptions surfaced. Keep pressing for why pupils think that, then use the class to test and revise the idea.',
  'advice.echoes':
    'Several responses echoed teacher or peer language. Follow up with "What do you mean?" or "Who can add a new reason?" so talk does not stay superficial.',
  'advice.emergentLang':
    'Some pupils had the thinking before they had the English. Revoice strategically and use stems so language support does not become teacher takeover.',

  // EndScreen
  'end.discussionOpened': 'Discussion Opened Up',
  'end.keepRehearsing': 'Keep Rehearsing the Routine',
  'end.winDescription':
    'You created a more dialogic version of "{title}" by widening participation and protecting student thinking, even before pupils could say everything cleanly in English.',
  'end.lossDescription':
    'This run shows how quickly discussion can collapse back into answer-hunting when time pressure and teacher anxiety take over. "{title}" is designed to be replayed so those trade-offs feel real.',
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
    'Selamat datang ke Langkah Perbincangan. Ini ialah senario ringkas untuk membantu guru berfikir tentang amalan dialogik di dalam bilik darjah.',
  'landing.contact': 'Untuk tahap seterusnya, hubungi Gary di:',
  'landing.enter': 'Masuk',

  // ModeSelect
  'mode.tagline': 'Amalan Bilik Darjah Rendah',
  'mode.title': 'Bilik Darjah Dialogik',
  'mode.description':
    'Latih rutin bilik darjah Rendah yang realistik di mana murid mungkin berfikir dalam BM, menjawab dalam Inggeris separa, dan masih memerlukan bantuan mengubah idea separa bentuk kepada perbincangan yang lebih mantap.',
  'mode.aboutTitle': 'Tentang Binaan Latihan Ini',
  'mode.aboutBody':
    "Berdasarkan penyelidikan oleh Edwards-Groves, Chapin, O'Connor, dan Alexander. Tahap-tahap ini direka untuk membantu guru melatih rutin dialogik yang mengekalkan Inggeris tersedia untuk penaakulan, walaupun masa pengajaran terhad dan godaan untuk mengambil satu jawapan pantas yang betul.",

  // GameCard
  'card.startLevel': 'Mula tahap',
  'card.chainInfo': 'Rantaian respons \u00b7 Gabungan langkah perbincangan',
  'card.choiceInfo': 'Pilihan senario \u00b7 Akibat bilik darjah yang nyata',
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
  'header.classroomOutcomes': 'Hasil bilik darjah',
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
    'Ada pemikiran sebenar di sini. Suarakan semula, tambah ketepatan, dan kekalkan murid dalam perbualan.',
  'response.echo': 'Gema',
  'response.echo.coaching':
    'Murid mengulang bahasa yang sudah ada dalam bilik. Tekan untuk apa yang dimaksudkan atau minta seseorang membina atasnya.',
  'response.misconception': 'Salah Faham',
  'response.misconception.coaching':
    'Murid menampakkan idea yang salah. Ketengahkan penaakulan, biarkan kelas menguji dan menyemak semula idea itu.',
  'response.partnerReport': 'Laporan Rakan',
  'response.partnerReport.coaching':
    'Ini penyertaan risiko rendah ke perbincangan kelas. Gunakannya untuk meluaskan penyertaan sebelum meminta huraian peribadi.',
  'response.prediction': 'Ramalan',
  'response.prediction.coaching':
    'Ramalan membuka inkuiri. Kekal dengan mengapa supaya murid menghubungkannya dengan bukti, bukan meneka cepat.',
  'response.emergentLanguage': 'Bahasa Muncul',
  'response.emergentLanguage.coaching':
    'Pemikiran mungkin mendahului Inggeris. Bina dari idea dahulu, kemudian perkukuh bahasa di sekelilingnya.',

  // Dynamic advice
  'advice.lowParticipation':
    'Terlalu ramai di tepi. Gunakan lebih rutin tanpa tangan, latihan berpasangan, dan jemputan terpilih selepas masa perbincangan.',
  'advice.lowReasoning':
    'Perbincangan memerlukan lebih langkah pembangunan. Tanya mengapa, bukti, perbandingan, atau semakan sebelum membuat keputusan.',
  'advice.lowOwnership':
    'Kawalan guru kekal tinggi. Biar murid membawa lebih penerangan secara terbuka, walaupun Inggeris masih kasar.',
  'advice.partialIdeas':
    'Anda melihat beberapa idea separa. Dalam konteks bilik darjah ini, inilah masa untuk melanjutkan, menyuarakan semula, dan menghubungkan, bukan menggantikan.',
  'advice.misconceptions':
    'Salah faham muncul. Terus tekan mengapa murid berfikir begitu, kemudian gunakan kelas untuk menguji dan menyemak idea itu.',
  'advice.echoes':
    'Beberapa respons menggema bahasa guru atau rakan. Ikut dengan "Apa maksud kamu?" atau "Siapa boleh tambah sebab baru?" supaya perbincangan tidak cetek.',
  'advice.emergentLang':
    'Sesetengah murid ada pemikiran sebelum ada Inggeris. Suarakan semula secara strategik dan gunakan batang ayat supaya sokongan bahasa tidak menjadi pengambilalihan guru.',

  // EndScreen
  'end.discussionOpened': 'Perbincangan Terbuka',
  'end.keepRehearsing': 'Teruskan Berlatih Rutin',
  'end.winDescription':
    'Anda mencipta versi lebih dialogik "{title}" dengan meluaskan penyertaan dan melindungi pemikiran murid, walaupun sebelum murid boleh menyatakan semuanya dengan jelas dalam Inggeris.',
  'end.lossDescription':
    'Percubaan ini menunjukkan betapa cepatnya perbincangan runtuh kembali kepada pemburuan jawatan apabila tekanan masa dan kebimbangan guru mengambil alih. "{title}" direka untuk dimainkan semula supaya pertukaran itu terasa nyata.',
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
