import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
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
    outputRange: [-180, 260],
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
            'rgba(255,255,255,0.2)',
            'rgba(255,255,255,0)',
          ]}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </Skeleton>
  );
};

const MovieModalSkeleton = () => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();
  const stillWidth = Math.min(screenWidth * 0.64, 260);

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
    <View style={styles.container}>
      <View style={styles.ratingsRow}>
        {Array.from({ length: 3 }, (_, index) => (
          <View key={`rating-${index}`} style={styles.ratingItem}>
            <ShimmerBlock
              animatedValue={shimmerAnimation}
              style={styles.ratingIcon}
            />
            <ShimmerBlock
              animatedValue={shimmerAnimation}
              style={styles.ratingValue}
            />
          </View>
        ))}
      </View>

      <View style={styles.infoSection}>
        <ShimmerBlock animatedValue={shimmerAnimation} style={styles.infoWide} />
        <ShimmerBlock animatedValue={shimmerAnimation} style={styles.infoShort} />
        <ShimmerBlock animatedValue={shimmerAnimation} style={styles.infoWide} />
        <ShimmerBlock animatedValue={shimmerAnimation} style={styles.infoFull} />
        <ShimmerBlock animatedValue={shimmerAnimation} style={styles.infoMedium} />
      </View>

      <View style={styles.badgeRow}>
        <View style={styles.badgeGroup}>
          <ShimmerBlock animatedValue={shimmerAnimation} style={styles.badge} />
          <ShimmerBlock animatedValue={shimmerAnimation} style={styles.badge} />
          <ShimmerBlock animatedValue={shimmerAnimation} style={styles.badge} />
        </View>
        <ShimmerBlock
          animatedValue={shimmerAnimation}
          style={styles.ratingBadge}
        />
      </View>

      <View style={styles.accordionRow}>
        <ShimmerBlock
          animatedValue={shimmerAnimation}
          style={styles.accordionTitle}
        />
        <ShimmerBlock
          animatedValue={shimmerAnimation}
          style={styles.accordionChevron}
        />
      </View>

      <View style={styles.castSection}>
        <ShimmerBlock
          animatedValue={shimmerAnimation}
          style={styles.sectionTitle}
        />
        <View style={styles.horizontalList}>
          {Array.from({ length: 4 }, (_, index) => (
            <View key={`cast-${index}`} style={styles.castItem}>
              <ShimmerBlock
                animatedValue={shimmerAnimation}
                style={styles.castImage}
              />
              <ShimmerBlock
                animatedValue={shimmerAnimation}
                style={styles.castName}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.stillsSection}>
        <ShimmerBlock
          animatedValue={shimmerAnimation}
          style={styles.sectionTitle}
        />
        <View style={styles.horizontalList}>
          {Array.from({ length: 3 }, (_, index) => (
            <ShimmerBlock
              key={`still-${index}`}
              animatedValue={shimmerAnimation}
              style={[styles.stillImage, { width: stillWidth }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 28,
  },
  shimmerBlock: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 104,
  },
  shimmerGradient: {
    flex: 1,
  },
  ratingsRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 18,
    marginBottom: 18,
    paddingHorizontal: 18,
  },
  ratingItem: {
    alignItems: 'center',
    rowGap: 6,
  },
  ratingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  ratingValue: {
    width: 28,
    height: 14,
    borderRadius: 5,
    backgroundColor: 'rgba(156,163,175,0.18)',
  },
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 28,
    rowGap: 10,
  },
  infoWide: {
    width: '68%',
    height: 20,
    borderRadius: 6,
  },
  infoShort: {
    width: '42%',
    height: 20,
    borderRadius: 6,
  },
  infoFull: {
    width: '96%',
    height: 20,
    borderRadius: 6,
  },
  infoMedium: {
    width: '78%',
    height: 20,
    borderRadius: 6,
  },
  badgeRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  badgeGroup: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    width: 58,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(156,163,175,0.16)',
  },
  ratingBadge: {
    width: 32,
    height: 32,
    marginLeft: 16,
    borderRadius: 4,
  },
  accordionRow: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionTitle: {
    width: 86,
    height: 22,
    borderRadius: 6,
  },
  accordionChevron: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(156,163,175,0.18)',
  },
  castSection: {
    marginBottom: 24,
  },
  stillsSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    width: 64,
    height: 22,
    marginLeft: 16,
    marginBottom: 12,
    borderRadius: 6,
  },
  horizontalList: {
    flexDirection: 'row',
    columnGap: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  castItem: {
    width: 92,
  },
  castImage: {
    width: 92,
    aspectRatio: 2 / 3,
    borderRadius: 10,
  },
  castName: {
    width: 70,
    height: 14,
    marginTop: 8,
    marginHorizontal: 11,
    borderRadius: 5,
    backgroundColor: 'rgba(156,163,175,0.18)',
  },
  stillImage: {
    aspectRatio: 16 / 9,
    borderRadius: 12,
  },
});

export default React.memo(MovieModalSkeleton);
