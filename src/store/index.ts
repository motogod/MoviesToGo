// ** Toolkit imports
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { combineReducers } from 'redux';
import { persistReducer } from 'redux-persist';
import {
  moviesReducer,
  moviesPersistConfig,
  setMoviesList,
  setUpcomingMoviesList,
  setPopularMoviesList,
  setMovieGenresList,
  setCitiesAndCinemasList,
  setSelectedTheaterCityTitle,
  setSelectedTheaterCinema,
  setTheaterTimeNoticeVisible,
  addUserSelectedCinemaShowTimes,
  addUserSelectedUpcomingMovieDetail,
} from './slice/moviesSlice';
import { baseApi } from '@/api';

// ** Reducers
export const store = configureStore({
  reducer: combineReducers({
    movies: persistReducer(moviesPersistConfig, moviesReducer),
    [baseApi.reducerPath]: baseApi.reducer,
  }),
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(baseApi.middleware),
});
// ** Reducers

// 監測 API
setupListeners(store.dispatch);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export {
  setMoviesList,
  setUpcomingMoviesList,
  setPopularMoviesList,
  setMovieGenresList,
  setCitiesAndCinemasList,
  setSelectedTheaterCityTitle,
  setSelectedTheaterCinema,
  setTheaterTimeNoticeVisible,
  addUserSelectedCinemaShowTimes,
  addUserSelectedUpcomingMovieDetail,
};
