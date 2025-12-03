import React from 'react';
import { PlayerColor } from '../types';

interface PromotionDialogProps {
  isOpen: boolean;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  color: PlayerColor;
}

export const PromotionDialog: React.FC<PromotionDialogProps> = ({ isOpen, onSelect, color }) => {
  if (!isOpen) return null;

  const pieces = [
    { type: 'q', label: 'Queen', icon: color === 'w' ? '♕' : '♛' },
    { type: 'r', label: 'Rook', icon: color === 'w' ? '♖' : '♜' },
    { type: 'b', label: 'Bishop', icon: color === 'w' ? '♗' : '♝' },
    { type: 'n', label: 'Knight', icon: color === 'w' ? '♘' : '♞' },
  ];

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-lg">
      <div className="bg-slate-800 border border-slate-600 p-4 rounded-xl shadow-2xl animate-in zoom-in duration-200">
        <h3 className="text-center text-white font-bold mb-4 text-lg">Promote Pawn</h3>
        <div className="flex gap-4">
          {pieces.map((p) => (
            <button
              key={p.type}
              onClick={() => onSelect(p.type as any)}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600 hover:border-slate-500 w-20 group"
            >
              <span className="text-4xl group-hover:scale-110 transition-transform">{p.icon}</span>
              <span className="text-xs uppercase font-medium text-slate-300 group-hover:text-white">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
