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
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  useGetCinemaShowTimeDatesMutation,
  useGetMovieCinemasMutation,
  useGetMovieShowTimesMutation,
} from '@/api/moviesApi';
import { ShowTimeHeader } from '@/components/CustomHeader';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHomeNavigation } from '@/hooks';
import type { HomeStackParamsType } from '@/navigator/types';
import GradientView from '@/components/CustomView/GradientView';
import { MovieModal } from '@/components/CustomModal';
import type {
  Movie,
  MovieShowTime,
  MovieShowTimeSession,
} from '@/api/types/movies';
import type { AppDispatch, RootState } from '@/store';
import { addUserSelectedCinemaShowTimes } from '@/store/slice/moviesSlice';
import { ShowTimeSkeleton } from './components';
import { FONT_FAMILY } from '@/utility/fonts';
import { NativeAdCard } from '@/components/CustomView';

type ShowTimeRouteProp = RouteProp<HomeStackParamsType, 'ShowTimeScreen'>;

const DATE_REVEAL_SIZE = 128;
const EMPTY_SHOW_TIME_DATES: string[] = [];
const EMPTY_SHOW_TIMES: MovieShowTime[] = [];
const HALL_BADGE_ANIMATION_DURATION = 220;
const TIME_CHIP_COLUMN_GAP = 5;
const TIME_CHIP_MAX_COLUMNS = 4;
const TIME_CHIP_MIN_WIDTH = 62;
const TIME_AREA_ANIMATION_DURATION = 520;
const CACHED_LIST_ANIMATION_DURATION = 420;
const MOVIE_SCROLL_RETRY_DELAY_MS = 120;
const MOVIE_SCROLL_VIEW_OFFSET = 18;
const MOVIE_SCROLL_ESTIMATED_ITEM_HEIGHT = 280;
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

const formatShowTimeDate = (dateValue: string) => {
  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return {
    day: String(day).padStart(2, '0'),
    month: MONTH_TITLES[date.getMonth()] ?? '',
    weekday: WEEKDAY_TITLES[date.getDay()] ?? '',
  };
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const normalizeMovieIdentityText = (value?: string) =>
  value?.trim().toLowerCase().replace(/\s+/g, '') ?? '';

const isShowTimePast = (
  showDate: string | undefined,
  startTime: string,
  currentTime: Date,
) => {
  if (!showDate) {
    return false;
  }

  const [year, month, day] = showDate.split('-').map(Number);
  const [hour, minute] = startTime.split(':').map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return false;
  }

  const showTime = new Date(year, month - 1, day, hour, minute);

  return showTime.getTime() < currentTime.getTime();
};

const isMovieShowTimeSession = (
  value: unknown,
): value is MovieShowTimeSession => {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return false;
  }

  return Array.isArray((value as MovieShowTimeSession).start_time);
};

const getSessionText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

type ShowTimeMovieCardProps = {
  currentTime: Date;
  item: MovieShowTime;
  onPressMovie: (item: MovieShowTime) => void;
  showDate: string | undefined;
};

type ShowTimeListItem =
  | {
      type: 'movie';
      item: MovieShowTime;
      movieIndex: number;
    }
  | {
      type: 'ad';
      id: string;
    };

const getNativeAdInsertAfterIndexes = (movieCount: number) => {
  if (movieCount <= 2) {
    return [];
  }

  if (movieCount <= 8) {
    return [2];
  }

  if (movieCount <= 20) {
    return [3, 11].filter(index => index < movieCount);
  }

  const insertAfterIndexes: number[] = [];

  for (
    let insertAfterIndex = 7;
    insertAfterIndex < movieCount && insertAfterIndexes.length < 3;
    insertAfterIndex += 8
  ) {
    insertAfterIndexes.push(insertAfterIndex);
  }

  return insertAfterIndexes;
};

const getListIndexForMovieIndex = (
  movieIndex: number,
  adInsertAfterIndexes: number[],
) =>
  movieIndex +
  adInsertAfterIndexes.filter(insertAfterIndex => insertAfterIndex < movieIndex)
    .length;

