import { useNavigation } from '@react-navigation/native';
import type { ParamListBase } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamsType } from '@/navigator/types';

function useReactNavigation<ParamsList extends ParamListBase>() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamsList>>();

  return { navigation };
}

export const useHomeNavigation = () =>
  useReactNavigation<HomeStackParamsType>();

export default useReactNavigation;
