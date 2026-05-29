import { baseApi } from './index';
import type {
  CinemaShowTimeDatesResponse,
  CityAndCinemas,
  FilterShowTimesParams,
  FilterShowTimesResponse,
  MovieCinemasResponse,
  MovieGenresResponse,
  MovieShowTimesParams,
  MovieShowTimesResponse,
  MoviesDetailResponse,
  MoviesListParams,
  MoviesListResponse,
  PopularMoviesResponse,
  UpcomingMoviesParams,
  UpcomingMoviesResponse,
} from './types/movies';

const getFilterShowTimesQueryString = ({
  city,
  date,
  period,
  genres,
}: FilterShowTimesParams) => {
  const searchParams = new URLSearchParams();

  searchParams.append('city', city);
  searchParams.append('date', date);
  searchParams.append('period', period);
  genres?.forEach(genre => searchParams.append('genres', genre));

  return searchParams.toString();
};

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
    getCityAndCinemas: build.mutation<CityAndCinemas[], void>({
      query: () => ({
        url: `cinemas/sections`,
        method: 'GET',
      }),
    }),
    getMovieGenres: build.mutation<MovieGenresResponse, void>({
      query: () => ({
        url: 'movies/genres',
        method: 'GET',
      }),
    }),
    getFilterShowTimes: build.mutation<
      FilterShowTimesResponse,
      FilterShowTimesParams
    >({
      query: params => ({
        url: `movies/filter-showtimes?${getFilterShowTimesQueryString(params)}`,
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
  useGetMovieGenresMutation,
  useGetFilterShowTimesMutation,
  useGetCinemaShowTimeDatesMutation,
  useGetMovieShowTimesMutation,
  useGetMovieCinemasMutation,
} = moviesApi;
