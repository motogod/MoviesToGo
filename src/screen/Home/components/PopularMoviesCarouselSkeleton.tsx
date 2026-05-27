import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Skeleton } from '@/components/ui/skeleton';

const CAROUSEL_SIDE_INSET = 28;
const POSTER_MAX_WIDTH = 260;

const PopularMoviesCarouselSkeleton = () => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();
  const posterWidth = Math.min(
    screenWidth - CAROUSEL_SIDE_INSET * 2,
    POSTER_MAX_WIDTH,
  );

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, posterWidth + 160],
  });

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 1400,
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
    <View style={styles.container}>
      <Skeleton style={[styles.poster, { width: posterWidth }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.shimmer, { transform: [{ translateX }] }]}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.22)',
              'rgba(255,255,255,0)',
            ]}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      </Skeleton>
      <Skeleton style={styles.title} />
      <Skeleton style={styles.titleEn} />
      <Skeleton style={styles.descriptionLine} />
      <Skeleton style={[styles.descriptionLine, styles.descriptionLineShort]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 34,
  },
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
  shimmerGradient: {
    flex: 1,
  },
  title: {
    width: '58%',
    height: 28,
    marginTop: 18,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  titleEn: {
    width: '46%',
    height: 18,
    marginTop: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(156,163,175,0.18)',
  },
  descriptionLine: {
    width: '82%',
    height: 18,
    marginTop: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(156,163,175,0.16)',
  },
  descriptionLineShort: {
    width: '68%',
    marginTop: 10,
  },
});

export default React.memo(PopularMoviesCarouselSkeleton);
