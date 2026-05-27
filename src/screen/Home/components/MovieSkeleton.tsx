import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Skeleton } from '@/components/ui/skeleton';

type ShimmerBlockProps = {
  animatedValue: Animated.Value;
  style: StyleProp<ViewStyle>;
};

const ShimmerBlock = ({ animatedValue, style }: ShimmerBlockProps) => {
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 220],
  });

  return (
    <Skeleton style={[styles.shimmerBlock, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.24)',
            'rgba(255,255,255,0)',
          ]}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </Skeleton>
  );
};

const MovieSkeleton = () => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmerAnimation]);

  return (
    <View style={styles.item}>
      <ShimmerBlock animatedValue={shimmerAnimation} style={styles.poster} />
      <ShimmerBlock animatedValue={shimmerAnimation} style={styles.title} />
      <ShimmerBlock animatedValue={shimmerAnimation} style={styles.titleEn} />
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    flex: 1,
  },
  shimmerBlock: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 96,
  },
  shimmerGradient: {
    flex: 1,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
  },
  title: {
    width: '78%',
    height: 22,
    marginTop: 12,
    borderRadius: 6,
  },
  titleEn: {
    width: '58%',
    height: 16,
    marginTop: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(156,163,175,0.18)',
  },
});

export default React.memo(MovieSkeleton);
