import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { ArrowLeft, ZoomIn } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Popover from 'react-native-popover-view';

type PropsType = {
  leftVariant?: 'logo' | 'back';
  leftTitle?: string;
  centerTitle?: string;
  onPress?: () => void;
  backgroundColor?: string;
  notificationSource?: ImageSourcePropType;
  supportSource?: ImageSourcePropType;
  rightImageAlt?: string;
  notificationOnPress?: () => void;
  supportOnPress?: () => void;
};

const HomeHeader = ({
  centerTitle,
  leftVariant = 'logo',
  onPress,
  backgroundColor = '#0B0B0F',
  notificationOnPress,
}: PropsType) => {
  const { top } = useSafeAreaInsets();
  const titleAnimation = useRef(
    new Animated.Value(centerTitle ? 1 : 0),
  ).current;
  const logoFlipAnimation = useRef(new Animated.Value(0)).current;
  const logoFlipCountRef = useRef(0);
  const [isLogoPopoverVisible, setIsLogoPopoverVisible] = useState(false);

  useEffect(() => {
    if (!centerTitle) {
      titleAnimation.setValue(0);
      return;
    }

    titleAnimation.setValue(0);
    Animated.timing(titleAnimation, {
      toValue: 1,
      duration: 1360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [centerTitle, titleAnimation]);

  const titleAnimatedStyle = {
    opacity: titleAnimation,
    transform: [
      {
        translateX: titleAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-56, 0],
        }),
      },
    ],
  };
  const logoRotateY = logoFlipAnimation.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '-180deg', '-360deg'],
  });

  const triggerLogoInteraction = () => {
    const nextFlipCount = logoFlipCountRef.current + 1;

    logoFlipAnimation.stopAnimation();
    setIsLogoPopoverVisible(true);

    Animated.timing(logoFlipAnimation, {
      toValue: nextFlipCount,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      logoFlipCountRef.current = nextFlipCount % 2;
      logoFlipAnimation.setValue(logoFlipCountRef.current);
    });
  };

  const renderLogoButton = () => (
    <Pressable
      accessibilityRole="button"
      onPress={triggerLogoInteraction}
      hitSlop={10}
      style={styles.iconButton}
    >
      <Animated.Image
        source={require('@/assets/image/headerIcon.png')}
        resizeMode="contain"
        style={[
          styles.headerIcon,
          {
            transform: [{ perspective: 900 }, { rotateY: logoRotateY }],
          },
        ]}
      />
    </Pressable>
  );

  return (
    <View style={[styles.header, { paddingTop: top, backgroundColor }]}>
      <LinearGradient
        pointerEvents="none"
        start={{ x: 0, y: -0.9 }}
        end={{ x: 0, y: 1 }}
        // colors={['#FFF', 'rgba(255,255,255,0)']}
        colors={['#FFF', '#0B0B0F']}
        style={styles.gradient}
      />
      {leftVariant === 'back' ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          hitSlop={10}
          style={[styles.iconButton, styles.backIconButton]}
        >
          <ArrowLeft size={27} color="#F3F4F6" strokeWidth={2.8} />
        </Pressable>
      ) : (
        <Popover
          backgroundStyle={styles.logoPopoverBackdrop}
          isVisible={isLogoPopoverVisible}
          onRequestClose={() => setIsLogoPopoverVisible(false)}
          from={renderLogoButton()}
          popoverStyle={styles.logoPopover}
        >
          <Text style={styles.logoPopoverText}>版本 1.0.2</Text>
        </Popover>
      )}

      {centerTitle ? (
        <Animated.Text
          numberOfLines={1}
          style={[styles.title, titleAnimatedStyle]}
        >
          {centerTitle}
        </Animated.Text>
      ) : null}

      {notificationOnPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={notificationOnPress}
          hitSlop={10}
          style={styles.iconButton}
        >
          <ZoomIn size={22} color="#C6A05E" strokeWidth={2.6} />
        </Pressable>
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
    paddingHorizontal: 16,
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
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  backIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  headerIcon: {
    width: 180,
    height: 65,
  },
  logoPopover: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1A1D24',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  logoPopoverBackdrop: {
    backgroundColor: 'transparent',
  },
  logoPopoverText: {
    color: '#F9FAFB',
    fontSize: 15,
    lineHeight: 21,
  },
  title: {
    position: 'absolute',
    right: 72,
    left: 72,
    bottom: 12,
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    zIndex: 1,
  },
});

export default HomeHeader;
