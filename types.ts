export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export enum GameStatus {
  Active = 'Active',
  Checkmate = 'Checkmate',
  Draw = 'Draw',
  Stalemate = 'Stalemate',
  Resigned = 'Resigned',
}

export type PlayerColor = 'w' | 'b';

export type TakebackStatus = 'idle' | 'requesting' | 'declined';

export interface GameState {
  fen: string;
  turn: PlayerColor;
  isCheck: boolean;
  isGameOver: boolean;
  status: GameStatus;
  winner?: PlayerColor;
  history: string[];
}