// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { Check } from 'lucide-react';

export type StudentMood = 'engaged' | 'neutral' | 'disengaged';

type CharacterStyle = {
  skin: string;
  cheek: string;
  shirt: string;
  shirtShade: string;
  hair: string;
  accessory: 'tudung' | 'curls' | 'glasses' | 'tuft';
  accent: string;
};

const CHARACTER_STYLES: Record<string, CharacterStyle> = {
  studentA: {
    skin: '#d99c72',
    cheek: '#e67e6e',
    shirt: '#d95d39',
    shirtShade: '#b54524',
    hair: '#2a8f82',
    accessory: 'tudung',
    accent: '#7cd1c4',
  },
  studentB: {
    skin: '#8d5738',
    cheek: '#b96754',
    shirt: '#e69b1e',
    shirtShade: '#be7a0e',
    hair: '#241d1a',
    accessory: 'curls',
    accent: '#fff1c9',
  },
  studentC: {
    skin: '#f0c29e',
    cheek: '#ee8f82',
    shirt: '#2d7db3',
    shirtShade: '#1f5e89',
    hair: '#2a2422',
    accessory: 'glasses',
    accent: '#cbe8fa',
  },
};

const FALLBACK_STYLE: CharacterStyle = {
  skin: '#dfb08a',
  cheek: '#e88b7b',
  shirt: '#7652b8',
  shirtShade: '#593b91',
  hair: '#2e2521',
  accessory: 'tuft',
  accent: '#e5dbfa',
};

function getStyle(studentId?: string): CharacterStyle {
  if (studentId && CHARACTER_STYLES[studentId]) {
    return CHARACTER_STYLES[studentId];
  }
  return FALLBACK_STYLE;
}

