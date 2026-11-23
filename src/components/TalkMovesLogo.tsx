// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)

/**
 * Playful rounded overlapping speech-bubble mark for Talk Moves.
 */
export default function TalkMovesLogo({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Back warm bubble */}
      <path
        d="M19.5 6C14.25 6 10 9.6 10 14.1C10 15.8 10.6 17.35 11.65 18.65L10.3 22.3C10.15 22.7 10.55 23.1 10.95 22.9L14.8 21.15C16.25 21.8 17.85 22.2 19.5 22.2C24.75 22.2 29 18.6 29 14.1C29 9.6 24.75 6 19.5 6Z"
        fill="currentColor"
        fillOpacity="0.35"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Front primary bubble */}
      <path
        d="M12.5 11C7.25 11 3 14.55 3 18.95C3 20.6 3.6 22.1 4.65 23.35L3.35 26.85C3.2 27.25 3.6 27.6 4 27.4L7.75 25.7C9.2 26.4 10.8 26.8 12.5 26.8C17.75 26.8 22 23.25 22 18.95C22 14.55 17.75 11 12.5 11Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Three conversational dots inside front bubble */}
      <circle cx="9.2" cy="18.9" r="1.45" fill="#d95d39" />
      <circle cx="12.5" cy="18.9" r="1.45" fill="#d95d39" />
      <circle cx="15.8" cy="18.9" r="1.45" fill="#d95d39" />
    </svg>
  );
}
