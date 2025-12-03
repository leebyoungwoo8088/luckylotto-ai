import { BallColor } from '../types';

export const getBallColor = (num: number): BallColor => {
  if (num <= 10) return BallColor.YELLOW;
  if (num <= 20) return BallColor.BLUE;
  if (num <= 30) return BallColor.RED;
  if (num <= 40) return BallColor.GRAY;
  return BallColor.GREEN;
};

export const getBallTailwindColors = (color: BallColor) => {
  switch (color) {
    case BallColor.YELLOW:
      return { bg: 'bg-[#fbc400]', shadow: 'shadow-yellow-700', text: 'text-black', border: 'border-yellow-300' };
    case BallColor.BLUE:
      return { bg: 'bg-[#69c8f2]', shadow: 'shadow-blue-700', text: 'text-white', border: 'border-blue-400' };
    case BallColor.RED:
      return { bg: 'bg-[#ff7272]', shadow: 'shadow-red-900', text: 'text-white', border: 'border-red-400' };
    case BallColor.GRAY:
      return { bg: 'bg-[#a0a0a0]', shadow: 'shadow-gray-700', text: 'text-white', border: 'border-gray-400' };
    case BallColor.GREEN:
      return { bg: 'bg-[#b0d840]', shadow: 'shadow-green-700', text: 'text-white', border: 'border-green-400' };
    default:
      return { bg: 'bg-gray-200', shadow: 'shadow-gray-400', text: 'text-black', border: 'border-gray-100' };
  }
};

// Simulated "Hot" and "Cold" numbers based on typical lotto statistics
// Hot numbers: Frequently drawn in the last 10 years
// Cold numbers: Rarely drawn
const STATS = {
  HOT: [1, 12, 18, 27, 34, 39, 45, 7, 10, 24], 
  WARM: [2, 4, 13, 17, 20, 26, 33, 40],
  COLD: [9, 22, 23, 29, 32, 41, 8]
};

export const generateWeightedRandomNumbers = (): number[] => {
  const weights: { [key: number]: number } = {};
  
  // Initialize base weights
  for (let i = 1; i <= 45; i++) {
    weights[i] = 1.0;
  }
  
  // Apply statistical bias based on 10 years of data simulation
  STATS.HOT.forEach(n => weights[n] += 1.2);   // +120% chance
  STATS.WARM.forEach(n => weights[n] += 0.5);  // +50% chance
  STATS.COLD.forEach(n => weights[n] -= 0.2);  // -20% chance

  const selected: number[] = [];
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);

  // Pick 6 numbers
  while (selected.length < 6) {
    let totalWeight = 0;
    const currentPool = pool.filter(n => !selected.includes(n));
    currentPool.forEach(n => totalWeight += weights[n]);

    let random = Math.random() * totalWeight;
    
    for (const num of currentPool) {
      random -= weights[num];
      if (random <= 0) {
        selected.push(num);
        break;
      }
    }
  }

  return selected.sort((a, b) => a - b);
};