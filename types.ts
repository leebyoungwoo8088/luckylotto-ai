export interface LottoResult {
  numbers: number[];
  bonus?: number; // Optional bonus number
  reasoning: string;
}

export enum BallColor {
  YELLOW = 'yellow', // 1-10
  BLUE = 'blue',    // 11-20
  RED = 'red',      // 21-30
  GRAY = 'gray',    // 31-40
  GREEN = 'green',  // 41-45
}

export interface HistoryItem {
  id: string;
  numbers: number[];
  timestamp: Date;
  method: 'AI' | 'RANDOM';
  reasoning?: string;
}