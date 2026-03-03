import { motion } from 'motion/react';
import { MoveHistoryItem, MoveHistoryItem as TalkMoveHistoryItem } from './Game';
import { RotateCcw, Trophy, AlertTriangle, Sparkles, Target, Lightbulb } from 'lucide-react';
import { talkMovesMap, type PedagogicalProfile } from '../data/talk_moves';

interface EndScreenProps {
  state: 'win' | 'loss';
  history: MoveHistoryItem[] | TalkMoveHistoryItem[];
  onRestart: () => void;
  profile?: PedagogicalProfile;
}

export default function EndScreen({ state, history, onRestart, profile }: EndScreenProps) {
  const isWin = state === 'win';
  
  // Check if this is from Talk Moves game (has moveId) or original game (has moveType)
  const isTalkMoves = history.length > 0 && 'moveId' in history[0];
  
  // Different handling based on game type
  if (isTalkMoves && profile) {
    // Talk Moves Game End Screen
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`absolute inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto ${
          isWin ? 'bg-emerald-950' : 'bg-blue-950'
        }`}
      >
        <div className="max-w-3xl w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
          {/* Header */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 bg-white/10"
          >
            {isWin ? (
              <Sparkles className="w-12 h-12 text-amber-400" />
            ) : (
              <Lightbulb className="w-12 h-12 text-blue-400" />
            )}
          </motion.div>

          <h1 className="text-4xl font-serif font-bold mb-3 text-white">
            {isWin ? 'Inquiry Master' : 'Learning in Progress'}
          </h1>
          
          <p className="text-lg text-white/70 mb-6">
            {isWin 
              ? "You skillfully guided the 'Why Does Ice Melt?' inquiry, using effective talk moves to build students' scientific thinking!"
              : "Great start! With more practice chaining talk moves, you'll build even richer scientific discussions."}
          </p>

          {/* Teaching Style Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full mb-8">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">{profile.style}</span>
            <span className="text-xs text-white/50">Teaching Style</span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-black/40 rounded-xl p-4">
              <div className="text-2xl font-bold text-emerald-400">{profile.totalMoves}</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Total Moves</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <div className="text-2xl font-bold text-amber-400">{profile.comboCount}</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Combos</div>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-400">
                {profile.movesByCategory['non-terminal']}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Chain Moves</div>
            </div>
          </div>

          {/* Pedagogical Profile - Detailed */}
          <div className="bg-black/50 rounded-2xl p-6 mb-8 text-left">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Your Pedagogical Profile
            </h3>
            
            <div className="space-y-3">
              {Object.entries(profile.movesById).sort((a, b) => b[1] - a[1]).map(([moveId, count]) => {
                const move = talkMovesMap[moveId];
                if (!move) return null;
                return (
                  <div key={moveId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${move.category === 'terminal' ? 'bg-amber-400' : 'bg-white/40'}`} />
                      <span className="text-white/80">{move.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs">{move.category}</span>
                      <span className="font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">×{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advice Section */}
          {profile.advice.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-6 mb-8 text-left">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-300 mb-3">Growth Suggestions</h3>
              <ul className="space-y-2">
                {profile.advice.map((advice, i) => (
                  <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    {advice}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={onRestart}
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-white/90 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Original Game End Screen (fallback)
  const moveCounts = history.reduce((acc, curr: any) => {
    const key = curr.moveType || curr.moveId || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`absolute inset-0 z-50 flex items-center justify-center p-8 ${
        isWin ? 'bg-emerald-950' : 'bg-red-950'
      }`}
    >
      <div className="max-w-2xl w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 bg-white/10"
        >
          {isWin ? <Trophy className="w-10 h-10 text-emerald-400" /> : <AlertTriangle className="w-10 h-10 text-red-400" />}
        </motion.div>

        <h1 className="text-4xl font-serif font-bold mb-4 text-white">
          {isWin ? 'Pedagogical Master' : 'Reflection Needed'}
        </h1>
        
        <p className="text-lg text-white/70 mb-8">
          {isWin 
            ? "You successfully navigated the discussion, fostering a high-level critical thinking environment. The classroom has transformed!" 
            : "The discussion broke down and students disengaged. Review your talk moves and try again to keep the cognitive demand high."}
        </p>

        <div className="bg-black/50 rounded-2xl p-6 mb-8 text-left">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-4">Your Pedagogical Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(moveCounts).map(([move, count]) => (
              <div key={move} className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-white/80">{move}</span>
                <span className="font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">x{count}</span>
              </div>
            ))}
            {Object.keys(moveCounts).length === 0 && (
              <div className="col-span-2 text-white/40 italic text-center py-2">No moves recorded.</div>
            )}
          </div>
        </div>

        <button 
          onClick={onRestart}
          className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-white/90 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Try Again
        </button>
      </div>
    </motion.div>
  );
}
