import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import ImageColors from 'react-native-image-colors';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Search,
  Home,
  ShoppingBag,
  X,
  Trophy,
  CalendarDays,
  Clock3,
} from 'lucide-react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { HomeHeader } from '@/components/CustomHeader';
import { MovieModal } from '@/components/CustomModal';
import type { PosterLayout } from '@/components/CustomModal';
import { GradientView } from '@/components/CustomView';
import { Text } from '@/components/ui/text';
import {
  MovieSkeleton,
  PopularMoviesCarousel,
  PopularMoviesCarouselSkeleton,
  UpcomingMovieSkeleton,
} from './components';
import { TheaterScreen } from '@/screen/Theater';
import { useMoviesBootstrap, useCityAndCinemasBootstrap } from '@/hooks';
import { useGetMovieCinemasMutation } from '@/api/moviesApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { setTheaterTimeNoticeVisible } from '@/store';
import type { Movie, MovieCinemasResponse } from '@/api/types/movies';
import { FONT_FAMILY } from '@/utility/fonts';
import {
  blendHexColor,
  DEFAULT_MOVIE_BACKGROUND_COLOR,
  getMovieFallbackColor,
  normalizeHexColor,
  pickImageColor,
} from './utils/moviePalette';

type HomePage = 'home' | 'theater';
type HomeTab = HomePage | 'search';
type MovieListItem = Movie | string | undefined;

const MOVIE_SKELETON_COUNT = 10;
const SEARCH_FOCUS_DELAY_MS = 240;
const MOVIE_CINEMAS_NAVIGATION_DELAY_MS = 800;
const KEYBOARD_TAB_BOTTOM_OFFSET = Platform.OS === 'android' ? 32 : 16;
const THEATER_TIME_NOTICE_TEXT = '時刻僅供參考，最終仍依各戲院當日公佈為準';
const FLOATING_ACTION_ITEMS = [
  {
    key: 'zero',
    label: '熱門',
    Icon: Trophy,
    style: 'floatingActionItemZero',
  },
  {
    key: 'fortyFive',
    label: '今日',
    Icon: CalendarDays,
    style: 'floatingActionItemFortyFive',
  },
  {
    key: 'ninety',
    label: '即將',
    Icon: Clock3,
    style: 'floatingActionItemNinety',
  },
] as const;
type FloatingActionKey = (typeof FLOATING_ACTION_ITEMS)[number]['key'];

const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);

const normalizeSearchText = (value?: string) =>
  value?.toLowerCase().replace(/\s+/g, '') ?? '';

const formatReleaseMonthDay = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return value;
  }

  return `${match[2]}/${match[3]}`;
};

const EmptyStateBrandIcon = () => {
  const iconFlipAnimation = useRef(new RNAnimated.Value(0)).current;
  const iconFlipRotateY = iconFlipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    iconFlipAnimation.setValue(0);
    RNAnimated.timing(iconFlipAnimation, {
      toValue: 1,
      duration: 680,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: true,
    }).start();
  }, [iconFlipAnimation]);

  return (
    <View style={styles.emptyStateIconWrap}>
      <RNAnimated.Image
        source={require('@/assets/image/headerIcon.png')}
        resizeMode="contain"
        style={[
          styles.emptyStateIcon,
          {
            transform: [
              { translateX: 3 },
              { translateY: 8 },
              { perspective: 900 },
              { rotateY: iconFlipRotateY },
            ],
          },
        ]}
      />
    </View>
  );
};

type MovieGridItemProps = {
  item?: Movie;
  index: number;
  isSelectedMovie: boolean;
  movieKey: string;
  onOpenMovie: (item: Movie, movieKey: string) => void;
  posterRefs: Map<string, View | null>;
  searchResultAnimationKey?: string;
  showReleaseDate?: boolean;
};

