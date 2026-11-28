// Assisted-by: Antigravity:gemini-4-neon (2026-11-28)
// Manual-only interactive bilingual guided tour (EN / BM). Never auto-starts; opens strictly
// when the teacher clicks "Take a Tour" on the splash screen.
import { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Dices,
  FileSearch,
  Gamepad2,
  LayoutGrid,
  MessagesSquare,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { CORE6_STRATEGIES, type StrategyId } from '../lib/core6-strategies';
import { useLang, type Lang } from '../lib/i18n';
import type { AppRoute } from '../lib/router';

type TourStepContent = {
  title: string;
  whenToUse: string;
  body: string;
};

type TourStep = {
  id: string;
  route: AppRoute;
  icon: typeof Compass;
  tone: string;
  showCore6Grid?: boolean;
  en: TourStepContent;
  ms: TourStepContent;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: 'overview',
    route: { name: 'home' },
    icon: LayoutGrid,
    tone: 'bg-terracotta-bg text-terracotta border-terracotta/30',
    en: {
      title: 'One App, Four Teaching Moments',
      whenToUse: 'Use this hub to jump straight to the right tool in under 10 seconds.',
      body: 'Get quick classroom help with Live Coach, explore ready-made words and cartoons, plan a question or lesson, or practise with Play Scenarios. Choose the tool that fits what you need now.',
    },
    ms: {
      title: 'Satu Aplikasi, Empat Situasi Mengajar',
      whenToUse: 'Gunakan halaman utama ini untuk terus ke alat yang sesuai dalam 10 saat.',
      body: 'Dapatkan bantuan segera melalui Jurulatih Langsung, terokai perkataan dan kartun tersedia, rancang soalan atau pengajaran, atau berlatih dengan Simulasi Kelas. Pilih alat mengikut keperluan anda sekarang.',
    },
  },
  {
    id: 'core6',
    route: { name: 'live' },
    icon: Target,
    tone: 'bg-terracotta-bg text-terracotta border-terracotta/35',
    showCore6Grid: true,
    en: {
      title: 'What Are S1–S6? (The Core 6 Strategies)',
      whenToUse: 'Tap "Edit" on the strategy bar in a coaching tool to choose your focus.',
      body: 'S1–S6 are six ways to help pupils think and talk about Science. Choose the one your class needs. The coach will focus its suggestions on that strategy; you can still use the others alongside it.',
    },
    ms: {
      title: 'Apa Itu S1–S6? (6 Strategi Teras)',
      whenToUse: 'Ketik "Ubah" pada bar strategi dalam alat bimbingan untuk memilih fokus anda.',
      body: 'S1–S6 ialah enam cara membantu murid berfikir dan berbincang tentang Sains. Pilih strategi yang diperlukan kelas anda. Cadangan jurulatih akan berfokus pada strategi itu; strategi lain masih boleh digunakan bersama.',
    },
  },
  {
    id: 'live',
    route: { name: 'live' },
    icon: Zap,
    tone: 'bg-amber-bg text-[#9e5f06] border-amber/40',
    en: {
      title: 'Live Coach — Instant Textbook Prep & Mid-Lesson Rescue',
      whenToUse: 'Use when: you have a textbook photo 2 minutes before class, or pupils just went silent.',
      body: 'Upload a textbook page for a bilingual teaching card with a starter question, sentence frames, and a quick class check. Or describe what just happened in class to get a practical next step. Pin useful cards to reopen offline.',
    },
    ms: {
      title: 'Jurulatih Langsung — Persediaan Pantas & Bantuan Semasa Kelas',
      whenToUse: 'Guna apabila: anda ada gambar buku teks 2 minit sebelum kelas, atau murid tiba-tiba senyap.',
      body: 'Muat naik halaman buku teks untuk kad pengajaran dwibahasa dengan soalan pembuka, bingkai ayat, dan semakan kelas ringkas. Atau nyatakan situasi kelas untuk cadangan langkah seterusnya. Semat kad berguna untuk dibuka tanpa internet.',
    },
  },
  {
    id: 'primer',
    route: { name: 'primer' },
    icon: Dices,
    tone: 'bg-sage-bg text-[#1f6b4a] border-sage/35',
    en: {
      title: 'Vocab Primer — Ready-Made KPM Words & Quick Games',
      whenToUse: 'Use when: starting a new Science unit or running a 5-minute warm-up.',
      body: 'Choose a KPM unit for ready-made Science words, language bridges, Bingo, and Odd One Out. Mark words as taught to use them in Quick-Fire 5 review. Textbook resources work offline; Custom Words is available for other topics.',
    },
    ms: {
      title: 'Primer Kosa Kata — Perkataan KPM & Permainan 5 Minit',
      whenToUse: 'Guna apabila: memulakan unit Sains baharu atau pemanasan 5 minit.',
      body: 'Pilih unit KPM untuk perkataan Sains, jambatan bahasa, Bingo, dan Mana Ganjil yang tersedia. Tanda perkataan sebagai diajar untuk ulang kaji Pantas 5. Sumber buku teks boleh digunakan tanpa internet; Perkataan Sendiri tersedia untuk topik lain.',
    },
  },
  {
    id: 'cartoon',
    route: { name: 'cartoon' },
    icon: MessagesSquare,
    tone: 'bg-amber-bg text-[#9e5f06] border-amber/40',
    en: {
      title: 'Concept Cartoon Studio — Provoke Reasoning & Debate',
      whenToUse: 'Use when: you want pupils to compare ideas and explain their evidence.',
      body: 'Select your KPM unit, then choose a ready-made cartoon. Pupils compare the characters’ ideas and explain who they agree with and why. Open the teacher notes to prepare, then present the cartoon full-screen. No AI generation is needed.',
    },
    ms: {
      title: 'Studio Kartun Konsep — Cetusan Penaakulan & Perdebatan',
      whenToUse: 'Guna apabila: anda mahu murid membandingkan idea dan menerangkan bukti.',
      body: 'Pilih unit KPM anda, kemudian pilih kartun yang tersedia. Murid membandingkan idea watak dan menjelaskan siapa yang dipersetujui serta sebabnya. Buka nota guru untuk persediaan, kemudian bentangkan kartun pada skrin penuh. Tiada penjanaan AI diperlukan.',
    },
  },
  {
    id: 'plan',
    route: { name: 'plan' },
    icon: FileSearch,
    tone: 'bg-sky-bg text-[#1c5f8d] border-sky/35',
    en: {
      title: '1 Question vs. Lesson Plan — Two Different Jobs',
      whenToUse: 'Use when: planning ahead before you teach.',
      body: 'Choose 1 Question to turn a key question into teacher prompts, bilingual sentence frames, and follow-up questions. Choose Lesson Plan to upload or paste a full plan and find where pupils may need more language support or time to talk.',
    },
    ms: {
      title: '1 Soalan vs. Rancangan Mengajar — Dua Tugas Berbeza',
      whenToUse: 'Guna apabila: membuat perancangan sebelum masuk kelas.',
      body: 'Pilih 1 Soalan untuk menukar soalan utama kepada panduan guru, bingkai ayat dwibahasa, dan soalan susulan. Pilih Rancangan Mengajar untuk memuat naik atau menampal rancangan penuh dan mengenal pasti bahagian yang memerlukan sokongan bahasa atau masa perbincangan murid.',
    },
  },
  {
    id: 'play',
    route: { name: 'play' },
    icon: Gamepad2,
    tone: 'bg-terracotta-bg text-terracotta border-terracotta/30',
    en: {
      title: 'Play Scenarios — Safe Solo Rehearsal',
      whenToUse: 'Use when: you want 5 minutes of low-pressure practice on your own.',
      body: 'Try short classroom scenarios before using a strategy with your class. Practise giving thinking time, restating pupils’ ideas, and responding without judging. See a summary at the end; your progress stays on this device.',
    },
    ms: {
      title: 'Simulasi Kelas — Latihan Kendiri Tanpa Tekanan',
      whenToUse: 'Guna apabila: anda mahu 5 minit latihan santai secara bersendirian.',
      body: 'Cuba situasi kelas ringkas sebelum menggunakan strategi dengan murid sebenar. Berlatih memberi masa berfikir, menyatakan semula idea murid, dan memberi respons tanpa menghakimi. Lihat ringkasan pada akhir sesi; kemajuan disimpan pada peranti ini sahaja.',
    },
  },
];

