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
import {
  CopyButton,
  NeedBadge,
  SayLine,
  SelectField,
  StartNewButton,
  languages,
  subjectLabel,
  subjects,
  yearLevels,
  type NeedCategory,
} from './coach-ui';

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

export default function LiveCoach() {
  const { t } = useLang();
  const [yearLevel, setYearLevel, resetYearLevel] = usePersistentState('tmb.live.yearLevel', '4');
  const [subject, setSubject, resetSubject] = usePersistentState('tmb.live.subject', 'science');
  const [dominantLanguage, setDominantLanguage, resetDominantLanguage] = usePersistentState(
    'tmb.live.dominantLanguage',
    'iban',
  );
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const hasConversation = messages.length > 0;
  const canBuildFromVisual = Boolean(currentImage?.base64Data || visionSummary);
  const busy = loading || processingImage;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

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
    resetYearLevel();
    resetSubject();
    resetDominantLanguage();
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

    try {
      const response = await fetch('/api/live-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread: nextMessages.map((msg) => ({ role: msg.role, text: msg.text })),
          yearLevel,
          subject,
          dominantLanguage,
          actionTrigger,
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
      setError(requestError instanceof Error ? requestError.message : t('live.errors.failed'));
    } finally {
      setLoading(false);
      draftRef.current?.focus();
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
    <div onPaste={handlePaste} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 print:hidden">
        <p className="max-w-xl text-xs text-ink-muted">{t('live.threadHint')}</p>
        <StartNewButton onClear={clearTab} />
      </div>

      <div className="card-warm p-4 sm:p-5 md:p-6 print:hidden">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectField
            label={t('live.yearLabel')}
            value={yearLevel}
            onChange={setYearLevel}
            options={yearLevels.map((year) => ({ value: year, label: `Year ${year}` }))}
          />
          <SelectField
            label={t('live.subjectLabel')}
            value={subject}
            onChange={setSubject}
            options={subjects.map((item) => ({ value: item, label: subjectLabel(item) }))}
          />
          <SelectField
            label={t('live.languageLabel')}
            value={dominantLanguage}
            onChange={setDominantLanguage}
            options={languages.map((language) => ({
              value: language,
              label: language
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
            }))}
          />
        </div>
      </div>

      {savedCards.length > 0 ? (
        <section className="card-warm mt-3 p-4 print:hidden">
          <p className="label-section mb-2">{t('live.pinnedTitle')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {savedCards.map((card) => (
              <div
                key={card.id}
                className="min-w-56 max-w-64 rounded-lg border border-ink/10 bg-white/60 p-2"
              >
                <p className="truncate text-xs font-semibold text-ink">
                  Year {card.yearLevel} · {subjectLabel(card.subject)}
                </p>
                <p className="mt-0.5 line-clamp-2 min-h-8 text-[11px] text-ink-muted">
                  {card.result.prepCard?.detectedVisualContext.pageSummary || card.result.teacherMirror}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => loadPinnedCard(card)}
                    className="flex-1 rounded-md border border-terracotta/30 bg-terracotta/10 px-2 py-1.5 text-[11px] font-semibold text-terracotta"
                  >
                    {t('live.openPinned')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('live.unpin')}
                    onClick={() => setSavedCards((prev) => prev.filter((saved) => saved.id !== card.id))}
                    className="rounded-md border border-ink/15 px-2 py-1.5 text-ink-muted hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card-warm mt-3 p-4 sm:p-5 print:hidden">
        <p className="label-section mb-1">{t('live.screenshotTitle')}</p>
        <p className="mb-3 text-xs text-ink-muted">{t('live.screenshotHint')}</p>

        <div className="rounded-xl border-2 border-dashed border-terracotta/30 bg-white/40 p-3">
          {currentImage ? (
            <div className="flex flex-wrap items-center gap-3">
              <img
                src={currentImage.thumbnailDataUrl}
                alt={currentImage.name}
                className="h-24 w-32 rounded-lg border border-ink/10 bg-white object-contain"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{currentImage.name}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {currentImage.base64Data ? '1024px JPEG · ready to analyse' : t('live.pinnedBadge')}
                </p>
              </div>
              <button
                type="button"
                onClick={removeImage}
                className="inline-flex items-center gap-1 rounded-lg border border-ink/15 px-2.5 py-2 text-xs font-semibold text-ink-muted hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
                {t('live.removeImage')}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-ink/20 bg-white/70 px-3 py-2 text-xs font-semibold text-ink hover:bg-white touch-target"
              >
                <Upload className="h-4 w-4" />
                {t('live.uploadImage')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-ink/20 bg-white/70 px-3 py-2 text-xs font-semibold text-ink hover:bg-white touch-target"
              >
                <Camera className="h-4 w-4" />
                {t('live.takePhoto')}
              </button>
            </div>
          )}
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
        </div>

        {processingImage ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            {t('live.processingImage')}
          </p>
        ) : null}

        {canBuildFromVisual ? (
          <div className="mt-3 space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => runQuickIntent('build_reasoning_prep')}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm touch-target disabled:opacity-70"
            >
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {t('live.buildPrepCta')}
            </button>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
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
                  className="rounded-lg border border-ink/15 bg-white/60 px-3 py-2 text-left text-xs font-semibold text-ink-soft hover:bg-white touch-target disabled:opacity-60"
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {!hasConversation ? (
        <form onSubmit={handleSubmit} className="card-warm mt-3 p-4 sm:p-5 print:hidden">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t('live.observationLabel')}
            </span>
            <textarea
              ref={draftRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-24 w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
              placeholder={t('live.observationPlaceholder')}
            />
          </label>
          <p className="mt-1 text-xs text-ink-muted">{t('live.observationHint')}</p>
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="btn-primary mt-4 inline-flex items-center gap-2 rounded-lg touch-target disabled:opacity-70"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {loading ? t('live.coaching') : t('live.coachMe')}
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700 print:hidden">{error}</p> : null}

      {hasConversation ? (
        <div
          ref={scrollRef}
          className="mt-3 max-h-[75vh] space-y-4 overflow-y-auto pr-1 print:max-h-none print:overflow-visible"
        >
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
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {t('live.coaching')}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasConversation ? (
        <form onSubmit={handleSubmit} className="card-warm mt-3 p-3 sm:p-4 print:hidden">
          <div className="flex items-end gap-2">
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
              rows={2}
              className="min-h-12 flex-1 rounded-lg border border-ink/15 bg-white/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/20"
              placeholder={t('live.replyPlaceholder')}
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="btn-primary inline-flex h-12 items-center gap-2 rounded-lg px-4 touch-target disabled:opacity-70"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{t('live.send')}</span>
            </button>
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">{t('live.replyHint')}</p>
        </form>
      ) : null}
    </div>
  );
}

function TeacherBubble({ text, image }: { text: string; image?: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-terracotta/20 bg-terracotta/10 px-4 py-2.5 text-sm text-ink">
        {image ? <img src={image} alt="" className="mb-2 max-h-32 rounded-lg object-contain" /> : null}
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
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="w-full max-w-[96%] space-y-3 rounded-2xl rounded-bl-sm border border-ink/10 bg-parchment-light/70 p-3 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-terracotta" />
          {!isPrepCard ? <p className="flex-1 text-sm font-semibold text-ink">{message.text}</p> : null}
          <ModeBadge mode={mode} icon={ModeIcon} t={t} />
          {isPrepCard ? (
            <button
              type="button"
              onClick={onPin}
              disabled={pinned}
              className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/30 bg-terracotta/10 px-2.5 py-1 text-[10px] font-bold text-terracotta disabled:opacity-70 print:hidden"
            >
              <Pin className="h-3 w-3" />
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
            <section className="rounded-lg border border-ink/10 bg-white/60 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="label-section">{t('live.readBack')}</p>
                <NeedBadge category={result.readBack.needCategory} />
                {result.readBack.detectedLanguage ? (
                  <span className="rounded-full border border-ink/10 bg-white/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                    {t('live.detectedLanguage')}: {result.readBack.detectedLanguage}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-ink-soft">{result.readBack.summaryEnglish}</p>
              {result.readBack.summaryBridge ? (
                <p className="mt-1 text-sm italic text-ink-muted">{result.readBack.summaryBridge}</p>
              ) : null}
            </section>

            {result.diagnosis ? (
              <section className="rounded-lg border border-ink/10 bg-white/60 p-3">
                <p className="label-section mb-2">{t('live.diagnosisTitle')}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-terracotta/30 bg-terracotta/10 px-2.5 py-1 text-xs font-bold text-ink">
                    {t('live.barrier')}: {result.diagnosis.barrier}
                  </span>
                  <span className="rounded-full border border-ink/10 bg-white/60 px-2.5 py-1 text-xs font-semibold text-ink-muted">
                    {t('live.confidence')}: {Math.round(result.diagnosis.confidence * 100)}%
                  </span>
                </div>
                {result.diagnosis.evidence ? (
                  <p className="mt-2 text-xs text-ink-muted">{result.diagnosis.evidence}</p>
                ) : null}
              </section>
            ) : null}

            {result.teacherMirror ? (
              <section className="rounded-lg border border-ink/10 bg-white/60 p-3">
                <p className="label-section mb-1">{t('live.teacherMirror')}</p>
                <p className="text-sm text-ink-soft">{result.teacherMirror}</p>
              </section>
            ) : null}

            {mode === 'diagnose' && result.diagnose ? (
              <DiagnoseBlock diagnose={result.diagnose} t={t} onChip={onChip} />
            ) : null}
            {mode === 'reset' && result.reset ? <ResetBlock reset={result.reset} t={t} /> : null}
            {mode === 'firm_up' && result.firmUp ? <FirmUpBlock firmUp={result.firmUp} t={t} /> : null}
          </>
        )}

        {!isPrepCard && result.rationaleNote ? (
          <p className="text-xs italic text-ink-muted">
            {t('live.rationaleNote')}: {result.rationaleNote}
          </p>
        ) : null}

        {!isPrepCard && result.ideas && result.ideas.length > 0 ? (
          <section className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-3">
            <p className="label-section mb-1 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
              {t('live.ideasTitle')}
            </p>
            <p className="mb-2 text-[11px] text-ink-muted">{t('live.ideasHint')}</p>
            <div className="space-y-2">
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
          </section>
        ) : null}

        {!isPrepCard && result.observeNext ? (
          <section className="rounded-lg border border-ink/10 bg-white/50 p-3">
            <p className="label-section mb-1">{t('live.observeNext')}</p>
            <p className="text-sm font-semibold text-ink">{result.observeNext}</p>
          </section>
        ) : null}

        {!isPrepCard && result.regainFocusLine ? (
          <section className="rounded-lg border-2 border-terracotta/40 bg-terracotta/5 p-3">
            <p className="label-section mb-1">{t('live.regainFocus')}</p>
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1 text-base font-semibold text-ink">{result.regainFocusLine}</p>
              <CopyButton value={result.regainFocusLine} />
            </div>
            {result.ifItFails ? (
              <p className="mt-2 text-xs text-ink-muted">
                {t('live.ifItFails')}: {result.ifItFails}
              </p>
            ) : null}
          </section>
        ) : null}
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

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-ink/10 bg-white/70 p-3">
        <div className="flex items-start gap-3">
          {image ? (
            <img
              src={image}
              alt={context.pageSummary}
              className="hidden h-16 w-20 shrink-0 rounded-lg border border-ink/10 bg-white object-contain sm:block"
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-2">
            {goal ? (
              <div className="flex items-start gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                <p className="text-sm font-semibold text-ink">
                  <span className="text-sky-800">{t('live.goal')}:</span> {goal}
                </p>
              </div>
            ) : null}
            {context.commonMisconception ? (
              <div className="flex items-start gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <p className="text-sm font-semibold text-ink">
                  <span className="text-amber-800">{t('live.watchOut')}:</span>{' '}
                  {context.commonMisconception}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 sm:p-4">
        <StepHeader
          number="1"
          title={t('live.stepDiscuss')}
          minutes={t('live.twoMinutes')}
          icon={Layers3}
          tone="bg-violet-100 text-violet-800"
        />
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-violet-700">
          {strand1.talkMoveId}
        </p>
        <div className="space-y-2">
          <DoLine t={t}>{strand1.visualHookInstruction}</DoLine>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SayAloud t={t} value={strand1.competingClaims.claimA} />
            <SayAloud t={t} value={strand1.competingClaims.claimB} />
          </div>
          <DoLine t={t}>{strand1.waitTimeCue}</DoLine>
          <SayAloud t={t} label={t('live.englishShort')} value={strand1.teacherScriptEn} />
          <SayAloud t={t} label={t('live.bridgeShort')} value={strand1.teacherScriptBridge} />
        </div>
      </section>

      <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 sm:p-4">
        <StepHeader
          number="2"
          title={t('live.stepBoard')}
          minutes={t('live.twoMinutes')}
          icon={PencilLine}
          tone="bg-sky-100 text-sky-800"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { title: t('live.wordsToPoint'), words: strand2.contentNouns },
            { title: t('live.wordsForReasons'), words: strand2.relationalConnectors },
          ].map((group) =>
            group.words.length > 0 ? (
              <div key={group.title} className="rounded-lg border border-sky-200 bg-white/70 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                  {group.title}
                </p>
                <div className="space-y-1.5">
                  {group.words.map((word) => (
                    <p key={`${word.en}-${word.l1Bridge}`} className="text-base font-bold text-ink">
                      {word.en}
                      {word.l1Bridge ? (
                        <span className="ml-2 text-sm font-normal text-sky-800">↔ {word.l1Bridge}</span>
                      ) : null}
                    </p>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
        <div className="mt-3">
          <DoLine t={t}>{t('live.boardDo')}</DoLine>
        </div>
        <div className="mt-2 rounded-xl border border-emerald-950 bg-emerald-950 p-3 text-emerald-50 shadow-inner sm:p-4">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
            <PencilLine className="h-4 w-4" />
            {t('live.writeOnBoard')}
          </p>
          <ol className="space-y-3">
            {boardLines.map((line, index) => (
              <li key={`${index}-${line}`} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-600 text-sm font-bold text-emerald-200">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-snug text-white sm:text-lg">{line}</p>
                  {index === 2 && ladder.rung3_causalFrameL1 ? (
                    <p className="mt-1 border-t border-emerald-800 pt-1 text-sm text-emerald-100">
                      {ladder.rung3_causalFrameL1}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4">
        <StepHeader
          number="3"
          title={t('live.stepCheck')}
          minutes={t('live.oneMinute')}
          icon={Hand}
          tone="bg-emerald-100 text-emerald-800"
        />
        <div className="space-y-2">
          <DoLine t={t}>{t('live.fingerVoteDo')}</DoLine>
          <SayAloud t={t} value={strand3.fingerVotePrompt} />
          <div className="space-y-1.5">
            {strand3.options.map((option) => {
              const isCorrect = option.diagnosticTag === 'correct_reasoning';
              return (
                <div
                  key={`${option.finger}-${option.text}`}
                  className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-100 ring-1 ring-emerald-400'
                      : 'border-ink/10 bg-white/70'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-ink/5 text-ink-muted'
                  }`}>
                    {option.finger}
                  </span>
                  <p className="min-w-40 flex-1 text-base font-semibold text-ink">{option.text}</p>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-emerald-800">
                      <CheckCircle2 className="h-5 w-5" />
                      {t('live.correctFinger', { count: String(option.finger) })}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        {strand3.whatIfTransferTwist.promptEn ? (
          <details className="mt-3 rounded-lg border border-emerald-300 bg-white/70 p-3">
            <summary className="cursor-pointer text-sm font-bold text-emerald-800">
              {t('live.earlyFinishers')}
            </summary>
            <div className="mt-2 space-y-2">
              <SayAloud t={t} label={t('live.englishShort')} value={strand3.whatIfTransferTwist.promptEn} />
              <SayAloud t={t} label={t('live.bridgeShort')} value={strand3.whatIfTransferTwist.promptBridge} />
              {strand3.whatIfTransferTwist.expectedReasoning ? (
                <p className="text-xs text-ink-soft">
                  <span className="font-bold">{t('live.listenFor')}:</span>{' '}
                  {strand3.whatIfTransferTwist.expectedReasoning}
                </p>
              ) : null}
            </div>
          </details>
        ) : null}
      </section>

      {card.followUpChips.length > 0 ? (
        <section className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 print:hidden">
          <p className="label-section mb-2">{t('live.followUpTitle')}</p>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            {card.followUpChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                disabled={loading}
                onClick={() => onFollowUp(chip.label, chip.id)}
                className="rounded-lg border border-terracotta/30 bg-white/70 px-3 py-2 text-left text-xs font-semibold text-ink hover:bg-white touch-target disabled:opacity-60"
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
    <div className="mb-3 flex items-center gap-2">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="flex-1 text-lg font-bold text-ink">
        <span className="mr-2 text-ink-muted">{number}</span>
        {title}
      </p>
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{minutes}</span>
    </div>
  );
}

function DoLine({ children, t }: { children: string; t: TranslateFn }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-ink/10 bg-white/50 px-3 py-2">
      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-ink/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
        <ArrowRight className="h-3 w-3" />
        {t('live.do')}
      </span>
      <p className="pt-0.5 text-sm font-semibold text-ink-soft">{children}</p>
    </div>
  );
}

function SayAloud({ value, label, t }: { value: string; label?: string; t: TranslateFn }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-ink/20 bg-white p-3 text-ink shadow-sm">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
        <Volume2 className="h-4 w-4 text-terracotta" />
        {t('live.say')}
        {label ? <span>· {label}</span> : null}
      </p>
      <p className="text-base font-semibold leading-snug sm:text-lg">{value}</p>
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
    <section className="rounded-lg border border-sky-200/60 bg-sky-50/40 p-3">
      <p className="label-section mb-2 flex items-center gap-1.5">
        <Stethoscope className="h-3.5 w-3.5 text-sky-700" />
        {t('live.mode.diagnose')}
      </p>
      {diagnose.hypothesis ? <p className="text-sm text-ink-soft">{diagnose.hypothesis}</p> : null}
      {diagnose.clarifyingQuestion ? (
        <p className="mt-2 text-sm font-semibold text-ink">{diagnose.clarifyingQuestion}</p>
      ) : null}
      {options.length ? (
        <>
          <p className="mt-2 text-[11px] text-ink-muted">{t('live.tapHint')}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {options.map((option, index) => (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => onChip(option)}
                className="rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-800 transition hover:bg-sky-100 touch-target"
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ResetBlock({ reset, t }: { reset: NonNullable<LiveCoachResult['reset']>; t: TranslateFn }) {
  return (
    <section className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-3">
      <p className="label-section mb-2 flex items-center gap-1.5">
        <RefreshCw className="h-3.5 w-3.5 text-emerald-700" />
        {t('live.mode.reset')}
      </p>
      {reset.eefPrinciple?.principleId ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-ink/10 bg-white/60 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ink-muted">
            {reset.eefPrinciple.principleId}
          </span>
          {reset.eefPrinciple.checkAdaptAction ? (
            <span className="rounded-full border border-terracotta/30 bg-terracotta/10 px-2.5 py-1 text-xs font-bold text-ink">
              {reset.eefPrinciple.checkAdaptAction}
            </span>
          ) : null}
        </div>
      ) : null}
      {reset.eefPrinciple?.principle ? <p className="text-sm font-semibold text-ink">{reset.eefPrinciple.principle}</p> : null}
      {reset.eefPrinciple?.whyThisFits ? <p className="mt-1 text-xs text-ink-muted">{reset.eefPrinciple.whyThisFits}</p> : null}
      {(reset.resetActionSteps || []).filter(Boolean).length ? (
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-ink-soft">
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
    <section className="rounded-lg border border-violet-200/60 bg-violet-50/40 p-3">
      <p className="label-section mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-700" />
        {t('live.mode.firm_up')}
      </p>
      {firmUp.eefRationale ? <p className="text-xs italic text-ink-muted">{firmUp.eefRationale}</p> : null}
      {move ? (
        <div className="mt-2 rounded-lg border border-ink/10 bg-white/50 px-3 py-2">
          <p className="text-sm font-semibold text-ink">
            {move.talkMoveId ? <span className="font-mono text-xs text-ink-muted">{move.talkMoveId} </span> : null}
            {move.talkMoveName}
            {move.offPalette ? <OffPaletteTag t={t} /> : null}
          </p>
          {move.why ? <p className="mt-1 text-xs text-ink-muted">{move.why}</p> : null}
          <SayLine label={t('live.sayEnglish')} value={move.sayNowEnglish} />
          <SayLine label={t('live.sayBridge')} value={move.sayNowBridge} />
        </div>
      ) : null}
      {frames.length ? (
        <div className="mt-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('live.bilingualFrames')}</p>
          <ul className="space-y-1.5">
            {frames.map((frame, index) => (
              <li key={`${frame.en}-${index}`} className="flex items-start justify-between gap-2 rounded-lg border border-ink/10 bg-white/50 px-3 py-2 text-sm text-ink-soft">
                <span className="flex-1">
                  <span className="font-semibold text-ink">{frame.en}</span>
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
          {firmUp.phrasingTip.tipMalay ? <SayLine label={t('live.tipMalay')} value={firmUp.phrasingTip.tipMalay} /> : null}
          {firmUp.phrasingTip.tipIban ? <SayLine label={t('live.tipIban')} value={firmUp.phrasingTip.tipIban} /> : null}
        </div>
      ) : null}
    </section>
  );
}

const IDEA_META: Record<Idea['kind'], { icon: typeof Lightbulb; tone: string; labelKey: string }> = {
  'alternative-move': { icon: Sparkles, tone: 'border-sky-200 bg-sky-50 text-sky-700', labelKey: 'live.ideaKind.alternative-move' },
  'root-cause': { icon: Lightbulb, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', labelKey: 'live.ideaKind.root-cause' },
  'missed-angle': { icon: Lightbulb, tone: 'border-violet-200 bg-violet-50 text-violet-700', labelKey: 'live.ideaKind.missed-angle' },
  risk: { icon: TriangleAlert, tone: 'border-amber-200 bg-amber-50 text-amber-700', labelKey: 'live.ideaKind.risk' },
  'beyond-palette': { icon: Lightbulb, tone: 'border-teal-200 bg-teal-50 text-teal-700', labelKey: 'live.ideaKind.beyond-palette' },
};

function ModeBadge({ mode, icon: Icon, t }: { mode: ActionMode; icon: typeof Lightbulb; t: TranslateFn }) {
  const tone =
    mode === 'diagnose'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : mode === 'reset'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : mode === 'prep_card'
          ? 'border-terracotta/30 bg-terracotta/10 text-terracotta'
          : 'border-violet-200 bg-violet-50 text-violet-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
      <Icon className="h-3 w-3" />
      {t(`live.mode.${mode}`)}
    </span>
  );
}

function OffPaletteTag({ t }: { t: TranslateFn }) {
  return (
    <span className="ml-2 inline-block rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-teal-700">
      {t('live.offPalette')}
    </span>
  );
}

function IdeaCard({ idea, t }: { idea: Idea; t: TranslateFn }) {
  const meta = IDEA_META[idea.kind] || IDEA_META['missed-angle'];
  const Icon = meta.icon;
  return (
    <div className="rounded-lg border border-ink/10 bg-white/70 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.tone}`}>
          <Icon className="h-3 w-3" />
          {t(meta.labelKey)}
        </span>
        {idea.talkMoveId ? (
          <span className="font-mono text-[11px] text-ink-muted">
            {idea.talkMoveId}
            {idea.offPalette ? <OffPaletteTag t={t} /> : null}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{idea.headline}</p>
      {idea.detail ? <p className="mt-0.5 text-xs text-ink-soft">{idea.detail}</p> : null}
      {idea.sayNowEnglish ? <SayLine label={t('live.sayEnglish')} value={idea.sayNowEnglish} /> : null}
      {idea.sayNowBridge ? <SayLine label={t('live.sayBridge')} value={idea.sayNowBridge} /> : null}
    </div>
  );
}
