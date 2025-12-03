import { Chess, PieceSymbol, Color } from 'chess.js';

// Material weights
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Heuristic Bonuses
const BISHOP_PAIR_BONUS = 50;
const ROOK_OPEN_FILE_BONUS = 25;
const ROOK_SEMI_OPEN_FILE_BONUS = 10;
const KING_SHIELD_BONUS = 20;
const KING_OPEN_FILE_PENALTY = 25;
const MOBILITY_WEIGHT = 5;

// Piece Square Tables (PST)
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

const PSTS: Record<string, number[]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_PST,
};

// --- HELPER FUNCTIONS ---

const isValidSquare = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const getPieceMobility = (board: any[][], r: number, c: number, type: PieceSymbol, color: Color): number => {
  let moves = 0;
  
  const knightDirs = [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]];
  const rookDirs = [[1,0], [-1,0], [0,1], [0,-1]];
  const bishopDirs = [[1,1], [1,-1], [-1,1], [-1,-1]];
  
  let dirs: number[][] = [];
  if (type === 'n') dirs = knightDirs;
  else if (type === 'r') dirs = rookDirs;
  else if (type === 'b') dirs = bishopDirs;
  else if (type === 'q') dirs = [...rookDirs, ...bishopDirs];
  else return 0; // Pawns and King handled separately

  const isSliding = type !== 'n';

  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;

    if (!isSliding) {
      if (isValidSquare(nr, nc)) {
         const target = board[nr][nc];
         if (!target || target.color !== color) moves++;
      }
    } else {
      while (isValidSquare(nr, nc)) {
        const target = board[nr][nc];
        if (!target) {
          moves++;
        } else {
          if (target.color !== color) moves++; // Capture
          break; // Blocked
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  return moves;
};

const evaluateKingSafety = (board: any[][], r: number, c: number, isWhite: boolean): number => {
  let score = 0;
  const isBackRank = isWhite ? r === 7 : r === 0;

  // Only evaluate safety structure if king is on back rank (typical castling position)
  if (isBackRank) {
      // Check rank in front
      const shieldRank = isWhite ? r - 1 : r + 1;
      
      // Check 3 files around king
      for (let f = c - 1; f <= c + 1; f++) {
        if (f >= 0 && f < 8) {
           // Pawn shield
           if (isValidSquare(shieldRank, f)) {
             const piece = board[shieldRank][f];
             if (piece && piece.type === 'p' && piece.color === (isWhite ? 'w' : 'b')) {
               score += KING_SHIELD_BONUS;
             } else if (board[shieldRank][f] === null) {
                // Penalize open file immediately in front of king
                // A more complex engine would check the entire file
                score -= KING_OPEN_FILE_PENALTY;
             }
           }
        }
      }
  }
  return score;
};

// --- MAIN EVALUATION ---

export const evaluateBoard = (game: Chess): number => {
  const board = game.board();
  let totalEvaluation = 0;

  // Trackers
  let whiteKingPos = { r: -1, c: -1 };
  let blackKingPos = { r: -1, c: -1 };
  let whiteBishopCount = 0;
  let blackBishopCount = 0;
  
  // File trackers for Pawn Structure
  const whitePawnsPerFile = new Array(8).fill(0);
  const blackPawnsPerFile = new Array(8).fill(0);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const isWhite = piece.color === 'w';
      const sign = isWhite ? 1 : -1;
      const squareIndex = r * 8 + c;

      // 1. Material
      totalEvaluation += PIECE_VALUES[piece.type] * sign;

      // 2. Piece Square Tables
      let pstVal = 0;
      if (PSTS[piece.type]) {
        if (isWhite) {
          pstVal = PSTS[piece.type][squareIndex];
        } else {
          // Mirror for black
          pstVal = PSTS[piece.type][63 - squareIndex]; 
        }
      }
      totalEvaluation += pstVal * sign;

      // 3. Mobility
      // Calculate how many squares this piece attacks or can move to
      if (piece.type !== 'p' && piece.type !== 'k') {
         const mobility = getPieceMobility(board, r, c, piece.type, piece.color);
         totalEvaluation += mobility * MOBILITY_WEIGHT * sign;
      }

      // Feature Gathering
      if (piece.type === 'k') {
        if (isWhite) whiteKingPos = { r, c };
        else blackKingPos = { r, c };
      }
      else if (piece.type === 'b') {
        if (isWhite) whiteBishopCount++;
        else blackBishopCount++;
      }
      else if (piece.type === 'p') {
        if (isWhite) whitePawnsPerFile[c]++;
        else blackPawnsPerFile[c]++;
      }
    }
  }

  // 4. Second Pass: Rooks on Open Files
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'r') {
        const isWhite = piece.color === 'w';
        const myPawns = isWhite ? whitePawnsPerFile[c] : blackPawnsPerFile[c];
        const oppPawns = isWhite ? blackPawnsPerFile[c] : whitePawnsPerFile[c];
        
        // Bonus logic
        if (myPawns === 0) {
           const bonus = (oppPawns === 0) ? ROOK_OPEN_FILE_BONUS : ROOK_SEMI_OPEN_FILE_BONUS;
           totalEvaluation += isWhite ? bonus : -bonus;
        }
      }
    }
  }

  // 5. Bishop Pair
  if (whiteBishopCount >= 2) totalEvaluation += BISHOP_PAIR_BONUS;
  if (blackBishopCount >= 2) totalEvaluation -= BISHOP_PAIR_BONUS;

  // 6. King Safety
  if (whiteKingPos.r !== -1) totalEvaluation += evaluateKingSafety(board, whiteKingPos.r, whiteKingPos.c, true);
  if (blackKingPos.r !== -1) totalEvaluation -= evaluateKingSafety(board, blackKingPos.r, blackKingPos.c, false);

  return totalEvaluation;
};