function FaceSvg({
  style,
  mood,
  isSpeaking,
  className,
}: {
  style: CharacterStyle;
  mood: StudentMood;
  isSpeaking: boolean;
  className?: string;
}) {
  const eyeY = mood === 'disengaged' ? 37 : 34;

  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Back hair / tudung drape */}
      {style.accessory === 'tudung' ? (
        <path
          d="M14 34C14 19 22 11 32 11C42 11 50 19 50 34L53 56C46 60 18 60 11 56L14 34Z"
          fill={style.hair}
          stroke="#272220"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      ) : null}

      {style.accessory === 'curls' ? (
        <g fill={style.hair} stroke="#272220" strokeWidth="2.2">
          <circle cx="20" cy="21" r="7" />
          <circle cx="32" cy="16" r="8" />
          <circle cx="44" cy="21" r="7" />
          <circle cx="16" cy="30" r="6" />
          <circle cx="48" cy="30" r="6" />
        </g>
      ) : null}

      {/* Shoulders / Shirt */}
      <path
        d="M14 62C14 50 22 45 32 45C42 45 50 50 50 62H14Z"
        fill={style.shirt}
        stroke="#272220"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Shirt collar accent */}
      <path d="M26 46L32 52L38 46" stroke={style.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />

      {/* Head */}
      <circle cx="32" cy="33" r="15" fill={style.skin} stroke="#272220" strokeWidth="2.4" />

      {/* Tudung inner trim */}
      {style.accessory === 'tudung' ? (
        <path
          d="M18 33C18 22 24 17 32 17C40 17 46 22 46 33C46 39 42 45 32 46C22 45 18 39 18 33Z"
          stroke={style.accent}
          strokeWidth="2"
        />
      ) : null}

      {/* Hair bangs for glasses / tuft */}
      {style.accessory === 'glasses' || style.accessory === 'tuft' ? (
        <path
          d="M17 30C18 20 24 15 33 15C42 15 47 21 47 30C43 24 38 23 32 24C26 25 21 24 17 30Z"
          fill={style.hair}
          stroke="#272220"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      ) : null}

      {/* Cheeks */}
      <circle cx="23" cy="38" r="2.3" fill={style.cheek} opacity="0.55" />
      <circle cx="41" cy="38" r="2.3" fill={style.cheek} opacity="0.55" />

      {/* Eyes */}
      <circle cx="26" cy={eyeY} r="2.2" fill="#272220" />
      <circle cx="38" cy={eyeY} r="2.2" fill="#272220" />
      {mood !== 'disengaged' ? (
        <>
          <circle cx="26.8" cy={eyeY - 0.7} r="0.7" fill="#ffffff" />
          <circle cx="38.8" cy={eyeY - 0.7} r="0.7" fill="#ffffff" />
        </>
      ) : null}

      {/* Rounded Glasses */}
      {style.accessory === 'glasses' ? (
        <g stroke="#272220" strokeWidth="2">
          <circle cx="26" cy={eyeY} r="4.6" fill="#ffffff" fillOpacity="0.22" />
          <circle cx="38" cy={eyeY} r="4.6" fill="#ffffff" fillOpacity="0.22" />
          <line x1="30.6" y1={eyeY} x2="33.4" y2={eyeY} />
        </g>
      ) : null}

      {/* Mouth: speaking open smile, engaged grin, neutral smile, or flat */}
      {isSpeaking ? (
        <path
          d="M27.5 40.5C29 44 35 44 36.5 40.5Z"
          fill="#272220"
          stroke="#272220"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      ) : mood === 'engaged' ? (
        <path d="M26.5 39.5C28.5 43.2 35.5 43.2 37.5 39.5" stroke="#272220" strokeWidth="2.2" strokeLinecap="round" />
      ) : mood === 'disengaged' ? (
        <path d="M28.5 42C30.5 40.6 33.5 40.6 35.5 42" stroke="#272220" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M28 40.5C30 42.2 34 42.2 36 40.5" stroke="#272220" strokeWidth="2.1" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function StudentFaceBadge({
  studentId,
  name,
  isSpeaking = false,
  hasSpoken = false,
  mood = 'neutral',
}: {
  studentId?: string;
  name: string;
  isSpeaking?: boolean;
  hasSpoken?: boolean;
  mood?: StudentMood;
}) {
  const style = getStyle(studentId);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 py-0.5 pl-1 pr-2.5 font-display text-xs font-bold transition ${
        isSpeaking
          ? 'border-[#f0ad38] bg-terracotta text-white shadow-sm'
          : hasSpoken
            ? 'border-sage/70 bg-sage/25 text-[#c5edd8]'
            : 'border-white/15 bg-white/8 text-white/75'
      }`}
    >
      <span className="relative h-7 w-7 overflow-hidden rounded-full bg-parchment-light">
        <FaceSvg style={style} mood={mood} isSpeaking={isSpeaking} className="h-full w-full" />
      </span>
      <span>{name}</span>
      {hasSpoken && !isSpeaking ? <Check className="h-3.5 w-3.5 text-[#9ce2be]" aria-hidden /> : null}
    </span>
  );
}

export function SeatedStudent({
  studentId,
  name,
  isSpeaking = false,
  hasSpoken = false,
  mood = 'neutral',
}: {
  studentId?: string;
  name: string;
  isSpeaking?: boolean;
  hasSpoken?: boolean;
  mood?: StudentMood;
}) {
  const style = getStyle(studentId);

  return (
    <div
      className={`relative flex flex-col items-center transition-transform duration-300 ${
        isSpeaking ? 'scale-110 z-20' : 'scale-100 z-10'
      }`}
    >
      {/* Speech indicator pill above speaking student */}
      {isSpeaking ? (
        <span className="mb-1 rounded-full border-2 border-[#272220] bg-[#fff7e2] px-2.5 py-0.5 font-display text-[11px] font-bold text-[#272220] shadow-sm">
          Speaking...
        </span>
      ) : (
        <span className="mb-1 h-5" aria-hidden />
      )}

      {/* Portrait circle + raised hand indicator */}
      <div className="relative">
        <div
          className={`h-16 w-16 overflow-hidden rounded-full border-[3px] bg-[#fffdf8] shadow-md transition sm:h-20 sm:w-20 ${
            isSpeaking
              ? 'border-[#f0ad38] ring-4 ring-[#f0ad38]/40'
              : hasSpoken
                ? 'border-[#2f8a63]'
                : 'border-[#272220]/70'
          }`}
        >
          <FaceSvg style={style} mood={mood} isSpeaking={isSpeaking} className="h-full w-full" />
        </div>

        {hasSpoken ? (
          <span
            title={`${name} has spoken`}
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#272220] bg-[#2f8a63] text-white shadow-sm"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
          </span>
        ) : null}
      </div>

      {/* Desk surface + crisp nameplate */}
      <div
        className={`-mt-2 flex min-w-[5.25rem] items-center justify-center rounded-xl border-2 px-3 py-1 shadow-[0_3px_0_rgba(39,34,32,0.35)] ${
          isSpeaking
            ? 'border-[#f0ad38] bg-[#272220] text-[#fff7e2]'
            : 'border-[#5a3d24] bg-[#8b5e38] text-[#fffdf8]'
        }`}
      >
        <span className="font-display text-xs font-bold tracking-wide sm:text-sm">{name}</span>
      </div>
    </div>
  );
}
