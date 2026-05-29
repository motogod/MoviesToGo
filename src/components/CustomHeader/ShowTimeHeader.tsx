import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_FAMILY } from '@/utility/fonts';

type PropsType = {
  title?: string;
  subtitle?: string;
  onBack: () => void;
  backgroundColor?: string;
  showTitle?: boolean;
  showRightIcon?: boolean;
  variant?: 'default' | 'filter';
};

const HEADER_HORIZONTAL_PADDING = 16;
const BACK_BUTTON_SIZE = 48;
const HEADER_ICON_WIDTH = 180;
const HEADER_ICON_HEIGHT = 65;

const ShowTimeHeader = ({
  title,
  subtitle,
  onBack,
  backgroundColor = '#0B0B0F',
  showTitle = true,
  showRightIcon = true,
  variant = 'default',
}: PropsType) => {
  const { top } = useSafeAreaInsets();
  const iconRotateAnimation = useRef(new Animated.Value(0)).current;
  const subtitleAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    iconRotateAnimation.setValue(0);
    Animated.timing(iconRotateAnimation, {
      toValue: 1,
      duration: 760,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [iconRotateAnimation]);

  useEffect(() => {
    if (!subtitle) {
      subtitleAnimation.setValue(0);
      return;
    }

    subtitleAnimation.setValue(0);
    Animated.timing(subtitleAnimation, {
      toValue: 1,
      duration: 1680,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [subtitle, subtitleAnimation]);

  const iconRotate = iconRotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const subtitleAnimatedStyle = {
    opacity: subtitleAnimation,
    transform: [
      {
        translateX: subtitleAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-372, 0],
        }),
      },
    ],
  };

  const handleBack = useCallback(() => {
    onBack();
  }, [onBack]);

  return (
    <View style={[styles.header, { paddingTop: top, backgroundColor }]}>
      <LinearGradient
        pointerEvents="none"
        start={{ x: 0, y: -0.9 }}
        end={{ x: 0, y: 1 }}
        colors={
          variant === 'filter'
            ? ['#151514', '#07080B']
            : ['#FFF', '#0B0B0F']
        }
        style={styles.gradient}
      />
      <Pressable
        accessibilityRole="button"
        android_ripple={{ color: 'transparent', borderless: false }}
        onPress={handleBack}
        hitSlop={10}
        style={[
          styles.backIconButton,
          variant === 'filter' && styles.filterBackIconButton,
        ]}
      >
        <ArrowLeft
          size={27}
          color={variant === 'filter' ? '#F4E1B4' : '#F3F4F6'}
          strokeWidth={2.8}
        />
      </Pressable>

      {showTitle ? (
        <View
          style={[
            styles.titleBlock,
            subtitle ? styles.titleBlockWithSubtitle : null,
          ]}
        >
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Animated.Text
              numberOfLines={1}
              style={[styles.subtitle, subtitleAnimatedStyle]}
            >
              {subtitle}
            </Animated.Text>
          ) : null}
        </View>
      ) : null}

      {showRightIcon ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.animatedIconSlot,
            {
              top: top - 4,
            },
          ]}
        >
          <Animated.Image
            source={require('@/assets/image/headerIcon.png')}
            resizeMode="contain"
            style={[
              styles.headerIcon,
              { transform: [{ rotateY: iconRotate }] },
            ]}
          />
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HEADER_HORIZONTAL_PADDING,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  backIconButton: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BACK_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.46)',
    overflow: 'hidden',
    elevation: 4,
    zIndex: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.24,
        shadowRadius: 10,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  filterBackIconButton: {
    backgroundColor: 'rgba(18,18,18,0.62)',
    borderColor: 'rgba(230,196,141,0.36)',
    ...Platform.select({
      ios: {
        shadowColor: '#D8A94F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  title: {
    color: '#F3F4F6',
    fontSize: 17,
    letterSpacing: 0,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  titleBlock: {
    position: 'absolute',
    right: 112,
    left: 112,
    bottom: 12,
    alignItems: 'center',
    zIndex: 3,
  },
  titleBlockWithSubtitle: {
    bottom: 2,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
    marginTop: 2,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  animatedIconSlot: {
    position: 'absolute',
    right:
      HEADER_HORIZONTAL_PADDING + BACK_BUTTON_SIZE / 2 - HEADER_ICON_WIDTH / 2,
    width: HEADER_ICON_WIDTH,
    height: HEADER_ICON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerIcon: {
    width: HEADER_ICON_WIDTH,
    height: HEADER_ICON_HEIGHT,
  },
});

export default ShowTimeHeader;
