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
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useHomeNavigation } from '@/hooks/index';
import { useDispatch, useSelector } from 'react-redux';
import type {
  CinemasData,
  CityAndCinemas,
  MovieCinemasResponse,
} from '@/api/types/movies';
import type { AppDispatch, RootState } from '@/store';
import {
  setSelectedTheaterCinema,
  setSelectedTheaterCityTitle,
  setTheaterTimeNoticeVisible,
} from '@/store';
import { Text } from '@/components/ui/text';
import { TheaterSkeleton } from './components';
import { FONT_FAMILY } from '@/utility/fonts';

type TheaterScreenProps = {
  isLoading?: boolean;
  movieId?: string | number;
  movieTitle?: string;
  movieTitleEn?: string;
  movieCinemaSections?: MovieCinemasResponse | null;
  searchKeyword?: string;
  showSearchEmptyState?: boolean;
};

const normalizeSearchText = (value?: string) =>
  value?.toLowerCase().replace(/\s+/g, '') ?? '';

const CITY_REVEAL_SIZE = 220;

const getCinemaNameHighlightRange = (name: string, keyword: string) => {
  if (!keyword.trim() || /\s/.test(keyword)) {
    return;
  }

  const start = name.toLowerCase().indexOf(keyword.toLowerCase());

  if (start < 0) {
    return;
  }

  return {
    end: start + keyword.length,
    start,
  };
};

const prioritizeSelectedCinema = (
  city: CityAndCinemas,
  selectedCinemaId?: number,
) => {
  if (selectedCinemaId == null || !city.data?.length) {
    return city;
  }

  const selectedCinemaIndex = city.data.findIndex(
    cinema => cinema.id === selectedCinemaId,
  );

  if (selectedCinemaIndex <= 0) {
    return city;
  }

  const nextData = [...city.data];
  const [selectedCinema] = nextData.splice(selectedCinemaIndex, 1);

  return {
    ...city,
    data: [selectedCinema, ...nextData],
  };
};

