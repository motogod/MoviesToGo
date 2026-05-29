import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import type { RootState } from "@store/index";
// import AuthStack from "./AuthStack";
// import TabStack from "./TabStack";
import HomeScreen from '@/screen/Home/HomeScreen';
import FilterScreen from '@/screen/Filter/FilterScreen';
import ShowTimeScreen from '@/screen/ShowTime/ShowTimeScreen';
// import SecuritySettingsScreen from "src/screen/Me/SecuritySettingsScreen";
// import { SplashView } from "src/screen/Login/SplashScreen";
import type { HomeStackParamsType } from '@/navigator/types';

const Stack = createNativeStackNavigator<HomeStackParamsType>();

const RootStack = () => {
  //   const { authStatus } = useSelector((state: RootState) => state.user);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="ShowTimeScreen" component={ShowTimeScreen} />
      <Stack.Screen name="FilterScreen" component={FilterScreen} />
    </Stack.Navigator>
  );
};

export default RootStack;
