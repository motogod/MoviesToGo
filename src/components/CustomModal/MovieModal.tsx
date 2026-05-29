import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Play, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import LinearGradient from 'react-native-linear-gradient';
import Popover from 'react-native-popover-view';
import { useDispatch, useSelector } from 'react-redux';
import {
  useGetMoviesDetailMutation,
  useGetUpcomingMovieDetailMutation,
} from '@/api/moviesApi';
import type { Movie, MoviesDetailResponse } from '@/api/types/movies';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AppDispatch, RootState } from '@/store';
import {
  addUserSelectedMovieDetail,
  addUserSelectedUpcomingMovieDetail,
} from '@/store/slice/moviesSlice';
import { MovieModalSkeleton } from '@/screen/Home/components';
import { FONT_FAMILY } from '@/utility/fonts';

export type PosterLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  visible: boolean;
  movie: Movie | null;
  posterLayout: PosterLayout | null;
  onClose: () => void;
  onAfterClose?: () => void;
  showCinemaButton?: boolean;
  onPressCinemaButton?: () => void;
  detailSource?: 'movies' | 'upcoming';
};

const getRatingIcon = (rating?: string | null) => {
  if (!rating) {
    return '';
  }

  const normalizedRating = rating.trim();

  if (
    normalizedRating === '普遍級' ||
    normalizedRating === '普遍級(G)' ||
    normalizedRating === '普'
  ) {
    return require('@/assets/image/pg0.png');
  }

  if (normalizedRating === '保護級' || normalizedRating === '護') {
    return require('@/assets/image/pg6.png');
  }

  if (
    normalizedRating === '輔12級' ||
    normalizedRating === '輔12級' ||
    normalizedRating === '輔導12級' ||
    normalizedRating === '輔導十二歲級'
  ) {
    return require('@/assets/image/pg12.png');
  }

  if (
    normalizedRating === '輔15級' ||
    normalizedRating === '輔15級' ||
    normalizedRating === '輔15級(PG15)' ||
    normalizedRating === '輔導 15 級' ||
    normalizedRating === '輔導十五歲級'
  ) {
    return require('@/assets/image/pg15.png');
  }

  if (normalizedRating === '限制級' || normalizedRating === '限') {
    return require('@/assets/image/pg18.png');
  }

  return '';
};

const formatCastMembers = (
  castMembers?: MoviesDetailResponse['cast_members'],
) => {
  if (Array.isArray(castMembers)) {
    return castMembers.filter(Boolean).join('、');
  }

  return castMembers ?? '';
};

const ratingItems = [
  {
    key: 'imdb',
    source: require('@/assets/image/imdbIcon.png'),
    valueKey: 'imdb_rating',
  },
  {
    key: 'metacritic',
    source: require('@/assets/image/metacriticIcon.png'),
    valueKey: 'metascore_rating',
  },
  {
    key: 'rotten',
    source: require('@/assets/image/rottenIcon.png'),
    valueKey: 'tomatoes_rating',
  },
] as const;

const CINEMA_BUTTON_SHIMMER_WIDTH = 42;

type CinemaInfoButtonProps = {
  onPress?: () => void;
  shimmerTranslateX: Animated.AnimatedInterpolation<string | number>;
};

