export const DEFAULT_MOVIE_BACKGROUND_COLOR = '#050608';

export type ImageColorsResult =
  | {
      platform: 'ios';
      background?: string;
      primary?: string;
      secondary?: string;
      detail?: string;
    }
  | {
      platform: 'android';
      dominant?: string;
      vibrant?: string;
      darkVibrant?: string;
      lightVibrant?: string;
      darkMuted?: string;
      lightMuted?: string;
      muted?: string;
      average?: string;
    }
  | {
      platform: 'web';
      dominant?: string;
      darkMuted?: string;
      darkVibrant?: string;
      lightVibrant?: string;
      lightMuted?: string;
      muted?: string;
      vibrant?: string;
    };

export const normalizeHexColor = (color?: string | null) => {
  if (!color) {
    return null;
  }

  const trimmedColor = color.trim();
  const shortHexMatch = /^#([0-9a-f]{3})$/i.exec(trimmedColor);
  const longHexMatch = /^#([0-9a-f]{6})$/i.exec(trimmedColor);

  if (shortHexMatch) {
    return `#${shortHexMatch[1]
      .split('')
      .map(character => character + character)
      .join('')}`;
  }

  if (longHexMatch) {
    return trimmedColor;
  }

  return null;
};

export const blendHexColor = (
  color: string,
  baseColor: string,
  baseWeight = 0.78,
) => {
  const normalizedColor =
    normalizeHexColor(color) ?? DEFAULT_MOVIE_BACKGROUND_COLOR;
  const normalizedBase =
    normalizeHexColor(baseColor) ?? DEFAULT_MOVIE_BACKGROUND_COLOR;
  const source = normalizedColor.replace('#', '');
  const base = normalizedBase.replace('#', '');

  const channels = [0, 2, 4].map(index => {
    const sourceValue = parseInt(source.slice(index, index + 2), 16);
    const baseValue = parseInt(base.slice(index, index + 2), 16);
    const value = Math.round(
      sourceValue * (1 - baseWeight) + baseValue * baseWeight,
    );

    return value.toString(16).padStart(2, '0');
  });

  return `#${channels.join('')}`;
};

const getHexColorStats = (color: string) => {
  const normalizedColor = normalizeHexColor(color);

  if (!normalizedColor) {
    return null;
  }

  const value = normalizedColor.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16) / 255;
  const green = parseInt(value.slice(2, 4), 16) / 255;
  const blue = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const luminance = (max + min) / 2;
  const chroma = max - min;
  const saturation =
    chroma === 0 ? 0 : chroma / (1 - Math.abs(2 * luminance - 1));
  const warmBias = red > blue ? (red - blue) * 0.18 : 0;

  return {
    color: normalizedColor,
    luminance,
    saturation,
    score:
      saturation * 1.35 +
      chroma * 0.9 +
      warmBias -
      Math.abs(luminance - 0.48) * 0.35,
  };
};

export const pickImageColor = (colors: ImageColorsResult) => {
  const candidates =
    colors.platform === 'ios'
      ? [colors.primary, colors.secondary, colors.detail, colors.background]
      : colors.platform === 'android'
        ? [
            colors.vibrant,
            colors.darkVibrant,
            colors.lightVibrant,
            colors.dominant,
            colors.muted,
            colors.darkMuted,
            colors.lightMuted,
            colors.average,
          ]
        : [
            colors.vibrant,
            colors.darkVibrant,
            colors.lightVibrant,
            colors.dominant,
            colors.muted,
            colors.darkMuted,
            colors.lightMuted,
          ];
  const rankedColors = candidates
    .map(getHexColorStats)
    .filter(
      (
        colorStats,
      ): colorStats is NonNullable<ReturnType<typeof getHexColorStats>> =>
        colorStats !== null &&
        colorStats.luminance > 0.08 &&
        colorStats.luminance < 0.92,
    )
    .sort((a, b) => b.score - a.score);

  if (rankedColors[0]) {
    return rankedColors[0].color;
  }

  if (colors.platform === 'ios') {
    return colors.background ?? colors.primary;
  }

  if (colors.platform === 'android') {
    return colors.dominant ?? colors.darkMuted ?? colors.average;
  }

  return colors.dominant ?? colors.darkMuted ?? colors.vibrant;
};

export const getMovieFallbackColor = (seedValue?: string | number | null) => {
  const palette = [
    '#7F1D1D',
    '#78350F',
    '#365314',
    '#064E3B',
    '#164E63',
    '#1E3A8A',
    '#4C1D95',
    '#831843',
  ];
  const seed = `${seedValue ?? 'movie'}`;
  const seedTotal = seed
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return palette[seedTotal % palette.length];
};
