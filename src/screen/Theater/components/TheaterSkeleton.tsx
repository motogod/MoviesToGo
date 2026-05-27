import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Skeleton } from '@/components/ui/skeleton';

type ShimmerBlockProps = {
  animatedValue: Animated.Value;
  style: StyleProp<ViewStyle>;
};

const CITY_SKELETON_WIDTHS = [78, 78, 78, 78, 78, 78];
const CINEMA_SKELETON_WIDTHS: Array<{
  address: DimensionValue;
  name: DimensionValue;
}> = [
  { name: '74%', address: '64%' },
  { name: '82%', address: '56%' },
  { name: '46%', address: '48%' },
  { name: '58%', address: '54%' },
  { name: '66%', address: '70%' },
  { name: '62%', address: '62%' },
  { name: '54%', address: '52%' },
];

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

const TheaterSkeleton = () => {
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
    <View style={styles.container}>
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cityListContent}
        style={styles.cityList}
      >
        {CITY_SKELETON_WIDTHS.map((width, index) => (
          <View key={`city-skeleton-${index}`} style={styles.cityItem}>
            <ShimmerBlock
              animatedValue={shimmerAnimation}
              style={[styles.cityTitle, { width }]}
            />
          </View>
        ))}
      </ScrollView>

      <ScrollView
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.cinemaListContent}
        style={styles.cinemaList}
      >
        {CINEMA_SKELETON_WIDTHS.map((item, index) => (
          <View key={`cinema-skeleton-${index}`} style={styles.cinemaItem}>
            <ShimmerBlock
              animatedValue={shimmerAnimation}
              style={[styles.cinemaName, { width: item.name }]}
            />
            <ShimmerBlock
              animatedValue={shimmerAnimation}
              style={[styles.cinemaAddress, { width: item.address }]}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
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
  cityList: {
    flexGrow: 0,
    flexShrink: 0,
    marginHorizontal: -24,
  },
  cityListContent: {
    paddingHorizontal: 16,
  },
  cityItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 18,
  },
  cityTitle: {
    height: 38,
    borderRadius: 2,
  },
  cinemaList: {
    flex: 1,
    marginHorizontal: -24,
  },
  cinemaListContent: {
    paddingBottom: 132,
    paddingHorizontal: 24,
    paddingTop: 12,
    rowGap: 24,
  },
  cinemaItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    width: '100%',
  },
  cinemaName: {
    height: 24,
    borderRadius: 7,
  },
  cinemaAddress: {
    height: 18,
    borderRadius: 6,
    marginTop: 10,
    backgroundColor: 'rgba(156,163,175,0.18)',
  },
});

export default React.memo(TheaterSkeleton);
