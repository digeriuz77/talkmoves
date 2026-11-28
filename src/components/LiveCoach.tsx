// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Hand,
  ImageIcon,
  Layers3,
  Lightbulb,
  LoaderCircle,
  PencilLine,
  Pin,
  RefreshCw,
  Send,
  Sparkles,
  Stethoscope,
  Target,
  Trash2,
  TriangleAlert,
  Upload,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useLang, type TranslateFn } from '../lib/i18n';
import { usePersistentState } from '../lib/usePersistentState';
import { useClassContext } from '../lib/class-context';
import { useActiveStrategy } from '../lib/strategy-context';
import type { LiveCoachHandoff } from '../lib/coach-handoff';
import {
  AiNotice,
  CopyButton,
  LanguageLensToggle,
  NeedBadge,
  PrivacyNotice,
  SayLine,
  StartNewButton,
  StrategySpotlightBadge,
  subjectLabel,
  type LangLens,
  type NeedCategory,
} from './coach-ui';
import StrategyBar from './StrategyBar';

type ActionMode = 'prep_card' | 'diagnose' | 'reset' | 'firm_up';
type DiagnosticTag = 'correct_reasoning' | 'concept_misconception' | 'language_or_surface_trap';

type Idea = {
  kind: 'alternative-move' | 'root-cause' | 'missed-angle' | 'risk' | 'beyond-palette';
  headline: string;
  detail: string;
  talkMoveId: string;
  offPalette?: boolean;
  sayNowEnglish: string;
  sayNowBridge: string;
};

type ReasoningPrepCard = {
  detectedVisualContext: {
    pageSummary: string;
    visualAnchors: string[];
    coreConcept: string;
    commonMisconception: string;
  };
  strand1_dialogicReasoning: {
    talkMoveId: string;
    talkMoveName: string;
    visualHookInstruction: string;
    competingClaims: { claimA: string; claimB: string };
    teacherScriptEn: string;
    teacherScriptBridge: string;
    waitTimeCue: string;
  };
  strand2_vocabularyAndEalLadder: {
    contentNouns: Array<{ en: string; l1Bridge: string; visualPointCue: string }>;
    relationalConnectors: Array<{ en: string; l1Bridge: string; gestureCue: string }>;
    ealProgressionLadder: {
      rung1_pointAndWord: string;
      rung2_twoChoiceCloze: string;
      rung3_causalFrameEn: string;
      rung3_causalFrameL1: string;
    };
  };
  strand3_aflAndTransfer: {
    fingerVotePrompt: string;
    options: Array<{ finger: number; text: string; diagnosticTag: DiagnosticTag }>;
    whatIfTransferTwist: { promptEn: string; promptBridge: string; expectedReasoning: string };
  };
  followUpChips: Array<{ id: string; label: string; nextActionMode: ActionMode }>;
};

type LiveCoachResult = {
  actionMode: ActionMode;
  readBack: {
    detectedLanguage: string;
    needCategory: NeedCategory;
    summaryEnglish: string;
    summaryBridge: string;
  };
  diagnosis?: { barrier: string; confidence: number; evidence: string };
  teacherMirror?: string;
  rationaleNote?: string;
  observeNext?: string;
  ideas?: Idea[];
  prepCard?: ReasoningPrepCard;
  diagnose?: { hypothesis: string; clarifyingQuestion: string; clarifyingOptions: string[] };
  reset?: {
    eefPrinciple: {
      principleId: string;
      principle: string;
      whyThisFits: string;
      checkAdaptAction: string;
    };
    resetActionSteps: string[];
  };
  firmUp?: {
    eefRationale: string;
    talkMove: {
      talkMoveId: string;
      offPalette?: boolean;
      talkMoveName: string;
      why: string;
      sayNowEnglish: string;
      sayNowBridge: string;
    };
    bilingualSentenceFrames: Array<{ en: string; bridge: string }>;
    phrasingTip?: { tipMalay: string; tipIban: string; whenToUse: string };
  };
  regainFocusLine?: string;
  ifItFails?: string;
};

type ChatMessage = {
  id: string;
  role: 'teacher' | 'coach';
  text: string;
  result?: LiveCoachResult;
  imageThumbnail?: string;
  /** Core 6 strategy ('S1'–'S6') this coach reply was generated with, or '' for none. */
  strategy?: string;
};

type PreparedImage = {
  base64Data: string;
  thumbnailDataUrl: string;
  name: string;
};

type SavedPrepCard = {
  id: string;
  createdAt: number;
  yearLevel: string;
  subject: string;
  dominantLanguage: string;
  result: LiveCoachResult;
  imageThumbnail?: string;
  visionSummary?: string;
};

type QuickIntent = 'build_reasoning_prep' | 'competing_claims_debate' | 'spot_mistake' | 'simplify_bridge';

const QUICK_PROMPTS: Record<QuickIntent, string> = {
  build_reasoning_prep: 'Build the full 3-strand reasoning prep card from this visual.',
  competing_claims_debate: 'Turn this page into a "Who Is Right?" competing-claims debate.',
  spot_mistake: 'Build a spot-the-mistake AfL hinge check for this page.',
  simplify_bridge: 'Pupils are silent. Simplify the visual language bridge for this page.',
};

const PINNED_CARDS_LIMIT = 10;

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode that image.'));
    image.src = dataUrl;
  });
}

