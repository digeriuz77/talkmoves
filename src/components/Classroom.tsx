import { motion } from 'motion/react';
import type { ClassroomHotspot } from '../data/choice-scenarios';
import type { AssetUrls } from './AssetLoader';

type ClassroomProps = {
  engagementScore: number;
  lastDelta: number;
  hotspots: ClassroomHotspot[];
  spokenStudentIds?: string[];
  assets?: AssetUrls;
};

export default function Classroom({
  engagementScore,
  hotspots,
  spokenStudentIds = [],
  assets,
}: ClassroomProps) {
  // Calculate opacities based on engagement score (0 to 100)
  // Beast fades in as score drops from 50 to 0.
  const beastOpacity = Math.max(0, (50 - engagementScore) / 50);
  // Transformer fades in as score rises from 50 to 100.
  const transformerOpacity = Math.max(0, (engagementScore - 50) / 50);

  // Determine overall classroom "mood"
  const isDisengaged = engagementScore < 30;
  const isHighlyEngaged = engagementScore > 70;

  const useNormalImage = assets?.classroom_normal?.trim();
  const useBeastImage = assets?.classroom_beasts?.trim();
  const useTransformerImage = assets?.classroom_transformers?.trim();

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden">
      {/* Base classroom layer - image when provided, else CSS gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50">
        {useNormalImage && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${assets!.classroom_normal})` }}
          />
        )}
        {!useNormalImage && (
          <>
            {/* Wall */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-slate-200" style={{ height: '40%' }} />
            
            {/* Floor */}
            <div className="absolute bottom-0 inset-x-0 h-[60%] bg-gradient-to-t from-amber-800 to-amber-700" />
            
            {/* Windows */}
            <div className="absolute top-[10%] left-[15%] w-[20%] h-[25%] bg-gradient-to-br from-sky-200 to-sky-300 rounded-lg border-4 border-white shadow-lg">
              <div className="absolute inset-2 bg-gradient-to-br from-sky-100 to-sky-200" />
            </div>
            <div className="absolute top-[10%] right-[15%] w-[20%] h-[25%] bg-gradient-to-br from-sky-200 to-sky-300 rounded-lg border-4 border-white shadow-lg">
              <div className="absolute inset-2 bg-gradient-to-br from-sky-100 to-sky-200" />
            </div>
            
            {/* Desk/table representation */}
            <div className="absolute bottom-[20%] left-[20%] w-[25%] h-[15%] bg-gradient-to-b from-amber-600 to-amber-700 rounded-lg shadow-lg" />
            <div className="absolute bottom-[20%] right-[20%] w-[25%] h-[15%] bg-gradient-to-b from-amber-600 to-amber-700 rounded-lg shadow-lg" />
            
            {/* Board */}
            <div className="absolute top-[15%] left-[35%] w-[30%] h-[20%] bg-gradient-to-b from-green-700 to-green-800 rounded-lg border-4 border-amber-900 shadow-lg">
              <div className="absolute bottom-1 left-2 right-2 h-1 bg-amber-900/50 rounded" />
            </div>
          </>
        )}
      </div>

      {/* Disengaged overlay - image when provided, else gradient */}
      <motion.div
        className={useBeastImage ? 'absolute inset-0 bg-cover bg-center bg-no-repeat' : 'absolute inset-0 bg-gradient-to-t from-gray-900/60 via-gray-800/40 to-gray-900/60'}
        style={
          useBeastImage
            ? { backgroundImage: `url(${assets!.classroom_beasts})`, mixBlendMode: 'multiply' }
            : undefined
        }
        initial={{ opacity: 0 }}
        animate={{ opacity: beastOpacity }}
        transition={{ duration: 1 }}
      />

      {/* Highly engaged overlay - image when provided, else gradient */}
      <motion.div
        className={useTransformerImage ? 'absolute inset-0 bg-cover bg-center bg-no-repeat' : 'absolute inset-0 bg-gradient-to-t from-emerald-900/30 via-yellow-200/20 to-amber-500/30'}
        style={
          useTransformerImage
            ? { backgroundImage: `url(${assets!.classroom_transformers})`, mixBlendMode: 'screen' }
            : undefined
        }
        initial={{ opacity: 0 }}
        animate={{ opacity: transformerOpacity }}
        transition={{ duration: 1 }}
      />

      {/* Engagement indicator particles */}
      {isHighlyEngaged && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-amber-400"
              initial={{ 
                x: Math.random() * 100 + '%', 
                y: '110%',
                opacity: 0 
              }}
              animate={{ 
                y: '-10%',
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>
      )}

      {/* Disengagement indicator */}
      {isDisengaged && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-gray-500"
              initial={{ 
                x: Math.random() * 100 + '%', 
                y: '-10%',
                opacity: 0 
              }}
              animate={{ 
                y: '110%',
                opacity: [0, 0.5, 0]
              }}
              transition={{ 
                duration: 3 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3
              }}
            />
          ))}
        </div>
      )}

      {/* Hotspots / Student positions */}
      {hotspots.map((hotspot) => (
        <div
          key={hotspot.id}
          className="absolute flex items-center justify-center"
          style={{
            left: `${hotspot.x}%`,
            top: `${hotspot.y}%`,
            width: `${hotspot.width}%`,
            height: `${hotspot.height}%`,
          }}
        >
          {/* Student indicator */}
          <div
            className={`w-full h-full rounded-full flex items-center justify-center text-2xl border ${
              spokenStudentIds.includes(hotspot.id)
                ? 'border-emerald-200 bg-emerald-400'
                : engagementScore > 70
                  ? 'border-emerald-200/40 bg-emerald-400'
                  : engagementScore < 30
                    ? 'border-gray-200/20 bg-gray-400'
                    : 'border-blue-200/30 bg-blue-400'
            }`}
          >
            <span className="text-2xl">👤</span>
          </div>
          <div className="absolute -bottom-6 whitespace-nowrap text-xs font-mono bg-black/80 px-2 py-1 rounded text-white/80 border border-white/10 backdrop-blur-sm">
            {hotspot.name}
          </div>
        </div>
      ))}
    </div>
  );
}
