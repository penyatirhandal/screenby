function channels(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) {
    return null;
  }
  const value = parseInt(hex[1], 16);
  return [
    Math.floor(value / 65536),
    Math.floor((value % 65536) / 256),
    value % 256,
  ];
}

/** Adds an alpha channel to a #RRGGBB colour without depending on RN internals. */
export function withAlpha(color: string, alpha: number): string {
  const rgb = channels(color);
  if (!rgb) {
    return color;
  }
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** Blends two hex colours; amount 0 = a, 1 = b. */
export function mixHex(a: string, b: string, amount: number): string {
  const first = channels(a);
  const second = channels(b);
  if (!first || !second) {
    return a;
  }
  const t = Math.min(Math.max(amount, 0), 1);
  const blended = first.map((channel, index) =>
    Math.round(channel + (second[index] - channel) * t),
  );
  return `#${blended
    .map(channel => channel.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}
