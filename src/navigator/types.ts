export type HomeStackParamsType = {
  HomeScreen: undefined;
  ShowTimeScreen: {
    cinemaId: number;
    cinemaName: string;
    movieId?: string | number;
    movieTitle?: string;
    movieTitleEn?: string;
    movieShowDates?: string[];
  };
  FilterScreen: undefined;
};
