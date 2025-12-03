import React, { useState } from 'react';
import { Difficulty, PlayerColor, TakebackStatus } from '../types';
import { RefreshCw, RotateCcw, Cpu, User, Send, Ban, CheckCircle2, Loader2 } from 'lucide-react';

interface GameControlsProps {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  playerColor: PlayerColor;
  setPlayerColor: (c: PlayerColor) => void;
  onReset: () => void;
  onRequestTakeback: () => void;
  takebackStatus: TakebackStatus;
  onManualMove: (move: string) => boolean;
  disabled: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  difficulty,
  setDifficulty,
  playerColor,
  setPlayerColor,
  onReset,
  onRequestTakeback,
  takebackStatus,
  onManualMove,
  disabled
}) => {
  const [moveInput, setMoveInput] = useState('');
  const [inputError, setInputError] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveInput.trim()) return;

    const success = onManualMove(moveInput.trim());
    if (success) {
      setMoveInput('');
      setInputError(false);
    } else {
      setInputError(true);
    }
  };

  const getTakebackButtonContent = () => {
    if (takebackStatus === 'requesting') {
        return (
            <>
                <Loader2 size={18} className="animate-spin" /> Requesting...
            </>
        );
    }
    if (takebackStatus === 'declined') {
        return (
            <>
                <Ban size={18} /> Declined
            </>
        );
    }
    return (
        <>
            <RotateCcw size={18} /> Takeback
        </>
    );
  };

  const getTakebackButtonStyle = () => {
     if (takebackStatus === 'declined') return 'bg-red-600/20 text-red-400 border border-red-900/50 cursor-not-allowed';
     if (takebackStatus === 'requesting') return 'bg-slate-700 text-slate-300 cursor-wait';
     return 'bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-sm active:scale-95';
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700 space-y-6">
      
      {/* Game Actions */}
      <div className="flex gap-2">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-md font-semibold transition-all shadow-sm active:scale-95"
        >
          <RefreshCw size={18} /> New Game
        </button>
        <button
          onClick={onRequestTakeback}
          disabled={disabled || takebackStatus !== 'idle'}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${getTakebackButtonStyle()}`}
        >
          {getTakebackButtonContent()}
        </button>
      </div>

      {/* Manual Move Input */}
      <form onSubmit={handleManualSubmit} className="relative">
        <input
            type="text"
            value={moveInput}
            onChange={(e) => {
                setMoveInput(e.target.value);
                setInputError(false);
            }}
            placeholder="Enter move (e.g. e4, Nf3)"
            disabled={disabled}
            className={`w-full bg-slate-900 text-slate-100 border rounded-md py-2 px-3 pr-10 focus:outline-none focus:ring-2 transition-all ${
                inputError 
                ? 'border-red-500 focus:ring-red-500/50 placeholder-red-400/50' 
                : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/50 placeholder-slate-500'
            }`}
        />
        <button 
            type="submit"
            disabled={!moveInput || disabled}
            className="absolute right-1 top-1 bottom-1 p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
        >
            <Send size={16} />
        </button>
      </form>

      <div className="h-px bg-slate-700 my-4" />

      {/* Difficulty Selector */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
           <Cpu size={14} /> AI Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(Difficulty).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`py-2 text-sm font-medium rounded-md transition-colors ${
                difficulty === level
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-800'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Player Color Selector */}
      <div className="space-y-2">
         <label className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
            <User size={14} /> Play As
         </label>
         <div className="grid grid-cols-2 gap-2">
            <button
                onClick={() => setPlayerColor('w')}
                className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-all ${
                    playerColor === 'w' 
                    ? 'bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-400' 
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
            >
                <span className="w-3 h-3 rounded-full bg-white border border-slate-300"></span> White
            </button>
            <button
                onClick={() => setPlayerColor('b')}
                className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-all ${
                    playerColor === 'b' 
                    ? 'bg-slate-900 text-white font-bold ring-2 ring-slate-500 border border-slate-600' 
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
            >
                <span className="w-3 h-3 rounded-full bg-black border border-slate-600"></span> Black
            </button>
         </div>
      </div>

    </div>
  );
};