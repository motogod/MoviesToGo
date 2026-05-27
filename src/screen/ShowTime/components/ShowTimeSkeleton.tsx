import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
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

const CARD_SKELETONS = [
  {
    titleWidth: '66%',
    titleEnWidth: '42%',
    sessions: [
      { versionWidth: 116, times: [112, 112, 112, 112, 112] },
      { versionWidth: 116, times: [112, 112] },
    ],
  },
  {
    titleWidth: '58%',
    titleEnWidth: '50%',
    sessions: [{ versionWidth: 132, times: [112, 112, 112] }],
  },
] as const;

const ShimmerBlock = ({ animatedValue, style }: ShimmerBlockProps) => {
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 320],
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
            'rgba(255,255,255,0.22)',
            'rgba(255,255,255,0)',
          ]}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </Skeleton>
  );
};

const ShowTimeSkeleton = () => {
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
    <ScrollView
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.container}
    >
      {CARD_SKELETONS.map((card, cardIndex) => (
        <View key={`show-time-card-skeleton-${cardIndex}`} style={styles.card}>
          <View style={styles.backdropWrap}>
            <ShimmerBlock
              animatedValue={shimmerAnimation}
              style={styles.backdrop}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(16,16,20,0)', 'rgba(16,16,20,0.9)', '#101014']}
              style={styles.backdropGradient}
            />
            <View style={styles.titleBlock}>
              <ShimmerBlock
                animatedValue={shimmerAnimation}
                style={[styles.title, { width: card.titleWidth }]}
              />
              <ShimmerBlock
                animatedValue={shimmerAnimation}
                style={[styles.titleEn, { width: card.titleEnWidth }]}
              />
            </View>
          </View>

          <View style={styles.body}>
            {card.sessions.map((session, sessionIndex) => (
              <View
                key={`show-time-session-skeleton-${cardIndex}-${sessionIndex}`}
                style={styles.session}
              >
                <View style={styles.sessionHeader}>
                  <ShimmerBlock
                    animatedValue={shimmerAnimation}
                    style={[
                      styles.versionPill,
                      { width: session.versionWidth },
                    ]}
                  />
                  <ShimmerBlock
                    animatedValue={shimmerAnimation}
                    style={styles.hallBadge}
                  />
                </View>
                <View style={styles.timeWrap}>
                  {session.times.map((width, timeIndex) => (
                    <ShimmerBlock
                      key={`show-time-chip-skeleton-${cardIndex}-${sessionIndex}-${timeIndex}`}
                      animatedValue={shimmerAnimation}
                      style={[styles.timeChip, { width }]}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    rowGap: 18,
  },
  shimmerBlock: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 110,
  },
  shimmerGradient: {
    flex: 1,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#101014',
  },
  backdropWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  backdrop: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  backdropGradient: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 116,
  },
  titleBlock: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    left: 16,
  },
  title: {
    height: 30,
    borderRadius: 8,
  },
  titleEn: {
    height: 18,
    marginTop: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(156,163,175,0.18)',
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    rowGap: 18,
  },
  session: {
    rowGap: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 10,
  },
  versionPill: {
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  hallBadge: {
    width: 64,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(78,201,224,0.18)',
  },
  timeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    height: 52,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

export default React.memo(ShowTimeSkeleton);
