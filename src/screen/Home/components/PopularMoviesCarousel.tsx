import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  FlatList,
  type FlatListProps,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import ImageColors from 'react-native-image-colors';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { PopularMovie } from '@/api/types/movies';
import type { Movie } from '@/api/types/movies';
import type { PosterLayout } from '@/components/CustomModal';
import { Text } from '@/components/ui/text';
import { FONT_FAMILY } from '@/utility/fonts';
import {
  blendHexColor,
  DEFAULT_MOVIE_BACKGROUND_COLOR,
  getMovieFallbackColor,
  normalizeHexColor,
  pickImageColor,
} from '../utils/moviePalette';

const CAROUSEL_SIDE_INSET = 28;
const CAROUSEL_ITEM_GAP = 24;
const POSTER_WIDTH_RATIO = 0.66;
const POSTER_HEIGHT_SCREEN_RATIO = 0.42;
const SIDE_CARD_ROTATION = 7;
const SIDE_CARD_TRANSLATE_Y = 24;
const SIDE_CARD_OPACITY = 0.28;
const MOVIE_INFO_MARGIN_TOP = 12;
const MOVIE_INFO_ESTIMATED_HEIGHT = 118;

type PopularCarouselItem = PopularMovie & {
  carouselKey: string;
};

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList as unknown as React.ComponentType<
    FlatListProps<PopularCarouselItem>
  >,
);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getPosterUrl = (item: PopularMovie) =>
  item.poster_url ?? item.movie?.poster_url ?? undefined;

const getMovieFromPopularMovie = (item: PopularMovie): Movie => {
  const posterUrl = getPosterUrl(item);

  return {
    ...item.movie,
    id: item.movie?.id ?? item.movie_id,
    movie_id: item.movie?.movie_id ?? item.movie_id,
    title: item.movie?.title ?? item.title,
    title_en: item.movie?.title_en ?? item.title_en,
    poster_url: posterUrl,
    backdrop_url: item.movie?.backdrop_url,
    youtube_thumbnail: item.movie?.youtube_thumbnail ?? posterUrl,
  };
};

const getFallbackColor = (item: PopularMovie) => {
  return getMovieFallbackColor(item.movie_id ?? item.title ?? item.rank);
};

type PopularMoviesCarouselProps = {
  popularMovies: PopularMovie[];
  onOpenMovie?: (movie: Movie, posterLayout: PosterLayout) => void;
};

