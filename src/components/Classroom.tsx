// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { motion } from 'motion/react';
import type { ClassroomHotspot } from '../data/choice-scenarios';
import type { AssetUrls } from './AssetLoader';
import { SeatedStudent, type StudentMood } from './StudentAvatar';

type ClassroomProps = {
  engagementScore: number;
  lastDelta: number;
  hotspots: ClassroomHotspot[];
  spokenStudentIds?: string[];
  activeSpeakerId?: string;
  assets?: AssetUrls;
  focusMode?: boolean;
};

export default function Classroom({
  engagementScore,
  hotspots,
  spokenStudentIds = [],
  activeSpeakerId,
  assets,
}: ClassroomProps) {
  const mood: StudentMood =
    engagementScore >= 70 ? 'engaged' : engagementScore < 40 ? 'disengaged' : 'neutral';

  const useNormalImage = assets?.classroom_normal?.trim();

  return (
    <div className="relative flex h-full w-full flex-col justify-end overflow-hidden">
      {/* Warm illustrative classroom background */}
      <div className="absolute inset-0">
        {useNormalImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${assets!.classroom_normal})` }}
          />
        ) : (
          <>
            {/* Sunlit Wall */}
            <div
              className="absolute inset-x-0 top-0"
              style={{
                height: '62%',
                background: 'linear-gradient(180deg, #f6ebd8 0%, #eadbc2 100%)',
              }}
            />
            {/* Warm Wooden Floor */}
            <div
              className="absolute inset-x-0 bottom-0"
              style={{
                height: '38%',
                background: 'linear-gradient(180deg, #c69f6f 0%, #ab8253 100%)',
                borderTop: '3px solid #967047',
              }}
            />
            {/* Sunlit Windows */}
            <div
              className="absolute left-[8%] top-[12%] h-[36%] w-[16%] rounded-2xl border-[3px] border-[#fffdf8] shadow-sm"
              style={{ background: 'linear-gradient(135deg, #d7eefc 0%, #9fd0ec 100%)' }}
            >
              <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[#fffdf8]/80" />
              <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#fffdf8]/80" />
            </div>
            <div
              className="absolute right-[8%] top-[12%] h-[36%] w-[16%] rounded-2xl border-[3px] border-[#fffdf8] shadow-sm"
              style={{ background: 'linear-gradient(135deg, #d7eefc 0%, #9fd0ec 100%)' }}
            >
              <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[#fffdf8]/80" />
              <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#fffdf8]/80" />
            </div>
            {/* Green Chalkboard */}
            <div
              className="absolute left-1/2 top-[10%] flex h-[40%] w-[38%] -translate-x-1/2 flex-col justify-center gap-1.5 rounded-2xl border-[4px] border-[#8b5e38] px-5 shadow-md"
              style={{ background: 'linear-gradient(180deg, #2d5a42 0%, #224633 100%)' }}
            >
              <div className="h-1.5 w-3/4 rounded-full bg-white/30" />
              <div className="h-1.5 w-1/2 rounded-full bg-amber-200/35" />
              <div className="h-1.5 w-2/3 rounded-full bg-white/20" />
            </div>
          </>
        )}
      </div>

      {/* Subtle mood tint overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          backgroundColor:
            mood === 'engaged'
              ? 'rgba(47, 138, 99, 0.08)'
              : mood === 'disengaged'
                ? 'rgba(39, 34, 32, 0.24)'
                : 'rgba(0, 0, 0, 0)',
        }}
        transition={{ duration: 0.4 }}
      />

      {/* Seated Illustrated Students Row */}
      <div className="relative z-10 mx-auto flex w-full max-w-3xl items-end justify-around px-4 pb-3 pt-4">
        {hotspots.map((hotspot) => (
          <SeatedStudent
            key={hotspot.id}
            studentId={hotspot.id}
            name={hotspot.name}
            isSpeaking={activeSpeakerId === hotspot.id}
            hasSpoken={spokenStudentIds.includes(hotspot.id)}
            mood={mood}
          />
        ))}
      </div>
    </div>
  );
}
