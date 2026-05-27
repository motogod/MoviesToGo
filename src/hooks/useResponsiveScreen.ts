import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  getFontSizeMultiplier,
  scaleTypographyValue,
} from '@/utility/responsiveTypography';

export function useResponsiveScreen(compactHeightBreakpoint = 760) {
  const { width, height } = useWindowDimensions();

  const isCompactScreen = height < compactHeightBreakpoint;
  const isTablet = width >= 768;
  const isLargePhone = width >= 430 && width < 768;
  const fontSizeMultiplier = getFontSizeMultiplier(width);

  const pickScreenValue = useCallback(
    (compactValue: number, regularValue: number) => {
      return isCompactScreen ? compactValue : regularValue;
    },
    [isCompactScreen],
  );

  const getResponsiveImageSize = useCallback(
    (regularValue: number) => {
      return Math.floor(
        pickScreenValue(
          Math.min(width * 0.56, height * 0.24, regularValue),
          regularValue,
        ),
      );
    },
    [height, pickScreenValue, width],
  );

  const getResponsiveTitleFontSize = useCallback(
    (regularValue: number) => {
      return Math.floor(
        pickScreenValue(
          Math.min(width * 0.094, height * 0.044, regularValue),
          regularValue,
        ),
      );
    },
    [height, pickScreenValue, width],
  );

  const getResponsiveBodyFontSize = useCallback(
    (regularValue: number) => {
      return Math.floor(
        pickScreenValue(
          Math.min(width * 0.052, height * 0.014, regularValue),
          regularValue,
        ),
      );
    },
    [height, pickScreenValue, width],
  );

  const getResponsiveSpacing = useCallback(
    (regularValue: number) => {
      return Math.floor(
        pickScreenValue(
          Math.min(width * 0.04, height * 0.018, regularValue),
          regularValue,
        ),
      );
    },
    [height, pickScreenValue, width],
  );

  const getResponsiveAbsolute = useCallback(
    (regularValue: number) => {
      const compactValue = regularValue * (196 / 256);
      return Math.floor(pickScreenValue(compactValue, regularValue));
    },
    [pickScreenValue],
  );

  const getResponsiveFontSize = useCallback(
    (regularValue: number) => {
      return scaleTypographyValue(regularValue, fontSizeMultiplier);
    },
    [fontSizeMultiplier],
  );

  return {
    width,
    height,
    isCompactScreen,
    isLargePhone,
    isTablet,
    fontSizeMultiplier,
    pickScreenValue,
    getResponsiveImageSize,
    getResponsiveTitleFontSize,
    getResponsiveBodyFontSize,
    getResponsiveSpacing,
    getResponsiveAbsolute,
    getResponsiveFontSize,
  };
}

export default useResponsiveScreen;
