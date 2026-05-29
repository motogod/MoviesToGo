import React, {
  useCallback,
  useEffect,
  memo,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  Clapperboard,
  Moon,
  MoonStar,
  Search,
  Sun,
  Sunrise,
  X,
} from 'lucide-react-native';
import { ShowTimeHeader } from '@/components/CustomHeader';
import { MovieModal } from '@/components/CustomModal';
import GradientView from '@/components/CustomView/GradientView';
import { useHomeNavigation } from '@/hooks';
import { Text } from '@/components/ui/text';
import type { AppDispatch, RootState } from '@/store';
import { setSelectedTheaterCityTitle } from '@/store';
import { FONT_FAMILY } from '@/utility/fonts';
import { useGetFilterShowTimesMutation } from '@/api/moviesApi';
import type { FilterShowTime } from '@/api/types/movies';

type FilterDateItem = {
  id: string;
  label: string;
  day: string;
  month: string;
  weekday: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const CITY_REVEAL_SIZE = 128;
const DATE_REVEAL_SIZE = 128;
const ALL_GENRE_TITLE = '全部';
const FLOATING_GENRE_BUTTON_LIMIT = 92;
const PERIOD_OPTIONS = [
  {
    label: '早上',
    time: '06:00-12:00',
    english: 'MORNING',
    Icon: Sunrise,
    iconSelectedColor: '#F4A85E',
  },
  {
    label: '下午',
    time: '12:00-18:00',
    english: 'AFTERNOON',
    Icon: Sun,
    iconSelectedColor: '#F47A5C',
  },
  {
    label: '晚上',
    time: '18:00-24:00',
    english: 'NIGHT',
    Icon: Moon,
    iconSelectedColor: '#F4D28E',
  },
  {
    label: '深夜',
    time: '00:00-06:00',
    english: 'MIDNIGHT',
    Icon: MoonStar,
    iconSelectedColor: '#A0B4D8',
  },
];
const WEEKDAY_TITLES = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_TITLES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];
const CITY_EN_TITLES: Record<string, string> = {
  台北: 'TAIPEI',
  新北: 'NEW TAIPEI',
  基隆: 'KEELUNG',
  桃園: 'TAOYUAN',
  新竹: 'HSINCHU',
  苗栗: 'MIAOLI',
  台中: 'TAICHUNG',
  彰化: 'CHANGHUA',
  南投: 'NANTOU',
  雲林: 'YUNLIN',
  嘉義: 'CHIAYI',
  台南: 'TAINAN',
  高雄: 'KAOHSIUNG',
  屏東: 'PINGTUNG',
  宜蘭: 'YILAN',
  花蓮: 'HUALIEN',
  台東: 'TAITUNG',
  澎湖: 'PENGHU',
  金門: 'KINMEN',
  馬祖: 'MATSU',
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatFilterDate = (date: Date): FilterDateItem => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return {
    id: formatDateKey(date),
    label: `${month}/${day}`,
    day,
    month: MONTH_TITLES[date.getMonth()] ?? '',
    weekday: WEEKDAY_TITLES[date.getDay()] ?? '',
  };
};

const getNextSevenDates = () =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    return formatFilterDate(date);
  });

const getCityEnglishTitle = (cityTitle?: string) =>
  cityTitle ? CITY_EN_TITLES[cityTitle] ?? cityTitle.toUpperCase() : '';

type GroupedShowTime = {
  title: string;
  title_en?: string;
  movie_id?: string | number;
  youtube_thumbnail?: string;
  items: FilterShowTime[];
};

type ShowTimeResultsListProps = {
  groupedShowTimes: GroupedShowTime[];
  isFilterLoading: boolean;
  hasData: boolean;
  skeletonOpacity: Animated.AnimatedInterpolation<string | number>;
  onMoviePress: (id: string | number | undefined, title: string, title_en?: string, thumb?: string) => void;
  paddingBottom: number;
};

