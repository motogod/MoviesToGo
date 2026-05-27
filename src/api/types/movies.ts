export type Movie = {
  id?: string | number;
  movie_id?: string | number;
  title?: string;
  title_en?: string;
  release_date?: string;
  poster_url?: string;
  backdrop_url?: string | null;
  youtube_thumbnail?: string;
};

export type MovieSource = {
  id?: string | number;
  source?: string;
  source_movie_id?: string;
  source_title?: string;
  source_original_title?: string;
  detail_url?: string;
};

export type MovieCastData = {
  cast_id: string | number;
  name: string;
  cast_url?: string;
  cast_content?: string;
};

export type CinemasData = {
  id: number;
  name: string;
  address: string;
  show_dates?: string[];
};

export type CityAndCinemas = {
  title?: string;
  data?: CinemasData[];
};

export type MoviesDetailResponse = Movie & {
  title_zh?: string;
  original_title?: string;
  backdrop_url?: string | null;
  still_urls?: string[] | null;
  release_date?: string;
  duration_minutes?: number;
  rating?: string;
  imdb_rating?: string;
  tomatoes_rating?: string;
  metascore_rating?: string;
  imdb_id?: string;
  genre?: string;
  description?: string;
  description_en?: string;
  director?: string;
  cast?: string;
  cast_members?: string[] | string | null;
  cast_data?: MovieCastData[];
  cast_photo_urls?: string[] | null;
  trailer_url?: string;
  trailer_video_id?: string;
  detail_url?: string;
  sources?: MovieSource[];
};

export type CinemaShowTimeDatesResponse = string[];

export type MovieCinema = {
  city: string;
  cinemas: CinemasData[];
};

export type MovieCinemasResponse = MovieCinema[];

export type MovieShowTimesParams = {
  cinemaId: string | number;
  showDate: string;
};

export type MovieShowTimeSession = {
  hall_name?: string;
  version_label?: string;
  language?: string;
  start_time: string[];
};

export type MovieShowTime = {
  movie_id: string | number;
  title: string;
  title_en?: string;
  session: MovieShowTimeSession[];
  backdrop_url?: string;
};

export type MovieShowTimesResponse = MovieShowTime[];

export type MoviesListParams = {
  offset: number;
  limit: number;
  seed?: string;
};

export type MoviesListResponse = {
  data: Movie[];
  hasMore: boolean;
};

export type UpcomingMoviesParams = {
  offset: number;
  limit: number;
};

export type UpcomingMoviesResponse = {
  data: Movie[];
  hasMore: boolean;
};

export type PopularMovie = {
  rank: number;
  title?: string;
  title_en?: string;
  poster_url?: string;
  description?: string;
  week_start?: string;
  week_end?: string;
  movie_id?: string | number;
  movie?: Movie;
};

export type PopularMoviesResponse = PopularMovie[];

export type CityAndCinemasResponse = {
  data: CityAndCinemas[];
};