const PopularMoviesCarousel = ({
  popularMovies,
  onOpenMovie,
}: PopularMoviesCarouselProps) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<PopularCarouselItem>>(null);
  const cardRefs = useRef(new Map<string, View | null>()).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  const introProgress = useRef(new Animated.Value(0)).current;
  const hasPlayedIntroRef = useRef(false);
  const backgroundProgress = useRef(new Animated.Value(1)).current;
  const activeBackgroundColorRef = useRef(DEFAULT_MOVIE_BACKGROUND_COLOR);
  const colorCacheRef = useRef(new Map<string, string>());
  const colorRequestIdRef = useRef(0);
  const activeMovieIndexRef = useRef(0);
  const [activeMovie, setActiveMovie] = useState<PopularMovie | null>(null);
  const [backgroundColors, setBackgroundColors] = useState({
    from: DEFAULT_MOVIE_BACKGROUND_COLOR,
    to: DEFAULT_MOVIE_BACKGROUND_COLOR,
  });

  const itemWidth = Math.round(
    Math.min(
      screenWidth * POSTER_WIDTH_RATIO,
      (screenHeight * POSTER_HEIGHT_SCREEN_RATIO) / 1.5,
      screenWidth - CAROUSEL_SIDE_INSET * 2,
    ),
  );
  const itemStride = itemWidth + CAROUSEL_ITEM_GAP;
  const carouselHeight = itemWidth * 1.5 + SIDE_CARD_TRANSLATE_Y;
  const introStartTranslateY =
    carouselHeight + MOVIE_INFO_MARGIN_TOP + MOVIE_INFO_ESTIMATED_HEIGHT;
  const centeredSideInset = Math.max((screenWidth - itemWidth) / 2, 0);
  const hasLoop = popularMovies.length > 1;

  const carouselData = useMemo<PopularCarouselItem[]>(() => {
    const source = hasLoop
      ? [...popularMovies, ...popularMovies, ...popularMovies]
      : popularMovies;

    return source.map((item, index) => ({
      ...item,
      carouselKey: `${item.rank}-${
        item.movie_id ?? item.title ?? 'movie'
      }-${index}`,
    }));
  }, [hasLoop, popularMovies]);

  const initialScrollIndex = hasLoop ? popularMovies.length : 0;

  useEffect(() => {
    if (carouselData.length > 0) {
      scrollX.setValue(initialScrollIndex * itemStride);
    }
  }, [carouselData.length, initialScrollIndex, itemStride, scrollX]);

  useEffect(() => {
    if (carouselData.length === 0 || hasPlayedIntroRef.current) {
      return;
    }

    hasPlayedIntroRef.current = true;
    introProgress.setValue(0);
    Animated.timing(introProgress, {
      toValue: 1,
      duration: 760,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [carouselData.length, introProgress]);

  const animateBackgroundColor = useCallback(
    (nextColor: string) => {
      const nextBackgroundColor = blendHexColor(
        nextColor,
        DEFAULT_MOVIE_BACKGROUND_COLOR,
      );

      if (nextBackgroundColor === activeBackgroundColorRef.current) {
        return;
      }

      backgroundProgress.stopAnimation();
      backgroundProgress.setValue(0);
      setBackgroundColors({
        from: activeBackgroundColorRef.current,
        to: nextBackgroundColor,
      });
      activeBackgroundColorRef.current = nextBackgroundColor;

      Animated.timing(backgroundProgress, {
        toValue: 1,
        duration: 420,
        useNativeDriver: false,
      }).start();
    },
    [backgroundProgress],
  );

  const updateBackgroundForItem = useCallback(
    async (item: PopularMovie) => {
      const requestId = colorRequestIdRef.current + 1;
      colorRequestIdRef.current = requestId;
      const posterUrl = getPosterUrl(item);

      if (!posterUrl) {
        animateBackgroundColor(getFallbackColor(item));
        return;
      }

      const cachedColor = colorCacheRef.current.get(posterUrl);

      if (cachedColor) {
        animateBackgroundColor(cachedColor);
        return;
      }

      try {
        const colors = await ImageColors.getColors(posterUrl, {
          fallback: DEFAULT_MOVIE_BACKGROUND_COLOR,
          cache: true,
          key: `${item.movie_id ?? item.rank ?? posterUrl}`,
          quality: 'low',
        });
        const pickedColor = normalizeHexColor(pickImageColor(colors));
        const nextColor = pickedColor ?? DEFAULT_MOVIE_BACKGROUND_COLOR;

        colorCacheRef.current.set(posterUrl, nextColor);

        if (requestId === colorRequestIdRef.current) {
          animateBackgroundColor(nextColor);
        }
      } catch {
        colorCacheRef.current.set(posterUrl, getFallbackColor(item));

        if (requestId === colorRequestIdRef.current) {
          animateBackgroundColor(getFallbackColor(item));
        }
      }
    },
    [animateBackgroundColor],
  );

  useEffect(() => {
    if (popularMovies.length > 0) {
      activeMovieIndexRef.current = 0;
      setActiveMovie(popularMovies[0]);
      updateBackgroundForItem(popularMovies[0]);
    }
  }, [popularMovies, updateBackgroundForItem]);

  const updateActiveMovieForOffset = useCallback(
    (offsetX: number) => {
      if (popularMovies.length === 0) {
        return null;
      }

      const itemIndex = Math.round(offsetX / itemStride);
      const normalizedIndex =
        ((itemIndex % popularMovies.length) + popularMovies.length) %
        popularMovies.length;

      if (normalizedIndex !== activeMovieIndexRef.current) {
        activeMovieIndexRef.current = normalizedIndex;
        const nextActiveMovie = popularMovies[normalizedIndex];

        setActiveMovie(nextActiveMovie);
        updateBackgroundForItem(nextActiveMovie);
      }

      return popularMovies[normalizedIndex];
    },
    [itemStride, popularMovies, updateBackgroundForItem],
  );

  const resetLoopPosition = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (popularMovies.length === 0) {
        return;
      }

      const itemIndex = Math.round(
        event.nativeEvent.contentOffset.x / itemStride,
      );
      const sourceLength = popularMovies.length;
      let targetIndex: number | null = null;

      if (hasLoop && itemIndex < sourceLength) {
        targetIndex = itemIndex + sourceLength;
      } else if (hasLoop && itemIndex >= sourceLength * 2) {
        targetIndex = itemIndex - sourceLength;
      }

      const normalizedIndex =
        ((targetIndex ?? itemIndex) % sourceLength) % sourceLength;
      const centeredItem = popularMovies[normalizedIndex];

      if (centeredItem) {
        activeMovieIndexRef.current = normalizedIndex;
        setActiveMovie(centeredItem);
        updateBackgroundForItem(centeredItem);
      }

      if (targetIndex !== null) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToOffset({
            offset: targetIndex * itemStride,
            animated: false,
          });
          scrollX.setValue(targetIndex * itemStride);
        });
      }
    },
    [hasLoop, itemStride, popularMovies, scrollX, updateBackgroundForItem],
  );

  const centerMovieCard = useCallback(
    (item: PopularCarouselItem, index: number) => {
      listRef.current?.scrollToOffset({
        offset: index * itemStride,
        animated: true,
      });
      activeMovieIndexRef.current =
        ((index % popularMovies.length) + popularMovies.length) %
        popularMovies.length;
      setActiveMovie(item);
      updateBackgroundForItem(item);
    },
    [itemStride, popularMovies.length, updateBackgroundForItem],
  );

  const openPopularMovieModal = useCallback(
    (item: PopularCarouselItem, index: number) => {
      const cardRef = cardRefs.get(item.carouselKey);

      if (!cardRef || !onOpenMovie) {
        centerMovieCard(item, index);
        return;
      }

      cardRef.measureInWindow((x, y, width, height) => {
        onOpenMovie(getMovieFromPopularMovie(item), { x, y, width, height });
        requestAnimationFrame(() => {
          centerMovieCard(item, index);
        });
      });
    },
    [cardRefs, centerMovieCard, onOpenMovie],
  );

  const handleCarouselScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateActiveMovieForOffset(event.nativeEvent.contentOffset.x);
    },
    [updateActiveMovieForOffset],
  );

  const renderPopularMovie = useCallback(
    ({ item, index }: { item: PopularCarouselItem; index: number }) => {
      const posterUrl = getPosterUrl(item);
      const rotate = scrollX.interpolate({
        inputRange: [
          (index - 1) * itemStride,
          index * itemStride,
          (index + 1) * itemStride,
        ],
        outputRange: [
          `${SIDE_CARD_ROTATION}deg`,
          '0deg',
          `${-SIDE_CARD_ROTATION}deg`,
        ],
        extrapolate: 'clamp',
      });
      const translateY = scrollX.interpolate({
        inputRange: [
          (index - 1) * itemStride,
          index * itemStride,
          (index + 1) * itemStride,
        ],
        outputRange: [SIDE_CARD_TRANSLATE_Y, 0, SIDE_CARD_TRANSLATE_Y],
        extrapolate: 'clamp',
      });
      const cardOpacity = scrollX.interpolate({
        inputRange: [
          (index - 1) * itemStride,
          index * itemStride,
          (index + 1) * itemStride,
        ],
        outputRange: [SIDE_CARD_OPACITY, 1, SIDE_CARD_OPACITY],
        extrapolate: 'clamp',
      });
      const introTranslateY = introProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [introStartTranslateY, 0],
      });
      const introTranslateX = introProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [(initialScrollIndex - index) * itemStride, 0],
      });
      const introScale = introProgress.interpolate({
        inputRange: [0, 0.72, 1],
        outputRange: [0.9, 1.006, 1],
      });
      const introOpacity = introProgress.interpolate({
        inputRange: [0, 0.18, 0.72, 1],
        outputRange: [0, 0.18, 0.86, 1],
      });
      const opacity = Animated.multiply(cardOpacity, introOpacity);

      return (
        <AnimatedPressable
          accessibilityRole="button"
          onPress={() => openPopularMovieModal(item, index)}
          style={[
            styles.card,
            {
              width: itemWidth,
              marginRight: CAROUSEL_ITEM_GAP,
              opacity,
              transform: [
                { translateX: introTranslateX },
                { translateY: introTranslateY },
                { translateY },
                { scale: introScale },
                { rotate },
              ],
            },
          ]}
        >
          <View
            ref={ref => {
              cardRefs.set(item.carouselKey, ref);
            }}
            collapsable={false}
            style={styles.posterMeasureWrap}
          >
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                resizeMode="cover"
                style={styles.poster}
              />
            ) : (
              <View style={[styles.poster, styles.posterFallback]} />
            )}
          </View>
        </AnimatedPressable>
      );
    },
    [
      cardRefs,
      initialScrollIndex,
      introProgress,
      introStartTranslateY,
      itemStride,
      itemWidth,
      openPopularMovieModal,
      scrollX,
    ],
  );

  const animatedBackgroundStyle = {
    backgroundColor: backgroundProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [backgroundColors.from, backgroundColors.to],
    }),
  };
  const movieInfoAnimatedStyle = {
    opacity: Animated.modulo(scrollX, itemStride).interpolate({
      inputRange: [
        0,
        itemStride * 0.18,
        itemStride * 0.5,
        itemStride * 0.82,
        itemStride,
      ],
      outputRange: [1, 0.18, 0, 0.18, 1],
      extrapolate: 'clamp',
    }),
  };

  if (popularMovies.length === 0) {
    return (
      <Animated.View style={[styles.stateWrap, animatedBackgroundStyle]}>
        <Text style={styles.stateText}>目前沒有熱門電影</Text>
      </Animated.View>
    );
  }

  const activeMovieTitleEn =
    activeMovie?.title_en ?? activeMovie?.movie?.title_en;

  return (
    <Animated.View style={[styles.container, animatedBackgroundStyle]}>
      <View pointerEvents="none" style={styles.backgroundGlassLayer}>
        <Svg
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <RadialGradient id="popularCenterGlow" cx="50%" cy="45%" r="58%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
              <Stop offset="32%" stopColor="rgba(255,255,255,0.09)" />
              <Stop offset="66%" stopColor="rgba(255,255,255,0.03)" />
              <Stop offset="100%" stopColor="rgba(5,6,8,0)" />
            </RadialGradient>
            <RadialGradient id="popularBottomGlow" cx="50%" cy="78%" r="48%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
              <Stop offset="45%" stopColor="rgba(255,255,255,0.04)" />
              <Stop offset="100%" stopColor="rgba(5,6,8,0)" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#popularCenterGlow)" />
          <Rect width="100%" height="100%" fill="url(#popularBottomGlow)" />
        </Svg>
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0.02)',
            'rgba(255,255,255,0.06)',
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(5,6,8,0.08)', 'rgba(5,6,8,0)', 'rgba(5,6,8,0.58)']}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={['#0B0B0F', 'rgba(11,11,15,0.78)', 'rgba(11,11,15,0)']}
        locations={[0, 0.42, 1]}
        style={styles.headerBlend}
      />
      <AnimatedFlatList
        ref={listRef}
        horizontal
        style={[styles.carouselList, { height: carouselHeight }]}
        data={carouselData}
        keyExtractor={item => item.carouselKey}
        renderItem={renderPopularMovie}
        initialScrollIndex={initialScrollIndex}
        getItemLayout={(_, index) => ({
          length: itemStride,
          offset: itemStride * index,
          index,
        })}
        contentContainerStyle={{ paddingHorizontal: centeredSideInset }}
        decelerationRate="fast"
        snapToInterval={itemStride}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { listener: handleCarouselScroll, useNativeDriver: true },
        )}
        onMomentumScrollEnd={resetLoopPosition}
      />
      {activeMovie ? (
        <Animated.View style={[styles.movieInfo, movieInfoAnimatedStyle]}>
          {activeMovie.title ? (
            <Text numberOfLines={1} style={styles.movieTitle}>
              {activeMovie.title}
            </Text>
          ) : null}
          {activeMovieTitleEn ? (
            <Text numberOfLines={1} style={styles.movieTitleEn}>
              {activeMovieTitleEn}
            </Text>
          ) : null}
          {activeMovie.description ? (
            <Text numberOfLines={3} style={styles.movieDescription}>
              {activeMovie.description}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 52,
  },
  backgroundGlassLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
    opacity: 0.18,
  },
  carouselList: {
    flexGrow: 0,
    zIndex: 3,
  },
  headerBlend: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 86,
    zIndex: 1,
  },
  card: {
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterMeasureWrap: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  movieInfo: {
    alignItems: 'center',
    paddingHorizontal: 34,
    marginTop: MOVIE_INFO_MARGIN_TOP,
    zIndex: 1,
  },
  movieTitle: {
    color: '#F9FAFB',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  movieTitleEn: {
    marginTop: 2,
    color: 'rgba(249,250,251,0.76)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
    textTransform: 'uppercase',
  },
  movieDescription: {
    marginTop: 16,
    color: 'rgba(249,250,251,0.68)',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    color: '#F3F4F6',
    fontSize: 18,
    fontFamily: FONT_FAMILY.inter28Regular,
  },
});

export default PopularMoviesCarousel;