const CinemaInfoButton = ({
  onPress,
  shimmerTranslateX,
}: CinemaInfoButtonProps) => (
  <Button
    accessibilityRole="button"
    size="sm"
    variant="outline"
    onPress={onPress}
    style={styles.cinemaInfoButton}
  >
    <Animated.View
      pointerEvents="none"
      style={[
        styles.cinemaInfoButtonShimmer,
        {
          transform: [{ translateX: shimmerTranslateX }, { rotate: '18deg' }],
        },
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        colors={[
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.68)',
          'rgba(255,255,255,0)',
        ]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
    <Text numberOfLines={1} style={styles.cinemaInfoButtonText}>
      上映戲院
    </Text>
  </Button>
);

const MovieModal = ({
  visible,
  movie,
  posterLayout,
  onClose,
  onAfterClose,
  showCinemaButton = false,
  onPressCinemaButton,
  detailSource = 'movies',
}: Props) => {
  const dispatch = useDispatch<AppDispatch>();
  const movieId =
    detailSource === 'upcoming'
      ? movie?.id ?? movie?.movie_id
      : movie?.movie_id ?? movie?.id;
  const cachedMovieDetail = useSelector((state: RootState) =>
    (detailSource === 'upcoming'
      ? state.movies.userSelectedUpcomingMovieDetail
      : state.movies.userSelectedMovieDetail
    )?.find(item => {
      const itemMovieId =
        detailSource === 'upcoming'
          ? item.id ?? item.movie_id
          : item.movie_id ?? item.id;

      return String(itemMovieId) === String(movieId);
    }),
  );
  const [getMoviesDetail] = useGetMoviesDetailMutation();
  const [getUpcomingMovieDetail] = useGetUpcomingMovieDetailMutation();
  const [isRendered, setIsRendered] = useState(visible);
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
  const [movieDetail, setMovieDetail] = useState<MoviesDetailResponse | null>(
    null,
  );
  const animation = useRef(new Animated.Value(0)).current;
  const cinemaButtonShimmerAnimation = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const castPopoverMaxWidth = screenWidth / 2;
  const castPopoverMaxHeight = Math.min(screenHeight * 0.26, 180);
  const modalTop = insets.top + 44;
  const widePosterWidth = Math.min(screenWidth - 48, 360);
  const floatingPosterEndTop = posterLayout
    ? Math.max(
        modalTop + 28,
        Math.min(posterLayout.y - 92, screenHeight * 0.28),
      )
    : 0;
  const modalTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });
  const backdropOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.32],
  });
  const trailerVideoId = movieDetail?.trailer_video_id;
  const visibleRatingItems = ratingItems.filter(
    item => movieDetail?.[item.valueKey],
  );
  const infoRows = [
    {
      label: '上映',
      value: movieDetail?.release_date,
    },
    {
      label: '片長',
      value:
        typeof movieDetail?.duration_minutes === 'number'
          ? `${movieDetail.duration_minutes} 分`
          : undefined,
    },
    {
      label: '導演',
      value: movieDetail?.director,
    },
    {
      label: '演員',
      value: formatCastMembers(movieDetail?.cast),
    },
  ].filter(row => row.value);
  const hasReleaseDateInfo = infoRows.some(row => row.label === '上映');
  const movieDescription = movieDetail?.description?.trim();
  const stillUrls = Array.isArray(movieDetail?.still_urls)
    ? movieDetail.still_urls.filter(Boolean)
    : [];
  const castData = Array.isArray(movieDetail?.cast_data)
    ? movieDetail.cast_data.filter(cast => cast.name)
    : [];
  const shouldShowDetailSkeleton = visible && Boolean(movieId) && !movieDetail;
  const cinemaButtonShimmerTranslateX =
    cinemaButtonShimmerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [-CINEMA_BUTTON_SHIMMER_WIDTH, 118],
    });

  useEffect(() => {
    if (!visible) {
      setIsTrailerVisible(false);
      setIsTrailerPlaying(false);
      setMovieDetail(null);
    }

    if (visible) {
      setIsRendered(true);
      animation.setValue(0);
      Animated.timing(animation, {
        toValue: 1,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return;
    }

    if (!isRendered) {
      return;
    }

    Animated.timing(animation, {
      toValue: 0,
      duration: 320,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setIsRendered(false);
      onAfterClose?.();
    });
  }, [animation, isRendered, onAfterClose, visible]);

  useEffect(() => {
    if (!visible || !showCinemaButton) {
      cinemaButtonShimmerAnimation.stopAnimation();
      cinemaButtonShimmerAnimation.setValue(0);
      return;
    }

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(cinemaButtonShimmerAnimation, {
          toValue: 1,
          duration: 1150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ]),
    );

    shimmerLoop.start();

    return () => {
      shimmerLoop.stop();
      cinemaButtonShimmerAnimation.setValue(0);
    };
  }, [cinemaButtonShimmerAnimation, showCinemaButton, visible]);

  useEffect(() => {
    if (!visible || !movieId) {
      return;
    }

    if (cachedMovieDetail) {
      setMovieDetail(cachedMovieDetail);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const detail =
          detailSource === 'upcoming'
            ? await getUpcomingMovieDetail(movieId).unwrap()
            : await getMoviesDetail(movieId).unwrap();

        if (isMounted) {
          setMovieDetail(detail);

          if (detailSource === 'upcoming') {
            dispatch(addUserSelectedUpcomingMovieDetail(detail));
          } else {
            dispatch(addUserSelectedMovieDetail(detail));
          }
        }
      } catch {}
    })();

    return () => {
      isMounted = false;
    };
  }, [
    cachedMovieDetail,
    detailSource,
    dispatch,
    getMoviesDetail,
    getUpcomingMovieDetail,
    movieId,
    visible,
  ]);

  const closeTrailer = () => {
    setIsTrailerVisible(false);
    setIsTrailerPlaying(false);
  };

  const openTrailer = () => {
    if (!trailerVideoId) {
      return;
    }

    setIsTrailerPlaying(false);
    setIsTrailerVisible(true);
  };

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={isTrailerVisible ? closeTrailer : onClose}
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.card,
            {
              top: modalTop,
              transform: [{ translateY: modalTranslateY }],
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <X size={20} color="#F3F4F6" strokeWidth={2.8} />
          </Pressable>
          <View style={styles.posterWrap}>
            {(movie?.youtube_thumbnail ?? movie?.poster_url) ? (
              <Image
                source={{ uri: movie?.youtube_thumbnail ?? movie?.poster_url }}
                resizeMode="cover"
                style={styles.modalPoster}
              />
            ) : (
              <View style={[styles.modalPoster, styles.posterFallback]} />
            )}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(16,16,20,0)', '#101014']}
              style={styles.posterGradient}
            />
            {trailerVideoId ? (
              <Pressable
                accessibilityRole="button"
                onPress={openTrailer}
                style={styles.playButton}
              >
                <Play
                  size={30}
                  color="#F9FAFB"
                  fill="#F9FAFB"
                  strokeWidth={2.5}
                />
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleBlock}>
              <Text numberOfLines={2} style={styles.title}>
                {movie?.title}
              </Text>
              <Text numberOfLines={2} style={styles.titleEn}>
                {movie?.title_en}
              </Text>
              {showCinemaButton && !hasReleaseDateInfo ? (
                <CinemaInfoButton
                  onPress={onPressCinemaButton}
                  shimmerTranslateX={cinemaButtonShimmerTranslateX}
                />
              ) : null}
            </View>
            {shouldShowDetailSkeleton ? (
              <MovieModalSkeleton />
            ) : (
              <>
                {visibleRatingItems.length > 0 && (
                  <View style={styles.ratingsRow}>
                    {visibleRatingItems.map(item => (
                      <View key={item.key} style={styles.ratingItem}>
                        <Image
                          source={item.source}
                          resizeMode="contain"
                          style={styles.ratingIcon}
                        />
                        <Text numberOfLines={1} style={styles.ratingValue}>
                          {movieDetail?.[item.valueKey]}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {infoRows.length > 0 && (
                  <View style={styles.infoSection}>
                    {infoRows.map(row => (
                      <View key={row.label} style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{row.label}：</Text>
                        <Text style={styles.infoValue}>{row.value}</Text>
                        {row.label === '上映' && showCinemaButton ? (
                          <View style={styles.cinemaInfoButtonAbsoluteWrap}>
                            <CinemaInfoButton
                              onPress={onPressCinemaButton}
                              shimmerTranslateX={cinemaButtonShimmerTranslateX}
                            />
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.badgeWrap}>
                  <View style={styles.genreBadgeGroup}>
                    {(movieDetail?.genre ?? '')
                      .split(/[,、]/)
                      .map(item => item.trim())
                      .filter(Boolean)
                      .map((genre, index) => (
                        <Badge
                          key={`${genre}-${index}`}
                          style={styles.badge}
                        >
                          <Text style={styles.badgeText}>{genre}</Text>
                        </Badge>
                      ))}
                  </View>
                  {getRatingIcon(movieDetail?.rating) ? (
                    <Image
                      source={getRatingIcon(movieDetail?.rating)}
                      resizeMode="contain"
                      style={styles.ratingBadgeIcon}
                    />
                  ) : null}
                </View>
                {movieDescription ? (
                  <View style={styles.descriptionSection}>
                    <Accordion type="single" collapsible>
                      <AccordionItem
                        value="description"
                        className="border-white/10"
                      >
                        <AccordionTrigger
                          className="py-3"
                          chevronClassName="text-white"
                        >
                          <Text style={styles.descriptionTrigger}>
                            影片介紹
                          </Text>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <Text style={styles.descriptionText}>
                            {movieDescription}
                          </Text>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </View>
                ) : null}
                {castData.length > 0 ? (
                  <View style={styles.castSection}>
                    <Text style={styles.sectionTitle}>演員：</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.castListContent}
                    >
                      {castData.map(cast => (
                        <View key={cast.cast_id} style={styles.castItem}>
                          <Popover
                            backgroundStyle={styles.castPopoverBackdrop}
                            from={
                              <Pressable
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                  styles.castImageButton,
                                  pressed && styles.castImagePressed,
                                ]}
                              >
                                {cast.cast_url ? (
                                  <Image
                                    source={{ uri: cast.cast_url }}
                                    resizeMode="cover"
                                    style={styles.castImage}
                                  />
                                ) : (
                                  <View
                                    style={[
                                      styles.castImage,
                                      styles.castFallback,
                                    ]}
                                  />
                                )}
                              </Pressable>
                            }
                            popoverStyle={[
                              styles.castPopover,
                              { maxWidth: castPopoverMaxWidth },
                            ]}
                          >
                            <ScrollView
                              showsVerticalScrollIndicator
                              style={[
                                styles.castPopoverScroll,
                                {
                                  maxHeight: castPopoverMaxHeight,
                                  maxWidth: castPopoverMaxWidth,
                                },
                              ]}
                            >
                              <Text style={styles.castPopoverName}>
                                {cast.name}
                              </Text>
                              {cast.cast_content ? (
                                <Text style={styles.castPopoverContent}>
                                  {cast.cast_content}
                                </Text>
                              ) : null}
                            </ScrollView>
                          </Popover>
                          <Text numberOfLines={2} style={styles.castName}>
                            {cast.name}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
                {stillUrls.length > 0 ? (
                  <View style={styles.stillsSection}>
                    <Text style={styles.sectionTitle}>劇照：</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.stillsListContent}
                    >
                      {stillUrls.map(url => (
                        <Image
                          key={url}
                          source={{ uri: url }}
                          resizeMode="cover"
                          style={[
                            styles.stillImage,
                            { width: Math.min(screenWidth * 0.64, 260) },
                          ]}
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </Animated.View>
        {posterLayout && movie?.poster_url && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.floatingPoster,
              {
                left: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    posterLayout.x,
                    (screenWidth - widePosterWidth) / 2,
                  ],
                }),
                top: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [posterLayout.y, floatingPosterEndTop],
                }),
                width: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [posterLayout.width, widePosterWidth],
                }),
                height: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [posterLayout.height, widePosterWidth * 0.56],
                }),
                opacity: animation.interpolate({
                  inputRange: [0, 0.68, 1],
                  outputRange: [1, 0.9, 0],
                }),
              },
            ]}
          >
            <Image
              source={{ uri: movie.poster_url }}
              resizeMode="cover"
              style={styles.floatingPosterImage}
            />
          </Animated.View>
        )}
        {isTrailerVisible && trailerVideoId && (
          <View style={styles.trailerOverlay}>
            <Pressable
              accessibilityRole="button"
              onPress={closeTrailer}
              hitSlop={16}
              style={[styles.closeButton, styles.trailerCloseButton]}
            >
              <X size={24} color="#F3F4F6" strokeWidth={2.8} />
            </Pressable>
            <View style={styles.youtubePlayerWrap}>
              <YoutubePlayer
                height={Math.min(screenHeight, screenWidth * 0.5625)}
                width={screenWidth}
                play={isTrailerPlaying}
                mute
                videoId={trailerVideoId}
                forceAndroidAutoplay
                onReady={() => setIsTrailerPlaying(true)}
                webViewProps={{
                  mediaPlaybackRequiresUserAction: false,
                  allowsInlineMediaPlayback: true,
                }}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000',
  },
  card: {
    position: 'absolute',
    right: 12,
    bottom: 0,
    left: 12,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#101014',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 18,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 28,
    right: 28,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 3,
    elevation: 22,
  },
  posterWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  modalPoster: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
  },
  posterGradient: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 96,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 68,
    height: 68,
    marginTop: -34,
    marginLeft: -34,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  posterFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
  },
  contentScroll: {
    flex: 1,
    marginTop: -12,
  },
  contentScrollContainer: {
    paddingBottom: 36,
  },
  title: {
    marginHorizontal: 18,
    color: '#F3F4F6',
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  titleBlock: {
    marginBottom: 14,
    paddingHorizontal: 18,
  },
  titleEn: {
    marginTop: 4,
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.oswaldLight,
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
  },
  ratingValue: {
    color: '#F3F4F6',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 28,
    rowGap: 8,
    position: 'relative',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#F3F4F6',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  infoValue: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.inter18Light,
  },
  cinemaInfoButtonAbsoluteWrap: {
    position: 'absolute',
    right: 0,
    top: -4,
  },
  cinemaInfoButton: {
    alignSelf: 'flex-end',
    borderRadius: 8,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: 'rgba(255,255,255,0.68)',
    marginLeft: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  cinemaInfoButtonText: {
    color: '#1F2937',
    fontSize: 12,
    lineHeight: 20,
    zIndex: 1,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
  cinemaInfoButtonShimmer: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    left: 0,
    width: CINEMA_BUTTON_SHIMMER_WIDTH,
    zIndex: 0,
  },
  descriptionSection: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  descriptionTrigger: {
    color: '#F3F4F6',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  descriptionText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONT_FAMILY.inter18Light,
  },
  castSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 12,
    color: '#F3F4F6',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  castListContent: {
    paddingLeft: 16,
    paddingRight: 16,
    columnGap: 12,
  },
  castItem: {
    width: 92,
  },
  castImageButton: {
    width: 92,
    aspectRatio: 2 / 3,
    borderRadius: 10,
  },
  castImagePressed: {
    opacity: 0.82,
  },
  castImage: {
    width: 92,
    aspectRatio: 2 / 3,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: '#1F2937',
  },
  castFallback: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  castName: {
    marginTop: 8,
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
  castPopover: {
    backgroundColor: '#1A1D24',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  castPopoverBackdrop: {
    backgroundColor: 'transparent',
  },
  castPopoverScroll: {
    flexGrow: 0,
  },
  castPopoverName: {
    color: '#F9FAFB',
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FONT_FAMILY.inter28Regular,
  },
  castPopoverContent: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    fontFamily: FONT_FAMILY.inter18Light,
  },
  stillsSection: {
    marginBottom: 28,
  },
  stillsListContent: {
    paddingLeft: 16,
    paddingRight: 16,
    columnGap: 12,
  },
  stillImage: {
    aspectRatio: 16 / 9,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: '#1F2937',
  },
  floatingPoster: {
    position: 'absolute',
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    zIndex: 4,
    elevation: 24,
    overflow: 'hidden',
  },
  floatingPosterImage: {
    width: '100%',
    height: '100%',
  },
  trailerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    zIndex: 100,
    elevation: 100,
  },
  trailerCloseButton: {
    top: 56,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    zIndex: 101,
    elevation: 101,
  },
  youtubePlayerWrap: {
    width: '100%',
    backgroundColor: '#000',
  },
  badgeWrap: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  genreBadgeGroup: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingBadgeIcon: {
    width: 32,
    height: 32,
    marginLeft: 16,
    borderRadius: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(198,160,94,0.15)',
    borderColor: 'rgba(198,160,94,0.4)',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#C6A05E',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.oswaldRegular,
  },
});

export default MovieModal;
