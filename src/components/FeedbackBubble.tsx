import { motion } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

export default function FeedbackBubble({ message, onClose }: { message: string, onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute top-20 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-6 py-4 rounded-2xl shadow-2xl z-40 max-w-md flex items-start gap-4"
    >
      <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Teacher Thought</h4>
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
        <X className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
