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
import GradientView from '@/components/CustomView/GradientView';
import { useHomeNavigation } from '@/hooks';
import { Text } from '@/components/ui/text';
import type { AppDispatch, RootState } from '@/store';
import { setSelectedTheaterCityTitle } from '@/store';
import { FONT_FAMILY } from '@/utility/fonts';

type FilterDateItem = {
  id: string;
  label: string;
  day: string;
  month: string;
  weekday: string;
};

const AnimatedText = Animated.createAnimatedComponent(Text);
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
  },
  {
    label: '下午',
    time: '12:00-18:00',
    english: 'AFTERNOON',
    Icon: Sun,
  },
  {
    label: '晚上',
    time: '18:00-24:00',
    english: 'NIGHT',
    Icon: Moon,
  },
  {
    label: '深夜',
    time: '00:00-06:00',
    english: 'MIDNIGHT',
    Icon: MoonStar,
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

const FilterScreen = () => {
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
  const dateRevealAnimation = useRef(new Animated.Value(1)).current;
  const cityRevealAnimation = useRef(new Animated.Value(1)).current;
  const floatingActionProgress = useRef(new Animated.Value(0)).current;
  const floatingActionIconFlipAnimation = useRef(new Animated.Value(0)).current;
  const searchIconFlipAnimation = useRef(new Animated.Value(0)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const ticketDateValueAnimation = useRef(new Animated.Value(1)).current;
  const ticketPeriodValueAnimation = useRef(new Animated.Value(1)).current;
  const ticketCityValueAnimation = useRef(new Animated.Value(1)).current;
  const ticketGenreValueAnimation = useRef(new Animated.Value(1)).current;
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
  const floatingGenreMenuWidth = Math.min(screenWidth - 48, 360);
  const floatingGenreMenuRight = 97 - floatingGenreMenuWidth / 2;
  const searchIconRotateY = searchIconFlipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
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
    animation.setValue(1);
    Animated.sequence([
      Animated.timing(animation, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 1.92,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        duration: 680,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
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

  const handleSearchPress = useCallback(() => {
    searchIconFlipAnimation.setValue(0);
    shimmerAnimation.setValue(0);
    Animated.parallel([
      Animated.timing(searchIconFlipAnimation, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(shimmerAnimation, {
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [searchIconFlipAnimation, shimmerAnimation]);

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

  return (
    <GradientView style={styles.container}>
      <ShowTimeHeader
        onBack={navigation.goBack}
        showTitle={false}
        showRightIcon={false}
        variant="filter"
      />
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
            <AnimatedText
              numberOfLines={1}
              style={[
                styles.ticketValue,
                { transform: [{ scale: ticketDateValueAnimation }] },
              ]}
            >
              {selectedDate?.label ?? '日期'}
            </AnimatedText>
            <Text numberOfLines={1} style={styles.ticketSubValue}>
              {selectedDate?.weekday ?? ''}
            </Text>
          </View>
          <View style={styles.ticketField}>
            <Text numberOfLines={1} style={styles.ticketLabel}>
              TIME
            </Text>
            <AnimatedText
              numberOfLines={1}
              style={[
                styles.ticketValue,
                { transform: [{ scale: ticketPeriodValueAnimation }] },
              ]}
            >
              {selectedPeriod?.label ?? '時段'}
            </AnimatedText>
            <Text numberOfLines={1} style={styles.ticketSubValue}>
              {selectedPeriod?.english ?? ''}
            </Text>
          </View>
          <View style={styles.ticketField}>
            <Text numberOfLines={1} style={styles.ticketLabel}>
              CITY
            </Text>
            <AnimatedText
              numberOfLines={1}
              style={[
                styles.ticketValue,
                { transform: [{ scale: ticketCityValueAnimation }] },
              ]}
            >
              {selectedCityTitle}
            </AnimatedText>
            <Text numberOfLines={1} style={styles.ticketSubValue}>
              {selectedCityEnglishTitle}
            </Text>
          </View>
          <View style={styles.ticketField}>
            <Text numberOfLines={1} style={styles.ticketLabel}>
              GENRE
            </Text>
            <AnimatedText
              numberOfLines={1}
              style={[
                styles.ticketValue,
                { transform: [{ scale: ticketGenreValueAnimation }] },
              ]}
            >
              {ticketGenreValue}
            </AnimatedText>
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
                  style={[styles.dateItem, isSelected && styles.dateItemActive]}
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
                    color={itemSubColor}
                    size={24}
                    strokeWidth={2.2}
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
                  style={[styles.cityItem, isSelected && styles.cityItemActive]}
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
              <Search color="#F4D28E" size={24} strokeWidth={2.7} />
            </Animated.View>
          </Pressable>
        </View>

        <View style={[styles.floatingActionWrap, { bottom: insets.bottom + 16, right: screenWidth / 2 - 97 }]}>
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
      </View>
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
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  ticketValue: {
    color: '#F4D28E',
    fontSize: 17,
    lineHeight: 22,
    marginTop: 2,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  ticketSubValue: {
    color: '#8A8175',
    fontSize: 8,
    lineHeight: 11,
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
});

export default FilterScreen;
