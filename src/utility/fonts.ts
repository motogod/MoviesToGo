import { Platform } from 'react-native';

const platformFont = (ios: string, android: string) =>
  Platform.select({
    android,
    ios,
    default: android,
  });

export const FONT_FAMILY = {
  inter18Light: platformFont('Inter18pt-Light', 'Inter_18pt-Light'),
  inter28Regular: platformFont('Inter28pt-Regular', 'Inter_28pt-Regular'),
  oswaldLight: platformFont('Oswald-Light', 'Oswald-Light'),
  oswaldRegular: platformFont('Oswald-Regular', 'Oswald-Regular'),
} as const;