const TOUR_STRATEGIES: Record<Lang, Record<StrategyId, { title: string; body: string }>> = {
  en: {
    S1: { title: 'Ask, then wait', body: 'Ask a question with more than a one-word answer. Give everyone 5–7 seconds to think before anyone speaks.' },
    S2: { title: 'Practise with a partner', body: 'Let pupils try their ideas with a partner in Iban or Malay first, then practise one English sentence together.' },
    S3: { title: 'Build words into sentences', body: 'Teach a few key Science words. Help pupils use them in a short sentence, then explain an idea using “because”.' },
    S4: { title: 'Restate and ask for evidence', body: 'Put a pupil’s idea into clear English without changing its meaning. Ask what in the picture or experiment supports it.' },
    S5: { title: 'Check everyone, then adapt', body: 'Use finger votes or mini-boards to hear from every pupil. Check whether they need help with the words or the Science idea, then adjust.' },
    S6: { title: 'Compare ideas and test a change', body: 'Use a cartoon to compare different ideas. Ask pupils who they agree with and why, then ask what would happen if one thing changed.' },
  },
  ms: {
    S1: { title: 'Tanya, kemudian tunggu', body: 'Tanya soalan yang memerlukan lebih daripada satu perkataan. Beri semua murid 5–7 saat untuk berfikir sebelum menjawab.' },
    S2: { title: 'Berlatih dengan pasangan', body: 'Beri murid peluang mencuba idea dengan pasangan dalam bahasa Iban atau Melayu dahulu, kemudian latih satu ayat Inggeris bersama.' },
    S3: { title: 'Bina ayat daripada perkataan', body: 'Ajar beberapa perkataan Sains utama. Bantu murid membina ayat ringkas, kemudian terangkan idea menggunakan “kerana”.' },
    S4: { title: 'Nyatakan semula dan minta bukti', body: 'Nyatakan semula idea murid dalam bahasa Inggeris yang jelas tanpa mengubah maksudnya. Tanya bukti daripada gambar atau eksperimen.' },
    S5: { title: 'Semak semua, kemudian sesuaikan', body: 'Gunakan undi jari atau papan mini untuk respons setiap murid. Kenal pasti sama ada mereka perlukan bantuan bahasa atau idea Sains, kemudian sesuaikan pengajaran.' },
    S6: { title: 'Bandingkan idea dan uji perubahan', body: 'Gunakan kartun untuk membandingkan idea. Tanya murid siapa yang dipersetujui dan sebabnya, kemudian tanya apa akan berlaku jika satu perkara diubah.' },
  },
};

