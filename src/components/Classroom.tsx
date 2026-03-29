import { motion } from 'motion/react';
import { useMemo } from 'react';
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
  const beastOpacity = Math.max(0, (50 - engagementScore) / 50);
  const transformerOpacity = Math.max(0, (engagementScore - 50) / 50);

  const isDisengaged = engagementScore < 30;
  const isHighlyEngaged = engagementScore > 70;

  const useNormalImage = assets?.classroom_normal?.trim();
  const useBeastImage = assets?.classroom_beasts?.trim();
  const useTransformerImage = assets?.classroom_transformers?.trim();

  const shortLabel = (name: string, id: string) => {
    const m = name.match(/Student\s+([A-Za-z0-9])/i);
    if (m) return m[1]!.toUpperCase();
    return (name.slice(0, 1) || id.slice(-1)).toUpperCase();
  };

  // Pre-compute particle positions to avoid Math.random in render
  const engagedParticles = useMemo(
    () =>
      [...Array(6)].map(() => ({
        x: `${Math.random() * 100}%`,
        size: 5 + Math.random() * 4,
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 2,
      })),
    [],
  );

  const disengagedParticles = useMemo(
    () =>
      [...Array(4)].map(() => ({
        x: `${Math.random() * 100}%`,
        duration: 3 + Math.random() * 3,
        delay: Math.random() * 3,
      })),
    [],
  );

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden">
      {/* Base classroom layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        {useNormalImage && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${assets!.classroom_normal})` }}
          />
        )}
        {!useNormalImage && (
          <>
            {/* Wall */}
            <div
              className="absolute inset-0"
              style={{
                height: '40%',
                background: 'linear-gradient(180deg, #e8dfd2 0%, #ddd3c4 100%)',
              }}
            />
            {/* Floor */}
            <div
              className="absolute bottom-0 inset-x-0"
              style={{
                height: '60%',
                background: 'linear-gradient(0deg, #8b6f47 0%, #a68b5b 50%, #b89e6e 100%)',
              }}
            />
            {/* Windows */}
            <div
              className="absolute rounded-lg shadow-lg"
              style={{
                top: '10%', left: '15%', width: '20%', height: '25%',
                background: 'linear-gradient(135deg, #b5d0e0 0%, #8ab4cc 100%)',
                border: '4px solid #f5f0e8',
              }}
            >
              <div className="absolute inset-2 rounded" style={{ background: 'linear-gradient(135deg, #d4e6f0 0%, #c2dae6 100%)' }} />
            </div>
            <div
              className="absolute rounded-lg shadow-lg"
              style={{
                top: '10%', right: '15%', width: '20%', height: '25%',
                background: 'linear-gradient(135deg, #b5d0e0 0%, #8ab4cc 100%)',
                border: '4px solid #f5f0e8',
              }}
            >
              <div className="absolute inset-2 rounded" style={{ background: 'linear-gradient(135deg, #d4e6f0 0%, #c2dae6 100%)' }} />
            </div>
            {/* Desks */}
            <div className="absolute rounded-lg shadow-lg" style={{ bottom: '20%', left: '20%', width: '25%', height: '15%', background: 'linear-gradient(180deg, #7a5c3a 0%, #5e4528 100%)' }} />
            <div className="absolute rounded-lg shadow-lg" style={{ bottom: '20%', right: '20%', width: '25%', height: '15%', background: 'linear-gradient(180deg, #7a5c3a 0%, #5e4528 100%)' }} />
            {/* Board */}
            <div className="absolute rounded-lg shadow-lg" style={{ top: '15%', left: '35%', width: '30%', height: '20%', background: 'linear-gradient(180deg, #3d5c3a 0%, #2d4a2e 100%)', border: '4px solid #6b4f35' }}>
              <div className="absolute bottom-1 left-2 right-2 h-1 rounded" style={{ background: 'rgba(107, 79, 53, 0.5)' }} />
            </div>
          </>
        )}
      </div>

      {/* Disengaged overlay */}
      <motion.div
        className={useBeastImage ? 'absolute inset-0 bg-cover bg-center bg-no-repeat' : 'absolute inset-0'}
        style={
          useBeastImage
            ? { backgroundImage: `url(${assets!.classroom_beasts})`, mixBlendMode: 'multiply' }
            : { background: 'linear-gradient(0deg, rgba(44,37,32,0.6) 0%, rgba(44,37,32,0.3) 50%, rgba(44,37,32,0.6) 100%)' }
        }
        initial={{ opacity: 0 }}
        animate={{ opacity: beastOpacity }}
        transition={{ duration: 1 }}
      />

      {/* Highly engaged overlay */}
      <motion.div
        className={useTransformerImage ? 'absolute inset-0 bg-cover bg-center bg-no-repeat' : 'absolute inset-0'}
        style={
          useTransformerImage
            ? { backgroundImage: `url(${assets!.classroom_transformers})`, mixBlendMode: 'screen' }
            : { background: 'linear-gradient(0deg, rgba(107,143,113,0.2) 0%, rgba(212,149,43,0.15) 50%, rgba(196,92,60,0.2) 100%)' }
        }
        initial={{ opacity: 0 }}
        animate={{ opacity: transformerOpacity }}
        transition={{ duration: 1 }}
      />

      {/* Engagement particles — fewer on mobile, skipped on reduced motion */}
      {isHighlyEngaged && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden">
          {engagedParticles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: i % 2 === 0 ? '#d4952b' : '#c45c3c',
              }}
              initial={{ x: p.x, y: '110%', opacity: 0 }}
              animate={{ y: '-10%', opacity: [0, 0.8, 0] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
            />
          ))}
        </div>
      )}

      {isDisengaged && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden">
          {disengagedParticles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{ background: 'rgba(92, 82, 74, 0.4)' }}
              initial={{ x: p.x, y: '-10%', opacity: 0 }}
              animate={{ y: '110%', opacity: [0, 0.5, 0] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
            />
          ))}
        </div>
      )}

      {/* Hotspots / Student positions — min 28px touch area on mobile */}
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
          <div
            title={`${hotspot.name}${spokenStudentIds.includes(hotspot.id) ? ' · has spoken' : ''}`}
            className="flex h-full w-full items-center justify-center rounded-full text-[10px] sm:text-xs font-bold tabular-nums transition-all duration-300"
            style={{
              minWidth: '28px',
              minHeight: '28px',
              border: spokenStudentIds.includes(hotspot.id)
                ? '2px solid #8aab8f'
                : engagementScore > 70
                  ? '2px solid rgba(107, 143, 113, 0.5)'
                  : engagementScore < 30
                    ? '2px solid rgba(138, 127, 117, 0.3)'
                    : '2px solid rgba(196, 92, 60, 0.4)',
              background: spokenStudentIds.includes(hotspot.id)
                ? '#6b8f71'
                : engagementScore > 70
                  ? '#8aab8f'
                  : engagementScore < 30
                    ? '#8a7f75'
                    : '#c45c3c',
              color: '#f5f0e8',
              boxShadow: spokenStudentIds.includes(hotspot.id)
                ? '0 0 12px rgba(107, 143, 113, 0.4)'
                : '0 2px 8px rgba(44, 37, 32, 0.2)',
            }}
          >
            {shortLabel(hotspot.name, hotspot.id)}
          </div>
        </div>
      ))}
    </div>
  );
}
