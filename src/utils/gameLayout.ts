import type {GameIconSize} from '../types';

export const GAME_GAP = 12;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export interface GameGrid {
  cardSize: number;
  rows: number;
}

/**
 * Large keeps the original one-row card size, normal halves it, and small
 * arranges the cards in two rows with a card sized to fit.
 */
export function gameGridFor(
  size: GameIconSize,
  areaWidth: number,
  areaHeight: number,
): GameGrid {
  const largeCardSize = clamp(
    Math.min(areaHeight * 0.74, areaWidth / 3.4),
    108,
    260,
  );
  if (size === 'small') {
    const twoRowSize = Math.min(
      largeCardSize * 0.4,
      (areaHeight - GAME_GAP * 2) / 2,
    );
    return {cardSize: clamp(twoRowSize, 52, 260), rows: 2};
  }
  if (size === 'normal') {
    return {cardSize: clamp(largeCardSize * 0.5, 52, 260), rows: 1};
  }
  return {cardSize: largeCardSize, rows: 1};
}

/** Splits games into columns so a horizontal list can render multiple rows. */
export function chunkGames<T>(games: T[], rows: number): T[][] {
  const columns: T[][] = [];
  for (let i = 0; i < games.length; i += rows) {
    columns.push(games.slice(i, i + rows));
  }
  return columns;
}
