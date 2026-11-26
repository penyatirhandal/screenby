import {chunkGames, gameGridFor} from '../src/utils/gameLayout';

describe('game grid sizing', () => {
  const areaWidth = 900;
  const areaHeight = 350;

  test('large keeps the original card size in one row', () => {
    const grid = gameGridFor('large', areaWidth, areaHeight);
    expect(grid.rows).toBe(1);
    expect(grid.cardSize).toBeCloseTo(
      Math.min(areaHeight * 0.74, areaWidth / 3.4),
      5,
    );
  });

  test('normal halves the current card size and stays in one row', () => {
    const large = gameGridFor('large', areaWidth, areaHeight);
    const normal = gameGridFor('normal', areaWidth, areaHeight);
    expect(normal.rows).toBe(1);
    expect(normal.cardSize).toBeCloseTo(large.cardSize * 0.5, 5);
  });

  test('small uses two rows and fits without overlap', () => {
    const small = gameGridFor('small', areaWidth, areaHeight);
    const normal = gameGridFor('normal', areaWidth, areaHeight);
    expect(small.rows).toBe(2);
    expect(small.cardSize).toBeLessThan(normal.cardSize);
    expect(small.cardSize * 2 + 12).toBeLessThanOrEqual(areaHeight);
  });

  test('games are chunked into columns of the requested row count', () => {
    expect(chunkGames([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkGames([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });
});
