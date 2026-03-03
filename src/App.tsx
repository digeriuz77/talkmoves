/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import Game from './components/Game';
import TalkMovesGame from './components/TalkMovesGame';
import { Sparkles, Layers, ArrowRight, BookOpen } from 'lucide-react';

type GameMode = 'select' | 'stage1' | 'stage2';

export default function App() {
  const [gameMode, setGameMode] = useState<GameMode>('select');

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans flex items-center justify-center p-4">
      {gameMode === 'select' ? (
        <ModeSelect onSelect={setGameMode} />
      ) : gameMode === 'stage1' ? (
        <Game />
      ) : (
        <TalkMovesGame />
      )}
    </div>
  );
}

function ModeSelect({ onSelect }: { onSelect: (mode: GameMode) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl w-full"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 bg-gradient-to-r from-amber-200 to-emerald-200 bg-clip-text text-transparent">
          Dialogic Classroom
        </h1>
        <p className="text-lg text-white/60">
          Master the art of productive classroom dialogue
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Stage 1: Original Game */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => onSelect('stage1')}
          className="group relative bg-neutral-800/50 border border-white/10 rounded-3xl p-8 text-left hover:border-amber-500/50 transition-all"
        >
          <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          
          <div className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-2">Stage 1</div>
          <h2 className="text-2xl font-serif font-bold mb-3">Crushed Can Inquiry</h2>
          <p className="text-white/60 mb-6">
            Navigate an 8-turn dialogue about atmospheric pressure. 
            Learn to choose the right talk moves to keep students engaged.
          </p>
          
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            Start Stage 1 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="text-xs text-white/40">8 turns • Single choice per turn</div>
          </div>
        </motion.button>

        {/* Stage 2: Talk Moves Game */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onSelect('stage2')}
          className="group relative bg-neutral-800/50 border border-white/10 rounded-3xl p-8 text-left hover:border-emerald-500/50 transition-all"
        >
          <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          
          <div className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-2">Stage 2</div>
          <h2 className="text-2xl font-serif font-bold mb-3">Why Does Ice Melt?</h2>
          <p className="text-white/60 mb-6">
            Build response chains using the complete Talk Moves framework. 
            Chain moves together for combo bonuses and deeper inquiry!
          </p>
          
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            Start Stage 2 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="text-xs text-white/40">8 turns • Chain responses • 14 Talk Moves</div>
          </div>
        </motion.button>
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 bg-blue-900/20 border border-blue-500/20 rounded-2xl p-6"
      >
        <div className="flex items-start gap-4">
          <BookOpen className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-white mb-2">About the Talk Moves Framework</h3>
            <p className="text-sm text-white/60">
              Based on research by Edwards-Groves, Chapin, O'Connor, and Alexander. 
              These 14 teacher moves help build academically productive classroom discussions 
              that move beyond the traditional IRE pattern.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