const ShowTimeMovieCard = ({
  currentTime,
  item,
  onPressMovie,
  showDate,
}: ShowTimeMovieCardProps) => {
  const validSessions = useMemo(
    () => item.session.filter(isMovieShowTimeSession),
    [item.session],
  );
  const firstSessionValue = validSessions.length ? 'session-0' : '';
  const [selectedSessionValue, setSelectedSessionValue] =
    useState(firstSessionValue);
  const [isTimeAreaMeasured, setIsTimeAreaMeasured] = useState(false);
  const [timeWrapWidth, setTimeWrapWidth] = useState(0);
  const selectedSessionIndex = Number(
    selectedSessionValue.replace('session-', ''),
  );
  const selectedSession = validSessions[selectedSessionIndex];
  const selectedHallName = getSessionText(selectedSession?.hall_name);
  const selectedStartTimes = useMemo(
    () =>
      (selectedSession?.start_time ?? []).filter(
        (startTime): startTime is string => typeof startTime === 'string',
      ),
    [selectedSession?.start_time],
  );
  const timeChipColumns =
    timeWrapWidth > 0
      ? Math.max(
          1,
          Math.min(
            TIME_CHIP_MAX_COLUMNS,
            Math.floor(
              (timeWrapWidth + TIME_CHIP_COLUMN_GAP) /
                (TIME_CHIP_MIN_WIDTH + TIME_CHIP_COLUMN_GAP),
            ),
          ),
        )
      : TIME_CHIP_MAX_COLUMNS;

  const timeChipWidth =
    timeWrapWidth > 0
      ? (timeWrapWidth - TIME_CHIP_COLUMN_GAP * (timeChipColumns - 1)) /
        timeChipColumns
      : undefined;

  const hallBadgeAnimation = useRef(new Animated.Value(1)).current;
  const timeAreaHeight = useRef(new Animated.Value(0)).current;
  const measuredTimeAreaHeightRef = useRef(0);
  const previousHallNameRef = useRef(selectedHallName);

  useEffect(() => {
    setSelectedSessionValue(firstSessionValue);
    setIsTimeAreaMeasured(false);
    measuredTimeAreaHeightRef.current = 0;
    timeAreaHeight.setValue(0);
  }, [firstSessionValue, item.movie_id, timeAreaHeight]);

  const handleSessionChange = useCallback((nextSessionValue: string) => {
    setSelectedSessionValue(nextSessionValue);
  }, []);

  useEffect(() => {
    if (previousHallNameRef.current === selectedHallName) {
      return;
    }

    previousHallNameRef.current = selectedHallName;

    if (!selectedHallName) {
      return;
    }

    hallBadgeAnimation.setValue(0);
    Animated.timing(hallBadgeAnimation, {
      toValue: 1,
      duration: HALL_BADGE_ANIMATION_DURATION,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, [hallBadgeAnimation, selectedHallName]);

  const handleTimeAreaLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const nextHeight = Math.ceil(event.nativeEvent.layout.height);

      if (
        nextHeight <= 0 ||
        Math.abs(measuredTimeAreaHeightRef.current - nextHeight) < 1
      ) {
        return;
      }

      measuredTimeAreaHeightRef.current = nextHeight;

      if (!isTimeAreaMeasured) {
        timeAreaHeight.setValue(nextHeight);
        setIsTimeAreaMeasured(true);
        return;
      }

      Animated.timing(timeAreaHeight, {
        toValue: nextHeight,
        duration: TIME_AREA_ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [isTimeAreaMeasured, timeAreaHeight],
  );

  return (
    <View style={styles.movieCard}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onPressMovie(item)}
        style={({ pressed }) => [
          styles.backdropButton,
          pressed && styles.movieCardPressed,
        ]}
      >
        <View style={styles.backdropWrap}>
          {item.backdrop_url ? (
            <Image
              source={{ uri: item.backdrop_url }}
              resizeMode="cover"
              style={styles.backdropImage}
            />
          ) : (
            <View style={[styles.backdropImage, styles.backdropFallback]} />
          )}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(16,16,20,0)', 'rgba(16,16,20,0.88)', '#101014']}
            style={styles.backdropGradient}
          />
          <View style={styles.backdropTitleBlock}>
            <Text numberOfLines={2} style={styles.movieTitle}>
              {item.title}
            </Text>
            <View style={styles.movieTitleMetaRow}>
              <Text numberOfLines={1} style={styles.movieTitleEn}>
                {item.title_en}
              </Text>
              {selectedHallName ? (
                <Animated.View
                  style={[
                    styles.hallBadgeAnimated,
                    {
                      opacity: hallBadgeAnimation,
                      transform: [
                        {
                          scale: hallBadgeAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.82, 1],
                          }),
                        },
                        {
                          translateY: hallBadgeAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [4, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Badge variant="outline" style={styles.hallBadge}>
                    <Text style={styles.hallBadgeText}>{selectedHallName}</Text>
                  </Badge>
                </Animated.View>
              ) : null}
            </View>
          </View>
        </View>
      </Pressable>
      <View style={styles.movieCardBody}>
        {validSessions.length > 0 ? (
          <Tabs
            value={selectedSessionValue}
            onValueChange={handleSessionChange}
            className="gap-4"
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sessionTabsScrollContent}
              style={styles.sessionTabsScroll}
            >
              <TabsList className="h-11 rounded-xl border border-white/15 bg-white/10 p-1">
                {validSessions.map((session, sessionIndex) => {
                  const sessionValue = `session-${sessionIndex}`;
                  const versionLabel = session.version_label || '一般';
                  const isSelected = selectedSessionValue === sessionValue;

                  return (
                    <TabsTrigger
                      key={`${item.movie_id}-tab-${sessionIndex}`}
                      value={sessionValue}
                      className="rounded-lg px-4"
                      style={styles.sessionTabTrigger}
                    >
                      <Text
                        style={[
                          styles.versionLabel,
                          isSelected && styles.versionLabelSelected,
                        ]}
                      >
                        {versionLabel}
                      </Text>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </ScrollView>

            <Animated.View
              style={[
                styles.timeArea,
                isTimeAreaMeasured && { height: timeAreaHeight },
              ]}
            >
              <View onLayout={handleTimeAreaLayout} style={styles.timeContent}>
                <View
                  onLayout={event =>
                    setTimeWrapWidth(event.nativeEvent.layout.width)
                  }
                  style={styles.timeWrap}
                >
                  {selectedStartTimes.map(startTime => {
                    const isPastTime = isShowTimePast(
                      showDate,
                      startTime,
                      currentTime,
                    );

                    return (
                      <View
                        key={`${item.movie_id}-${selectedSessionValue}-${startTime}`}
                        style={[
                          styles.timeChip,
                          timeChipWidth ? { width: timeChipWidth } : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeText,
                            isPastTime && styles.timeTextPast,
                          ]}
                        >
                          {startTime}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          </Tabs>
        ) : null}
      </View>
    </View>
  );
};

const ShowTimeScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { navigation } = useHomeNavigation();
  const { params } = useRoute<ShowTimeRouteProp>();
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isMovieModalVisible, setIsMovieModalVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [getCinemaShowTimeDates, { data: showTimeDatesData }] =
    useGetCinemaShowTimeDatesMutation();
  const [getMovieCinemas, { data: movieCinemasData }] =
    useGetMovieCinemasMutation();
  const [
    getMovieShowTimes,
    { isLoading: isShowTimesLoading, data: showTimesData },
  ] = useGetMovieShowTimesMutation();
  const dateRevealAnimation = useRef(new Animated.Value(1)).current;
  const cachedListRefreshAnimation = useRef(new Animated.Value(1)).current;
  const movieListRef = useRef<FlatList<ShowTimeListItem>>(null);
  const pendingScrollToListIndexRef = useRef<number | null>(null);
  const dateListRef = useRef<ScrollView>(null);
  const dateListWidthRef = useRef(0);
  const dateItemLayoutsRef = useRef<
    Record<number, { width: number; x: number }>
  >({});
  const pendingScrollToMovieDateRef = useRef<string | null>(null);
  const previousDateSelectionKeyRef = useRef<string | null>(null);
  const shouldCenterDateRef = useRef(false);

  useEffect(() => {
    getCinemaShowTimeDates(params.cinemaId);
  }, [getCinemaShowTimeDates, params.cinemaId]);

  useEffect(() => {
    if (params.movieId && !params.movieShowDates) {
      getMovieCinemas(params.movieId);
    }
  }, [getMovieCinemas, params.movieId, params.movieShowDates]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const showTimeDates = showTimeDatesData ?? EMPTY_SHOW_TIME_DATES;
  const selectedShowDate = showTimeDates[selectedDateIndex];
  const cachedShowTimes = useSelector((state: RootState) =>
    state.movies.userSelectedCinemaShowTimes?.find(
      item =>
        String(item.cinemaId) === String(params.cinemaId) &&
        item.showDate === selectedShowDate,
    ),
  );
  const showTimes = cachedShowTimes?.data ?? showTimesData ?? EMPTY_SHOW_TIMES;
  const adInsertAfterIndexes = useMemo(
    () => getNativeAdInsertAfterIndexes(showTimes.length),
    [showTimes.length],
  );
  const showTimeListItems = useMemo<ShowTimeListItem[]>(() => {
    const adInsertAfterIndexSet = new Set(adInsertAfterIndexes);

    return showTimes.flatMap((item, movieIndex) => {
      const listItems: ShowTimeListItem[] = [
        {
          type: 'movie',
          item,
          movieIndex,
        },
      ];

      if (adInsertAfterIndexSet.has(movieIndex)) {
        listItems.push({
          type: 'ad',
          id: `native-ad-after-${movieIndex}`,
        });
      }

      return listItems;
    });
  }, [adInsertAfterIndexes, showTimes]);
  const movieShowDateSet = useMemo(() => {
    if (params.movieShowDates) {
      return new Set(params.movieShowDates);
    }
    if (movieCinemasData && params.cinemaId) {
      for (const city of movieCinemasData) {
        const match = city.cinemas.find(c => c.id === params.cinemaId);
        if (match?.show_dates) {
          return new Set(match.show_dates);
        }
      }
    }
    return new Set<string>();
  }, [movieCinemasData, params.cinemaId, params.movieShowDates]);
  const dateItems = useMemo(
    () =>
      showTimeDates.map(dateValue => ({
        id: dateValue,
        ...formatShowTimeDate(dateValue),
      })),
    [showTimeDates],
  );
  const dateRevealScale = useMemo(
    () =>
      dateRevealAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.04, 1],
      }),
    [dateRevealAnimation],
  );
  const cachedListOpacity = useMemo(
    () =>
      cachedListRefreshAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1],
      }),
    [cachedListRefreshAnimation],
  );
  const todayDateKey = useMemo(() => formatDateKey(currentTime), [currentTime]);
  const dateSelectionKey = useMemo(
    () => `${params.cinemaId}:${showTimeDates.join('|')}`,
    [params.cinemaId, showTimeDates],
  );
  const selectedRouteMovieId = params.movieId;
  const selectedRouteMovieTitle = useMemo(
    () => normalizeMovieIdentityText(params.movieTitle),
    [params.movieTitle],
  );
  const selectedRouteMovieTitleEn = useMemo(
    () => normalizeMovieIdentityText(params.movieTitleEn),
    [params.movieTitleEn],
  );
  const headerMovieTitle =
    params.movieTitle?.trim() || params.movieTitleEn?.trim() || undefined;

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

  const findRouteMovieIndex = useCallback(() => {
    if (
      selectedRouteMovieId == null &&
      !selectedRouteMovieTitle &&
      !selectedRouteMovieTitleEn
    ) {
      return -1;
    }

    return showTimes.findIndex(item => {
      if (
        selectedRouteMovieId != null &&
        String(item.movie_id) === String(selectedRouteMovieId)
      ) {
        return true;
      }

      const itemTitle = normalizeMovieIdentityText(item.title);
      const itemTitleEn = normalizeMovieIdentityText(item.title_en);

      return (
        Boolean(
          selectedRouteMovieTitle && itemTitle === selectedRouteMovieTitle,
        ) ||
        Boolean(
          selectedRouteMovieTitleEn &&
            itemTitleEn === selectedRouteMovieTitleEn,
        )
      );
    });
  }, [
    selectedRouteMovieId,
    selectedRouteMovieTitle,
    selectedRouteMovieTitleEn,
    showTimes,
  ]);

  const scrollToListIndex = useCallback((listIndex: number) => {
    pendingScrollToListIndexRef.current = null;
    movieListRef.current?.scrollToIndex({
      animated: true,
      index: listIndex,
      viewOffset: MOVIE_SCROLL_VIEW_OFFSET,
      viewPosition: 0,
    });
  }, []);

  const scrollNearListIndex = useCallback(
    (listIndex: number, averageItemLength?: number) => {
      const estimatedItemHeight =
        averageItemLength || MOVIE_SCROLL_ESTIMATED_ITEM_HEIGHT;

      movieListRef.current?.scrollToOffset({
        animated: false,
        offset: Math.max(
          0,
          listIndex * estimatedItemHeight - MOVIE_SCROLL_VIEW_OFFSET,
        ),
      });
    },
    [],
  );

  const scrollToRouteMovie = useCallback(() => {
    const movieIndex = findRouteMovieIndex();

    if (movieIndex < 0) {
      return false;
    }

    const listIndex = getListIndexForMovieIndex(
      movieIndex,
      adInsertAfterIndexes,
    );

    requestAnimationFrame(() => {
      pendingScrollToListIndexRef.current = listIndex;
      scrollToListIndex(listIndex);
    });

    return true;
  }, [adInsertAfterIndexes, findRouteMovieIndex, scrollToListIndex]);

  useEffect(() => {
    if (!dateItems.length) {
      return;
    }

    const isNewDateList =
      previousDateSelectionKeyRef.current !== dateSelectionKey;
    const initialDateIndex = params.initialDate
      ? showTimeDates.indexOf(params.initialDate)
      : -1;
    const todayDateIndex = showTimeDates.indexOf(todayDateKey);
    const defaultDateIndex =
      initialDateIndex >= 0 ? initialDateIndex :
      todayDateIndex >= 0 ? todayDateIndex : 0;
    const nextSelectedDateIndex = isNewDateList
      ? defaultDateIndex
      : selectedDateIndex >= dateItems.length
      ? defaultDateIndex
      : selectedDateIndex;

    if (isNewDateList) {
      previousDateSelectionKeyRef.current = dateSelectionKey;

      const nextSelectedDate = showTimeDates[nextSelectedDateIndex];

      if (nextSelectedDate && movieShowDateSet.has(nextSelectedDate)) {
        pendingScrollToMovieDateRef.current = nextSelectedDate;
      }
    }

    if (nextSelectedDateIndex !== selectedDateIndex) {
      setSelectedDateIndex(nextSelectedDateIndex);
    }

    requestAnimationFrame(() => centerSelectedDate(nextSelectedDateIndex));
  }, [
    centerSelectedDate,
    dateItems.length,
    dateSelectionKey,
    movieShowDateSet,
    selectedDateIndex,
    showTimeDates,
    todayDateKey,
  ]);

  useEffect(() => {
    if (!selectedShowDate) {
      return;
    }

    if (cachedShowTimes) {
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const data = await getMovieShowTimes({
          cinemaId: params.cinemaId,
          showDate: selectedShowDate,
        }).unwrap();

        if (isMounted) {
          dispatch(
            addUserSelectedCinemaShowTimes({
              cinemaId: params.cinemaId,
              showDate: selectedShowDate,
              data,
            }),
          );
        }
      } catch {}
    })();

    return () => {
      isMounted = false;
    };
  }, [
    cachedShowTimes,
    dispatch,
    getMovieShowTimes,
    params.cinemaId,
    selectedShowDate,
  ]);

  useEffect(() => {
    if (!cachedShowTimes || !selectedShowDate) {
      return;
    }

    cachedListRefreshAnimation.setValue(0);
    Animated.timing(cachedListRefreshAnimation, {
      toValue: 1,
      duration: CACHED_LIST_ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cachedListRefreshAnimation, cachedShowTimes, selectedShowDate]);

  useEffect(() => {
    if (
      !selectedShowDate ||
      pendingScrollToMovieDateRef.current !== selectedShowDate ||
      isShowTimesLoading
    ) {
      return;
    }

    const scrollTimer = setTimeout(() => {
      if (scrollToRouteMovie()) {
        pendingScrollToMovieDateRef.current = null;
      }
    }, MOVIE_SCROLL_RETRY_DELAY_MS);

    return () => clearTimeout(scrollTimer);
  }, [isShowTimesLoading, scrollToRouteMovie, selectedShowDate, showTimes]);
  const handleSelectDate = useCallback(
    (index: number) => {
      const selectedDate = dateItems[index]?.id;

      if (selectedDate && movieShowDateSet.has(selectedDate)) {
        pendingScrollToMovieDateRef.current = selectedDate;
      } else {
        pendingScrollToMovieDateRef.current = null;
        pendingScrollToListIndexRef.current = null;
      }

      setSelectedDateIndex(index);
      requestAnimationFrame(() => centerSelectedDate(index));

      dateRevealAnimation.setValue(0);
      Animated.timing(dateRevealAnimation, {
        duration: 1220,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    },
    [centerSelectedDate, dateItems, dateRevealAnimation, movieShowDateSet],
  );

  const openMovieModal = useCallback((item: MovieShowTime) => {
    setSelectedMovie({
      id: item.movie_id,
      movie_id: item.movie_id,
      title: item.title,
      title_en: item.title_en,
      poster_url: item.backdrop_url,
      youtube_thumbnail: item.backdrop_url,
    });
    setIsMovieModalVisible(true);
  }, []);

  const closeMovieModal = useCallback(() => {
    setIsMovieModalVisible(false);
  }, []);

  const clearSelectedMovie = useCallback(() => {
    setSelectedMovie(null);
  }, []);

  const renderShowTimeItem = useCallback(
    ({ item }: { item: ShowTimeListItem }) => {
      if (item.type === 'ad') {
        return <NativeAdCard />;
      }

      return (
        <ShowTimeMovieCard
          currentTime={currentTime}
          item={item.item}
          onPressMovie={openMovieModal}
          showDate={selectedShowDate}
        />
      );
    },
    [currentTime, openMovieModal, selectedShowDate],
  );

  const showTimeKeyExtractor = useCallback(
    (item: ShowTimeListItem) =>
      item.type === 'ad'
        ? item.id
        : `movie-${item.item.movie_id}-${item.movieIndex}`,
    [],
  );

  return (
    <GradientView style={styles.container}>
      <ShowTimeHeader
        title={params.cinemaName}
        subtitle={headerMovieTitle}
        onBack={navigation.goBack}
      />
      <View style={styles.dateSection}>
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
          style={styles.dateList}
        >
          {dateItems.map((date, index) => {
            const isSelected = selectedDateIndex === index;
            const isMovieShowDate = movieShowDateSet.has(date.id);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={date.id}
                onLayout={event => {
                  dateItemLayoutsRef.current[index] = event.nativeEvent.layout;

                  if (
                    index === selectedDateIndex &&
                    shouldCenterDateRef.current
                  ) {
                    requestAnimationFrame(() =>
                      centerSelectedDate(selectedDateIndex),
                    );
                  }
                }}
                onPress={() => handleSelectDate(index)}
                style={[
                  styles.dateItem,
                  isMovieShowDate && styles.movieShowDateItem,
                  isSelected && styles.dateItemSelected,
                ]}
              >
                {isSelected && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.dateItemReveal,
                      {
                        transform: [{ scale: dateRevealScale }],
                      },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.weekdayText,
                    isSelected && styles.selectedDateText,
                  ]}
                >
                  {date.weekday}
                </Text>
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.selectedDateText,
                  ]}
                >
                  {date.day}
                </Text>
                <Text
                  style={[
                    styles.monthText,
                    isSelected && styles.selectedDateText,
                  ]}
                >
                  {date.month}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isShowTimesLoading ? (
        <ShowTimeSkeleton />
      ) : (
        <Animated.View
          style={[
            styles.movieListWrap,
            {
              opacity: cachedListOpacity,
            },
          ]}
        >
          <FlatList
            ref={movieListRef}
            data={showTimeListItems}
            keyExtractor={showTimeKeyExtractor}
            renderItem={renderShowTimeItem}
            onScrollToIndexFailed={info => {
              pendingScrollToListIndexRef.current = info.index;
              scrollNearListIndex(info.index, info.averageItemLength);

              setTimeout(() => {
                scrollToListIndex(info.index);
              }, MOVIE_SCROLL_RETRY_DELAY_MS);
            }}
            onContentSizeChange={() => {
              const pendingListIndex = pendingScrollToListIndexRef.current;

              if (pendingListIndex == null) {
                return;
              }

              setTimeout(() => {
                scrollToListIndex(pendingListIndex);
              }, MOVIE_SCROLL_RETRY_DELAY_MS);
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.movieListContent}
          />
        </Animated.View>
      )}
      <MovieModal
        visible={isMovieModalVisible}
        movie={selectedMovie}
        posterLayout={null}
        onClose={closeMovieModal}
        onAfterClose={clearSelectedMovie}
      />
    </GradientView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  dateSection: {
    paddingHorizontal: 24,
  },
  title: {
    color: '#F3F4F6',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  statusText: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
  },
  dateList: {
    flexGrow: 0,
    flexShrink: 0,
    marginHorizontal: -24,
    marginTop: 18,
  },
  dateListContent: {
    paddingHorizontal: 16,
  },
  dateItem: {
    alignItems: 'center',
    height: 78,
    justifyContent: 'center',
    overflow: 'hidden',
    // paddingHorizontal: 14,
    position: 'relative',
    width: 58,
  },
  movieShowDateItem: {
    backgroundColor: 'rgba(243,244,246,0.14)',
  },
  dateItemSelected: {
    backgroundColor: 'transparent',
  },
  dateItemReveal: {
    backgroundColor: '#4EC9E0',
    borderRadius: DATE_REVEAL_SIZE / 2,
    height: DATE_REVEAL_SIZE,
    left: '50%',
    marginLeft: -DATE_REVEAL_SIZE / 2,
    marginTop: -DATE_REVEAL_SIZE / 2,
    position: 'absolute',
    top: '50%',
    width: DATE_REVEAL_SIZE,
  },
  weekdayText: {
    color: '#9CA3AF',
    fontSize: 10,
    letterSpacing: 0,
    lineHeight: 14,
    textAlign: 'center',
    zIndex: 1,
    fontFamily: FONT_FAMILY.oswaldLight,
  },
  dayText: {
    color: '#F3F4F6',
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 24,
    textAlign: 'center',
    zIndex: 1,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  monthText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 14,
    textAlign: 'center',
    zIndex: 1,
    fontFamily: FONT_FAMILY.oswaldLight,
  },
  selectedDateText: {
    color: '#0B0B0F',
  },
  movieListContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    rowGap: 18,
  },
  movieListWrap: {
    flex: 1,
  },
  movieCard: {
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#101014',
  },
  movieCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  backdropButton: {
    width: '100%',
  },
  backdropWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropFallback: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backdropGradient: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 116,
  },
  backdropTitleBlock: {
    position: 'absolute',
    right: 16,
    bottom: 14,
    left: 16,
  },
  movieTitle: {
    color: '#F3F4F6',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  movieTitleEn: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  movieTitleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginTop: 2,
  },
  movieCardBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sessionTabsScroll: {
    flexGrow: 0,
    marginHorizontal: -16,
  },
  sessionTabsScrollContent: {
    paddingHorizontal: 16,
  },
  sessionTabTrigger: {
    minHeight: 28,
  },
  versionLabel: {
    color: '#F3F4F6',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  versionLabelSelected: {
    color: '#F5EA00',
  },
  hallBadge: {
    borderColor: 'rgba(78,201,224,0.42)',
    backgroundColor: 'rgba(78,201,224,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hallBadgeAnimated: {
    flexShrink: 0,
  },
  hallBadgeText: {
    color: '#8BE8F7',
    fontSize: 12,
    fontFamily: FONT_FAMILY.inter18Light,
  },
  timeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: TIME_CHIP_COLUMN_GAP,
    rowGap: 10,
  },
  timeArea: {
    overflow: 'hidden',
  },
  timeContent: {
    paddingTop: 0,
  },
  timeChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: '#151519',
  },
  timeText: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  timeTextPast: {
    color: 'rgba(243,244,246,0.36)',
  },
});

export default ShowTimeScreen;