const EmptyStateBrandIcon = () => {
  const iconFlipAnimation = useRef(new Animated.Value(0)).current;
  const iconFlipRotateY = iconFlipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    iconFlipAnimation.setValue(0);
    Animated.timing(iconFlipAnimation, {
      toValue: 1,
      duration: 680,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [iconFlipAnimation]);

  return (
    <View style={styles.emptyStateIconWrap}>
      <Animated.Image
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

const TheaterScreen = ({
  isLoading = false,
  movieId,
  movieTitle,
  movieTitleEn,
  movieCinemaSections,
  searchKeyword = '',
  showSearchEmptyState = true,
}: TheaterScreenProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { navigation } = useHomeNavigation();
  const [selectedCityIndex, setSelectedCityIndex] = useState(0);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number>();
  const cityRevealAnimation = useRef(new Animated.Value(1)).current;
  const cityListRef = useRef<ScrollView>(null);
  const cityListWidthRef = useRef(0);
  const cityItemLayoutsRef = useRef<
    Record<number, { width: number; x: number }>
  >({});
  const shouldCenterCityRef = useRef(false);
  const citiesAndCinemasList = useSelector(
    (state: RootState) => state.movies.citiesAndCinemasList,
  );
  const selectedTheaterCityTitle = useSelector(
    (state: RootState) => state.movies.selectedTheaterCityTitle,
  );
  const selectedTheaterCinemas = useSelector(
    (state: RootState) => state.movies.selectedTheaterCinemas,
  );
  const normalizedSearchKeyword = useMemo(
    () => normalizeSearchText(searchKeyword),
    [searchKeyword],
  );
  const isSearchingCinema = normalizedSearchKeyword.length > 0;
  const movieCinemaList = useMemo<CityAndCinemas[] | null>(() => {
    if (!movieCinemaSections?.length) {
      return null;
    }

    return movieCinemaSections.map(section => ({
      title: section.city,
      data: section.cinemas,
    }));
  }, [movieCinemaSections]);
  const baseDisplayCityAndCinemasList = movieCinemaList ?? citiesAndCinemasList;
  const displayCityAndCinemasList = useMemo(
    () =>
      baseDisplayCityAndCinemasList?.map(city => {
        const selectedCinema = selectedTheaterCinemas?.find(
          item => item.cityTitle === city.title,
        )?.cinema;

        return prioritizeSelectedCinema(city, selectedCinema?.id);
      }),
    [baseDisplayCityAndCinemasList, selectedTheaterCinemas],
  );
  const displayCityKey = useMemo(
    () =>
      displayCityAndCinemasList
        ?.map(city => `${city.title ?? ''}:${city.data?.length ?? 0}`)
        .join('|') ?? '',
    [displayCityAndCinemasList],
  );
  const selectedCinemas = useMemo(
    () => displayCityAndCinemasList?.[selectedCityIndex]?.data ?? [],
    [displayCityAndCinemasList, selectedCityIndex],
  );
  const filteredCinemas = useMemo<CinemasData[]>(() => {
    if (!isSearchingCinema) {
      return selectedCinemas;
    }

    return (
      displayCityAndCinemasList?.flatMap(city =>
        (city.data ?? []).filter(cinema =>
          normalizeSearchText(cinema.name).includes(normalizedSearchKeyword),
        ),
      ) ?? []
    );
  }, [
    displayCityAndCinemasList,
    isSearchingCinema,
    normalizedSearchKeyword,
    selectedCinemas,
  ]);
  const cityRevealScale = useMemo(
    () =>
      cityRevealAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.04, 1],
      }),
    [cityRevealAnimation],
  );
  const shouldShowSearchSkeleton =
    isSearchingCinema && !showSearchEmptyState && filteredCinemas.length === 0;

  useEffect(() => {
    cityItemLayoutsRef.current = {};
    shouldCenterCityRef.current = true;
  }, [displayCityKey]);

  useEffect(() => {
    if (!displayCityAndCinemasList?.length) {
      return;
    }

    const persistedCityIndex = selectedTheaterCityTitle
      ? displayCityAndCinemasList.findIndex(
          city => city.title === selectedTheaterCityTitle,
        )
      : -1;
    const nextCityIndex = persistedCityIndex >= 0 ? persistedCityIndex : 0;
    const nextCityTitle = displayCityAndCinemasList[nextCityIndex]?.title;

    if (selectedCityIndex !== nextCityIndex) {
      setSelectedCityIndex(nextCityIndex);
    }

    if (selectedTheaterCityTitle !== nextCityTitle) {
      dispatch(setSelectedTheaterCityTitle(nextCityTitle));
    }
  }, [
    displayCityAndCinemasList,
    dispatch,
    selectedCityIndex,
    selectedTheaterCityTitle,
  ]);

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

  const runCityRevealAnimation = useCallback(() => {
    cityRevealAnimation.setValue(0);
    Animated.timing(cityRevealAnimation, {
      duration: 2620,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [cityRevealAnimation]);

  useEffect(() => {
    if (isSearchingCinema) {
      shouldCenterCityRef.current = true;
      return;
    }

    requestAnimationFrame(() => centerSelectedCity(selectedCityIndex));
  }, [centerSelectedCity, isSearchingCinema, selectedCityIndex]);

  const handleSelectCity = useCallback(
    (index: number) => {
      const cityTitle = displayCityAndCinemasList?.[index]?.title;

      setSelectedCityIndex(index);
      dispatch(setSelectedTheaterCityTitle(cityTitle));
      requestAnimationFrame(() => centerSelectedCity(index));

      runCityRevealAnimation();
    },
    [
      centerSelectedCity,
      dispatch,
      displayCityAndCinemasList,
      runCityRevealAnimation,
    ],
  );

  if (isLoading) {
    return <TheaterSkeleton />;
  }

  if (shouldShowSearchSkeleton) {
    return <TheaterSkeleton />;
  }

  return (
    <View style={styles.container}>
      {!isSearchingCinema && (
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
          style={styles.cityList}
        >
          {displayCityAndCinemasList?.map((city, index) => {
            const cityTitle = city.title ?? '';
            const isSelected = selectedCityIndex === index;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onLayout={event => {
                  cityItemLayoutsRef.current[index] = event.nativeEvent.layout;

                  if (
                    index === selectedCityIndex &&
                    shouldCenterCityRef.current
                  ) {
                    requestAnimationFrame(() => centerSelectedCity(index));
                  }
                }}
                onPress={() => handleSelectCity(index)}
                key={`${cityTitle}-${index}`}
                style={[styles.cityItem, isSelected && styles.cityItemSelected]}
              >
                {isSelected && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.cityItemReveal,
                      {
                        transform: [{ scale: cityRevealScale }],
                      },
                    ]}
                  />
                )}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.cityTitle,
                    isSelected && styles.cityTitleSelected,
                  ]}
                >
                  {cityTitle}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.cinemaListContent}
        style={styles.cinemaList}
      >
        {isSearchingCinema &&
          showSearchEmptyState &&
          filteredCinemas.length === 0 && (
            <View style={styles.emptyState}>
              <EmptyStateBrandIcon />
              <Text style={styles.emptyStateTitle}>找不到戲院</Text>
              <Text style={styles.emptyStateDescription}>
                沒有符合「{searchKeyword}」的戲院
              </Text>
            </View>
          )}
        {filteredCinemas.map(cinema => {
          const isSelected = selectedCinemaId === cinema.id;
          const cinemaCityTitle =
            displayCityAndCinemasList?.find(city =>
              city.data?.some(item => item.id === cinema.id),
            )?.title ?? displayCityAndCinemasList?.[selectedCityIndex]?.title;
          const highlightRange = getCinemaNameHighlightRange(
            cinema.name,
            searchKeyword,
          );

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={cinema.id}
              onPress={() => {
                setSelectedCinemaId(cinema.id);
                dispatch(setTheaterTimeNoticeVisible(false));

                if (cinemaCityTitle) {
                  dispatch(
                    setSelectedTheaterCinema({
                      cityTitle: cinemaCityTitle,
                      cinema,
                    }),
                  );
                }
                navigation.navigate('ShowTimeScreen', {
                  cinemaId: cinema.id,
                  cinemaName: cinema.name,
                  movieId,
                  movieTitle,
                  movieTitleEn,
                  movieShowDates: cinema.show_dates,
                });
              }}
              style={styles.cinemaItem}
            >
              <Text numberOfLines={1} style={styles.cinemaName}>
                {highlightRange ? (
                  <>
                    {cinema.name.slice(0, highlightRange.start)}
                    <Text style={styles.cinemaNameHighlight}>
                      {cinema.name.slice(
                        highlightRange.start,
                        highlightRange.end,
                      )}
                    </Text>
                    {cinema.name.slice(highlightRange.end)}
                  </>
                ) : (
                  cinema.name
                )}
              </Text>
              <Text numberOfLines={2} style={styles.cinemaAddress}>
                {cinema.address}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  testZone: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    width: '100%',
  },
  testTrigger: {
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  testTriggerText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  popoverTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  popoverDescription: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
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
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 15,
    position: 'relative',
  },
  cityItemSelected: {
    backgroundColor: 'transparent',
  },
  cityItemReveal: {
    backgroundColor: '#F5EA00',
    borderRadius: CITY_REVEAL_SIZE / 2,
    height: CITY_REVEAL_SIZE,
    left: '50%',
    marginLeft: -CITY_REVEAL_SIZE / 2,
    marginTop: -CITY_REVEAL_SIZE / 2,
    position: 'absolute',
    top: '50%',
    width: CITY_REVEAL_SIZE,
  },
  cityTitle: {
    color: '#9CA3AF',
    fontSize: 22,
    zIndex: 1,
    lineHeight: 28,
    fontFamily: FONT_FAMILY.inter18Light,
  },
  cityTitleSelected: {
    color: '#0B0B0F',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  cinemaList: {
    flex: 1,
    marginHorizontal: -24,
  },
  cinemaListContent: {
    paddingBottom: 132,
    paddingHorizontal: 24,
    paddingTop: 12,
    rowGap: 12,
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
    lineHeight: 21,
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
  cinemaItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    width: '100%',
  },
  cinemaItemSelected: {
    backgroundColor: 'rgba(245, 234, 0, 0.12)',
  },
  cinemaItemPressed: {
    opacity: 0.78,
  },
  cinemaName: {
    color: '#F3F4F6',
    fontSize: 18,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  cinemaNameHighlight: {
    color: '#F5EA00',
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  cinemaAddress: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.inter18Light,
  },
});

export default TheaterScreen;