const ShowTimeResultsList = memo(({
  groupedShowTimes,
  isFilterLoading,
  hasData,
  skeletonOpacity,
  onMoviePress,
  paddingBottom,
}: ShowTimeResultsListProps) => {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isFilterLoading) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [isFilterLoading]);

  return (
  <ScrollView
    ref={scrollRef}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={[styles.showTimeListContent, { paddingBottom }]}
  >
    {isFilterLoading ? (
      <>
        {Array.from({ length: 4 }).map((_, blockIdx) => (
          <View key={blockIdx} style={styles.showTimeCinemaBlock}>
            <Animated.View style={[styles.skeletonLine, { width: '68%', height: 20, opacity: skeletonOpacity }]} />
            <Animated.View style={[styles.skeletonLine, { width: '42%', height: 13, marginTop: 6, marginBottom: 10, opacity: skeletonOpacity }]} />
            {Array.from({ length: blockIdx % 2 === 0 ? 1 : 2 }).map((_, rowIdx) => (
              <View key={rowIdx} style={styles.showTimeFormatRow}>
                <View style={styles.showTimeCinemaFormatBlock}>
                  <Animated.View style={[styles.skeletonLine, { width: 110, height: 16, opacity: skeletonOpacity }]} />
                  <Animated.View style={[styles.skeletonLine, { width: 52, height: 22, borderRadius: 4, opacity: skeletonOpacity }]} />
                </View>
                <View style={styles.showTimeSlotWrap}>
                  {Array.from({ length: rowIdx === 0 ? 1 : 3 }).map((_, i) => (
                    <Animated.View key={i} style={[styles.skeletonLine, { width: 54, height: 30, opacity: skeletonOpacity }]} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}
      </>
    ) : groupedShowTimes.length === 0 ? (
      <View style={styles.showTimeEmptyState}>
        <Text style={styles.showTimeEmptyText}>
          {hasData ? '沒有符合的場次' : '選擇條件後點擊搜尋'}
        </Text>
      </View>
    ) : (
      groupedShowTimes.map(({ title, title_en, movie_id, youtube_thumbnail, items }) => (
        <View key={title} style={styles.showTimeCinemaBlock}>
          <Pressable
            onPress={() => onMoviePress(movie_id, title, title_en, youtube_thumbnail)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.showTimeTitlePressable,
              pressed && styles.showTimeTitlePressableActive,
            ]}
          >
            <Text numberOfLines={1} style={styles.showTimeCinemaName}>{title}</Text>
            {title_en ? (
              <Text numberOfLines={1} style={styles.showTimeMovieTitleEn}>{title_en}</Text>
            ) : null}
          </Pressable>
          {items.map((item, idx) => (
            <View key={idx} style={styles.showTimeFormatRow}>
              <View style={styles.showTimeCinemaFormatBlock}>
                <Text numberOfLines={1} style={styles.showTimeCinemaLabel}>{item.cinema}</Text>
                {item.format ? (
                  <View style={styles.showTimeFormatChip}>
                    <Text numberOfLines={1} style={styles.showTimeFormatText}>{item.format}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.showTimeSlotWrap}>
                {item.start_time.map(time => (
                  <View key={time} style={styles.showTimeSlot}>
                    <Text style={styles.showTimeSlotText}>{time}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ))
    )}
  </ScrollView>
  );
});

const FilterScreen = () => {
  const [
    getFilterShowTimes,
    { data: filterShowTimesData, isLoading: isFilterLoading },
  ] = useGetFilterShowTimesMutation();
  const dispatch = useDispatch<AppDispatch>();
  const { navigation } = useHomeNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const citiesAndCinemasList = useSelector(
    (state: RootState) => state.movies.citiesAndCinemasList,
  );
  const selectedTheaterCityTitle = useSelector(
    (state: RootState) => state.movies.selectedTheaterCityTitle,
  );
  const movieGenresList = useSelector(
    (state: RootState) => state.movies.movieGenresList,
  );
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const [selectedGenreTitles, setSelectedGenreTitles] = useState<string[]>([
    ALL_GENRE_TITLE,
  ]);
  const [isFloatingActionExpanded, setIsFloatingActionExpanded] =
    useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [movieModalTarget, setMovieModalTarget] = useState<{ id?: string | number; movie_id?: string | number; title: string; title_en?: string; youtube_thumbnail?: string } | null>(null);
  const dateRevealAnimation = useRef(new Animated.Value(1)).current;
  const cityRevealAnimation = useRef(new Animated.Value(1)).current;
  const floatingActionProgress = useRef(new Animated.Value(0)).current;
  const floatingActionIconFlipAnimation = useRef(new Animated.Value(0)).current;
  const searchIconFlipAnimation = useRef(new Animated.Value(0)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const searchModeAnimation = useRef(new Animated.Value(0)).current;
  const headerCollapseProgress = useRef(new Animated.Value(0)).current;
  const skeletonAnimation = useRef(new Animated.Value(0)).current;
  const ticketDateValueAnimation = useRef(new Animated.Value(0)).current;
  const ticketPeriodValueAnimation = useRef(new Animated.Value(0)).current;
  const ticketCityValueAnimation = useRef(new Animated.Value(0)).current;
  const ticketGenreValueAnimation = useRef(new Animated.Value(0)).current;
  const ticketUnrollAnimation = useRef(new Animated.Value(0)).current;
  const dateListRef = useRef<ScrollView>(null);
  const cityListRef = useRef<ScrollView>(null);
  const dateListWidthRef = useRef(0);
  const cityListWidthRef = useRef(0);
  const dateItemLayoutsRef = useRef<
    Record<number, { width: number; x: number }>
  >({});
  const cityItemLayoutsRef = useRef<
    Record<number, { width: number; x: number }>
  >({});
  const shouldCenterDateRef = useRef(false);
  const shouldCenterCityRef = useRef(false);
  const dateItems = useMemo(getNextSevenDates, []);
  const cityTitles = useMemo(
    () =>
      citiesAndCinemasList
        ?.map(city => city.title)
        .filter((title): title is string => Boolean(title)) ?? [],
    [citiesAndCinemasList],
  );
  const selectedCityIndex = useMemo(() => {
    const index = cityTitles.findIndex(
      title => title === selectedTheaterCityTitle,
    );

    return index >= 0 ? index : 0;
  }, [cityTitles, selectedTheaterCityTitle]);
  const selectedCityTitle =
    selectedTheaterCityTitle ?? cityTitles[selectedCityIndex] ?? '城市';
  const selectedDate = dateItems[selectedDateIndex] ?? dateItems[0];
  const selectedPeriod = PERIOD_OPTIONS[selectedPeriodIndex];
  const selectedCityEnglishTitle = getCityEnglishTitle(selectedCityTitle);
  const floatingGenreButtons = useMemo(() => {
    const uniqueGenres = Array.from(
      new Set(
        movieGenresList
          .filter(Boolean)
          .filter(genre => genre !== ALL_GENRE_TITLE),
      ),
    );

    return [ALL_GENRE_TITLE, ...uniqueGenres]
      .slice(0, FLOATING_GENRE_BUTTON_LIMIT)
      .map((genre, index) => ({
        key: `${genre}-${index}`,
        title: genre,
      }));
  }, [movieGenresList]);
  const isAllGenreSelected = selectedGenreTitles.includes(ALL_GENRE_TITLE);
  const groupedShowTimes = useMemo<
    Array<{ title: string; title_en?: string; movie_id?: string | number; youtube_thumbnail?: string; items: FilterShowTime[] }>
  >(() => {
    if (!filterShowTimesData?.length) return [];
    const map = new Map<string, FilterShowTime[]>();
    const meta = new Map<string, { title_en?: string; movie_id?: string | number; youtube_thumbnail?: string }>();
    filterShowTimesData.forEach(item => {
      const list = map.get(item.title) ?? [];
      list.push(item);
      map.set(item.title, list);
      if (!meta.has(item.title)) {
        meta.set(item.title, {
          title_en: item.title_en,
          movie_id: item.movie_id,
          youtube_thumbnail: item.youtube_thumbnail,
        });
      }
    });
    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      ...meta.get(title),
      items,
    }));
  }, [filterShowTimesData]);
  const ticketGenreValue = isAllGenreSelected
    ? ALL_GENRE_TITLE
    : selectedGenreTitles[0] ?? ALL_GENRE_TITLE;
  const ticketGenreSubValue = isAllGenreSelected
    ? 'ALL'
    : selectedGenreTitles.length > 1
    ? `+${selectedGenreTitles.length - 1}`
    : '';
  const dateRevealScale = useMemo(
    () =>
      dateRevealAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.04, 1],
      }),
    [dateRevealAnimation],
  );
  const cityRevealScale = useMemo(
    () =>
      cityRevealAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.04, 1],
      }),
    [cityRevealAnimation],
  );
  const floatingActionDimOpacity = floatingActionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.74],
  });
  const floatingActionMenuOpacity = floatingActionProgress.interpolate({
    inputRange: [0, 0.05, 1],
    outputRange: [0, 1, 1],
  });
  const floatingActionButtonScale = floatingActionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const floatingActionIconRotateY = floatingActionIconFlipAnimation.interpolate(
    {
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    },
  );
  const floatingGenreButtonScale = floatingActionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 1],
  });
  const floatingGenreButtonTranslateY = floatingActionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [98, 0],
  });
  const floatingGenreButtonTranslateX = floatingActionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [70, 0],
  });
  const headerNaturalHeight = insets.top + 56;
  const headerAnimatedMaxHeight = headerCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [headerNaturalHeight, 0],
  });
  const headerAnimatedOpacity = headerCollapseProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });
  const ticketSafeAreaPadding = headerCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, insets.top],
  });
  const skeletonOpacity = skeletonAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.65],
  });
  const floatingGenreMenuWidth = Math.min(screenWidth - 48, 360);
  const floatingGenreMenuRight = 97 - floatingGenreMenuWidth / 2;
  const searchIconRotateY = searchIconFlipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const ticketDateRotateY = ticketDateValueAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const ticketPeriodRotateY = ticketPeriodValueAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const ticketCityRotateY = ticketCityValueAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const ticketGenreRotateY = ticketGenreValueAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const mainContentOpacity = searchModeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const searchContentOpacity = searchModeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const shimmerTranslateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth * 1.5],
  });

  const centerSelectedDate = useCallback((index: number) => {
    const dateLayout = dateItemLayoutsRef.current[index];
    const dateListWidth = dateListWidthRef.current;

    if (!dateLayout || dateListWidth <= 0) {
      shouldCenterDateRef.current = true;
      return;
    }

    shouldCenterDateRef.current = false;
    dateListRef.current?.scrollTo({
      animated: true,
      x: Math.max(0, dateLayout.x + dateLayout.width / 2 - dateListWidth / 2),
      y: 0,
    });
  }, []);

  const centerSelectedCity = useCallback((index: number) => {
    const cityLayout = cityItemLayoutsRef.current[index];
    const cityListWidth = cityListWidthRef.current;

    if (!cityLayout || cityListWidth <= 0) {
      shouldCenterCityRef.current = true;
      return;
    }

    shouldCenterCityRef.current = false;
    cityListRef.current?.scrollTo({
      animated: true,
      x: Math.max(0, cityLayout.x + cityLayout.width / 2 - cityListWidth / 2),
      y: 0,
    });
  }, []);

  const runDateRevealAnimation = useCallback(() => {
    dateRevealAnimation.setValue(0);
    Animated.timing(dateRevealAnimation, {
      duration: 1680,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [dateRevealAnimation]);

  const runCityRevealAnimation = useCallback(() => {
    cityRevealAnimation.setValue(0);
    Animated.timing(cityRevealAnimation, {
      duration: 1680,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [cityRevealAnimation]);

  const runTicketValueTransition = useCallback((animation: Animated.Value) => {
    animation.stopAnimation();
    animation.setValue(0);
    Animated.timing(animation, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSelectDate = useCallback(
    (index: number) => {
      if (index === selectedDateIndex) {
        return;
      }

      setSelectedDateIndex(index);
      requestAnimationFrame(() => centerSelectedDate(index));
      runDateRevealAnimation();
      runTicketValueTransition(ticketDateValueAnimation);
    },
    [
      centerSelectedDate,
      runDateRevealAnimation,
      runTicketValueTransition,
      selectedDateIndex,
      ticketDateValueAnimation,
    ],
  );

  const handleSelectPeriod = useCallback(
    (index: number) => {
      if (index === selectedPeriodIndex) {
        return;
      }

      setSelectedPeriodIndex(index);
      runTicketValueTransition(ticketPeriodValueAnimation);
    },
    [runTicketValueTransition, selectedPeriodIndex, ticketPeriodValueAnimation],
  );

  const handleSelectCity = useCallback(
    (index: number) => {
      if (index === selectedCityIndex) {
        return;
      }

      const cityTitle = cityTitles[index];

      dispatch(setSelectedTheaterCityTitle(cityTitle));
      requestAnimationFrame(() => centerSelectedCity(index));
      runCityRevealAnimation();
      runTicketValueTransition(ticketCityValueAnimation);
    },
    [
      centerSelectedCity,
      cityTitles,
      dispatch,
      runCityRevealAnimation,
      runTicketValueTransition,
      selectedCityIndex,
      ticketCityValueAnimation,
    ],
  );

  const toggleFloatingAction = useCallback(() => {
    setIsFloatingActionExpanded(isExpanded => !isExpanded);
  }, []);

  const handleOpenMovieModal = useCallback(
    (movie_id: string | number | undefined, title: string, title_en?: string, youtube_thumbnail?: string) => {
      setMovieModalTarget({ id: movie_id, movie_id, title, title_en, youtube_thumbnail });
    },
    [],
  );

  const handleCloseMovieModal = useCallback(() => {
    setMovieModalTarget(null);
  }, []);

  const handleAfterCloseMovieModal = useCallback(() => {
    setMovieModalTarget(null);
  }, []);

  const handleSearchPress = useCallback(() => {
    searchIconFlipAnimation.setValue(0);
    Animated.timing(searchIconFlipAnimation, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();

    const enteringSearch = !isSearchMode;
    setIsSearchMode(enteringSearch);

    if (enteringSearch) {
      setIsFloatingActionExpanded(false);
      shimmerAnimation.setValue(0);
      Animated.timing(shimmerAnimation, {
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }).start();
      getFilterShowTimes({
        city: selectedCityTitle,
        date: selectedDate?.id ?? '',
        period: selectedPeriod?.time ?? '',
        genres: isAllGenreSelected ? undefined : selectedGenreTitles,
      });
    }
  }, [
    getFilterShowTimes,
    isAllGenreSelected,
    isSearchMode,
    searchIconFlipAnimation,
    selectedCityTitle,
    selectedDate,
    selectedGenreTitles,
    selectedPeriod,
    shimmerAnimation,
  ]);

  const handleFloatingGenrePress = useCallback(
    (genreTitle: string) => {
      setSelectedGenreTitles(currentGenres => {
        if (genreTitle === ALL_GENRE_TITLE) {
          return [ALL_GENRE_TITLE];
        }

        const nextGenres = currentGenres.includes(ALL_GENRE_TITLE)
          ? [genreTitle]
          : currentGenres.includes(genreTitle)
          ? currentGenres.filter(genre => genre !== genreTitle)
          : [...currentGenres, genreTitle];

        return nextGenres.length > 0 ? nextGenres : [ALL_GENRE_TITLE];
      });
      runTicketValueTransition(ticketGenreValueAnimation);
    },
    [runTicketValueTransition, ticketGenreValueAnimation],
  );

  useEffect(() => {
    if (selectedTheaterCityTitle || !cityTitles[0]) {
      return;
    }

    dispatch(setSelectedTheaterCityTitle(cityTitles[0]));
  }, [cityTitles, dispatch, selectedTheaterCityTitle]);

  useEffect(() => {
    ticketUnrollAnimation.setValue(0);
    Animated.timing(ticketUnrollAnimation, {
      duration: 2600,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [ticketUnrollAnimation]);

  useEffect(() => {
    requestAnimationFrame(() => centerSelectedDate(selectedDateIndex));
  }, [centerSelectedDate, selectedDateIndex]);

  useEffect(() => {
    requestAnimationFrame(() => centerSelectedCity(selectedCityIndex));
  }, [centerSelectedCity, selectedCityIndex]);

  useEffect(() => {
    Animated.timing(floatingActionProgress, {
      duration: isFloatingActionExpanded ? 360 : 260,
      easing: Easing.out(Easing.cubic),
      toValue: isFloatingActionExpanded ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [floatingActionProgress, isFloatingActionExpanded]);

  useEffect(() => {
    floatingActionIconFlipAnimation.setValue(0);
    Animated.timing(floatingActionIconFlipAnimation, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [floatingActionIconFlipAnimation, isFloatingActionExpanded]);

  useEffect(() => {
    Animated.timing(searchModeAnimation, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      toValue: isSearchMode ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isSearchMode, searchModeAnimation]);

  useEffect(() => {
    Animated.timing(headerCollapseProgress, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
      toValue: isSearchMode ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [isSearchMode, headerCollapseProgress]);

  useEffect(() => {
    if (!isFilterLoading) {
      skeletonAnimation.stopAnimation();
      skeletonAnimation.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnimation, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonAnimation, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isFilterLoading, skeletonAnimation]);


  return (
    <GradientView style={styles.container}>
      <Animated.View
        style={{
          maxHeight: headerAnimatedMaxHeight,
          opacity: headerAnimatedOpacity,
          overflow: 'hidden',
        }}
      >
        <ShowTimeHeader
          onBack={navigation.goBack}
          showTitle={false}
          showRightIcon={false}
          variant="filter"
        />
      </Animated.View>
      <Animated.View style={{ paddingTop: ticketSafeAreaPadding }}>
      <Animated.View
        style={[styles.filmTicketContainer, { opacity: ticketUnrollAnimation }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.filmShimmer,
            { transform: [{ translateX: shimmerTranslateX }] },
          ]}
        />
        <View style={styles.filmStripRow}>
          {Array.from({ length: 22 }).map((_, i) => (
            <View key={i} style={styles.filmHole} />
          ))}
        </View>
        <View style={styles.ticketContentRow}>
          <View style={styles.ticketField}>
            <Text numberOfLines={1} style={styles.ticketLabel}>
              DATE
            </Text>
            <Animated.View
              style={{
                transform: [
                  { perspective: 800 },
                  { rotateY: ticketDateRotateY },
                ],
              }}
            >
              <Text numberOfLines={1} style={styles.ticketValue}>
                {selectedDate?.label ?? '日期'}
              </Text>
            </Animated.View>
            <Text numberOfLines={1} style={styles.ticketSubValue}>
              {selectedDate?.weekday ?? ''}
            </Text>
          </View>
          <View style={styles.ticketField}>
            <Text numberOfLines={1} style={styles.ticketLabel}>
              TIME
            </Text>
            <Animated.View
              style={{
                transform: [
                  { perspective: 800 },
                  { rotateY: ticketPeriodRotateY },
                ],
              }}
            >
              <Text numberOfLines={1} style={styles.ticketValue}>
                {selectedPeriod?.label ?? '時段'}
              </Text>
            </Animated.View>
            <Text numberOfLines={1} style={styles.ticketSubValue}>
              {selectedPeriod?.english ?? ''}
            </Text>
          </View>
          <View style={styles.ticketField}>
            <Text numberOfLines={1} style={styles.ticketLabel}>
              CITY
            </Text>
            <Animated.View
              style={{
                transform: [
                  { perspective: 800 },
                  { rotateY: ticketCityRotateY },
                ],
              }}
            >
              <Text numberOfLines={1} style={styles.ticketValue}>
                {selectedCityTitle}
              </Text>
            </Animated.View>
            <Text numberOfLines={1} style={styles.ticketSubValue}>
              {selectedCityEnglishTitle}
            </Text>
          </View>
          <View style={styles.ticketField}>
            <Text numberOfLines={1} style={styles.ticketLabel}>
              GENRE
            </Text>
            <Animated.View
              style={{
                transform: [
                  { perspective: 800 },
                  { rotateY: ticketGenreRotateY },
                ],
              }}
            >
              <Text numberOfLines={1} style={styles.ticketValue}>
                {ticketGenreValue}
              </Text>
            </Animated.View>
            <Text numberOfLines={1} style={styles.ticketSubValue}>
              {ticketGenreSubValue}
            </Text>
          </View>
        </View>
        <View style={styles.filmStripRow}>
          {Array.from({ length: 22 }).map((_, i) => (
            <View key={i} style={styles.filmHole} />
          ))}
        </View>
      </Animated.View>
      </Animated.View>
      <View style={{ flex: 1 }}>
      <Animated.View
        pointerEvents={isSearchMode ? 'none' : 'box-none'}
        style={{ flex: 1, opacity: mainContentOpacity }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 116 }}
        >
          <View>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionRule} />
              <Text style={styles.sectionTitle}>日期</Text>
              <View style={styles.sectionRule} />
            </View>
            <ScrollView
              ref={dateListRef}
              horizontal
              onLayout={event => {
                dateListWidthRef.current = event.nativeEvent.layout.width;

                if (shouldCenterDateRef.current) {
                  requestAnimationFrame(() =>
                    centerSelectedDate(selectedDateIndex),
                  );
                }
              }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateListContent}
            >
              {dateItems.map((date, index) => {
                const isSelected = selectedDateIndex === index;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={date.id}
                    onLayout={event => {
                      dateItemLayoutsRef.current[index] =
                        event.nativeEvent.layout;

                      if (
                        index === selectedDateIndex &&
                        shouldCenterDateRef.current
                      ) {
                        requestAnimationFrame(() => centerSelectedDate(index));
                      }
                    }}
                    onPress={() => handleSelectDate(index)}
                    style={[
                      styles.dateItem,
                      isSelected && styles.dateItemActive,
                    ]}
                  >
                    {isSelected && (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.dateItemReveal,
                          { transform: [{ scale: dateRevealScale }] },
                        ]}
                      />
                    )}
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.weekdayText,
                        isSelected && styles.selectedOptionText,
                      ]}
                    >
                      {date.weekday}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.dayText,
                        isSelected && styles.selectedOptionText,
                      ]}
                    >
                      {date.day}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.monthText,
                        isSelected && styles.selectedOptionText,
                      ]}
                    >
                      {date.month}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionRule} />
              <Text style={styles.sectionTitle}>時段</Text>
              <View style={styles.sectionRule} />
            </View>
            <View style={styles.periodPanel}>
              {PERIOD_OPTIONS.map((period, index) => {
                const isSelected = selectedPeriodIndex === index;
                const PeriodIcon = period.Icon;
                const itemMainColor = isSelected ? '#F4D28E' : '#DDD4C5';
                const itemSubColor = isSelected ? '#F4D28E' : '#8A8175';
                const iconColor = isSelected
                  ? period.iconSelectedColor
                  : '#8A8175';

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={period.label}
                    onPress={() => handleSelectPeriod(index)}
                    style={[
                      styles.periodOption,
                      isSelected && styles.periodOptionSelected,
                    ]}
                  >
                    <PeriodIcon
                      color={iconColor}
                      fill={isSelected ? iconColor : 'none'}
                      size={24}
                      strokeWidth={isSelected ? 1.4 : 2.2}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.periodTime, { color: itemSubColor }]}
                    >
                      {period.time}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.periodLabel, { color: itemMainColor }]}
                    >
                      {period.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.periodEnglish, { color: itemSubColor }]}
                    >
                      {period.english}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionRule} />
              <Text style={styles.sectionTitle}>城市</Text>
              <View style={styles.sectionRule} />
            </View>
            <ScrollView
              ref={cityListRef}
              horizontal
              onLayout={event => {
                cityListWidthRef.current = event.nativeEvent.layout.width;

                if (shouldCenterCityRef.current) {
                  requestAnimationFrame(() =>
                    centerSelectedCity(selectedCityIndex),
                  );
                }
              }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityListContent}
            >
              {cityTitles.map((cityTitle, index) => {
                const isSelected = selectedCityIndex === index;
                const cityEnglishTitle = getCityEnglishTitle(cityTitle);

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={`${cityTitle}-${index}`}
                    onLayout={event => {
                      cityItemLayoutsRef.current[index] =
                        event.nativeEvent.layout;

                      if (
                        index === selectedCityIndex &&
                        shouldCenterCityRef.current
                      ) {
                        requestAnimationFrame(() => centerSelectedCity(index));
                      }
                    }}
                    onPress={() => handleSelectCity(index)}
                    style={[
                      styles.cityItem,
                      isSelected && styles.cityItemActive,
                    ]}
                  >
                    {isSelected && (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.cityItemReveal,
                          { transform: [{ scale: cityRevealScale }] },
                        ]}
                      />
                    )}
                    <View style={styles.verticalCityTitle}>
                      {Array.from(cityTitle).map((char, charIndex) => (
                        <Text
                          key={`${cityTitle}-${char}-${charIndex}`}
                          style={[
                            styles.cityTitle,
                            isSelected && styles.selectedOptionText,
                          ]}
                        >
                          {char}
                        </Text>
                      ))}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.cityEnglishTitle,
                        isSelected && styles.cityEnglishTitleActive,
                      ]}
                    >
                      {cityEnglishTitle}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      </Animated.View>
      <Animated.View
        pointerEvents={isSearchMode ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { opacity: searchContentOpacity }]}
      >
        <ShowTimeResultsList
          groupedShowTimes={groupedShowTimes}
          isFilterLoading={isFilterLoading}
          hasData={Boolean(filterShowTimesData)}
          skeletonOpacity={skeletonOpacity}
          onMoviePress={handleOpenMovieModal}
          paddingBottom={insets.bottom + 116}
        />
      </Animated.View>
      </View>
      <AnimatedPressable
        accessibilityRole="button"
        onPress={() => setIsFloatingActionExpanded(false)}
        pointerEvents={isFloatingActionExpanded ? 'auto' : 'none'}
        style={[
          styles.floatingActionDimOverlay,
          { opacity: floatingActionDimOpacity },
        ]}
      />
      <View
        pointerEvents="box-none"
        style={[styles.searchButtonWrap, { paddingBottom: insets.bottom + 2 }]}
      >
        <View style={styles.searchGlassButtonShadow}>
          <Pressable
            accessibilityRole="search"
            onPress={handleSearchPress}
            style={styles.searchGlassButton}
          >
            <View pointerEvents="none" style={styles.searchGlassButtonSheen} />
            <Animated.View
              style={{
                transform: [
                  { perspective: 800 },
                  { rotateY: searchIconRotateY },
                ],
              }}
            >
              {isSearchMode ? (
                <X color="#F4D28E" size={24} strokeWidth={2.7} />
              ) : (
                <Search color="#F4D28E" size={24} strokeWidth={2.7} />
              )}
            </Animated.View>
          </Pressable>
        </View>

        {!isSearchMode && (
          <View
            style={[
              styles.floatingActionWrap,
              { bottom: insets.bottom + 16, right: screenWidth / 2 - 97 },
            ]}
          >
            <Animated.View
              pointerEvents={isFloatingActionExpanded ? 'box-none' : 'none'}
              style={[
                styles.floatingActionMenu,
                {
                  opacity: floatingActionMenuOpacity,
                  transform: [
                    { translateX: floatingGenreButtonTranslateX },
                    { translateY: floatingGenreButtonTranslateY },
                    { scale: floatingGenreButtonScale },
                  ],
                  right: floatingGenreMenuRight,
                  width: floatingGenreMenuWidth,
                },
              ]}
            >
              {floatingGenreButtons.length > 0 ? (
                floatingGenreButtons.map(genre => {
                  const isSelected = selectedGenreTitles.includes(genre.title);

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={genre.key}
                      onPress={() => handleFloatingGenrePress(genre.title)}
                      style={[
                        styles.floatingGenreButton,
                        isSelected && styles.floatingGenreButtonSelected,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.floatingGenreTitle,
                          isSelected && styles.floatingGenreTitleSelected,
                        ]}
                      >
                        {genre.title}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <View style={styles.floatingGenreEmptyButton}>
                  <Text numberOfLines={1} style={styles.floatingGenreTitle}>
                    暫無電影分類
                  </Text>
                </View>
              )}
            </Animated.View>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isFloatingActionExpanded }}
              onPress={toggleFloatingAction}
              hitSlop={12}
              style={[
                styles.floatingActionButton,
                isFloatingActionExpanded && styles.floatingActionButtonExpanded,
                { transform: [{ scale: floatingActionButtonScale }] },
              ]}
            >
              <Animated.View
                style={{
                  transform: [
                    { perspective: 800 },
                    { rotateY: floatingActionIconRotateY },
                  ],
                }}
              >
                {isFloatingActionExpanded ? (
                  <X size={14} color="#F9FAFB" strokeWidth={3} />
                ) : (
                  <Clapperboard size={14} color="#D1D5DB" strokeWidth={3} />
                )}
              </Animated.View>
            </AnimatedPressable>
          </View>
        )}
      </View>
      <MovieModal
        visible={movieModalTarget !== null}
        movie={movieModalTarget}
        posterLayout={null}
        onClose={handleCloseMovieModal}
        onAfterClose={handleAfterCloseMovieModal}
        showCinemaButton={false}
      />
    </GradientView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07080B',
  },
  showtimeMark: {
    alignItems: 'center',
    columnGap: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 62,
  },
  showtimeRule: {
    backgroundColor: 'rgba(198,160,94,0.46)',
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  showtimeText: {
    color: '#9B8053',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  filmTicketContainer: {
    marginTop: 24,
    overflow: 'hidden',
    width: '100%',
  },
  filmShimmer: {
    backgroundColor: '#C6A05E',
    bottom: 0,
    opacity: 0.01,
    position: 'absolute',
    top: 0,
    width: 120,
    zIndex: 10,
  },
  filmStripRow: {
    alignItems: 'center',
    backgroundColor: '#1C1915',
    flexDirection: 'row',
    height: 10,
    justifyContent: 'space-evenly',
    overflow: 'hidden',
  },
  filmHole: {
    backgroundColor: '#080608',
    borderRadius: 2,
    height: 8,
    width: 14,
  },
  ticketContentRow: {
    flexDirection: 'row',
    paddingVertical: 18,
  },
  ticketField: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  ticketLabel: {
    color: '#B89456',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  ticketValue: {
    color: '#F4D28E',
    fontSize: 23,
    lineHeight: 27,
    marginTop: 2,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  ticketSubValue: {
    color: '#8A8175',
    fontSize: 10,
    lineHeight: 13,
    marginTop: 1,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 4,
    marginTop: 16,
    paddingHorizontal: 32,
  },
  sectionRule: {
    backgroundColor: 'rgba(198,160,94,0.38)',
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    color: '#B89456',
    fontSize: 11,
    letterSpacing: 0,
    lineHeight: 20,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  dateListContent: {
    paddingHorizontal: 30,
    paddingTop: 6,
  },
  dateItem: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 7,
    borderWidth: 1,
    height: 76,
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
    width: 50,
  },
  dateItemActive: {
    borderColor: '#D8A94F',
    ...Platform.select({
      ios: {
        shadowColor: '#D8A94F',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.42,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dateItemReveal: {
    backgroundColor: 'rgba(216,169,79,0.1)',
    borderColor: 'rgba(244,210,142,0.46)',
    borderRadius: 8,
    borderWidth: 1,
    height: DATE_REVEAL_SIZE,
    left: '50%',
    marginLeft: -DATE_REVEAL_SIZE / 2,
    marginTop: -DATE_REVEAL_SIZE / 2,
    position: 'absolute',
    top: '50%',
    width: DATE_REVEAL_SIZE,
  },
  weekdayText: {
    color: '#8A8175',
    fontSize: 10,
    letterSpacing: 0,
    lineHeight: 14,
    textAlign: 'center',
    zIndex: 1,
    fontFamily: FONT_FAMILY.oswaldLight,
  },
  dayText: {
    color: '#DDD4C5',
    fontSize: 20,
    letterSpacing: 0,
    lineHeight: 26,
    textAlign: 'center',
    zIndex: 1,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  monthText: {
    color: '#8A8175',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 14,
    textAlign: 'center',
    zIndex: 1,
    fontFamily: FONT_FAMILY.oswaldLight,
  },
  selectedOptionText: {
    color: '#F4D28E',
  },
  periodPanel: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 8,
  },
  periodOption: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    height: 124,
    justifyContent: 'center',
    marginHorizontal: 4,
    minWidth: 0,
    paddingHorizontal: 5,
  },
  periodOptionSelected: {
    backgroundColor: 'rgba(216,169,79,0.08)',
    borderColor: '#D8A94F',
    ...Platform.select({
      ios: {
        shadowColor: '#D8A94F',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.42,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  periodTime: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 9,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  periodLabel: {
    fontSize: 17,
    lineHeight: 23,
    marginTop: 5,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  periodEnglish: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  cityListContent: {
    paddingHorizontal: 30,
    paddingTop: 6,
  },
  cityItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  cityItemActive: {
    borderColor: '#D8A94F',
    ...Platform.select({
      ios: {
        shadowColor: '#D8A94F',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cityItemReveal: {
    backgroundColor: 'rgba(216,169,79,0.1)',
    borderColor: 'rgba(244,210,142,0.44)',
    borderRadius: 8,
    borderWidth: 1,
    height: CITY_REVEAL_SIZE,
    left: '50%',
    marginLeft: -CITY_REVEAL_SIZE / 2,
    marginTop: -CITY_REVEAL_SIZE / 2,
    position: 'absolute',
    top: '50%',
    width: CITY_REVEAL_SIZE,
  },
  verticalCityTitle: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  cityTitle: {
    color: '#DDD4C5',
    fontSize: 18,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.inter18Light,
  },
  cityEnglishTitle: {
    color: '#8A8175',
    fontSize: 8,
    lineHeight: 10,
    marginTop: 5,
    textAlign: 'center',
    zIndex: 1,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  cityEnglishTitleActive: {
    color: '#F4D28E',
  },
  floatingActionDimOverlay: {
    backgroundColor: '#000000',
    bottom: 0,
    elevation: 24,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 24,
  },
  searchButtonWrap: {
    alignItems: 'center',
    right: 0,
    bottom: 0,
    left: 0,
    paddingTop: 12,
    position: 'absolute',
    zIndex: 30,
    elevation: 30,
  },
  bottomFloatingControls: {
    alignItems: 'center',
    columnGap: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  searchGlassButtonShadow: {
    alignItems: 'center',
    height: 66,
    justifyContent: 'center',
    width: 66,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.34,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  searchGlassButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.38)',
    borderRadius: 31,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 62,
  },
  searchGlassButtonSheen: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 31,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  floatingActionWrap: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    overflow: 'visible',
    position: 'absolute',
    width: 58,
  },
  floatingActionMenu: {
    alignItems: 'center',
    bottom: 86,
    columnGap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    minHeight: 96,
    position: 'absolute',
    right: -24,
    rowGap: 10,
    zIndex: 2,
  },
  floatingGenreButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,8,10,0.82)',
    borderColor: 'rgba(198,160,94,0.34)',
    borderRadius: 8,
    borderWidth: 1,
    columnGap: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    maxWidth: 148,
    minHeight: 38,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  floatingGenreButtonSelected: {
    backgroundColor: 'rgba(216,169,79,0.22)',
    borderColor: '#D8A94F',
  },
  floatingGenreEmptyButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,8,10,0.82)',
    borderColor: 'rgba(198,160,94,0.34)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  floatingGenreTitle: {
    color: '#C6A05E',
    fontSize: 13,
    lineHeight: 17,
    maxWidth: 106,
    fontFamily: FONT_FAMILY.inter18Light,
  },
  floatingGenreTitleSelected: {
    color: '#F4D28E',
  },
  floatingActionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
    zIndex: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  floatingActionButtonExpanded: {
    backgroundColor: 'rgba(17,17,20,0.96)',
    borderColor: 'rgba(249,250,251,0.24)',
  },
  searchButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: 'rgba(198,160,94,0.42)',
    borderRadius: 8,
    borderWidth: 1,
    columnGap: 12,
    flexDirection: 'row',
    height: 70,
    justifyContent: 'center',
    maxWidth: 520,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.32,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  searchButtonTextBlock: {
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#F0E0C1',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  searchButtonSubtext: {
    color: '#B89456',
    fontSize: 10,
    letterSpacing: 0,
    lineHeight: 14,
    marginTop: 1,
    fontFamily: FONT_FAMILY.oswaldLight,
  },
  showTimeListContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  showTimeEmptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 60,
  },
  showTimeEmptyText: {
    color: '#8A8175',
    fontSize: 14,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  showTimeCinemaBlock: {
    borderBottomColor: 'rgba(198,160,94,0.28)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
    paddingBottom: 18,
    paddingTop: 16,
  },
  showTimeCinemaName: {
    color: '#F0E0C1',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  showTimeMovieTitleEn: {
    color: '#6E6760',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
    marginTop: 2,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  showTimeCinemaFormatBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  showTimeCinemaLabel: {
    color: '#F3F4F6',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  showTimeFormatRow: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    flexDirection: 'column',
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  showTimeFormatChip: {
    backgroundColor: 'rgba(198,160,94,0.15)',
    borderColor: 'rgba(198,160,94,0.4)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  showTimeFormatText: {
    color: '#C6A05E',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  showTimeSlotWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  showTimeSlot: {
    backgroundColor: 'rgba(198,160,94,0.10)',
    borderColor: 'rgba(198,160,94,0.30)',
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  showTimeSlotText: {
    color: '#F4D28E',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  skeletonLine: {
    backgroundColor: 'rgba(198,160,94,0.18)',
    borderRadius: 4,
  },
  showTimeTitlePressable: {
    borderRadius: 6,
    marginBottom: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  showTimeTitlePressableActive: {
    backgroundColor: 'rgba(198,160,94,0.32)',
    opacity: 0.72,
  },
});

export default FilterScreen;
