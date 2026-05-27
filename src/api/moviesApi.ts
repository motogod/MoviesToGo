import { baseApi } from './index';
import type {
  CinemaShowTimeDatesResponse,
  MovieCinemasResponse,
  MovieShowTimesParams,
  MovieShowTimesResponse,
  MoviesDetailResponse,
  MoviesListParams,
  MoviesListResponse,
  PopularMoviesResponse,
  UpcomingMoviesParams,
  UpcomingMoviesResponse,
} from './types/movies';

export const moviesApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getMoviesList: build.mutation<MoviesListResponse, MoviesListParams>({
      query: params => ({
        url: 'movies/list',
        method: 'GET',
        params,
      }),
    }),
    getPopularMovies: build.mutation<PopularMoviesResponse, void>({
      query: () => ({
        url: 'movies/popular',
        method: 'GET',
      }),
    }),
    getUpcomingMovies: build.mutation<
      UpcomingMoviesResponse,
      UpcomingMoviesParams
    >({
      query: params => ({
        url: 'movies/upcoming',
        method: 'GET',
        params,
      }),
    }),
    getMoviesDetail: build.mutation<MoviesDetailResponse, string | number>({
      query: id => ({
        url: `movies/${id}`,
        method: 'GET',
      }),
    }),
    getUpcomingMovieDetail: build.mutation<
      MoviesDetailResponse,
      string | number
    >({
      query: id => ({
        url: `movies/upcoming/${id}`,
        method: 'GET',
      }),
    }),
    getCityAndCinemas: build.mutation<MoviesDetailResponse, string | number>({
      query: _id => ({
        url: `cinemas/sections`,
        method: 'GET',
      }),
    }),
    getCinemaShowTimeDates: build.mutation<
      CinemaShowTimeDatesResponse,
      string | number
    >({
      query: id => ({
        url: `cinemas/${id}/showtime-dates`,
        method: 'GET',
      }),
    }),
    getMovieShowTimes: build.mutation<
      MovieShowTimesResponse,
      MovieShowTimesParams
    >({
      query: ({ cinemaId, showDate }) => ({
        url: `cinemas/${encodeURIComponent(
          String(cinemaId),
        )}/showtimes-by-date?show_date=${encodeURIComponent(showDate)}`,
        method: 'GET',
      }),
    }),
    getMovieCinemas: build.mutation<MovieCinemasResponse, string | number>({
      query: id => ({
        url: `movies/${id}/cinemas`,
        method: 'GET',
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMoviesListMutation,
  useGetPopularMoviesMutation,
  useGetUpcomingMoviesMutation,
  useGetMoviesDetailMutation,
  useGetUpcomingMovieDetailMutation,
  useGetCityAndCinemasMutation,
  useGetCinemaShowTimeDatesMutation,
  useGetMovieShowTimesMutation,
  useGetMovieCinemasMutation,
} = moviesApi;
