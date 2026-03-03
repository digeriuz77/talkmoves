import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Classroom from './Classroom';
import DialogueBox from './DialogueBox';
import FeedbackBubble from './FeedbackBubble';
import EndScreen from './EndScreen';
import scenarioData from '../data/scenario.json';

import { AssetUrls } from './AssetLoader';

export type Move = {
  text: string;
  scoreDelta: number;
  nextNode: string;
  tip?: string;
  moveType?: string;
};

export type Node = {
  text: string;
  choices: Move[];
};

export type MoveHistoryItem = {
  moveType: string;
  scoreDelta: number;
};

export default function Game({ assets }: { assets?: AssetUrls }) {
  const [currentNodeId, setCurrentNodeId] = useState<string>('start_node');
  const [engagementScore, setEngagementScore] = useState<number>(50);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [gameState, setGameState] = useState<'playing' | 'win' | 'loss'>('playing');

  const currentNode = scenarioData.dialogueTree[currentNodeId as keyof typeof scenarioData.dialogueTree] as Node;

  const handleChoice = (choice: Move) => {
    const newScore = Math.max(0, Math.min(100, engagementScore + choice.scoreDelta));
    setEngagementScore(newScore);
    setLastDelta(choice.scoreDelta);

    if (choice.moveType) {
      setMoveHistory([...moveHistory, { moveType: choice.moveType, scoreDelta: choice.scoreDelta }]);
    }

    if (choice.scoreDelta < 0 && choice.tip) {
      setFeedback(choice.tip);
    } else {
      setFeedback(null);
    }

    if (choice.nextNode === 'end_game') {
      if (newScore >= 70) {
        setGameState('win');
      } else {
        setGameState('loss');
      }
    } else {
      setCurrentNodeId(choice.nextNode);
    }
  };

  const handleRestart = () => {
    setCurrentNodeId('start_node');
    setEngagementScore(50);
    setMoveHistory([]);
    setFeedback(null);
    setLastDelta(0);
    setGameState('playing');
  };

  return (
    <div className="w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden relative shadow-2xl border border-white/10 flex flex-col">
      {gameState === 'playing' ? (
        <>
          <Classroom engagementScore={engagementScore} lastDelta={lastDelta} assets={assets} />
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 z-20">
            <div className="text-xs font-bold uppercase tracking-wider text-white/80 mb-1">Engagement</div>
            <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${engagementScore > 70 ? 'bg-emerald-400' : engagementScore < 30 ? 'bg-red-500' : 'bg-amber-400'}`}
                initial={{ width: '50%' }}
                animate={{ width: `${engagementScore}%` }}
                transition={{ type: 'spring', bounce: 0.4 }}
              />
            </div>
          </div>
          
          <AnimatePresence>
            {feedback && <FeedbackBubble message={feedback} onClose={() => setFeedback(null)} />}
          </AnimatePresence>

          <DialogueBox node={currentNode} onChoice={handleChoice} />
        </>
      ) : (
        <EndScreen state={gameState} history={moveHistory} onRestart={handleRestart} />
      )}
    </div>
  );
}
