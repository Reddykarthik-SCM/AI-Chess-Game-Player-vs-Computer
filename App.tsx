import React, { useState, useEffect, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Difficulty, GameStatus, PlayerColor, TakebackStatus } from './types';
import { getBestMove } from './services/chessAI';
import { MoveHistory } from './components/MoveHistory';
import { GameControls } from './components/GameControls';
import { PromotionDialog } from './components/PromotionDialog';
import { Trophy, AlertTriangle, PlayCircle, Scale, XCircle, CheckCircle } from 'lucide-react';

const App: React.FC = () => {
  // Game State
  const [game, setGame] = useState(new Chess());
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.Active);
  const [isThinking, setIsThinking] = useState(false);
  
  // Promotion State
  const [pendingPromotion, setPendingPromotion] = useState<{from: string, to: string} | null>(null);
  
  // Takeback State
  const [takebackStatus, setTakebackStatus] = useState<TakebackStatus>('idle');
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Use ref to track game instance for callbacks to avoid closure staleness
  const gameRef = useRef(game);

  // Update game state safely
  const safeGameMutate = (modify: (g: Chess) => void) => {
    setGame((g) => {
      const update = new Chess(g.fen()); // Copy
      modify(update);
      return update;
    });
  };

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  // Check Game Status
  useEffect(() => {
    gameRef.current = game;
    if (game.isCheckmate()) setGameStatus(GameStatus.Checkmate);
    else if (game.isDraw()) setGameStatus(GameStatus.Draw);
    else if (game.isStalemate()) setGameStatus(GameStatus.Stalemate);
    else setGameStatus(GameStatus.Active);
  }, [game]);

  // AI Move Effect
  useEffect(() => {
    // If game is over, do nothing
    if (game.isGameOver() || game.isDraw() || pendingPromotion) return;

    // Check if it's AI's turn
    if (game.turn() !== playerColor) {
      setIsThinking(true);
      // Timeout to allow UI to render "Thinking..." state
      const timer = setTimeout(() => {
        const bestMove = getBestMove(game, difficulty);
        if (bestMove) {
          safeGameMutate((g) => {
            g.move(bestMove);
          });
        }
        setIsThinking(false);
      }, 300); // Small delay for realism/rendering
      return () => clearTimeout(timer);
    }
  }, [game, difficulty, playerColor, pendingPromotion]);

  // Player Move
  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    // Prevent move if it's not player's turn or game over
    if (game.turn() !== playerColor || gameStatus !== GameStatus.Active) {
        showToast("It's not your turn!", "error");
        return false;
    }

    // Check for potential promotion move first using current state
    const moves = game.moves({ verbose: true });
    const isPromotion = moves.find(
      (m) => m.from === sourceSquare && m.to === targetSquare && m.promotion
    );

    if (isPromotion) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return false; // Return false to snap piece back while user selects promotion
    }

    // Attempt move on a copy to validate
    const gameCopy = new Chess(game.fen());
    let move: Move | null = null;
    try {
      move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
      });
    } catch (e) {
      move = null;
    }

    if (!move) {
        showToast("Invalid move", "error");
        return false;
    }

    // If valid, update state
    setGame(gameCopy);
    return true;
  };

  const onManualMove = (moveStr: string): boolean => {
     if (game.turn() !== playerColor || gameStatus !== GameStatus.Active) {
         showToast("It's not your turn!", "error");
         return false;
     }

     const gameCopy = new Chess(game.fen());
     let move: Move | null = null;
     try {
       move = gameCopy.move(moveStr);
     } catch (e) {
       move = null;
     }

     if (move) {
       setGame(gameCopy);
       return true;
     } else {
       showToast(`Invalid move: ${moveStr}`, 'error');
       return false;
     }
  };

  // Handle Promotion Selection
  const onPromotionSelect = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;

    safeGameMutate((g) => {
      try {
        g.move({
          from: pendingPromotion.from,
          to: pendingPromotion.to,
          promotion: piece,
        });
      } catch (e) {
        console.error('Promotion move failed', e);
        showToast("Promotion failed", "error");
      }
    });

    setPendingPromotion(null);
  };

  // Reset Game
  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameStatus(GameStatus.Active);
    setIsThinking(false);
    setPendingPromotion(null);
    setTakebackStatus('idle');
    setToast(null);
  };

  // Request Takeback Logic
  const requestTakeback = () => {
    if (takebackStatus !== 'idle') return;

    setTakebackStatus('requesting');

    // Simulate opponent decision delay
    setTimeout(() => {
        // Decision Logic:
        // Easy/Medium: Always accept
        // Hard: 30% chance to decline to make it annoying/strict
        const shouldDecline = difficulty === Difficulty.Hard && Math.random() < 0.3;

        if (shouldDecline) {
            setTakebackStatus('declined');
            showToast("Takeback declined by opponent", "error");
            // Reset status after showing error
            setTimeout(() => setTakebackStatus('idle'), 2000);
        } else {
            // Accept
            safeGameMutate((g) => {
                g.undo(); // Undo AI move
                g.undo(); // Undo Player move
            });
            setPendingPromotion(null);
            setTakebackStatus('idle');
            showToast("Takeback accepted", "success");
        }
    }, 800);
  };

  // Game Over Modal
  const GameOverModal = () => {
    if (gameStatus === GameStatus.Active) return null;

    let title = '';
    let message = '';
    let icon = null;
    let colorClass = '';

    if (gameStatus === GameStatus.Checkmate) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      const isPlayerWinner = (winner === 'White' && playerColor === 'w') || (winner === 'Black' && playerColor === 'b');
      title = isPlayerWinner ? 'Victory!' : 'Defeat!';
      message = isPlayerWinner ? 'Checkmate! You won the game.' : 'Checkmate! The AI outsmarted you.';
      icon = <Trophy size={48} />;
      colorClass = isPlayerWinner ? 'text-yellow-400' : 'text-red-500';
    } else {
      title = 'Draw';
      message = 'The game ended in a draw (Stalemate or Insufficient Material).';
      icon = <Scale size={48} />;
      colorClass = 'text-slate-400';
    }

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 rounded-lg">
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-8 max-w-sm w-full shadow-2xl transform scale-100 animate-in fade-in zoom-in duration-200 text-center">
          <div className={`mb-4 flex justify-center ${colorClass}`}>
            {icon}
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
          <p className="text-slate-400 mb-6">{message}</p>
          <button
            onClick={resetGame}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <PlayCircle size={20} /> Play Again
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg shadow-lg">
                    <Trophy size={20} className="text-white" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
                    Grandmaster Chess
                </h1>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-4">
                {isThinking ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 text-sm animate-pulse">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
                        AI Thinking...
                    </div>
                ) : (
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${
                        game.turn() === playerColor 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-slate-700/50 text-slate-400 border-slate-700'
                    }`}>
                        {game.turn() === playerColor ? "Your Turn" : "Opponent's Turn"}
                    </div>
                )}
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            
            {/* Left Column: Board */}
            <div className="lg:col-span-8 flex flex-col items-center justify-start relative">
                <div className="w-full max-w-[600px] aspect-square shadow-2xl rounded-lg overflow-hidden ring-4 ring-slate-800/50 relative">
                    <Chessboard 
                        id="BasicBoard"
                        position={game.fen()} 
                        onPieceDrop={onDrop}
                        isDraggablePiece={({ piece }) => piece.startsWith(playerColor)}
                        boardOrientation={playerColor === 'w' ? 'white' : 'black'}
                        customDarkSquareStyle={{ backgroundColor: '#334155' }} // Slate-700
                        customLightSquareStyle={{ backgroundColor: '#94a3b8' }} // Slate-400
                        customBoardStyle={{
                            borderRadius: '4px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                        animationDuration={200}
                    />
                    
                    {/* Toast Notification */}
                    {toast && (
                        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 ${
                            toast.type === 'error' 
                            ? 'bg-red-500/90 text-white shadow-red-500/20' 
                            : 'bg-emerald-500/90 text-white shadow-emerald-500/20'
                        }`}>
                            {toast.type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
                            <span className="font-semibold">{toast.message}</span>
                        </div>
                    )}

                    <GameOverModal />
                    <PromotionDialog 
                        isOpen={!!pendingPromotion} 
                        onSelect={onPromotionSelect} 
                        color={playerColor}
                    />
                </div>

                {/* Check Alert */}
                {game.inCheck() && !game.isGameOver() && (
                    <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/50 animate-bounce">
                        <AlertTriangle size={20} />
                        <span className="font-bold uppercase tracking-wider">Check!</span>
                    </div>
                )}
            </div>

            {/* Right Column: Controls & History */}
            <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                <GameControls 
                    difficulty={difficulty} 
                    setDifficulty={setDifficulty}
                    playerColor={playerColor}
                    setPlayerColor={setPlayerColor}
                    onReset={resetGame}
                    onRequestTakeback={requestTakeback}
                    takebackStatus={takebackStatus}
                    onManualMove={onManualMove}
                    disabled={isThinking || game.history().length === 0 || !!pendingPromotion}
                />
                
                <div className="flex-1 min-h-[300px]">
                    <MoveHistory history={game.history()} />
                </div>
            </div>

        </div>
      </main>
    </div>
  );
};

export default App;