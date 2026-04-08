import React from 'react';
import { motion } from 'motion/react';

interface LeaveConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const LeaveConfirmModal: React.FC<LeaveConfirmModalProps> = ({ onCancel, onConfirm }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white mb-2">Leave Room?</h3>
        <p className="text-slate-300 mb-6 text-sm">
          Are you sure you want to leave the room? You will lose your current progress in this game.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg font-bold text-slate-300 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg font-bold bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Leave Room
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