function resizeToJpeg(image: HTMLImageElement, maxEdge: number, quality: number): string {
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image compression is not supported in this browser.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

async function prepareImage(file: Blob, name: string): Promise<PreparedImage> {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const fullDataUrl = resizeToJpeg(image, 1024, 0.8);
  const thumbnailDataUrl = resizeToJpeg(image, 320, 0.6);
  return {
    base64Data: fullDataUrl.split(',')[1] || '',
    thumbnailDataUrl,
    name,
  };
}

const MODE_ICON: Record<ActionMode, typeof Lightbulb> = {
  prep_card: ImageIcon,
  diagnose: Stethoscope,
  reset: RefreshCw,
  firm_up: Sparkles,
};

type LiveCoachProps = {
  /** One-shot hand-off from another tool (Concept Cartoon follow-up chip). */
  handoff?: LiveCoachHandoff | null;
  onHandoffConsumed?: () => void;
};

export default function LiveCoach({ handoff = null, onHandoffConsumed }: LiveCoachProps = {}) {
  const { t } = useLang();
  const { yearLevel, subject, dominantLanguage, setYearLevel, setSubject, setDominantLanguage } =
    useClassContext();
  const { activeStrategy, setActiveStrategy } = useActiveStrategy();
  const [messages, setMessages, resetMessages] = usePersistentState<ChatMessage[]>(
    'tmb.live.messages.v3',
    [],
  );
  const [visionSummary, setVisionSummary] = usePersistentState('tmb.live.visionSummary.v3', '');
  const [savedCards, setSavedCards] = usePersistentState<SavedPrepCard[]>(
    'tmb.live.pinnedPrepCards.v1',
    [],
  );
  const [currentImage, setCurrentImage] = useState<PreparedImage | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // Action trigger waiting for the teacher's next send (set by a hand-off chip).
  const pendingTriggerRef = useRef<string | null>(null);

  const hasConversation = messages.length > 0;
  const canBuildFromVisual = Boolean(currentImage?.base64Data || visionSummary);
  const busy = loading || processingImage;

  useEffect(() => {
    if (hasConversation) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, loading, hasConversation]);

  // A follow-up chip from the Concept Cartoon Studio: switch the spotlight, arm the action mode,
  // and pre-fill the draft. The teacher reviews it and sends (never auto-sent).
  useEffect(() => {
    if (!handoff) return;
    if (handoff.targetStrategy) setActiveStrategy(handoff.targetStrategy);
    pendingTriggerRef.current = handoff.actionTrigger || null;
    setDraft(handoff.promptContext);
    setError(null);
    onHandoffConsumed?.();
    const timer = window.setTimeout(() => draftRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
    // Depends on the hand-off object only: it is consumed once, then cleared by the parent.
  }, [handoff]);

  const attachImage = async (file: Blob, name: string) => {
    setError(null);
    setProcessingImage(true);
    try {
      const prepared = await prepareImage(file, name);
      setCurrentImage(prepared);
      setVisionSummary('');
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : t('live.errors.failed'));
    } finally {
      setProcessingImage(false);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const item = (Array.from(event.clipboardData.items) as DataTransferItem[]).find(
      (candidate) => candidate.kind === 'file' && candidate.type.startsWith('image/'),
    );
    const file = item?.getAsFile();
    if (!file) return;
    event.preventDefault();
    void attachImage(file, `pasted-${Date.now()}.jpg`);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = (Array.from(event.dataTransfer.files) as File[]).find((candidate) =>
      candidate.type.startsWith('image/'),
    );
    if (file) void attachImage(file, file.name);
  };

  const removeImage = () => {
    setCurrentImage(null);
    setVisionSummary('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const clearTab = () => {
    resetMessages();
    removeImage();
    setDraft('');
    setError(null);
  };

  const send = async (text: string, actionTrigger?: string) => {
    const clean = text.trim();
    const hasNewImage = Boolean(currentImage?.base64Data);
    if ((!clean && !hasNewImage) || loading) return;
    setError(null);

    const teacherMsg: ChatMessage = {
      id: `t-${Date.now()}`,
      role: 'teacher',
      text: clean || QUICK_PROMPTS.build_reasoning_prep,
      imageThumbnail: hasNewImage ? currentImage?.thumbnailDataUrl : undefined,
    };
    const nextMessages = [...messages, teacherMsg];
    setMessages(nextMessages);
    setDraft('');
    setLoading(true);
    // A quick intent wins; otherwise an armed hand-off trigger (if any) is spent on this send.
    const trigger = actionTrigger || pendingTriggerRef.current || undefined;
    pendingTriggerRef.current = null;

    try {
      const response = await fetch('/api/live-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread: nextMessages.map((msg) => ({ role: msg.role, text: msg.text })),
          yearLevel,
          subject,
          dominantLanguage,
          activeStrategy,
          actionTrigger: trigger,
          image: hasNewImage
            ? { mimeType: 'image/jpeg', base64Data: currentImage?.base64Data }
            : undefined,
          visionSummary: visionSummary || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || t('live.errors.failed'));

      const result = payload?.plan as LiveCoachResult | undefined;
      if (!result?.actionMode) throw new Error(t('live.errors.failed'));
      const coachText =
        result.teacherMirror || result.readBack?.summaryEnglish || t('live.coachReplyFallback');
      const coachMsg: ChatMessage = {
        id: `c-${Date.now()}`,
        role: 'coach',
        text: coachText,
        result,
        imageThumbnail: teacherMsg.imageThumbnail,
        strategy: payload?.meta?.strategy?.id || '',
      };
      setMessages((prev) => [...prev, coachMsg]);
      if (typeof payload?.visionSummary === 'string' && payload.visionSummary.trim()) {
        setVisionSummary(payload.visionSummary);
      }
      if (hasNewImage) {
        setCurrentImage((prev) => (prev ? { ...prev, base64Data: '' } : null));
      }
    } catch (requestError) {
      setMessages((prev) => prev.filter((msg) => msg.id !== teacherMsg.id));
      // Put the unsent text back so the teacher does not have to retype it.
      setDraft((current) => current || clean);
      setError(requestError instanceof Error ? requestError.message : t('live.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  const runQuickIntent = (intent: QuickIntent) => {
    const labels: Record<QuickIntent, string> = {
      build_reasoning_prep: t('live.buildPrepCta'),
      competing_claims_debate: t('live.quickIntent.debate'),
      spot_mistake: t('live.quickIntent.mistake'),
      simplify_bridge: t('live.quickIntent.simplify'),
    };
    void send(labels[intent], intent);
  };

  const fillDraftFromChip = (text: string) => {
    setDraft(text);
    draftRef.current?.focus();
  };

  const pinCard = (message: ChatMessage) => {
    if (!message.result?.prepCard) return;
    const card: SavedPrepCard = {
      id: message.id,
      createdAt: Date.now(),
      yearLevel,
      subject,
      dominantLanguage,
      result: message.result,
      imageThumbnail: message.imageThumbnail || currentImage?.thumbnailDataUrl,
      visionSummary: visionSummary || undefined,
    };
    const next = [card, ...savedCards.filter((saved) => saved.id !== card.id)].slice(
      0,
      PINNED_CARDS_LIMIT,
    );

    for (let count = next.length; count > 0; count -= 1) {
      const candidate = next.slice(0, count);
      try {
        window.localStorage.setItem('tmb.live.pinnedPrepCards.v1', JSON.stringify(candidate));
        setSavedCards(candidate);
        setError(null);
        return;
      } catch {
        // Drop the oldest card and retry until the offline thumbnail/card set fits.
      }
    }
    setError(t('live.errors.failed'));
  };

  const loadPinnedCard = (card: SavedPrepCard) => {
    setYearLevel(card.yearLevel);
    setSubject(card.subject);
    setDominantLanguage(card.dominantLanguage);
    setVisionSummary(card.visionSummary || '');
    setCurrentImage(
      card.imageThumbnail
        ? { base64Data: '', thumbnailDataUrl: card.imageThumbnail, name: t('live.pinnedBadge') }
        : null,
    );
    setMessages([
      {
        id: card.id,
        role: 'coach',
        text: card.result.teacherMirror || t('live.coachReplyFallback'),
        result: card.result,
        imageThumbnail: card.imageThumbnail,
      },
    ]);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(draft);
  };

  return (
    <div
      onPaste={handlePaste}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className="space-y-3"
    >
      {/* Hidden file/camera inputs shared by hero & composer */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void attachImage(file, file.name);
          event.currentTarget.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void attachImage(file, file.name || `page-${Date.now()}.jpg`);
          event.currentTarget.value = '';
        }}
      />

      <div className="flex items-center justify-between gap-2 print:hidden">
        <h1 className="heading-editorial">{t('coach.tab.live')}</h1>
        {hasConversation || currentImage ? <StartNewButton onClear={clearTab} /> : null}
      </div>

      <StrategyBar />

      {/* Pinned offline cards rail */}
      {savedCards.length > 0 ? (
        <section className="card-warm p-3 print:hidden">
          <p className="label-section mb-2">{t('live.pinnedTitle')}</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {savedCards.map((card) => (
              <div
                key={card.id}
                className="min-w-52 max-w-60 shrink-0 rounded-2xl border-2 border-ink/10 bg-white p-2.5"
              >
                <p className="truncate font-display text-xs font-bold text-ink">
                  Year {card.yearLevel} · {subjectLabel(card.subject)}
                </p>
                <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-ink-muted">
                  {card.result.prepCard?.detectedVisualContext.pageSummary || card.result.teacherMirror}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => loadPinnedCard(card)}
                    className="flex-1 rounded-xl border-2 border-terracotta/35 bg-terracotta-bg px-2.5 py-1.5 font-display text-xs font-semibold text-terracotta touch-target"
                  >
                    {t('live.openPinned')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('live.unpin')}
                    onClick={() => setSavedCards((prev) => prev.filter((saved) => saved.id !== card.id))}
                    className="rounded-xl border-2 border-ink/12 px-2.5 py-1.5 text-ink-muted hover:text-red-700 touch-target"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Single dominant hero action (hidden once conversation starts) */}
      {!hasConversation && !currentImage && !processingImage ? (
        <section className="card-warm border-2 border-terracotta/30 bg-gradient-to-b from-white to-parchment-light p-6 text-center sm:p-8 print:hidden">
          <span className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#b84422] bg-terracotta text-white shadow-[0_3px_0_#a33a1b]">
            <Camera className="h-7 w-7" aria-hidden />
          </span>
          <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">{t('live.screenshotTitle')}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-soft">{t('live.screenshotHint')}</p>
          <div className="mt-5 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraInputRef.current?.click()}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-base touch-target sm:w-auto"
            >
              <Camera className="h-5 w-5 shrink-0" />
              <span>{t('live.takePhoto')}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 font-display text-sm font-semibold text-ink-soft transition hover:bg-parchment-dark/60 hover:text-ink touch-target"
            >
              <Upload className="h-4 w-4 shrink-0 text-terracotta" />
              <span>{t('live.uploadImage')}</span>
            </button>
          </div>
        </section>
      ) : null}

      {/* Active visual preview + quick-action chips */}
      {currentImage || processingImage ? (
        <section className="card-warm p-3.5 print:hidden">
          {processingImage ? (
            <p className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
              <LoaderCircle className="h-4 w-4 animate-spin text-terracotta" />
              {t('live.processingImage')}
            </p>
          ) : currentImage ? (
            <>
              <div className="flex items-center gap-3">
                <img
                  src={currentImage.thumbnailDataUrl}
                  alt={currentImage.name}
                  className="h-16 w-20 shrink-0 rounded-xl border-2 border-ink/10 bg-white object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{currentImage.name}</p>
                  <p className="text-xs font-semibold text-ink-muted">
                    {currentImage.base64Data ? 'Ready to build' : t('live.pinnedBadge')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label={t('live.removeImage')}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink/12 bg-white text-ink-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {canBuildFromVisual ? (
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runQuickIntent('build_reasoning_prep')}
                    className="btn-primary inline-flex w-full items-center justify-center gap-2 text-sm touch-target disabled:opacity-70"
                  >
                    {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {t('live.buildPrepCta')}
                  </button>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5 sm:grid sm:grid-cols-3">
                    {(
                      [
                        ['competing_claims_debate', 'live.quickIntent.debate'],
                        ['spot_mistake', 'live.quickIntent.mistake'],
                        ['simplify_bridge', 'live.quickIntent.simplify'],
                      ] as Array<[QuickIntent, string]>
                    ).map(([intent, labelKey]) => (
                      <button
                        key={intent}
                        type="button"
                        disabled={busy}
                        onClick={() => runQuickIntent(intent)}
                        className="shrink-0 rounded-xl border-2 border-ink/12 bg-white px-3 py-2 text-left text-xs font-bold text-ink-soft hover:border-terracotta/40 hover:text-ink touch-target disabled:opacity-60 sm:shrink"
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {/* Natural page-level conversation thread (no nested scroll trap) */}
      {hasConversation ? (
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === 'teacher' ? (
                <TeacherBubble text={message.text} image={message.imageThumbnail} />
              ) : message.result ? (
                <CoachReply
                  message={message}
                  t={t}
                  loading={loading}
                  pinned={savedCards.some((card) => card.id === message.id)}
                  onChip={fillDraftFromChip}
                  onFollowUp={(label, trigger) => void send(label, trigger)}
                  onPin={() => pinCard(message)}
                />
              ) : null}
            </div>
          ))}
          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-sm font-bold text-ink-muted">
              <LoaderCircle className="h-4 w-4 animate-spin text-terracotta" />
              {t('live.coaching')}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      ) : null}

      {error ? <p className="text-sm font-bold text-red-700 print:hidden">{error}</p> : null}

      {/* Quiet bottom composer (shows inline photo icons only once conversation is underway) */}
      <form
        onSubmit={handleSubmit}
        className="card-warm sticky bottom-[4.5rem] z-20 p-3 shadow-md sm:bottom-3 print:hidden"
      >
        <div className="flex items-end gap-2">
          {hasConversation ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => cameraInputRef.current?.click()}
                aria-label={t('live.takePhoto')}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink/15 bg-white text-ink-soft transition hover:border-terracotta/40 hover:text-terracotta"
              >
                <Camera className="h-5 w-5" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('live.uploadImage')}
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink/15 bg-white text-ink-soft transition hover:border-terracotta/40 hover:text-terracotta sm:inline-flex"
              >
                <Upload className="h-5 w-5" />
              </button>
            </>
          ) : null}
          <textarea
            ref={draftRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void send(draft);
              }
            }}
            rows={1}
            className="min-h-[44px] max-h-28 flex-1 resize-none rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-base text-ink outline-none transition focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/20 sm:text-sm"
            placeholder={hasConversation ? t('live.replyPlaceholder') : t('live.observationLabel')}
          />
          <button
            type="submit"
            disabled={busy || (!draft.trim() && !currentImage?.base64Data)}
            aria-label={t('live.send')}
            className="btn-primary inline-flex h-11 shrink-0 items-center justify-center gap-1.5 px-3.5 text-sm disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="hidden sm:inline">{hasConversation ? t('live.send') : t('live.coachMe')}</span>
          </button>
        </div>
        <div className="mt-1.5">
          <PrivacyNotice compact />
        </div>
      </form>
    </div>
  );
}

function TeacherBubble({ text, image }: { text: string; image?: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] rounded-2xl rounded-br-md border-2 border-terracotta/30 bg-terracotta-bg px-4 py-2.5 text-sm font-semibold text-ink">
        {image ? <img src={image} alt="" className="mb-2 max-h-28 rounded-xl object-contain" /> : null}
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

function CoachReply({
  message,
  t,
  loading,
  pinned,
  onChip,
  onFollowUp,
  onPin,
}: {
  message: ChatMessage;
  t: TranslateFn;
  loading: boolean;
  pinned: boolean;
  onChip: (value: string) => void;
  onFollowUp: (label: string, trigger: string) => void;
  onPin: () => void;
}) {
  const result = message.result;
  if (!result) return null;
  const mode = result.actionMode;
  const ModeIcon = MODE_ICON[mode] || Sparkles;
  const isPrepCard = mode === 'prep_card' && Boolean(result.prepCard);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <div className="card-warm w-full space-y-3 p-3.5 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ModeBadge mode={mode} icon={ModeIcon} t={t} />
            <NeedBadge category={result.readBack.needCategory} />
            <StrategySpotlightBadge strategyId={message.strategy} />
          </div>
          {isPrepCard ? (
            <button
              type="button"
              onClick={onPin}
              disabled={pinned}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-terracotta/35 bg-terracotta-bg px-3 py-1 font-display text-xs font-semibold text-terracotta disabled:opacity-70 print:hidden"
            >
              <Pin className="h-3.5 w-3.5" />
              {pinned ? t('live.pinnedBadge') : t('live.pinCard')}
            </button>
          ) : null}
        </div>

        {isPrepCard && result.prepCard ? (
          <ReasoningPrepCardView
            card={result.prepCard}
            image={message.imageThumbnail}
            t={t}
            loading={loading}
            onFollowUp={onFollowUp}
          />
        ) : (
          <>
            {/* ACTION FIRST: Regain Focus + Active Mode Block */}
            {result.regainFocusLine ? (
              <section className="rounded-2xl border-2 border-terracotta/45 bg-terracotta-bg/70 p-3.5">
                <p className="label-section mb-1 text-terracotta">{t('live.regainFocus')}</p>
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-base font-bold text-ink">{result.regainFocusLine}</p>
                  <CopyButton value={result.regainFocusLine} />
                </div>
                {result.ifItFails ? (
                  <p className="mt-2 text-xs font-semibold text-ink-soft">
                    {t('live.ifItFails')}: {result.ifItFails}
                  </p>
                ) : null}
              </section>
            ) : null}

            {mode === 'diagnose' && result.diagnose ? (
              <DiagnoseBlock diagnose={result.diagnose} t={t} onChip={onChip} />
            ) : null}
            {mode === 'reset' && result.reset ? <ResetBlock reset={result.reset} t={t} /> : null}
            {mode === 'firm_up' && result.firmUp ? <FirmUpBlock firmUp={result.firmUp} t={t} /> : null}

            {result.observeNext ? (
              <div className="rounded-2xl border-2 border-sage/30 bg-sage-bg/50 px-3.5 py-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#1f6b4a]">
                  {t('live.observeNext')}
                </p>
                <p className="mt-0.5 text-sm font-bold text-ink">{result.observeNext}</p>
              </div>
            ) : null}

            {/* Progressive disclosure for diagnostic context & alternative ideas */}
            <details className="rounded-2xl border-2 border-ink/10 bg-white px-3.5 py-2.5">
              <summary className="cursor-pointer list-none font-display text-xs font-semibold text-ink-muted [&::-webkit-details-marker]:hidden touch-target flex items-center justify-between">
                <span>{t('ui.whyThisMove')}</span>
                <ChevronRight className="h-4 w-4" />
              </summary>
              <div className="mt-2.5 space-y-2.5 border-t border-ink/10 pt-2.5 text-sm">
                {result.teacherMirror ? (
                  <p className="font-semibold text-ink">{result.teacherMirror}</p>
                ) : null}
                {result.diagnosis ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="pill-terracotta">
                      {t('live.barrier')}: {result.diagnosis.barrier}
                    </span>
                    <span className="pill-amber">
                      {t('live.confidence')}: {Math.round(result.diagnosis.confidence * 100)}%
                    </span>
                  </div>
                ) : null}
                {result.readBack.summaryEnglish ? (
                  <p className="text-xs text-ink-soft">{result.readBack.summaryEnglish}</p>
                ) : null}
                {result.rationaleNote ? (
                  <p className="text-xs italic text-ink-muted">
                    {t('live.rationaleNote')}: {result.rationaleNote}
                  </p>
                ) : null}
                {result.ideas && result.ideas.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <p className="label-section">{t('live.ideasTitle')}</p>
                    {result.ideas.map((idea, index) => (
                      <button
                        key={`${idea.kind}-${index}`}
                        type="button"
                        onClick={() => onChip(idea.headline)}
                        className="w-full text-left"
                      >
                        <IdeaCard idea={idea} t={t} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          </>
        )}

        {/* AI transparency footer on every generated coach card */}
        <div className="border-t border-ink/10 pt-2.5">
          <AiNotice />
        </div>
      </div>
    </motion.div>
  );
}

function ReasoningPrepCardView({
  card,
  image,
  t,
  loading,
  onFollowUp,
}: {
  card: ReasoningPrepCard;
  image?: string;
  t: TranslateFn;
  loading: boolean;
  onFollowUp: (label: string, trigger: string) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showAll, setShowAll] = useState(false);
  const [langLens, setLangLens] = useState<LangLens>('both');

  const showEn = langLens === 'both' || langLens === 'en';
  const showL1 = langLens === 'both' || langLens === 'l1';

  const context = card.detectedVisualContext;
  const strand1 = card.strand1_dialogicReasoning;
  const strand2 = card.strand2_vocabularyAndEalLadder;
  const strand3 = card.strand3_aflAndTransfer;
  const ladder = strand2.ealProgressionLadder;
  const goal = context.coreConcept || context.pageSummary;
  const boardLines = [
    ladder.rung1_pointAndWord,
    ladder.rung2_twoChoiceCloze,
    ladder.rung3_causalFrameEn,
  ].filter(Boolean);

  const steps: Array<{ num: 1 | 2 | 3; label: string; time: string }> = [
    { num: 1, label: t('live.stepDiscuss'), time: t('live.twoMinutes') },
    { num: 2, label: t('live.stepBoard'), time: t('live.twoMinutes') },
    { num: 3, label: t('live.stepCheck'), time: t('live.oneMinute') },
  ];

  return (
    <div className="space-y-3">
      {/* Compact Goal + Watch Out pills */}
      <div className="flex items-start gap-3">
        {image ? (
          <img
            src={image}
            alt={context.pageSummary}
            className="hidden h-16 w-20 shrink-0 rounded-xl border-2 border-ink/10 bg-white object-contain sm:block"
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          {goal ? (
            <div className="flex items-start gap-2 rounded-2xl border-2 border-sky/30 bg-sky-bg px-3 py-2">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#1c5f8d]" />
              <p className="text-sm font-bold text-ink">
                <span className="text-[#1c5f8d]">{t('live.goal')}:</span> {goal}
              </p>
            </div>
          ) : null}
          {context.commonMisconception ? (
            <div className="flex items-start gap-2 rounded-2xl border-2 border-amber/35 bg-amber-bg px-3 py-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#9e5f06]" />
              <p className="text-sm font-bold text-ink">
                <span className="text-[#9e5f06]">{t('live.watchOut')}:</span> {context.commonMisconception}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Controls: Stepper + Language Lens + All-Steps Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <LanguageLensToggle value={langLens} onChange={setLangLens} />
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="rounded-full border-2 border-ink/12 bg-white px-3 py-1.5 font-display text-xs font-semibold text-ink-soft hover:text-ink"
        >
          {showAll ? t('ui.stepView') : t('ui.showAllSteps')}
        </button>
      </div>

      {!showAll ? (
        <div
          role="tablist"
          aria-label="Lesson routine steps"
          className="grid grid-cols-3 gap-1.5 rounded-2xl border-2 border-ink/10 bg-parchment-dark/65 p-1 print:hidden"
        >
          {steps.map((item) => {
            const active = step === item.num;
            return (
              <button
                key={item.num}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStep(item.num)}
                className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center transition ${
                  active
                    ? 'bg-white text-terracotta shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <span className="font-display text-xs font-bold sm:text-sm">
                  {item.num}. {item.label}
                </span>
                <span className="text-[10px] font-bold opacity-75">{item.time}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* STEP 1: Discuss */}
      <section
        className={`rounded-2xl border-2 border-berry/30 bg-berry-bg/50 p-3.5 sm:p-4 ${
          showAll || step === 1 ? '' : 'hidden print:block'
        }`}
      >
        <StepHeader
          number="1"
          title={t('live.stepDiscuss')}
          minutes={t('live.twoMinutes')}
          icon={Layers3}
          tone="bg-berry-bg text-[#5a379c] border-berry/30"
        />
        <div className="space-y-2">
          <DoLine t={t}>{strand1.visualHookInstruction}</DoLine>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SayAloud t={t} value={strand1.competingClaims.claimA} />
            <SayAloud t={t} value={strand1.competingClaims.claimB} />
          </div>
          <DoLine t={t}>{strand1.waitTimeCue}</DoLine>
          {showEn ? <SayAloud t={t} label={t('live.englishShort')} value={strand1.teacherScriptEn} /> : null}
          {showL1 ? <SayAloud t={t} label={t('live.bridgeShort')} value={strand1.teacherScriptBridge} /> : null}
        </div>
        {!showAll ? (
          <button
            type="button"
            onClick={() => setStep(2)}
            className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2 text-sm print:hidden"
          >
            {t('ui.nextStep')}: 2. {t('live.stepBoard')}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </section>

      {/* STEP 2: Board Words */}
      <section
        className={`rounded-2xl border-2 border-sky/30 bg-sky-bg/50 p-3.5 sm:p-4 ${
          showAll || step === 2 ? '' : 'hidden print:block'
        }`}
      >
        <StepHeader
          number="2"
          title={t('live.stepBoard')}
          minutes={t('live.twoMinutes')}
          icon={PencilLine}
          tone="bg-sky-bg text-[#1c5f8d] border-sky/30"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { title: t('live.wordsToPoint'), words: strand2.contentNouns },
            { title: t('live.wordsForReasons'), words: strand2.relationalConnectors },
          ].map((group) =>
            group.words.length > 0 ? (
              <div key={group.title} className="rounded-2xl border-2 border-sky/20 bg-white p-3">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#1c5f8d]">
                  {group.title}
                </p>
                <div className="space-y-1.5">
                  {group.words.map((word) => (
                    <p key={`${word.en}-${word.l1Bridge}`} className="font-display text-base font-bold text-ink">
                      {showEn ? word.en : null}
                      {showEn && showL1 && word.l1Bridge ? (
                        <span className="ml-2 font-body text-sm font-semibold text-[#1c5f8d]">
                          ↔ {word.l1Bridge}
                        </span>
                      ) : !showEn && showL1 ? (
                        word.l1Bridge || word.en
                      ) : null}
                    </p>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
        <div className="mt-2.5">
          <DoLine t={t}>{t('live.boardDo')}</DoLine>
        </div>
        <div className="mt-2.5 rounded-2xl border-2 border-emerald-900 bg-emerald-950 p-3.5 text-emerald-50 shadow-inner">
          <p className="mb-2.5 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-emerald-200">
            <PencilLine className="h-4 w-4" />
            {t('live.writeOnBoard')}
          </p>
          <ol className="space-y-2.5">
            {boardLines.map((line, index) => (
              <li key={`${index}-${line}`} className="flex items-start gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 font-display text-sm font-bold text-emerald-200">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {showEn ? <p className="text-base font-bold leading-snug text-white">{line}</p> : null}
                  {showL1 && index === 2 && ladder.rung3_causalFrameL1 ? (
                    <p className="mt-1 border-t border-emerald-800 pt-1 text-sm text-emerald-100">
                      {ladder.rung3_causalFrameL1}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
        {!showAll ? (
          <button
            type="button"
            onClick={() => setStep(3)}
            className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2 text-sm print:hidden"
          >
            {t('ui.nextStep')}: 3. {t('live.stepCheck')}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </section>

      {/* STEP 3: Finger Check */}
      <section
        className={`rounded-2xl border-2 border-sage/35 bg-sage-bg/55 p-3.5 sm:p-4 ${
          showAll || step === 3 ? '' : 'hidden print:block'
        }`}
      >
        <StepHeader
          number="3"
          title={t('live.stepCheck')}
          minutes={t('live.oneMinute')}
          icon={Hand}
          tone="bg-sage-bg text-[#1f6b4a] border-sage/35"
        />
        <div className="space-y-2">
          <DoLine t={t}>{t('live.fingerVoteDo')}</DoLine>
          <SayAloud t={t} value={strand3.fingerVotePrompt} />
          <div className="space-y-2">
            {strand3.options.map((option) => {
              const isCorrect = option.diagnosticTag === 'correct_reasoning';
              return (
                <div
                  key={`${option.finger}-${option.text}`}
                  className={`flex flex-wrap items-center gap-2.5 rounded-2xl border-2 px-3 py-2.5 ${
                    isCorrect
                      ? 'border-sage bg-sage-bg'
                      : 'border-ink/10 bg-white'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-base font-bold ${
                      isCorrect ? 'bg-sage text-white' : 'bg-parchment-dark text-ink-muted'
                    }`}
                  >
                    {option.finger}
                  </span>
                  <p className="min-w-40 flex-1 text-base font-bold text-ink">{option.text}</p>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 font-display text-xs font-bold text-[#1f6b4a]">
                      <CheckCircle2 className="h-4 w-4" />
                      {t('live.correctFinger', { count: String(option.finger) })}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        {strand3.whatIfTransferTwist.promptEn ? (
          <details className="mt-3 rounded-2xl border-2 border-sage/30 bg-white p-3">
            <summary className="cursor-pointer font-display text-sm font-bold text-[#1f6b4a]">
              {t('live.earlyFinishers')}
            </summary>
            <div className="mt-2 space-y-2">
              {showEn ? (
                <SayAloud t={t} label={t('live.englishShort')} value={strand3.whatIfTransferTwist.promptEn} />
              ) : null}
              {showL1 ? (
                <SayAloud t={t} label={t('live.bridgeShort')} value={strand3.whatIfTransferTwist.promptBridge} />
              ) : null}
              {strand3.whatIfTransferTwist.expectedReasoning ? (
                <p className="text-xs font-semibold text-ink-soft">
                  <span className="font-extrabold">{t('live.listenFor')}:</span>{' '}
                  {strand3.whatIfTransferTwist.expectedReasoning}
                </p>
              ) : null}
            </div>
          </details>
        ) : null}
      </section>

      {card.followUpChips.length > 0 ? (
        <section className="rounded-2xl border-2 border-terracotta/30 bg-terracotta-bg/50 p-3 print:hidden">
          <p className="label-section mb-2">{t('live.followUpTitle')}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {card.followUpChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                disabled={loading}
                onClick={() => onFollowUp(chip.label, chip.id)}
                className="rounded-xl border-2 border-terracotta/30 bg-white px-3 py-2 text-left text-xs font-bold text-ink hover:border-terracotta touch-target disabled:opacity-60"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StepHeader({
  number,
  title,
  minutes,
  icon: Icon,
  tone,
}: {
  number: string;
  title: string;
  minutes: string;
  icon: typeof Lightbulb;
  tone: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="flex-1 font-display text-lg font-bold text-ink">
        <span className="mr-1.5 text-ink-muted">{number}.</span>
        {title}
      </p>
      <span className={`rounded-full border-2 px-2.5 py-0.5 font-display text-xs font-bold tabular-nums ${tone}`}>
        {minutes}
      </span>
    </div>
  );
}

function DoLine({ children, t }: { children: string; t: TranslateFn }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 rounded-2xl border-2 border-ink/10 bg-white/80 px-3 py-2">
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase text-white">
        <ArrowRight className="h-3 w-3" />
        {t('live.do')}
      </span>
      <p className="text-sm font-bold text-ink-soft">{children}</p>
    </div>
  );
}

function SayAloud({ value, label, t }: { value: string; label?: string; t: TranslateFn }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border-2 border-ink/15 bg-white p-3 text-ink shadow-[0_2px_0_rgba(39,34,32,0.06)]">
      <p className="mb-1 flex items-center gap-1.5 font-display text-xs font-bold uppercase text-terracotta">
        <Volume2 className="h-4 w-4" />
        {t('live.say')}
        {label ? <span className="text-ink-muted">· {label}</span> : null}
      </p>
      <p className="text-base font-bold leading-snug sm:text-lg">{value}</p>
    </div>
  );
}

function DiagnoseBlock({
  diagnose,
  t,
  onChip,
}: {
  diagnose: NonNullable<LiveCoachResult['diagnose']>;
  t: TranslateFn;
  onChip: (value: string) => void;
}) {
  const options = (diagnose.clarifyingOptions || []).filter(Boolean);
  return (
    <section className="rounded-2xl border-2 border-sky/30 bg-sky-bg/50 p-3.5">
      {diagnose.hypothesis ? <p className="text-sm font-semibold text-ink-soft">{diagnose.hypothesis}</p> : null}
      {diagnose.clarifyingQuestion ? (
        <p className="mt-1.5 text-base font-bold text-ink">{diagnose.clarifyingQuestion}</p>
      ) : null}
      {options.length ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {options.map((option, index) => (
            <button
              key={`${option}-${index}`}
              type="button"
              onClick={() => onChip(option)}
              className="rounded-full border-2 border-sky/40 bg-white px-3.5 py-2 font-display text-xs font-semibold text-[#1c5f8d] transition hover:bg-sky-bg touch-target"
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ResetBlock({ reset, t }: { reset: NonNullable<LiveCoachResult['reset']>; t: TranslateFn }) {
  return (
    <section className="rounded-2xl border-2 border-sage/35 bg-sage-bg/50 p-3.5">
      <p className="label-section mb-1.5 text-[#1f6b4a]">{t('live.mode.reset')}</p>
      {reset.eefPrinciple?.principle ? (
        <p className="text-sm font-bold text-ink">{reset.eefPrinciple.principle}</p>
      ) : null}
      {(reset.resetActionSteps || []).filter(Boolean).length ? (
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm font-semibold text-ink-soft">
          {reset.resetActionSteps.filter(Boolean).map((step, index) => (
            <li key={`${step}-${index}`}>{step}</li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function FirmUpBlock({ firmUp, t }: { firmUp: NonNullable<LiveCoachResult['firmUp']>; t: TranslateFn }) {
  const move = firmUp.talkMove;
  const frames = (firmUp.bilingualSentenceFrames || []).filter((frame) => frame && (frame.en || frame.bridge));
  return (
    <section className="rounded-2xl border-2 border-berry/30 bg-berry-bg/45 p-3.5">
      {move ? (
        <div>
          <p className="font-display text-base font-bold text-ink">
            {move.talkMoveName}
            {move.offPalette ? <OffPaletteTag t={t} /> : null}
          </p>
          <SayLine label={t('live.sayEnglish')} value={move.sayNowEnglish} tone="en" />
          <SayLine label={t('live.sayBridge')} value={move.sayNowBridge} tone="l1" />
        </div>
      ) : null}
      {frames.length ? (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-muted">
            {t('live.bilingualFrames')}
          </p>
          <ul className="space-y-1.5">
            {frames.map((frame, index) => (
              <li
                key={`${frame.en}-${index}`}
                className="flex items-start justify-between gap-2 rounded-2xl border-2 border-ink/10 bg-white px-3 py-2 text-sm text-ink-soft"
              >
                <span className="flex-1">
                  <span className="font-bold text-ink">{frame.en}</span>
                  {frame.bridge ? <span className="text-ink-muted"> · {frame.bridge}</span> : null}
                </span>
                <CopyButton value={frame.en + (frame.bridge ? ` — ${frame.bridge}` : '')} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {firmUp.phrasingTip && (firmUp.phrasingTip.tipMalay || firmUp.phrasingTip.tipIban) ? (
        <div className="mt-2">
          {firmUp.phrasingTip.tipMalay ? <SayLine label={t('live.tipMalay')} value={firmUp.phrasingTip.tipMalay} tone="l1" /> : null}
          {firmUp.phrasingTip.tipIban ? <SayLine label={t('live.tipIban')} value={firmUp.phrasingTip.tipIban} tone="l1" /> : null}
        </div>
      ) : null}
    </section>
  );
}

const IDEA_META: Record<Idea['kind'], { icon: typeof Lightbulb; tone: string; labelKey: string }> = {
  'alternative-move': { icon: Sparkles, tone: 'border-sky/35 bg-sky-bg text-[#1c5f8d]', labelKey: 'live.ideaKind.alternative-move' },
  'root-cause': { icon: Lightbulb, tone: 'border-sage/35 bg-sage-bg text-[#1f6b4a]', labelKey: 'live.ideaKind.root-cause' },
  'missed-angle': { icon: Lightbulb, tone: 'border-berry/35 bg-berry-bg text-[#5a379c]', labelKey: 'live.ideaKind.missed-angle' },
  risk: { icon: TriangleAlert, tone: 'border-amber/40 bg-amber-bg text-[#9e5f06]', labelKey: 'live.ideaKind.risk' },
  'beyond-palette': { icon: Lightbulb, tone: 'border-teal-300 bg-teal-50 text-teal-800', labelKey: 'live.ideaKind.beyond-palette' },
};

function ModeBadge({ mode, icon: Icon, t }: { mode: ActionMode; icon: typeof Lightbulb; t: TranslateFn }) {
  const tone =
    mode === 'diagnose'
      ? 'border-sky/35 bg-sky-bg text-[#1c5f8d]'
      : mode === 'reset'
        ? 'border-sage/35 bg-sage-bg text-[#1f6b4a]'
        : mode === 'prep_card'
          ? 'border-terracotta/35 bg-terracotta-bg text-terracotta'
          : 'border-berry/35 bg-berry-bg text-[#5a379c]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 font-display text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {t(`live.mode.${mode}`)}
    </span>
  );
}

function OffPaletteTag({ t }: { t: TranslateFn }) {
  return (
    <span className="ml-2 inline-block rounded-full border border-teal-300 bg-teal-50 px-2 py-0.5 align-middle font-display text-[10px] font-bold uppercase text-teal-800">
      {t('live.offPalette')}
    </span>
  );
}

function IdeaCard({ idea, t }: { idea: Idea; t: TranslateFn }) {
  const meta = IDEA_META[idea.kind] || IDEA_META['missed-angle'];
  const Icon = meta.icon;
  return (
    <div className="rounded-2xl border-2 border-ink/10 bg-parchment-light p-3">
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-display text-[11px] font-semibold ${meta.tone}`}>
        <Icon className="h-3 w-3" />
        {t(meta.labelKey)}
      </span>
      <p className="mt-1.5 text-sm font-bold text-ink">{idea.headline}</p>
      {idea.detail ? <p className="mt-0.5 text-xs text-ink-soft">{idea.detail}</p> : null}
    </div>
  );
}