const MovieGridItem = React.memo(
  ({
    item,
    isSelectedMovie,
    movieKey,
    onOpenMovie,
    posterRefs,
    searchResultAnimationKey,
    showReleaseDate = false,
  }: MovieGridItemProps) => {
    const posterFlipAnimation = useRef(new RNAnimated.Value(1)).current;
    const posterFlipRotateY = posterFlipAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    useEffect(() => {
      if (!item || !searchResultAnimationKey) {
        posterFlipAnimation.setValue(1);
        return;
      }

      posterFlipAnimation.setValue(0);
      RNAnimated.timing(posterFlipAnimation, {
        toValue: 1,
        duration: 680,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }).start();
    }, [item, posterFlipAnimation, searchResultAnimationKey]);

    if (!item) {
      return <View style={[styles.movieItem]} />;
    }

    return (
      <View style={styles.movieItem}>
        <View
          ref={ref => {
            posterRefs.set(movieKey, ref);
          }}
          collapsable={false}
          style={styles.posterMeasureWrap}
        >
          <RNAnimated.View
            style={[
              styles.posterFlipWrap,
              {
                transform: [
                  { perspective: 900 },
                  { rotateY: posterFlipRotateY },
                ],
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenMovie(item, movieKey)}
              style={({ pressed }) => [
                styles.posterButton,
                pressed && styles.posterPressed,
                isSelectedMovie && styles.posterHidden,
              ]}
            >
              {item.poster_url ? (
                <Image
                  source={{ uri: item.poster_url }}
                  resizeMode="cover"
                  style={styles.poster}
                />
              ) : (
                <View style={[styles.poster, styles.posterFallback]} />
              )}
              {showReleaseDate && item.release_date ? (
                <View style={styles.releaseDateBadge}>
                  <Text numberOfLines={1} style={styles.releaseDateBadgeText}>
                    {formatReleaseMonthDay(item.release_date)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </RNAnimated.View>
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        <Text numberOfLines={2} style={styles.titleEn}>
          {item.title_en}
        </Text>
      </View>
    );
  },
);

const MovieListBackgroundLayer = () => (
  <View pointerEvents="none" style={styles.movieListBackgroundGlassLayer}>
    <Svg
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <RadialGradient id="movieListCenterGlow" cx="50%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <Stop offset="34%" stopColor="rgba(255,255,255,0.08)" />
          <Stop offset="68%" stopColor="rgba(255,255,255,0.03)" />
          <Stop offset="100%" stopColor="rgba(5,6,8,0)" />
        </RadialGradient>
        <RadialGradient id="movieListBottomGlow" cx="50%" cy="82%" r="52%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.09)" />
          <Stop offset="48%" stopColor="rgba(255,255,255,0.035)" />
          <Stop offset="100%" stopColor="rgba(5,6,8,0)" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#movieListCenterGlow)" />
      <Rect width="100%" height="100%" fill="url(#movieListBottomGlow)" />
    </Svg>
    <LinearGradient
      pointerEvents="none"
      colors={[
        'rgba(255,255,255,0.08)',
        'rgba(255,255,255,0.02)',
        'rgba(255,255,255,0.05)',
      ]}
      locations={[0, 0.5, 1]}
      style={StyleSheet.absoluteFill}
    />
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(5,6,8,0.12)', 'rgba(5,6,8,0)', 'rgba(5,6,8,0.62)']}
      locations={[0, 0.44, 1]}
      style={StyleSheet.absoluteFill}
    />
  </View>
);

// reactnativereusables
const HomeScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isInitialLoading, isPopularMoviesLoading, isUpcomingMoviesLoading } =
    useMoviesBootstrap();
  const { isInitialLoading: isTheaterInitialLoading } =
    useCityAndCinemasBootstrap();
  const { width: screenWidth } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<HomeTab>('home');
  const [activePage, setActivePage] = useState<HomePage>('home');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedMovieKey, setSelectedMovieKey] = useState<string | null>(null);
  const [selectedPosterLayout, setSelectedPosterLayout] =
    useState<PosterLayout | null>(null);
  const [isMovieModalVisible, setIsMovieModalVisible] = useState(false);
  const [shouldShowMovieCinemaButton, setShouldShowMovieCinemaButton] =
    useState(true);
  const [movieModalDetailSource, setMovieModalDetailSource] = useState<
    'movies' | 'upcoming'
  >('movies');
  const [movieCinemaSections, setMovieCinemaSections] =
    useState<MovieCinemasResponse | null>(null);
  const [movieCinemaHeaderTitle, setMovieCinemaHeaderTitle] = useState<
    string | null
  >(null);
  const [movieCinemaMovieId, setMovieCinemaMovieId] = useState<
    string | number | null
  >(null);
  const [movieCinemaMovieTitle, setMovieCinemaMovieTitle] = useState<
    string | null
  >(null);
  const [movieCinemaMovieTitleEn, setMovieCinemaMovieTitleEn] = useState<
    string | null
  >(null);
  const [tabLayouts, setTabLayouts] = useState<
    Partial<Record<HomeTab, { width: number; x: number }>>
  >({});
  const [hasActiveHighlightLayout, setHasActiveHighlightLayout] =
    useState(false);
  const [isFloatingActionExpanded, setIsFloatingActionExpanded] =
    useState(false);
  const [selectedFloatingActionKey, setSelectedFloatingActionKey] =
    useState<FloatingActionKey>('zero');
  const searchInputRef = useRef<TextInput>(null);
  const shouldDelaySearchFocusRef = useRef(false);
  const movieCinemasNavigationTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const isMovieCinemasRequestingRef = useRef(false);
  const movieCinemasRequestIdRef = useRef(0);
  const theaterPageActiveRef = useRef(false);
  const posterRefs = useRef(new Map<string, View | null>()).current;
  const pageSliderAnimation = useRef(new RNAnimated.Value(0)).current;
  const movieListBackgroundProgress = useRef(new RNAnimated.Value(1)).current;
  const movieListActiveBackgroundColorRef = useRef(
    DEFAULT_MOVIE_BACKGROUND_COLOR,
  );
  const movieListColorCacheRef = useRef(new Map<string, string>());
  const movieListColorRequestIdRef = useRef(0);
  const searchFocusProgress = useSharedValue(0);
  const activeHighlightX = useSharedValue(0);
  const activeHighlightWidth = useSharedValue(0);
  const floatingActionProgress = useSharedValue(0);
  const floatingActionIconFlipProgress = useSharedValue(0);
  const floatingActionVisibilityProgress = useSharedValue(1);
  const insets = useSafeAreaInsets();
  const [getMovieCinemas, { isLoading: isMovieCinemasLoading }] =
    useGetMovieCinemasMutation();
  const moviesList = useSelector((state: RootState) => state.movies.moviesList);
  const popularMoviesList = useSelector(
    (state: RootState) => state.movies.popularMoviesList,
  );
  const upcomingMoviesList = useSelector(
    (state: RootState) => state.movies.upcomingMoviesList,
  );
  const isTheaterTimeNoticeVisible = useSelector(
    (state: RootState) => state.movies.isTheaterTimeNoticeVisible,
  );
  const theaterPageActive = activePage === 'theater';
  const homeTabActive = activeTab === 'home';
  const searchTabActive = activeTab === 'search';
  const theaterTabActive = activeTab === 'theater';
  const shouldShowFloatingAction = !theaterPageActive && !isSearchFocused;
  const shouldShowTheaterTimeNotice =
    theaterPageActive && !isSearchFocused && isTheaterTimeNoticeVisible;
  const searchPlaceholder = theaterPageActive
    ? '搜尋戲院'
    : selectedFloatingActionKey === 'ninety'
    ? '搜尋即將上映的電影'
    : '搜尋今日上映的電影';
  const keyboardTabBottom =
    keyboardHeight > 0
      ? keyboardHeight + KEYBOARD_TAB_BOTTOM_OFFSET
      : insets.bottom;
  const pageSliderTranslateX = pageSliderAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -screenWidth],
  });
  const screenDimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchFocusProgress.value, [0, 1], [0, 0.45]),
  }));
  const activeHighlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeHighlightX.value }],
    width: activeHighlightWidth.value,
  }));
  const homeTabSlotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchFocusProgress.value, [0, 0.35, 1], [1, 1, 0]),
    transform: [
      {
        scale: interpolate(searchFocusProgress.value, [0, 1], [1, 0.84]),
      },
    ],
    width: interpolate(
      searchFocusProgress.value,
      [0, 1],
      [homeTabActive ? 94 : 50, 0],
    ),
  }));
  const theaterTabSlotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchFocusProgress.value, [0, 0.35, 1], [1, 1, 0]),
    transform: [
      {
        scale: interpolate(searchFocusProgress.value, [0, 1], [1, 0.84]),
      },
    ],
    width: interpolate(
      searchFocusProgress.value,
      [0, 1],
      [theaterTabActive ? 94 : 50, 0],
    ),
  }));
  const floatingActionButtonStyle = useAnimatedStyle(() => ({
    backgroundColor:
      floatingActionProgress.value > 0.02
        ? 'rgba(17,17,20,0.96)'
        : 'rgba(255,255,255,0.10)',
    borderColor:
      floatingActionProgress.value > 0.02
        ? 'rgba(249,250,251,0.24)'
        : 'rgba(255,255,255,0.22)',
    shadowColor: floatingActionProgress.value > 0.02 ? '#111114' : '#000000',
    transform: [
      {
        scale: interpolate(floatingActionProgress.value, [0, 1], [1, 1.06]),
      },
    ],
  }));
  const floatingActionIconStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      {
        rotateY: `${interpolate(
          floatingActionIconFlipProgress.value,
          [0, 1],
          [0, 360],
        )}deg`,
      },
    ],
  }));
  const floatingActionSlotStyle = useAnimatedStyle(() => ({
    width: interpolate(floatingActionVisibilityProgress.value, [0, 1], [0, 38]),
    marginLeft: interpolate(
      floatingActionVisibilityProgress.value,
      [0, 1],
      [0, 12],
    ),
    opacity: floatingActionVisibilityProgress.value,
    transform: [
      {
        scale: interpolate(
          floatingActionVisibilityProgress.value,
          [0, 1],
          [0.82, 1],
        ),
      },
    ],
  }));
  const floatingActionExpansionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(floatingActionProgress.value, [0, 0.08, 1], [0, 1, 1]),
    transform: [
      {
        scale: interpolate(floatingActionProgress.value, [0, 1], [1, 7.85]),
      },
    ],
  }));
  const floatingActionDimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(floatingActionProgress.value, [0, 1], [0, 0.58]),
  }));
  const floatingActionMenuStyle = useAnimatedStyle(() => ({
    opacity: interpolate(floatingActionProgress.value, [0, 0.05, 1], [0, 1, 1]),
  }));
  const floatingActionItemZeroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(floatingActionProgress.value, [0, 0.1, 1], [0, 1, 1]),
    transform: [
      {
        translateX: interpolate(floatingActionProgress.value, [0, 1], [90, 0]),
      },
      {
        translateY: interpolate(floatingActionProgress.value, [0, 1], [0, 0]),
      },
    ],
  }));
  const floatingActionItemFortyFiveStyle = useAnimatedStyle(() => ({
    opacity: interpolate(floatingActionProgress.value, [0, 0.1, 1], [0, 1, 1]),
    transform: [
      {
        translateX: interpolate(floatingActionProgress.value, [0, 1], [65, 0]),
      },
      {
        translateY: interpolate(floatingActionProgress.value, [0, 1], [65, 0]),
      },
    ],
  }));
  const floatingActionItemNinetyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(floatingActionProgress.value, [0, 0.1, 1], [0, 1, 1]),
    transform: [
      {
        translateX: interpolate(floatingActionProgress.value, [0, 1], [12, 0]),
      },
      {
        translateY: interpolate(floatingActionProgress.value, [0, 1], [107, 0]),
      },
    ],
  }));
  const floatingActionLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(floatingActionProgress.value, [0, 0.7, 1], [0, 0, 1]),
    transform: [
      {
        translateX: interpolate(
          floatingActionProgress.value,
          [0.7, 1],
          [-4, 0],
        ),
      },
    ],
  }));
  const selectedFloatingActionItem =
    FLOATING_ACTION_ITEMS.find(
      item => item.key === selectedFloatingActionKey,
    ) ?? FLOATING_ACTION_ITEMS[0];
  const SelectedFloatingActionIcon = selectedFloatingActionItem.Icon;
  const shouldShowPopularMovies = selectedFloatingActionKey === 'zero';
  const shouldShowTodayMovies = selectedFloatingActionKey === 'fortyFive';
  const shouldShowUpcomingMovies = selectedFloatingActionKey === 'ninety';
  const normalizedMovieSearchKeyword = useMemo(
    () => normalizeSearchText(theaterPageActive ? '' : searchKeyword),
    [searchKeyword, theaterPageActive],
  );
  const filteredMovies = useMemo(() => {
    const sourceMovies = shouldShowUpcomingMovies
      ? upcomingMoviesList
      : moviesList;

    if (!normalizedMovieSearchKeyword) {
      return sourceMovies;
    }

    return sourceMovies.filter(movie => {
      const normalizedTitle = normalizeSearchText(movie.title);
      const normalizedTitleEn = normalizeSearchText(movie.title_en);

      return (
        normalizedTitle.includes(normalizedMovieSearchKeyword) ||
        normalizedTitleEn.includes(normalizedMovieSearchKeyword)
      );
    });
  }, [
    moviesList,
    normalizedMovieSearchKeyword,
    shouldShowUpcomingMovies,
    upcomingMoviesList,
  ]);
  const displayMovies = useMemo(
    () =>
      filteredMovies.length % 2 === 0
        ? filteredMovies
        : [...filteredMovies, undefined],
    [filteredMovies],
  );
  const shouldShowMovieSearchSkeleton =
    !isInitialLoading &&
    isSearchFocused &&
    normalizedMovieSearchKeyword.length > 0 &&
    filteredMovies.length === 0;
  const movieSearchResultAnimationKey =
    normalizedMovieSearchKeyword || undefined;
  const movieListEmptyComponent = useMemo(() => {
    if (isInitialLoading || isSearchFocused || !normalizedMovieSearchKeyword) {
      return null;
    }

    return (
      <View style={styles.emptyState}>
        <EmptyStateBrandIcon />
        <Text style={styles.emptyStateTitle}>找不到電影</Text>
        <Text style={styles.emptyStateDescription}>
          沒有符合「{searchKeyword}」的電影
        </Text>
      </View>
    );
  }, [
    isInitialLoading,
    isSearchFocused,
    normalizedMovieSearchKeyword,
    searchKeyword,
  ]);
  const movieSkeletonItems = useMemo(
    () =>
      Array.from(
        { length: MOVIE_SKELETON_COUNT },
        (_, index) => `movie-skeleton-${index}`,
      ),
    [],
  );
  const movieListData =
    isInitialLoading || shouldShowMovieSearchSkeleton
      ? movieSkeletonItems
      : displayMovies;
  const upcomingMovieListData =
    isUpcomingMoviesLoading || shouldShowMovieSearchSkeleton
      ? movieSkeletonItems
      : displayMovies;
  const firstMovieForActiveList = shouldShowUpcomingMovies
    ? upcomingMoviesList[0]
    : shouldShowTodayMovies
    ? moviesList[0]
    : undefined;
  const [movieListBackgroundColors, setMovieListBackgroundColors] = useState({
    from: DEFAULT_MOVIE_BACKGROUND_COLOR,
    to: DEFAULT_MOVIE_BACKGROUND_COLOR,
  });
  const movieListBackgroundStyle = {
    backgroundColor: movieListBackgroundProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [
        movieListBackgroundColors.from,
        movieListBackgroundColors.to,
      ],
    }),
  };

  const animateMovieListBackgroundColor = useCallback(
    (nextColor: string) => {
      const nextBackgroundColor = blendHexColor(
        nextColor,
        DEFAULT_MOVIE_BACKGROUND_COLOR,
      );

      if (nextBackgroundColor === movieListActiveBackgroundColorRef.current) {
        return;
      }

      movieListBackgroundProgress.stopAnimation();
      movieListBackgroundProgress.setValue(0);
      setMovieListBackgroundColors({
        from: movieListActiveBackgroundColorRef.current,
        to: nextBackgroundColor,
      });
      movieListActiveBackgroundColorRef.current = nextBackgroundColor;

      RNAnimated.timing(movieListBackgroundProgress, {
        toValue: 1,
        duration: 420,
        useNativeDriver: false,
      }).start();
    },
    [movieListBackgroundProgress],
  );

  const updateMovieListBackgroundForMovie = useCallback(
    async (movie?: Movie) => {
      const requestId = movieListColorRequestIdRef.current + 1;
      movieListColorRequestIdRef.current = requestId;

      if (!movie) {
        animateMovieListBackgroundColor(DEFAULT_MOVIE_BACKGROUND_COLOR);
        return;
      }

      const posterUrl = movie.poster_url;

      if (!posterUrl) {
        animateMovieListBackgroundColor(
          getMovieFallbackColor(movie.movie_id ?? movie.id ?? movie.title),
        );
        return;
      }

      const cachedColor = movieListColorCacheRef.current.get(posterUrl);

      if (cachedColor) {
        animateMovieListBackgroundColor(cachedColor);
        return;
      }

      try {
        const colors = await ImageColors.getColors(posterUrl, {
          fallback: DEFAULT_MOVIE_BACKGROUND_COLOR,
          cache: true,
          key: `${movie.movie_id ?? movie.id ?? posterUrl}`,
          quality: 'low',
        });
        const pickedColor = normalizeHexColor(pickImageColor(colors));
        const nextColor = pickedColor ?? DEFAULT_MOVIE_BACKGROUND_COLOR;

        movieListColorCacheRef.current.set(posterUrl, nextColor);

        if (requestId === movieListColorRequestIdRef.current) {
          animateMovieListBackgroundColor(nextColor);
        }
      } catch {
        const fallbackColor = getMovieFallbackColor(
          movie.movie_id ?? movie.id ?? movie.title,
        );

        movieListColorCacheRef.current.set(posterUrl, fallbackColor);

        if (requestId === movieListColorRequestIdRef.current) {
          animateMovieListBackgroundColor(fallbackColor);
        }
      }
    },
    [animateMovieListBackgroundColor],
  );

  useEffect(() => {
    theaterPageActiveRef.current = theaterPageActive;
  }, [theaterPageActive]);

  useEffect(() => {
    if (!shouldShowTodayMovies && !shouldShowUpcomingMovies) {
      return;
    }

    updateMovieListBackgroundForMovie(firstMovieForActiveList);
  }, [
    firstMovieForActiveList,
    shouldShowTodayMovies,
    shouldShowUpcomingMovies,
    updateMovieListBackgroundForMovie,
  ]);

  useEffect(() => {
    if (!shouldShowFloatingAction) {
      setIsFloatingActionExpanded(false);
    }
  }, [shouldShowFloatingAction]);

  useEffect(() => {
    const keyboardShow = Keyboard.addListener('keyboardWillShow', event => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardHeight(event.endCoordinates.height);

      if (theaterPageActiveRef.current) {
        dispatch(setTheaterTimeNoticeVisible(false));
      }
    });
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates.height);

      if (theaterPageActiveRef.current) {
        dispatch(setTheaterTimeNoticeVisible(false));
      }
    });
    const keyboardHide = Keyboard.addListener('keyboardWillHide', event => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardHeight(0);
    });
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardShow.remove();
      keyboardDidShow.remove();
      keyboardHide.remove();
      keyboardDidHide.remove();
    };
  }, [dispatch]);

  useEffect(
    () => () => {
      if (movieCinemasNavigationTimerRef.current) {
        clearTimeout(movieCinemasNavigationTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!searchTabActive || !isSearchFocused) {
      return;
    }

    const focusSearchInput = () => {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    };

    if (shouldDelaySearchFocusRef.current) {
      shouldDelaySearchFocusRef.current = false;

      const focusTimer = setTimeout(focusSearchInput, SEARCH_FOCUS_DELAY_MS);

      return () => clearTimeout(focusTimer);
    }

    focusSearchInput();
  }, [isSearchFocused, searchTabActive]);

  useEffect(() => {
    searchFocusProgress.value = withTiming(isSearchFocused ? 1 : 0, {
      duration: isSearchFocused ? 360 : 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [isSearchFocused, searchFocusProgress]);

  useEffect(() => {
    floatingActionProgress.value = withTiming(
      isFloatingActionExpanded ? 1 : 0,
      {
        duration: isFloatingActionExpanded ? 420 : 280,
        easing: Easing.out(Easing.cubic),
      },
    );
  }, [floatingActionProgress, isFloatingActionExpanded]);

  useEffect(() => {
    floatingActionIconFlipProgress.value = 0;
    floatingActionIconFlipProgress.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [floatingActionIconFlipProgress, isFloatingActionExpanded]);

  useEffect(() => {
    floatingActionVisibilityProgress.value = withTiming(
      shouldShowFloatingAction ? 1 : 0,
      {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      },
    );
  }, [floatingActionVisibilityProgress, shouldShowFloatingAction]);

  useEffect(() => {
    const activeLayout = tabLayouts[activeTab];

    if (!activeLayout) {
      return;
    }

    if (!hasActiveHighlightLayout) {
      activeHighlightX.value = activeLayout.x;
      activeHighlightWidth.value = activeLayout.width;
      setHasActiveHighlightLayout(true);
      return;
    }

    if (activeTab === 'search') {
      activeHighlightX.value = activeLayout.x;
      activeHighlightWidth.value = activeLayout.width;
      return;
    }

    activeHighlightX.value = withTiming(activeLayout.x, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
    activeHighlightWidth.value = withTiming(activeLayout.width, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [
    activeHighlightWidth,
    activeHighlightX,
    activeTab,
    hasActiveHighlightLayout,
    tabLayouts,
  ]);

  const handleTabLayout = useCallback(
    (tab: HomeTab) => (event: LayoutChangeEvent) => {
      const { width, x } = event.nativeEvent.layout;

      setTabLayouts(currentLayouts => {
        const currentLayout = currentLayouts[tab];

        if (
          currentLayout &&
          Math.abs(currentLayout.width - width) < 0.5 &&
          Math.abs(currentLayout.x - x) < 0.5
        ) {
          return currentLayouts;
        }

        return {
          ...currentLayouts,
          [tab]: { width, x },
        };
      });
    },
    [],
  );

  const navigatePage = useCallback(
    (page: HomePage) => {
      if (page === activePage) {
        return;
      }

      setActivePage(page);
      RNAnimated.timing(pageSliderAnimation, {
        toValue: page === 'theater' ? 1 : 0,
        duration: 360,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [activePage, pageSliderAnimation],
  );

  const selectTab = useCallback(
    (tab: HomeTab) => {
      const shouldDelaySearchFocus = tab === 'search' && !searchTabActive;

      setActiveTab(tab);

      if (tab === 'search') {
        if (!theaterPageActive && selectedFloatingActionKey === 'zero') {
          setSelectedFloatingActionKey('fortyFive');
        }

        shouldDelaySearchFocusRef.current = shouldDelaySearchFocus;
        setIsSearchFocused(true);
        return;
      }

      shouldDelaySearchFocusRef.current = false;
      setMovieCinemaSections(null);
      setMovieCinemaHeaderTitle(null);
      setMovieCinemaMovieId(null);
      setMovieCinemaMovieTitle(null);
      setMovieCinemaMovieTitleEn(null);
      navigatePage(tab);
      setIsSearchFocused(false);
      searchInputRef.current?.blur();
      setSearchKeyword('');
    },
    [
      navigatePage,
      searchTabActive,
      selectedFloatingActionKey,
      theaterPageActive,
    ],
  );

  const toggleFloatingAction = useCallback(() => {
    setIsFloatingActionExpanded(isExpanded => !isExpanded);
  }, []);

  const handleFloatingActionItemPress = useCallback(
    (key: FloatingActionKey) => {
      setSelectedFloatingActionKey(key);
      setIsFloatingActionExpanded(false);
    },
    [],
  );

  const clearSearchKeyword = useCallback(() => {
    setSearchKeyword('');
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const submitSearchKeyword = useCallback(() => {
    if (theaterPageActive) {
      setIsSearchFocused(false);
      searchInputRef.current?.blur();
      return;
    }

    navigatePage('home');
    setIsSearchFocused(false);
    searchInputRef.current?.blur();
  }, [navigatePage, theaterPageActive]);

  const getMovieKey = useCallback(
    (item: Movie, index?: number) =>
      String(item.id ?? item.movie_id ?? `${item.title}-${index ?? 'movie'}`),
    [],
  );

  const openMovieModal = useCallback(
    (item: Movie, movieKey: string) => {
      const posterRef = posterRefs.get(movieKey);

      if (!posterRef) {
        return;
      }

      posterRef.measureInWindow((x, y, width, height) => {
        setSelectedMovie(item);
        setSelectedMovieKey(movieKey);
        setSelectedPosterLayout({ x, y, width, height });
        setShouldShowMovieCinemaButton(selectedFloatingActionKey !== 'ninety');
        setMovieModalDetailSource(
          selectedFloatingActionKey === 'ninety' ? 'upcoming' : 'movies',
        );
        setIsMovieModalVisible(true);
      });
    },
    [posterRefs, selectedFloatingActionKey],
  );

  const openMovieModalWithLayout = useCallback(
    (item: Movie, posterLayout: PosterLayout) => {
      const movieKey = getMovieKey(item);

      setSelectedMovie(item);
      setSelectedMovieKey(movieKey);
      setSelectedPosterLayout(posterLayout);
      setShouldShowMovieCinemaButton(true);
      setMovieModalDetailSource('movies');
      setIsMovieModalVisible(true);
    },
    [getMovieKey],
  );

  const closeMovieModal = useCallback(() => {
    setIsMovieModalVisible(false);
  }, []);

  const openMovieCinemas = useCallback(() => {
    const movieId = selectedMovie?.movie_id ?? selectedMovie?.id;

    if (!movieId || isMovieCinemasRequestingRef.current) {
      return;
    }

    const requestId = movieCinemasRequestIdRef.current + 1;

    isMovieCinemasRequestingRef.current = true;
    movieCinemasRequestIdRef.current = requestId;
    setMovieCinemaMovieId(movieId);
    setMovieCinemaMovieTitle(selectedMovie?.title?.trim() || null);
    setMovieCinemaMovieTitleEn(selectedMovie?.title_en?.trim() || null);
    setMovieCinemaHeaderTitle(
      selectedMovie?.title?.trim() || selectedMovie?.title_en?.trim() || null,
    );
    setMovieCinemaSections(null);
    setIsMovieModalVisible(false);
    setIsSearchFocused(false);
    searchInputRef.current?.blur();
    setSearchKeyword('');

    if (movieCinemasNavigationTimerRef.current) {
      clearTimeout(movieCinemasNavigationTimerRef.current);
    }

    movieCinemasNavigationTimerRef.current = setTimeout(() => {
      movieCinemasNavigationTimerRef.current = null;
      setActiveTab('theater');
      navigatePage('theater');
    }, MOVIE_CINEMAS_NAVIGATION_DELAY_MS);

    getMovieCinemas(movieId)
      .unwrap()
      .then(sections => {
        // 避免連點
        if (movieCinemasRequestIdRef.current !== requestId) {
          return;
        }

        setMovieCinemaSections(sections);
      })
      .catch(() => {
        if (movieCinemasRequestIdRef.current !== requestId) {
          return;
        }
      })
      .finally(() => {
        if (movieCinemasRequestIdRef.current !== requestId) {
          return;
        }

        isMovieCinemasRequestingRef.current = false;
      });
  }, [getMovieCinemas, navigatePage, selectedMovie]);

  const clearSelectedMovie = useCallback(() => {
    setSelectedMovie(null);
    setSelectedMovieKey(null);
    setSelectedPosterLayout(null);
    setShouldShowMovieCinemaButton(true);
    setMovieModalDetailSource('movies');
  }, []);

  const keyExtractor = useCallback(
    (item: MovieListItem, index: number) =>
      typeof item === 'string'
        ? item
        : item
        ? String(item.id ?? item.movie_id ?? `${item.title}-${index}`)
        : `placeholder-${index}`,
    [],
  );

  const renderMovie = useCallback(
    ({ item, index }: { item: MovieListItem; index: number }) => {
      if (typeof item === 'string') {
        return shouldShowUpcomingMovies ? (
          <UpcomingMovieSkeleton />
        ) : (
          <MovieSkeleton />
        );
      }

      const movieKey = item ? getMovieKey(item, index) : `placeholder-${index}`;

      return (
        <MovieGridItem
          item={item}
          index={index}
          isSelectedMovie={selectedMovieKey === movieKey}
          movieKey={movieKey}
          onOpenMovie={openMovieModal}
          posterRefs={posterRefs}
          searchResultAnimationKey={movieSearchResultAnimationKey}
          showReleaseDate={shouldShowUpcomingMovies}
        />
      );
    },
    [
      getMovieKey,
      movieSearchResultAnimationKey,
      openMovieModal,
      posterRefs,
      selectedMovieKey,
      shouldShowUpcomingMovies,
    ],
  );

  return (
    <GradientView style={styles.container}>
      <HomeHeader centerTitle={movieCinemaHeaderTitle ?? undefined} />
      <View style={styles.pageViewport}>
        <RNAnimated.View
          style={[
            styles.pageSlider,
            {
              width: screenWidth * 2,
              transform: [{ translateX: pageSliderTranslateX }],
            },
          ]}
        >
          <View
            pointerEvents={theaterPageActive ? 'none' : 'auto'}
            style={[styles.pagePane, { width: screenWidth }]}
          >
            {shouldShowPopularMovies ? (
              isPopularMoviesLoading ? (
                <PopularMoviesCarouselSkeleton />
              ) : (
                <PopularMoviesCarousel
                  popularMovies={popularMoviesList}
                  onOpenMovie={openMovieModalWithLayout}
                />
              )
            ) : shouldShowTodayMovies ? (
              <RNAnimated.View
                style={[styles.movieListBackground, movieListBackgroundStyle]}
              >
                <MovieListBackgroundLayer />
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    '#0B0B0F',
                    'rgba(11,11,15,0.78)',
                    'rgba(11,11,15,0)',
                  ]}
                  locations={[0, 0.42, 1]}
                  style={styles.movieListHeaderBlend}
                />
                <FlatList
                  style={styles.movieList}
                  data={movieListData}
                  keyExtractor={keyExtractor}
                  renderItem={renderMovie}
                  numColumns={2}
                  columnWrapperStyle={styles.row}
                  contentContainerStyle={[
                    styles.listContent,
                    movieListData.length === 0 && styles.emptyListContent,
                    { paddingBottom: insets.bottom + 132 },
                  ]}
                  ListEmptyComponent={movieListEmptyComponent}
                  initialNumToRender={8}
                  maxToRenderPerBatch={8}
                  updateCellsBatchingPeriod={50}
                  windowSize={7}
                  removeClippedSubviews
                  showsVerticalScrollIndicator={false}
                />
              </RNAnimated.View>
            ) : shouldShowUpcomingMovies ? (
              <RNAnimated.View
                style={[styles.movieListBackground, movieListBackgroundStyle]}
              >
                <MovieListBackgroundLayer />
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    '#0B0B0F',
                    'rgba(11,11,15,0.78)',
                    'rgba(11,11,15,0)',
                  ]}
                  locations={[0, 0.42, 1]}
                  style={styles.movieListHeaderBlend}
                />
                <FlatList
                  style={styles.movieList}
                  data={upcomingMovieListData}
                  keyExtractor={keyExtractor}
                  renderItem={renderMovie}
                  numColumns={2}
                  columnWrapperStyle={styles.row}
                  contentContainerStyle={[
                    styles.listContent,
                    upcomingMovieListData.length === 0 &&
                      styles.emptyListContent,
                    { paddingBottom: insets.bottom + 132 },
                  ]}
                  ListEmptyComponent={movieListEmptyComponent}
                  initialNumToRender={8}
                  maxToRenderPerBatch={8}
                  updateCellsBatchingPeriod={50}
                  windowSize={7}
                  removeClippedSubviews
                  showsVerticalScrollIndicator={false}
                />
              </RNAnimated.View>
            ) : (
              <View style={styles.homeActionPlaceholder}>
                <Text style={styles.homeActionPlaceholderText}>
                  {selectedFloatingActionItem.label}
                </Text>
              </View>
            )}
          </View>
          <View
            pointerEvents={theaterPageActive ? 'auto' : 'none'}
            style={[styles.pagePane, { width: screenWidth }]}
          >
            <TheaterScreen
              isLoading={isTheaterInitialLoading || isMovieCinemasLoading}
              movieId={movieCinemaMovieId ?? undefined}
              movieTitle={movieCinemaMovieTitle ?? undefined}
              movieTitleEn={movieCinemaMovieTitleEn ?? undefined}
              movieCinemaSections={movieCinemaSections}
              searchKeyword={theaterPageActive ? searchKeyword : ''}
              showSearchEmptyState={!isSearchFocused}
            />
          </View>
        </RNAnimated.View>
      </View>
      <ReanimatedPressable
        accessibilityRole="button"
        onPress={Keyboard.dismiss}
        pointerEvents={isSearchFocused ? 'auto' : 'none'}
        style={[styles.screenDimOverlay, screenDimStyle]}
      />
      <ReanimatedPressable
        accessibilityRole="button"
        onPress={() => setIsFloatingActionExpanded(false)}
        pointerEvents={
          shouldShowFloatingAction && isFloatingActionExpanded ? 'auto' : 'none'
        }
        style={[styles.floatingActionDimOverlay, floatingActionDimStyle]}
      />
      <View style={[styles.floatingTabsWrap, { bottom: keyboardTabBottom }]}>
        {shouldShowTheaterTimeNotice ? (
          <Text pointerEvents="none" style={styles.theaterTimeNoticeText}>
            {THEATER_TIME_NOTICE_TEXT}
          </Text>
        ) : null}
        <View style={styles.floatingControlsRow}>
          <Reanimated.View
            pointerEvents={isFloatingActionExpanded ? 'none' : 'auto'}
            style={[
              styles.floatingTabs,
              isSearchFocused && styles.floatingTabsSearchFocused,
            ]}
          >
            {hasActiveHighlightLayout && (
              <Reanimated.View
                pointerEvents="none"
                style={[styles.activeTabHighlight, activeHighlightStyle]}
              />
            )}
            <Reanimated.View
              pointerEvents={isSearchFocused ? 'none' : 'auto'}
              onLayout={handleTabLayout('home')}
              style={[styles.sideTabSlot, homeTabSlotStyle]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: homeTabActive }}
                onPress={() => selectTab('home')}
                style={[
                  styles.roundTab,
                  homeTabActive && styles.roundTabActive,
                ]}
              >
                <Home
                  size={22}
                  color={homeTabActive ? '#1F2937' : '#D1D5DB'}
                  strokeWidth={2.8}
                />
                {homeTabActive && (
                  <Text
                    numberOfLines={1}
                    style={[styles.roundTabText, styles.roundTabTextActive]}
                  >
                    首頁
                  </Text>
                )}
              </Pressable>
            </Reanimated.View>

            <Pressable
              accessibilityRole="search"
              accessibilityState={{ selected: searchTabActive }}
              onLayout={handleTabLayout('search')}
              onPress={() => selectTab('search')}
              style={[
                styles.searchTab,
                searchTabActive && styles.searchTabActive,
              ]}
            >
              <Search
                size={22}
                color={searchTabActive ? '#1F2937' : '#D1D5DB'}
                strokeWidth={2.8}
              />
              {searchTabActive && (
                <>
                  <TextInput
                    ref={searchInputRef}
                    value={searchKeyword}
                    onChangeText={setSearchKeyword}
                    onFocus={() => {
                      setActiveTab('search');
                      setIsSearchFocused(true);
                    }}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder={searchPlaceholder}
                    placeholderTextColor="#6B7280"
                    style={[styles.searchInput, styles.searchInputActive]}
                    selectionColor="#1F2937"
                    returnKeyType="search"
                    onSubmitEditing={submitSearchKeyword}
                  />
                  {isSearchFocused && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={clearSearchKeyword}
                      hitSlop={8}
                      style={styles.clearSearchButton}
                    >
                      <X size={18} color="#6b7280" strokeWidth={2.8} />
                    </Pressable>
                  )}
                </>
              )}
            </Pressable>

            <Reanimated.View
              pointerEvents={isSearchFocused ? 'none' : 'auto'}
              onLayout={handleTabLayout('theater')}
              style={[styles.sideTabSlot, theaterTabSlotStyle]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: theaterTabActive }}
                onPress={() => selectTab('theater')}
                style={[
                  styles.roundTab,
                  theaterTabActive && styles.roundTabActive,
                ]}
              >
                <ShoppingBag
                  size={22}
                  color={theaterTabActive ? '#1F2937' : '#D1D5DB'}
                  strokeWidth={2.8}
                />
                {theaterTabActive && (
                  <Text
                    numberOfLines={1}
                    style={[styles.roundTabText, styles.roundTabTextActive]}
                  >
                    戲院
                  </Text>
                )}
              </Pressable>
            </Reanimated.View>
          </Reanimated.View>
          <Reanimated.View
            pointerEvents={shouldShowFloatingAction ? 'auto' : 'none'}
            style={[styles.floatingActionSlot, floatingActionSlotStyle]}
          >
            <View style={styles.floatingActionWrap}>
              <Reanimated.View
                pointerEvents="none"
                style={[
                  styles.floatingActionExpansion,
                  floatingActionExpansionStyle,
                ]}
              >
                <Svg width="58" height="58" viewBox="0 0 58 58">
                  <Defs>
                    <RadialGradient id="floatingActionExpansionGradient">
                      <Stop
                        offset="0%"
                        stopColor="#111114"
                        stopOpacity="0.96"
                      />
                      <Stop
                        offset="62%"
                        stopColor="#111114"
                        stopOpacity="0.92"
                      />
                      <Stop offset="100%" stopColor="#111114" stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Circle
                    cx="29"
                    cy="29"
                    r="29"
                    fill="url(#floatingActionExpansionGradient)"
                  />
                </Svg>
              </Reanimated.View>
              <ReanimatedPressable
                accessibilityRole="button"
                onPress={() => setIsFloatingActionExpanded(false)}
                pointerEvents={isFloatingActionExpanded ? 'auto' : 'none'}
                style={styles.floatingActionCloseArea}
              />
              <Reanimated.View
                pointerEvents={isFloatingActionExpanded ? 'box-none' : 'none'}
                style={[styles.floatingActionMenu, floatingActionMenuStyle]}
              >
                {FLOATING_ACTION_ITEMS.map(item => {
                  const ItemIcon = item.Icon;
                  const itemMotionStyle =
                    item.key === 'zero'
                      ? floatingActionItemZeroStyle
                      : item.key === 'fortyFive'
                      ? floatingActionItemFortyFiveStyle
                      : floatingActionItemNinetyStyle;

                  return (
                    <ReanimatedPressable
                      key={item.key}
                      accessibilityRole="button"
                      onPress={() => handleFloatingActionItemPress(item.key)}
                      style={[
                        styles.floatingActionItem,
                        styles[item.style],
                        itemMotionStyle,
                      ]}
                    >
                      <ItemIcon size={20} color="#F9FAFB" strokeWidth={2.6} />
                      <Reanimated.View style={floatingActionLabelStyle}>
                        <Text style={styles.floatingActionItemText}>
                          {item.label}
                        </Text>
                      </Reanimated.View>
                    </ReanimatedPressable>
                  );
                })}
              </Reanimated.View>
              <ReanimatedPressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isFloatingActionExpanded }}
                onPress={toggleFloatingAction}
                hitSlop={{
                  top: 12,
                  bottom: 12,
                  left: 12,
                  right: 12,
                }}
                style={[styles.floatingActionButton, floatingActionButtonStyle]}
              >
                <Reanimated.View style={floatingActionIconStyle}>
                  {isFloatingActionExpanded ? (
                    <X size={14} color="#F9FAFB" strokeWidth={3} />
                  ) : (
                    <SelectedFloatingActionIcon
                      size={14}
                      color="#D1D5DB"
                      strokeWidth={3}
                    />
                  )}
                </Reanimated.View>
              </ReanimatedPressable>
            </View>
          </Reanimated.View>
        </View>
      </View>
      <MovieModal
        visible={isMovieModalVisible}
        movie={selectedMovie}
        posterLayout={selectedPosterLayout}
        onClose={closeMovieModal}
        onAfterClose={clearSelectedMovie}
        showCinemaButton={shouldShowMovieCinemaButton}
        onPressCinemaButton={openMovieCinemas}
        detailSource={movieModalDetailSource}
      />
    </GradientView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    // #0B0B0F
    // #1A1D24
    // #1B1F27
    // #161A20
    // #111114
    // #36B6D5
    // #4EC9E0
    // #F3F4F6 主文字
    // #9CA3AF 次文字
    // #FF4D4F
    // #F5EA00
    // #4EC9E0
    // #F3F4F6
    // #FF4D4F
  },
  pageViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  pageSlider: {
    flex: 1,
    flexDirection: 'row',
  },
  pagePane: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    rowGap: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 360,
    paddingHorizontal: 28,
  },
  emptyStateIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 14,
  },
  emptyStateIcon: {
    width: 112,
    height: 112,
    tintColor: '#FFFFFF',
  },
  emptyStateTitle: {
    color: '#F3F4F6',
    fontSize: 18,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  emptyStateDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.inter18Light,
  },
  movieListBackground: {
    flex: 1,
  },
  movieListBackgroundGlassLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
    opacity: 0.18,
  },
  movieListHeaderBlend: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 12,
    zIndex: 1,
  },
  movieList: {
    zIndex: 0,
    elevation: 0,
  },
  homeActionPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  homeActionPlaceholderText: {
    color: '#F3F4F6',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  contentDismissLayer: {
    flex: 1,
  },
  row: {
    columnGap: 16,
  },
  movieItem: {
    flex: 1,
  },
  posterMeasureWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  posterFlipWrap: {
    width: '100%',
    height: '100%',
  },
  posterButton: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  posterPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  posterHidden: {
    opacity: 0,
  },
  poster: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  posterFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
  },
  title: {
    marginTop: 8,
    color: '#F3F4F6',
    fontSize: 14,
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  titleEn: {
    marginTop: 2,
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: FONT_FAMILY.inter18Light,
  },
  releaseDateBadge: {
    position: 'absolute',
    left: 3,
    bottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(80,80,80,0.58)',
    borderWidth: 0,
  },
  releaseDateBadgeText: {
    color: '#fff',
    fontSize: 14,
    padding: 6,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.inter18Light,
  },
  floatingTabsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
    elevation: 30,
  },
  theaterTimeNoticeText: {
    color: '#F5EA00',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.inter18Light,
  },
  screenDimOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000',
    zIndex: 25,
    elevation: 25,
  },
  floatingActionDimOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000',
    zIndex: 28,
    elevation: 28,
  },
  floatingControlsRow: {
    width: '80%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTabs: {
    flex: 1,
    minWidth: 0,
    // height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 12,
  },
  floatingActionWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  floatingActionSlot: {
    width: 38,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  floatingActionExpansion: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    opacity: 0,
    zIndex: 0,
  },
  floatingActionMenu: {
    position: 'absolute',
    right: -101,
    bottom: -101,
    width: 260,
    height: 260,
    zIndex: 2,
  },
  floatingActionCloseArea: {
    position: 'absolute',
    right: -101,
    bottom: -101,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  floatingActionItem: {
    position: 'absolute',
    width: 74,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  floatingActionItemZero: {
    left: 3,
    top: 113,
  },
  floatingActionItemFortyFive: {
    left: 28,
    top: 48,
  },
  floatingActionItemNinety: {
    left: 81,
    top: 6,
  },
  floatingActionItemText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  floatingActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 14,
    zIndex: 3,
  },
  activeTabHighlight: {
    position: 'absolute',
    top: 6,
    left: 0,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 0,
  },
  floatingTabsSearchFocused: {
    columnGap: 0,
  },
  sideTabSlot: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  roundTab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    elevation: 0,
  },
  roundTabActive: {
    width: undefined,
    paddingHorizontal: 16,
  },
  roundTabText: {
    color: '#D1D5DB',
    fontSize: 13,

    fontFamily: FONT_FAMILY.inter28Regular,
  },
  roundTabTextActive: {
    color: '#1F2937',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  searchTab: {
    flex: 1,
    height: 50,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    elevation: 0,
    zIndex: 1,
  },
  searchTabActive: {
    backgroundColor: 'transparent',
  },
  searchText: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 32,
  },
  searchTextActive: {
    color: '#1F2937',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 38,
    padding: 0,
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  searchInputActive: {
    color: '#1F2937',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  clearSearchButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
});

export default HomeScreen;
