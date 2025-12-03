import { Chess, Move } from 'chess.js';
import { evaluateBoard } from './evaluation';
import { Difficulty } from '../types';

// Values for MVV-LVA move ordering (matching evaluation weights)
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

/**
 * Calculates a heuristic score for a move to optimize sorting order.
 * Higher scores are checked first in Minimax to maximize Alpha-Beta pruning.
 */
const getMoveScore = (move: Move): number => {
  let score = 0;

  // 1. Captures: MVV-LVA (Most Valuable Victim - Least Valuable Aggressor)
  if (move.captured) {
    const victimValue = PIECE_VALUES[move.captured] || 0;
    const aggressorValue = PIECE_VALUES[move.piece] || 0;
    
    // Formula: 10000 offset + (10 * Victim) - Aggressor
    // e.g. Pawn(100) takes Queen(900): 10000 + 9000 - 100 = 18900
    // e.g. Queen(900) takes Pawn(100): 10000 + 1000 - 900 = 10100
    score += 10000 + (victimValue * 10) - aggressorValue;
  }

  // 2. Promotions
  if (move.promotion) {
    // Queen promotion is almost always best
    if (move.promotion === 'q') score += 9000;
    else score += 4000; // Underpromotion
  }

  // 3. Checks (Force opponent response)
  // 'san' usually contains '+' for check or '#' for mate
  if (move.san.includes('+') || move.san.includes('#')) {
    score += 2000;
  }

  // 4. Castling (Good for safety/development)
  if (move.flags.includes('k') || move.flags.includes('q')) {
    score += 500;
  }

  return score;
};

export const getBestMove = (
  game: Chess,
  difficulty: Difficulty
): Move | null => {
  const possibleMoves = game.moves({ verbose: true });
  if (possibleMoves.length === 0) return null;

  // Easy: Random Move
  if (difficulty === Difficulty.Easy) {
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    return possibleMoves[randomIndex];
  }

  // Medium: Depth 2, Hard: Depth 3
  // Note: Depth 3 is significant for JS in the browser.
  // With better move ordering, we could potentially push to 4, but 3 is safe for responsiveness.
  const depth = difficulty === Difficulty.Medium ? 2 : 3;
  const isMaximizingPlayer = game.turn() === 'w';

  const { bestMove } = minimax(
    game,
    depth,
    -Infinity,
    Infinity,
    isMaximizingPlayer
  );

  return bestMove || possibleMoves[0];
};

interface MinimaxResult {
  bestMove: Move | null;
  bestScore: number;
}

const minimax = (
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizingPlayer: boolean
): MinimaxResult => {
  // Base case: leaf node or game over
  if (depth === 0 || game.isGameOver()) {
    return {
      bestMove: null,
      bestScore: evaluateBoard(game),
    };
  }

  const moves = game.moves({ verbose: true });

  // Move Ordering: Sort moves to prioritize 'good' moves first.
  // This drastically improves Alpha-Beta pruning efficiency.
  moves.sort((a, b) => getMoveScore(b) - getMoveScore(a));

  let bestMove: Move | null = null;

  if (isMaximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const { bestScore } = minimax(game, depth - 1, alpha, beta, false);
      game.undo();

      if (bestScore > maxEval) {
        maxEval = bestScore;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break; // Beta Cut-off
    }
    return { bestMove, bestScore: maxEval };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const { bestScore } = minimax(game, depth - 1, alpha, beta, true);
      game.undo();

      if (bestScore < minEval) {
        minEval = bestScore;
        bestMove = move;
      }
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) break; // Alpha Cut-off
    }
    return { bestMove, bestScore: minEval };
  }
};