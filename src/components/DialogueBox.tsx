import { motion } from 'motion/react';
import { Node, Move } from './Game';
import { getResponseTypeMeta } from '../lib/teacher-coaching';

export default function DialogueBox({ node, onChoice }: { node: Node, onChoice: (choice: Move) => void }) {
  const responseMeta = node.responseType ? getResponseTypeMeta(node.responseType) : null;

  return (
    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-6 px-8 z-30">
      <motion.div 
        key={node.text}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {node.pressureCue && (
          <div className="mb-4 inline-flex max-w-3xl rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-medium text-amber-100">
            {node.pressureCue}
          </div>
        )}

        {responseMeta && (
          <div className="mb-4 max-w-3xl rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-left">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/75">
              Student Response Type
            </div>
            <div className="mt-1 text-sm font-semibold text-sky-50">{responseMeta.label}</div>
            <div className="mt-1 text-sm text-sky-100/75">{responseMeta.coaching}</div>
          </div>
        )}

        <p className="text-xl md:text-2xl font-serif mb-6 text-white/90 leading-relaxed">
          {node.text}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {node.choices.map((choice, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChoice(choice)}
              className="text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/30 transition-colors"
            >
              <span className="block text-sm font-bold text-emerald-400 mb-1">
                {choice.text.match(/\[(.*?)\]/)?.[0]}
              </span>
              <span className="text-sm text-white/80">
                {choice.text.replace(/\[(.*?)\]\s*/, '')}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
