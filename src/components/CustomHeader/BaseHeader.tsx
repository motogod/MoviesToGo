import React, { type ReactNode } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const isIOS = Platform.OS === 'ios';

type BaseHeaderProps = {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  backgroundColor?: string;
};

const BaseHeader = ({
  left,
  center,
  right,
  backgroundColor = 'transparent',
}: BaseHeaderProps) => {
  const insets = useSafeAreaInsets();
  const paddingTopHeight = isIOS ? insets.top : insets.top + 10;

  return (
    <View style={[styles.header, { paddingTop: paddingTopHeight, backgroundColor }]}>
      <View style={styles.side}>{left}</View>
      <View style={styles.center}>{center}</View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
};

type HeaderTitleProps = {
  title?: string;
  color?: string;
  fontSize?: number;
};

export const HeaderTitle = ({
  title,
  color = '#FFF',
  fontSize = 16,
}: HeaderTitleProps) => {
  if (!title) {
    return null;
  }

  return (
    <Text numberOfLines={1} style={[styles.title, { color, fontSize }]}>
      {title}
    </Text>
  );
};

type BackHeaderButtonProps = {
  label?: string;
  color?: string;
  onPress: () => void;
};

export const BackHeaderButton = ({
  label = 'Back',
  color = '#FFF',
  onPress,
}: BackHeaderButtonProps) => (
  <Pressable onPress={onPress} hitSlop={10} style={styles.backButton}>
    <ArrowLeft size={18} color={color} strokeWidth={2.6} />
    <Text style={[styles.backText, { color }]}>{label}</Text>
  </Pressable>
);

type HeaderImageButtonProps = {
  source: ImageSourcePropType;
  alt: string;
  onPress?: () => void;
  imageClassName?: string;
};

export const HeaderImageButton = ({
  source,
  onPress,
}: HeaderImageButtonProps) => (
  <Pressable onPress={onPress} hitSlop={10} style={styles.imageButton}>
    <Image source={source} style={styles.image} resizeMode="contain" />
  </Pressable>
);

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 6,
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
  },
  center: {
    flex: 3,
    alignItems: 'center',
  },
  right: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    columnGap: 12,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  backButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  backText: {
    fontSize: 16,
  },
  imageButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 24,
    height: 24,
  },
});

export default BaseHeader;
