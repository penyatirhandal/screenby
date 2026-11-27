export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FocusCandidate {
  id: string;
  rect: Rect;
}

const EPSILON = 2;
const SECONDARY_PENALTY = 2.5;

function center(rect: Rect): {x: number; y: number} {
  return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
}

/**
 * Picks the closest target in a direction. Targets aligned on the cross axis
 * win over targets that require a large perpendicular move. When nothing lies
 * ahead, focus wraps to the far edge, which mirrors a game console home row.
 */
export function pickFocusTarget(
  active: Rect,
  candidates: FocusCandidate[],
  direction: 'up' | 'down' | 'left' | 'right',
): string | null {
  if (candidates.length === 0) {
    return null;
  }

  const from = center(active);
  const horizontal = direction === 'left' || direction === 'right';
  const forward = direction === 'right' || direction === 'down';
  const axis = horizontal ? 'x' : 'y';
  const cross = horizontal ? 'y' : 'x';

  const scored = candidates
    .map(candidate => {
      const to = center(candidate.rect);
      const delta = to[axis] - from[axis];
      const ahead = forward ? delta > EPSILON : delta < -EPSILON;
      if (!ahead) {
        return null;
      }
      const crossDelta = Math.abs(to[cross] - from[cross]);
      const aligned = overlap(
        from[cross] - (horizontal ? active.height : active.width) / 2,
        from[cross] + (horizontal ? active.height : active.width) / 2,
        to[cross] - (horizontal ? candidate.rect.height : candidate.rect.width) / 2,
        to[cross] + (horizontal ? candidate.rect.height : candidate.rect.width) / 2,
      );
      const score =
        Math.abs(delta) +
        (aligned >= 0 ? 0 : crossDelta * SECONDARY_PENALTY);
      return {id: candidate.id, score, delta, crossDelta};
    })
    .filter((item): item is {id: string; score: number; delta: number; crossDelta: number} => item !== null);

  if (scored.length > 0) {
    scored.sort((a, b) => a.score - b.score || a.crossDelta - b.crossDelta);
    return scored[0].id;
  }

  const wrapped = candidates
    .map(candidate => ({id: candidate.id, value: center(candidate.rect)[axis]}))
    .sort((a, b) => (forward ? a.value - b.value : b.value - a.value));
  return wrapped.length > 0 ? wrapped[0].id : null;
}
