const BASE_WIDTH = 390;
const MIN_FONT_MULTIPLIER = 0.88;
const MAX_FONT_MULTIPLIER = 1.16;

export function getFontSizeMultiplier(width: number) {
  const multiplier = width / BASE_WIDTH;

  return Math.min(Math.max(multiplier, MIN_FONT_MULTIPLIER), MAX_FONT_MULTIPLIER);
}

export function scaleTypographyValue(value: number, multiplier: number) {
  return Math.round(value * multiplier);
}
