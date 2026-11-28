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
import { CORE6_STRATEGIES, localizeStrategy } from '../lib/core6-strategies';
import { useLang, type Lang } from '../lib/i18n';
import type { AppRoute } from '../lib/router';

type TourStepContent = {
  title: string;
  whenToUse: string;
  body: string;
  bullets: string[];
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
      body: 'Each tool solves a different classroom job so you never have to force one prompt to do everything. There is no login, and nothing personal about pupils or schools is stored.',
      bullets: [
        '2 mins before class or mid-lesson -> Live Coach',
        'Warming up key words or debates -> Vocab & Concept Cartoons',
        'Preparing a question or checking a lesson plan -> 1 Question / Lesson Plan',
        'Practising moves safely on your own -> Play Scenarios',
      ],
    },
    ms: {
      title: 'Satu Aplikasi, Empat Situasi Mengajar',
      whenToUse: 'Gunakan halaman utama ini untuk terus ke alat yang sesuai dalam 10 saat.',
      body: 'Setiap alat mempunyai tugas bilik darjah yang berbeza supaya anda mudah memilih tanpa keliru. Tiada log masuk, dan tiada data peribadi murid atau sekolah disimpan.',
      bullets: [
        '2 minit sebelum kelas atau sedang mengajar -> Jurulatih Langsung',
        'Pemanasan kosa kata atau perdebatan -> Kosa Kata & Kartun Konsep',
        'Merancang satu soalan atau menyemak rancangan -> 1 Soalan / Rancangan Mengajar',
        'Berlatih langkah secara kendiri -> Simulasi Kelas',
      ],
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
      whenToUse: 'Tap "Edit" on the quiet top strip in any tool to pick your week’s strategy.',
      body: 'S1 to S6 are the six classroom routines of the 2027 programme (Sprint 1: 4 weeks on, 1 week break, 4 weeks on; Sprint 2: pair inquiry). Picking a strategy shapes every tool’s teacher scripts and board frames around that routine, while earlier habits keep supporting you.',
      bullets: [],
    },
    ms: {
      title: 'Apa Itu S1–S6? (6 Strategi Teras)',
      whenToUse: 'Ketik "Ubah" pada jalur atas di mana-mana alat untuk pilih strategi minggu ini.',
      body: 'S1 hingga S6 ialah enam rutin bilik darjah program 2027 (Sprint 1: 4 minggu aktif, 1 minggu rehat, 4 minggu aktif; Sprint 2: inkuiri berpasangan). Memilih satu strategi memfokuskan skrip guru dan bingkai papan mengikut rutin itu, sementara tabiat awal terus menyokong.',
      bullets: [],
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
      body: 'Snap or upload a page to get an instant bilingual routine (hook, 3-rung board ladder, and 30-second finger-vote check). Or type what just happened in class to get a 60-second pivot — no planning template needed.',
      bullets: [
        'Textbook photo -> ready-to-teach bilingual reasoning card',
        'Stuck or silent class -> quick diagnose, reset, or revoice move',
        'Pin useful cards to reopen offline later',
      ],
    },
    ms: {
      title: 'Jurulatih Langsung — Persediaan Pantas & Bantuan Semasa Kelas',
      whenToUse: 'Guna apabila: anda ada gambar buku teks 2 minit sebelum kelas, atau murid tiba-tiba senyap.',
      body: 'Ambil gambar halaman buku teks untuk dapatkan rutin dwibahasa segera (cangkuk perbualan, tangga ayat 3 tahap, dan undi jari 30 saat). Atau taip situasi semasa untuk langkah penyesuaian 60 saat.',
      bullets: [
        'Gambar buku teks -> kad penaakulan dwibahasa sedia guna',
        'Kelas senyap atau keliru -> langkah diagnosis, ulang semula, atau ulang suara',
        'Semat kad berguna untuk dibuka semula tanpa internet',
      ],
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
      body: 'Browse non-AI KPM Year 4 vocabulary by tier (Science nouns, thinking words, connectors), launch Bingo / Odd One Out on the projector, or pull 5 review words from units you marked taught (saved only on your own device).',
      bullets: [
        'Textbook mode works offline with curated EN / BM / Iban bridges',
        '“Mark taught (this device)” powers Quick-Fire 5 review words',
        'Switch to Custom Words anytime if your topic is not listed yet',
      ],
    },
    ms: {
      title: 'Primer Kosa Kata — Perkataan KPM & Permainan 5 Minit',
      whenToUse: 'Guna apabila: memulakan unit Sains baharu atau pemanasan 5 minit.',
      body: 'Semak kosa kata Sains Tahun 4 KPM mengikut tahap (istilah Sains, kata pemikiran, kata hubung), main Bingo / Mana Ganjil di projektor, atau tarik 5 perkataan ulang kaji daripada unit yang anda tanda diajar (disimpan pada peranti anda sahaja).',
      bullets: [
        'Mod buku teks berfungsi dengan jambatan EN / BM / Iban tersedia',
        '“Tanda diajar (peranti ini)” memacu ulang kaji Pantas 5',
        'Beralih ke Perkataan Sendiri jika topik belum tersenarai',
      ],
    },
  },
  {
    id: 'cartoon',
    route: { name: 'cartoon' },
    icon: MessagesSquare,
    tone: 'bg-amber-bg text-[#9e5f06] border-amber/40',
    en: {
      title: 'Concept Cartoon Studio — Provoke Reasoning & Debate',
      whenToUse: 'Use when: teaching S6 (Week 8–9) or designing your Sprint 2 classroom inquiry.',
      body: 'Type any Science topic and Ali, Bisi, and Cempaka make three competing claims: one sound, one misconception, and one language trap (randomised every time so pupils cannot guess by name).',
      bullets: [
        'Tap any speech bubble or Iban bridge to edit before class',
        'Present full-screen or Print — the Teacher Key hides automatically',
        'Tap a follow-up chip after class to hand straight into Live Coach',
      ],
    },
    ms: {
      title: 'Studio Kartun Konsep — Cetusan Penaakulan & Perdebatan',
      whenToUse: 'Guna apabila: mengajar S6 (Minggu 8–9) atau membina inkuiri kelas Sprint 2.',
      body: 'Taip mana-mana topik Sains dan Ali, Bisi, serta Cempaka mengemukakan tiga tuntutan berbeza: satu mantap, satu salah faham, dan satu perangkap bahasa (dirawak setiap kali supaya murid tidak meneka mengikut nama).',
      bullets: [
        'Ketik mana-mana belon ucapan atau jambatan Iban untuk sunting sebelum kelas',
        'Bentang skrin penuh atau Cetak — Kunci Guru disembunyikan automatik',
        'Ketik cip susulan selepas kelas untuk terus ke Jurulatih Langsung',
      ],
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
      body: 'Use the top toggle to choose the depth you need right now:',
      bullets: [
        '1 Question: you have ONE key question and want exact revoicing lines, bilingual board frames, and 5 follow-up branches.',
        'Lesson Plan: you have a FULL plan (PDF or pasted text) and want to spot where EAL pupils will freeze or where teacher talk runs too long.',
      ],
    },
    ms: {
      title: '1 Soalan vs. Rancangan Mengajar — Dua Tugas Berbeza',
      whenToUse: 'Guna apabila: membuat perancangan sebelum masuk kelas.',
      body: 'Gunakan suis di bahagian atas mengikut tahap perancangan anda:',
      bullets: [
        '1 Soalan: anda ada SATU soalan utama dan mahukan ayat ulang suara, bingkai papan dwibahasa, serta 5 laluan susulan.',
        'Rancangan Mengajar: anda ada RANCANGAN PENUH (PDF atau teks) dan mahu mengesan saat murid EAL akan tersekat atau percakapan guru terlalu panjang.',
      ],
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
      body: 'Step into short primary classroom turns, test how wait time, revoicing, and staying neutral change pupil confidence, and see a quick talk-move summary at the end.',
      bullets: [
        'Ideal for trying a new Core 6 move before using it with your real class',
        'Progress is saved locally on your phone only',
      ],
    },
    ms: {
      title: 'Simulasi Kelas — Latihan Kendiri Tanpa Tekanan',
      whenToUse: 'Guna apabila: anda mahu 5 minit latihan santai secara bersendirian.',
      body: 'Masuki situasi bilik darjah sekolah rendah, uji bagaimana masa menunggu, ulang suara, dan sikap neutral mengubah keyakinan murid, dan lihat ringkasan langkah di hujung sesi.',
      bullets: [
        'Sesuai untuk mencuba strategi Teras 6 baharu sebelum masuk kelas sebenar',
        'Kemajuan disimpan secara tempatan pada peranti anda sahaja',
      ],
    },
  },
];

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

          {copy.bullets.length > 0 ? (
            <ul className="space-y-1.5 rounded-2xl border border-ink/10 bg-white p-3.5 text-sm text-ink">
              {copy.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden />
                  <span className="leading-snug">{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {step.showCore6Grid ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CORE6_STRATEGIES.map((strategy) => {
                const loc = localizeStrategy(strategy, lang);
                return (
                  <div
                    key={strategy.id}
                    className="rounded-xl border border-ink/12 bg-white px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs font-extrabold text-terracotta">
                        {strategy.id} · {loc.shortName}
                      </span>
                      <span className="text-[11px] font-semibold text-ink-muted">{loc.window}</span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-ink-soft">{loc.mechanism}</p>
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