type AppTourProps = {
  stepIndex: number;
  onStepChange: (nextIndex: number) => void;
  onClose: () => void;
  onNavigate: (route: AppRoute) => void;
};

export default function AppTour({
  stepIndex,
  onStepChange,
  onClose,
  onNavigate,
}: AppTourProps) {
  const { lang, setLang } = useLang();
  const safeIndex = Math.max(0, Math.min(TOUR_STEPS.length - 1, stepIndex));
  const step = TOUR_STEPS[safeIndex];
  const copy = step[lang as Lang] ?? step.en;
  const Icon = step.icon;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === TOUR_STEPS.length - 1;

  // Keep the live app route synced with the active tour step so teachers see the real tool behind it.
  useEffect(() => {
    onNavigate(step.route);
  }, [step.route.name]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight' && !isLast) onStepChange(safeIndex + 1);
      else if (event.key === 'ArrowLeft' && !isFirst) onStepChange(safeIndex - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [safeIndex, isFirst, isLast, onClose, onStepChange]);

  const handleFinish = () => {
    onNavigate({ name: 'home' });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[180] flex items-end justify-center bg-ink/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-5 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-tour-title"
    >
      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="card-warm flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden border-2 border-ink/20 bg-parchment-light shadow-2xl"
      >
        {/* Tour Header: Step progress + inline EN|BM switcher + Close */}
        <div className="flex items-center justify-between gap-2 border-b border-ink/10 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-terracotta" aria-hidden />
            <span className="font-display text-xs font-bold uppercase tracking-wide text-ink-muted tabular-nums">
              {lang === 'ms'
                ? `Lawatan · Langkah ${safeIndex + 1} / ${TOUR_STEPS.length}`
                : `Guided Tour · Step ${safeIndex + 1} of ${TOUR_STEPS.length}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              role="group"
              aria-label="Tour language"
              className="inline-flex overflow-hidden rounded-full border border-ink/15 bg-parchment-dark/60 p-0.5"
            >
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={`min-h-[30px] rounded-full px-2.5 font-display text-[11px] font-bold transition ${
                  lang === 'en' ? 'bg-terracotta text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('ms')}
                aria-pressed={lang === 'ms'}
                className={`min-h-[30px] rounded-full px-2.5 font-display text-[11px] font-bold transition ${
                  lang === 'ms' ? 'bg-terracotta text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                BM
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'ms' ? 'Tutup lawatan' : 'Close tour'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 bg-white text-ink-muted hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Step Body */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 ${step.tone}`}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="app-tour-title" className="font-display text-lg font-bold leading-snug text-ink sm:text-xl">
                {copy.title}
              </h2>
              <p className="mt-1 text-xs font-bold text-terracotta sm:text-sm">{copy.whenToUse}</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-ink-soft">{copy.body}</p>

          {step.showCore6Grid ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CORE6_STRATEGIES.map((strategy) => {
                const explanation = TOUR_STRATEGIES[lang][strategy.id];
                return (
                  <div
                    key={strategy.id}
                    className="rounded-xl border border-ink/12 bg-white px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs font-extrabold text-terracotta">
                        {strategy.id} · {explanation.title}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-ink-soft">{explanation.body}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between gap-2 border-t border-ink/10 bg-white px-4 py-3">
          <div className="flex items-center gap-1" aria-hidden>
            {TOUR_STEPS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onStepChange(idx)}
                aria-label={`Step ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === safeIndex ? 'w-6 bg-terracotta' : 'w-2 bg-ink/20 hover:bg-ink/35'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst ? (
              <button
                type="button"
                onClick={() => onStepChange(safeIndex - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-ink/15 bg-white px-3 py-2 font-display text-xs font-bold text-ink-soft transition hover:border-ink/30 hover:text-ink touch-target"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                {lang === 'ms' ? 'Kembali' : 'Back'}
              </button>
            ) : null}

            {isLast ? (
              <button
                type="button"
                onClick={handleFinish}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm touch-target"
              >
                {lang === 'ms' ? 'Tamat & Buka Utama' : 'Finish & Open Home'}
                <Check className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStepChange(safeIndex + 1)}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm touch-target"
              >
                {lang === 'ms' ? 'Seterusnya' : 'Next'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
