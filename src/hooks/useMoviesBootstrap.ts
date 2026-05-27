import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  useGetMoviesListMutation,
  useGetCityAndCinemasMutation,
  useGetPopularMoviesMutation,
  useGetUpcomingMoviesMutation,
} from '@/api/moviesApi';
import type { Movie, CityAndCinemas, PopularMovie } from '@/api/types/movies';
import type { AppDispatch } from '@/store';
import {
  setMoviesList,
  setUpcomingMoviesList,
  setPopularMoviesList,
  setCitiesAndCinemasList,
} from '@/store';

const getMoviesListSeed = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getMovieListKey = (item: Movie, index: number) =>
  String(
    item.id ??
      item.movie_id ??
      `${item.title}-${item.title_en}-${item.poster_url}-${index}`,
  );

const getUniqueMovies = (movies: Movie[]): Movie[] => {
  const seenMovieKeys = new Set<string>();

  return movies.filter((movie, index) => {
    const movieKey = getMovieListKey(movie, index);

    if (seenMovieKeys.has(movieKey)) {
      return false;
    }

    seenMovieKeys.add(movieKey);
    return true;
  });
};

const useMoviesBootstrap = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isPopularMoviesLoading, setIsPopularMoviesLoading] = useState(false);
  const [isUpcomingMoviesLoading, setIsUpcomingMoviesLoading] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const [getMoviesList] = useGetMoviesListMutation();
  const [getPopularMovies] = useGetPopularMoviesMutation();
  const [getUpcomingMovies] = useGetUpcomingMoviesMutation();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const fetchedMovies: Movie[] = [];
        let offset = 0;
        let limit = 20;
        let hasMore = true;
        let isFirstRequest = true;
        const seed = getMoviesListSeed();

        while (hasMore) {
          if (isFirstRequest && isMounted) {
            setIsInitialLoading(true);
          }

          const res = await getMoviesList({ offset, limit, seed }).unwrap();
          const movies = res.data;

          fetchedMovies.push(...movies);

          if (isFirstRequest) {
            if (isMounted) {
              setIsInitialLoading(false);
            }

            isFirstRequest = false;
          }

          if (isMounted && offset === 0) {
            dispatch(setMoviesList(getUniqueMovies(fetchedMovies)));
          }

          hasMore = res.hasMore;

          if (!hasMore || movies.length === 0) {
            break;
          }

          offset = offset === 0 ? 19 : offset + movies.length;
          limit = 100;
        }

        if (isMounted) {
          dispatch(setMoviesList(getUniqueMovies(fetchedMovies)));
        }
      } catch {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [dispatch, getMoviesList]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        if (isMounted) {
          setIsPopularMoviesLoading(true);
        }

        const popularMovies: PopularMovie[] = await getPopularMovies().unwrap();

        if (isMounted) {
          dispatch(setPopularMoviesList(popularMovies));
          setIsPopularMoviesLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsPopularMoviesLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [dispatch, getPopularMovies]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const fetchedUpcomingMovies: Movie[] = [];
        let offset = 0;
        let limit = 20;
        let hasMore = true;
        let isFirstRequest = true;

        while (hasMore) {
          if (isFirstRequest && isMounted) {
            setIsUpcomingMoviesLoading(true);
          }

          const res = await getUpcomingMovies({ offset, limit }).unwrap();
          const movies = res.data;

          fetchedUpcomingMovies.push(...movies);

          if (isFirstRequest) {
            if (isMounted) {
              setIsUpcomingMoviesLoading(false);
            }

            isFirstRequest = false;
          }

          if (isMounted && offset === 0) {
            dispatch(setUpcomingMoviesList(getUniqueMovies(fetchedUpcomingMovies)));
          }

          hasMore = res.hasMore;

          if (!hasMore || movies.length === 0) {
            break;
          }

          offset += movies.length;
          limit = 100;
        }

        if (isMounted) {
          dispatch(setUpcomingMoviesList(getUniqueMovies(fetchedUpcomingMovies)));
        }
      } catch {
        if (isMounted) {
          setIsUpcomingMoviesLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [dispatch, getUpcomingMovies]);

  return {
    isInitialLoading,
    isPopularMoviesLoading,
    isUpcomingMoviesLoading,
  };
};

const useCityAndCinemasBootstrap = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const [getCityAndCinemas] = useGetCityAndCinemasMutation();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        if (isMounted) {
          setIsInitialLoading(true);
        }

        const res = await getCityAndCinemas({}).unwrap();
        const citiesAndCinemas: CityAndCinemas[] = Array.isArray(res)
          ? res
          : [res];

        if (isMounted) {
          dispatch(setCitiesAndCinemasList(citiesAndCinemas));
          setIsInitialLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [dispatch, getCityAndCinemas]);

  return { isInitialLoading };
};

export { useMoviesBootstrap, useCityAndCinemasBootstrap };
