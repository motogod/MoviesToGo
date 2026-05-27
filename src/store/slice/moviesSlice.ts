import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CinemasData,
  CityAndCinemas,
  Movie,
  MovieShowTimesResponse,
  MoviesDetailResponse,
  PopularMovie,
} from '@/api/types/movies';

type UserSelectedCinemaShowTimes = {
  cinemaId: string | number;
  showDate: string;
  data: MovieShowTimesResponse;
};

type UserSelectedTheaterCinema = {
  cityTitle: string;
  cinema: CinemasData;
};

type MoviesSliceType = {
  moviesList: Movie[];
  upcomingMoviesList: Movie[];
  popularMoviesList: PopularMovie[];
  userSelectedMovieDetail?: MoviesDetailResponse[];
  userSelectedUpcomingMovieDetail?: MoviesDetailResponse[];
  userSelectedCinemaShowTimes?: UserSelectedCinemaShowTimes[];
  citiesAndCinemasList?: CityAndCinemas[];
  selectedTheaterCityTitle?: string;
  selectedTheaterCinemas?: UserSelectedTheaterCinema[];
  isTheaterTimeNoticeVisible: boolean;
};

const initialState: MoviesSliceType = {
  moviesList: [], // 首頁呈現的電影清單
  upcomingMoviesList: [], // 即將上映的電影清單
  popularMoviesList: [], // 熱門電影排行榜清單
  userSelectedMovieDetail: [], // 使用者點擊過的電影詳細資料清單
  userSelectedUpcomingMovieDetail: [], // 使用者點擊過的即將上映電影詳細資料清單
  userSelectedCinemaShowTimes: [], // 使用者看過的戲院日期場次清單
  citiesAndCinemasList: [], // 資料庫擁有的城市與電影院清單
  selectedTheaterCityTitle: undefined, // 使用者上次選擇的戲院城市
  selectedTheaterCinemas: [], // 使用者在每個城市上次選擇的戲院
  isTheaterTimeNoticeVisible: true, // 本次開啟 APP 時，戲院頁底部時刻提醒是否顯示
};

export const moviesPersistConfig = {
  key: 'movies',
  storage: AsyncStorage,
  whitelist: ['selectedTheaterCityTitle', 'selectedTheaterCinemas'],
};

const moviesSlice = createSlice({
  name: 'movies',
  initialState,
  reducers: {
    setMoviesList(state, action: PayloadAction<Movie[]>) {
      state.moviesList = action.payload;
    },
    setUpcomingMoviesList(state, action: PayloadAction<Movie[]>) {
      state.upcomingMoviesList = action.payload;
    },
    setPopularMoviesList(state, action: PayloadAction<PopularMovie[]>) {
      state.popularMoviesList = action.payload;
    },
    addUserSelectedMovieDetail(
      state,
      action: PayloadAction<MoviesDetailResponse>,
    ) {
      const movieId = action.payload.movie_id ?? action.payload.id;

      if (!movieId) {
        return;
      }

      // 檢查已經存過的 detail 清單中，有沒有同一個 id。
      const hasMovieDetail = state.userSelectedMovieDetail?.some(item => {
        const itemMovieId = item.movie_id ?? item.id;

        return String(itemMovieId) === String(movieId);
      });

      if (!hasMovieDetail) {
        state.userSelectedMovieDetail?.push(action.payload);
      }
    },
    addUserSelectedUpcomingMovieDetail(
      state,
      action: PayloadAction<MoviesDetailResponse>,
    ) {
      const movieId = action.payload.id ?? action.payload.movie_id;

      if (!movieId) {
        return;
      }

      const hasMovieDetail = state.userSelectedUpcomingMovieDetail?.some(
        item => {
          const itemMovieId = item.id ?? item.movie_id;

          return String(itemMovieId) === String(movieId);
        },
      );

      if (!hasMovieDetail) {
        state.userSelectedUpcomingMovieDetail?.push(action.payload);
      }
    },
    addUserSelectedCinemaShowTimes(
      state,
      action: PayloadAction<UserSelectedCinemaShowTimes>,
    ) {
      const { cinemaId, showDate, data } = action.payload;

      if (!cinemaId || !showDate) {
        return;
      }

      const existingShowTimesIndex =
        state.userSelectedCinemaShowTimes?.findIndex(
          item =>
            String(item.cinemaId) === String(cinemaId) &&
            item.showDate === showDate,
        ) ?? -1;

      if (existingShowTimesIndex >= 0 && state.userSelectedCinemaShowTimes) {
        state.userSelectedCinemaShowTimes[existingShowTimesIndex] = {
          cinemaId,
          showDate,
          data,
        };
        return;
      }

      state.userSelectedCinemaShowTimes?.push({
        cinemaId,
        showDate,
        data,
      });
    },
    setCitiesAndCinemasList(state, action: PayloadAction<CityAndCinemas[]>) {
      state.citiesAndCinemasList = action.payload;
    },
    setSelectedTheaterCityTitle(
      state,
      action: PayloadAction<string | undefined>,
    ) {
      state.selectedTheaterCityTitle = action.payload;
    },
    setSelectedTheaterCinema(
      state,
      action: PayloadAction<UserSelectedTheaterCinema>,
    ) {
      const { cityTitle, cinema } = action.payload;

      if (!cityTitle || !cinema?.id) {
        return;
      }

      const existingCinemaIndex =
        state.selectedTheaterCinemas?.findIndex(
          item => item.cityTitle === cityTitle,
        ) ?? -1;

      if (existingCinemaIndex >= 0 && state.selectedTheaterCinemas) {
        state.selectedTheaterCinemas[existingCinemaIndex] = {
          cityTitle,
          cinema,
        };
        return;
      }

      state.selectedTheaterCinemas?.push({
        cityTitle,
        cinema,
      });
    },
    setTheaterTimeNoticeVisible(state, action: PayloadAction<boolean>) {
      state.isTheaterTimeNoticeVisible = action.payload;
    },
  },
});

export const {
  setMoviesList,
  setUpcomingMoviesList,
  setPopularMoviesList,
  addUserSelectedMovieDetail,
  addUserSelectedUpcomingMovieDetail,
  addUserSelectedCinemaShowTimes,
  setCitiesAndCinemasList,
  setSelectedTheaterCityTitle,
  setSelectedTheaterCinema,
  setTheaterTimeNoticeVisible,
} = moviesSlice.actions;

export const moviesReducer = moviesSlice.reducer;
